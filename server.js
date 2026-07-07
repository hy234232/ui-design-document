#!/usr/bin/env node
// 기능 명세 생성기 — Claude Code CLI 브릿지 서버
// 실행: node server.js  (API 키 불필요, Claude Code 로그인 상태 사용)

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { spawn } = require('child_process');
const { execSync, execFileSync } = require('child_process');

const PORT = 3765;
const MODEL = 'claude-sonnet-4-6'; // 생성에 사용하는 모델 (변경 시 하단 메타에 그대로 반영됨)
const DESIGN_SYSTEM_PATH = path.join(__dirname, '디자인시스템.md');
const COMPONENT_REPO_URL = 'https://github.com/hy0909/designsystem.git';
const COMPONENT_REPO_BRANCH = 'main';
const COMPONENT_REPO_WORKDIR = path.join(__dirname, '.github-sync', 'designsystem');
const COMPONENT_GITHUB_BASE = 'https://github.com/hy0909/designsystem/blob/main';
const FEATURE_REPO_URL = 'git@github.com:hy234232/features.git';
const FEATURE_REPO_BRANCH = 'main';
const FEATURE_REPO_WORKDIR = path.join(__dirname, '.github-sync', 'features');
const FEATURE_GITHUB_BASE = 'https://github.com/hy234232/features/blob/main';
const FEATURE_SKILL_DIR = path.join(os.homedir(), '.codex', 'skills', 'feature-generator');
const FEATURE_LOCAL_OUTPUT_DIR = path.join(__dirname, 'generated-features');

// 디자인시스템.md 로드 — 매 분석 요청마다 호출되어 최신 내용을 반영.
// 파일이 없거나 읽기 실패 시 빈 문자열 반환(분석은 계속 진행, 단순 폴백).
function loadDesignSystem() {
  try {
    if (!fs.existsSync(DESIGN_SYSTEM_PATH)) return '';
    let text = fs.readFileSync(DESIGN_SYSTEM_PATH, 'utf8');
    // 너무 큰 경우 컷 (40000자 ≈ 10K 토큰)
    if (text.length > 40000) text = text.slice(0, 40000) + '\n\n... (이하 생략 — 파일이 너무 큼)';
    return text;
  } catch (e) {
    console.warn('[디자인시스템 로드 실패]', e.message);
    return '';
  }
}

function sh(cmd, cwd) {
  return execSync(cmd, {
    cwd: cwd || __dirname,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd: cwd || __dirname,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function shortHash(input) {
  input = String(input || '');
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) + input.charCodeAt(i);
  return Math.abs(h >>> 0).toString(36).slice(0, 6);
}

function slugifyAscii(input, fallback) {
  const slug = String(input || '')
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback || 'item';
}

function stripCodeFence(text) {
  text = String(text || '').trim();
  const m = text.match(/^```(?:md|markdown)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : text;
}

function readSkillFile(relPath, limit) {
  try {
    const p = path.join(FEATURE_SKILL_DIR, relPath);
    let text = fs.readFileSync(p, 'utf8');
    if (limit && text.length > limit) text = text.slice(0, limit) + '\n\n... (이하 생략)';
    return text;
  } catch (e) {
    return '';
  }
}

function componentScopedFilename(projectName, componentFilename, componentName, fileKey) {
  const projectRaw = String(projectName || fileKey || 'figma-project').trim();
  const projectSlug = slugifyAscii(projectRaw, 'project-' + shortHash(projectRaw));
  const componentBase = String(componentFilename || componentName || 'component')
    .replace(/\.md$/i, '');
  const componentSlug = slugifyAscii(componentBase, 'component-' + shortHash(componentName || componentBase));
  return `${projectSlug}-${componentSlug}.md`;
}

function ensureComponentRepo() {
  const parent = path.dirname(COMPONENT_REPO_WORKDIR);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

  if (!fs.existsSync(path.join(COMPONENT_REPO_WORKDIR, '.git'))) {
    git(['clone', COMPONENT_REPO_URL, COMPONENT_REPO_WORKDIR], __dirname);
  }

  try { git(['checkout', COMPONENT_REPO_BRANCH], COMPONENT_REPO_WORKDIR); } catch (e) { /* branch may already be default */ }
  git(['pull', '--ff-only', 'origin', COMPONENT_REPO_BRANCH], COMPONENT_REPO_WORKDIR);
}

function publishComponentMdToGithub(filename, markdown, componentName) {
  ensureComponentRepo();

  const repoDesignDir = path.join(COMPONENT_REPO_WORKDIR, 'design-system');
  if (!fs.existsSync(repoDesignDir)) fs.mkdirSync(repoDesignDir, { recursive: true });
  const repoOutPath = path.join(repoDesignDir, filename);
  fs.writeFileSync(repoOutPath, markdown, 'utf8');

  git(['add', `design-system/${filename}`], COMPONENT_REPO_WORKDIR);
  const status = git(['status', '--short'], COMPONENT_REPO_WORKDIR);
  if (!status) {
    return { committed: false, pushed: false, reason: 'no changes' };
  }

  const safeName = String(componentName || filename).trim() || filename;
  git(['commit', '-m', `Add ${safeName} component spec`], COMPONENT_REPO_WORKDIR);
  git(['push', 'origin', COMPONENT_REPO_BRANCH], COMPONENT_REPO_WORKDIR);
  return { committed: true, pushed: true };
}

function ensureFeatureRepo() {
  const parent = path.dirname(FEATURE_REPO_WORKDIR);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

  if (!fs.existsSync(path.join(FEATURE_REPO_WORKDIR, '.git'))) {
    git(['clone', FEATURE_REPO_URL, FEATURE_REPO_WORKDIR], __dirname);
  }

  let hasLocalHead = true;
  try { git(['rev-parse', '--verify', 'HEAD'], FEATURE_REPO_WORKDIR); } catch (e) { hasLocalHead = false; }

  let hasRemoteBranch = true;
  try { git(['ls-remote', '--exit-code', '--heads', 'origin', FEATURE_REPO_BRANCH], FEATURE_REPO_WORKDIR); } catch (e) { hasRemoteBranch = false; }

  if (!hasLocalHead && !hasRemoteBranch) {
    // Empty GitHub repo: create the first local branch and let the first publish push it.
    try { git(['checkout', '-B', FEATURE_REPO_BRANCH], FEATURE_REPO_WORKDIR); } catch (e) { /* git may already be on unborn branch */ }
    return;
  }

  try { git(['checkout', FEATURE_REPO_BRANCH], FEATURE_REPO_WORKDIR); } catch (e) { git(['checkout', '-B', FEATURE_REPO_BRANCH], FEATURE_REPO_WORKDIR); }
  if (hasRemoteBranch) git(['pull', '--ff-only', 'origin', FEATURE_REPO_BRANCH], FEATURE_REPO_WORKDIR);
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
}

function decodePngToRgba(input) {
  const sig = input.slice(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') throw new Error('PNG 파일이 아닙니다.');
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idats = [];
  while (pos < input.length) {
    const len = input.readUInt32BE(pos); pos += 4;
    const type = input.slice(pos, pos + 4).toString('ascii'); pos += 4;
    const data = input.slice(pos, pos + len); pos += len + 4;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }
  if (bitDepth !== 8) throw new Error('8-bit PNG만 지원합니다.');
  const bppByType = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const bpp = bppByType[colorType];
  if (!bpp) throw new Error(`지원하지 않는 PNG color type: ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idats));
  const stride = width * bpp;
  const rows = [];
  let off = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[off++];
    const row = Buffer.from(raw.slice(off, off + stride));
    off += stride;
    const prev = rows[y - 1] || Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? row[x - bpp] : 0;
      const up = prev[x] || 0;
      const upLeft = x >= bpp ? prev[x - bpp] : 0;
      if (filter === 1) row[x] = (row[x] + left) & 0xff;
      else if (filter === 2) row[x] = (row[x] + up) & 0xff;
      else if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[x] = (row[x] + paeth(left, up, upLeft)) & 0xff;
      else if (filter !== 0) throw new Error(`지원하지 않는 PNG filter: ${filter}`);
    }
    rows.push(row);
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const si = x * bpp;
      const di = (y * width + x) * 4;
      if (colorType === 0) {
        rgba[di] = rgba[di + 1] = rgba[di + 2] = row[si];
        rgba[di + 3] = 255;
      } else if (colorType === 2) {
        rgba[di] = row[si]; rgba[di + 1] = row[si + 1]; rgba[di + 2] = row[si + 2]; rgba[di + 3] = 255;
      } else if (colorType === 4) {
        rgba[di] = rgba[di + 1] = rgba[di + 2] = row[si];
        rgba[di + 3] = row[si + 1];
      } else if (colorType === 6) {
        row.copy(rgba, di, si, si + 4);
      }
    }
  }
  return { width, height, rgba };
}

function encodeRgbaPng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let off = 0;
  for (let y = 0; y < height; y++) {
    raw[off++] = 0;
    rgba.copy(raw, off, y * width * 4, (y + 1) * width * 4);
    off += width * 4;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function addLightGrayPngBorder(input) {
  const decoded = decodePngToRgba(input);
  const outW = decoded.width + 2;
  const outH = decoded.height + 2;
  const out = Buffer.alloc(outW * outH * 4);
  for (let i = 0; i < outW * outH; i++) {
    out[i * 4] = 0xD9;
    out[i * 4 + 1] = 0xDE;
    out[i * 4 + 2] = 0xE7;
    out[i * 4 + 3] = 0xff;
  }
  for (let y = 0; y < decoded.height; y++) {
    decoded.rgba.copy(out, ((y + 1) * outW + 1) * 4, y * decoded.width * 4, (y + 1) * decoded.width * 4);
  }
  return encodeRgbaPng(outW, outH, out);
}

function publishFeatureMdToGithub(filename, markdown, imagePaths, title) {
  ensureFeatureRepo();

  filename = slugifyAscii(filename, 'feature-' + shortHash(markdown)).replace(/\.md$/i, '') + '.md';
  const topic = filename.replace(/\.md$/i, '');
  const assetRelDir = `assets/${topic}`;
  markdown = stripCodeFence(markdown)
    .replace(/assets\/\{\{topic\}\}/g, assetRelDir)
    .replace(/assets\/<topic>/g, assetRelDir);
  const assetDir = path.join(FEATURE_REPO_WORKDIR, assetRelDir);
  if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });

  const assetFiles = [];
  (imagePaths || []).forEach((imgPath, idx) => {
    try {
      const outName = `screen-${idx + 1}.png`;
      const bordered = addLightGrayPngBorder(fs.readFileSync(imgPath));
      fs.writeFileSync(path.join(assetDir, outName), bordered);
      assetFiles.push(`${assetRelDir}/${outName}`);
    } catch (e) {
      console.warn('[이미지 테두리 처리 실패]', e.message);
    }
  });

  const mdPath = path.join(FEATURE_REPO_WORKDIR, filename);
  fs.writeFileSync(mdPath, markdown, 'utf8');

  git(['add', filename].concat(assetFiles), FEATURE_REPO_WORKDIR);
  const status = git(['status', '--short'], FEATURE_REPO_WORKDIR);
  if (!status) {
    return {
      filename,
      githubUrl: `${FEATURE_GITHUB_BASE}/${filename}`,
      committed: false,
      pushed: false,
      reason: 'no changes',
    };
  }

  const safeTitle = String(title || filename).trim() || filename;
  git(['commit', '-m', `Add ${safeTitle} feature spec`], FEATURE_REPO_WORKDIR);
  git(['push', 'origin', FEATURE_REPO_BRANCH], FEATURE_REPO_WORKDIR);
  return {
    filename,
    githubUrl: `${FEATURE_GITHUB_BASE}/${filename}`,
    committed: true,
    pushed: true,
  };
}

function saveFeatureMdLocally(filename, markdown, imagePaths) {
  filename = slugifyAscii(filename, 'feature-' + shortHash(markdown)).replace(/\.md$/i, '') + '.md';
  const topic = filename.replace(/\.md$/i, '');
  const assetRelDir = `assets/${topic}`;
  markdown = stripCodeFence(markdown)
    .replace(/assets\/\{\{topic\}\}/g, assetRelDir)
    .replace(/assets\/<topic>/g, assetRelDir);

  if (!fs.existsSync(FEATURE_LOCAL_OUTPUT_DIR)) fs.mkdirSync(FEATURE_LOCAL_OUTPUT_DIR, { recursive: true });
  const assetDir = path.join(FEATURE_LOCAL_OUTPUT_DIR, assetRelDir);
  if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });

  const assetFiles = [];
  (imagePaths || []).forEach((imgPath, idx) => {
    try {
      const outName = `screen-${idx + 1}.png`;
      const bordered = addLightGrayPngBorder(fs.readFileSync(imgPath));
      const outPath = path.join(assetDir, outName);
      fs.writeFileSync(outPath, bordered);
      assetFiles.push(path.join(assetDir, outName));
    } catch (e) {
      console.warn('[이미지 테두리 처리 실패]', e.message);
    }
  });

  const mdPath = path.join(FEATURE_LOCAL_OUTPUT_DIR, filename);
  fs.writeFileSync(mdPath, markdown, 'utf8');
  return {
    filename,
    localPath: mdPath,
    outputDir: FEATURE_LOCAL_OUTPUT_DIR,
    assetDir,
    assetFiles,
  };
}

