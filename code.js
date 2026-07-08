figma.showUI(__html__, { width: 480, height: 720, title: '핸드오프문서 자동생성기' });

// ── 화면 흐름 화살표 상태 ──
var flowState = { autoFlow: false, color: '#FF37E8' };
var lastFlowPair = '';

function hexToRgbObj(hex) {
  hex = String(hex || '').trim();
  if (!hex.startsWith('#')) hex = '#' + hex;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) hex = '#FF37E8';
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

function solidHex(hex) { return [{ type: 'SOLID', color: hexToRgbObj(hex) }]; }
function solidHexAlpha(hex, alpha) {
  var c = hexToRgbObj(hex);
  return [{ type: 'SOLID', color: c, opacity: alpha }];
}

// 노드의 magnet point (월드 좌표) — 측면 중심점
function magnetPoint(node, side) {
  var b = node.absoluteBoundingBox;
  if (!b) return null;
  if (side === 'right')  return [b.x + b.width,    b.y + b.height/2];
  if (side === 'left')   return [b.x,              b.y + b.height/2];
  if (side === 'top')    return [b.x + b.width/2,  b.y];
  if (side === 'bottom') return [b.x + b.width/2,  b.y + b.height];
  return [b.x + b.width/2, b.y + b.height/2];
}

// 두 노드의 상대 위치로 화살표 출입 면 결정
function autoPickSides(srcNode, dstNode) {
  var sb = srcNode.absoluteBoundingBox;
  var db = dstNode.absoluteBoundingBox;
  if (!sb || !db) return { src: 'right', dst: 'left', orientation: 'H' };
  var sx = sb.x + sb.width/2, sy = sb.y + sb.height/2;
  var dx = db.x + db.width/2, dy = db.y + db.height/2;
  var ddx = dx - sx, ddy = dy - sy;
  if (Math.abs(ddx) >= Math.abs(ddy)) {
    return ddx > 0
      ? { src: 'right', dst: 'left', orientation: 'H' }
      : { src: 'left',  dst: 'right', orientation: 'H' };
  } else {
    return ddy > 0
      ? { src: 'bottom', dst: 'top',    orientation: 'V' }
      : { src: 'top',    dst: 'bottom', orientation: 'V' };
  }
}

// 두 점 사이 ELBOWED 웨이포인트 (H-V-H 또는 V-H-V)
function elbowWaypoints(start, end, orientation) {
  if (Math.abs(start[0] - end[0]) < 1 && Math.abs(start[1] - end[1]) < 1) return null;
  if (orientation === 'H') {
    var midX = (start[0] + end[0]) / 2;
    return [start, [midX, start[1]], [midX, end[1]], end];
  } else {
    var midY = (start[1] + end[1]) / 2;
    return [start, [start[0], midY], [end[0], midY], end];
  }
}

// 웨이포인트 → 라운드 코너 SVG path (data string)
function waypointsToRoundedPath(wp, cornerRadius) {
  if (!wp || wp.length < 2) return '';
  if (wp.length === 2) {
    return 'M ' + wp[0][0] + ' ' + wp[0][1] + ' L ' + wp[1][0] + ' ' + wp[1][1];
  }
  var cmds = ['M ' + wp[0][0].toFixed(2) + ' ' + wp[0][1].toFixed(2)];
  for (var i = 1; i < wp.length - 1; i++) {
    var prev = wp[i-1], curr = wp[i], next = wp[i+1];
    var d1 = Math.hypot(prev[0]-curr[0], prev[1]-curr[1]);
    var d2 = Math.hypot(next[0]-curr[0], next[1]-curr[1]);
    if (d1 < 1 || d2 < 1) continue;
    var r = Math.min(cornerRadius, d1/2, d2/2);
    var v1x = (prev[0]-curr[0])/d1, v1y = (prev[1]-curr[1])/d1;
    var v2x = (next[0]-curr[0])/d2, v2y = (next[1]-curr[1])/d2;
    var p1x = curr[0] + v1x*r, p1y = curr[1] + v1y*r;
    var p2x = curr[0] + v2x*r, p2y = curr[1] + v2y*r;
    cmds.push('L ' + p1x.toFixed(2) + ' ' + p1y.toFixed(2));
    cmds.push('Q ' + curr[0].toFixed(2) + ' ' + curr[1].toFixed(2) + ' ' + p2x.toFixed(2) + ' ' + p2y.toFixed(2));
  }
  var last = wp[wp.length-1];
  cmds.push('L ' + last[0].toFixed(2) + ' ' + last[1].toFixed(2));
  return cmds.join(' ');
}

// 두 노드 사이 ELBOWED 화살표 — VECTOR + ELLIPSE + 삼각형으로 직접 그림 (Design/FigJam 모두 OK)
function drawArrowBetween(srcNode, dstNode, hex, opts) {
  opts = opts || {};
  if (!srcNode || !dstNode) return null;
  var sides = opts.sides || autoPickSides(srcNode, dstNode);
  var start = magnetPoint(srcNode, sides.src);
  var end = magnetPoint(dstNode, sides.dst);
  if (!start || !end) return null;

  var wp = elbowWaypoints(start, end, sides.orientation);
  if (!wp) return null;

  // 월드 BBox 계산 — vec.x/y에는 minX/minY를 그대로 사용 (Figma가 path bbox를 0,0으로 정규화하므로)
  var xs = wp.map(function(p){return p[0];});
  var ys = wp.map(function(p){return p[1];});
  var minX = Math.min.apply(null, xs);
  var minY = Math.min.apply(null, ys);
  // 로컬 좌표는 (0, 0)부터 시작하도록 평행이동
  var localWp = wp.map(function(p){ return [p[0]-minX, p[1]-minY]; });
  var pathData = waypointsToRoundedPath(localWp, 16);

  // 선(VECTOR)
  var vec = figma.createVector();
  vec.name = 'flow-line';
  vec.strokes = solidHex(hex);
  vec.strokeWeight = 8;
  vec.fills = [];
  try { vec.strokeJoin = 'ROUND'; } catch (e) { /* */ }
  try { vec.strokeCap = 'ROUND'; } catch (e) { /* */ }
  vec.vectorPaths = [{ windingRule: 'NONZERO', data: pathData }];
  // vectorPaths 설정 후 위치 지정 (월드 bbox 좌상단)
  vec.x = minX;
  vec.y = minY;
  figma.currentPage.appendChild(vec);

  // 시작 마커: 반투명 배경 원 + 컬러 링 + 흰색 중심
  var HALO = 72;
  var halo = figma.createEllipse();
  halo.name = 'flow-start-halo';
  halo.resize(HALO, HALO);
  halo.fills = solidHexAlpha(hex, 0.13);
  halo.strokes = [];
  halo.x = start[0] - HALO/2;
  halo.y = start[1] - HALO/2;
  figma.currentPage.appendChild(halo);

  var RING = 36;
  var ring = figma.createEllipse();
  ring.name = 'flow-start-ring';
  ring.resize(RING, RING);
  ring.fills = solidHex(hex);
  ring.strokes = [];
  ring.x = start[0] - RING/2;
  ring.y = start[1] - RING/2;
  figma.currentPage.appendChild(ring);

  var CENTER = 20;
  var center = figma.createEllipse();
  center.name = 'flow-start-center';
  center.resize(CENTER, CENTER);
  center.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  center.strokes = [];
  center.x = start[0] - CENTER/2;
  center.y = start[1] - CENTER/2;
  figma.currentPage.appendChild(center);

  // 끝 열린 화살표 머리 (마지막 세그먼트 방향)
  var n = wp.length;
  var pPrev = wp[n-2], pEnd = wp[n-1];
  var adx = pEnd[0] - pPrev[0], ady = pEnd[1] - pPrev[1];
  var len = Math.hypot(adx, ady);
  var head = null;
  if (len >= 0.5) {
    var ux = adx/len, uy = ady/len;
    var AHL = 38, AHW = 52;
    var tip = [end[0], end[1]];
    var cos = Math.cos(Math.PI / 4);
    var sin = Math.sin(Math.PI / 4);
    var backX = -ux, backY = -uy;
    var wing1Dir = [backX * cos - backY * sin, backX * sin + backY * cos];
    var wing2Dir = [backX * cos + backY * sin, -backX * sin + backY * cos];
    var w1 = [tip[0] + wing1Dir[0] * AHL, tip[1] + wing1Dir[1] * AHL];
    var w2 = [tip[0] + wing2Dir[0] * AHL, tip[1] + wing2Dir[1] * AHL];
    var hxs = [tip[0], w1[0], w2[0]];
    var hys = [tip[1], w1[1], w2[1]];
    var hMinX = Math.min.apply(null, hxs);
    var hMinY = Math.min.apply(null, hys);
    var lTip = [tip[0]-hMinX, tip[1]-hMinY];
    var lW1 = [w1[0]-hMinX, w1[1]-hMinY];
    var lW2 = [w2[0]-hMinX, w2[1]-hMinY];
    var headData = 'M ' + lW1[0].toFixed(2) + ' ' + lW1[1].toFixed(2)
                 + ' L ' + lTip[0].toFixed(2) + ' ' + lTip[1].toFixed(2)
                 + ' L ' + lW2[0].toFixed(2) + ' ' + lW2[1].toFixed(2);
    head = figma.createVector();
    head.name = 'flow-arrowhead';
    head.strokes = solidHex(hex);
    head.strokeWeight = 8;
    head.fills = [];
    try { head.strokeJoin = 'ROUND'; } catch (e) { /* */ }
    try { head.strokeCap = 'ROUND'; } catch (e) { /* */ }
    head.vectorPaths = [{ windingRule: 'NONZERO', data: headData }];
    head.x = hMinX;
    head.y = hMinY;
    figma.currentPage.appendChild(head);
  }

  // 그룹으로 묶기 — 그룹화 후에도 위치가 보존되도록 그룹은 마지막에
  var nodes = [halo, vec, ring, center];
  if (head) nodes.push(head);
  try {
    var grp = figma.group(nodes, figma.currentPage);
    grp.name = opts.name || 'Flow Arrow';
    return grp;
  } catch (ge) {
    return vec;
  }
}

// 외부 인터페이스 — 호환용 별칭
function drawFlowArrow(node1, node2, hex) {
  if (!node1 || !node2) return null;
  try {
    return drawArrowBetween(node1, node2, hex, { name: 'Flow Arrow' });
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: '화살표 생성 실패: ' + e.message });
    return null;
  }
}

// 선택 변경 시 자동 생성 (auto ON + 정확히 2개 선택 + 마지막 쌍과 다를 때)
figma.on('selectionchange', function () {
  if (!flowState.autoFlow) return;
  var sel = figma.currentPage.selection;
  if (!sel || sel.length !== 2) return;
  var ids = sel[0].id + '|' + sel[1].id;
  if (ids === lastFlowPair) return;
  lastFlowPair = ids;
  var conn = drawFlowArrow(sel[0], sel[1], flowState.color);
  if (conn) {
    figma.ui.postMessage({ type: 'flow-drawn', frames: [sel[0].name, sel[1].name] });
  }
});


// ── 분석 히스토리(파일 단위 누적) — clientStorage ──
// 같은 파일에서 페이지마다 GNB·사이드바·반복 요소를 중복 명세하는 문제를 해결.
// 이전에 생성된 기능명 목록을 Claude에게 전달해 "새로 등장한 것만 명세" 하도록 함.

var HISTORY_KEY_PREFIX = 'spec-history-v1-';

function historyKey() {
  // figma.fileKey가 가장 안정적, 없으면 root.id로 폴백 (저장 안 된 새 파일)
  var fk = (typeof figma.fileKey === 'string' && figma.fileKey) ? figma.fileKey : null;
  if (!fk && figma.root && figma.root.id) fk = String(figma.root.id);
  if (!fk) fk = 'default';
  return HISTORY_KEY_PREFIX + fk;
}

async function loadHistory() {
  try {
    var v = await figma.clientStorage.getAsync(historyKey());
    if (v && typeof v === 'object') {
      v.featureNames = Array.isArray(v.featureNames) ? v.featureNames : [];
      v.pages = Array.isArray(v.pages) ? v.pages : [];
      return v;
    }
  } catch (e) { /* ignore */ }
  return { featureNames: [], pages: [] };
}

