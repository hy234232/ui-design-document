# Figma 페이지 맥락 독해 구조
> 어떤 Figma 플러그인에도 재사용 가능한 페이지 읽기 + 기능 추론 범용 구조
>
> **이 문서 = 방법론(왜·어떻게 생각하나).** 정확한 수치·정규식·프롬프트 순서·캔버스 색상·런타임(서버/launchd/보안/메타)까지 **그대로 복제하는 규격서**는 `기능명세-생성-로직-법칙.md`를 본다.

---

## 0. 핵심 원칙 — 기능 추출의 3대 규칙

> 이 규칙은 어떤 플러그인에도 공통으로 적용된다.

### 규칙 1: 화면에 있는 것만 기능으로 만든다
- 도메인 상식, 일반적인 서비스 패턴으로 없는 기능을 추가하지 않는다.
- 각 기능은 반드시 화면의 특정 UI 요소(버튼·탭·인풋·테이블 등)에서 직접 근거한다.
- 버튼 레이블·텍스트를 기능명에 그대로 반영한다. (예: "초대" 버튼 → "구성원 초대")

### 규칙 2: 사이드바·GNB는 기능 대상이 아니다
- **사이드바(sidebar, side-bar, 사이드바)**, **GNB(gnb, global-nav, top-bar, header-nav)**, **LNB(lnb, local-nav)** 는 내비게이션 쉘이다.
- 이 영역의 버튼·메뉴는 기능 명세에 포함하지 않는다.
- **예외**: 어떤 메뉴가 활성화(active/selected)되어 있는지는 현재 화면의 **위치 맥락**으로만 기록한다.
  - 형식: `현재 위치: [회사관리] 활성화됨` (기능 항목 아님, 맥락 힌트)
- 중복 명세 방지: 사이드바가 여러 화면에 반복 등장해도 매번 같은 기능이 생성되지 않도록 반드시 제외한다.

### 규칙 3: 반복 구조는 하나의 기능으로 묶는다
- 리스트 아이템, 테이블 row가 반복되면 "목록 조회" 하나로 묶는다.
- 동일한 편집/삭제 아이콘이 row마다 붙어 있으면 별도 기능이 아닌 목록 기능의 CRUD 명세에 포함한다.

---

## 1. 독해 철학

Figma 프레임은 **레이어 이름 + 텍스트 + 컴포넌트 구조**의 3중 신호를 통해 화면의 목적과 기능을 전달한다.  
기능 명세를 정확히 추론하려면 단순 텍스트 추출이 아닌, **UI 요소의 역할(role)을 분류**하고 **요소 간 관계**를 읽어야 한다.

```
네비게이션 쉘 제외 → 페이지 목적 파악 → 사용자 액션 추출 → 데이터 구조 추론 → 상태·조건 분기 파악
```

---

## 2. 신호 계층 (우선순위 순)

### Tier 0 — 제외 대상 (기능 추출 전 먼저 걷어낸다)
| 제외 대상 | 레이어 키워드 | 처리 방식 |
|---|---|---|
| 사이드바 | `sidebar`, `side-bar`, `사이드바` | 하위 탐색 중단. 활성 메뉴명만 `activeNav`로 기록 |
| GNB | `gnb`, `global-nav`, `topbar`, `top-bar`, `header-nav` | 동일 |
| LNB | `lnb`, `local-nav` | 동일 |

### Tier 1 — 페이지 목적 (무엇을 하는 화면인가)
| 신호 | 레이어 키워드 / 위치 | 읽을 수 있는 것 |
|---|---|---|
| 페이지 타이틀 | `title`, `heading`, `h1`, `페이지명`, 프레임 최상단 TEXT | 화면의 주제 도메인 |
| 탭 / 서브메뉴 | `tab`, `탭` (GNB·사이드바 제외 후) | 화면 내 구역 분리, 하위 기능 목록 |
| Breadcrumb | `breadcrumb`, `경로` | 화면의 계층 위치 |
| 섹션 헤더 | `section`, `group-title`, `card-header` | 기능 단위 경계 |

