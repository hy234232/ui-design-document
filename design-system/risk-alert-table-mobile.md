# Risk Alert Table — Mobile App (위험 알림 테이블)

> **Figma:** [위험 알림 → table 컴포넌트](https://www.figma.com/design/Vh1x5d0ioLBFerwzHCAaYr/?node-id=1654-130869)
> **Status:** `Draft` · **Last updated:** 2026-07-01
> **Owner:** Design System Team
> **Font:** Pretendard · **Token source:** Figma 변수(get_variable_defs) 직접 추출 — 임의 지정 없음
> **Related:** [pagination-mobile.md](https://github.com/safeai-kr/safe-site-docs/blob/design/design/component/mobile-app/pagination-mobile.md), [위험알림 시간 표기 정책](https://github.com/safeai-kr/safe-site-docs/blob/plan/plan/policy/system/notification-time.md)

모바일 앱 좁은 화면(가로 ≈ 360px)에서 위험 알림을 **행(row) 단위**로 나열하는 테이블 컴포넌트. 위험 알림 **목록**과 위험 알림 **상세** 두 곳에서 같은 행 구조를 공유하고, 표기 개수만 다르다.

---

## 1. Overview

| 항목 | 내용 |
| --- | --- |
| 무엇을 | 위험 알림을 단계 배지·유형·카메라·위치·발생 시각·처리 상태 행으로 표시 |
| 언제 쓰나 | 위험 알림 목록 화면, 위험 알림 상세 화면의 알림 리스트 영역 |
| 핵심 동작 | ① 행 탭 → 해당 위험 알림 상세 이동 ② 최신순 정렬 ③ 처리 상태·진행 도트 읽기 전용 표시 |
| 특징 | 모바일 좁은 폭 대응 — 위험 종류는 **상위 종류만** 표기(세부 종류 생략), 2줄 행 레이아웃 |

---

## 2. Anatomy

```
┌──────────── row (height 72px) ────────────┐
│ [배지] 위험 유형              발생 시각      │  ← line 1
│ 📷 카메라명 위치        처리 상태 ●●●○      │  ← line 2
├────────────── divider 1px ─────────────────┤
│ [배지] 위험 유형              발생 시각      │
│ 📷 카메라명 위치        처리 상태 ●○○○      │
└────── 최하단 행: 하단 divider/외곽선 없음 ──┘
```

| # | 요소 | 영문 키 | Figma 레이어 | 설명 |
| --- | --- | --- | --- | --- |
| 1 | 컨테이너 | `table` | `table` | 행 목록 컨테이너. 폭 = 목록 컨테이너 폭(화면 폭 − 좌우 패딩) |
| 2 | 행 | `row` | (반복) | 2줄 구성, 탭 시 상세 이동 |
| 3 | 단계 배지 | `severityBadge` | — | `주의`/`위험`/`사고발생` |
| 4 | 위험 유형 | `alertType` | — | `추락`, `PPE 장비 미착용` (세부 종류 생략) |
| 5 | 발생 시각 | `time` | — | 절대시간(우측 상단 정렬) |
| 6 | 카메라·위치 | `camera` | — | 카메라 아이콘 + `{카메라명} {위치}` |
| 7 | 처리 상태 | `status` | — | `확인 필요`/`조치 필요`/`보고서 검토 중`/`완료` |
| 8 | 진행 도트 | `progressDots` | — | 4점 진행 표시(읽기 전용) |
| 9 | 구분선 | `divider` | — | 행 사이 1px, **최하단 행은 미표기** |

---

## 3. Rules (표기 규칙)

### 3-1. 표기 개수 (Variant)

| Variant | Figma 속성 | 사용처 | 표기 개수 | 페이지네이션 |
| --- | --- | --- | --- | --- |
| 기본 | `속성 1=기본` (300×360) | 위험 알림 **상세** 테이블 | **최대 5개**(최신순) | 없음 |
| 베리언트2 | `속성 1=베리언트2` (300×432) | 위험 알림 **목록** 테이블 | **20개씩** 표기 | 있음 → [pagination-mobile.md](https://github.com/safeai-kr/safe-site-docs/blob/design/design/component/mobile-app/pagination-mobile.md) |

### 3-2. 공통 규칙

| 규칙 | 내용 | 근거 |
| --- | --- | --- |
| 세부 종류 생략 | 위험 종류는 상위 종류만 표기. `추락`·`PPE 장비 미착용` (O) / `추락-난간`·`PPE 장비 미착용-안전모` (X) | 모바일 가로 폭이 좁음 |
| 정렬 | 최신순(발생 시각 내림차순) | — |
| 최하단 외곽선 | 가장 하단 행의 하단 divider/외곽선은 표기하지 않음 | 목록 하단 시각적 종결 |
| 발생 시각 | 절대시간 표기(상대시간 미사용) | [알림 시간 표기 정책](https://github.com/safeai-kr/safe-site-docs/blob/plan/plan/policy/system/notification-time.md) |

---

## 4. Design Tokens / Spec

> 전부 Figma 변수에서 추출. 미노출 값은 `시안 기준 추가 정의 필요`로 표기.

### 4-1. 색상

| 대상 | Figma 토큰 | 값 |
| --- | --- | --- |
| 행 배경 | `gray/0` | `#ffffff` |
| 배지 `사고발생` 배경 | `tag/critical/500` | `#ff5f5b` |
| 배지 `주의` 배경 | `tag/caution/500` | `#94a3b8` (= `gray/400`) |
| 배지 `위험` 배경 | (시안 미노출) | 시안 기준 추가 정의 필요 |
| 배지 글자 | `gray/0` | `#ffffff` |
| 위험 유형 글자 | `gray/700` | `#334155` |
| 발생 시각 글자 | `gray/400` | `#94a3b8` |
| 카메라·위치 글자 | `gray/500` | `#64748b` |
| 처리 상태 글자(일반) | `gray/500` | `#64748b` |
| 진행 도트 · 확인/조치 활성 | `red/500` | `#ff5f5b` |
| 진행 도트 · 보고서 검토 중 활성 | `violet/400` | `#9d9df7` |
| 진행 도트 · 비활성 | `gray/300` | `#cbd5e1` |
| 구분선 | `gray/150` | `#eff4f9` |

### 4-2. 타이포 · 크기 · 간격

| 대상 | Figma 토큰 | 값 |
| --- | --- | --- |
| 위험 유형 | `body3/medium 14` | Pretendard · 14px · Medium(500) · lh 1.3 |
| 배지 글자 | `caption1/bold 13` | Pretendard · 13px · Bold(700) · lh 1.36 |
| 발생 시각 · 상태 | `caption1/medium 13` | Pretendard · 13px · Medium(500) · lh 1.36 |
| 배지 모서리 | `calc(radius − 4px)` | `4px` |
| 행 높이 | (프레임 실측: 360/5 = 432/6) | `72px` |
| 간격 토큰 | `space-0/5`·`space-1`·`space-1/5`·`space-2`(=`gap-2`)·`space-3` | `2` · `4` · `6` · `8` · `12` (px) |
| 진행 도트 개수 | — | 4점 (활성 개수 = 상태 단계) |
| 카메라 아이콘 | — | 시안 기준 추가 정의 필요 |

---

## 5. States & Interaction

### 5-1. 처리 상태 · 진행 도트

> 상태 정의 출처: 기능명세서 §2.4 「알림 처리 상태 요약」

| 처리 상태 | 진행 도트 | 활성 색 |
| --- | --- | --- |
| 확인 필요 | ●○○○ | `red/500` |
| 조치 필요 | ●●○○ | `red/500` |
| 보고서 검토 중 | ●●●○ | `violet/400` |
| 완료 | ●●●● | 완료 색(시안 기준 추가 정의 필요) |

- 목록/상세 테이블에서 처리 상태와 진행 도트는 **읽기 전용**. 상태 전환·조치는 위험 알림 상세에서 수행한다.
- 위험 단계별 상태 흐름(1단계 2점 / 2·3단계 최대 4점)은 기능명세서 §2.4를 따른다.

### 5-2. 행 인터랙션

| 상태 | 동작 |
| --- | --- |
| 탭 | 해당 위험 알림 상세로 이동 |
| hover / pressed | 시안 기준 추가 정의 필요 |

---

## 6. Content / Do & Don't

| 구분 | Do | Don't |
| --- | --- | --- |
| 위험 종류 표기 | `추락`, `PPE 장비 미착용` | `추락-난간`, `PPE 장비 미착용-안전모` (세부 종류 표기 금지) |
| 발생 시각 | `오전 11:03`, `04-22 수 오전 11:03` | `3분 전`(상대시간 금지) |
| 최하단 행 | 하단 외곽선 없음 | 마지막 행 아래 divider/외곽선 표기 |

---

## 7. Accessibility

| 항목 | 요구사항 |
| --- | --- |
| 행 시맨틱 | 목록은 `<ul>/<li>`, 행 전체가 상세 이동 `<button>`/`<a>` 역할 |
| 처리 상태 | 진행 도트는 장식이 아니라 상태 정보 → 텍스트 라벨(`확인 필요` 등)로 의미 전달 |
| 배지 | 색만으로 단계 구분 금지 → 텍스트(`주의`/`위험`/`사고발생`) 병행 |
| 색 대비 | 배지 `주의`(gray/400) 위 흰 글자 대비 확인 필요 |

---

## 8. Implementation Notes

- 행: `display:flex; flex-direction:column`(2줄), 각 줄은 `justify-content:space-between`으로 좌(정보)·우(시각/상태) 배치.
- 컨테이너 폭은 고정하지 않고 목록 컨테이너 폭을 상속(화면 폭 − 좌우 패딩). 행 높이 `72px` 기준, 2줄 텍스트가 넘치면 말줄임(`text-overflow:ellipsis`) 처리.
- 구분선은 `border-bottom:1px solid var(--gray-150)`로 두되 **`:last-child` 행은 `border-bottom:none`**.
- 진행 도트는 4개 고정 요소로 두고, 상태 단계 수만큼 활성 색을 채운다(확인/조치=red, 보고서 검토 중=violet, 완료=완료색).
- 목록 Variant는 20개 렌더 후 하단 고정 페이지네이션 바와 조합(pagination-mobile.md), 상세 Variant는 최대 5개 렌더·페이지네이션 없음.
- 위험 종류 라벨은 상위 종류만 매핑(세부 종류 문자열은 목록/상세 테이블에 결합하지 않음).

---

## 9. Changelog

| 버전 | 일자 | 변경 내용 | 작성자 |
| --- | --- | --- | --- |
| 0.1.0 | 2026-07-01 | Figma `table`(기본·베리언트2) 기반 모바일 위험 알림 테이블 최초 작성. 표기 개수(상세 5·목록 20)·세부 종류 생략·최하단 외곽선 규칙 반영 | Claude, 김혜연 |

---

## 10. Related

- [Pagination — Mobile App](https://github.com/safeai-kr/safe-site-docs/blob/design/design/component/mobile-app/pagination-mobile.md)
- [위험 알림(목록) 기능명세서](../risk-alert-list.md)
- [위험알림 정책](https://github.com/safeai-kr/safe-site-docs/blob/plan/plan/policy/system/notification.md) · [알림 시간 표기 정책](https://github.com/safeai-kr/safe-site-docs/blob/plan/plan/policy/system/notification-time.md)