async function appendHistory(newItems, frameName) {
  newItems = Array.isArray(newItems) ? newItems : [];
  var newNames = [];
  for (var i = 0; i < newItems.length; i++) {
    var name = newItems[i] && newItems[i].feature;
    if (typeof name === 'string' && name.trim()) newNames.push(name.trim());
  }
  if (newNames.length === 0) return await loadHistory();
  var hist = await loadHistory();
  var seen = {};
  for (var j = 0; j < hist.featureNames.length; j++) seen[hist.featureNames[j]] = true;
  for (var k = 0; k < newNames.length; k++) {
    if (!seen[newNames[k]]) {
      hist.featureNames.push(newNames[k]);
      seen[newNames[k]] = true;
    }
  }
  hist.pages = hist.pages || [];
  hist.pages.push({
    frameName: frameName || '(unknown)',
    addedNames: newNames,
    addedAt: Date.now(),
  });
  if (hist.pages.length > 50) hist.pages = hist.pages.slice(-50);
  hist.updatedAt = Date.now();
  try { await figma.clientStorage.setAsync(historyKey(), hist); } catch (e) { /* ignore */ }
  return hist;
}

async function clearHistory() {
  try {
    await figma.clientStorage.setAsync(historyKey(), { featureNames: [], pages: [], updatedAt: Date.now() });
  } catch (e) { /* ignore */ }
}


// ── Figma 페이지 맥락 독해 (figma-page-reader.md 기준) ──

// Uint8Array → base64 (figma.base64Encode 미지원 환경 폴백)
function bytesToBase64(bytes) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var out = '';
  var i;
  for (i = 0; i + 2 < bytes.length; i += 3) {
    var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + chars[(n >> 6) & 63] + chars[n & 63];
  }
  var rem = bytes.length - i;
  if (rem === 1) {
    var n1 = bytes[i] << 16;
    out += chars[(n1 >> 18) & 63] + chars[(n1 >> 12) & 63] + '==';
  } else if (rem === 2) {
    var n2 = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += chars[(n2 >> 18) & 63] + chars[(n2 >> 12) & 63] + chars[(n2 >> 6) & 63] + '=';
  }
  return out;
}

// componentProperties 안전 접근 (컴포넌트셋 오류 노드는 접근 시 throw)
function safeComponentProps(node) {
  if (node.type !== 'INSTANCE' && node.type !== 'COMPONENT') return null;
  try {
    return node.componentProperties || null;
  } catch (e) {
    return null;
  }
}

// 사이드바/GNB 여부 판별
function isNavShell(lname) {
  return /sidebar|side.?bar|사이드바|gnb|global.?nav|lnb|local.?nav|header.?nav|top.?bar|topbar/.test(lname);
}

// ── 내용·비주얼 기반 독해 헬퍼 ──
// 레이어 이름이 일반적(auto-named)이라 타입을 못 잡을 때, 실제 텍스트/스타일/형태로 보완한다.

var ACTION_RE = /초대|추가|삭제|편집|수정|등록|저장|취소|확인|전송|발송|보내기|내보내기|가져오기|업로드|다운로드|복사|이동|변경|적용|생성|만들기|로그인|로그아웃|가입|신청|제출|승인|거절|반려|해제|연결|연동|초기화|공유|복제|미리보기|첨부|시작|중지|재시도|새로고침|결제|구매|예약|취소하기|닫기|뒤로|다음|이전|완료|보기/;
var PLACEHOLDER_RE = /입력|선택하세요|선택해주세요|을 입력|를 입력|검색어|예\s*:|placeholder|hint|@/;
var CHEVRON_RE = /chevron|caret|arrow.?down|expand.?more|드롭|down.?icon|▾|⌄|expand_more/;

function firstSolidFill(node) {
  if (!('fills' in node) || !Array.isArray(node.fills)) return null;
  for (var i = 0; i < node.fills.length; i++) {
    var f = node.fills[i];
    if (f && f.type === 'SOLID' && f.visible !== false) return f;
  }
  return null;
}

function firstSolidStroke(node) {
  if (!('strokes' in node) || !Array.isArray(node.strokes)) return null;
  for (var i = 0; i < node.strokes.length; i++) {
    var s = node.strokes[i];
    if (s && s.type === 'SOLID' && s.visible !== false) return s;
  }
  return null;
}

// 회색(저채도)·밝은 색 → 비활성 가능성
function isGrayish(fill) {
  if (!fill || fill.type !== 'SOLID' || !fill.color) return false;
  var c = fill.color;
  var max = Math.max(c.r, c.g, c.b), min = Math.min(c.r, c.g, c.b);
  var sat = max === 0 ? 0 : (max - min) / max;
  return sat < 0.12;
}

// 노드가 비활성(disabled/readonly)인지 — 이름·투명도·variant·회색 배경으로 판별
function detectDisabled(node) {
  var lname = node.name.toLowerCase();
  if (/disabled|disable|readonly|read.?only|비활성|inactive|grayed|dimmed|locked|잠금/.test(lname)) return true;
  if ('opacity' in node && typeof node.opacity === 'number' && node.opacity < 0.55) return true;
  var props = safeComponentProps(node);
  if (props) {
    try {
      var vals = Object.values(props).map(function (v) { return String((v && v.value) || '').toLowerCase(); });
      if (vals.some(function (v) { return /disabled|readonly|inactive|비활성/.test(v); })) return true;
    } catch (e) { /* skip */ }
  }
  return false;
}

// 얕은 깊이로 직계 텍스트 수집
function gatherShallowTexts(node, out, depth, maxDepth) {
  if (depth > maxDepth) return;
  if (node.type === 'TEXT' && node.characters && node.characters.trim()) out.push(node.characters.trim());
  if ('children' in node) {
    for (var i = 0; i < node.children.length; i++) gatherShallowTexts(node.children[i], out, depth + 1, maxDepth);
  }
}

function gatherTextNodes(node, out, depth, maxDepth) {
  if (depth > maxDepth) return;
  if (node.type === 'TEXT' && node.characters && node.characters.trim()) {
    var b = node.absoluteBoundingBox || null;
    out.push({
      text: node.characters.trim().replace(/\s+/g, ' '),
      x: b ? b.x : 0,
      y: b ? b.y : 0,
      w: b ? b.width : 0,
      h: b ? b.height : 0,
    });
  }
  if ('children' in node) {
    for (var i = 0; i < node.children.length; i++) gatherTextNodes(node.children[i], out, depth + 1, maxDepth);
  }
}

function collectModalDetailRows(node) {
  var textNodes = [];
  gatherTextNodes(node, textNodes, 0, 8);
  if (textNodes.length < 2) return [];

  textNodes.sort(function (a, b) {
    if (Math.abs(a.y - b.y) > 6) return a.y - b.y;
    return a.x - b.x;
  });

  var rows = [];
  var yTolerance = 10;
  for (var i = 0; i < textNodes.length; i++) {
    var item = textNodes[i];
    var last = rows[rows.length - 1];
    if (!last || Math.abs(last.y - item.y) > yTolerance) {
      rows.push({ y: item.y, items: [item] });
    } else {
      last.items.push(item);
      last.y = (last.y + item.y) / 2;
    }
  }

  var details = [];
  var labelRe = /^(유형|분류|상태|요청\s*시간|시간|일시|점검자|담당자|설명|내용|위치|현장|SOP|단계|결과|주의|위험|알림|사진)$/i;
  for (var r = 0; r < rows.length; r++) {
    var cells = rows[r].items
      .sort(function (a, b) { return a.x - b.x; })
      .map(function (it) { return it.text; })
      .filter(Boolean);
    if (cells.length < 2) continue;

    var label = cells[0].replace(/\s+/g, ' ').trim();
    var value = cells.slice(1).join(' ').replace(/\s+/g, ' ').trim();
    if (!label || !value) continue;
    if (label.length > 24 && !labelRe.test(label)) continue;
    if (value.length > 240) value = value.slice(0, 240) + '...';
    details.push(label + ': ' + value);
  }

  return details.slice(0, 24);
}

function collectModalTextValues(node) {
  var textNodes = [];
  gatherTextNodes(node, textNodes, 0, 8);
  var seen = {};
  var values = [];
  for (var i = 0; i < textNodes.length; i++) {
    var text = String(textNodes[i].text || '').trim();
    if (!text || text.length > 200 || seen[text]) continue;
    seen[text] = true;
    values.push(text);
  }
  return values.slice(0, 80);
}

// chevron/드롭다운 아이콘 자식 보유 여부
function hasChevronChild(node) {
  if (!('children' in node)) return false;
  for (var i = 0; i < node.children.length; i++) {
    if (CHEVRON_RE.test(node.children[i].name.toLowerCase())) return true;
  }
  return false;
}

// 컨테이너의 형태·텍스트로 버튼/인풋/셀렉트/비활성 보완 감지
function classifyByContent(node, result) {
  var type = node.type;
  if (type !== 'FRAME' && type !== 'INSTANCE' && type !== 'COMPONENT' && type !== 'GROUP') return;

  var h = ('height' in node) ? node.height : 0;
  var w = ('width' in node) ? node.width : 0;
  if (!h || !w) return;

  var fill = firstSolidFill(node);
  var stroke = firstSolidStroke(node);
  var hasBg = !!fill;
  var hasBorder = !!stroke;
  if (!hasBg && !hasBorder) return; // 스타일 없는 순수 레이아웃 컨테이너는 패스

  var texts = [];
  gatherShallowTexts(node, texts, 0, 3);
  var joined = texts.join(' ').trim();
  if (!joined) return;

  var disabled = detectDisabled(node) || (hasBg && isGrayish(fill) && !hasBorder);
  var isSmallBox = h >= 24 && h <= 72;
  var chevron = hasChevronChild(node);

  // 셀렉트/드롭다운: chevron 아이콘 + 단일 값
  if (isSmallBox && chevron && joined.length <= 24) {
    result.selectFields.add(joined + (disabled ? ' (비활성)' : ''));
    return;
  }

  // 버튼: 배경/보더 박스 + 짧은 액션 텍스트
  var shortText = joined.length <= 14 && texts.length <= 2;
  if (isSmallBox && shortText && ACTION_RE.test(joined) && !chevron) {
    result.actionButtons.add(joined + (disabled ? ' (비활성)' : ''));
    return;
  }

  // 인풋: 보더 박스 + placeholder 패턴
  if (isSmallBox && PLACEHOLDER_RE.test(joined)) {
    if (disabled) result.disabledFields.add(joined);
    else result.inputFields.add(joined);
    return;
  }
}

// ── 모달·다이얼로그(딤 처리 포함) 비주얼 감지 ──

// fill의 밝기(0=검정, 1=흰색)
function fillBrightness(fill) {
  if (!fill || !fill.color) return null;
  var c = fill.color;
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}

// 노드가 반투명한가 (딤 오버레이 후보) — 노드 opacity 또는 fill opacity가 1 미만
function isTranslucent(node, fill) {
  if ('opacity' in node && typeof node.opacity === 'number' && node.opacity < 0.92) return true;
  if (fill && typeof fill.opacity === 'number' && fill.opacity < 0.92) return true;
  return false;
}

// 노드가 라운드 처리됐는가
function hasRoundedCorner(node, min) {
  if (typeof node.cornerRadius === 'number') return node.cornerRadius >= min;
  // 혼합 라운드(topLeftRadius 등)도 인정
  if ('topLeftRadius' in node && typeof node.topLeftRadius === 'number') return node.topLeftRadius >= min;
  return false;
}

function addContextNote(result, source, text) {
  text = String(text || '').trim().replace(/\s+/g, ' ');
  if (!text || text.length < 2) return;
  if (text.length > 500) text = text.slice(0, 500) + '...';
  result.contextNotes.add(source ? `${source}: ${text}` : text);
}

function collectNodeContextNotes(node, result) {
  const lname = String(node.name || '').toLowerCase();
  const noteName = /comment|annotation|note|memo|주석|코멘트|설명|메모/.test(lname);

  if (node.type === 'TEXT' && node.characters && noteName) {
    addContextNote(result, node.name, node.characters);
  }

  if ('description' in node && node.description) {
    addContextNote(result, `${node.name || 'node'} description`, node.description);
  }

  if ('annotations' in node && Array.isArray(node.annotations) && node.annotations.length) {
    node.annotations.forEach((ann, idx) => {
      const value = typeof ann === 'string' ? ann : JSON.stringify(ann);
      addContextNote(result, `${node.name || 'node'} annotation ${idx + 1}`, value);
    });
  }

  try {
    if (typeof node.getPluginDataKeys === 'function') {
      node.getPluginDataKeys().forEach(key => {
        if (/comment|annotation|note|memo|주석|코멘트|설명|메모/i.test(key)) {
          addContextNote(result, `${node.name || 'node'} pluginData.${key}`, node.getPluginData(key));
        }
      });
    }
  } catch (e) { /* ignore inaccessible plugin data */ }
}

