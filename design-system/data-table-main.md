# Data Table Main

## Component Preview

![Data Table Main 캡쳐 이미지](preview.png)


> **Figma:** [조달과제 건축현장안전관리 → PC웹 → Data Table Main](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-14  
> **Owner:** Design System Team

---

## 1. Overview

건축현장 안전관리 시스템에서 AI 감지 위험 알림 목록을 표시하는 데이터 테이블 컴포넌트.  
위험 단계(badge), 현장 사진(썸네일), 분류, 위치, 시간, 상태, 보고서 다운로드 컬럼으로 구성되며,  
데이터가 없을 경우 Empty State(no data) variant로 자동 전환된다.

---

## 2. Anatomy


┌──────────────────────────────────────────────────────────────────────────────────┐
│  위험 단계  │  현장 사진  │  분류                │  위치       │  시간       │  상태  │  보고서   │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [badge]   │  [image]   │  PPE 장비 미착용       │  📍 3층 A동 │  26-03-03  │        │  다운로드  │
│            │            │  안전모 미착용         │             │  오전 11:09 │        │           │
├──────────────────────────────────────────────────────────────────────────────────┤
│  [badge]   │  [image]   │  비계정합성            │  📍 3층 A동 │  26-03-03  │  상태  │  다운로드  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  ...       │  ...       │  ...                 │  ...        │  ...        │  ...   │  ...      │
└──────────────────────────────────────────────────────────────────────────────────┘


**Empty State (no data)**


┌──────────────────────────────────────────────────────────────────────────────────┐
│  위험 단계  │  현장 사진  │  분류  │  위치  │  시간  │  상태  │  보고서            │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                              🔔  위험 알림이 없어요.                              │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘


| # | Element          | Required | Figma Layer Name              |
|---|------------------|----------|-------------------------------|
| 1 | 위험 단계 (badge) | ✅       | `Column > Table > badge`      |
| 2 | 현장 사진        | ✅       | `Column > Table > Rectangle`  |
| 3 | 분류             | ✅       | `Column > Table > Label`      |
| 4 | 위치             | ✅       | `Column > Table > Label`      |
| 5 | 시간             | ✅       | `Column > Table > Label`      |
| 6 | 상태             | 선택      | `Column > Table > Label`      |
| 7 | 보고서 (다운로드) | 선택      | `Column > Table > Label`      |
| 8 | Empty Icon       | 조건부    | (no data variant 전용)        |
| 9 | Empty Message    | 조건부    | (no data variant 전용)        |

---

## 3. Variants

| Variant    | 용도                              | 설명                                            | Figma Variant Key     |
|------------|-----------------------------------|-------------------------------------------------|-----------------------|
| `기본`     | 데이터 존재 시 기본 테이블 표시    | 위험 알림 목록 10건 표시, badge + 썸네일 포함   | `속성 1=기본`         |
| `no data`  | 데이터가 없을 때 Empty State 표시  | 헤더만 노출, 중앙에 빈 알림 아이콘 + 메시지    | `속성 1=no data`      |

---

## 4. Design Tokens

### Color

| Token                                       | Variant    | Role                   |
|---------------------------------------------|------------|------------------------|
| `color.data-table.header.background`        | 공통       | 헤더 행 배경           |
| `color.data-table.header.text`              | 공통       | 헤더 라벨 텍스트       |
| `color.data-table.row.background.default`   | 기본       | 데이터 행 기본 배경    |
| `color.data-table.row.background.hover`     | 기본       | 데이터 행 hover 배경   |
| `color.data-table.row.border`               | 공통       | 행 구분선 색상         |
| `color.data-table.cell.text.primary`        | 기본       | 분류·위치·시간 텍스트  |
| `color.data-table.cell.text.secondary`      | 기본       | 보조 정보 텍스트       |
| `color.data-table.badge.danger`             | 기본       | 위험 단계 badge — 위험 |
| `color.data-table.badge.accident`           | 기본       | 위험 단계 badge — 사고형 |
| `color.data-table.badge.caution`            | 기본       | 위험 단계 badge — 주의 |
| `color.data-table.empty.icon`               | no data    | Empty 아이콘 색상      |
| `color.data-table.empty.text`               | no data    | Empty 메시지 텍스트    |
| `color.data-table.download.background`      | 기본       | 다운로드 버튼 배경     |
| `color.data-table.download.text`            | 기본       | 다운로드 버튼 텍스트   |
| `color.data-table.download.border`          | 기본       | 다운로드 버튼 테두리   |

### Spacing & Shape

| Token                              | Value (예시) | Role                         |
|------------------------------------|--------------|------------------------------|
| `data-table.width.total`           | `1200px`     | 컴포넌트 전체 너비           |
| `data-table.width.inner`           | `1160px`     | 내부 콘텐츠 영역 너비        |
| `data-table.row.height`            | `121px`      | 데이터 행 높이               |
| `data-table.header.height`         | `32px`       | 헤더 행 높이                 |
| `data-table.cell.padding.vertical` | `16px`       | 셀 상하 내부 여백            |
| `data-table.cell.padding.horizontal` | `12px`     | 셀 좌우 내부 여백            |
| `data-table.image.width`           | `131px`      | 현장 사진 썸네일 너비        |
| `data-table.image.height`          | `89px`       | 현장 사진 썸네일 높이        |
| `data-table.badge.height`          | `20px`       | 위험 단계 badge 높이         |
| `data-table.column.danger-level`   | `69px`       | 위험 단계 컬럼 너비          |
| `data-table.column.photo`          | `147px`      | 현장 사진 컬럼 너비          |
| `data-table.empty.height`          | `226px`      | no data variant 전체 높이    |

### Typography

| Token                              | Role                  |
|------------------------------------|-----------------------|
| `data-table.typography.header`     | 헤더 컬럼 라벨        |
| `data-table.typography.cell`       | 셀 본문 텍스트        |
| `data-table.typography.badge`      | 위험 단계 badge 텍스트 |
| `data-table.typography.empty`      | Empty State 메시지    |
| `data-table.typography.download`   | 다운로드 버튼 텍스트  |

---

## 5. Interaction & Animation

### 5-1. 행(Row) 상태

| Phase    | 동작                                | 비고                         |
|----------|-------------------------------------|------------------------------|
| Default  | 기본 배경색 유지                    | —                            |
| Hover    | 행 배경색 강조                      | `row.background.hover` 토큰  |
| Click    | 상세 페이지 이동 또는 모달 오픈     | (검토 필요)                  |

### 5-2. 상태(Status) 드롭다운

| 조건              | 동작                                     |
|-------------------|------------------------------------------|
| 상태 셀 클릭      | 드롭다운 열림 (조치 방법 선택 등)        |
| 옵션 선택         | 상태 값 업데이트, 드롭다운 닫힘          |
| 외부 클릭         | 드롭다운 닫힘                            |

### 5-3. 보고서 다운로드

| 조건              | 동작                                     |
|-------------------|------------------------------------------|
| 다운로드 버튼 클릭 | 해당 행의 보고서 파일 다운로드 실행      |
| Hover             | 버튼 강조 스타일 적용                    |

---

## 6. Column Spec

| 컬럼명    | 너비 (예시) | 정렬   | 데이터 타입       | 비고                              |
|-----------|------------|--------|-------------------|-----------------------------------|
| 위험 단계  | `69px`     | 중앙   | Badge (enum)      | 추위·주의·사고형·위험 등 단계 표시 |
| 현장 사진  | `147px`    | 중앙   | Image (Rectangle) | 썸네일 131×89px                   |
| 분류       | 가변        | 좌측   | Text              | 분류명 + 세부 항목 (예: 안전모 미착용) |
| 위치       | 가변        | 좌측   | Text + Icon       | 카메라 ID + 위치 (예: CAM-05 3층 A동) |
| 시간       | 가변        | 좌측   | Text              | 날짜 + 시간 (예: 26-03-03 수 / 오전 11:09) |
| 상태       | 가변        | 좌측   | Dropdown / Text   | 조치 방법 선택 또는 빈 상태       |
| 보고서     | 가변        | 중앙   | Button            | 다운로드 버튼                     |

---

## 7. Badge (위험 단계) 세부 규격

스크린샷 기준으로 확인된 위험 단계 badge 값:

| Badge 값  | 색상 예시    | 의미                    |
|-----------|-------------|-------------------------|
| `추위`    | 파란 계열    | 낮은 위험 수준 (검토 필요) |
| `위험`    | 주황 계열    | 높은 위험 수준           |
| `사고형`  | 빨간 계열    | 사고 발생 수준           |

> 정확한 badge 값 및 색상 토큰은 badge 컴포넌트 md 참조 필요.

---

## 8. Content Guidelines

### 분류 텍스트

- **형식:** 분류명(1줄) + 세부 항목(2줄, 보조 텍스트).
- **예시:** `PPE 장비 미착용 / 안전모`, `비계정합성`, `위험행동`, `시설물 위험`.
- **길이:** 셀 너비 초과 시 ellipsis 처리.

### 위치 텍스트

- **형식:** 카메라 ID + 위치명 (예: `CAM-05  3층 A동`).
- 카메라 아이콘(📍) 선행.

### 시간 텍스트

- **형식:** `YY-MM-DD 요일` + 줄바꿈 + `오전/오후 HH:MM`.
- **예시:** `26-03-03 수 / 오전 11:09`.

### Empty State 메시지

| ✅ Good              | ❌ Bad                          |
|---------------------|--------------------------------|
| 위험 알림이 없어요.  | 데이터가 존재하지 않습니다.    |

---

## 9. Accessibility

| 항목           | 규격                                            |
|----------------|-------------------------------------------------|
| 테이블 시맨틱  | `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` 사용 |
| 헤더 연결      | `scope="col"` 속성으로 컬럼 헤더 연결           |
| 이미지 대체텍스트 | 현장 사진에 `alt` 속성 필수 (예: `alt="현장 사진 — 3층 A동"`) |
| Empty State    | `aria-live="polite"` 으로 상태 변화 알림        |
| 다운로드 버튼  | `aria-label="[분류명] 보고서 다운로드"` 권장    |
| 키보드 탐색    | 행 및 버튼 `Tab` 포커스 지원                    |
| 고대비 모드    | badge 색상 명도 대비 4.5:1 이상 확보            |

---

## 10. Platform Notes

| Platform | 특이사항                                                              |
|----------|-----------------------------------------------------------------------|
| PC 웹    | 1200px 고정 너비 기준 설계. 스크롤은 테이블 내부 세로 스크롤 권장.   |
| 태블릿   | 컬럼 너비 유동 조정 또는 일부 컬럼 숨김 처리 (검토 필요)             |
| 모바일   | 카드형 레이아웃으로 전환 또는 가로 스크롤 (검토 필요)                |

---

## 11. Developer API (Reference)

ts
<DataTableMain
  variant="기본" | "no data"
  rows={DataTableRow[]}     // 필수. 비어 있으면 no data variant 자동 표시 권장
  onDownload?: (rowId: string) => void
  onStatusChange?: (rowId: string, status: string) => void
/>

interface DataTableRow {
  id: string;
  dangerLevel: 'caution' | 'danger' | 'accident';  // badge 값
  photoUrl: string;                                 // 현장 사진 URL
  category: string;                                 // 분류명
  subCategory?: string;                             // 세부 항목 (예: 안전모 미착용)
  location: string;                                 // 위치 (예: CAM-05 3층 A동)
  datetime: string;                                 // ISO 8601 권장
  status?: string;                                  // 상태 (선택)
  hasReport: boolean;                               // 보고서 다운로드 가능 여부
}


---

## 12. Changelog

| Date       | Version | Description              | Author |
|------------|---------|--------------------------|--------|
| 2026-06-14 | 0.1.0   | 초안 작성 (기본/no data) | —      |

---

## Related

- [ ] [Badge Component](./badge.md) — 위험 단계 badge 컴포넌트 md
- [ ] [Data Table Column](./data-table-column.md) — 개별 컬럼 컴포넌트 md
- [ ] [Empty State Guidelines](./empty-state.md) — Empty State 패턴 가이드
- [ ] [Status Dropdown](./status-dropdown.md) — 상태 드롭다운 컴포넌트 md
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