### Tier 2 — 사용자 액션 (무엇을 할 수 있는가)
| 신호 | 레이어 키워드 | 읽을 수 있는 것 |
|---|---|---|
| 기본 버튼 | `button`, `btn`, `버튼`, `cta` | 주요 액션 (저장, 제출, 다음) |
| 아이콘 버튼 | `icon-btn`, `action`, `edit`, `delete`, `copy`, `more` | row 단위 CRUD |
| 링크 텍스트 | `link`, `anchor`, `더보기`, `자세히` | 페이지 이동, 상세 조회 |
| FAB / 플로팅 버튼 | `fab`, `floating` | 글로벌 생성 액션 |
| 드롭다운 메뉴 항목 | `dropdown-item`, `menu-item` | 선택 가능한 하위 액션 목록 |

### Tier 3 — 데이터 구조 (어떤 데이터를 다루는가)
| 신호 | 레이어 키워드 | 읽을 수 있는 것 |
|---|---|---|
| 인풋 필드 | `input`, `field`, `textfield`, `인풋`, `텍스트필드` | 입력 데이터 타입, DB 컬럼 |
| 인풋 레이블 TEXT | 인풋 바로 위/옆 텍스트 | 필드명 (이메일, 이름, 전화번호) |
| 인풋 placeholder TEXT | 인풋 내부 흐린 텍스트 | 데이터 포맷 힌트 |
| 테이블 헤더 | `table-header`, `col-header`, `th` | API response 필드, 정렬 가능 여부 |
| 리스트 아이템 | `list-item`, `row`, `card`, `item` | 반복 데이터 단위, 목록 API |
| 셀렉트 / 드롭다운 | `select`, `dropdown`, `combobox`, `셀렉트` | ENUM 값, 코드성 데이터 |
| 파일 업로드 | `upload`, `file`, `attach`, `업로드`, `첨부` | multipart 처리, 스토리지 연동 |

### Tier 4 — 상태와 조건 (언제 어떻게 달라지는가)
| 신호 | 레이어 키워드 | 읽을 수 있는 것 |
|---|---|---|
| 체크박스 | `checkbox`, `check`, `체크` | 다중 선택, 권한 토글, 동의 여부 |
| 라디오 버튼 | `radio`, `라디오` | 단일 선택, ENUM 분기 |
| 토글 스위치 | `toggle`, `switch`, `토글` | ON/OFF 상태 업데이트 API |
| 뱃지 / 태그 | `badge`, `tag`, `chip`, `status`, `뱃지`, `상태` | 상태값 (활성/비활성/대기/승인) |
| 알럿 / 인라인 에러 | `alert`, `error`, `warning`, `helper-text` | 유효성 검사, 에러 처리 |
| Empty State | `empty`, `no-data`, `빈화면`, `결과없음` | 데이터 없음 처리, 온보딩 분기 |
| Skeleton / Loading | `skeleton`, `loading`, `shimmer` | 비동기 로딩 상태 |
| Disabled 상태 | variant `state=disabled` | 권한 분기, 조건부 활성화 |

### Tier 5 — 플로우와 계층 (어떤 순서로 동작하는가)
| 신호 | 레이어 키워드 | 읽을 수 있는 것 |
|---|---|---|
| 모달 / 다이얼로그 | `modal`, `dialog`, `popup`, `모달`, `팝업` | 확인 플로우, 인라인 폼 |
| 드로어 / 사이드패널 | `drawer`, `side-panel`, `드로어` | 상세 조회·편집 슬라이드 패널 |
| 스텝퍼 / 프로그레스 | `step`, `stepper`, `progress`, `wizard` | 다단계 플로우, 상태 머신 |
| 페이지네이션 | `pagination`, `paging`, `페이지네이션` | 목록 페이징 API |
| 무한 스크롤 | `infinite`, `load-more`, `더보기` | cursor 기반 페이징 |
| 토스트 / 스낵바 | `toast`, `snackbar`, `notification` | 액션 결과 피드백 |

### Tier 6 — 컴포넌트 메타 (디자인 시스템 신호)
| 신호 | 읽는 방법 | 읽을 수 있는 것 |
|---|---|---|
| 컴포넌트 이름 | INSTANCE/COMPONENT `node.name` | 설계 의도, 역할 분류 |
| Variant 속성 | `componentProperties` → `state`, `type`, `size`, `role` | 조건 분기, 권한 제어 |
| Auto Layout 방향 | `layoutMode: VERTICAL/HORIZONTAL` | 리스트(세로) vs 탭/버튼그룹(가로) |
| Tooltip | `tooltip`, `툴팁` | 복잡한 기능의 부가 설명 |
| 권한 표시 아이콘 | `lock`, `admin`, `owner`, `권한` | 역할 기반 접근 제어 (RBAC) |