// 모달 구조 감지: 딤(반투명 어두운 전면 덮개) + 중앙 카드(밝은 라운드 컨테이너 + 제목/버튼)
function detectModalParts(node, result) {
  var type = node.type;
  if (type !== 'FRAME' && type !== 'INSTANCE' && type !== 'COMPONENT' &&
      type !== 'GROUP' && type !== 'RECTANGLE') return;

  var w = ('width' in node) ? node.width : 0;
  var h = ('height' in node) ? node.height : 0;
  if (!w || !h) return;

  var rootW = result.rootW || 0;
  var rootH = result.rootH || 0;
  var lname = node.name.toLowerCase();
  var fill = firstSolidFill(node);
  var bright = fillBrightness(fill);

  // ① 딤(Dim) 오버레이 — 화면 대부분을 덮는 어둡고 반투명한 면
  var coversMost = rootW && rootH && w >= rootW * 0.8 && h >= rootH * 0.8;
  var isDark = bright !== null && bright < 0.35;
  if (
    /dim|overlay|backdrop|scrim|딤|어둡|배경막|오버레이/.test(lname) ||
    (coversMost && isDark && isTranslucent(node, fill))
  ) {
    result.hasDimOverlay = true;
  }

  // ② 모달 카드 — 이름으로 직접 잡히거나, 딤 오버레이와 함께 떠 있는 카드만 인정
  var nameIsModal = /modal|dialog|popup|sheet|모달|팝업|다이얼로그|바텀시트/.test(lname);

  var looksLikeCard =
    (type === 'FRAME' || type === 'GROUP' || type === 'INSTANCE') &&
    bright !== null && bright > 0.82 &&         // 밝은(흰색 계열) 카드
    hasRoundedCorner(node, 8) &&                // 라운드 처리
    rootW && w < rootW * 0.92 && w >= 220 &&    // 화면보다 작은 중앙 카드
    h >= 120;

  if (nameIsModal || looksLikeCard) {
    var texts = [];
    gatherShallowTexts(node, texts, 0, 4);
    var detailRows = collectModalDetailRows(node);
    // 카드 후보일 때는 액션 버튼/제목이 실제로 있어야 모달로 인정 (오탐 방지)
    var joined = texts.join(' ');
    var hasAction = ACTION_RE.test(joined);
    var hasDetailRows = detailRows.length >= 2;
    var accepted = false;
    if (nameIsModal) {
      var title = texts.length ? texts[0].slice(0, 30) : node.name;
      result.modals.add(title);
      result.hasModal = true;
      accepted = true;
    } else if (hasAction || hasDetailRows) {
      var candidateTitle = texts.length ? texts[0].slice(0, 30) : node.name;
      result.modalCandidates.add(candidateTitle);
      accepted = true;
    }
    if (accepted) {
      for (var i = 0; i < detailRows.length; i++) result.modalDetails.add(detailRows[i]);
      var modalTexts = collectModalTextValues(node);
      for (var j = 0; j < modalTexts.length; j++) result.modalTexts.add(modalTexts[j]);
    }
  }
}

// 활성 메뉴 아이템 텍스트 수집 (사이드바·GNB 내부에서만)
function collectActiveNavItem(node, depth) {
  if (depth > 6) return null;
  const lname = node.name.toLowerCase();
  // active/selected/current variant 또는 레이어 이름에서 감지
  const isActive = /active|selected|current|활성|선택됨/.test(lname);
  if (isActive && node.type === 'TEXT' && node.characters && node.characters.trim()) return node.characters.trim();
  if (isActive && 'children' in node) {
    for (const child of node.children) {
      // 활성 노드 하위 첫 텍스트 반환
      if (child.type === 'TEXT' && child.characters && child.characters.trim()) return child.characters.trim();
    }
  }
  // Variant 속성에서 active 감지
  const navProps = safeComponentProps(node);
  if (navProps) {
    try {
      const vals = Object.values(navProps).map(v => String((v && v.value) || '').toLowerCase());
      if (vals.some(v => /active|selected|current/.test(v))) {
        // 이 인스턴스 하위 첫 텍스트
        const texts = [];
        const gather = (n) => { if (n.type === 'TEXT' && n.characters && n.characters.trim()) texts.push(n.characters.trim()); if ('children' in n) n.children.forEach(gather); };
        gather(node);
        if (texts.length) return texts[0];
      }
    } catch (e) { /* skip */ }
  }
  if ('children' in node) {
    for (const child of node.children) {
      const found = collectActiveNavItem(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function collectContext(node, result, depth) {
  if (depth > 30) return;
  const name = node.name;
  const lname = name.toLowerCase();

  // ── 사이드바·GNB: 기본은 기능 추출 대상 제외 (활성 메뉴만 기록) ──
  // 단, result._includeCommon === true 면 공통 영역도 명세 대상으로 포함 → 하위 트리 정상 탐색
  if (isNavShell(lname)) {
    const activeItem = collectActiveNavItem(node, 0);
    if (activeItem) result.activeNav = activeItem;
    if (!result._includeCommon) return; // 기본 동작: 하위 탐색 중단
    result._inCommonShell = true; // 공통 영역 내부임을 표시
  }

  // Tier 1 — 페이지 목적
  if (/title|heading|h1|페이지명|타이틀/.test(lname))      result.titles.add(name);
  if (/\btab\b|탭/.test(lname))                            result.tabs.add(name);
  if (/breadcrumb|section|섹션|경로/.test(lname))          result.sections.add(name);

  // Tier 2 — 사용자 액션
  if (/button|btn|버튼|\bcta\b|\bfab\b/.test(lname))       result.buttons.add(name);
  if (/icon.?btn|icon.?action|edit.?icon|delete.?icon|copy.?icon|more.?icon/.test(lname)) result.iconActions.add(name);
  if (/\blink\b|anchor|더보기|자세히보기/.test(lname))      result.links.add(name);

  // Tier 3 — 데이터 구조
  if (/input|field|textfield|인풋|텍스트필드|search|검색/.test(lname)) result.inputs.add(name);
  if (/select|dropdown|combobox|셀렉트|드롭다운/.test(lname)) result.selects.add(name);
  if (/table.?header|col.?header|\bth\b|thead/.test(lname)) result.tableHeaders.add(name);
  if (/list.?item|listitem|\brow\b|card.?item|\bitem\b/.test(lname)) result.listItems.add(name);
  if (/upload|attach|업로드|첨부/.test(lname))              result.uploads.add(name);

  // Tier 4 — 상태와 조건
  if (/checkbox|체크박스|체크/.test(lname))                 result.checkboxes.add(name);
  if (/\bradio\b|라디오/.test(lname))                       result.radios.add(name);
  if (/toggle|switch|토글/.test(lname))                     result.toggles.add(name);
  if (/badge|tag|\bchip\b|status|뱃지|상태/.test(lname))   result.badges.add(name);
  if (/empty|no.?data|빈화면|결과없음/.test(lname))         result.emptyStates.add(name);
  if (/skeleton|shimmer|\bloading\b/.test(lname))           result.loadings.add(name);
  if (/\balert\b|\berror\b|warning|helper.?text/.test(lname)) result.alerts.add(name);

  // Tier 5 — 플로우와 계층
  if (/modal|dialog|popup|모달|팝업/.test(lname))           result.modals.add(name);
  if (/drawer|side.?panel|드로어/.test(lname))              result.drawers.add(name);
  if (/\bstep\b|stepper|wizard/.test(lname))               result.steppers.add(name);
  if (/pagination|paging|페이지네이션/.test(lname))         result.paginations.add(name);
  if (/toast|snackbar/.test(lname))                        result.toasts.add(name);

  // 테이블 감지 (이름 기반 보완 — 컬럼 헤더가 없어도 테이블/목록 컨테이너 인식)
  if (/\btable\b|테이블|grid|데이터.?그리드|목록|리스트뷰|list.?view/.test(lname)) result.hasTable = true;
  if (result.tableHeaders && result.tableHeaders.size > 0) result.hasTable = true;

  // 스크롤 감지 (Figma 프레임의 overflowDirection 또는 이름)
  if ('overflowDirection' in node && node.overflowDirection && node.overflowDirection !== 'NONE') {
    result.hasScroll = true;
  }
  if (/scroll|스크롤/.test(lname)) result.hasScroll = true;

  // Tier 6 — 컴포넌트 Variant
  const cprops = safeComponentProps(node);
  if (cprops) {
    try {
      const props = Object.entries(cprops)
        .filter(([, v]) => v && (v.value !== undefined))
        .map(([k, v]) => `${k}=${v.value}`)
        .join(', ');
      if (props) result.componentVariants.push(`${name} (${props})`);
    } catch (e) { /* skip */ }
  }

  // ── 내용·비주얼 기반 보완 독해 (레이어 이름이 일반적일 때 핵심) ──
  classifyByContent(node, result);
  collectNodeContextNotes(node, result);

  // ── 모달·딤 처리 감지 ──
  detectModalParts(node, result);

  // 텍스트 수집
  if (node.type === 'TEXT' && node.characters && node.characters.trim()) {
    result.texts.push(node.characters.trim());
  }

  if ('children' in node) {
    for (const child of node.children) collectContext(child, result, depth + 1);
  }
}

function buildFrameSummary(node, opts) {
  opts = opts || {};
  const ctx = {
    _includeCommon: !!opts.includeCommon,
    _inCommonShell: false,
    activeNav: null,
    titles: new Set(), tabs: new Set(), sections: new Set(),
    buttons: new Set(), iconActions: new Set(), links: new Set(),
    inputs: new Set(), selects: new Set(), tableHeaders: new Set(),
    listItems: new Set(), uploads: new Set(),
    checkboxes: new Set(), radios: new Set(), toggles: new Set(),
    badges: new Set(), emptyStates: new Set(), loadings: new Set(), alerts: new Set(),
    modals: new Set(), drawers: new Set(), steppers: new Set(),
    paginations: new Set(), toasts: new Set(),
    // 내용·비주얼 기반 보완 감지 결과
    actionButtons: new Set(), inputFields: new Set(), selectFields: new Set(),
    disabledFields: new Set(),
    // 모달·딤 감지
    rootW: ('width' in node) ? node.width : 0,
    rootH: ('height' in node) ? node.height : 0,
    hasDimOverlay: false, hasModal: false,
    modalCandidates: new Set(),
    modalDetails: new Set(),
    modalTexts: new Set(),
    // 테이블·스크롤 감지
    hasTable: false, hasScroll: false,
    componentVariants: [], texts: [], contextNotes: new Set(),
  };
  collectContext(node, ctx, 0);

  if (ctx.hasDimOverlay && ctx.modalCandidates.size > 0) {
    ctx.modalCandidates.forEach(title => ctx.modals.add(title));
    ctx.hasModal = true;
  }

  const s = set => [...set].filter(Boolean);
  const isModalFocused = ctx.hasDimOverlay && (ctx.hasModal || ctx.modals.size > 0 || ctx.modalCandidates.size > 0);
  const uniqueTexts = isModalFocused && ctx.modalTexts.size > 0
    ? s(ctx.modalTexts).filter(t => t.length > 0 && t.length < 200)
    : [...new Set(ctx.texts)].filter(t => t.length > 0 && t.length < 200);

  // 레이어이름 기반 + 내용 기반 결과 병합 (중복 제거)
  const mergedButtons = new Set([...ctx.buttons, ...ctx.actionButtons]);
  const mergedInputs  = new Set([...ctx.inputs,  ...ctx.inputFields]);
  const mergedSelects = new Set([...ctx.selects, ...ctx.selectFields]);
  const hiddenByDim = isModalFocused;

  return {
    frameName: node.name,
    activeNav: hiddenByDim ? null : (ctx.activeNav || null),   // 사이드바·GNB 활성 메뉴명만
    titles:    hiddenByDim ? [] : s(ctx.titles),
    tabs:      hiddenByDim ? [] : s(ctx.tabs),
    sections:  hiddenByDim ? [] : s(ctx.sections),
    buttons:   hiddenByDim ? [] : s(mergedButtons),
    iconActions: hiddenByDim ? [] : s(ctx.iconActions),
    links:     hiddenByDim ? [] : s(ctx.links),
    inputs:    hiddenByDim ? [] : s(mergedInputs),
    selects:   hiddenByDim ? [] : s(mergedSelects),
    disabledFields: hiddenByDim ? [] : s(ctx.disabledFields),
    tableHeaders: hiddenByDim ? [] : s(ctx.tableHeaders),
    listItems: hiddenByDim ? [] : s(ctx.listItems),
    uploads:   hiddenByDim ? [] : s(ctx.uploads),
    checkboxes: hiddenByDim ? [] : s(ctx.checkboxes),
    radios:    hiddenByDim ? [] : s(ctx.radios),
    toggles:   hiddenByDim ? [] : s(ctx.toggles),
    badges:    hiddenByDim ? [] : s(ctx.badges),
    emptyStates: hiddenByDim ? [] : s(ctx.emptyStates),
    alerts:    hiddenByDim ? [] : s(ctx.alerts),
    toasts:    hiddenByDim ? [] : s(ctx.toasts),
    hasTable:  hiddenByDim ? false : (ctx.hasTable || ctx.tableHeaders.size > 0),
    hasScroll: hiddenByDim ? false : ctx.hasScroll,
    modals:    s(ctx.modals),
    hasDimOverlay: ctx.hasDimOverlay,
    hasModal: ctx.hasModal || ctx.modals.size > 0,
    modalDetails: s(ctx.modalDetails).slice(0, 24),
    dimmedBackgroundIgnored: hiddenByDim,
    drawers:   s(ctx.drawers),
    steppers:  s(ctx.steppers),
    paginations: hiddenByDim ? [] : s(ctx.paginations),
    componentVariants: hiddenByDim ? [] : ctx.componentVariants.slice(0, 20),
    allTexts:  uniqueTexts,
    contextNotes: s(ctx.contextNotes).slice(0, 40),
  };
}

function getSelectedFrames(opts) {
  const sel = figma.currentPage.selection;
  if (!sel.length) return null;
  return sel.map(n => buildFrameSummary(n, opts));
}

// ── 폰트 로드 ──
async function loadFonts() {
  const families = ['Pretendard', 'Inter'];
  for (const family of families) {
    try {
      await Promise.all([
        figma.loadFontAsync({ family, style: 'Bold' }),
        figma.loadFontAsync({ family, style: 'Regular' }),
        figma.loadFontAsync({ family, style: 'Black' }),
      ]);
      return family;
    } catch (e) { /* next */ }
  }
  // Inter fallback without Black
  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
  ]);
  return 'Inter';
}

// ── 색상 헬퍼 ──
function rgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function solid(hexColor) {
  return [{ type: 'SOLID', color: rgb(hexColor) }];
}

// ── 텍스트 노드 생성 ──
function makeText(chars, fontSize, fontFamily, fontStyle, hexColor, opts = {}) {
  const t = figma.createText();
  t.fontName = { family: fontFamily, style: fontStyle };
  t.fontSize = fontSize;
  t.characters = chars;
  t.fills = solid(hexColor);
  if (opts.letterSpacing !== undefined)
    t.letterSpacing = { unit: 'PIXELS', value: opts.letterSpacing };
  if (opts.lineHeight)
    t.lineHeight = { unit: 'PIXELS', value: opts.lineHeight };
  if (opts.width) {
    t.textAutoResize = 'HEIGHT';
    t.resize(opts.width, t.height);
  } else {
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
  }
  return t;
}

// ── 디자인시스템 docLink 알약(pill) 컴포넌트 — 기능명 옆에 인라인 배치 ──
function makeDocLinkPill(docLink, fontFamily, boldStyle) {
  if (!docLink || !docLink.url) return null;
  var label = String(docLink.label || '상세 명세');
  // 파일명 형태로 보이게 .md 가 없으면 추가
  if (!/\.md\s*$/i.test(label)) label = label + '.md';

  var pill = figma.createFrame();
  pill.name = 'docLink-pill';
  pill.fills = solid('#2a2f3d');
  pill.strokes = solid('#4a5063');
  pill.strokeWeight = 1;
  pill.clipsContent = false;
  pill.layoutMode = 'NONE';

  var PAD_X = 16, PAD_Y = 8, GAP = 6;

  var iconText = makeText('🔗', 18, fontFamily, boldStyle, '#ffffff', { letterSpacing: 0 });
  iconText.x = PAD_X;
  iconText.y = PAD_Y;
  pill.appendChild(iconText);

  var labelText = makeText(label, 18, fontFamily, boldStyle, '#ffffff', { letterSpacing: -0.36 });
  labelText.x = iconText.x + iconText.width + GAP;
  labelText.y = PAD_Y;
  pill.appendChild(labelText);
  // 라벨 텍스트 자체에 하이퍼링크 (피그마에서 클릭 시 URL 이동)
  try { labelText.hyperlink = { type: 'URL', value: String(docLink.url) }; } catch (e) { /* */ }

  var w = labelText.x + labelText.width + PAD_X;
  var h = Math.max(iconText.height, labelText.height) + PAD_Y * 2;
  pill.resize(w, h);
  pill.cornerRadius = Math.round(h / 2);
  return pill;
}

// 기존 호출 호환용 (no-op) — 더 이상 사용하지 않음, 인라인 pill로 대체
function addDocLinkRow(parent, docLink, y) { return y; }

// ── FE / BE 행 생성 ──
function addTaskRow(parent, label, text, y, padX, contentWidth, fontFamily, boldStyle, regularStyle, colors) {
  const BADGE_PX = 12, BADGE_PY = 4, BADGE_RADIUS = 6, BADGE_GAP = 6;

  // 뱃지 프레임
  const badgeFrame = figma.createFrame();
  badgeFrame.fills = solid(colors.badgeBg);
  badgeFrame.strokes = solid(colors.badgeBorder);
  badgeFrame.strokeWeight = 1;
  badgeFrame.cornerRadius = BADGE_RADIUS;
  badgeFrame.clipsContent = false;
  badgeFrame.resize(10, 10); // 임시
  parent.appendChild(badgeFrame);

  const badgeText = makeText(label, 16, fontFamily, boldStyle, colors.badgeText);
  badgeFrame.appendChild(badgeText);
  const badgeW = badgeText.width + BADGE_PX * 2;
  const badgeH = badgeText.height + BADGE_PY * 2;
  badgeFrame.resize(badgeW, badgeH);
  badgeText.x = BADGE_PX;
  badgeText.y = BADGE_PY;
  badgeFrame.x = padX;
  badgeFrame.y = y;

  // 태스크 텍스트
  const textW = contentWidth - badgeW - BADGE_GAP;
  const taskText = makeText(text, 22, fontFamily, regularStyle, '#bfc4d3', {
    letterSpacing: -0.44,
    width: textW,
  });
  taskText.x = padX + badgeW + BADGE_GAP;
  parent.appendChild(taskText);

  const rowH = Math.max(badgeH, taskText.height);
  taskText.y = y + Math.round((rowH - taskText.height) / 2);
  badgeFrame.y = y + Math.round((rowH - badgeH) / 2);

  return y + rowH;
}

// ── 핑크 번호 뱃지 생성 (화면 위 위치 표시용) ──
function makePinkBadge(num, fontFamily, blackStyle) {
  var badge = figma.createFrame();
  var size = 32;
  badge.resize(size, size);
  badge.fills = solid('#ff2d8c');
  badge.cornerRadius = 6;
  badge.clipsContent = false;
  badge.name = 'pin-' + num;
  badge.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 2 },
    radius: 4,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }];

  var t = makeText(String(num), 18, fontFamily, blackStyle, '#ffffff', { letterSpacing: -0.36 });
  t.textAlignHorizontal = 'CENTER';
  t.textAlignVertical = 'CENTER';
  t.textAutoResize = 'NONE';
  t.resize(size, size);
  badge.appendChild(t);
  return badge;
}

