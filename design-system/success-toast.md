# Success Toast

> **Figma:** [성공 → Component](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-07  
> **Owner:** Design System Team

---

## 1. Overview

사용자의 액션이 성공적으로 완료되었음을 알리는 인라인 피드백 컴포넌트.  
체크 아이콘과 결과 메시지를 함께 표시하며, 화면 흐름을 방해하지 않는 비침습적 알림 형태로 사용된다.

---

## 2. Anatomy


┌───────────────────────────────────────┐
│  [✓ Icon]  비밀번호 변경 완료          │
└───────────────────────────────────────┘


| # | Element | Required | Figma Layer Name |
|---|---------|----------|------------------|
| 1 | Check Icon | ✅ | `check` |
| 2 | Message | ✅ | `비밀번호 변경 완료` |

---

## 3. Variants

| Variant | 용도 | Icon | Figma Variant Key |
|---------|------|------|-------------------|
| `success` | 작업 성공 확인 | ✅ check | `type=success` |
| `error` | 실패 또는 오류 발생 | ❌ error | `type=error` (검토 필요) |
| `warning` | 주의가 필요한 상태 | ⚠️ warning | `type=warning` (검토 필요) |
| `info` | 참고용 시스템 정보 | ℹ️ info | `type=info` (검토 필요) |

---

## 4. Design Tokens

### Color

| Token | Variant | Role |
|-------|---------|------|
| `color.success-toast.background` | success | 배경 (흰색 계열, 연보라 테두리) |
| `color.success-toast.border` | success | 테두리 (보라/인디고 계열) |
| `color.success-toast.icon.background` | success | 아이콘 배경 (진한 보라/인디고) |
| `color.success-toast.icon.check` | success | 체크 아이콘 색상 (흰색) |
| `color.success-toast.label` | success | 메시지 텍스트 (다크 그레이) |

### Spacing & Shape

| Token | Value (예시) | Role |
|-------|-------------|------|
| `success-toast.padding.vertical` | `12px` | 상하 내부 여백 |
| `success-toast.padding.horizontal` | `20px` | 좌우 내부 여백 |
| `success-toast.gap` | `8px` | 아이콘-텍스트 간격 |
| `success-toast.border-radius` | `100px` | 모서리 반경 (완전 pill 형태) |
| `success-toast.border-width` | `1.5px` | 테두리 두께 |
| `success-toast.width` | `238px` | 컴포넌트 너비 |
| `success-toast.height` | `46px` | 컴포넌트 높이 |
| `success-toast.icon.size` | `20px` | 아이콘 전체 크기 |
| `success-toast.icon.inner-size` | `18px` | 아이콘 내부 프레임 크기 |

### Typography

| Token | Role |
|-------|------|
| `success-toast.typography.label` | 메시지 텍스트 (한글, 다크 계열) |

---

## 5. Interaction & Animation

### 5-1. 등장 / 퇴장

| Phase | Animation | Duration | Easing |
|-------|-----------|----------|--------|
| Enter | Fade In | `200ms` | `ease-out` |
| Visible | — | `3000ms` | — |
| Exit | Fade Out | `200ms` | `ease-in` |

> **총 생명 주기:** Enter(200ms) → Visible(3000ms) → Exit(200ms) = **3400ms**

### 5-2. 타이머 동작

| 조건 | 동작 |
|------|------|
| 기본 | 노출 3초 후 자동 퇴장 |
| 마우스 hover (웹) | 타이머 일시 정지, hover 해제 시 재개 |
| 수동 닫기 | 즉시 퇴장 (닫기 버튼 존재 시) |

### 5-3. 스택 동작

| 조건 | 동작 |
|------|------|
| 신규 토스트 진입 시 기존 토스트 존재 | 기존 토스트 위에 쌓임 (stack) |
| 최대 동시 노출 수 초과 | 가장 오래된 토스트 즉시 퇴장 후 신규 진입 |
| 권장 최대 동시 노출 수 | `3개` |

---

## 6. Positioning

| Position Key | 설명 | 권장 사용처 |
|--------------|------|------------|
| `top-center` | 상단 중앙 | 글로벌 알림 |
| `top-right` | 상단 우측 | 시스템/서비스 알림 |
| `bottom-center` | 하단 중앙 | 모바일 기본 |
| `bottom-right` | 하단 우측 | 데스크탑 기본 |

> 프로젝트 내 포지션은 하나로 통일하는 것을 권장. 혼용 금지.

---

## 7. Content Guidelines

### 메시지 텍스트

- **원칙:** 무슨 일이 완료되었는지 1문장으로 명확하게.
- **길이:** 최대 2줄 이내 (약 20자 내외 권장). 초과 시 ellipsis 처리.
- **어조:** 능동태 또는 완료형, 간결체. 마침표 생략 가능.

| ✅ Good | ❌ Bad |
|---------|--------|
| 비밀번호 변경 완료 | 비밀번호가 성공적으로 변경 처리되었습니다 |
| 저장했습니다 | OK |
| 링크를 복사했습니다 | 오류가 발생했습니다. 잠시 후 다시 시도해주세요. |

### 아이콘

- 성공 컴포넌트는 항상 체크 아이콘을 표시.
- 아이콘은 pill 컨테이너 좌측에 고정 배치.
- 아이콘 배경색은 `success-toast.icon.background` 토큰 사용.

---

## 8. Accessibility

| 항목 | 규격 |
|------|------|
| ARIA Role | `role="status"` |
| Live Region | `aria-live="polite"` |
| Focus | 토스트 자체는 포커스 받지 않음 |
| 아이콘 | `aria-hidden="true"` (장식용 아이콘) |
| 고대비 모드 | 배경-텍스트 명도 대비 4.5:1 이상 |

---

## 9. Platform Notes

| Platform | 특이사항 |
|----------|----------|
| Web | hover 시 타이머 일시정지 적용 |
| iOS | Safe Area Inset 고려 (bottom position) |
| Android | System navigation bar 영역 침범 금지 |

---

## 10. Developer API (Reference)

ts
showSuccessToast({
  message: string,           // 필수. 최대 20자 권장 (예: '비밀번호 변경 완료')
  duration?: number,         // ms, 기본값 3000
  position?: ToastPosition,  // 기본값은 프로젝트 전역 설정 따름
})

// 또는 범용 Toast API 사용 시
showToast({
  variant: 'success',
  message: string,
  duration?: number,
  position?: ToastPosition,
})


---

## 11. Changelog

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-07 | 0.1.0 | 초안 작성 (성공 토스트, pill 형태, 체크 아이콘) | — |

---

## Related

- [ ] [Error Toast](./error-toast.md) — 작성 예정
- [ ] [Warning Toast](./warning-toast.md) — 작성 예정
- [ ] [Toast Edge Cases](./toast-edge-cases.md) — 작성 예정
- [ ] [Motion Guidelines](./motion-guidelines.md)
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