---

## 2.5 내용·비주얼 기반 보완 독해 (레이어 이름이 일반적일 때 — 가장 중요)

> **왜 필요한가:** 실무 Figma 파일의 레이어 이름은 `Frame 12`, `Group 45`, `Rectangle` 처럼 자동 생성된 경우가 대부분이다. 레이어 이름 정규식만으로는 버튼·인풋·셀렉트를 못 잡고, 실제 의미(초대·이메일·소유자/관리자/일반회원·내보내기)는 전부 텍스트 덤프에만 남는다. 그 결과 AI가 화면을 "○○ 정보 입력" 같은 모호한 기능으로 뭉뚱그린다.
>
> **해결:** 레이어 이름이 신호를 주지 못하면 **형태(fill·stroke·radius·height) + 내부 텍스트 내용**으로 역할을 추론한다.

### 보완 감지 규칙
| 추론 대상 | 형태 조건 | 텍스트 조건 | 결과 |
|---|---|---|---|
| **버튼** | 배경 또는 보더 있음, 높이 24~72px | 짧은 텍스트(≤14자) + 액션 동사(초대·저장·삭제·내보내기·변경 등) | `buttons`에 텍스트 그대로 추가 |
| **셀렉트** | 위와 동일 + chevron/▾ 아이콘 자식 | 단일 값(≤24자) | `selects`에 추가 |
| **인풋** | 보더/배경 박스, 높이 24~72px | placeholder 패턴(`~입력`, `선택하세요`, `예:`, `@`) | `inputs`에 추가 |

### 비활성(disabled) 감지 — 입력 기능 오탐 방지
다음 중 하나라도 해당하면 **읽기 전용**으로 분류하여 `disabledFields`에 넣고, 입력/수정/"입력 전·후 상태 전환" 기능을 만들지 않는다.
- 레이어 이름에 `disabled`/`readonly`/`비활성`/`locked`/`잠금`
- `node.opacity < 0.55`
- 컴포넌트 variant 값에 `disabled`/`readonly`/`inactive`
- 배경이 저채도 회색(채도 < 0.12)이고 보더 없음

> 예: "회사명" 필드가 회색 처리(disabled)면 단순 조회용 표시이므로 입력 기능 근거가 될 수 없다.

**중요 — 비활성 필드도 반드시 언급한다:** 수정 기능은 만들지 않되, **"읽기 전용으로 표시된다"는 사실은 명세에 꼭 드러내야 한다.** "입력"이 아니라 **"조회/표시(읽기 전용)"** 기능으로 적는다.
- 예: "기본 정보"의 회사명이 비활성 → **회사 기본정보 조회(읽기 전용)** / FE: 회사명을 비활성(읽기 전용)으로 표시, 수정 불가 / BE: 회사 기본정보 조회 API
- 흔한 실수 2가지: ① 비활성인데 "입력 기능"으로 만든다(과거 오류) ② 비활성이라고 **아예 언급조차 안 한다**(반대 오류). 둘 다 틀림 — "읽기 전용 표시"로 언급하는 게 정답.

### 액션 우선 원칙
핵심 기능은 **버튼·셀렉트의 동작**에서 나온다. 정적 라벨만 보고 입력 기능을 만들지 말고, 실제 액션/입력 요소가 있을 때만 도출한다.
- "초대" 버튼 + "이메일" 인풋 → **구성원 초대**
- "소유자·관리자·일반회원" 셀렉트 → **구성원 권한 변경**
- "내보내기"·"소속 해제" 버튼 → **구성원 내보내기**

### 모달·다이얼로그(딤 처리) 감지 — 레이어 이름만으로는 못 잡는다
> **왜 필요한가:** 모달은 보통 `Frame`/`Group`으로 자동 명명돼 `modal` 키워드가 없다. 대신 **선택 프레임/본문 영역 대부분을 덮는 딤(dim) 처리된 어두운 반투명 배경 + 그 위에 뜬 중앙 카드**라는 시각적 패턴으로 존재한다. 이 패턴을 못 읽으면 모달이 일반 영역으로 처리돼 "모달 구현" 기능이 누락된다.

