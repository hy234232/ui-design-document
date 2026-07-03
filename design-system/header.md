# Header

## Component Preview

![header 캡쳐 이미지](preview.png)


> **Figma:** [조달과제 건축현장안전관리 / PC웹 → header](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-14  
> **Owner:** Design System Team

---

## 1. Overview

페이지 최상단에 위치하는 헤더 컴포넌트. 현재 페이지의 제목(타이틀)을 표시하며, 우측에는 액션 영역(버튼 그룹 등)을 배치할 수 있는 레이아웃을 제공한다.  
건축현장 안전관리 시스템의 PC웹 환경에서 사용되며, 너비 1208px 전체를 차지하는 풀-위드 레이아웃이다.

---

## 2. Anatomy


┌────────────────────────────────────────────────────────────────────┐
│  [Page Title]                                        [Action Area] │
└────────────────────────────────────────────────────────────────────┘


| # | Element      | Required | Figma Layer Name           |
|---|--------------|----------|----------------------------|
| 1 | Page Title   | ✅       | `위험 알림 목록` (TEXT)     |
| 2 | Action Area  | 선택      | `Frame 1707486445`         |
| 3 | Wrapper Frame| ✅       | `Frame 1707486508`         |

---

## 3. Variants

> 현재 수집된 Variant 정의 없음. 단일 인스턴스로 사용됨. 추후 확장 시 아래 항목 검토 필요.

| Variant       | 용도                              | Figma Variant Key         |
|---------------|-----------------------------------|---------------------------|
| `default`     | 기본 페이지 헤더                  | (검토 필요)               |

---

## 4. Design Tokens

### Color

| Token                               | Role             |
|-------------------------------------|------------------|
| `color.header.background`           | 헤더 배경색      |
| `color.header.title.text`           | 타이틀 텍스트 색 |
| `color.header.border.bottom`        | 하단 구분선 색   |

### Spacing & Shape

| Token                          | Value (예시)  | Role                     |
|--------------------------------|---------------|--------------------------|
| `header.height`                | `80px`        | 헤더 전체 높이           |
| `header.padding.vertical`      | `18px`        | 상하 내부 여백           |
| `header.padding.horizontal`    | `28px`        | 좌우 내부 여백           |
| `header.inner.width`           | `1152px`      | 내부 콘텐츠 최대 너비    |
| `header.inner.height`          | `44px`        | 내부 콘텐츠 높이         |
| `header.action-area.width`     | `160px`       | 우측 액션 영역 너비      |
| `header.gap`                   | `8px`         | 타이틀-액션 영역 간격    |

### Typography

| Token                        | Role             | 예시 값                     |
|------------------------------|------------------|-----------------------------|
| `header.typography.title`    | 페이지 타이틀    | `Bold / 20–22px / #1A2B4A` |

> 스크린샷 기준: 타이틀 텍스트는 짙은 네이비 계열 색상, Bold 웨이트, 약 20–22px로 추정됨.

---

## 5. Interaction & Animation

### 5-1. 상태 전환

| Phase      | Animation  | Duration | Easing     |
|------------|------------|----------|------------|
| Mount      | 없음 (즉시 노출) | `0ms` | —      |
| Scroll     | 고정(Fixed) 유지 또는 페이지 흐름에 따름 | — | — |

> 헤더는 정적 레이아웃 컴포넌트로, 별도 진입/퇴장 애니메이션 없음. sticky/fixed 여부는 페이지 레이아웃 정책에 따름.

### 5-2. 스크롤 동작

| 조건              | 동작                                      |
|-------------------|-------------------------------------------|
| 페이지 스크롤     | `position: sticky; top: 0` 적용 권장      |
| 스크롤 시 그림자  | `header.elevation` 토큰 활성화 (검토 필요) |

---

## 6. Positioning

| Position Key  | 설명                     | 권장 사용처              |
|---------------|--------------------------|--------------------------|
| `top`         | 페이지 최상단 고정        | PC웹 전 페이지 공통 헤더 |

> 헤더는 항상 페이지 최상단에 단 1개만 배치한다. 중첩 배치 금지.

---

## 7. Content Guidelines

### 페이지 타이틀

- **원칙:** 현재 페이지 또는 화면의 이름을 명확하게 표기.
- **길이:** 최대 1줄 (약 20자 이내 권장). 초과 시 ellipsis 처리.
- **어조:** 명사형 또는 명사구. 동사형 사용 자제.

| ✅ Good           | ❌ Bad                          |
|------------------|--------------------------------|
| 위험 알림 목록    | 위험한 알림들을 보여주는 페이지 |
| 현장 점검 이력    | 여기서 점검 이력을 확인하세요   |
| 작업자 관리       | 관리                            |

### Action Area

- 우측 액션 영역(160px)에는 버튼, 필터, 검색 등 페이지 주요 액션 배치 가능.
- 액션 최대 **2–3개** 이내 권장. 초과 시 더보기 메뉴(overflow menu)로 처리.

---

## 8. Accessibility

| 항목           | 규격                                              |
|----------------|---------------------------------------------------|
| HTML 태그      | `<header>` 랜드마크 태그 사용 권장               |
| ARIA Role      | `role="banner"` (페이지 레벨 헤더)               |
| Heading        | 타이틀 텍스트는 `<h1>` 또는 `aria-label` 적용    |
| Focus          | 헤더 자체는 포커스 받지 않음                      |
| 고대비 모드    | 배경-텍스트 명도 대비 4.5:1 이상                 |
| Skip Navigation| 헤더 상단에 "본문 바로가기" 링크 제공 권장       |

---

## 9. Platform Notes

| Platform | 특이사항                                                        |
|----------|-----------------------------------------------------------------|
| PC Web   | 1208px 기준 풀-위드 레이아웃. 내부 콘텐츠는 1152px로 제한.     |
| Tablet   | 브레이크포인트에 따른 너비 조정 필요 (검토 필요)                |
| Mobile   | 별도 모바일 헤더 컴포넌트 사용 권장 (이 컴포넌트는 PC 전용)    |

---

## 10. Developer API (Reference)

tsx
<Header
  title="위험 알림 목록"      // 필수. 페이지 타이틀
  actions?: ReactNode         // 선택. 우측 액션 영역 콘텐츠
  sticky?: boolean            // 선택. 기본값 true (sticky 고정)
/>


---

## 11. Changelog

| Date       | Version | Description           | Author |
|------------|---------|-----------------------|--------|
| 2026-06-14 | 0.1.0   | 초안 작성             | —      |

---

## Related

- [ ] [Layout Guidelines](./layout-guidelines.md) — 작성 예정
- [ ] [Navigation](./navigation.md) — 작성 예정
- [ ] [Breadcrumb](./breadcrumb.md) — 작성 예정
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