function hasValidAnchor(item) {
  var a = item && item.anchor;
  return !!(a && typeof a.x === 'number' && typeof a.y === 'number');
}

function sortByVisualPosition(items) {
  items = Array.isArray(items) ? items.slice() : [];
  return items
    .map(function (item, index) { return { item: item, index: index }; })
    .sort(function (a, b) {
      var aa = a.item && a.item.anchor;
      var bb = b.item && b.item.anchor;
      var av = hasValidAnchor(a.item);
      var bv = hasValidAnchor(b.item);
      if (av && bv) {
        var ay = Math.max(0, Math.min(1, aa.y));
        var by = Math.max(0, Math.min(1, bb.y));
        var ax = Math.max(0, Math.min(1, aa.x));
        var bx = Math.max(0, Math.min(1, bb.x));
        if (Math.abs(ay - by) > 0.035) return ay - by;
        if (Math.abs(ax - bx) > 0.02) return ax - bx;
      } else if (av !== bv) {
        return av ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(function (entry) { return entry.item; });
}

function clampBadgePosition(x, y, badge, bounds) {
  var pad = 4;
  return {
    x: Math.round(Math.max(bounds.x + pad, Math.min(x, bounds.x + bounds.width - badge.width - pad))),
    y: Math.round(Math.max(bounds.y + pad, Math.min(y, bounds.y + bounds.height - badge.height - pad))),
  };
}

// ── 선택 프레임 복제 + 핑크 뱃지 오버레이 (원본 아래 80px) ──
function preserveFrameName(name) {
  return String(name || '프레임').replace(/\s+\(기능 위치\)\s*$/g, '').trim() || '프레임';
}

async function createLabeledClone(sourceNodeId, features, fontFamily, blackStyle) {
  if (!sourceNodeId) return null;
  var source = null;
  try {
    source = (typeof figma.getNodeByIdAsync === 'function')
      ? await figma.getNodeByIdAsync(sourceNodeId)
      : figma.getNodeById(sourceNodeId);
  } catch (e) { source = null; }
  if (!source || typeof source.clone !== 'function') return null;
  if (!source.absoluteBoundingBox) return null;

  var srcBox = source.absoluteBoundingBox;
  var originalName = preserveFrameName(source.name);
  var clone = source.clone();
  clone.name = originalName;
  figma.currentPage.appendChild(clone);
  clone.x = srcBox.x;
  clone.y = srcBox.y + srcBox.height + 80;

  var cloneW = clone.width;
  var cloneH = clone.height;
  var cloneX = clone.x;
  var cloneY = clone.y;

  var badges = [];
  var orderedFeatures = sortByVisualPosition(features);
  for (var i = 0; i < orderedFeatures.length; i++) {
    var f = orderedFeatures[i];
    var a = f && f.anchor;
    if (!a || typeof a.x !== 'number' || typeof a.y !== 'number') continue;
    var rx = Math.max(0, Math.min(1, a.x));
    var ry = Math.max(0, Math.min(1, a.y));
    var badge = makePinkBadge(i + 1, fontFamily, blackStyle);
    var targetX = cloneX + rx * cloneW;
    var targetY = cloneY + ry * cloneH;
    // anchor가 가리키는 UI의 좌측 상단 주변에 붙인다. 배지 자체가 텍스트 중앙을 덮지 않도록
    // 우선 anchor의 좌상단 바깥쪽으로 빼고, 프레임 밖으로 나가면 내부 가장자리로 고정한다.
    var pos = clampBadgePosition(
      targetX - badge.width - 6,
      targetY - badge.height - 6,
      badge,
      { x: cloneX, y: cloneY, width: cloneW, height: cloneH }
    );
    badge.x = pos.x;
    badge.y = pos.y;
    figma.currentPage.appendChild(badge);
    badges.push(badge);
  }

  // 클론 + 뱃지를 한 그룹으로 묶어 이동·정리가 쉽게 함
  if (badges.length > 0) {
    try {
      var group = figma.group([clone].concat(badges), figma.currentPage);
      group.name = originalName;
      return { x: group.x, y: group.y, width: group.width, height: group.height };
    } catch (ge) {
      return { x: cloneX, y: cloneY, width: cloneW, height: cloneH };
    }
  }
  return { x: cloneX, y: cloneY, width: cloneW, height: cloneH };
}

// ── IA 트리 빌더 ──
function buildIATree(pages) {
  const byId = {};
  pages.forEach(function (p) {
    byId[p.id] = { id: p.id, title: p.title, subtitle: p.subtitle || '', parentId: p.parentId || null, children: [] };
  });
  const roots = [];
  pages.forEach(function (p) {
    const node = byId[p.id];
    if (p.parentId && byId[p.parentId]) byId[p.parentId].children.push(node);
    else roots.push(node);
  });
  return { roots: roots, byId: byId };
}

// ── 트리 레이아웃: depth=X 컬럼, leaf 순서대로 slot=Y, 부모는 자식들 중앙 ──
function layoutIATree(roots) {
  const positions = {};
  let cursor = 0;
  function place(node, depth) {
    if (!node.children || node.children.length === 0) {
      positions[node.id] = { depth: depth, slot: cursor };
      cursor += 1;
      return;
    }
    const startSlot = cursor;
    node.children.forEach(function (c) { place(c, depth + 1); });
    const endSlot = cursor - 1;
    positions[node.id] = { depth: depth, slot: (startSlot + endSlot) / 2 };
  }
  roots.forEach(function (r) { place(r, 0); });
  return positions;
}

// ── 타이틀 컴포넌트 헤더 (다크 슬레이트 + 큰 제목 + 보조 텍스트) ──
function createIATitleHeader(title, subtitle, width, fontFamily, blackStyle, regularStyle) {
  const HEADER_H = 96;
  const header = figma.createFrame();
  header.name = (title || '타이틀') + ' Header';
  header.resize(width, HEADER_H);
  header.fills = solid('#383b45');
  // 위쪽만 라운드 (아래에 프레임이 붙음)
  header.topLeftRadius = 12;
  header.topRightRadius = 12;
  header.bottomLeftRadius = 0;
  header.bottomRightRadius = 0;
  header.clipsContent = true;

  const PAD_X = 24, PAD_Y = 20;
  const innerW = width - PAD_X * 2;

  const titleText = makeText(title || '타이틀', 30, fontFamily, blackStyle, '#ffffff', { letterSpacing: -0.6, width: innerW });
  titleText.x = PAD_X;
  titleText.y = PAD_Y;
  header.appendChild(titleText);

  const subText = makeText(subtitle || ' ', 16, fontFamily, regularStyle, '#9ca3af', { letterSpacing: -0.32, width: innerW });
  subText.x = PAD_X;
  subText.y = titleText.y + titleText.height + 4;
  header.appendChild(subText);

  return header;
}

// ── IA 화면 그리기 (트리 + 타이틀 컴포넌트 + 화살표) ──
async function drawIAFrames(pagesInput, width, height, device) {
  const fontFamily = await loadFonts();
  const boldStyle = 'Bold';
  const regularStyle = 'Regular';
  const blackStyle = fontFamily === 'Pretendard' ? 'Black' : 'Bold';

  if (!Array.isArray(pagesInput) || pagesInput.length === 0) return 0;

  // 옛 형식(string[]) 호환
  let pages = pagesInput;
  if (typeof pages[0] === 'string') {
    pages = pages.map(function (t, i) { return { id: 'p' + i, title: t, parentId: null, subtitle: '' }; });
  }

  const tree = buildIATree(pages);
  const positions = layoutIATree(tree.roots);

  const HEADER_H = 96;
  const HEADER_TO_FRAME_GAP = 4;
  const SLOT_H = HEADER_H + HEADER_TO_FRAME_GAP + height;
  const GAP_Y = 80;
  const GAP_X = device === 'pc' ? 240 : 140; // 깊이 사이 가로 간격 (화살표 공간)

  // 전체 영역 계산
  let maxDepth = 0, maxSlot = 0;
  Object.keys(positions).forEach(function (k) {
    const p = positions[k];
    if (p.depth > maxDepth) maxDepth = p.depth;
    if (p.slot > maxSlot) maxSlot = p.slot;
  });
  const totalW = (maxDepth + 1) * width + maxDepth * GAP_X;
  const totalH = (Math.floor(maxSlot) + 1) * (SLOT_H + GAP_Y) - GAP_Y;
  const startX = Math.round(figma.viewport.center.x - totalW / 2);
  const startY = Math.round(figma.viewport.center.y - totalH / 2);

  const frameById = {};
  const headerById = {};

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const pos = positions[p.id];
    if (!pos) continue;
    const x = startX + pos.depth * (width + GAP_X);
    const y = startY + pos.slot * (SLOT_H + GAP_Y);

    const header = createIATitleHeader(p.title, p.subtitle, width, fontFamily, blackStyle, regularStyle);
    header.x = x;
    header.y = y;
    figma.currentPage.appendChild(header);
    headerById[p.id] = header;

    const frame = figma.createFrame();
    frame.name = p.title;
    frame.resize(width, height);
    frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    frame.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.9 } }];
    frame.strokeWeight = 1;
    frame.topLeftRadius = 0;
    frame.topRightRadius = 0;
    frame.bottomLeftRadius = 12;
    frame.bottomRightRadius = 12;
    frame.x = x;
    frame.y = y + HEADER_H + HEADER_TO_FRAME_GAP;
    figma.currentPage.appendChild(frame);

    frameById[p.id] = frame;
  }

  // 부모 → 자식 화살표 (VECTOR 기반)
  for (let j = 0; j < pages.length; j++) {
    const p = pages[j];
    if (!p.parentId) continue;
    const parentFrame = frameById[p.parentId];
    const childHeader = headerById[p.id];
    if (!parentFrame || !childHeader) continue;
    try {
      drawArrowBetween(parentFrame, childHeader, '#1f1f1f', {
        sides: { src: 'right', dst: 'left', orientation: 'H' },
        name: 'IA Arrow (' + (p.title || '') + ')',
      });
    } catch (e) { /* skip */ }
  }

  // 캔버스 중심·줌
  const allNodes = Object.keys(frameById).map(function (k) { return frameById[k]; });
  if (allNodes.length) {
    try { figma.currentPage.selection = allNodes; } catch (e) { /* */ }
    try { figma.viewport.scrollAndZoomIntoView(allNodes); } catch (e) { /* */ }
  }
  return allNodes.length;
}