**① 딤(Dim) 오버레이 감지** — 다음을 모두 만족하면 모달 배경막으로 본다.
- 화면 대부분을 덮음(루트 대비 폭·높이 ≥ 80%)
- 어두운 fill(밝기 < 0.35)
- 반투명(`node.opacity < 0.92` 또는 `fill.opacity < 0.92`)
- 또는 레이어 이름에 `dim`/`overlay`/`backdrop`/`scrim`/`딤`/`배경막`

**오탐 방지:** 사진/썸네일 내부의 어두운 그라데이션, 카드 내부 hover overlay, 이미지 위 텍스트 가독성을 위한 딤은 모달 배경막이 아니다. 테이블 컬럼명이 `사진`/`이미지`/`썸네일`/`현장 사진`이고 각 행에 작은 이미지가 반복되면 **테이블 행의 썸네일**로 본다.

**② 모달 카드 감지** — 이름에 `modal`/`dialog`/`popup`/`모달`/`팝업`이 있거나, 또는:
- 밝은(흰색 계열, 밝기 > 0.82) 컨테이너
- 라운드 처리(cornerRadius ≥ 8)
- 화면보다 작은 중앙 카드(폭 < 루트 92%, 폭 ≥ 220px, 높이 ≥ 120px)
- 내부에 **제목 + 액션 버튼**을 가짐 (오탐 방지: 액션 텍스트가 있어야 모달로 인정)

**③ 명세 작성 규칙**
- 모달을 발견하면 **반드시 "모달 구현" 기능을 포함**한다. 기능명에 "모달"을 명시한다.
- 전체 화면/본문 대부분을 덮는 딤 배경이 없으면, 밝은 카드·사진 딤·테이블 행 이미지만 보고 모달로 가정하지 않는다.
- 테이블 내 이미지 셀은 **"사진 썸네일 표시"**, **"현장 사진 썸네일 표시"**로 목록 조회 기능의 FE 할일에 포함한다.
- **모달 닫기 동작은 항상 3종을 모두 명세에 적는다(예외 없음):**
  1. **취소/닫기 버튼** — 화면의 **실제 버튼명**을 보고 판단한다. `취소`·`닫기`·`아니오` 중 화면에 있는 라벨 그대로 사용(임의로 지어내지 않는다).
  2. **우상단 X(닫기) 아이콘 버튼**.
  3. **모달 외 영역(딤 처리된 배경) 클릭** 시 닫기.
- 모달을 닫을 때는 **딤 배경(오버레이)도 함께 해제(제거)** 한다는 점을 항상 명세에 적는다.
- 닫을 때 입력/변경 중이던 내용이 있으면 **필요 시 변경 사항 롤백(되돌리기)** 도 FE 할일에 적는다.
- 모달 뒤에 가려진(딤된) 본문 요소로 별도 기능을 또 만들지 않는다 — 모달 내용에 집중한다.
- 예: 딤 + "구성원 초대" 카드(이메일 인풋·초대 버튼) → **구성원 초대 모달**
  - FE: 모달 표시·딤 오버레이 + (취소/닫기/아니오 — 실제 라벨) 버튼·X 버튼·딤 배경 클릭으로 닫기 + 닫을 때 딤 배경 해제 + 필요 시 변경 롤백 + 이메일 검증
  - BE: 초대 API·중복 검증

### 토스트 알림(스낵바) 동작 — 고정 규칙
> 토스트/스낵바(저장 완료·전송됨·오류 등 일시 알림)는 동작이 항상 같으므로 **고정 문구로 명세**한다.
- 감지: 레이어 이름 `toast`/`snackbar` → `toasts`. 또는 액션 성공/실패 피드백이 필요한 화면.
- **동작 고정:** 토스트는 **3초 뒤 자동으로 사라지며, 서서히 나타났다가(fade-in) 서서히 사라진다(fade-out)**.
- 토스트 FE 할일 표준형: `토스트 알림 표시 — fade-in 후 3초 뒤 fade-out으로 자동 사라짐`.

### 테이블·스크롤 동작 — 고정 규칙
> 테이블/목록과 그 스크롤 동작은 자주 나오므로 규칙을 고정한다.
- 감지: 이름 `table`/`테이블`/`grid`/`목록`/`리스트뷰` 또는 테이블컬럼(`tableHeaders`) 존재 → `hasTable`. 프레임 `overflowDirection !== 'NONE'` 또는 이름 `scroll`/`스크롤` → `hasScroll`.
- 테이블/목록이 있으면 **목록 조회/표시 기능**을 명세에 포함한다.
- **스크롤이 있는데 "몇 개씩 불러오는지" 설명이 없으면 → 기본값 무한 스크롤(infinite scroll)** 로 명세한다.
  - FE: 스크롤 끝 도달 감지 → 다음 페이지 lazy load + 로딩 인디케이터.
  - BE: 커서/offset 기반 페이징 조회 API.
