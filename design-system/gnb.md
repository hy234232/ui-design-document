# GNB

## Component Preview

![GNB 캡쳐 이미지](preview.png)


> **Figma:** [GNB → Component](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-14  
> **Owner:** Design System Team

---

## 1. Overview

화면 최상단에 위치하는 글로벌 내비게이션 바(Global Navigation Bar).  
현재 프로젝트(사업) 선택 드롭다운과 설정·알림·사용자 프로필 아이콘을 제공하며,  
PC 웹 환경에서 전체 페이지에 걸쳐 공통으로 사용된다.

---

## 2. Anatomy


┌──────────────────────────────────────────────────────────────────────┐
│  [Project Dropdown ▾]                        [Settings] [Bell] [User] │
└──────────────────────────────────────────────────────────────────────┘


| # | Element             | Required | Figma Layer Name                        |
|---|---------------------|----------|-----------------------------------------|
| 1 | Project Dropdown    | ✅       | `dropdown list (M)`                     |
| 2 | Dropdown Label      | ✅       | `경기신도시3택지개발사업` (TEXT)          |
| 3 | Chevron Icon        | ✅       | `chevron-down`                          |
| 4 | Settings Icon       | ✅       | `default` (Frame 1707486843, 1st)       |
| 5 | Notification Bell   | ✅       | `default` (Frame 1707486843, 2nd / `Bell`) |
| 6 | User Profile Icon   | ✅       | `default` (Frame 1707486843, 3rd / `User`) |

---

## 3. Variants

> GNB는 단일 인스턴스로 사용되며 별도의 Variant 세트가 정의되어 있지 않음.  
> 아이콘 버튼(설정·알림·프로필)의 상태는 하위 `default` 인스턴스에서 관리.

| Variant       | 용도                              | Figma Variant Key       |
|---------------|-----------------------------------|-------------------------|
| `default`     | 기본 GNB 표시 상태                | (단일 컴포넌트)         |
| `active-bell` | 미확인 알림 존재 시 (검토 필요)   | (검토 필요)             |

---

## 4. Design Tokens

### Color

| Token                              | Role                          |
|------------------------------------|-------------------------------|
| `color.gnb.background`             | GNB 전체 배경 (dark navy)     |
| `color.gnb.dropdown.background`    | 드롭다운 버튼 배경            |
| `color.gnb.dropdown.label`         | 드롭다운 텍스트 색상          |
| `color.gnb.dropdown.icon`          | chevron-down 아이콘 색상      |
| `color.gnb.icon.default`           | 아이콘 버튼 기본 색상 (흰색 계열) |
| `color.gnb.icon.hover`             | 아이콘 버튼 hover 색상 (검토 필요) |
| `color.gnb.icon.active`            | 알림 등 활성 상태 색상 (검토 필요) |

### Spacing & Shape

| Token                        | Value (예시)  | Role                          |
|------------------------------|---------------|-------------------------------|
| `gnb.height`                 | `44px`        | GNB 전체 높이                 |
| `gnb.padding.horizontal`     | `24px`        | 좌우 외부 여백                |
| `gnb.category.gap`           | `(검토 필요)` | 드롭다운-아이콘 그룹 간격     |
| `gnb.icon.size`              | `36x36px`     | 아이콘 버튼 클릭 영역         |
| `gnb.icon.inner-size`        | `24x24px`     | 아이콘 시각 크기              |
| `gnb.dropdown.width`         | `240px`       | 드롭다운 버튼 너비            |
| `gnb.dropdown.height`        | `32px`        | 드롭다운 버튼 높이            |
| `gnb.dropdown.border-radius` | `(검토 필요)` | 드롭다운 모서리 반경          |

### Typography

| Token                        | Role                    |
|------------------------------|-------------------------|
| `gnb.typography.dropdown`    | 프로젝트명 텍스트       |

---

## 5. Interaction & Animation

### 5-1. 드롭다운 동작

| Phase       | Animation       | Duration      | Easing      |
|-------------|-----------------|---------------|-------------|
| Open        | Slide Down / Fade In | `150ms`  | `ease-out`  |
| Close       | Fade Out        | `100ms`       | `ease-in`   |

### 5-2. 아이콘 버튼 상태

| 조건              | 동작                                         |
|-------------------|----------------------------------------------|
| Hover             | 배경 오버레이 표시 (검토 필요)               |
| Click / Pressed   | 눌림 효과 또는 페이지 이동 / 패널 열기       |
| Bell — 알림 있음  | 뱃지 또는 강조 표시 (검토 필요)              |

### 5-3. 드롭다운 — 프로젝트 선택

| 조건                        | 동작                                         |
|-----------------------------|----------------------------------------------|
| 드롭다운 클릭               | 프로젝트 목록 열림                           |
| 항목 선택                   | 선택된 프로젝트명 레이블 업데이트 후 닫힘    |
| 외부 클릭 / ESC             | 목록 닫힘                                    |

---

## 6. Positioning

| Position Key  | 설명                      | 비고                         |
|---------------|---------------------------|------------------------------|
| `top-fixed`   | 화면 최상단 고정(sticky)  | 스크롤 시에도 항상 노출      |

> GNB는 항상 뷰포트 상단에 고정되며, z-index는 페이지 콘텐츠보다 높게 설정.

---

## 7. Content Guidelines

### 프로젝트명 (드롭다운 레이블)

- **원칙:** 선택된 프로젝트의 공식 명칭을 그대로 표시.
- **길이:** 드롭다운 너비(240px) 초과 시 ellipsis(`…`) 처리.
- **예시:** `경기신도시3택지개발사업`

| ✅ Good                        | ❌ Bad                          |
|-------------------------------|--------------------------------|
| 경기신도시3택지개발사업        | 경기신도시 3택지 개발 사업 (띄어쓰기 임의 변경) |
| 프로젝트명 그대로 표시        | 축약·임의 편집 금지             |

### 아이콘 버튼

- 아이콘만 표시; 툴팁으로 레이블 제공 필수.
- 설정: `설정`, 알림: `알림`, 프로필: `내 계정` (툴팁 텍스트 예시).

---

## 8. Accessibility

| 항목              | 규격                                                     |
|-------------------|----------------------------------------------------------|
| ARIA Role         | `role="banner"` (GNB 전체 영역)                         |
| Dropdown          | `aria-haspopup="listbox"`, `aria-expanded="true/false"` |
| 아이콘 버튼       | `aria-label` 필수 (예: `aria-label="알림"`)             |
| Focus             | 드롭다운 및 아이콘 버튼 모두 `Tab` 포커스 지원          |
| 고대비 모드       | 배경-아이콘 명도 대비 3:1 이상 (UI 컴포넌트 기준)       |
| 알림 뱃지         | `aria-label`에 미확인 알림 수 포함 (검토 필요)           |

---

## 9. Platform Notes

| Platform | 특이사항                                                        |
|----------|-----------------------------------------------------------------|
| PC Web   | 고정 너비 1208px 기준 레이아웃; 반응형 브레이크포인트 (검토 필요) |
| Tablet   | 레이아웃 축소 또는 햄버거 메뉴 전환 여부 (검토 필요)           |
| Mobile   | 모바일 전용 GNB 컴포넌트로 분리 권장                            |

---

## 10. Developer API (Reference)

ts
<GNB
  projectName={string}          // 필수. 드롭다운에 표시할 프로젝트명
  projects={Project[]}          // 필수. 선택 가능한 프로젝트 목록
  onProjectChange={(id) => void} // 프로젝트 변경 콜백
  notificationCount?: number    // 미확인 알림 수 (0이면 뱃지 미표시)
  onSettingsClick?: () => void  // 설정 아이콘 클릭 콜백
  onNotificationClick?: () => void // 알림 아이콘 클릭 콜백
  onProfileClick?: () => void   // 프로필 아이콘 클릭 콜백
/>


---

## 11. Changelog

| Date       | Version | Description             | Author |
|------------|---------|-------------------------|--------|
| 2026-06-14 | 0.1.0   | 초안 작성               | —      |

---

## Related

- [ ] [Dropdown List](./dropdown-list.md) — 프로젝트 선택 드롭다운 컴포넌트
- [ ] [Icon Button](./icon-button.md) — 설정·알림·프로필 아이콘 버튼
- [ ] [Notification Badge](./notification-badge.md) — 알림 뱃지 (검토 필요)
- [ ] [Navigation Guidelines](./navigation-guidelines.md)
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