function parseFrameSizeValue(sizeValue) {
  const m = String(sizeValue || '').match(/^(\d+)x(\d+)$/);
  if (!m) return null;
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

function createStructureHeader(title, width, fontFamily, boldStyle, regularStyle) {
  const HEADER_H = 72;
  const header = figma.createFrame();
  header.name = title;
  header.resize(width, HEADER_H);
  header.fills = solid('#383b45');
  header.topLeftRadius = 12;
  header.topRightRadius = 12;
  header.bottomLeftRadius = 0;
  header.bottomRightRadius = 0;
  header.clipsContent = true;

  const label = makeText(title, 28, fontFamily, boldStyle, '#ffffff', { letterSpacing: -0.56, width: width - 48 });
  label.x = 24;
  label.y = 16;
  header.appendChild(label);

  const sub = makeText('structure frame', 14, fontFamily, regularStyle, '#a6adbb', { letterSpacing: -0.28, width: width - 48 });
  sub.x = 24;
  sub.y = label.y + label.height + 2;
  header.appendChild(sub);
  return header;
}

async function createStructureFrames(titles, sizeValue) {
  const size = parseFrameSizeValue(sizeValue);
  if (!size) throw new Error('프레임 사이즈를 선택하세요.');
  titles = Array.isArray(titles) ? titles.filter(Boolean) : [];
  if (!titles.length) throw new Error('구조 타이틀을 1개 이상 선택하세요.');

  const fontFamily = await loadFonts();
  const boldStyle = 'Bold';
  const regularStyle = 'Regular';
  const HEADER_H = 72;
  const HEADER_TO_FRAME_GAP = 4;
  const GAP_X = 80;
  const GAP_Y = 96;
  const columns = 1;
  const itemH = HEADER_H + HEADER_TO_FRAME_GAP + size.height;
  const rows = Math.ceil(titles.length / columns);
  const totalW = columns * size.width + (columns - 1) * GAP_X;
  const totalH = rows * itemH + Math.max(0, rows - 1) * GAP_Y;
  const startX = Math.round(figma.viewport.center.x - totalW / 2);
  const startY = Math.round(figma.viewport.center.y - totalH / 2);
  const created = [];

  for (let i = 0; i < titles.length; i++) {
    const title = String(titles[i]);
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = startX + col * (size.width + GAP_X);
    const y = startY + row * (itemH + GAP_Y);

    const header = createStructureHeader(title, size.width, fontFamily, boldStyle, regularStyle);
    header.x = x;
    header.y = y;
    figma.currentPage.appendChild(header);
    created.push(header);

    const frame = figma.createFrame();
    frame.name = title;
    frame.resize(size.width, size.height);
    frame.fills = solid('#ffffff');
    frame.strokes = solid('#d9dce3');
    frame.strokeWeight = 1;
    frame.topLeftRadius = 0;
    frame.topRightRadius = 0;
    frame.bottomLeftRadius = 12;
    frame.bottomRightRadius = 12;
    frame.x = x;
    frame.y = y + HEADER_H + HEADER_TO_FRAME_GAP;
    frame.clipsContent = true;
    figma.currentPage.appendChild(frame);
    created.push(frame);
  }

  if (created.length) {
    figma.currentPage.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
  }
  return titles.length;
}

function readWidthLimitValue(node, key) {
  if (!node || !(key in node)) return null;
  const value = node[key];
  return (typeof value === 'number' && isFinite(value)) ? Math.round(value) : null;
}

function collectWidthLimitTargets(root) {
  const targets = [];
  function walk(node) {
    const minWidth = readWidthLimitValue(node, 'minWidth');
    const maxWidth = readWidthLimitValue(node, 'maxWidth');
    if (minWidth !== null || maxWidth !== null) {
      targets.push({
        node: node,
        name: node && node.name ? String(node.name) : 'frame',
        minWidth: minWidth,
        maxWidth: maxWidth,
      });
    }
    if (node && 'children' in node) {
      for (const child of node.children) walk(child);
    }
  }
  walk(root);
  return targets;
}

function makeScreenWidthLabel(node, widthSpec, fontFamily, boldStyle, regularStyle) {
  const name = node && node.name ? String(node.name) : 'frame';
  const width = Math.max(360, Math.min(820, Math.round(node.width || 360)));
  const label = figma.createFrame();
  label.name = name + ' 화면 너비 정의';
  label.resize(width, 100);
  label.fills = solid('#252b35');
  label.strokes = solid('#6d7687');
  label.strokeWeight = 1;
  label.cornerRadius = 8;
  label.clipsContent = false;

  const title = makeText(name + ' 영역', 18, fontFamily, boldStyle, '#ffffff', {
    letterSpacing: -0.36,
    width: width - 28,
  });
  title.x = 14;
  title.y = 13;
  label.appendChild(title);

  const detail = makeText(widthSpec, 16, fontFamily, regularStyle, '#cfd4e0', {
    letterSpacing: -0.32,
    lineHeight: 24,
    width: width - 28,
  });
  detail.x = 14;
  detail.y = title.y + title.height + 8;
  label.appendChild(detail);
  label.resize(width, detail.y + detail.height + 14);

  return label;
}

async function defineScreenWidths() {
  const sel = figma.currentPage.selection.filter(function (n) {
    return n && 'width' in n && 'height' in n && n.absoluteBoundingBox;
  });
  if (!sel.length) throw new Error('화면 너비를 표기할 프레임을 1개 이상 선택하세요.');

  const fontFamily = await loadFonts();
  const boldStyle = 'Bold';
  const regularStyle = 'Regular';

  const labels = [];
  for (let j = 0; j < sel.length; j++) {
    const node = sel[j];
    const b = node.absoluteBoundingBox;
    const targets = collectWidthLimitTargets(node);
    if (!targets.length) continue;
    const widthSpec = targets.map(function (t) {
      const parts = [];
      if (t.minWidth !== null) parts.push('최소사이즈 ' + t.minWidth + 'px');
      if (t.maxWidth !== null) parts.push('최대사이즈 ' + t.maxWidth + 'px');
      return t.name + ' 영역 ' + parts.join(' · ');
    }).join('\n');
    const label = makeScreenWidthLabel(
      node,
      widthSpec,
      fontFamily,
      boldStyle,
      regularStyle
    );
    label.x = Math.round(b.x);
    label.y = Math.round(b.y + b.height + 16);
    figma.currentPage.appendChild(label);
    labels.push(label);
  }
  if (!labels.length) throw new Error('선택한 프레임에서 minWidth/maxWidth 지정값을 찾을 수 없습니다.');

  if (labels.length) {
    figma.currentPage.selection = labels;
    figma.viewport.scrollAndZoomIntoView(labels);
  }
  return labels.length;
}

async function createPcWidthTypesBoard() {
  const fontFamily = await loadFonts();
  const boldStyle = 'Bold';

  const boardW = 5459;
  const boardH = 2150;
  const labelW = 700;
  const labelH = 180;
  const gap = 48;
  const headerH = 260;
  const boardX = Math.round(figma.viewport.center.x - boardW / 2);
  const boardY = Math.round(figma.viewport.center.y - (boardH + labelH + gap) / 2);

  const label = figma.createFrame();
  label.name = '기기별 화면너비';
  label.resize(labelW, labelH);
  label.x = boardX;
  label.y = boardY;
  label.fills = solid('#4a4a4a');
  label.strokes = solid('#777777');
  label.strokeWeight = 4;
  label.cornerRadius = 24;
  label.clipsContent = false;
  figma.currentPage.appendChild(label);

  const labelText = makeText('기기별 화면너비', 88, fontFamily, boldStyle, '#ffffff', {
    letterSpacing: -1.76,
  });
  labelText.x = 44;
  labelText.y = Math.round((labelH - labelText.height) / 2);
  label.appendChild(labelText);

  const board = figma.createFrame();
  board.name = 'PC 화면 너비 종류';
  board.resize(boardW, boardH);
  board.x = boardX;
  board.y = boardY + labelH + gap;
  board.fills = solid('#444444');
  board.strokes = [];
  board.clipsContent = false;
  figma.currentPage.appendChild(board);

  const header = figma.createRectangle();
  header.name = '[화면너비] header';
  header.resize(boardW, headerH);
  header.x = 0;
  header.y = 0;
  header.fills = solid('#5736db');
  board.appendChild(header);

  const title = makeText('[화면너비]', 144, fontFamily, boldStyle, '#ffffff', {
    letterSpacing: -2.88,
  });
  title.x = 72;
  title.y = 52;
  board.appendChild(title);

  const widths = [1280, 1440, 1920];
  const colW = 1320;
  const colH = 190;
  const positions = [0, 1720, 3560];
  for (let i = 0; i < widths.length; i++) {
    const band = figma.createRectangle();
    band.name = 'W: ' + widths[i] + 'px일때';
    band.resize(colW, colH);
    band.x = positions[i];
    band.y = headerH + 170;
    band.fills = solid('#465871');
    board.appendChild(band);

    const bandText = makeText('W: ' + widths[i] + 'px일때', 96, fontFamily, boldStyle, '#ffffff', {
      letterSpacing: -1.92,
    });
    bandText.x = band.x + 64;
    bandText.y = band.y + Math.round((colH - bandText.height) / 2);
    board.appendChild(bandText);
  }

  figma.currentPage.selection = [label, board];
  figma.viewport.scrollAndZoomIntoView([label, board]);
  return 1;
}

async function drawExceptionPage(page) {
  page = page || {};
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const fontFamily = await loadFonts();
  const boldStyle = 'Bold';
  const regularStyle = 'Regular';
  const blackStyle = fontFamily === 'Pretendard' ? 'Black' : 'Bold';

  const W = 1440;
  const PAD = 56;
  const GAP = 24;
  const wrapper = figma.createFrame();
  wrapper.name = page.title || '예외 케이스 페이지';
  wrapper.resize(W, 900);
  wrapper.x = Math.round(figma.viewport.center.x - W / 2);
  wrapper.y = Math.round(figma.viewport.center.y - 450);
  wrapper.fills = solid('#f4f6fb');
  wrapper.strokes = solid('#d6dbe7');
  wrapper.strokeWeight = 1;
  wrapper.cornerRadius = 0;
  wrapper.clipsContent = false;
  figma.currentPage.appendChild(wrapper);

  const header = figma.createFrame();
  header.name = '페이지 헤더';
  header.resize(W, 180);
  header.x = 0;
  header.y = 0;
  header.fills = solid('#111827');
  header.clipsContent = true;
  wrapper.appendChild(header);

  const title = makeText(page.title || '예외 케이스', 44, fontFamily, blackStyle, '#ffffff', {
    letterSpacing: -0.88,
    width: W - PAD * 2,
  });
  title.x = PAD;
  title.y = 42;
  header.appendChild(title);

  const subtitle = makeText(page.subtitle || 'PRD와 디자인시스템 기반 예외 상태 페이지', 20, fontFamily, regularStyle, '#cbd5e1', {
    letterSpacing: -0.4,
    width: W - PAD * 2,
  });
  subtitle.x = PAD;
  subtitle.y = title.y + title.height + 14;
  header.appendChild(subtitle);

  let y = 220;
  if (!sections.length) {
    sections.push({
      title: '기본 예외 상태',
      description: '문서가 부족해 범용 예외 케이스로 구성했습니다.',
      items: [
        { name: '필수값 누락', trigger: '필수 입력값 없이 제출', expected: '필드 에러와 토스트 표시', component: 'Input, Toast' },
        { name: '서버 오류', trigger: 'API 요청 실패', expected: '오류 메시지와 재시도 버튼 표시', component: 'Toast, Button' },
      ],
    });
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i] || {};
    const items = Array.isArray(section.items) ? section.items : [];
    const sectionFrame = figma.createFrame();
    sectionFrame.name = section.title || '예외 케이스 섹션';
    sectionFrame.x = PAD;
    sectionFrame.y = y;
    sectionFrame.resize(W - PAD * 2, 100);
    sectionFrame.fills = solid('#ffffff');
    sectionFrame.strokes = solid('#d9deea');
    sectionFrame.strokeWeight = 1;
    sectionFrame.cornerRadius = 12;
    sectionFrame.clipsContent = false;
    wrapper.appendChild(sectionFrame);

    const sectionW = W - PAD * 2;
    const sectionTitle = makeText(section.title || '예외 케이스', 26, fontFamily, boldStyle, '#111827', {
      letterSpacing: -0.52,
      width: sectionW - 48,
    });
    sectionTitle.x = 24;
    sectionTitle.y = 22;
    sectionFrame.appendChild(sectionTitle);

    let sy = sectionTitle.y + sectionTitle.height + 8;
    if (section.description) {
      const desc = makeText(section.description, 16, fontFamily, regularStyle, '#667085', {
        letterSpacing: -0.32,
        width: sectionW - 48,
      });
      desc.x = 24;
      desc.y = sy;
      sectionFrame.appendChild(desc);
      sy = desc.y + desc.height + 22;
    } else {
      sy += 14;
    }

    for (let j = 0; j < items.length; j++) {
      const item = items[j] || {};
      const card = figma.createFrame();
      card.name = item.name || '예외 케이스';
      card.x = 24;
      card.y = sy;
      card.resize(sectionW - 48, 140);
      card.fills = solid('#f8fafc');
      card.strokes = solid('#e4e7ec');
      card.strokeWeight = 1;
      card.cornerRadius = 8;
      card.clipsContent = false;
      sectionFrame.appendChild(card);

      const itemTitle = makeText(item.name || '예외 케이스', 20, fontFamily, boldStyle, '#111827', {
        letterSpacing: -0.4,
        width: card.width - 32,
      });
      itemTitle.x = 16;
      itemTitle.y = 14;
      card.appendChild(itemTitle);

      const bodyLines = [
        item.trigger ? '조건: ' + item.trigger : '',
        item.expected ? '처리: ' + item.expected : '',
        item.component ? '컴포넌트: ' + item.component : '',
      ].filter(Boolean).join('\n');
      const body = makeText(bodyLines || '상세 정의 필요', 16, fontFamily, regularStyle, '#475467', {
        letterSpacing: -0.32,
        lineHeight: 24,
        width: card.width - 32,
      });
      body.x = 16;
      body.y = itemTitle.y + itemTitle.height + 10;
      card.appendChild(body);
      card.resize(card.width, body.y + body.height + 18);
      sy += card.height + 12;
    }

    sectionFrame.resize(sectionW, sy + 12);
    y += sectionFrame.height + GAP;
  }

  wrapper.resize(W, y + PAD);
  figma.currentPage.selection = [wrapper];
  figma.viewport.scrollAndZoomIntoView([wrapper]);
  return wrapper.id;
}