- 명시적 페이지네이션이나 "N개씩 보기" 표기가 있으면 그 방식(페이지 기반)을 따른다(무한 스크롤로 가정하지 않음).
- 반대로 **스크롤이 없고, 하단 행이 잘리지 않았고, 보이는 행 개수가 명확하면 추가 데이터가 있을 것으로 유추하지 않는다.** 보이는 개수를 최대 표시 개수로 명세한다.
  - 예: 최근 위험 알림이 5행만 보이고 스크롤/잘림/페이지네이션이 없으면 → **최근순 알림 목록 최대 5개 표시**.
  - FE: 최근 알림 5개만 표시. "스크롤 시 추가 로드" 문구 금지.
  - BE: 최근순 알림 목록 조회 API, limit=5.
- 사진/이미지/썸네일 컬럼이 있으면 행 데이터의 thumbnail로 읽고 목록 조회 기능에 포함한다. 모달 기능으로 분리하지 않는다.

---

## 2.6 비전(이미지) 병행 독해 — 레이어 텍스트가 없을 때의 최후 보루

> **왜 필요한가:** 본문이 **납작한 이미지(PNG)** 로 붙어 있거나, 컴포넌트 깊은 곳에 텍스트가 묻혀 레이어 독해로는 글자가 안 잡히는 경우가 있다. 이때 레이어 구조만 보면 사이드바 텍스트만 잡히고 본문(이메일·초대·권한 등)이 통째로 누락된다.

**해결:** 선택 프레임을 PNG로 내보내 **Claude가 화면 이미지를 직접 보게** 한다. 레이어 독해와 **병행**한다.
- 추출: `node.exportAsync({ format:'PNG', constraint:{ type:'SCALE', value:2 } })` → base64 → 서버가 `logs/frame-N.png`로 저장.
- 프롬프트 최상단에 `@경로`로 이미지 첨부 + Claude CLI `--allowedTools Read`로 비대화형에서 열게 함.
- Claude는 이미지에서 **버튼 글자·placeholder·표 컬럼/셀·드롭다운 선택지·타이틀·모달(딤+카드)** 을 눈으로 읽는다. 레이어 구조는 보조자료.
- 원칙: **이미지에 보이는 것이 우선**, 레이어 이름이 `Rectangle 6643`이어도 이미지의 실제 글자가 진짜 근거다.

> 상세 규약(SCALE 값·CLI 플래그·파일 경로)은 `기능명세-생성-로직-법칙.md` 1.8·3.2 참조.

---

## 2.7 화면 설명(overview)·생성 메타 — 출력에 항상 포함

- **화면 설명(overview):** 기능 목록과 별개로 "이 화면이 무엇을 하는 화면인지"를 `{ title, purpose }`로 함께 생성한다. 플러그인 패널의 **체크박스로 표시/숨김** 토글 가능(미체크 시 패널·캔버스 모두 숨김).
- **생성 메타(meta):** 모델을 고정하지 않는다. 대신 **어떤 모델·환경에서 생성했는지**(모델·도구·OS·Node·생성일시)를 **md 문서에만 기록**한다. **캔버스 결과물에는 표기하지 않는다.** 모델/환경이 바뀌면 출력 문구가 달라질 수 있으므로, 결과 비교 시 md의 기록을 근거로 삼는다.

> 출력 JSON 형식·캔버스 렌더·메타 필드는 `기능명세-생성-로직-법칙.md` 4장 참조.

---

## 3. 텍스트 독해 우선순위

같은 프레임 내 텍스트는 **위치와 크기**로 의미가 다르다.

```
1순위: 최상단 대형 텍스트        → 페이지 타이틀
2순위: 섹션 구분 중간 텍스트     → 기능 단위 경계
3순위: 인풋 레이블 소형 텍스트   → 데이터 필드명
4순위: 버튼 내부 텍스트          → 액션명
5순위: 뱃지·태그 내부 텍스트     → 상태값·카테고리
6순위: 테이블 헤더 텍스트        → 데이터 컬럼명
7순위: placeholder 텍스트       → 입력 포맷 힌트
8순위: 설명·안내 소형 텍스트     → 비즈니스 규칙 힌트
```