// Claude Code CLI 경로 탐색
function findClaudeCLI() {
  // Claude Desktop 앱 내장 CLI — 버전 폴더를 동적으로 탐색
  const claudeCodeDir = `${process.env.HOME}/Library/Application Support/Claude/claude-code`;
  try {
    const versions = require('fs').readdirSync(claudeCodeDir).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const ver of versions) {
      const p = `${claudeCodeDir}/${ver}/claude.app/Contents/MacOS/claude`;
      try {
        execSync(`test -x "${p}"`, { stdio: 'ignore' });
        return p;
      } catch { /* skip */ }
    }
  } catch { /* dir not found */ }

  const candidates = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${process.env.HOME}/.npm-global/bin/claude`,
    `${process.env.HOME}/.local/bin/claude`,
  ];
  for (const p of candidates) {
    try {
      execSync(`test -x "${p}"`, { stdio: 'ignore' });
      return p;
    } catch { /* skip */ }
  }
  // PATH에서 탐색
  try { return execSync('which claude', { encoding: 'utf8' }).trim(); } catch { return null; }
}

let cachedClaudePath = null;

function isExecutable(filePath) {
  if (!filePath) return false;
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function getClaudeCLI(forceRefresh = false) {
  if (!forceRefresh && isExecutable(cachedClaudePath)) return cachedClaudePath;
  cachedClaudePath = findClaudeCLI();
  return cachedClaudePath;
}

const initialClaudePath = getClaudeCLI(true);

if (!initialClaudePath) {
  console.error('[오류] Claude Code CLI를 찾을 수 없습니다.');
  console.error('  Claude Desktop 앱이 설치되어 있는지 확인하거나');
  console.error('  npm install -g @anthropic-ai/claude-code 로 설치해주세요.');
  process.exit(1);
}

console.log(`[정보] Claude CLI: ${initialClaudePath}`);

// ── 프롬프트 ──
function buildPrompt(frameData, docSection, hasDocs, imagePaths, previousFeatures, includeCommon, mode, reqFlags) {
  previousFeatures = Array.isArray(previousFeatures) ? previousFeatures.filter(Boolean) : [];
  includeCommon = !!includeCommon;
  mode = (mode === 'exception') ? 'exception' : 'spec';
  reqFlags = reqFlags || {};
  var wantEdge = !!reqFlags.edge;
  var wantError = !!reqFlags.error;
  // Corner Case는 더 이상 별도가 아님 — Edge Case 안에 흡수되고 tag="복잡/희귀"로 구분
  if (mode === 'exception' && !wantEdge && !wantError) {
    wantEdge = wantError = true;
  }

  // 디자인시스템 정의 (매 요청마다 최신 파일 읽음)
  var designSystem = loadDesignSystem();
  var designSystemSection = designSystem ? `## 디자인시스템 정의 — 최우선 적용 (Spec-of-Record)
아래 디자인시스템 정의는 이 화면에서 도출되는 **모든 기능의 FE/BE 할일에 무조건 일관 적용**됩니다.
- 표준 문구가 정의된 컴포넌트(토스트·모달·인풋·차트 등)는 정의된 문구를 **거의 그대로 사용**하세요.
  - 예: 토스트가 화면에 있거나 액션 피드백이 필요하면 → FE: "토스트 알림 표시 — fade-in 후 3초 뒤 fade-out으로 자동 사라짐" (디자인시스템 정의 그대로).
  - 예: 모달이 감지되면 → FE에 "모달 표시/딤 오버레이 + (취소/닫기/아니오) 버튼·X 버튼·딤 배경 클릭으로 닫기 + 닫을 때 딤 배경 해제 + 필요 시 변경 롤백 + 포커스 트랩·폼 검증" 포함.
  - 예: 비활성 필드 → "읽기 전용으로 표시" 명시.
- 단위 표기는 디자인시스템 표를 그대로 사용 (원·회·명·%·도 등).
- 색상·타이포·접근성 규칙도 명시된 대로 적용.
- 디자인시스템에 정의되지 않은 컴포넌트만 LLM 추론으로 결정.
- 디자인시스템과 화면이 충돌하면 화면 우선, 단 모호한 부분은 디자인시스템으로 결정.

### 컴포넌트별 상세 명세 링크(docLink) 자동 첨부 규칙 — NEW (중요)
디자인시스템 정의에서 컴포넌트 섹션마다 다음 형식의 줄을 찾으세요:
\`- **상세 명세 (GitHub)**: [표시명](URL)\`

기능이 해당 컴포넌트(예: 토스트, 모달, 인풋 등)를 사용하면 그 feature의 \`docLink\` 필드에 다음과 같이 첨부하세요:
\`"docLink": { "label": "Toast 상세 명세", "url": "https://github.com/.../toast-notification.md" }\`

- url은 디자인시스템.md에 적힌 그대로(PLACEHOLDER 포함이어도 그대로) 복사.
- 한 기능이 여러 컴포넌트를 쓰면 **가장 핵심적인 하나의 컴포넌트** docLink만 첨부.
- 해당 컴포넌트에 GitHub 링크가 정의돼 있지 않으면 \`docLink\`는 생략(또는 null).
- features·edgeCases·errorCases·cornerCases 모두 적용. 모달·토스트·인풋·차트·인사이트 알럿 등 디자인시스템 정의가 있는 모든 컴포넌트 대상.

---
${designSystem}
---
` : '';
  imagePaths = imagePaths || [];
  // frameData는 이제 { frameName, allTexts, buttons, inputs, tabs, structure } 배열
  const pageContext = frameData.map(f => {
    const lines = [];
    lines.push(`## 페이지: "${f.frameName}"`);

    // 사이드바·GNB 활성 메뉴 (기능 아님, 현재 위치 맥락만)
    if (f.activeNav) lines.push(`> 현재 위치: 사이드바/GNB에서 [${f.activeNav}] 활성화됨 (기능 명세 대상 아님)`);

    // Tier 1 — 페이지 목적
    if (f.titles?.length)   lines.push(`### [목적] 타이틀: ${f.titles.join(', ')}`);
    if (f.tabs?.length)     lines.push(`### [목적] 탭/메뉴: ${f.tabs.join(', ')}`);
    if (f.sections?.length) lines.push(`### [목적] 섹션: ${f.sections.join(', ')}`);

    // Tier 2 — 사용자 액션
    if (f.buttons?.length)     lines.push(`### [액션] 버튼: ${f.buttons.join(', ')}`);
    if (f.iconActions?.length) lines.push(`### [액션] 아이콘버튼: ${f.iconActions.join(', ')}`);
    if (f.links?.length)       lines.push(`### [액션] 링크: ${f.links.join(', ')}`);

    // Tier 3 — 데이터 구조
    if (f.inputs?.length)       lines.push(`### [데이터] 입력필드: ${f.inputs.join(', ')}`);
    if (f.disabledFields?.length) lines.push(`### [데이터·비활성] 비활성 입력필드(기능 도출 금지): ${f.disabledFields.join(', ')}`);
    if (f.selects?.length)      lines.push(`### [데이터] 셀렉트/드롭다운: ${f.selects.join(', ')}`);
    if (f.tableHeaders?.length) lines.push(`### [데이터] 테이블컬럼: ${f.tableHeaders.join(', ')}`);
    if (f.hasTable)             lines.push(`### [데이터·테이블] 테이블/목록이 있음 (테이블 규칙 적용)`);
    if (f.hasScroll)            lines.push(`### [데이터·스크롤] 스크롤 영역이 감지됨 (스크롤 규칙 적용)`);
    if (f.listItems?.length)    lines.push(`### [데이터] 리스트아이템: ${f.listItems.slice(0, 5).join(', ')}`);
    if (f.uploads?.length)      lines.push(`### [데이터] 파일업로드: ${f.uploads.join(', ')}`);

    // Tier 4 — 상태와 조건
    if (f.checkboxes?.length)  lines.push(`### [상태] 체크박스: ${f.checkboxes.join(', ')}`);
    if (f.radios?.length)      lines.push(`### [상태] 라디오: ${f.radios.join(', ')}`);
    if (f.toggles?.length)     lines.push(`### [상태] 토글: ${f.toggles.join(', ')}`);
    if (f.badges?.length)      lines.push(`### [상태] 뱃지/태그: ${f.badges.join(', ')}`);
    if (f.emptyStates?.length) lines.push(`### [상태] 빈화면: ${f.emptyStates.join(', ')}`);
    if (f.alerts?.length)      lines.push(`### [상태] 알럿/에러: ${f.alerts.join(', ')}`);
    if (f.toasts?.length)      lines.push(`### [상태] 토스트/스낵바: ${f.toasts.join(', ')} (토스트 알림 규칙 적용)`);

    // Tier 5 — 플로우
    if (f.hasDimOverlay) lines.push(`### [플로우·모달] 딤(dim) 처리된 배경이 감지됨 → 이 화면에는 모달/다이얼로그가 떠 있습니다.`);
    if (f.dimmedBackgroundIgnored) lines.push(`### [분석범위] 딤 영역 아래 배경 텍스트/요소는 가려진 상태라 분석에서 제외됨. 모달 카드 내부만 기능 근거로 사용할 것.`);
    if (f.modals?.length)      lines.push(`### [플로우] 모달/다이얼로그: ${f.modals.join(', ')} (모달 UI로 읽고 모달 구현 기능을 명세에 포함할 것)`);
    if (f.modalDetails?.length) lines.push(`### [플로우·모달상세] 모달 내부 상세 항목(누락 금지):\n  ${f.modalDetails.join('\n  ')}`);
    if (f.drawers?.length)     lines.push(`### [플로우] 드로어: ${f.drawers.join(', ')}`);
    if (f.steppers?.length)    lines.push(`### [플로우] 스텝퍼: ${f.steppers.join(', ')}`);
    if (f.paginations?.length) lines.push(`### [플로우] 페이지네이션: ${f.paginations.join(', ')}`);
    if (f.contextNotes?.length) lines.push(`### [맥락·주석] 선택 영역 내부 주석/설명: ${f.contextNotes.join(' / ')}`);

    // Tier 6 — 컴포넌트 Variant
    if (f.componentVariants?.length) {
      lines.push(`### [컴포넌트] Variants:\n  ${f.componentVariants.slice(0, 10).join('\n  ')}`);
    }

    // 텍스트 (도메인 언어)
    if (f.allTexts?.length) {
      lines.push(`### [텍스트] 화면 내 레이블·설명·상태:\n  ${f.allTexts.slice(0, 60).join('\n  ')}`);
    }

    return lines.join('\n');
  }).join('\n\n---\n\n');

  const imageSection = imagePaths.length
    ? `## 화면 이미지 (가장 중요 — 반드시 먼저 볼 것)
아래 이미지 파일을 **Read 도구로 직접 열어** 화면을 눈으로 보고 분석하세요. 레이어 이름이 "Rectangle 6643"처럼 의미 없어도, 이미지에 보이는 **실제 글자·버튼·입력창·표·드롭다운**이 진짜 근거입니다.
${imagePaths.map((p, i) => `- 화면 ${i + 1}: @${p}`).join('\n')}

**이미지에서 직접 읽어야 할 것:**
- 버튼에 적힌 글자 (예: "초대", "저장", "내보내기")
- 입력창의 placeholder·라벨 (예: "이메일", "이름 입력")
- 표(테이블)의 컬럼명과 셀 내용 (예: 권한 컬럼의 "소유자/관리자/일반회원")
- 드롭다운·셀렉트의 선택지
- 타이틀·섹션 제목
- **모달/팝업**: 배경이 어둡게 딤(dim) 처리되고 가운데에 카드가 떠 있으면 모달입니다. 모달 제목·입력·버튼뿐 아니라 카드 안의 모든 라벨-값 행(예: 유형/상태/요청 시간/점검자/설명)을 끝까지 읽고 기능에 반영하세요.
- **딤 아래 배경**: 모달 때문에 어둡게 가려진 배경 화면의 텍스트·테이블·버튼·아이콘은 보이더라도 기능으로 작성하지 마세요. 모달 카드 내부에 실제로 보이는 요소만 읽으세요.
아래 레이어 구조 정보는 **보조 자료**일 뿐입니다. 이미지에 보이는 것이 우선입니다.

---
`
    : '';

  return `당신은 경력 20년의 시니어 PM입니다.
아래 Figma 화면 ${imagePaths.length ? '이미지와 ' : ''}정보를 바탕으로 기능 명세를 작성하세요.

---
${imageSection}${designSystemSection}## 핵심 원칙 — 반드시 지킬 것
**화면에 실제로 존재하는 UI 요소에서만 기능을 도출하세요.**
- 화면에 없는 기능은 절대 추가하지 마세요. 도메인 상식이나 일반적인 서비스 패턴으로 기능을 지어내지 마세요.
- 각 기능은 반드시 아래 화면 정보의 어떤 요소(버튼, 인풋, 탭, 테이블 등)에서 근거했는지 대응되어야 합니다.
- 화면 정보에 없는 요소(예: 화면에 없는 버튼, 존재하지 않는 탭)는 기능으로 만들지 마세요.

${includeCommon ? `**공통 기능 명세 모드 (🧱 공통기능 읽기 = ON)**
이번 분석은 **GNB·사이드바·설정·프로필 등 공통 영역도 명세 대상에 포함**합니다.
- 화면에 보이는 GNB 메뉴(예: "홈/판매 순위/시간대별 통계/고객 세그먼트")는 각각의 페이지 이동 기능으로 명세하세요. 예: "홈 화면 이동", "판매 순위 화면 이동" — FE: 라우팅 + 활성 메뉴 강조, BE: (없거나 권한 조회).
- 좌측 상단 지점 셀렉트, 우측 상단 설정 아이콘·프로필 아바타·로그아웃 등도 기능으로 명세하세요.
- 「현재 위치:」 표시(activeNav)는 어떤 메뉴가 활성화돼 있는지의 맥락 힌트일 뿐 — 그것 자체를 기능으로 만들지는 마세요. 단, "활성 메뉴 강조 표시"는 FE 할일에 명시.
- anchor 좌표는 해당 공통 UI의 화면상 위치(상단 헤더는 보통 y ≤ 0.06, 좌측 사이드바는 x ≤ 0.2)를 정확히 측정해서 반환.
- features 배열에 공통 기능들을 자연스럽게 포함시키되, 페이지 고유 기능과 섞어도 OK.` : `**사이드바·GNB 규칙 (중요)**
- 「현재 위치:」 로 표시된 사이드바/GNB 항목은 **기능 명세 대상이 아닙니다.** 기능으로 추가하지 마세요.
- 사이드바·GNB는 내비게이션 쉘이며, 어떤 메뉴가 활성화됐는지는 현재 화면의 **맥락 힌트**로만 사용하세요.
- 사이드바·GNB 관련 기능(메뉴 클릭, 라우팅 등)은 명세에 포함하지 않습니다.`}

**액션 우선 규칙 (중요)**
- 핵심 기능은 [액션] 버튼과 [데이터] 셀렉트의 **동작**에서 나옵니다. 버튼/셀렉트 텍스트를 그대로 기능명으로 쓰세요.
  - 예: "초대" 버튼 + "이메일" 입력 → "구성원 초대" / "소유자·관리자·일반회원" 셀렉트 → "구성원 권한 변경" / "내보내기"·"소속 해제" 버튼 → "구성원 내보내기"
- 단순 정보 표시 영역(읽기 전용 타이틀·라벨)만 보고 "○○ 정보 입력" 같은 기능을 만들지 마세요. 실제 입력/액션 요소가 있을 때만 입력 기능을 도출합니다.

**비활성(disabled) 필드 규칙 (중요)**
- 「[데이터·비활성]」 으로 표시된 필드는 **읽기 전용**입니다. 입력·수정·"입력 전/후 상태 전환" 같은 기능을 절대 만들지 마세요.
- 비활성 필드는 사용자 입력 기능의 근거가 될 수 없습니다.
- **다만 비활성 필드의 존재는 반드시 명세에 언급하세요(빼먹지 말 것).** 입력 기능이 아니라 **"읽기 전용 조회/표시"** 기능으로 적습니다.
  - 기능명에 해당 필드를 명시하고, **그 필드가 비활성(읽기 전용)으로 표시된다는 점을 분명히** 적으세요.
  - 예: "기본 정보" 영역의 회사명 필드가 비활성(회색)이면 → **회사 기본정보 조회(읽기 전용)** / FE: 회사명 등 기본정보를 **비활성(읽기 전용)** 으로 표시, 수정 불가 / BE: 회사 기본정보 조회 API
  - 즉, 비활성 필드는 "수정 기능"은 만들지 않되 "읽기 전용으로 보여준다"는 사실은 반드시 명세에 드러나야 합니다.

**모달·다이얼로그 규칙 (중요)**
- 모달은 **화면/선택 프레임의 본문 영역 바깥까지 덮는 딤(dim) 처리된 반투명 배경 + 그 위에 떠 있는 중앙 카드**가 함께 있을 때만 시각적으로 모달로 판단하세요.
- 이미지/사진/썸네일 자체에 어두운 오버레이가 씌워져 있거나, 테이블 셀 안의 작은 사진 위에 라벨·뱃지·그라데이션이 올라간 경우는 **모달이 아닙니다.** 이런 경우는 **테이블 내 썸네일/현장 사진 미리보기**로 명세하세요.
- 특히 테이블 컬럼명이 "사진", "이미지", "썸네일", "현장 사진"이고 각 행에 작은 이미지가 반복되면, 그것은 행 데이터의 thumbnail입니다. 기능명/FE 할일에 "모달"을 쓰지 말고 "썸네일 표시", "현장 사진 썸네일 표시"처럼 쓰세요.
- 이미지에서 배경이 어둡게 깔리고 가운데에 흰 카드(제목·입력·버튼 포함)가 있더라도, 그 딤이 화면 전체/본문 대부분을 덮지 않고 특정 사진·카드 내부에만 있으면 모달로 보지 마세요.
- 「[플로우·모달] 딤 처리…」 표시가 있으면 모달이 떠 있는 상태입니다. 이 표시가 없고 이미지상 전체 화면 딤도 없으면 모달로 가정하지 마세요.
- 모달을 발견하면 **반드시 모달 구현 기능을 명세에 포함**하세요. 기능명에 "모달"을 명시합니다.
- **모달 닫기 동작은 항상 아래 3가지를 모두 명세에 적습니다 (예외 없음):**
  1. **취소/닫기 버튼** — 화면에 보이는 실제 버튼명을 확인해서 적으세요. "취소"·"닫기"·"아니오" 중 화면에 있는 라벨 그대로 사용 (임의로 지어내지 말 것).
  2. **X(닫기) 아이콘 버튼** — 모달 우상단 X 버튼.
  3. **모달 외 영역(딤 처리된 배경) 클릭** 시 닫기.
- 모달을 닫을 때는 **딤 배경(오버레이)도 함께 해제(제거)** 한다는 점을 항상 명세에 적으세요.
- 닫을 때 입력/변경 중이던 내용이 있으면 **필요 시 변경 사항 롤백(되돌리기) 처리**도 FE 할일에 적으세요.
- 따라서 모달 기능의 FE 할일에는 최소한: **모달 표시/딤 오버레이 + (취소/닫기/아니오 — 실제 라벨) 버튼·X 버튼·딤 배경 클릭으로 닫기 + 닫을 때 딤 배경 해제 + 필요 시 변경 롤백 + 포커스 트랩·폼 검증**이 들어갑니다.
- 모달 뒤의 딤 처리된(흐려진) 본문 요소는 모달에 가려진 상태이므로, 그것들로 별도 기능을 또 만들지 말고 모달 내용에 집중하세요.
- **절대 금지:** 딤 영역 아래 배경의 텍스트·테이블 행·버튼·상태 뱃지·아이콘을 읽어서 기능명세에 쓰지 마세요. 배경이 흐릿하게 보여도 현재 활성 UI가 아니므로 분석 대상에서 제외합니다.
- (예외) 모달 기능의 FE 할일은 닫기 동작 3종을 모두 담아야 하므로 40자 제한을 넘겨도 됩니다.
- **모달 내부 상세 정보 규칙:** 모달 카드 안에 라벨-값 행이나 테이블형 상세 목록이 있으면, 이것을 "모달 구현" 한 줄로 뭉개지 말고 **상세 정보 조회/표시 기능**으로 반드시 반영하세요.
  - 예: "유형: 비계", "상태: 위험", "요청 시간: 05-31 수 오전 11:03", "점검자: 김혜연", "설명: ..." 이 보이면 FE에 해당 항목 라벨과 값 표시를 포함하고, BE에는 상세 조회 API가 이 필드를 제공한다고 적습니다.
  - 모달 내부의 사진/현장 이미지와 그 위 표시 영역은 모달 자체와 별개로 **상세 이미지/현장 사진 표시**로 읽습니다.
  - "주의", "위험", "완료" 같은 뱃지/알림 문구는 상태 표시 기능에서 실제 문구를 그대로 사용하세요.
  - 이미지 하단이나 카드 하단에 보이는 행을 절대 생략하지 마세요. 글자가 작아도 Read 이미지와 "[플로우·모달상세]" 정보를 함께 보고 모두 반영하세요.

**토스트 알림 규칙 (고정 — 항상 동일하게 명세)**
- 화면에 토스트/스낵바(저장 완료, 전송됨, 오류 등 일시 알림)가 있거나, 액션 성공/실패 피드백이 필요하면 토스트 동작을 명세에 포함하세요.
- **토스트는 항상 다음 동작으로 고정해서 적습니다:** "**3초 뒤 자동으로 사라지며, 서서히 나타났다가(fade-in) 서서히 사라진다(fade-out)**".
- 토스트 FE 할일 표준형: 「토스트 알림 표시 — fade-in 후 3초 뒤 fade-out으로 자동 사라짐」.

**위치 좌표(anchor) 규칙 — 매우 중요 (NEW)**
- 각 기능마다 화면에서 그 기능의 **트리거 UI 요소 또는 대상 컴포넌트의 좌측 상단 좌표**를 \`anchor\` 객체로 반환하세요.
- \`anchor.x\`: 0~1 사이 상대 좌표 (이미지 좌측 끝=0, 우측 끝=1).
- \`anchor.y\`: 0~1 사이 상대 좌표 (이미지 상단=0, 하단=1).
- \`anchor.note\`: 어떤 UI 요소를 가리키는지 짧은 설명 (예: "기간 셀렉트", "초대 버튼", "이메일 인풋").
- 좌표는 해당 UI 요소의 **시각적 중심점이 아니라 좌측 상단 모서리 근처**를 가리키도록 합니다. 번호 뱃지가 텍스트·아이콘·표 데이터를 덮지 않게 하기 위한 기준입니다.
- 이미지를 직접 보고(Read 도구로) UI 요소의 화면상 위치를 측정해서 0~1 비율로 환산하세요.
- 기능이 여러 요소를 다루면(예: 인풋+버튼) 가장 대표적인 트리거(보통 버튼)의 위치를 사용.
- 화면 전반에 걸치거나 위치를 특정하기 어려우면 \`anchor: null\` 로 반환 (그래도 기능은 포함).
- features 배열은 가능한 한 **화면 좌측 상단에서 우측 하단으로 읽는 순서**로 정렬하세요. 같은 행에 있는 요소는 왼쪽에서 오른쪽 순서로 배치합니다.
- **위치 정확도가 중요합니다.** 대충 찍지 말고 실제 이미지 좌표를 측정해서 0~1 비율로 정밀하게 계산하세요.

**테이블·스크롤 규칙 (고정)**
- 화면에 테이블/목록(「[데이터·테이블]」, 테이블컬럼, 리스트아이템 등)이 있으면 **목록 조회/표시 기능**을 명세에 포함하세요. (컬럼 표시, 행 단위 액션 등)
- 테이블/목록에 스크롤(「[데이터·스크롤]」)이 있고, **"한 번에 몇 개씩 불러오는지"(페이지 크기·페이지네이션) 설명이 화면·문서에 없으면 → 기본값으로 "무한 스크롤(infinite scroll)" 로 명세합니다.**
  - FE: 목록 무한 스크롤 — **스크롤 끝 도달 감지 후 다음 페이지를 지연 로드(lazy load)**, 로딩 인디케이터 표시.
  - BE: 커서/offset 기반 페이징 조회 API (다음 페이지 요청 처리).
- 단, 화면에 명시적 페이지네이션(「[플로우] 페이지네이션」)이나 "N개씩 보기" 같은 개수 표기가 있으면 그 방식(페이지 기반)을 따르고 무한 스크롤로 가정하지 마세요.
- **중요:** 테이블/목록에 스크롤 표시가 없고, 하단 행이 잘려 보이지 않으며, 행 개수가 명확히 보이면 **더 많은 데이터가 있을 것이라고 유추하지 마세요.** 보이는 행 개수를 그대로 최대 표시 개수로 해석합니다.
  - 예: 최근 알림 목록이 정확히 5행만 보이고 스크롤/잘림/페이지네이션이 없으면 → "최근순 알림 목록 최대 5개 표시"로 명세합니다.
  - FE: 테이블 표시, 최근 알림 5개만 표시. "스크롤 시 추가 로드", "더 내려보면 추가 목록" 같은 문구는 금지.
  - BE: 최근순 알림 목록 조회 API, limit=5 또는 최대 5개 반환.
- 테이블 컬럼에 사진/이미지/썸네일이 있으면 해당 셀은 목록 행의 미리보기 이미지입니다. 별도 모달 기능으로 분리하지 말고 목록 조회 기능의 FE에 "사진 썸네일 표시"를 포함하세요.
${previousFeatures.length ? `**이전 분석 누적 규칙 — 중복 생성 금지 (NEW, 매우 중요)**
이전에 같은 파일의 다른 페이지들에서 이미 다음 기능들이 명세되었습니다. 이번 페이지에서 **동일/유사한 기능은 다시 명세하지 마세요.**
이미 정의된 기능 목록(${previousFeatures.length}개):
${previousFeatures.map((n, i) => `  ${i + 1}. ${n}`).join('\n')}