async function createMdShortcutPill(url, sourceNodeId, filename) {
  if (!url) throw new Error('GitHub MD 링크가 없습니다. GitHub Repo URL을 확인하세요.');
  const fontFamily = await loadFonts();
  const boldStyle = 'Bold';

  let source = null;
  try {
    source = sourceNodeId && typeof figma.getNodeByIdAsync === 'function'
      ? await figma.getNodeByIdAsync(sourceNodeId)
      : null;
  } catch (e) { source = null; }
  if (!source) {
    try { source = sourceNodeId ? figma.getNodeById(sourceNodeId) : null; } catch (e) { source = null; }
  }
  if (!source && figma.currentPage.selection && figma.currentPage.selection.length) {
    source = figma.currentPage.selection[0];
  }
  if (!source || !source.absoluteBoundingBox) {
    throw new Error('링크를 붙일 컴포넌트를 찾을 수 없습니다.');
  }

  const textValue = '🔗 md 바로가기';
  const PAD_X = 20;
  const PAD_Y = 10;
  const pill = figma.createFrame();
  pill.name = (filename || 'component-md') + ' 바로가기';
  pill.fills = [{ type: 'SOLID', color: { r: 0.17, g: 0.17, b: 0.17 }, opacity: 0.96 }];
  pill.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  pill.strokeWeight = 2;
  pill.cornerRadius = 999;
  pill.clipsContent = false;

  const label = makeText(textValue, 24, fontFamily, boldStyle, '#ffffff', { letterSpacing: -0.24 });
  label.x = PAD_X;
  label.y = PAD_Y;
  try { label.hyperlink = { type: 'URL', value: String(url) }; } catch (e) { /* */ }
  pill.appendChild(label);

  pill.resize(label.width + PAD_X * 2, label.height + PAD_Y * 2);

  const b = source.absoluteBoundingBox;
  const GAP = 24;
  pill.x = Math.round(b.x - pill.width - GAP);
  pill.y = Math.round(b.y + (b.height - pill.height) / 2);
  figma.currentPage.appendChild(pill);
  figma.currentPage.selection = [pill, source];
  figma.viewport.scrollAndZoomIntoView([pill, source]);
  return { id: pill.id, label: 'md 바로가기' };
}

