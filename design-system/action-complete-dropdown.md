# Action Complete Dropdown

> **Figma:** [속성 1=조치완료 → Component](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-07  
> **Owner:** Design System Team

---

## 1. Overview

현재 항목의 조치 상태를 표시하고, 드롭다운을 통해 상태를 변경할 수 있는 인라인 셀렉터 컴포넌트.  
테이블·목록·카드 등 다양한 컨텍스트에서 조치 상태를 간결하게 나타내며, chevron 아이콘으로 추가 선택지가 있음을 암시한다.

---

## 2. Anatomy


┌──────────────────────────────┐
│  조치 완료          [chevron] │
└──────────────────────────────┘


| # | Element        | Required | Figma Layer Name        |
|---|----------------|----------|-------------------------|
| 1 | Label          | ✅       | `조치 완료` (TEXT)      |
| 2 | Chevron Icon   | ✅       | `chevron-down` (INSTANCE) |
| 3 | Container      | ✅       | `속성 1=조치완료` (COMPONENT) |

---

## 3. Variants

| Variant        | 용도                          | 표시 텍스트    | Figma Variant Key             |
|----------------|-------------------------------|----------------|-------------------------------|
| `조치완료`     | 조치가 완료된 상태 표시        | 조치 완료      | `속성 1=조치완료`             |
| `조치중` (검토 필요) | 조치가 진행 중인 상태    | 조치 중        | `속성 1=조치중`               |
| `미조치` (검토 필요) | 아직 조치되지 않은 상태  | 미조치         | `속성 1=미조치`               |

> 현재 수집된 데이터 기준 단일 Variant(`조치완료`)만 확인됨. 추가 상태 Variant는 검토 필요.

---

## 4. Design Tokens

### Color

| Token                                        | Variant    | Role         |
|----------------------------------------------|------------|--------------|
| `color.action-complete.background`           | 전체       | 배경         |
| `color.action-complete.label`                | 전체       | 텍스트 색상  |
| `color.action-complete.icon`                 | 전체       | 아이콘 색상  |
| `color.action-complete.border`               | 전체       | 테두리 색상  |
| `color.action-complete.hover.background`     | hover 상태 | 배경         |
| `color.action-complete.hover.border`         | hover 상태 | 테두리 색상  |

> 스크린샷 기준: 배경 흰색(또는 연한 회색), 텍스트·아이콘 중간 회색(#5F6B7A 계열), 모서리 둥근 pill 형태의 외곽선 존재.

### Spacing & Shape

| Token                                   | Value (예시) | Role               |
|-----------------------------------------|--------------|--------------------|
| `action-complete.padding.vertical`      | `7px`        | 상하 내부 여백     |
| `action-complete.padding.horizontal`    | `12px`       | 좌우 내부 여백     |
| `action-complete.gap`                   | `8px`        | 텍스트-아이콘 간격 |
| `action-complete.border-radius`         | `16px`       | 모서리 반경 (pill) |
| `action-complete.border-width`          | `1px`        | 테두리 두께        |
| `action-complete.min-width`             | `128px`      | 최소 너비 (고정)   |
| `action-complete.height`                | `32px`       | 고정 높이          |
| `action-complete.icon-size`             | `16x16px`    | chevron 아이콘 크기|

### Typography

| Token                              | Role           |
|------------------------------------|----------------|
| `action-complete.typography.label` | 상태 텍스트    |

> 스크린샷 기준: 텍스트 크기 약 14px, weight Regular~Medium, 색상 중간 회색 계열.

---

## 5. Interaction & Animation

### 5-1. 상태 전환

| Phase       | Animation   | Duration | Easing     |
|-------------|-------------|----------|------------|
| Hover       | 배경색 변화 | `150ms`  | `ease-out` |
| Press       | 배경색 변화 | `80ms`   | `ease-in`  |
| Dropdown 열림 | Fade + Slide Down | `200ms` | `ease-out` |
| Dropdown 닫힘 | Fade + Slide Up   | `150ms` | `ease-in`  |

### 5-2. 드롭다운 동작

| 조건                         | 동작                                      |
|------------------------------|-------------------------------------------|
| 컴포넌트 클릭                | 드롭다운 메뉴 열림, chevron 180° 회전     |
| 옵션 선택                    | 선택된 상태로 레이블 갱신, 드롭다운 닫힘  |
| 외부 영역 클릭 / ESC         | 드롭다운 닫힘, 상태 유지                  |
| 비활성(disabled) 상태        | 클릭 불가, 시각적 dimmed 처리             |

### 5-3. chevron 아이콘 회전

| 상태             | chevron 방향 |
|------------------|--------------|
| 드롭다운 닫힘    | ↓ (0°)       |
| 드롭다운 열림    | ↑ (180°)     |

---

## 6. Positioning

| Position Key  | 설명                              | 권장 사용처                     |
|---------------|-----------------------------------|---------------------------------|
| `inline`      | 텍스트·셀 내 인라인 배치          | 테이블 셀, 목록 행              |
| `block`       | 독립 블록으로 배치                | 카드 내 상태 표시, 폼 필드 영역 |

> 드롭다운 패널은 컴포넌트 하단에 열리는 것을 기본으로 하되, 뷰포트 하단 경계에 닿을 경우 상단으로 반전(flip) 처리.

---

## 7. Content Guidelines

### 레이블 텍스트

- **원칙:** 현재 상태를 명사형 또는 동사 완료형으로 간결하게 표기.
- **길이:** 최대 8자 이내 권장. 초과 시 ellipsis 처리.
- **어조:** 명사형 또는 완료형 서술. 조사 최소화.

| ✅ Good       | ❌ Bad                        |
|--------------|-------------------------------|
| 조치 완료    | 조치가 완료되었습니다         |
| 미조치       | 아직 조치되지 않은 상태입니다 |
| 조치 중      | 현재 조치를 진행하고 있는 중  |

### 드롭다운 옵션

- 선택지는 상호 배타적인 상태값으로 구성.
- 현재 선택된 상태는 시각적으로 강조(체크 아이콘 또는 배경색 차별화).
- 옵션 수: 2~5개 이내 권장.

---

## 8. Accessibility

| 항목            | 규격                                                     |
|-----------------|----------------------------------------------------------|
| ARIA Role       | `role="combobox"` 또는 `role="button"` (드롭다운 트리거) |
| ARIA Expanded   | `aria-expanded="true/false"` (드롭다운 열림 상태)        |
| ARIA Label      | `aria-label="조치 상태 선택"`                            |
| Listbox         | 드롭다운 패널에 `role="listbox"`, 각 옵션 `role="option"` |
| Focus           | 트리거 버튼 Tab 포커스 지원                              |
| 키보드 조작     | `Enter`/`Space`: 열기·선택, `Arrow`: 옵션 이동, `ESC`: 닫기 |
| 고대비 모드     | 배경-텍스트 명도 대비 4.5:1 이상                        |

---

## 9. Platform Notes

| Platform | 특이사항                                                          |
|----------|-------------------------------------------------------------------|
| Web      | 드롭다운 패널은 `position: absolute`, z-index 관리 필요          |
| iOS      | Native picker 대체 사용 검토 (UX 일관성), Safe Area 고려         |
| Android  | Bottom sheet 패턴으로 대체 가능 (소규모 옵션의 경우 드롭다운 유지) |

---

## 10. Developer API (Reference)

ts
<ActionCompleteDropdown
  value: '조치완료' | '조치중' | '미조치'   // 필수. 현재 선택된 상태값
  options: Array<{
    value: string,
    label: string,
  }>                                        // 필수. 드롭다운 선택지 목록
  onChange: (value: string) => void         // 필수. 상태 변경 콜백
  disabled?: boolean                        // 기본값 false
  placeholder?: string                      // 선택값 없을 때 표시 텍스트
/>


---

## 11. Changelog

| Date       | Version | Description                              | Author |
|------------|---------|------------------------------------------|--------|
| 2026-06-07 | 0.1.0   | 초안 작성 (조치완료 단일 Variant 기준)    | —      |

---

## Related

- [ ] [Status Badge](./status-badge.md) — 클릭 불가 순수 상태 표시 컴포넌트
- [ ] [Dropdown Menu](./dropdown-menu.md) — 범용 드롭다운 메뉴
- [ ] [Select](./select.md) — 폼 내 선택 필드
- [ ] [Motion Guidelines](./motion-guidelines.md)
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