- 위 목록과 **이름이 같거나, 동작이 실질적으로 같은 기능**(GNB 메뉴 이동, 지점 셀렉트, 설정 아이콘 이동, 프로필 메뉴, 기간 범위 선택, 기간 프리셋 전환 등 공통 요소)은 **이번 페이지의 features/unhappyFlows/edgeCases에 절대 포함하지 마세요.**
- 이번 페이지에서 **새로 등장한 화면 고유 기능만** 명세합니다.
- 이름이 약간 다르더라도(예: "지점 선택" vs "지점 셀렉트", "기간 선택" vs "조회 기간 선택") 같은 동작이면 중복으로 간주하고 제외하세요.
- 모달·토스트처럼 화면 고유 UI는 누적 목록에 없어도 새로 명세 가능.
- 결과적으로 이번 페이지에서 명세되는 항목은 "이 화면에서만 가능한 동작"으로 좁혀집니다. 항목이 적어져도 정상입니다.
- 단, **공통 요소가 이번 화면에서 명확히 다른 동작(예: 같은 셀렉트인데 다른 값 선택 후 다른 결과)을 만든다면** 그건 새 기능으로 명세해도 됩니다 — 이때 기능명을 차별화하세요.

` : ''}${hasDocs ? `**문서 참고 규칙 (PRD/요구사항이 첨부된 경우 필수)**
- 첨부된 PRD/요구사항 문서를 **처음부터 끝까지 빠짐없이 읽고** 화면 요소와 1:1로 대조하세요. 문서에 명시된 정책·검증 규칙·에러 케이스·정상 흐름·예외 흐름·데이터 형식·필드 제약·사용자 권한·도메인 용어를 모두 반영합니다.
- 화면에는 보이지 않지만 문서에 명시된 정책(예: 최소 비밀번호 길이, 입력 글자수 제한, 권한별 노출 차이, 에러 메시지 문구)은 **FE/BE 할일에 반드시 반영**하세요.
- 단, 문서에만 있고 화면에 전혀 근거 요소가 없는 별도 기능은 추가하지 마세요. 문서 = 화면 요소를 더 정확히 해석하는 근거 자료.
- 도메인 용어·정책 표현·에러 문구는 문서 표현을 그대로 사용하세요(임의 변형 금지).
- 언해피플로우·엣지케이스 도출 시에도 문서에 명시된 예외·실패·제약 조건을 우선 근거로 삼으세요.` : ''}
${docSection}

---
## Figma 화면 정보 (이 안에 있는 것만 기능으로 만드세요)
${pageContext}

---
## 작성 규칙
1. 각 기능은 화면의 특정 UI 요소(버튼·탭·인풋·텍스트 레이블 등)에서 직접 도출된 것이어야 함
2. 기능명은 동사+목적어, 화면 텍스트를 그대로 활용 (예: 화면에 "초대" 버튼이 있으면 → "구성원 초대")
3. FE: 해당 UI 구현·상태 관리·API 연동·유효성 검사
4. BE: 해당 기능의 API·비즈니스 로직·DB·인증
5. 각 할일은 40자 이내 한 줄
6. 장식용 UI(구분선·배경·아이콘만 있는 요소)는 제외

## 완전성(누락 금지) 규칙 — 매우 중요
- 화면의 **모든 상호작용 요소를 빠짐없이** 기능으로 다루세요. 다음은 각각 최소 1개 기능에 대응되어야 합니다:
  - 모든 [액션] 버튼 (초대·내보내기·저장 등)
  - 모든 [데이터] 셀렉트/드롭다운 (권한 선택 등) — **입력값 선택 동작 자체도 별도 기능이 될 수 있음**
  - 모든 입력필드 + 버튼 조합 (이메일 입력 + 초대)
  - 테이블/목록 (목록 조회·스크롤)
  - 비활성(읽기 전용) 필드 (조회/표시로 언급)
  - 모달·토스트 (있을 때)
- 여러 요소를 임의로 하나의 기능에 뭉뚱그려 **다른 요소를 누락시키지 마세요.** 동작이 다르면 분리합니다.
- **출력 직전 자가 점검(필수):** 위 목록의 각 요소가 features에 최소 1번 등장하는지 확인하고, 빠진 게 있으면 반드시 추가한 뒤 출력하세요. (점검 과정은 출력하지 말 것 — 결과 JSON만)

## 레이블 없는 버튼 처리 (중요)
- 버튼·요소의 레이어 이름이 "Rectangle 1234" 처럼 의미 없어도, **[텍스트] 섹션의 도메인 단어**로 기능을 추론하세요.
- 화면에 "구성원", "초대", "이메일", "권한", "소유자/관리자" 같은 텍스트가 있으면 그것이 곧 기능의 근거입니다.
- 레이블이 비어 있다는 이유로 분석을 포기하지 마세요. **[텍스트]에 보이는 도메인 언어 = 화면에 실재하는 기능**입니다.

${mode === 'spec' ? `## 모드 — 기능 명세 생성 (mode=spec)
이번 분석은 **정상 기능(features)만** 도출합니다. 예외/오류/엣지 케이스는 별도 탭에서 다루므로 이번 응답에는 포함하지 마세요. \`overview\`와 \`features\`만 채우세요.` : `## 모드 — 예외 케이스 생성 (mode=exception)
이번 분석은 **디자이너가 만들 예외 페이지 목록**을 정리하는 작업입니다. 일반 features·overview는 이번 응답에 포함하지 마세요.
요청된 대분류 (체크된 것만 채우세요):
${wantEdge ? '- ✅ 엣지케이스(edgeCases): 최소/최대값·콘텐츠 양·미디어·날짜/시간 등 정상 범위의 경계 상황' : '- ❌ 엣지케이스 생성 안 함'}
${wantError ? '- ✅ 에러케이스(errorCases): 데이터/에러/권한/프로세스/콘텐츠 상태 등 실패·상태 처리 페이지' : '- ❌ 에러케이스 생성 안 함'}

## 디자이너용 작성 방식 — 반드시 지킬 것
- 대분류는 반드시 \`edgeCases\`, \`errorCases\` 로만 나눕니다.
- 중분류는 아래 1~10 번호 중 하나를 반드시 넣습니다.
- 각 항목은 디자이너가 바로 페이지/상태를 만들 수 있게 **2~3줄 이내 핵심만** 작성합니다.
- 너무 짧아질 경우 \`problem\`(현재 문제)과 \`design\`(제작해야 할 페이지 핵심 구성요소)을 분리해서 작성합니다.
- \`priority\`는 반드시 \`필수\`, \`권장\`, \`선택\` 중 하나입니다. UI에서 뱃지로 표시됩니다.
- \`components\`에는 필요한 컴포넌트나 디자인 요소를 짧게 적습니다. 예: "스켈레톤, 재시도 버튼, 토스트", "Empty State, CTA 버튼".
- \`problem\`, \`design\`, \`components\`는 플러그인 내부에 표시되는 **디자이너 관점** 문장입니다. 여기에는 BE/API 구현 설명을 쓰지 마세요.
- \`devTitle\`, \`fe\`, \`be\`는 Figma 캔버스에 표시되는 **개발자 관점** 문장입니다. 첨부 이미지의 분류처럼 "에러 케이스 = 시스템이 잘못된 상태", "엣지 케이스 = 정상 범위의 경계 상황"을 구분해 타이틀을 작성하세요.
- 캔버스용 \`fe\`는 사용자가 보게 되는 UI 처리, 상태 컴포넌트, 인터랙션 방어 로직 중심으로 작성하세요.
- 캔버스용 \`be\`는 API 응답, 검증, 권한, 상태 코드, 재시도/캐시/락 정책 중심으로 작성하세요.
- 화면/문서에 직접 관련 없는 항목은 줄이고, 관련도가 높은 항목을 우선합니다.

## UX 라이팅 규칙 — 반드시 지킬 것
- "극단 상태", "극단값"이라는 표현은 사용자에게 모호하므로 **출력하지 마세요.**
- 대신 \`최소 상태\`, \`최대 상태\`, \`최소/최대 상태\`, \`경계 상태\`처럼 쓰세요.
- \`feature\`는 추상명 대신 실제 조건을 풀어서 작성하세요.
  - 나쁜 예: "메뉴 항목 1개 극단 상태"
  - 좋은 예: "메뉴 항목이 1개만 있는 경우"
  - 좋은 예: "메뉴 항목이 최대 개수까지 늘어난 경우"
- \`categoryTitle\`도 "텍스트 극단값", "숫자 극단값", "리스트 / 콘텐츠 양 극단값"처럼 쓰지 말고 아래 중분류명을 그대로 사용하세요.
- \`problem\`은 "깨질 수 있습니다", "어색할 수 있습니다"처럼 뭉뚱그리지 말고 **왜 어색한지 실제 UI 현상**을 적으세요.
  - 나쁜 예: "목록 간격과 빈 영역 처리가 깨질 수 있습니다."
  - 좋은 예: "메뉴가 1개뿐인데도 기존 5개 기준의 간격이 남아서 화면이 어색하게 비어 보입니다."
  - 좋은 예: "긴 회사명이 줄바꿈 없이 들어오면 테이블 셀 너비를 밀어 다른 컬럼 값이 읽기 어려워집니다."
- \`design\`은 "처리를 제작합니다"로 끝내지 말고, 어떤 여백·구분선·말줄임·빈 상태·스크롤 정책을 정해야 하는지 구체적으로 적으세요.

## 중분류 체크리스트
### 에러케이스(errorCases) 우선 범위
1. 데이터 상태 — 로딩, 데이터 없음, 검색 결과 없음, 필터 적용
2. 에러 / 장애 상태 — 전체 페이지 에러, 데이터 로딩 실패, 폼 입력 에러, 액션 실패, 네트워크 끊김
3. 권한 / 접근 상태 — 비로그인, 권한 없음, 플랜 제한, 세션 만료
4. 프로세스 상태 — 처리 중, 성공, 비활성화, 변경 사항 있음
5. 콘텐츠 특수 상태 — 삭제됨, 읽기 전용, 종료됨, 첫 방문/온보딩, 점검 중

### 엣지케이스(edgeCases) 우선 범위
6. 텍스트 최소/최대 상태 — 긴 텍스트, 미입력, 줄바꿈 없는 단어, 특수문자/이모지
7. 숫자 최소/최대 상태 — 큰 숫자, 금액/자릿수 초과, 0/음수, 0%/100%
8. 리스트 / 콘텐츠 수량 최소/최대 상태 — 1개만 있음, 매우 많음, 중첩 깊이, 테이블 컬럼 초과
9. 미디어 최소/최대 상태 — 이미지 없음, 로딩 실패, 비율 불일치, 파일 용량/형식 초과
10. 날짜 / 시간 경계 상태 — 상대/절대 시간, 날짜 범위 역전, 타임존/로케일

## 항목 JSON 형식
\`{
  "feature": "디자이너가 만들 페이지/상태 이름",
  "categoryNo": 1,
  "categoryTitle": "데이터 상태",
  "priority": "필수",
  "problem": "사용자가 실제로 보게 되는 어색함/오류 현상을 구체적으로 1문장으로",
  "design": "정해야 할 여백·구분선·말줄임·빈 상태·스크롤 등 화면 처리와 핵심 구성요소를 1~2문장으로",
  "components": "필요 컴포넌트/디자인 요소",
  "devTitle": "개발자 관점 예외 타이틀",
  "fe": "FE 구현 할일",
  "be": "BE 구현 할일",
  "icon": "관련 이모지 1개",
  "anchor": null
}\`

## 개수
${wantError ? '- errorCases: 화면과 문서에 맞는 항목 5~10개. 중분류 1~5를 우선 커버.' : ''}
${wantEdge ? '- edgeCases: 화면과 문서에 맞는 항목 5~10개. 중분류 6~10을 우선 커버.' : ''}
중요도가 낮은 항목은 \`선택\`으로 두고, 화면 제작에 반드시 필요한 항목은 \`필수\`로 지정하세요.`}