// ── 캔버스에 기능 명세 영역 생성 ──
async function createSpecOnCanvas(features, selectionBounds, overview, meta, sourceNodeIds, unhappyFlows, edgeCases, cornerCases) {
  features = sortByVisualPosition(Array.isArray(features) ? features : []);
  unhappyFlows = Array.isArray(unhappyFlows) ? unhappyFlows : [];
  edgeCases   = Array.isArray(edgeCases)   ? edgeCases   : [];
  cornerCases = Array.isArray(cornerCases) ? cornerCases : [];
  const fontFamily = await loadFonts();
  const boldStyle   = 'Bold';
  const regularStyle = 'Regular';
  const blackStyle  = fontFamily === 'Pretendard' ? 'Black' : 'Bold';

  // 너비: 선택 프레임 가로 (최소 1024)
  const frameWidth = selectionBounds
    ? Math.max(Math.round(selectionBounds.width), 1024)
    : 1024;

  const PAD       = 48;  // 외부 패딩
  const ITEM_GAP  = 48;  // 항목 사이 간격 (구분선 아래)
  const HDR_GAP   = 20;  // 헤더 → 태스크 행 간격
  const TASK_GAP  = 12;  // FE ↔ BE 행 간격
  const ITEM_PB   = 40;  // 각 항목 하단 여백 (구분선 위)

  // 래퍼 프레임
  const wrapper = figma.createFrame();
  wrapper.name = '기능 설명';
  wrapper.resize(frameWidth, 100);
  wrapper.fills = solid('#363b46');
  wrapper.strokes = solid('#727786');
  wrapper.strokeWeight = 1;
  wrapper.cornerRadius = 20;
  wrapper.clipsContent = false;

  // 선택 프레임 복제 + 핑크 뱃지 오버레이 (원본 아래 80px)
  // 클론을 먼저 그려야 wrapper 위치를 그 아래로 정확히 잡을 수 있음
  let cloneBounds = null;
  if (sourceNodeIds && sourceNodeIds.length > 0) {
    try {
      cloneBounds = await createLabeledClone(sourceNodeIds[0], features, fontFamily, blackStyle);
    } catch (ce) {
      cloneBounds = null;
    }
  }

  // wrapper 위치 결정: 클론이 있으면 그 아래 24px, 없으면 기존대로 원본 아래 80px
  const BELOW_GAP = 80;
  const CLONE_GAP = 24;
  wrapper.x = selectionBounds
    ? Math.round(selectionBounds.x)
    : Math.round(figma.viewport.center.x - frameWidth / 2);
  if (cloneBounds) {
    wrapper.y = Math.round(cloneBounds.y + cloneBounds.height + CLONE_GAP);
  } else if (selectionBounds) {
    wrapper.y = Math.round(selectionBounds.y + selectionBounds.height + BELOW_GAP);
  } else {
    wrapper.y = Math.round(figma.viewport.center.y);
  }

  figma.currentPage.appendChild(wrapper);

  const contentWidth = frameWidth - PAD * 2;
  let y = PAD;

  // ── 0) 화면 설명 (개요) 헤더 ──
  if (overview && (overview.title || overview.purpose)) {
    // "화면 설명" 라벨
    const kicker = makeText('이 화면은', 16, fontFamily, boldStyle, '#8b91a0', { letterSpacing: -0.32 });
    kicker.x = PAD;
    kicker.y = y;
    wrapper.appendChild(kicker);
    y += kicker.height + 8;

    if (overview.title) {
      const titleText = makeText(overview.title, 30, fontFamily, blackStyle, '#ffffff', {
        letterSpacing: -0.6, width: contentWidth,
      });
      titleText.x = PAD;
      titleText.y = y;
      wrapper.appendChild(titleText);
      y += titleText.height + 12;
    }

    if (overview.purpose) {
      const purposeText = makeText(overview.purpose, 20, fontFamily, regularStyle, '#cfd4e0', {
        letterSpacing: -0.4, lineHeight: 30, width: contentWidth,
      });
      purposeText.x = PAD;
      purposeText.y = y;
      wrapper.appendChild(purposeText);
      y += purposeText.height + 28;
    }

    // 개요 ↔ 기능 목록 구분선 (굵게)
    const ovDivider = figma.createRectangle();
    ovDivider.resize(contentWidth, 2);
    ovDivider.x = PAD;
    ovDivider.y = y;
    ovDivider.fills = solid('#727786');
    wrapper.appendChild(ovDivider);
    y += 2 + ITEM_GAP;
  }

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const isLast = i === features.length - 1;

    // ① 번호 뱃지
    const numBadge = figma.createFrame();
    numBadge.resize(24, 24);
    numBadge.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    numBadge.cornerRadius = 5;
    numBadge.clipsContent = false;
    numBadge.x = PAD;
    numBadge.y = y;
    wrapper.appendChild(numBadge);

    const numText = makeText(String(i + 1), 18, fontFamily, blackStyle, '#3e424d', { letterSpacing: -0.36 });
    numText.textAlignHorizontal = 'CENTER';
    numText.textAlignVertical = 'CENTER';
    numText.textAutoResize = 'NONE';
    numText.resize(24, 24);
    numBadge.appendChild(numText);

    // ② tag 뱃지(있을 때) + 기능명
    let fNameStartX = PAD + 24 + 12;
    let fTagBadge = null;
    if (f.tag) {
      fTagBadge = figma.createFrame();
      fTagBadge.fills = solid('#3a2a55');
      fTagBadge.strokes = solid('#5a3da0');
      fTagBadge.strokeWeight = 1;
      fTagBadge.cornerRadius = 4;
      fTagBadge.clipsContent = false;
      wrapper.appendChild(fTagBadge);
      const fTagText = makeText(String(f.tag), 14, fontFamily, boldStyle, '#c4b1ff', { letterSpacing: 0 });
      fTagBadge.appendChild(fTagText);
      fTagText.x = 8; fTagText.y = 4;
      fTagBadge.resize(fTagText.width + 16, fTagText.height + 8);
      fTagBadge.x = fNameStartX;
      fNameStartX += fTagBadge.width + 8;
    }
    const nameText = makeText(f.feature, 24, fontFamily, boldStyle, '#ffffff', { letterSpacing: -0.48 });
    nameText.x = fNameStartX;
    const hdrH = Math.max(24, nameText.height);
    nameText.y = y + Math.round((hdrH - nameText.height) / 2);
    wrapper.appendChild(nameText);
    if (fTagBadge) fTagBadge.y = y + Math.round((hdrH - fTagBadge.height) / 2);

    y += hdrH + HDR_GAP;

    // ②-1 docLink (있을 때만)
    y = addDocLinkRow(wrapper, f.docLink, y, PAD, contentWidth, fontFamily, regularStyle);

    // ③ FE 행
    y = addTaskRow(wrapper, 'FE', f.fe, y, PAD, contentWidth, fontFamily, boldStyle, regularStyle, {
      badgeBg: '#0d5215', badgeBorder: '#146c1e', badgeText: '#53e464',
    });
    y += TASK_GAP;

    // ④ BE 행
    y = addTaskRow(wrapper, 'BE', f.be, y, PAD, contentWidth, fontFamily, boldStyle, regularStyle, {
      badgeBg: '#16468a', badgeBorder: '#2f66b6', badgeText: '#5cb8ff',
    });

    y += ITEM_PB;

    // ⑤ 구분선 (마지막 제외)
    if (!isLast) {
      const divider = figma.createRectangle();
      divider.resize(contentWidth, 1);
      divider.x = PAD;
      divider.y = y;
      divider.fills = solid('#686e7a');
      wrapper.appendChild(divider);
      y += 1 + ITEM_GAP;
    }
  }

  // ── 언해피플로우 / 엣지케이스 섹션 ──
  // features와 동일한 카드 형식, 단 ① 번호 뱃지 색상이 섹션별로 다르고 ② 섹션 헤더가 추가됨.
  function drawSectionHeader(label, accentColor) {
    // features와 분리하는 굵은 구분선
    const sectDivider = figma.createRectangle();
    sectDivider.resize(contentWidth, 2);
    sectDivider.x = PAD;
    sectDivider.y = y;
    sectDivider.fills = solid('#727786');
    wrapper.appendChild(sectDivider);
    y += 2 + ITEM_GAP;

    // 좌측 컬러 바
    const bar = figma.createRectangle();
    bar.resize(4, 32);
    bar.x = PAD;
    bar.y = y;
    bar.fills = solid(accentColor);
    wrapper.appendChild(bar);

    const title = makeText(label, 26, fontFamily, blackStyle, '#ffffff', { letterSpacing: -0.52 });
    title.x = PAD + 16;
    title.y = y + Math.round((32 - title.height) / 2);
    wrapper.appendChild(title);
    y += Math.max(32, title.height) + 24;
  }

  function drawSectionItems(items, badgeBgHex, badgeFgHex) {
    for (let j = 0; j < items.length; j++) {
      const f = items[j] || {};
      const isLastItem = j === items.length - 1;

      // ① 번호 뱃지 — 섹션 컬러
      const numBadge = figma.createFrame();
      numBadge.resize(24, 24);
      numBadge.fills = solid(badgeBgHex);
      numBadge.cornerRadius = 5;
      numBadge.clipsContent = false;
      numBadge.x = PAD;
      numBadge.y = y;
      wrapper.appendChild(numBadge);

      const numText = makeText(String(j + 1), 18, fontFamily, blackStyle, badgeFgHex, { letterSpacing: -0.36 });
      numText.textAlignHorizontal = 'CENTER';
      numText.textAlignVertical = 'CENTER';
      numText.textAutoResize = 'NONE';
      numText.resize(24, 24);
      numBadge.appendChild(numText);

      // ② tag 뱃지(있을 때) + 시나리오명 + anchor.note
      let nameStartX = PAD + 24 + 12;
      let tagBadge = null;

      if (f.tag) {
        tagBadge = figma.createFrame();
        tagBadge.fills = solid('#3a2a55');
        tagBadge.strokes = solid('#5a3da0');
        tagBadge.strokeWeight = 1;
        tagBadge.cornerRadius = 4;
        tagBadge.clipsContent = false;
        wrapper.appendChild(tagBadge);
        const tagText = makeText(String(f.tag), 14, fontFamily, boldStyle, '#c4b1ff', { letterSpacing: 0 });
        tagBadge.appendChild(tagText);
        const tagPadX = 8, tagPadY = 4;
        tagText.x = tagPadX;
        tagText.y = tagPadY;
        tagBadge.resize(tagText.width + tagPadX * 2, tagText.height + tagPadY * 2);
        tagBadge.x = nameStartX;
        nameStartX += tagBadge.width + 8;
      }

      if (f.priority) {
        var priorityColor = f.priority === '필수'
          ? { bg: '#3a1d1d', border: '#6b2a2a', text: '#ff9b9b' }
          : f.priority === '권장'
            ? { bg: '#3a2b12', border: '#6b4a16', text: '#ffc94a' }
            : { bg: '#1f3317', border: '#3c6824', text: '#8bd45a' };
        tagBadge = figma.createFrame();
        tagBadge.fills = solid(priorityColor.bg);
        tagBadge.strokes = solid(priorityColor.border);
        tagBadge.strokeWeight = 1;
        tagBadge.cornerRadius = 12;
        tagBadge.clipsContent = false;
        wrapper.appendChild(tagBadge);
        const priorityText = makeText(String(f.priority), 14, fontFamily, boldStyle, priorityColor.text, { letterSpacing: 0 });
        tagBadge.appendChild(priorityText);
        const priorityPadX = 10, priorityPadY = 4;
        priorityText.x = priorityPadX;
        priorityText.y = priorityPadY;
        tagBadge.resize(priorityText.width + priorityPadX * 2, priorityText.height + priorityPadY * 2);
        tagBadge.x = nameStartX;
        nameStartX += tagBadge.width + 8;
      }

      const note = f.anchor && f.anchor.note ? '  · ' + f.anchor.note : '';
      const categoryPrefix = f.categoryNo ? '[' + f.categoryNo + '. ' + (f.categoryTitle || '') + '] ' : '';
      const nameStr = categoryPrefix + (f.devTitle || f.feature || '항목') + note;
      const nameText = makeText(nameStr, 24, fontFamily, boldStyle, '#ffffff', { letterSpacing: -0.48 });
      nameText.x = nameStartX;
      const hdrH2 = Math.max(24, nameText.height);
      nameText.y = y + Math.round((hdrH2 - nameText.height) / 2);
      wrapper.appendChild(nameText);
      // tag 뱃지 수직 중앙 정렬
      if (tagBadge) tagBadge.y = y + Math.round((hdrH2 - tagBadge.height) / 2);

      y += hdrH2 + HDR_GAP;

      // ③-0 docLink (있을 때만)
      y = addDocLinkRow(wrapper, f.docLink, y, PAD, contentWidth, fontFamily, regularStyle);

      // ③ FE
      y = addTaskRow(wrapper, 'FE', f.fe || f.problem || '', y, PAD, contentWidth, fontFamily, boldStyle, regularStyle, {
        badgeBg: '#0d5215', badgeBorder: '#146c1e', badgeText: '#53e464',
      });
      y += TASK_GAP;
      // ④ BE
      y = addTaskRow(wrapper, 'BE', f.be || f.design || '', y, PAD, contentWidth, fontFamily, boldStyle, regularStyle, {
        badgeBg: '#16468a', badgeBorder: '#2f66b6', badgeText: '#5cb8ff',
      });
      y += ITEM_PB;

      // ⑤ 구분선 (섹션 내 항목 사이)
      if (!isLastItem) {
        const divider2 = figma.createRectangle();
        divider2.resize(contentWidth, 1);
        divider2.x = PAD;
        divider2.y = y;
        divider2.fills = solid('#686e7a');
        wrapper.appendChild(divider2);
        y += 1 + ITEM_GAP;
      }
    }
  }

  if (unhappyFlows.length > 0) {
    drawSectionHeader('에러케이스', '#ff6b6b');
    drawSectionItems(unhappyFlows, '#3a1d1d', '#ff6b6b');
  }

  if (edgeCases.length > 0) {
    drawSectionHeader('엣지케이스', '#ffc94a');
    drawSectionItems(edgeCases, '#332811', '#ffc94a');
  }

  if (cornerCases.length > 0) {
    drawSectionHeader('🪤 Corner Case (희귀 조합)', '#a78bfa');
    drawSectionItems(cornerCases, '#1f1a33', '#a78bfa');
  }

  // (메타 모델·환경 정보는 캔버스에 그리지 않는다 — md 문서 기록용으로만 사용)

  y += PAD;
  wrapper.resize(frameWidth, y);

  figma.currentPage.selection = [wrapper];
  figma.viewport.scrollAndZoomIntoView([wrapper]);

  return wrapper.id;
}

