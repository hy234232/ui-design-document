# Toast Notification

> **Figma:** [Toast / Notification → Component](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-01  
> **Owner:** Design System Team

---

## 1. Overview

사용자 액션의 결과 또는 시스템 상태를 비침습적으로 알리는 일시적 피드백 컴포넌트.  
화면 흐름을 방해하지 않으며, 자동으로 사라진다.

---

## 2. Anatomy

```
┌──────────────────────────────────────────┐
│  [Icon]  Message text            [Action] │
└──────────────────────────────────────────┘
```

| # | Element   | Required | Figma Layer Name     |
|---|-----------|----------|----------------------|
| 1 | Icon      | 조건부    | `icon`               |
| 2 | Message   | ✅       | `label`              |
| 3 | Action    | 선택      | `action`             |

---

## 3. Variants

| Variant     | 용도                             | Icon           | Figma Variant Key         |
|-------------|----------------------------------|----------------|---------------------------|
| `default`   | 일반 정보, 중립적 피드백          | 없음           | `type=default`            |
| `success`   | 작업 성공 확인                   | ✅ check       | `type=success`            |
| `warning`   | 주의가 필요한 상태               | ⚠️ warning     | `type=warning`            |
| `error`     | 실패 또는 오류 발생              | ❌ error       | `type=error`              |
| `info`      | 참고용 시스템 정보               | ℹ️ info        | `type=info`               |

---

## 4. Design Tokens

### Color

| Token                              | Variant   | Role             |
|------------------------------------|-----------|------------------|
| `color.toast.default.background`   | default   | 배경             |
| `color.toast.default.label`        | default   | 텍스트           |
| `color.toast.success.background`   | success   | 배경             |
| `color.toast.success.label`        | success   | 텍스트           |
| `color.toast.warning.background`   | warning   | 배경             |
| `color.toast.warning.label`        | warning   | 텍스트           |
| `color.toast.error.background`     | error     | 배경             |
| `color.toast.error.label`          | error     | 텍스트           |
| `color.toast.info.background`      | info      | 배경             |
| `color.toast.info.label`           | info      | 텍스트           |

### Spacing & Shape

| Token                        | Value (예시)  | Role               |
|------------------------------|---------------|--------------------|
| `toast.padding.vertical`     | `12px`        | 상하 내부 여백     |
| `toast.padding.horizontal`   | `16px`        | 좌우 내부 여백     |
| `toast.gap`                  | `8px`         | 아이콘-텍스트 간격 |
| `toast.border-radius`        | `8px`         | 모서리 반경        |
| `toast.min-width`            | `240px`       | 최소 너비          |
| `toast.max-width`            | `480px`       | 최대 너비          |
| `toast.elevation`            | `shadow/md`   | 그림자 토큰        |

### Typography

| Token                   | Role        |
|-------------------------|-------------|
| `toast.typography.label`  | 메시지 텍스트 |
| `toast.typography.action` | 액션 버튼   |

---

## 5. Interaction & Animation

### 5-1. 등장 / 퇴장

| Phase    | Animation    | Duration | Easing              |
|----------|--------------|----------|---------------------|
| Enter    | Fade In      | `200ms`  | `ease-out`          |
| Visible  | —            | `3000ms` | —                   |
| Exit     | Fade Out     | `200ms`  | `ease-in`           |

> **총 생명 주기:** Enter(200ms) → Visible(3000ms) → Exit(200ms) = **3400ms**

### 5-2. 타이머 동작

| 조건                           | 동작                              |
|--------------------------------|-----------------------------------|
| 기본                           | 노출 3초 후 자동 퇴장             |
| 마우스 hover (웹)              | 타이머 일시 정지, hover 해제 시 재개 |
| Action 버튼 클릭               | 즉시 퇴장                         |
| 수동 닫기 (X 버튼 존재 시)     | 즉시 퇴장                         |

### 5-3. 스택 동작

| 조건                               | 동작                                    |
|------------------------------------|-----------------------------------------|
| 신규 토스트 진입 시 기존 토스트 존재 | 기존 토스트 위에 쌓임 (stack)           |
| 최대 동시 노출 수 초과             | 가장 오래된 토스트 즉시 퇴장 후 신규 진입 |
| 권장 최대 동시 노출 수             | `3개`                                   |

---

## 6. Positioning

| Position Key         | 설명                     | 권장 사용처         |
|----------------------|--------------------------|---------------------|
| `top-center`         | 상단 중앙                | 글로벌 알림         |
| `top-right`          | 상단 우측                | 시스템/서비스 알림  |
| `bottom-center`      | 하단 중앙                | 모바일 기본         |
| `bottom-right`       | 하단 우측                | 데스크탑 기본       |

> 프로젝트 내 포지션은 하나로 통일하는 것을 권장. 혼용 금지.

---

## 7. Content Guidelines

### 메시지 텍스트

- **원칙:** 무슨 일이 일어났는지 1문장으로 명확하게.
- **길이:** 최대 2줄 이내 (약 60자). 초과 시 ellipsis 처리.
- **어조:** 능동태, 간결체. 마침표 생략 가능.

| ✅ Good                        | ❌ Bad                                          |
|-------------------------------|------------------------------------------------|
| 저장했습니다                   | 데이터가 성공적으로 저장 처리되었습니다         |
| 파일을 삭제했습니다            | 오류가 발생했습니다. 잠시 후 다시 시도해주세요. |
| 링크를 복사했습니다            | OK                                             |

### Action 버튼

- 토스트 1개당 최대 **1개**.
- 레이블: 동사형, 2~4자 (예: `실행 취소`, `보기`, `다시 시도`).
- 실행 취소(undo) 패턴에 주로 사용.

---

## 8. Accessibility

| 항목             | 규격                                      |
|------------------|-------------------------------------------|
| ARIA Role        | `role="status"` (default/success/info)    |
|                  | `role="alert"` (warning/error)            |
| Live Region      | `aria-live="polite"` / `"assertive"`      |
| Focus            | 토스트 자체는 포커스 받지 않음            |
| Action 버튼      | 키보드 접근 가능, `Tab` 포커스 지원       |
| 고대비 모드      | 배경-텍스트 명도 대비 4.5:1 이상         |

---

## 9. Platform Notes

| Platform | 특이사항                                                   |
|----------|------------------------------------------------------------|
| Web      | hover 시 타이머 일시정지 적용                              |
| iOS      | Safe Area Inset 고려 (bottom position)                     |
| Android  | System navigation bar 영역 침범 금지                       |

---

## 10. Developer API (Reference)

```ts
showToast({
  variant: 'success' | 'error' | 'warning' | 'info' | 'default',
  message: string,           // 필수. 최대 60자 권장
  action?: {
    label: string,
    onClick: () => void,
  },
  duration?: number,         // ms, 기본값 3000
  position?: ToastPosition,  // 기본값은 프로젝트 전역 설정 따름
})
```

---

## 11. Changelog

| Date       | Version | Description                        | Author |
|------------|---------|------------------------------------|--------|
| 2026-06-01 | 0.1.0   | 초안 작성 (fade in/out, 3s 기본)    | —      |

---

## Related

- [ ] [Error Cases](./toast-error-cases.md) — 작성 예정
- [ ] [Edge Cases](./toast-edge-cases.md) — 작성 예정
- [ ] [Motion Guidelines](./motion-guidelines.md)
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