## 출력 형식 — 매우 중요 (반드시 지킬 것)
- **JSON 객체 단 하나만 출력합니다.** 설명·머리말·분석·요약·마크다운·코드펜스 절대 금지.
- 응답의 **첫 글자는 반드시 \`{\` 이고 마지막 글자는 \`}\`** 여야 합니다.
- ${mode === 'spec' ? '객체는 \`overview\`(화면 설명)와 \`features\`(기능 배열) **두 키만** 가집니다. \`edgeCases\`/\`errorCases\` 키는 포함하지 마세요.' : '객체는 요청된 예외 케이스 키만 가집니다 (' + [wantEdge && '`edgeCases`', wantError && '`errorCases`'].filter(Boolean).join(', ') + '). 그 외 키(features/overview/cornerCases 등)는 포함하지 마세요.'}
- \`overview.title\`: 이 화면의 이름 (예: "회사 구성원 관리").
- \`overview.purpose\`: 이 화면이 **무엇을 하는 화면인지** 1~2문장으로 설명. 사용자가 이 화면에서 무엇을 할 수 있는지 중심.
- "정보가 부족하다", "확인된 요소" 같은 메타 설명을 절대 쓰지 마세요.
- [텍스트]·[액션]·[데이터] 또는 이미지에 "초대", "권한", "구성원", "이메일", "소유자/관리자/일반회원", "내보내기", "해제" 같은 도메인·액션 단어가 하나라도 있으면 **반드시 해당 기능을 1개 이상 도출**해야 합니다. \`features\`가 빈 배열이면 오답입니다.
- 입력필드(예: 이메일) + 액션 버튼(예: 초대)의 조합이 보이면 그것은 명백한 기능입니다. 절대 누락하지 마세요.

${mode === 'spec' ? `형식 예시 (이 구조의 JSON만 출력):
{
  "overview": {
    "title": "화면 이름 (예: 회사 구성원 관리)",
    "purpose": "이 화면이 무엇을 하는 화면인지 1~2문장 설명"
  },
  "features": [
    {
      "feature": "기능명 (동사+목적어, 화면 텍스트 기반)",
      "icon": "관련 이모지 1개",
      "fe": "FE 구현 할일 (40자 이내)",
      "be": "BE 구현 할일 (40자 이내)",
      "anchor": { "x": 0.42, "y": 0.18, "note": "기간 셀렉트" },
      "docLink": { "label": "Toast 상세 명세", "url": "https://github.com/.../toast-notification.md" }
    }
  ]
}

