# Button (L) H:44

> **Figma:** [조달과제 건축현장안전관리 / PC웹 → button (L) H:44](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-14  
> **Owner:** Design System Team

---

## 1. Overview

사용자가 명시적 액션을 실행할 때 사용하는 대형(L) 버튼 컴포넌트.  
높이 44px의 고정 스펙으로, PC 웹 인터페이스의 주요 저장·제출 액션에 적용된다.  
좌우 아이콘 슬롯(plus)을 선택적으로 활성화할 수 있으며, 중앙 텍스트 레이블과 조합된다.

---

## 2. Anatomy


┌─────────────────────────────────────────────┐
│  [Left Icon]   레이블 텍스트   [Right Icon]  │
└─────────────────────────────────────────────┘


| # | Element      | Required | Figma Layer Name        |
|---|--------------|----------|-------------------------|
| 1 | Left Icon    | 선택      | `plus` (첫 번째 인스턴스) |
| 2 | Label        | ✅        | (TEXT) `저장`           |
| 3 | Right Icon   | 선택      | `plus` (두 번째 인스턴스) |

---

## 3. Variants

| Variant     | 용도                          | Icon                  | Figma Variant Key          |
|-------------|-------------------------------|-----------------------|----------------------------|
| `primary`   | 주요 저장·제출 액션 (기본)     | 선택 (plus 아이콘)     | `type=primary` (검토 필요) |
| `secondary` | 보조 액션                     | 선택 (plus 아이콘)     | `type=secondary` (검토 필요) |
| `disabled`  | 비활성 상태                   | 선택 (plus 아이콘)     | `state=disabled` (검토 필요) |

> 현재 수집된 Variant 정의가 없음. 스크린샷 기준 `primary` 스타일(보라/남색 배경, 흰색 텍스트)이 기본 상태로 추정.

---

## 4. Design Tokens

### Color

| Token                                  | Variant   | Role       |
|----------------------------------------|-----------|------------|
| `color.button.primary.background`      | primary   | 배경       |
| `color.button.primary.label`           | primary   | 텍스트     |
| `color.button.primary.icon`            | primary   | 아이콘     |
| `color.button.primary.border`          | primary   | 테두리     |
| `color.button.secondary.background`    | secondary | 배경       |
| `color.button.secondary.label`         | secondary | 텍스트     |
| `color.button.secondary.icon`          | secondary | 아이콘     |
| `color.button.secondary.border`        | secondary | 테두리     |
| `color.button.disabled.background`     | disabled  | 배경       |
| `color.button.disabled.label`          | disabled  | 텍스트     |

> 스크린샷 기준 배경색: 약 `#3300CC` 계열 보라/남색, 텍스트: `#FFFFFF` 흰색.

### Spacing & Shape

| Token                          | Value       | Role                   |
|--------------------------------|-------------|------------------------|
| `button.l.height`              | `44px`      | 고정 높이              |
| `button.l.width`               | `160px`     | 기본 너비              |
| `button.l.padding.vertical`    | `11px`      | 상하 내부 여백 (추정)  |
| `button.l.padding.horizontal`  | `16px`      | 좌우 내부 여백 (추정)  |
| `button.l.gap`                 | `8px`       | 아이콘-텍스트 간격 (추정) |
| `button.l.border-radius`       | `8px`       | 모서리 반경 (추정)     |
| `button.l.icon-size`           | `24x24px`   | 아이콘 크기            |

### Typography

| Token                        | Role             |
|------------------------------|------------------|
| `button.l.typography.label`  | 버튼 레이블 텍스트 |

> 스크린샷 기준 텍스트 크기: 약 14–16px, 굵기: Medium 또는 SemiBold (검토 필요).

---

## 5. Interaction & Animation

### 5-1. 상태 전환

| Phase    | Animation          | Duration | Easing     |
|----------|--------------------|----------|------------|
| Hover    | Background tint    | `150ms`  | `ease-out` |
| Pressed  | Background darken  | `100ms`  | `ease-in`  |
| Focus    | Focus ring 표시    | `100ms`  | `ease-out` |
| Disabled | Opacity 감소       | —        | —          |

### 5-2. 상태별 동작

| 조건                    | 동작                                      |
|-------------------------|-------------------------------------------|
| 기본 (default)          | primary 스타일로 클릭 가능                |
| Hover (웹)              | 배경색 밝아지거나 어두워지는 피드백       |
| Pressed / Active        | 배경색 눌림 피드백                        |
| Disabled                | 클릭 불가, 커서 `not-allowed`            |
| Loading (검토 필요)     | 레이블 대신 스피너 또는 아이콘 전환       |

### 5-3. 아이콘 슬롯 동작

| 조건                    | 동작                                           |
|-------------------------|------------------------------------------------|
| Left Icon만 사용        | 좌측 `plus` 인스턴스 visible, 우측 hidden      |
| Right Icon만 사용       | 우측 `plus` 인스턴스 visible, 좌측 hidden      |
| 양쪽 아이콘 없음        | 텍스트만 중앙 정렬                             |
| 양쪽 아이콘 모두 사용   | 텍스트 중앙, 아이콘 좌우 배치                  |

---

## 6. Sizing

| Size Key | Height | 최소 너비 | 용도                      |
|----------|--------|-----------|---------------------------|
| `L`      | `44px` | `160px`   | PC 웹 주요 CTA 버튼 (현재) |

> 현재 수집된 컴포넌트는 L 사이즈 단일 스펙. 다른 사이즈(M, S)는 별도 컴포넌트로 관리.

---

## 7. Content Guidelines

### 레이블 텍스트

- **원칙:** 버튼이 실행하는 액션을 동사형 1어구로 명확하게.
- **길이:** 최대 8자 이내 권장. 초과 시 레이아웃 깨짐 주의.
- **어조:** 능동태, 간결체. 마침표 생략.

| ✅ Good         | ❌ Bad                         |
|----------------|--------------------------------|
| 저장           | 데이터를 저장하시겠습니까?     |
| 확인           | OK                             |
| 제출하기       | 클릭하여 제출                  |
| 다음           | 다음 단계로 이동               |

### 아이콘 사용

- 아이콘은 레이블의 의미를 보완할 때만 사용.
- `plus` 아이콘: 추가·생성 액션에 적합. 저장 액션에는 저장 아이콘으로 교체 검토.
- 아이콘만 단독 사용 금지 (레이블 필수).

---

## 8. Accessibility

| 항목             | 규격                                          |
|------------------|-----------------------------------------------|
| Role             | `role="button"` 또는 `<button>` 네이티브 요소 |
| Label            | 텍스트 레이블이 곧 접근성 레이블              |
| Focus            | 키보드 `Tab` 포커스 지원, 포커스 링 visible   |
| Disabled         | `disabled` 속성 또는 `aria-disabled="true"`  |
| 고대비 모드      | 배경-텍스트 명도 대비 4.5:1 이상             |
| 터치 영역        | 최소 44×44px (현재 스펙 충족)                 |

---

## 9. Platform Notes

| Platform | 특이사항                                                        |
|----------|-----------------------------------------------------------------|
| Web      | hover 상태 스타일 적용, `cursor: pointer`                       |
| iOS      | 네이티브 버튼 또는 커스텀 컴포넌트로 구현, Safe Area 고려       |
| Android  | Material 버튼 대비 커스텀 스타일 적용, ripple 효과 검토 필요    |

---

## 10. Developer API (Reference)

ts
<Button
  size="L"                         // 'L' | 'M' | 'S' (현재 L만 정의)
  variant="primary"               // 'primary' | 'secondary' | 'disabled'
  label="저장"                    // 필수. 최대 8자 권장
  leftIcon?: IconName             // 선택. 예: 'plus'
  rightIcon?: IconName            // 선택. 예: 'plus'
  disabled?: boolean              // 기본값: false
  onClick: () => void             // 필수 (disabled 시 무시)
/>


---

## 11. Changelog

| Date       | Version | Description                                   | Author |
|------------|---------|-----------------------------------------------|--------|
| 2026-06-14 | 0.1.0   | 초안 작성 (L 사이즈, primary 기본 스타일 기준) | —      |

---

## Related

- [ ] [Button M / S Sizes](./button-m-s.md) — 작성 예정
- [ ] [Button States](./button-states.md) — 작성 예정
- [ ] [Icon Guidelines](./icon-guidelines.md) — 작성 예정
- [ ] [Color Tokens](./color-tokens.md) — 작성 예정
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
