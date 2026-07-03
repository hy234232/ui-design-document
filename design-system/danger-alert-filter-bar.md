# 위험 알림 필터 바

## Component Preview

![위험 알림 필터 바 캡쳐 이미지](preview.png)


> **Figma:** [조달과제 건축현장안전관리 → PC웹 → 위험알림 필터 바](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-14  
> **Owner:** Design System Team

---

## 1. Overview

건축현장 안전관리 시스템의 PC 웹 화면에서 위험 알림 목록 상단에 위치하는 필터 바 컴포넌트.  
전체 건수 표시, 날짜 탐색, 카메라 범위 선택, 알림 분류 선택 기능을 하나의 바로 통합 제공한다.  
데이터가 없을 경우(`no data`) 필터 컨트롤을 숨기고 전체 건수 0만 표시한다.

---

## 2. Anatomy


┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  전체  24          〈  2025-02-26 수요일  〉      [카메라 전체 ▾]    [위험 알림 분류 ▾]  │
└─────────────────────────────────────────────────────────────────────────────────────────┘


| # | Element            | Required | Figma Layer Name                      |
|---|--------------------|----------|---------------------------------------|
| 1 | 레이블 "전체"       | ✅       | `Frame 1707486156 > TEXT "전체"`      |
| 2 | 총 건수 배지        | ✅       | `Frame 1707486156 > TEXT "24" / "0"` |
| 3 | 날짜 이전 버튼      | 조건부   | `list filter > Frame 7551 > Icon/Outline/chevron-left` |
| 4 | 날짜 텍스트         | 조건부   | `list filter > Frame 7528 > TEXT "2025-02-26 수요일"` |
| 5 | 날짜 다음 버튼      | 조건부   | `list filter > Frame 7550 > Icon/Outline/chevron-right` |
| 6 | 카메라 드롭다운     | 조건부   | `dropdown list (M) #1`                |
| 7 | 알림 분류 드롭다운  | 조건부   | `dropdown list (M) #2`                |

---

## 3. Variants

| Variant        | 용도                                      | 표시 요소                                      | Figma Variant Key          |
|----------------|-------------------------------------------|------------------------------------------------|----------------------------|
| `위험알림`     | 위험 알림 데이터가 존재하는 기본 상태     | 전체 건수 + 날짜 네비게이터 + 두 드롭다운     | `속성 1=위험알림`          |
| `no data`      | 조회 결과가 없는 상태                     | 전체 건수(0)만 표시, 필터 컨트롤 숨김         | `속성 1=no data`           |

---

## 4. Design Tokens

### Color

| Token                                          | Variant     | Role                   |
|------------------------------------------------|-------------|------------------------|
| `color.danger-alert-filter-bar.background`     | 공통        | 바 배경                |
| `color.danger-alert-filter-bar.label`          | 공통        | "전체" 텍스트 색       |
| `color.danger-alert-filter-bar.count`          | 공통        | 건수 숫자 텍스트 색    |
| `color.danger-alert-filter-bar.date.text`      | 위험알림    | 날짜 텍스트 색         |
| `color.danger-alert-filter-bar.date.icon`      | 위험알림    | chevron 아이콘 색      |
| `color.danger-alert-filter-bar.dropdown.text`  | 위험알림    | 드롭다운 레이블 색     |
| `color.danger-alert-filter-bar.dropdown.icon`  | 위험알림    | 드롭다운 chevron 색    |

### Spacing & Shape

| Token                                        | Value (예시) | Role                          |
|----------------------------------------------|--------------|-------------------------------|
| `danger-alert-filter-bar.height`             | `32px`       | 바 고정 높이                  |
| `danger-alert-filter-bar.width`              | `1208px`     | 바 전체 너비 (PC 기준)        |
| `danger-alert-filter-bar.padding.vertical`   | `7px`        | 상하 내부 여백 (검토 필요)    |
| `danger-alert-filter-bar.padding.horizontal` | `0px`        | 좌우 내부 여백 (검토 필요)    |
| `danger-alert-filter-bar.gap`                | `8px`        | 요소 간 간격 (검토 필요)      |
| `danger-alert-filter-bar.dropdown.width`     | `128px`      | 드롭다운 고정 너비            |
| `danger-alert-filter-bar.dropdown.height`    | `32px`       | 드롭다운 고정 높이            |
| `danger-alert-filter-bar.date-nav.width`     | `320px`      | 날짜 네비게이터 너비          |
| `danger-alert-filter-bar.icon.size`          | `14px`       | chevron 아이콘 크기           |
| `danger-alert-filter-bar.icon.frame`         | `20px`       | 아이콘 터치 영역 프레임       |

### Typography

| Token                                          | Role                   |
|------------------------------------------------|------------------------|
| `danger-alert-filter-bar.typography.label`     | "전체" 레이블 텍스트  |
| `danger-alert-filter-bar.typography.count`     | 건수 숫자 텍스트       |
| `danger-alert-filter-bar.typography.date`      | 날짜 문자열 텍스트     |
| `danger-alert-filter-bar.typography.dropdown`  | 드롭다운 레이블 텍스트 |

---

## 5. Interaction & Behavior

### 5-1. 날짜 네비게이터

| 조건                      | 동작                                          |
|---------------------------|-----------------------------------------------|
| 이전(`‹`) 버튼 클릭       | 날짜 하루 감소, 목록 재조회                   |
| 다음(`›`) 버튼 클릭       | 날짜 하루 증가, 목록 재조회                   |
| 오늘 이후 날짜            | 다음 버튼 비활성화 (검토 필요)                |
| `no data` variant         | 날짜 네비게이터 비표시                        |

### 5-2. 드롭다운 동작

| 조건                                      | 동작                                      |
|-------------------------------------------|-------------------------------------------|
| 카메라 전체 드롭다운 클릭                 | 카메라 범위 선택 옵션 목록 표시           |
| 위험 알림 분류 드롭다운 클릭             | 알림 분류 선택 옵션 목록 표시             |
| 옵션 선택                                 | 선택값 반영 후 목록 재조회                |
| `no data` variant                         | 드롭다운 두 개 모두 비표시                |

### 5-3. Variant 전환 조건

| 조건                          | 표시 Variant  |
|-------------------------------|---------------|
| 조회 결과 건수 ≥ 1            | `위험알림`    |
| 조회 결과 건수 = 0            | `no data`     |

---

## 6. Layout Guidelines

| 영역                    | 너비        | 배치             |
|-------------------------|-------------|------------------|
| 전체 건수 영역          | `552px`     | 좌측 정렬        |
| 필터 컨트롤 영역        | `600px`     | 우측 정렬        |
| — 날짜 네비게이터       | `320px`     | 필터 영역 내 좌  |
| — 카메라 드롭다운       | `128px`     | 필터 영역 내 중  |
| — 알림 분류 드롭다운    | `128px`     | 필터 영역 내 우  |

> PC 웹 전용 컴포넌트(1208px 기준). 반응형 대응 여부는 별도 검토 필요.

---

## 7. Content Guidelines

### 건수 텍스트

- "전체" 레이블은 고정값으로 변경 불가.
- 건수는 정수로만 표시. 천 단위 구분자 사용 여부 검토 필요.
- `no data` 상태에서는 `0` 표시.

### 날짜 표시 형식

- 형식: `YYYY-MM-DD 요일` (예: `2025-02-26 수요일`)
- 요��은 한국어 전체 표기 사용 (월요일 ~ 일요일).

### 드롭다운 레이블

| 드롭다운        | 기본 레이블      | 선택 후 레이블         |
|-----------------|------------------|------------------------|
| 카메라 범위     | `카메라 전체`    | 선택된 카메라명        |
| 알림 분류       | `위험 알림 분류` | 선택된 분류명          |

| ✅ Good                  | ❌ Bad                        |
|--------------------------|-------------------------------|
| 카메라 전체              | 전체 카메라를 선택하세요      |
| 위험 알림 분류           | 분류                          |
| 2025-02-26 수요일        | 02/26/2025 Wed                |

---

## 8. Accessibility

| 항목              | 규격                                                          |
|-------------------|---------------------------------------------------------------|
| ARIA Role         | 필터 바 전체: `role="toolbar"`                                |
| 날짜 버튼         | `aria-label="이전 날짜"` / `aria-label="다음 날짜"`           |
| 드롭다운          | `aria-haspopup="listbox"`, `aria-expanded` 상태 반영          |
| 건수              | `aria-live="polite"` — 필터 변경 시 스크린리더 갱신 알림     |
| 키보드 접근       | `Tab`으로 날짜 버튼 → 드롭다운 순서 접근 가능               |
| 고대비 모드       | 배경-텍스트 명도 대비 4.5:1 이상 유지                        |

---

## 9. Platform Notes

| Platform | 특이사항                                                                 |
|----------|--------------------------------------------------------------------------|
| PC Web   | 1208px 고정 너비 기준 설계. 브라우저 축소 시 수평 스크롤 허용 (검토 필요) |
| Mobile   | 해당 컴포넌트는 PC 웹 전용. 모바일 대응 컴포넌트 별도 설계 필요          |

---

## 10. Developer API (Reference)

ts
<DangerAlertFilterBar
  variant="위험알림" | "no data"
  totalCount={number}           // 필수. 전체 알림 건수
  selectedDate={Date}           // 날짜 네비게이터 현재 날짜
  onDateChange={(date: Date) => void}  // 날짜 변경 콜백
  cameraOptions={string[]}      // 카메라 선택 옵션 목록
  selectedCamera={string}       // 선택된 카메라 (기본: '카메라 전체')
  onCameraChange={(value: string) => void}
  alertTypeOptions={string[]}   // 알림 분류 옵션 목록
  selectedAlertType={string}    // 선택된 알림 분류 (기본: '위험 알림 분류')
  onAlertTypeChange={(value: string) => void}
/>


---

## 11. Changelog

| Date       | Version | Description        | Author |
|------------|---------|--------------------|--------|
| 2026-06-14 | 0.1.0   | 초안 작성           | —      |

---

## Related

- [ ] [Dropdown List (M)](./dropdown-list-m.md) — 드롭다운 서브 컴포넌트
- [ ] [List Filter (날짜 네비게이터)](./list-filter.md) — 날짜 네비게이터 서브 컴포넌트
- [ ] [Icon Guidelines](./icon-guidelines.md)
- [ ] [위험 알림 목록 화면 스펙](./danger-alert-list.md) — 작성 예정