- \`anchor\` 키는 features의 모든 항목에 반드시 포함 (위치 특정 불가 시 \`null\`).
- \`anchor.x\`, \`anchor.y\`는 0~1 사이 실수.
- \`docLink\`는 해당 기능의 컴포넌트가 디자인시스템에 GitHub 링크를 가진 경우에만 포함 (옵션).
- features 최소 5개 이상 (화면이 매우 단순하면 3개 이상).` : `형식 예시 (이 구조의 JSON만 출력 — 요청 안 된 키는 포함하지 마세요):
{
${wantEdge ? `  "edgeCases": [
    {
      "feature": "긴 텍스트 말줄임 상태",
      "categoryNo": 6,
      "categoryTitle": "텍스트 최소/최대 상태",
      "priority": "필수",
      "icon": "🧩",
      "problem": "상품명이 한 줄에 다 들어가지 않으면 카드 제목 영역이 높아져 가격·상태 뱃지가 아래로 밀립니다.",
      "design": "1줄 말줄임, 전체 텍스트 툴팁, 모바일 2줄 제한과 줄바꿈 정책을 함께 제작합니다.",
      "components": "텍스트 셀, 툴팁, 말줄임 스타일",
      "devTitle": "텍스트 길이 경계값 처리",
      "fe": "말줄임·툴팁·줄바꿈 정책 적용",
      "be": "최대 길이 검증 및 원문 응답 보장",
      "anchor": null
    },
    {
      "feature": "메뉴 항목이 1개만 있는 경우",
      "categoryNo": 8,
      "categoryTitle": "리스트 / 콘텐츠 수량 최소/최대 상태",
      "priority": "필수",
      "icon": "🧩",
      "problem": "메뉴가 1개뿐인데도 기존 5개 기준의 간격이 남아서 화면이 어색하게 비어 보입니다.",
      "design": "단일 메뉴일 때의 상하 여백, 구분선 노출 여부, 리스트 컨테이너 높이, 하단 빈 영역 처리를 제작합니다.",
      "components": "리스트 컴포넌트, 단일 메뉴 아이템, 구분선, 빈 영역",
      "devTitle": "메뉴 최소 개수 표시 상태 처리",
      "fe": "단일 메뉴 여백·구분선 정책 적용",
      "be": "권한별 메뉴 목록 1건 응답 보장",
      "anchor": null
    },
    {
      "feature": "이미지 없음 상태",
      "categoryNo": 9,
      "categoryTitle": "미디어 최소/최대 상태",
      "priority": "권장",
      "icon": "🧩",
      "problem": "프로필·상품·썸네일 이미지가 없으면 이미지 영역이 비어 보여 로딩 중인지 데이터가 없는지 구분하기 어렵습니다.",
      "design": "이니셜 아바타, 기본 플레이스홀더, 대체 아이콘 중 어떤 폴백을 보여줄지 상태별로 제작합니다.",
      "components": "Avatar, 이미지 플레이스홀더",
      "devTitle": "이미지 없음 폴백 처리",
      "fe": "기본 이미지·이니셜 아바타로 대체",
      "be": "이미지 URL null/404 상태 구분 반환",
      "anchor": null
    }
  ]${wantError ? ',' : ''}` : ''}
${wantError ? `  "errorCases": [
    {
      "feature": "데이터 없음 상태",
      "categoryNo": 1,
      "categoryTitle": "데이터 상태",
      "priority": "필수",
      "icon": "⚠️",
      "problem": "조회는 성공했지만 결과가 0건이면 사용자가 다음 행동을 알기 어렵습니다.",
      "design": "빈 상태 문구, 원인 안내, 첫 액션 CTA를 한 화면 상태로 제작합니다.",
      "components": "Empty State, CTA 버튼",
      "devTitle": "빈 결과 상태 처리",
      "fe": "Empty State와 CTA 표시",
      "be": "0건 응답과 필터 조건 메타 반환",
      "anchor": null
    },
    {
      "feature": "폼 입력 에러 상태",
      "categoryNo": 2,
      "categoryTitle": "에러 / 장애 상태",
      "priority": "필수",
      "icon": "⚠️",
      "problem": "입력값이 틀렸을 때 어느 필드가 왜 틀렸는지 바로 알아야 합니다.",
      "design": "필드 하단 에러 텍스트, 빨간 border, 저장 버튼 상태를 함께 제작합니다.",
      "components": "Input, Form Error, Button",
      "devTitle": "폼 입력 검증 실패 처리",
      "fe": "필드별 에러와 버튼 상태 갱신",
      "be": "검증 실패 사유와 필드 키 반환",
      "anchor": null
    }
  ]` : ''}
}

- \`anchor\` 키는 모든 항목에 반드시 포함 (위치 특정 불가 시 \`null\`).
- \`anchor.x\`, \`anchor.y\`는 0~1 사이 실수.
- \`priority\`는 반드시 "필수" / "권장" / "선택" 중 하나.
- \`categoryNo\`는 반드시 1~10 숫자.
- \`problem\`, \`design\`은 각각 1~2문장 이내.
- 각 항목에는 \`devTitle\`, \`fe\`, \`be\`를 반드시 포함하세요. 플러그인 내부는 \`problem/design/components\`를, 캔버스는 \`devTitle/fe/be\`를 사용합니다.`}`;
}

function buildFastSpecPrompt(frameData, docSection, hasDocs, imagePaths, previousFeatures, includeCommon) {
  previousFeatures = Array.isArray(previousFeatures) ? previousFeatures.filter(Boolean).slice(0, 80) : [];
  const pageContext = (Array.isArray(frameData) ? frameData : []).map(f => {
    const lines = [];
    lines.push(`## 페이지: "${f.frameName || 'Untitled'}"`);
    if (f.activeNav) lines.push(`- 현재 위치: ${f.activeNav} (기능명세 대상 아님)`);
    if (f.titles?.length) lines.push(`- 타이틀: ${f.titles.join(', ')}`);
    if (f.sections?.length) lines.push(`- 섹션: ${f.sections.join(', ')}`);
    if (f.buttons?.length) lines.push(`- 버튼: ${f.buttons.join(', ')}`);
    if (f.selects?.length) lines.push(`- 셀렉트: ${f.selects.join(', ')}`);
    if (f.inputs?.length) lines.push(`- 입력필드: ${f.inputs.join(', ')}`);
    if (f.tableHeaders?.length) lines.push(`- 테이블컬럼: ${f.tableHeaders.join(', ')}`);
    if (f.hasTable) lines.push('- 테이블/목록 있음');
    if (f.hasScroll) lines.push('- 스크롤 있음');
    if (f.paginations?.length) lines.push(`- 페이지네이션: ${f.paginations.join(', ')}`);
    if (f.modals?.length) lines.push(`- 모달/팝업: ${f.modals.join(', ')}`);
    if (f.dimmedBackgroundIgnored) lines.push('- 딤 아래 배경 요소 제외됨: 모달 카드 내부만 분석 대상');
    if (f.modalDetails?.length) lines.push(`- 모달 내부 상세 항목: ${f.modalDetails.join(' / ')}`);
    if (f.contextNotes?.length) lines.push(`- 주석/설명: ${f.contextNotes.join(' / ')}`);
    if (f.allTexts?.length) lines.push(`- 레이어 텍스트: ${f.allTexts.slice(0, 80).join(' / ')}`);
    return lines.join('\n');
  }).join('\n\n');
  const images = imagePaths.length
    ? imagePaths.map((p, i) => `- 화면 ${i + 1}: @${p}`).join('\n')
    : '- 이미지 없음';
  const prev = previousFeatures.length ? previousFeatures.map((n, i) => `${i + 1}. ${n}`).join('\n') : '(없음)';
  return `당신은 Figma 화면을 보고 기능명세 JSON을 만드는 시니어 PM입니다.

## 반드시 먼저 볼 화면 이미지
${images}

## 보조 레이어 정보
${pageContext}

${hasDocs ? `## 첨부 문서\n${docSection.slice(0, 18000)}` : ''}

## 이전에 이미 명세한 기능(중복 금지)
${prev}

## 읽기 규칙
- 이미지에 보이는 실제 글자, 버튼, 표 컬럼, 표 셀, 드롭다운, 뱃지, 페이지네이션을 우선 근거로 삼습니다.
- 사이드바/GNB 메뉴 이동은 기능으로 만들지 않습니다. 활성 메뉴는 현재 화면 맥락으로만 사용합니다.
- 테이블 안의 사진/이미지/현장 사진은 모달이 아니라 썸네일입니다. "사진 썸네일 표시"로 적습니다.
- 화면 전체/본문 대부분을 덮는 딤 배경 + 중앙 카드가 함께 있을 때만 모달입니다. 사진 위 딤/그라데이션은 모달이 아닙니다.
- 모달이 떠 있으면 딤 아래 배경의 텍스트/테이블/버튼/아이콘은 기능으로 만들지 않습니다. 모달 카드 내부만 읽습니다.
- 진짜 모달이면 제목, X 닫기, 딤 닫기, 내부 사진/이미지, 알림 카드, 라벨-값 상세 항목을 모두 읽습니다.
- 모달 내부에 "유형/상태/요청 시간/점검자/설명" 같은 행이 보이면 "상세 정보 조회/표시" 기능에 정확한 항목명을 모두 포함합니다. "모달 표시" 한 줄로 뭉개지 않습니다.
- 테이블에 스크롤이 없고 하단이 잘리지 않았으며 보이는 행 수가 명확하면 더 많은 목록을 추측하지 않습니다.
- 페이지네이션이 보이면 무한스크롤로 쓰지 말고 페이지네이션 목록 조회로 씁니다.
- anchor는 해당 UI/컴포넌트의 좌측 상단 근처 상대 좌표입니다. 0~1 값으로 넣습니다.
- features는 화면 좌측 상단에서 우측 하단 순서로 정렬합니다.
- 화면에서 근거가 약한 기능은 만들지 않습니다.
- ${includeCommon ? '공통 헤더/사이드바 기능도 화면에 보이는 범위에서 포함할 수 있습니다.' : '공통 헤더/사이드바 기능은 제외합니다.'}

## 출력
JSON 객체만 출력하세요. 설명/코드펜스 금지.
{
  "overview": {
    "title": "화면 이름",
    "purpose": "사용자가 이 화면에서 할 수 있는 일 1~2문장"
  },
  "features": [
    {
      "feature": "기능명",
      "icon": "관련 이모지 1개",
      "fe": "FE 구현 할일 40자 이내",
      "be": "BE 구현 할일 40자 이내",
      "anchor": { "x": 0.1, "y": 0.2, "note": "가리키는 UI" }
    }
  ]
}`;
}

function buildFeatureMdPrompt(payload, imagePaths) {
  const frameData = Array.isArray(payload.frameData) ? payload.frameData : [];
  const generatedFeatures = Array.isArray(payload.generatedFeatures) ? payload.generatedFeatures : [];
  const overview = payload.overview || null;
  const additionalText = String(payload.additionalText || '').trim();
  const prdContent = String(payload.prdContent || '').trim();
  const reqContent = String(payload.reqContent || '').trim();
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const skillMain = readSkillFile('SKILL.md', 18000);
  const commonMd = readSkillFile('references/common_md_structure.md', 14000);
  const contentRules = readSkillFile('references/feature_content_rules.md', 12000);
  const coreRules = readSkillFile('references/core_summary_rules.md', 12000);

  const pageContext = frameData.map((f, idx) => {
    const lines = [];
    lines.push(`## 선택 영역 ${idx + 1}: "${f.frameName || 'Untitled'}"`);
    if (f.titles?.length) lines.push(`- 타이틀: ${f.titles.join(', ')}`);
    if (f.sections?.length) lines.push(`- 섹션: ${f.sections.join(', ')}`);
    if (f.tabs?.length) lines.push(`- 탭/메뉴: ${f.tabs.join(', ')}`);
    if (f.buttons?.length) lines.push(`- 버튼: ${f.buttons.join(', ')}`);
    if (f.inputs?.length) lines.push(`- 입력필드: ${f.inputs.join(', ')}`);
    if (f.selects?.length) lines.push(`- 셀렉트/드롭다운: ${f.selects.join(', ')}`);
    if (f.tableHeaders?.length) lines.push(`- 테이블컬럼: ${f.tableHeaders.join(', ')}`);
    if (f.hasTable) lines.push('- 테이블/목록 있음');
    if (f.hasScroll) lines.push('- 스크롤 영역 있음');
    if (f.listItems?.length) lines.push(`- 리스트아이템: ${f.listItems.slice(0, 10).join(', ')}`);
    if (f.badges?.length) lines.push(`- 뱃지/상태: ${f.badges.join(', ')}`);
    if (f.modals?.length) lines.push(`- 모달/팝업: ${f.modals.join(', ')}`);
    if (f.dimmedBackgroundIgnored) lines.push('- 딤 아래 배경 요소 제외됨: 모달 카드 내부만 문서화 대상');
    if (f.modalDetails?.length) lines.push(`- 모달 내부 상세 항목:\n${f.modalDetails.map(v => `  - ${v}`).join('\n')}`);
    if (f.contextNotes?.length) lines.push(`- 선택 영역 내부 주석/설명: ${f.contextNotes.join(' / ')}`);
    if (f.allTexts?.length) {
      const textLines = f.allTexts.slice(0, 160).map(t => `  - ${t}`).join('\n');
      lines.push(`- 화면/기능설명 텍스트:\n${textLines}`);
    }
    return lines.join('\n');
  }).join('\n\n');

  const featureText = generatedFeatures.length
    ? generatedFeatures.map((f, i) => `${i + 1}. ${f.feature || '기능'}\n   - FE: ${f.fe || ''}\n   - BE: ${f.be || ''}`).join('\n')
    : '(플러그인 기능 카드가 아직 없거나 전달되지 않았습니다. 선택 영역 텍스트와 추가 텍스트를 우선 사용하세요.)';

  const imageRefs = imagePaths.map((p, i) => `- 화면 이미지 ${i + 1} 저장 예정 경로: assets/{{topic}}/screen-${i + 1}.png`).join('\n') || '- 이미지 없음';

  return `당신은 feature-generator 스킬을 따르는 한국어 기능명세서 MD 작성자입니다.
아래 스킬 지침을 엄격히 적용해 기능명세서 Markdown 파일 1개를 생성하세요.

## feature-generator/SKILL.md
${skillMain}

## references/common_md_structure.md
${commonMd}

## references/feature_content_rules.md
${contentRules}

## references/core_summary_rules.md
${coreRules}

## 입력 소스

### 1) Figma 선택 영역 이미지
${imageRefs}

### 2) Figma 선택 영역 구조·텍스트·주석 맥락
${pageContext || '(선택 영역 구조 정보 없음)'}

### 3) 플러그인이 앞서 생성한 기능명세 카드 텍스트
${featureText}

### 4) 사용자가 MD 생성을 위해 추가 입력한 맥락 텍스트
${additionalText || '(추가 텍스트 없음)'}

${overview ? `### 5) 화면 설명\n- 제목: ${overview.title || ''}\n- 목적: ${overview.purpose || ''}` : ''}

${prdContent ? `### 6) 첨부 PRD\n${prdContent.slice(0, 30000)}` : ''}
${reqContent ? `### 7) 첨부 요구사항정의서\n${reqContent.slice(0, 30000)}` : ''}

## 작성 기준
- 최종 산출물은 기능명세서 Markdown입니다.
- 스킬 지침의 Required MD Structure, Section Spacing Rule, Required Core Summary Tables, Fixed Requirement Columns를 반드시 지키세요.
- 요구사항 테이블 컬럼명은 정확히 다음 순서로 작성하세요:
  1depth | 2depth | 3depth | 요구사항 ID | 요구사항명 | 요청목적 | 기능 요구사항 | 프로세스 요구사항 | 화면 요구사항 | 보안 요구사항 | 데이터 요구사항
- 화면 이미지가 있으면 본문 또는 관련 화면 섹션에 상대 경로로 포함하세요. 경로는 반드시 assets/<topic>/screen-N.png 형식을 사용하세요.
- <topic>은 당신이 정한 filename에서 .md를 뺀 값입니다.
- source에 없는 API endpoint, DB schema, enum, error code, analytics event, 내부 상태머신은 invent하지 마세요.
- 추가 텍스트는 화면만으로 부족한 도메인 맥락이므로 가장 높은 우선순위로 반영하세요.
- 선택 영역 내부 주석/설명은 사용자의 보충 맥락으로 보고 누락 없이 반영하세요.
- 모달 내부 상세 항목이 있으면 유형/상태/요청 시간/점검자/설명처럼 보이는 라벨-값을 요구사항 테이블과 화면 요구사항에 모두 반영하세요.
- 딤 아래 배경 요소 제외 표시가 있으면 배경 화면의 텍스트/테이블/버튼/아이콘은 문서에 쓰지 말고 모달 카드 내부 내용만 요구사항 근거로 사용하세요.
- 변경 이력의 일자는 ${today}, 작성자는 항상 "Codex, 김혜연"으로 작성하세요.
- filename은 feature-generator의 File Naming Rules를 따르는 영문 소문자 kebab-case .md 파일명으로 정하세요.

