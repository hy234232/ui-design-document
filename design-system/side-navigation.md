# Side Navigation

## Component Preview

![side 캡쳐 이미지](preview.png)


> **Figma:** [조달과제 건축현장안전관리 / PC웹 → side](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-14  
> **Owner:** Design System Team

---

## 1. Overview

PC 웹 레이아웃의 좌측에 고정 배치되는 세로형 사이드 내비게이션 컴포넌트.  
프로젝트·회사 식별 영역(상단)과 주요 기능 메뉴 목록(하단)으로 구성되며, 현재 활성 메뉴를 시각적으로 구분한다.  
너비 72px 고정, 전체 높이(768px) 점유.

---

## 2. Anatomy


┌────────────────────┐
│  [Avatar/Logo]     │  ← 프로젝트·회사 식별 영역
│  프로젝트          │
│  회사 관리         │
├────────────────────┤  ← Divider
│  [Icon] 홈         │
│  [Icon] 현장 관리  │
│  [Icon] 위험 알림  │  ← Active (강조 배경)
│  [Icon] 비계 점검  │
│  [Icon] SOP 관리   │
│  [Icon] 프로젝트   │
│        설정        │
└────────────────────┘


| # | Element             | Required | Figma Layer Name              |
|---|---------------------|----------|-------------------------------|
| 1 | Avatar / Logo 영역  | ✅       | `Rectangle 6643`              |
| 2 | 상단 메뉴 그룹      | ✅       | `Frame 1707486492`            |
| 3 | 하단 메뉴 그룹      | ✅       | `Frame 1707486501`            |
| 4 | Divider             | ✅       | (상단·하단 그룹 사이 구분선)  |
| 5 | List Item (list)    | ✅       | `list` (INSTANCE, 반복)       |
| 6 | 메뉴 아이콘         | ✅       | `Frame 1707486273` (내부)     |
| 7 | 메뉴 레이블         | ✅       | `TEXT` (내부, 예: "홈")       |

---

## 3. Variants

> 이 컴포넌트는 `INSTANCE` 타입으로, 별도의 COMPONENT_SET Variant 정의가 없습니다.  
> 내부 `list` 아이템의 상태(State)는 아래와 같이 구분됩니다.

| State      | 용도                          | 시각적 특징                          | Figma Variant Key        |
|------------|-------------------------------|--------------------------------------|---------------------------|
| `default`  | 비활성 메뉴 항목               | 아이콘 + 레이블, 배경 없음           | `state=default`           |
| `active`   | 현재 선택된 메뉴 (위험 알림)   | 짙은 배경(거의 검정), 흰 아이콘      | `state=active`            |
| `hover`    | 마우스 오버 상태               | 배경 미세 강조 (검토 필요)           | `state=hover`             |
| `disabled` | 비활성화된 메뉴 항목           | 낮은 opacity (검토 필요)             | `state=disabled`          |

---

## 4. Design Tokens

### Color

| Token                                   | State     | Role                   |
|-----------------------------------------|-----------|------------------------|
| `color.side.background`                 | —         | 사이드바 전체 배경      |
| `color.side.divider`                    | —         | 구분선 색상             |
| `color.side.item.default.background`    | default   | 메뉴 항목 배경          |
| `color.side.item.default.icon`          | default   | 아이콘 색상             |
| `color.side.item.default.label`         | default   | 레이블 텍스트 색상      |
| `color.side.item.active.background`     | active    | 활성 메뉴 배경          |
| `color.side.item.active.icon`           | active    | 활성 아이콘 색상 (흰색) |
| `color.side.item.active.label`          | active    | 활성 레이블 색상 (흰색) |
| `color.side.item.hover.background`      | hover     | 호버 배경               |
| `color.side.item.hover.icon`            | hover     | 호버 아이콘 색상        |
| `color.side.item.hover.label`           | hover     | 호버 레이블 색상        |
| `color.side.item.disabled.icon`         | disabled  | 비활성 아이콘 색상      |
| `color.side.item.disabled.label`        | disabled  | 비활성 레이블 색상      |
| `color.side.avatar.background`          | —         | 아바타/로고 플레이스홀더 배경 |

### Spacing & Shape

| Token                        | Value       | Role                          |
|------------------------------|-------------|-------------------------------|
| `side.width`                 | `72px`      | 사이드바 고정 너비             |
| `side.height`                | `768px`     | 사이드바 전체 높이             |
| `side.padding.vertical`      | `(검토 필요)` | 상하 내부 여백               |
| `side.padding.horizontal`    | `(검토 필요)` | 좌우 내부 여백               |
| `side.item.height.default`   | `54px`      | 기본 메뉴 항목 높이            |
| `side.item.height.multiline` | `72px`      | 2줄 레이블 메뉴 항목 높이      |
| `side.item.width`            | `52px`      | 메뉴 항목 너비                 |
| `side.item.icon.size`        | `28px`      | 아이콘 영역 크기               |
| `side.item.border-radius`    | `8px`       | 활성 항목 모서리 반경          |
| `side.avatar.size`           | `48px`      | 아바타/로고 크기               |
| `side.avatar.border-radius`  | `8px`       | 아바타 모서리 반경 (검토 필요) |
| `side.gap`                   | `(검토 필요)` | 메뉴 항목 간 간격             |
| `side.divider.margin`        | `(검토 필요)` | 구분선 상하 여백              |

### Typography

| Token                         | Role                    |
|-------------------------------|-------------------------|
| `side.typography.label`       | 메뉴 레이블 (기본)      |
| `side.typography.label.active`| 활성 메뉴 레이블        |

---

## 5. Interaction & Animation

### 5-1. 메뉴 선택

| Phase   | Animation           | Duration      | Easing      |
|---------|---------------------|---------------|-------------|
| Hover   | 배경색 전환          | `150ms`       | `ease-out`  |
| Active  | 배경색·아이콘 전환   | `200ms`       | `ease-out`  |

### 5-2. 상태 전환 동작

| 조건                      | 동작                                              |
|---------------------------|---------------------------------------------------|
| 메뉴 항목 클릭            | 해당 항목 `active` 전환, 이전 항목 `default` 복귀  |
| 마우스 hover              | `hover` 상태 배경 표시, 클릭 없으면 원복           |
| 페이지 이동 완료          | 라우팅된 페이지에 해당하는 메뉴 항목 `active` 유지 |
| 비활성(disabled) 항목 클릭| 동작 없음, 커서 `not-allowed`                     |

### 5-3. 스크롤 동작

| 조건                    | 동작                                  |
|-------------------------|---------------------------------------|
| 콘텐츠 영역 스크롤 시   | 사이드바 고정 (`position: fixed` 또는 sticky) |
| 메뉴 항목 수 초과 시    | 사이드바 내부 스크롤 (검토 필요)      |

---

## 6. Positioning

| Position Key | 설명              | 권장 사용처              |
|--------------|-------------------|--------------------------|
| `left`       | 화면 좌측 고정    | PC 웹 기본 레이아웃       |

> 이 컴포넌트는 PC 웹 전용 좌측 고정 내비게이션입니다. 모바일/태블릿 뷰에서는 별도 패턴(햄버거 메뉴, 바텀 탭 등)으로 대체하는 것을 권장합니다.

---

## 7. Content Guidelines

### 메뉴 레이블

- **원칙:** 기능을 명확하게 표현하는 명사형 또는 명사+동사형 조합.
- **길이:** 최대 2줄 이내. 한 줄 권장 (예: `홈`, `현장 관리`). 불가피한 경우 2줄 허용 (예: `프로젝트 / 설정`).
- **어조:** 명사형, 간결체.

| ✅ Good        | ��� Bad                      |
|----------------|-----------------------------|
| 홈             | 홈 화면으로 이동            |
| 현장 관리      | 현장을 관리하는 메뉴        |
| 위험 알림      | 위험한 상황 알림 및 경고    |
| SOP 관리       | 표준작업절차서 관리 메뉴    |

### 메뉴 아이콘

- 각 메뉴 항목은 반드시 아이콘을 포함해야 합니다.
- 아이콘은 레이블과 1:1 대응되어 의미를 강화해야 합니다.
- 활성 상태에서는 아이콘 색상이 흰색으로 전환됩니다.

| 메뉴          | 아이콘 (현재)       |
|---------------|---------------------|
| 홈            | 집(house) 아이콘    |
| 현장 관리     | 카메라 아이콘       |
| 위험 알림     | 경보(bell/alarm) 아이콘 |
| 비계 점검     | 체크(check) 아이콘  |
| SOP 관리      | 문서(document) 아이콘 |
| 프로젝트 설정 | 설정(gear) 아이콘   |

---

## 8. Accessibility

| 항목             | 규격                                                       |
|------------------|------------------------------------------------------------|
| ARIA Role        | `role="navigation"` (사이드바 전체)                        |
| ARIA Label       | `aria-label="주요 내비게이션"`                             |
| Active 항목      | `aria-current="page"`                                      |
| 키보드 탐색      | `Tab` 으로 메뉴 항목 순차 이동, `Enter`/`Space` 로 선택    |
| Focus Indicator  | 포커스 링 표시 (outline 제거 금지)                         |
| 아이콘 레이블    | 아이콘에 `aria-hidden="true"`, 텍스트 레이블 필수 병기     |
| 고대비 모드      | 배경-텍스트 명도 대비 4.5:1 이상 (활성 항목 포함)         |

---

## 9. Platform Notes

| Platform | 특이사항                                                              |
|----------|-----------------------------------------------------------------------|
| Web (PC) | 좌측 고정. 콘텐츠 영역은 사이드바 너비(72px)만큼 margin-left 확보.  |
| 태블릿   | 별도 반응형 처리 필요. 아이콘 전용 축소 표시 또는 오버레이 방식 권장. |
| 모바일   | 이 컴포넌트 사용 불가. 바텀 탭 바 또는 햄버거 메뉴로 대체.          |

---

## 10. Developer API (Reference)

ts
interface SideNavItem {
  id: string;
  label: string;           // 메뉴 레이블 (최대 2줄)
  icon: React.ReactNode;   // 아이콘 컴포넌트
  href: string;            // 라우팅 경로
  disabled?: boolean;      // 기본값 false
}

interface SideNavigationProps {
  items: SideNavItem[];          // 메뉴 항목 배열
  activeId: string;              // 현재 활성 메뉴 ID
  onItemClick: (id: string) => void;
  topItems?: SideNavItem[];      // 상단 고정 항목 (프로젝트, 회사 관리)
  avatarSrc?: string;            // 아바타/로고 이미지 URL
}

// 사용 예시
<SideNavigation
  items={menuItems}
  activeId="danger-alert"
  onItemClick={(id) => router.push(id)}
/>


---

## 11. Changelog

| Date       | Version | Description              | Author |
|------------|---------|--------------------------|--------|
| 2026-06-14 | 0.1.0   | 초안 작성 (구조 분석 기반) | —      |

---

## Related

- [ ] [List Item Component](./list-item.md) — 내부 `list` 인스턴스 명세
- [ ] [Navigation Guidelines](./navigation-guidelines.md)
- [ ] [Layout Guidelines](./layout-guidelines.md) — 사이드바 포함 전체 레이아웃 규칙
- [ ] [Icon Library](./icon-library.md) — 사용 아이콘 목록
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