// ── 메시지 핸들러 ──
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'get-selection') {
    try {
      const includeCommon = !!msg.includeCommon;
      const frames = getSelectedFrames({ includeCommon });
      if (!frames || frames.length === 0) {
        figma.ui.postMessage({ type: 'error', message: '프레임을 선택해주세요.' });
        return;
      }

      const sel = figma.currentPage.selection;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const selectionNodeIds = [];
      for (const node of sel) {
        selectionNodeIds.push(node.id);
        const b = node.absoluteBoundingBox;
        if (!b) continue;
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.width);
        maxY = Math.max(maxY, b.y + b.height);
      }
      const selectionBounds = isFinite(minX)
        ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
        : null;

      // frameData에도 각 노드 id 첨부 (UI → draw-spec 경유로 복제 대상 식별)
      for (let i = 0; i < frames.length && i < selectionNodeIds.length; i++) {
        frames[i].nodeId = selectionNodeIds[i];
      }

      // ── 화면 이미지 내보내기 (비전 분석용) ──
      // 레이어 텍스트만으로는 부족하므로 실제 렌더 이미지를 Claude가 직접 보게 한다.
      for (let i = 0; i < sel.length; i++) {
        try {
          const bytes = await sel[i].exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: 2 },
          });
          if (typeof figma.base64Encode === 'function') {
            frames[i].image = figma.base64Encode(bytes);
          } else {
            // 폴백: 수동 base64 인코딩
            frames[i].image = bytesToBase64(bytes);
          }
        } catch (e) {
          frames[i].image = null;
        }
      }

      // 분석 히스토리(이전 페이지에서 누적된 기능명들) 동봉
      const history = await loadHistory();
      figma.ui.postMessage({
        type: 'selection-data',
        data: frames,
        selectionBounds,
        selectionNodeIds,
        previousFeatures: history.featureNames || [],
        historyPageCount: (history.pages || []).length,
      });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: '프레임 분석 실패: ' + e.message });
    }
  }

  if (msg.type === 'get-md-selection') {
    try {
      const includeCommon = !!msg.includeCommon;
      const frames = getSelectedFrames({ includeCommon });
      if (!frames || frames.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'Figma 화면과 기능설명 영역을 선택해주세요.' });
        return;
      }

      const sel = figma.currentPage.selection;
      const selectionNodeIds = [];
      for (let i = 0; i < sel.length; i++) {
        selectionNodeIds.push(sel[i].id);
        try {
          const bytes = await sel[i].exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: 2 },
          });
          frames[i].image = typeof figma.base64Encode === 'function'
            ? figma.base64Encode(bytes)
            : bytesToBase64(bytes);
        } catch (e) {
          frames[i].image = null;
        }
      }

      for (let i = 0; i < frames.length && i < selectionNodeIds.length; i++) {
        frames[i].nodeId = selectionNodeIds[i];
      }

      figma.ui.postMessage({
        type: 'md-selection-data',
        data: frames,
        selectionNodeIds,
      });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: '기능명세 MD용 선택 영역 분석 실패: ' + e.message });
    }
  }

  if (msg.type === 'draw-spec') {
    try {
      const nodeId = await createSpecOnCanvas(
        msg.features, msg.selectionBounds, msg.overview, msg.meta,
        msg.selectionNodeIds, msg.unhappyFlows, msg.edgeCases, msg.cornerCases
      );
      figma.ui.postMessage({ type: 'draw-done', nodeId });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: '캔버스 그리기 실패: ' + e.message });
    }
  }

  if (msg.type === 'draw-exception-page') {
    try {
      const nodeId = await drawExceptionPage(msg.page);
      figma.ui.postMessage({ type: 'exception-page-drawn', nodeId });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: '예외 케이스 페이지 그리기 실패: ' + e.message });
    }
  }

  if (msg.type === 'save-history') {
    try {
      const frameName = (msg.frameName || (figma.currentPage.selection[0] && figma.currentPage.selection[0].name) || '');
      const combined = []
        .concat(Array.isArray(msg.features) ? msg.features : [])
        .concat(Array.isArray(msg.unhappyFlows) ? msg.unhappyFlows : [])
        .concat(Array.isArray(msg.edgeCases) ? msg.edgeCases : []);
      const hist = await appendHistory(combined, frameName);
      figma.ui.postMessage({
        type: 'history-updated',
        previousFeatures: hist.featureNames || [],
        historyPageCount: (hist.pages || []).length,
      });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: '히스토리 저장 실패: ' + e.message });
    }
  }

  if (msg.type === 'clear-history') {
    try {
      await clearHistory();
      figma.ui.postMessage({ type: 'history-updated', previousFeatures: [], historyPageCount: 0 });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: '히스토리 초기화 실패: ' + e.message });
    }
  }

  if (msg.type === 'request-history') {
    const hist = await loadHistory();
    figma.ui.postMessage({
      type: 'history-updated',
      previousFeatures: hist.featureNames || [],
      historyPageCount: (hist.pages || []).length,
    });
  }

  if (msg.type === 'get-component-data') {
    try {
      const sel = figma.currentPage.selection;
      if (!sel.length) {
        figma.ui.postMessage({ type: 'error', message: '컴포넌트(또는 컴포넌트셋)를 1개 선택해주세요.' });
        return;
      }
      const node = sel[0];
      const t = node.type;
      if (t !== 'COMPONENT' && t !== 'COMPONENT_SET' && t !== 'INSTANCE') {
        figma.ui.postMessage({ type: 'error', message: '선택된 항목이 컴포넌트(COMPONENT / COMPONENT_SET / INSTANCE)가 아닙니다. 현재 타입: ' + t });
        return;
      }

      // 컴포넌트 데이터 수집
      const compData = {
        name: node.name,
        projectName: (figma.root && figma.root.name) ? figma.root.name : '',
        pageName: (figma.currentPage && figma.currentPage.name) ? figma.currentPage.name : '',
        fileKey: (typeof figma.fileKey === 'string' && figma.fileKey) ? figma.fileKey : '',
        type: t,
        width: node.width,
        height: node.height,
        variantProperties: null,     // COMPONENT_SET의 variant 정의
        componentProperties: null,   // INSTANCE/COMPONENT의 현재 변형 값
        variantInstances: [],        // COMPONENT_SET의 자식 COMPONENT 들
        texts: [],
        layers: [],
      };

      try {
        // COMPONENT_SET: variantGroupProperties로 가용 변형 정의 + children = 각 변형 COMPONENT
        if (t === 'COMPONENT_SET' && 'variantGroupProperties' in node && node.variantGroupProperties) {
          compData.variantProperties = node.variantGroupProperties;
          if ('children' in node) {
            for (const child of node.children) {
              if (child.type === 'COMPONENT') {
                let cprops = null;
                try { cprops = child.variantProperties || null; } catch (e) { /* */ }
                compData.variantInstances.push({
                  name: child.name,
                  width: child.width,
                  height: child.height,
                  variantProperties: cprops,
                });
              }
            }
          }
        }
        // COMPONENT 단일: componentPropertyDefinitions (있다면)
        if (t === 'COMPONENT' && 'componentPropertyDefinitions' in node) {
          try { compData.componentProperties = node.componentPropertyDefinitions; } catch (e) { /* */ }
        }
        // INSTANCE: 현재 값
        if (t === 'INSTANCE' && 'componentProperties' in node) {
          try { compData.componentProperties = node.componentProperties; } catch (e) { /* */ }
        }
      } catch (e) { /* */ }

      // 텍스트와 주요 레이어 수집 (최대 깊이 5)
      function walk(n, depth) {
        if (depth > 5) return;
        if (n.type === 'TEXT' && n.characters && n.characters.trim()) {
          compData.texts.push(n.characters.trim());
        }
        compData.layers.push({
          name: n.name,
          type: n.type,
          depth: depth,
          width: ('width' in n) ? Math.round(n.width) : 0,
          height: ('height' in n) ? Math.round(n.height) : 0,
        });
        if ('children' in n) {
          for (const c of n.children) walk(c, depth + 1);
        }
      }
      walk(node, 0);
      // 텍스트는 중복 제거, 30개 컷
      compData.texts = [...new Set(compData.texts)].slice(0, 60);
      compData.layers = compData.layers.slice(0, 200);

      // PNG 추출
      let imageB64 = null;
      try {
        const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
        imageB64 = (typeof figma.base64Encode === 'function')
          ? figma.base64Encode(bytes)
          : bytesToBase64(bytes);
      } catch (e) { /* */ }

      figma.ui.postMessage({
        type: 'component-data',
        component: compData,
        image: imageB64,
        sourceNodeId: node.id,
      });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: '컴포넌트 분석 실패: ' + e.message });
    }
  }

  if (msg.type === 'draw-ia-frames') {
    try {
      // pages(tree) 우선, 없으면 titles(string[]) 호환
      const inputPages = Array.isArray(msg.pages) && msg.pages.length
        ? msg.pages
        : (Array.isArray(msg.titles) ? msg.titles : []);
      const width = Math.max(120, Math.min(4000, parseInt(msg.width, 10) || 360));
      const height = Math.max(160, Math.min(6000, parseInt(msg.height, 10) || 780));
      const count = await drawIAFrames(inputPages, width, height, msg.device || 'mobile');
      figma.ui.postMessage({ type: 'ia-frames-drawn', count });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'IA 프레임 생성 실패: ' + e.message });
    }
  }

  if (msg.type === 'create-structure-frames') {
    try {
      const count = await createStructureFrames(msg.titles, msg.size);
      figma.ui.postMessage({ type: 'structure-frames-created', count });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: '구조 프레임 생성 실패: ' + e.message });
    }
  }

  if (msg.type === 'define-screen-widths') {
    try {
      const count = await defineScreenWidths();
      figma.ui.postMessage({ type: 'screen-widths-defined', count });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: '화면 너비 정의 실패: ' + e.message });
    }
  }

  if (msg.type === 'create-pc-width-types') {
    try {
      await createPcWidthTypesBoard();
      figma.ui.postMessage({ type: 'pc-width-types-created' });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'PC 화면 너비 종류 생성 실패: ' + e.message });
    }
  }

  if (msg.type === 'create-md-shortcut') {
    try {
      const result = await createMdShortcutPill(msg.url, msg.sourceNodeId, msg.filename);
      figma.ui.postMessage({ type: 'md-shortcut-created', nodeId: result.id, label: result.label });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: 'MD 바로가기 생성 실패: ' + e.message });
    }
  }

  if (msg.type === 'set-flow-options') {
    if (typeof msg.autoFlow === 'boolean') flowState.autoFlow = msg.autoFlow;
    if (typeof msg.color === 'string') flowState.color = msg.color;
  }

  if (msg.type === 'draw-flow-now') {
    const sel = figma.currentPage.selection;
    if (!sel || sel.length !== 2) {
      figma.ui.postMessage({ type: 'error', message: '프레임을 정확히 2개 선택하세요 (출발 → 도착 순서).' });
    } else {
      if (typeof msg.color === 'string') flowState.color = msg.color;
      const conn = drawFlowArrow(sel[0], sel[1], flowState.color);
      if (conn) figma.ui.postMessage({ type: 'flow-drawn', frames: [sel[0].name, sel[1].name] });
    }
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};