## 출력 형식
JSON 객체만 출력하세요. 설명/마크다운 fence를 붙이지 마세요.
{
  "filename": "concise-topic.md",
  "title": "문서 제목",
  "markdown": "완성된 기능명세서 MD 전체"
}`;
}

function mdCell(value) {
  return String(value == null ? '' : value)
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|')
    .trim();
}

function firstNonEmpty(arr, fallback) {
  arr = Array.isArray(arr) ? arr : [];
  for (const v of arr) {
    const s = String(v || '').trim();
    if (s) return s;
  }
  return fallback || '';
}

function featureMdTopic(payload, frameData, features) {
  const overview = payload.overview || {};
  const raw = overview.title
    || (features[0] && features[0].feature)
    || (frameData[0] && frameData[0].frameName)
    || 'feature-spec';
  const roman = String(raw)
    .replace(/프로젝트/g, 'project')
    .replace(/위험/g, 'risk')
    .replace(/알림/g, 'alert')
    .replace(/대시보드/g, 'dashboard')
    .replace(/목록/g, 'list')
    .replace(/상세/g, 'detail')
    .replace(/설정/g, 'settings')
    .replace(/관리/g, 'management');
  return slugifyAscii(roman, 'feature-' + shortHash(raw)).slice(0, 60) || ('feature-' + shortHash(raw));
}

function compactFrameNotes(frameData) {
  return frameData.map((f, idx) => {
    const parts = [];
    if (f.frameName) parts.push(`선택 영역 ${idx + 1}: ${f.frameName}`);
    if (f.titles && f.titles.length) parts.push(`타이틀 ${f.titles.join(', ')}`);
    if (f.sections && f.sections.length) parts.push(`섹션 ${f.sections.join(', ')}`);
    if (f.tableHeaders && f.tableHeaders.length) parts.push(`테이블 컬럼 ${f.tableHeaders.join(', ')}`);
    if (f.contextNotes && f.contextNotes.length) parts.push(`주석 ${f.contextNotes.join(' / ')}`);
    if (f.allTexts && f.allTexts.length) parts.push(`텍스트 ${f.allTexts.slice(0, 8).join(' / ')}`);
    return parts.join(' · ');
  }).filter(Boolean);
}

function normalizeFeatureRows(payload, frameData) {
  const generated = Array.isArray(payload.generatedFeatures) ? payload.generatedFeatures : [];
  if (generated.length) {
    return generated.map((f, i) => ({
      id: `REQ-${String(i + 1).padStart(3, '0')}`,
      name: f.feature || `기능 ${i + 1}`,
      fe: f.fe || '원문 기준 추가 정의 필요',
      be: f.be || '원문 기준 추가 정의 필요',
      source: f.anchor && f.anchor.note ? f.anchor.note : '',
    }));
  }

  const notes = compactFrameNotes(frameData).slice(0, 12);
  if (notes.length) {
    return notes.map((note, i) => ({
      id: `REQ-${String(i + 1).padStart(3, '0')}`,
      name: `선택 영역 ${i + 1} 요구사항 정리`,
      fe: note,
      be: '원문 기준 추가 정의 필요',
      source: note,
    }));
  }

  return [{
    id: 'REQ-001',
    name: '기능 요구사항 정리',
    fe: '원문 기준 추가 정의 필요',
    be: '원문 기준 추가 정의 필요',
    source: '',
  }];
}

function buildLocalFeatureMarkdown(payload, frameData, imageCount) {
  const features = normalizeFeatureRows(payload, frameData);
  const overview = payload.overview || {};
  const additionalText = String(payload.additionalText || '').trim();
  const notes = compactFrameNotes(frameData);
  const topic = featureMdTopic(payload, frameData, features);
  const title = overview.title || firstNonEmpty(frameData.map(f => f.frameName), '기능명세서');
  const today = new Date().toISOString().slice(0, 10);
  const purpose = overview.purpose || `${title} 화면에서 확인된 기능, 화면 텍스트, 추가 맥락을 기준으로 요구사항을 정리한다.`;
  const imageLines = [];
  for (let i = 0; i < imageCount; i++) {
    imageLines.push(`![화면 참고 ${i + 1}](assets/{{topic}}/screen-${i + 1}.png)`);
  }

  const requirementRows = features.map((f, i) => {
    const depth1 = '프로젝트';
    const depth2 = title;
    const depth3 = f.name;
    const functional = [`- ${f.fe}`];
    if (additionalText) functional.push(`- 추가 맥락: ${additionalText}`);
    if (f.source) functional.push(`- 근거: ${f.source}`);
    const screenReq = [`- 화면에서 ${f.name} 관련 UI를 표시한다.`];
    if (imageCount) screenReq.push('- 화면 참고 이미지를 기준으로 UI 요소와 문구를 확인한다.');
    return [
      depth1,
      depth2,
      depth3,
      f.id,
      f.name,
      purpose,
      functional.join('<br>'),
      `사용자가 화면 진입 → ${f.name} 확인/수행 → 관련 상태 확인`,
      screenReq.join('<br>'),
      '원문 기준 추가 정의 필요',
      f.be,
    ].map(mdCell).join(' | ');
  }).map(row => `| ${row} |`).join('\n');

  const iaRows = features.map(f => `| ${mdCell('프로젝트')} | ${mdCell(title)} | ${mdCell(f.name)} | ${mdCell(f.fe)} |`).join('\n');
  const sourceRows = notes.slice(0, 20).map((n, i) => `| 선택 영역 ${i + 1} | ${mdCell(n)} |`).join('\n') || '| 선택 영역 | 원문 기준 추가 정의 필요 |';

  return {
    filename: `${topic}.md`,
    title,
    markdown: `# ${title} 기능명세서

${purpose}

\`\`\`yaml
id: FEAT-${topic.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'LOCAL'}-001
version: 1.0.0
status: draft
owner_team: AI Research team
effective_date: ${today}
\`\`\`

<br>
<br>
<br>

## 1. 목적·범위

- 목적: ${purpose}
- 포함 범위: 선택한 Figma 화면, 기능설명 영역, 플러그인이 생성한 기능 카드, 추가 텍스트, 선택 영역 내부 주석/설명
- 제외 범위: 원문에 없는 API 상세 구조, DB 스키마, 에러 코드, 내부 상태머신

${additionalText ? `> 추가 텍스트: ${additionalText}\n` : ''}
<br>
<br>
<br>

## 2. 핵심 규칙

### 2.1 IA / 기능 그룹

| 1depth | 2depth | 3depth | 설명 |
| --- | --- | --- | --- |
${iaRows}

<br>
<br>

### 2.2 권한 요약

| 권한 | 해당 사용자(예시) | 주요 역할 | 주요 뷰권한 | 주요 처리 권한 | 제한/예외 |
| --- | --- | --- | --- | --- | --- |
| 원문 기준 추가 정의 필요 | 원문 기준 추가 정의 필요 | 선택 화면 기능 조회 및 처리 | 원문 기준 추가 정의 필요 | 원문 기준 추가 정의 필요 | 원문 기준 추가 정의 필요 |

<br>
<br>

### 2.3 알림·위험알림 요약

| 알림/이벤트 | 발송 대상 | 조회 권한 | 처리 권한 | 후속 처리 | 데이터/이력 |
| --- | --- | --- | --- | --- | --- |
| 원문 기준 추가 정의 필요 | 원문 기준 추가 정의 필요 | 원문 기준 추가 정의 필요 | 원문 기준 추가 정의 필요 | 원문 기준 추가 정의 필요 | 원문 기준 추가 정의 필요 |

<br>
<br>

### 2.4 단계/상태 요약

| 구분 | 명칭 | 기준 | 후속 처리 |
| --- | --- | --- | --- |
| 상태 | 원문 기준 추가 정의 필요 | 추가 텍스트 및 선택 영역 기준 확인 필요 | 원문 기준 추가 정의 필요 |

<br>
<br>

### 2.5 백엔드 핵심 로직 요약

| 구분 | 핵심 로직 | 권한/대상 | 저장/이력 | 관련 요구사항 |
| --- | --- | --- | --- | --- |
| 기능 요구사항 | 선택 화면의 기능 카드와 화면 텍스트 기준으로 요구사항 처리 | 원문 기준 추가 정의 필요 | 원문 기준 추가 정의 필요 | REQ-001~REQ-${String(features.length).padStart(3, '0')} |

<br>
<br>
<br>

## 3. 본문

### 3.1 화면 참고 이미지

${imageLines.length ? imageLines.join('\n\n') : '이미지 없음'}

<br>
<br>

### 3.2 선택 영역 원문·주석 요약

| 구분 | 내용 |
| --- | --- |
${sourceRows}

<br>
<br>

### 3.3 요구사항 테이블

| 1depth | 2depth | 3depth | 요구사항 ID | 요구사항명 | 요청목적 | 기능 요구사항 | 프로세스 요구사항 | 화면 요구사항 | 보안 요구사항 | 데이터 요구사항 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${requirementRows}

<br>
<br>
<br>

## 4. 연관 링크

| 구분 | 링크 |
| --- | --- |
| 관련 PRD | TBD |
| 관련 정책 | TBD |
| 관련 기능명세서 | TBD |
| 외부 링크 | TBD |

<br>
<br>
<br>

## 5. 변경 이력

| 버전 | 일자 | 변경 내용 | 작성자 |
| --- | --- | --- | --- |
| 1.0.0 | ${today} | 최초 작성 | Codex, 김혜연 |
`,
  };
}

function compactAnalyzeFrameData(frameData) {
  return (Array.isArray(frameData) ? frameData : []).map(f => {
    const copy = Object.assign({}, f);
    ['titles', 'tabs', 'sections', 'buttons', 'iconActions', 'links', 'inputs', 'selects', 'tableHeaders', 'listItems', 'badges', 'contextNotes'].forEach(k => {
      if (Array.isArray(copy[k])) copy[k] = copy[k].slice(0, k === 'allTexts' ? 60 : 20);
    });
    if (Array.isArray(copy.allTexts)) {
      copy.allTexts = copy.allTexts
        .slice(0, 80)
        .map(t => String(t || '').slice(0, 500));
    }
    delete copy.image;
    return copy;
  });
}

function inferListLimit(frameData) {
  const joined = (Array.isArray(frameData) ? frameData : [])
    .flatMap(f => Array.isArray(f.allTexts) ? f.allTexts : [])
    .join(' ');
  const m = joined.match(/(?:최대|최근|목록)\s*(\d+)\s*개|(\d+)\s*개\s*(?:표시|노출)/);
  return m ? (m[1] || m[2]) : '';
}

function makeFallbackFeature(name, fe, be, anchorNote) {
  return {
    feature: name,
    icon: '🔹',
    fe: fe || '화면 기준 기능 표시',
    be: be || '관련 데이터 조회',
    anchor: anchorNote ? { x: 0.08, y: 0.16, note: anchorNote } : null,
  };
}

function buildFallbackAnalyzeResult(frameData, mode, reqFlags, reason) {
  frameData = Array.isArray(frameData) ? frameData : [];
  const title = firstNonEmpty(
    frameData.flatMap(f => []
      .concat(f.titles || [])
      .concat(f.sections || [])
      .concat(f.frameName || [])),
    '선택 화면'
  );
  const features = [];
  const seen = new Set();
  const add = (name, fe, be, anchorNote) => {
    name = String(name || '').trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    features.push(makeFallbackFeature(name, fe, be, anchorNote));
  };

  const listLimit = inferListLimit(frameData);
  frameData.forEach((f, idx) => {
    const label = firstNonEmpty([f.frameName].concat(f.sections || []).concat(f.titles || []), `선택 영역 ${idx + 1}`);
    const headers = Array.isArray(f.tableHeaders) ? f.tableHeaders.join(', ') : '';
    const texts = Array.isArray(f.allTexts) ? f.allTexts.join(' ') : '';
    const hasPhoto = /사진|이미지|썸네일|thumbnail/i.test(headers + ' ' + texts);

    if (f.hasTable || (f.tableHeaders && f.tableHeaders.length)) {
      add(
        `${label} 목록 조회`,
        `테이블 표시${listLimit ? `, 최대 ${listLimit}개 노출` : ''}${hasPhoto ? ', 사진 썸네일 표시' : ''}`,
        `목록 조회 API${listLimit ? `, limit=${listLimit}` : ''}`,
        '테이블/목록'
      );
    }

    if (f.hasModal || (f.modals && f.modals.length)) {
      const detailLabels = (f.modalDetails || [])
        .map(v => String(v).split(':')[0].trim())
        .filter(Boolean)
        .slice(0, 8)
        .join('/');
      add(
        `${label} 상세 모달 조회`,
        `모달 표시${detailLabels ? `, ${detailLabels} 항목 표시` : ''}`,
        `상세 조회 API${detailLabels ? ', 상세 필드 제공' : ''}`,
        '모달/상세 정보'
      );
    }

    (f.buttons || []).slice(0, 8).forEach(btn => {
      add(`${btn} 실행`, `${btn} 버튼 클릭 처리`, `${btn} 처리 요청`, btn);
    });
    (f.selects || []).slice(0, 6).forEach(sel => {
      add(`${sel} 선택`, `${sel} 드롭다운 선택값 반영`, `${sel} 기준 조회`, sel);
    });
    (f.inputs || []).slice(0, 6).forEach(input => {
      add(`${input} 입력`, `${input} 입력값 반영`, `${input} 값 검증 및 저장`, input);
    });
    (f.badges || []).slice(0, 6).forEach(badge => {
      add(`${badge} 상태 표시`, `${badge} 뱃지/상태값 표시`, `${badge} 상태값 제공`, badge);
    });
  });

  if (!features.length) {
    const notes = compactFrameNotes(frameData).slice(0, 8);
    notes.forEach((note, i) => add(`선택 영역 ${i + 1} 정보 표시`, note.slice(0, 80), '관련 데이터 제공', `선택 영역 ${i + 1}`));
  }
  if (!features.length) add('화면 정보 조회', '선택 화면의 주요 정보를 표시', '화면 데이터 조회', null);

  if (mode === 'exception') {
    const edgeCases = reqFlags && reqFlags.edge ? [
      {
        feature: '긴 텍스트 표시 상태',
        categoryNo: 6,
        categoryTitle: '텍스트 최소/최대 상태',
        priority: '권장',
        icon: '🧩',
        problem: '긴 텍스트가 한 줄에 다 들어가지 않으면 테이블 셀 너비를 밀어 다른 컬럼 값이 읽기 어려워집니다.',
        design: '1줄 말줄임, 모바일 줄바꿈, 전체 텍스트 툴팁 상태를 제작합니다.',
        components: '텍스트 셀, 툴팁',
        devTitle: '긴 텍스트 처리',
        fe: '말줄임·툴팁 표시',
        be: '원문 텍스트 제공',
        anchor: null,
      },
    ] : [];
    const errorCases = reqFlags && reqFlags.error ? [
      {
        feature: '데이터 없음 상태',
        categoryNo: 1,
        categoryTitle: '데이터 상태',
        priority: '필수',
        icon: '⚠️',
        problem: '조회 결과가 없으면 사용자가 현재 상태를 알기 어렵습니다.',
        design: 'Empty State와 안내 문구를 제작합니다.',
        components: 'Empty State',
        devTitle: '빈 결과 상태',
        fe: '빈 상태 표시',
        be: '0건 응답 제공',
        anchor: null,
      },
    ] : [];
    return { features: [], overview: null, edgeCases, errorCases, fallbackReason: reason };
  }

  return {
    overview: {
      title,
      purpose: `${title} 화면에서 확인된 UI 텍스트와 선택 영역 구조를 기준으로 기능을 정리합니다.`,
    },
    features: features.slice(0, 16),
    edgeCases: [],
    errorCases: [],
    fallbackReason: reason,
  };
}