---

## 4. 기능 추론 규칙

### 액션 → 기능 매핑
```
버튼 "초대"           → 구성원 초대 기능 (이메일 발송 + 초대 링크 생성)
버튼 "저장" + 인풋들  → 정보 수정 기능 (PATCH API)
버튼 "삭제" (row)    → 항목 삭제 기능 (DELETE API + 확인 모달)
버튼 "내보내기"       → 데이터 export 기능 (CSV/Excel 다운로드)
테이블 + 페이지네이션 → 목록 조회 기능 (GET API + 페이징)
검색 인풋 + 목록      → 검색·필터 기능 (query params)
토글 스위치           → 상태 변경 기능 (PATCH status API)
파일 업로드 영역      → 파일 업로드 기능 (multipart + 스토리지)
```

### 조합 패턴 → 기능 추론
```
[인풋들] + [저장 버튼]                = 정보 입력/수정 폼
[테이블] + [row 아이콘 버튼들]        = 목록 + CRUD
[검색 인풋] + [필터 드롭다운] + [목록] = 검색·필터링
[탭] + [각 탭별 콘텐츠]               = 탭별 독립 기능
[모달] + [확인/취소 버튼]             = 확인이 필요한 파괴적 액션
[스텝퍼] + [다음/이전 버튼]           = 멀티스텝 온보딩/등록 플로우
[empty state] + [생성 버튼]           = 최초 생성 온보딩
```

---

## 5. 코드 구현 — `collectContext()` 전체 구조

```javascript
function collectContext(node, result, depth) {
  if (depth > 10) return;
  const name = node.name;
  const lname = name.toLowerCase();

  // ── Tier 1: 페이지 목적 ──
  if (lname.match(/title|heading|h1|페이지명|타이틀/)) result.titles.add(name);
  if (lname.match(/tab|nav|menu|gnb|lnb|탭|메뉴/))    result.tabs.add(name);
  if (lname.match(/breadcrumb|section|경로/))          result.sections.add(name);

  // ── Tier 2: 사용자 액션 ──
  if (lname.match(/button|btn|버튼|cta|fab/))          result.buttons.add(name);
  if (lname.match(/icon.?btn|action|edit|delete|copy|more/)) result.iconActions.add(name);
  if (lname.match(/link|anchor|더보기|자세히/))         result.links.add(name);

  // ── Tier 3: 데이터 구조 ──
  if (lname.match(/input|field|textfield|인풋|텍스트필드|search|검색/)) result.inputs.add(name);
  if (lname.match(/select|dropdown|combobox|셀렉트/))  result.selects.add(name);
  if (lname.match(/table.?header|col.?header|^th$/))   result.tableHeaders.add(name);
  if (lname.match(/list.?item|row|card-item|item/))    result.listItems.add(name);
  if (lname.match(/upload|file|attach|업로드|첨부/))   result.uploads.add(name);

  // ── Tier 4: 상태와 조건 ──
  if (lname.match(/checkbox|check|체크/))              result.checkboxes.add(name);
  if (lname.match(/toggle|switch|토글/))               result.toggles.add(name);
  if (lname.match(/badge|tag|chip|status|뱃지|상태/))  result.badges.add(name);
  if (lname.match(/empty|no.?data|빈화면|결과없음/))   result.emptyStates.add(name);
  if (lname.match(/skeleton|loading|shimmer/))          result.loadings.add(name);
  if (lname.match(/alert|error|warning|helper/))        result.alerts.add(name);

  // ── Tier 5: 플로우와 계층 ──
  if (lname.match(/modal|dialog|popup|모달|팝업/))     result.modals.add(name);
  detectModalParts(node, result); // 이름이 일반적이어도 딤+중앙카드 패턴으로 모달 감지
  if (lname.match(/drawer|side.?panel|드로어/))        result.drawers.add(name);
  if (lname.match(/step|stepper|wizard|progress/))     result.steppers.add(name);
  if (lname.match(/pagination|paging|페이지네이션/))   result.paginations.add(name);
  if (lname.match(/toast|snackbar|notification/))      result.toasts.add(name);

  // ── Tier 6: 컴포넌트 메타 ──
  if (node.type === 'INSTANCE' && node.componentProperties) {
    const props = Object.entries(node.componentProperties)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? v.value : v}`)
      .join(', ');
    result.componentVariants.push(`${name} (${props})`);
  }

  // 텍스트 수집
  if (node.type === 'TEXT' && node.characters?.trim()) {
    result.texts.push(node.characters.trim());
  }

  if ('children' in node) {
    for (const child of node.children) collectContext(child, result, depth + 1);
  }
}