// ── 응답에서 JSON 객체/배열만 안전 추출 (코드펜스·앞뒤 산문·문자열 내 괄호 대응) ──
function extractJson(raw) {
  let text = String(raw || '').trim();
  // 마크다운 코드펜스 제거
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 객체({) 또는 배열([) 중 먼저 나오는 것을 시작점으로
  const oi = text.indexOf('{');
  const ai = text.indexOf('[');
  let start = -1, open = '{', close = '}';
  if (oi !== -1 && (ai === -1 || oi < ai)) { start = oi; open = '{'; close = '}'; }
  else if (ai !== -1) { start = ai; open = '['; close = ']'; }
  if (start === -1) return null;

  // 시작 괄호부터 균형 잡힌 닫는 괄호까지 스캔 (문자열 내부 괄호 무시)
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null; // 닫는 괄호를 못 찾음
}

// ── Claude Code CLI 호출 ──
function callClaudeCLI(prompt, retriedAfterMissingCli = false, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    const claudePath = getClaudeCLI(retriedAfterMissingCli);
    if (!claudePath) {
      reject(new Error('Claude Code CLI를 찾을 수 없습니다. Claude Desktop을 실행하거나 Claude Code를 다시 설치해주세요.'));
      return;
    }

    const proc = spawn(claudePath, [
      '--print',
      '--output-format', 'text',
      '--model', MODEL,
      '--allowedTools', 'Read',
    ], {
      env: { ...process.env },
      cwd: __dirname, // 루트('/') 대신 figma 폴더로 고정 — 네트워크 볼륨·구글드라이브 스캔 방지
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // 직접 타임아웃 관리 (SIGTERM 143 대신 명확한 메시지)
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { proc.kill('SIGTERM'); } catch (e) { /* */ }
    }, timeoutMs);

    proc.once('spawn', () => {
      proc.stdin.write(prompt, 'utf8');
      proc.stdin.end();
    });

    proc.stdin.on('error', () => { /* spawn 실패 시 error 이벤트에서 처리 */ });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });

    proc.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`Claude 응답 시간 초과(${Math.round(timeoutMs / 1000)}초). 선택 영역이 너무 많거나 CLI가 느립니다. 화면 프레임과 기능설명 영역 위주로 다시 선택해보세요.`));
        return;
      }
      if (code !== 0) {
        const msg = stderr.trim() || stdout.trim();
        if (msg.includes('Not logged in') || msg.includes('login')) {
          reject(new Error('Claude Code CLI 로그인 필요 — 터미널에서 claude /login 실행 후 재시도하세요.'));
        } else {
          reject(new Error(msg || `claude 프로세스 종료 코드: ${code}`));
        }
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (err.code === 'ENOENT' && !retriedAfterMissingCli) {
        cachedClaudePath = null;
        callClaudeCLI(prompt, true, timeoutMs).then(resolve, reject);
        return;
      }

      reject(new Error(`CLI 실행 실패: ${err.message}`));
    });
  });
}

// ── HTTP 서버 ──
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, cli: getClaudeCLI() }));
    return;
  }

  // 컴포넌트 → md 명세 생성 (toast-notification.md 형식)
  if (req.method === 'POST' && req.url === '/extract-component-md') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { component, image, githubBase } = JSON.parse(body);
        if (!component || !component.name) throw new Error('컴포넌트 정보가 없습니다.');

        const imgDir = path.join(__dirname, 'logs');
        let imgPath = null;
        if (image) {
          imgPath = path.join(imgDir, 'component-input.png');
          try { fs.writeFileSync(imgPath, Buffer.from(image, 'base64')); } catch (e) { imgPath = null; }
        }

        // 템플릿 로드 (toast-notification.md 사용)
        const designDir = path.join(__dirname, 'design-system');
        const templatePath = path.join(designDir, 'toast-notification.md');
        let template = '';
        try { template = fs.readFileSync(templatePath, 'utf8'); } catch (e) { template = ''; }

        const variantText = component.variantProperties
          ? JSON.stringify(component.variantProperties, null, 2)
          : '(없음)';
        const variantInstancesText = (component.variantInstances || [])
          .slice(0, 30)
          .map(v => `- ${v.name} (${v.width}x${v.height})${v.variantProperties ? ' · ' + JSON.stringify(v.variantProperties) : ''}`)
          .join('\n') || '(없음)';
        const layersText = (component.layers || [])
          .slice(0, 60)
          .map(l => `${'  '.repeat(l.depth)}- ${l.type} "${l.name}" ${l.width}x${l.height}`)
          .join('\n');
        const textsText = (component.texts || []).slice(0, 40).join(' / ') || '(없음)';

        const prompt = `당신은 시니어 디자인 시스템 작성자입니다.
선택된 Figma 컴포넌트를 분석해서 **아래 템플릿과 동일한 구조**의 마크다운 명세 파일을 작성하세요.

## 입력 — 선택된 컴포넌트

- **이름**: ${component.name}
- **프로젝트명**: ${component.projectName || '(unknown)'}
- **페이지명**: ${component.pageName || '(unknown)'}
- **타입**: ${component.type}
- **크기**: ${Math.round(component.width||0)}x${Math.round(component.height||0)}
- **Variant 정의 (COMPONENT_SET의 경우)**:
\`\`\`json
${variantText}
\`\`\`
- **Variant 인스턴스 목록**:
${variantInstancesText}
- **수집된 텍스트(라벨/문구)**: ${textsText}
- **레이어 구조 (앞 60개)**:
\`\`\`
${layersText}
\`\`\`
${imgPath ? `- **컴포넌트 스크린샷 (반드시 Read 도구로 직접 열어보고 분석)**: @${imgPath}` : ''}

## 템플릿 (이 구조를 그대로 따를 것)

\`\`\`md
${template || '(템플릿 없음 — 직접 toast-notification.md 형식 따를 것)'}
\`\`\`

## 작성 규칙
- 위 템플릿의 **섹션 순서·헤딩·표 컬럼·blockquote 형식을 그대로** 따르세요.
- 비어 있는 필드는 합리적인 디폴트로 채우거나 \`(검토 필요)\` 마커.
- Variant·토큰·문구는 위 입력 데이터(수집된 텍스트·variantProperties)에 기반해 채우고, 데이터가 부족한 부분은 **이미지를 보고** 추론합니다.
- Owner는 \`Design System Team\`, Status는 \`Draft\`, Last updated는 오늘 날짜로.
- Figma 링크: \`figma://link/REPLACE_WITH_NODE_ID\` 그대로.
- 디자인 토큰 이름은 컴포넌트명을 prefix로 사용 (예: 컴포넌트가 "Button"이면 \`color.button.primary.background\`).
- Changelog 첫 entry는 오늘 날짜, 초안 작성으로.

## 출력 형식 (JSON 객체 1개만 — 다른 텍스트 절대 금지)
첫 글자 \`{\`, 마지막 글자 \`}\`. 코드펜스 금지.
{
  "filename": "component-slug.md",
  "componentName": "Component Display Name",
  "markdown": "# Component\\n\\n## 1. Overview\\n..."
}

- \`filename\`: 영문 소문자 + 하이픈, .md 확장자. 컴포넌트명을 기반으로 (예 "Button" → "button.md", "Toast Notification" → "toast-notification.md", "버튼" → "button.md").
- \`componentName\`: 원래 컴포넌트명 그대로 (한글 OK).
- \`markdown\`: 템플릿 구조 전체 — H1부터 마지막 Related 섹션까지 완전한 본문. 줄바꿈은 \\n 으로 이스케이프.`;

        // 디버그 덤프
        try { fs.writeFileSync(path.join(imgDir, 'last-component-prompt.txt'), prompt); } catch (de) { /* */ }

        const raw = await callClaudeCLI(prompt);
        try { fs.writeFileSync(path.join(imgDir, 'last-component-response.txt'), String(raw || '')); } catch (de) { /* */ }

        const jsonStr = extractJson(raw);
        if (!jsonStr) throw new Error('응답에서 JSON을 찾을 수 없습니다. 응답 일부: ' + String(raw).slice(0, 200));
        const parsed = JSON.parse(jsonStr);
        let filename = String(parsed.filename || '').trim();
        const componentName = String(parsed.componentName || component.name || '').trim();
        const markdown = String(parsed.markdown || '');

        // filename 안전화 — 프로젝트명 scope를 붙여 다른 프로젝트의 동일 컴포넌트명 충돌 방지
        const projectName = String(component.projectName || component.fileName || component.pageName || 'figma-project').trim();
        filename = componentScopedFilename(projectName, filename, componentName, component.fileKey);

        // design-system/ 폴더에 저장 (없으면 생성)
        if (!fs.existsSync(designDir)) fs.mkdirSync(designDir, { recursive: true });
        const outPath = path.join(designDir, filename);
        fs.writeFileSync(outPath, markdown, 'utf8');

        // GitHub URL 계산 — 기본 저장소는 hy0909/designsystem
        const requestedBase = String(githubBase || '').replace(/\/+$/, '');
        const base = (!requestedBase || /PLACEHOLDER_OWNER|PLACEHOLDER_REPO/.test(requestedBase))
          ? COMPONENT_GITHUB_BASE
          : requestedBase;
        const githubUrl = base ? `${base}/design-system/${filename}` : null;

        let githubPublish = { attempted: true, committed: false, pushed: false };
        let githubPublishError = null;
        try {
          githubPublish = Object.assign(
            { attempted: true },
            publishComponentMdToGithub(filename, markdown, componentName)
          );
        } catch (pe) {
          githubPublishError = pe && pe.message ? pe.message : String(pe);
          console.error('[컴포넌트 MD GitHub 푸시 실패]', githubPublishError);
        }

        // 디자인시스템.md 에 새 컴포넌트 섹션 자동 추가 (이미 같은 파일 링크가 있으면 skip)
        let designSystemUpdated = false;
        try {
          const dsPath = path.join(__dirname, '디자인시스템.md');
          if (fs.existsSync(dsPath)) {
            const ds = fs.readFileSync(dsPath, 'utf8');
            if (!ds.includes('design-system/' + filename)) {
              const block = `\n\n## ${componentName}\n\n- **상세 명세 (GitHub)**: [${componentName} 상세 명세](${githubUrl || 'https://github.com/PLACEHOLDER_OWNER/PLACEHOLDER_REPO/blob/main/design-system/' + filename})\n  - 로컬 사본: [design-system/${filename}](design-system/${filename})\n- _(자동 생성 — 디자인시스템.md의 일관성을 위해 항목 직접 보강 권장)_\n`;
              fs.appendFileSync(dsPath, block, 'utf8');
              designSystemUpdated = true;
            }
          }
        } catch (de) { /* skip */ }

        console.log(`[컴포넌트 MD] ${filename} 저장 · 디자인시스템.md ${designSystemUpdated ? '갱신' : '건너뜀'} · GitHub ${githubPublish.pushed ? '푸시 완료' : (githubPublishError ? '푸시 실패' : '변경 없음')}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          filename,
          componentName,
          markdown,
          githubUrl,
          absolutePath: outPath,
          designSystemUpdated,
          githubPublish,
          githubPublishError,
        }));
      } catch (e) {
        console.error('[컴포넌트 MD 오류]', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/make-exception-page') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { prdContent, reqContent } = JSON.parse(body || '{}');
        const designSystem = loadDesignSystem();
        const prompt = `당신은 시니어 UX 기획자이자 디자인시스템 설계자입니다.
PRD/요구사항 문서와 디자인시스템을 바탕으로 Figma에 그릴 "예외 케이스 페이지" 구성을 만드세요.

## PRD
${prdContent || '(첨부 없음)'}

## 요구사항정의서
${reqContent || '(첨부 없음)'}

## 디자인시스템
${designSystem || '(디자인시스템 문서 없음)'}

## 작성 규칙
- 실제 제품 페이지에 들어갈 수 있는 예외 케이스 화면/상태를 구성하세요.
- 로그인/권한/입력검증/네트워크/빈 상태/서버 오류/업로드/결제/삭제 확인 등 문서에 맞는 케이스를 우선하세요.
- 디자인시스템에 있는 컴포넌트 이름이나 패턴이 보이면 component 필드에 반영하세요.
- 너무 많지 않게 섹션 3~5개, 각 섹션 item 2~4개로 구성하세요.
- 문서가 없으면 범용 SaaS/관리자 화면 기준으로 작성하세요.

## 출력 형식
JSON 객체 1개만 출력하세요. 코드펜스 금지.
{
  "page": {
    "title": "예외 케이스",
    "subtitle": "PRD와 디자인시스템 기반 예외 상태 페이지",
    "sections": [
      {
        "title": "입력 검증",
        "description": "폼 입력에서 발생하는 오류 상태",
        "items": [
          {
            "name": "필수값 누락",
            "trigger": "필수 입력값 없이 저장 버튼 클릭",
            "expected": "필드 하단 에러 메시지와 토스트를 표시",
            "component": "Input, Toast"
          }
        ]
      }
    ]
  }
}`;

        const raw = await callClaudeCLI(prompt);
        const jsonStr = extractJson(raw);
        if (!jsonStr) throw new Error('응답에서 JSON을 찾을 수 없습니다. 응답 일부: ' + String(raw).slice(0, 200));
        const parsed = JSON.parse(jsonStr);
        const page = parsed.page || parsed;
        page.title = page.title || '예외 케이스';
        page.subtitle = page.subtitle || 'PRD와 디자인시스템 기반 예외 상태 페이지';
        page.sections = Array.isArray(page.sections) ? page.sections : [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ page }));
      } catch (e) {
        console.error('[예외 페이지 제작 오류]', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // IA 이미지에서 leaf 페이지 타이틀 추출
  if (req.method === 'POST' && req.url === '/extract-ia') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { image } = JSON.parse(body);
        if (!image) throw new Error('이미지가 없습니다.');
        const imgDir = path.join(__dirname, 'logs');
        const imgPath = path.join(imgDir, 'ia-input.png');
        fs.writeFileSync(imgPath, Buffer.from(image, 'base64'));
        console.log(`[IA] 이미지 저장: ${imgPath}`);

        const prompt = `당신은 UX 정보 설계(IA) 분석 전문가입니다.
아래 IA(Information Architecture, 사이트맵·메뉴 트리·정보 구조도) 이미지를 분석해서 **모든 페이지를 계층 구조(트리)** 로 추출하세요.

## 화면 이미지 (Read 도구로 직접 열어볼 것)
@${imgPath}

## 규칙
- **모든 페이지/카테고리**를 노드로 추출 — 카테고리 헤더도 노드로 포함합니다(자식 페이지를 가지므로).
- **계층 보존(중요)**: IA의 트리 구조를 그대로 반영. 각 노드에 \`parentId\`로 상위 노드를 참조 (최상위는 null).
- **ID 부여**: 노드마다 \`p0, p1, p2 ...\` 식의 고유 id (parentId 참조에 사용).
- **순서 보존**: 같은 부모를 가진 형제 노드들은 IA에서 위→아래(또는 좌→우)로 나타난 순서대로.
- **이미지의 글자 그대로**: 임의 변형·축약·번역 금지. 한글은 한글, 영문은 영문 그대로.
- **subtitle**: 부모 노드의 title을 그대로 (root는 빈 문자열). 화면별 컴포넌트 헤더의 보조 텍스트로 사용됨.
- **중복**: 같은 위치에 같은 이름이 여러 번 나오면 한 번만. 다른 위치(다른 부모 밑)에 같은 이름이면 별개 노드.

## 출력 형식 (JSON 객체 단 하나만)
첫 글자는 \`{\`, 마지막 글자는 \`}\`. 산문·코드펜스·머리말 금지.
{
  "pages": [
    { "id": "p0", "title": "로그인",     "parentId": null, "subtitle": "" },
    { "id": "p1", "title": "회원가입",   "parentId": "p0", "subtitle": "로그인" },
    { "id": "p2", "title": "홈",         "parentId": "p0", "subtitle": "로그인" },
    { "id": "p3", "title": "마이페이지", "parentId": "p2", "subtitle": "홈" }
  ]
}

빈 배열이면 오답. 이미지에 보이는 모든 페이지를 빠짐없이, 그리고 계층 관계를 정확히 반영해서 포함하세요.`;

        // 디버그 덤프
        try {
          fs.writeFileSync(path.join(imgDir, 'last-ia-prompt.txt'), prompt);
        } catch (de) { /* */ }

        const raw = await callClaudeCLI(prompt);
        try {
          fs.writeFileSync(path.join(imgDir, 'last-ia-response.txt'), String(raw || ''));
        } catch (de) { /* */ }
        const jsonStr = extractJson(raw);
        if (!jsonStr) throw new Error('응답에서 JSON을 찾을 수 없습니다. 응답 일부: ' + String(raw).slice(0, 200));
        const parsed = JSON.parse(jsonStr);
        let pages = Array.isArray(parsed.pages) ? parsed.pages : [];
        // 청소
        pages = pages
          .map((p, idx) => ({
            id: String(p.id || ('p' + idx)),
            title: String(p.title || '').trim(),
            parentId: p.parentId == null ? null : String(p.parentId),
            subtitle: String(p.subtitle || '').trim(),
          }))
          .filter(p => p.title.length > 0 && p.title.length < 200);

        // 구버전 호환: 옛 응답 형식(pageTitles)이 오면 평탄한 root 노드들로 변환
        if (pages.length === 0 && Array.isArray(parsed.pageTitles)) {
          pages = parsed.pageTitles
            .map(t => String(t || '').trim())
            .filter(t => t.length > 0)
            .map((title, idx) => ({ id: 'p' + idx, title, parentId: null, subtitle: '' }));
        }

        // 백워드 호환 pageTitles도 함께 반환 (구버전 클라이언트용)
        const pageTitles = pages.map(p => p.title);
        const rootCount = pages.filter(p => !p.parentId).length;
        console.log(`[IA 완료] ${pages.length}개 노드 추출 (root ${rootCount}개)`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ pages, pageTitles }));
      } catch (e) {
        console.error('[IA 오류]', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/analyze') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const {
          frameData, prdContent, reqContent, previousFeatures, includeCommon,
          mode, requestEdge, requestError, requestCorner,
        } = JSON.parse(body);

        let docSection = '';
        // 문서 한도 확대 — 첨부 시 끝까지 모두 반영(과도한 잘림 방지). 매우 큰 문서는 30000자 컷.
        if (prdContent) docSection += `\n\n[PRD 문서 — 처음부터 끝까지 모두 읽고 화면 요소와 대조해 반영하세요]\n${prdContent.slice(0, 30000)}`;
        if (reqContent) docSection += `\n\n[요구사항정의서 — 처음부터 끝까지 모두 읽고 화면 요소와 대조해 반영하세요]\n${reqContent.slice(0, 30000)}`;
        const hasDocs = !!(prdContent || reqContent);

        const prevCount = Array.isArray(previousFeatures) ? previousFeatures.length : 0;
        const effMode = (mode === 'exception') ? 'exception' : 'spec';
        const reqFlags = { edge: !!requestEdge, error: !!requestError };
        console.log(`[분석 요청] mode=${effMode} | 프레임 ${frameData.length}개 | 문서: ${hasDocs ? '있음' : '없음'} | 누적: ${prevCount} | 공통기능: ${includeCommon ? 'ON' : 'OFF'}${effMode === 'exception' ? ' | exc: edge=' + reqFlags.edge + ' err=' + reqFlags.error : ''}`);

        // ── 화면 이미지 저장 (비전 분석용) ──
        const imgDir = path.join(__dirname, 'logs');
        const imagePaths = [];
        frameData.forEach((f, i) => {
          if (f.image) {
            try {
              const p = path.join(imgDir, `frame-${i}.png`);
              fs.writeFileSync(p, Buffer.from(f.image, 'base64'));
              imagePaths.push(p);
              f._imagePath = p;
            } catch (ie) { /* 무시 */ }
          }
          delete f.image; // 프롬프트/덤프에 거대한 base64가 들어가지 않도록 제거
        });
        console.log(`[이미지] ${imagePaths.length}개 저장`);

        const promptFrameData = compactAnalyzeFrameData(frameData);
        const promptImagePaths = imagePaths.slice(0, promptFrameData.length > 3 ? 1 : 2);
        const prompt = (effMode === 'spec' && promptImagePaths.length)
          ? buildFastSpecPrompt(promptFrameData, docSection, hasDocs, promptImagePaths, previousFeatures || [], !!includeCommon)
          : buildPrompt(promptFrameData, docSection, hasDocs, promptImagePaths, previousFeatures || [], !!includeCommon, effMode, reqFlags);

        // 디버그 덤프 — 무엇을 읽었고 무엇을 받았는지 추적
        try {
          const dbgDir = path.join(__dirname, 'logs');
          fs.writeFileSync(path.join(dbgDir, 'last-framedata.json'), JSON.stringify(frameData, null, 2));
          fs.writeFileSync(path.join(dbgDir, 'last-prompt-framedata.json'), JSON.stringify(promptFrameData, null, 2));
          fs.writeFileSync(path.join(dbgDir, 'last-prompt.txt'), prompt);
        } catch (de) { /* 무시 */ }

        let raw = '';
        let usedFallback = false;
        let fallbackReason = null;
        try {
          raw = await callClaudeCLI(prompt, false, promptFrameData.length > 4 ? 120000 : 180000);
        } catch (ce) {
          usedFallback = true;
          fallbackReason = ce && ce.message ? ce.message : String(ce);
          console.warn('[분석 fallback]', fallbackReason);
        }

        try {
          fs.writeFileSync(path.join(__dirname, 'logs', 'last-response.txt'), String(raw || ''));
        } catch (de) { /* 무시 */ }

        let parsed;
        if (usedFallback) {
          parsed = buildFallbackAnalyzeResult(frameData, effMode, reqFlags, fallbackReason);
        } else {
          const jsonStr = extractJson(raw);
          if (!jsonStr) {
            parsed = buildFallbackAnalyzeResult(frameData, effMode, reqFlags, 'Claude 응답에서 JSON을 찾을 수 없습니다.');
            usedFallback = true;
          } else {
            try {
              parsed = JSON.parse(jsonStr);
            } catch (pe) {
              parsed = buildFallbackAnalyzeResult(frameData, effMode, reqFlags, 'JSON 파싱 실패: ' + pe.message);
              usedFallback = true;
            }
          }
        }

        // 모드별 응답 키 추출
        let features = [], overview = null, edgeCases = [], errorCases = [];
        if (Array.isArray(parsed)) {
          features = parsed;
        } else {
          features = Array.isArray(parsed.features) ? parsed.features : [];
          overview = parsed.overview || null;
          edgeCases = Array.isArray(parsed.edgeCases) ? parsed.edgeCases : [];
          errorCases = Array.isArray(parsed.errorCases)
            ? parsed.errorCases
            : (Array.isArray(parsed.unhappyFlows) ? parsed.unhappyFlows : []);
          // 구버전 호환: cornerCases가 오면 모두 tag="복잡/희귀" 부여하고 edgeCases에 합침
          if (Array.isArray(parsed.cornerCases) && parsed.cornerCases.length) {
            const tagged = parsed.cornerCases.map(it => Object.assign({}, it, { tag: '복잡/희귀' }));
            edgeCases = edgeCases.concat(tagged);
          }
        }
        const cornerCount = edgeCases.filter(it => it && it.tag === '복잡/희귀').length;
        console.log(`[완료] mode=${effMode} · features ${features.length} · edge ${edgeCases.length}(복잡/희귀 ${cornerCount}) · error ${errorCases.length}${overview ? ' | overview' : ''}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        // 생성 환경 메타 — 명세 하단에 "어떤 모델·환경에서 생성했는지" 기록용
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const meta = {
          model: MODEL,
          tool: usedFallback ? 'Local fallback (기능 명세 생성기)' : 'Claude Code CLI (기능 명세 생성기)',
          os: `${process.platform} ${os.release()} (${process.arch})`,
          node: process.version,
          generatedAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
          fallback: usedFallback,
          fallbackReason,
        };

        res.end(JSON.stringify({ features, overview, edgeCases, errorCases, meta }));
      } catch (e) {
        console.error('[오류]', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/generate-feature-md') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const frameData = Array.isArray(payload.frameData) ? payload.frameData : [];
        if (!frameData.length) throw new Error('선택 영역 정보가 없습니다. Figma 화면과 기능설명 영역을 선택해주세요.');

        const imgDir = path.join(__dirname, 'logs', 'feature-md');
        if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
        const imagePaths = [];
        frameData.forEach((f, i) => {
          delete f.image;
        });
        const attachedImages = Array.isArray(payload.attachedImages) ? payload.attachedImages : [];
        attachedImages.forEach((img, i) => {
          if (!img || !img.image) return;
          try {
            const p = path.join(imgDir, `feature-md-attach-${i + 1}.png`);
            fs.writeFileSync(p, Buffer.from(img.image, 'base64'));
            imagePaths.push(p);
          } catch (ie) { /* ignore */ }
        });

        const localMd = buildLocalFeatureMarkdown(payload, frameData, imagePaths.length);
        try {
          fs.writeFileSync(path.join(imgDir, 'last-feature-md-framedata.json'), JSON.stringify(frameData, null, 2));
          fs.writeFileSync(path.join(imgDir, 'last-feature-md-local.json'), JSON.stringify({
            filename: localMd.filename,
            title: localMd.title,
            imageCount: imagePaths.length,
          }, null, 2));
        } catch (de) { /* ignore */ }

        console.log(`[기능명세 MD] 로컬 생성 · 선택영역 ${frameData.length}개 · 이미지 ${imagePaths.length}개`);
        const markdown = stripCodeFence(localMd.markdown || '');
        if (!markdown || markdown.length < 200) throw new Error('생성된 Markdown 내용이 비어 있거나 너무 짧습니다.');
        const filename = String(localMd.filename || localMd.title || 'feature-spec').trim();
        const saved = saveFeatureMdLocally(filename, markdown, imagePaths);

        console.log(`[기능명세 MD] ${saved.filename} · 로컬 저장 완료: ${saved.localPath}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          filename: saved.filename,
          title: localMd.title || saved.filename,
          localPath: saved.localPath,
          outputDir: saved.outputDir,
          assetDir: saved.assetDir,
          assetCount: saved.assetFiles.length,
        }));
      } catch (e) {
        console.error('[기능명세 MD 오류]', e.message);
        try {
          const imgDir = path.join(__dirname, 'logs', 'feature-md');
          if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
          fs.writeFileSync(path.join(imgDir, 'last-feature-md-error.txt'), e.stack || e.message || String(e), 'utf8');
        } catch (de) { /* ignore */ }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ 기능 명세 브릿지 서버 실행 중 — http://localhost:${PORT}`);
  console.log('   Claude Code 로그인 세션을 사용합니다. (별도 API 키 불필요)');
  console.log('   Figma 플러그인에서 기능 생성 버튼을 눌러주세요.');
});