function buildFrameSummary(node) {
  const ctx = {
    titles: new Set(), tabs: new Set(), sections: new Set(),
    buttons: new Set(), iconActions: new Set(), links: new Set(),
    inputs: new Set(), selects: new Set(), tableHeaders: new Set(),
    listItems: new Set(), uploads: new Set(),
    checkboxes: new Set(), toggles: new Set(), badges: new Set(),
    emptyStates: new Set(), loadings: new Set(), alerts: new Set(),
    modals: new Set(), drawers: new Set(), steppers: new Set(),
    paginations: new Set(), toasts: new Set(),
    componentVariants: [], texts: [],
  };
  collectContext(node, ctx, 0);

  const setToArr = s => [...s].filter(Boolean);
  const uniqueTexts = [...new Set(ctx.texts)].filter(t => t.length > 0 && t.length < 200);

  return {
    frameName: node.name,
    // Tier 1
    titles:    setToArr(ctx.titles),
    tabs:      setToArr(ctx.tabs),
    sections:  setToArr(ctx.sections),
    // Tier 2
    buttons:   setToArr(ctx.buttons),
    iconActions: setToArr(ctx.iconActions),
    links:     setToArr(ctx.links),
    // Tier 3
    inputs:    setToArr(ctx.inputs),
    selects:   setToArr(ctx.selects),
    tableHeaders: setToArr(ctx.tableHeaders),
    listItems: setToArr(ctx.listItems),
    uploads:   setToArr(ctx.uploads),
    // Tier 4
    checkboxes: setToArr(ctx.checkboxes),
    toggles:   setToArr(ctx.toggles),
    badges:    setToArr(ctx.badges),
    emptyStates: setToArr(ctx.emptyStates),
    // Tier 5
    modals:    setToArr(ctx.modals),
    steppers:  setToArr(ctx.steppers),
    paginations: setToArr(ctx.paginations),
    // Tier 6
    componentVariants: ctx.componentVariants,
    // 텍스트
    allTexts:  uniqueTexts,
  };
}
```

---

## 6. 프롬프트 구성 원칙

AI에게 전달할 때 아래 순서로 구조화하면 추론 정확도가 높아진다.

```
1. 페이지 이름 + 탭/섹션   → "이 화면은 무엇을 하는가"
2. 버튼 + 아이콘 액션      → "사용자가 무엇을 할 수 있는가"
3. 인풋 + 셀렉트 + 테이블  → "어떤 데이터를 다루는가"
4. 뱃지 + 토글 + 체크박스  → "어떤 상태와 조건이 있는가"
5. 모달 + 스텝퍼           → "어떤 플로우가 있는가"
6. 모든 텍스트 (레이블·설명·상태) → "실제 도메인 언어는 무엇인가"
```

### 완전성(누락 금지) 규칙 — 기능이 가끔 빠지는 문제의 해결책
> **왜 빠지나:** LLM 비결정성 + "모든 요소를 빠짐없이 기능화하라"는 규칙 부재. 그래서 실행마다 일부 요소(예: 권한 드롭다운)가 인접 기능에 합쳐지며 사라진다.
- 프롬프트에 **모든 상호작용 요소가 각각 최소 1개 기능에 대응**되어야 한다고 명시한다: 모든 버튼·셀렉트/드롭다운(선택 동작 포함)·입력+버튼 조합·테이블/목록·비활성 필드·모달·토스트.
- 여러 요소를 한 기능에 뭉뚱그려 누락시키지 않는다(동작 다르면 분리).
- **출력 직전 자가 점검**: 각 요소가 결과에 등장하는지 확인 후 빠진 건 추가하고 출력(점검 과정은 출력하지 않음).

---

## 7. 레이어 네이밍 가이드 (Figma 작업 시)

이 구조가 정확히 작동하려면 Figma 레이어 이름이 역할을 반영해야 한다.

```
✅ 좋은 예                    ❌ 나쁜 예
Button/Primary/저장           Rectangle 12
Input/Email                   Group 45
Badge/Status=active           Frame 8
Table/Header/이름             이름
Modal/DeleteConfirm           팝업
Tab/회사구성원관리             탭2
```

---

## 8. 레이어 네이밍 — 사이드바·GNB 가이드

```
✅ 제외되는 것 (올바른 네이밍)     ❌ 제외 안 되는 것 (잘못된 네이밍)
Sidebar                            Navigation (sidebar인지 모름)
GNB / gnb                          Header (topbar인지 타이틀인지 모름)
Side-bar/Menu                      Frame 3 (역할 불명)
LNB/local-nav                      메뉴 (탭인지 사이드바인지 모름)
```

---

## 9. 적용 체크리스트

플러그인 적용 시 확인할 항목:

- [ ] `isNavShell()` 로 사이드바·GNB·LNB를 먼저 필터링한다
- [ ] 사이드바 내 active 항목만 `activeNav`로 수집, 기능 목록에는 포함하지 않는다
- [ ] 프롬프트에 `현재 위치: [메뉴명] 활성화됨` 형태로만 전달한다
- [ ] `collectContext()` depth는 최소 8 이상 (컴포넌트 중첩 고려)
- [ ] 레이어 키워드 매칭은 소문자 변환 후 정규식으로
- [ ] 텍스트는 200자 이하만, 중복 제거 후 전달
- [ ] 프롬프트에 Tier 0 제외 → Tier 1 → 6 순서로 구조화
- [ ] 빈 배열 항목은 프롬프트에서 제외 (노이즈 방지)
- [ ] 컴포넌트 Variant는 `state`, `type` 값 위주로 요약
- [ ] AI 프롬프트에 "화면에 없는 기능은 추가 금지" 명시적 제한 포함
- [ ] AI 프롬프트에 "사이드바·GNB는 기능 명세 대상 아님" 명시적 규칙 포함
- [ ] 레이어 이름이 일반적일 때 형태+텍스트로 버튼·인풋·셀렉트 보완 감지 (`classifyByContent()`)
- [ ] disabled 필드(이름·opacity·variant·회색배경)를 `disabledFields`로 분리, 입력 기능 도출 금지
- [ ] AI 프롬프트에 "비활성 필드는 입력 기능 금지, **단 읽기 전용 조회/표시로 반드시 언급**" 규칙 포함
- [ ] AI 프롬프트에 "핵심 기능은 버튼·셀렉트 액션에서 도출" 액션 우선 규칙 포함
- [ ] 모달 감지(`detectModalParts()`): 딤 오버레이(어두운 반투명 전면) + 중앙 카드(밝은 라운드 + 제목·버튼)를 모달로 인식
- [ ] 모달 발견 시 `hasDimOverlay`·`modals`를 프롬프트에 전달하고 "모달 구현 기능 포함" 규칙 적용
- [ ] AI 프롬프트에 "딤 배경 + 중앙 카드 = 모달" + **닫기 3종(취소/닫기/아니오 실제 라벨·X·딤 클릭) + 딤 배경 해제 + 변경 롤백** 규칙 포함
- [ ] 토스트 감지 시 "fade-in → 3초 → fade-out 자동 사라짐" 고정 규칙 적용
- [ ] 테이블/목록(`hasTable`)·스크롤(`hasScroll`, `overflowDirection`) 감지 → 목록 조회 기능 + 스크롤 시 개수 설명 없으면 무한 스크롤 기본 적용
- [ ] 완전성 규칙: 모든 버튼·셀렉트·입력+버튼·테이블·비활성·모달·토스트가 각각 최소 1개 기능에 대응 + 출력 직전 자가 점검(누락 방지)
- [ ] 화면 이미지(PNG, SCALE 2)를 함께 보내 Claude가 글자·딤·모달을 시각적으로 판별 (`--allowedTools Read`)
- [ ] 화면 설명(overview) 생성 + 체크박스로 표시/숨김 토글
- [ ] 생성 메타(모델·도구·OS·Node·생성일시)는 **md 문서에만 기록**, 캔버스에는 그리지 않음
- [ ] Claude CLI spawn `cwd`=프로젝트 폴더 + launchd `WorkingDirectory` 지정(루트 스캔/보호위치 접근 방지), 타임아웃 240초
