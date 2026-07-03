# 성공 (Success Notification)

## Component Preview

![성공 캡쳐 이미지](preview.png)


> **Figma:** [조달과제 건축현장안전관리 → PC웹 → 성공](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-14  
> **Owner:** Design System Team

---

## 1. Overview

사용자 액션의 성공 결과를 비침습적으로 알리는 인라인 피드백 컴포넌트.  
체크 아이콘과 메시지 텍스트로 구성되며, 권한 변경·저장·완료 등 성공 상태를 명확하게 전달한다.  
화면 흐름을 방해하지 않으며, 일시적으로 노출된다.

---

## 2. Anatomy


┌──────────────────────────────────────────┐
│  [✓ Icon]  성공 메시지 텍스트             │
└──────────────────────────────────────────┘


| # | Element  | Required | Figma Layer Name           |
|---|----------|----------|----------------------------|
| 1 | Icon     | ✅       | `check`                    |
| 2 | Message  | ✅       | `권한 변경 완료` (TEXT)     |

> **크기:** 211×46px  
> **아이콘:** 20×20px 원형 체크 아이콘 (진한 남색/남보라 배경 + 흰색 체크)  
> **컨테이너:** 둥근 모서리(pill 형태), 흰색 배경, 연보라 계열 테두리

---

## 3. Variants

| Variant     | 용도                        | Icon              | Figma Variant Key   |
|-------------|----------------------------|-------------------|---------------------|
| `success`   | 작업 성공 확인 (현재 컴포넌트) | ✅ check (남보라) | `type=success`      |
| `error`     | 실패 또는 오류 발생          | ❌ error          | `type=error`        |
| `warning`   | 주의가 필요한 상태           | ⚠️ warning        | `type=warning`      |
| `info`      | 참고용 시스템 정보           | ℹ️ info           | `type=info`         |
| `default`   | 일반 중립 피드백             | 없음              | `type=default`      |

> 현재 수집된 컴포넌트는 `success` 단일 Variant. 나머지 Variant는 **(검토 필요)**.

---

## 4. Design Tokens

### Color

| Token                                    | Variant   | Role                  | 추정값 (스크린샷 기준)     |
|------------------------------------------|-----------|-----------------------|----------------------------|
| `color.success.background`               | success   | 컨테이너 배경          | `#FFFFFF`                  |
| `color.success.border`                   | success   | 컨테이너 테두리        | `#8B8FE8` (연보라)         |
| `color.success.label`                    | success   | 메시지 텍스트          | `#1A1A1A` (거의 검정)      |
| `color.success.icon.background`          | success   | 아이콘 원형 배경       | `#3730D4` (진한 남보라)    |
| `color.success.icon.check`               | success   | 체크 아이콘 색         | `#FFFFFF`                  |
| `color.error.background`                 | error     | 컨테이너 배경          | (검토 필요)                |
| `color.error.border`                     | error     | 컨테이너 테두리        | (검토 필요)                |
| `color.error.label`                      | error     | 메시지 텍스트          | (검토 필요)                |
| `color.warning.background`               | warning   | 컨테이너 배경          | (검토 필요)                |
| `color.warning.label`                    | warning   | 메시지 텍스트          | (검토 필요)                |
| `color.info.background`                  | info      | 컨테이너 배경          | (검토 필요)                |
| `color.info.label`                       | info      | 메시지 텍스트          | (검토 필요)                |

### Spacing & Shape

| Token                            | Value         | Role                   |
|----------------------------------|---------------|------------------------|
| `success.width`                  | `211px`       | 컴포넌트 너비          |
| `success.height`                 | `46px`        | 컴포넌트 높이          |
| `success.padding.vertical`       | `12px`        | 상하 내부 여백 (추정)  |
| `success.padding.horizontal`     | `16px`        | 좌우 내부 여백 (추정)  |
| `success.gap`                    | `8px`         | 아이콘-텍스트 간격 (추정) |
| `success.border-radius`          | `100px`       | 모서리 반경 (pill 형태) |
| `success.border-width`           | `1px`         | 테두리 두께 (추정)     |
| `success.icon.size`              | `20×20px`     | 아이콘 크기            |
| `success.icon.inner-frame`       | `18×18px`     | 아이콘 내부 프레임     |
| `success.icon.vector`            | `8×5px`       | 체크 벡터 크기         |
| `success.elevation`              | `none`        | 그림자 (없음, 추정)    |

### Typography

| Token                          | Role             | 추정값                    |
|--------------------------------|------------------|---------------------------|
| `success.typography.label`     | 메시지 텍스트    | 16px, Medium, `#1A1A1A`   |

> 텍스트 레이어 크기: 89×22px. 폰트 크기·굵기는 **(검토 필요)**.

---

## 5. Interaction & Animation

### 5-1. 등장 / 퇴장

| Phase    | Animation   | Duration | Easing     |
|----------|-------------|----------|------------|
| Enter    | Fade In     | `200ms`  | `ease-out` |
| Visible  | —           | `3000ms` | —          |
| Exit     | Fade Out    | `200ms`  | `ease-in`  |

> **총 생명 주기:** Enter(200ms) → Visible(3000ms) → Exit(200ms) = **3400ms**  
> 구체적인 지속 시간은 **(검토 필요)**.

### 5-2. 타이머 동작

| 조건                       | 동작                                   |
|----------------------------|----------------------------------------|
| 기본                       | 노출 3초 후 자동 퇴장                  |
| 마우스 hover (웹)          | 타이머 일시 정지, hover 해제 시 재개   |
| 수동 닫기 버튼 (존재 시)   | 즉시 퇴장                              |

> 현재 컴포넌트에 닫기 버튼 없음. 자동 퇴장 전용으로 판단. **(검토 필요)**

### 5-3. 스택 동작

| 조건                                  | 동작                                        |
|---------------------------------------|---------------------------------------------|
| 신규 알림 진입 시 기존 알림 존재       | 기존 알림 위에 쌓임 (stack)                 |
| 최대 동시 노출 수 초과                | 가장 오래된 알림 즉시 퇴장 후 신규 진입     |
| 권장 최대 동시 노출 수                | `3개` (검토 필요)                           |

---

## 6. Positioning

| Position Key    | 설명         | 권장 사용처          |
|-----------------|--------------|----------------------|
| `top-center`    | 상단 중앙    | 글로벌 알림          |
| `top-right`     | 상단 우측    | 시스템/서비스 알림   |
| `bottom-center` | 하단 중앙    | 모바일 기본          |
| `bottom-right`  | 하단 우측    | 데스크탑 기본        |

> 프로젝트 내 포지션은 하나로 통일하는 것을 권장. 혼용 금지.  
> PC웹(조달과제 건축현장안전관리) 기준 포지션은 **(검토 필요)**.

---

## 7. Content Guidelines

### 메시지 텍스트

- **원칙:** 무슨 일이 완료되었는지 1문장으로 명확하게.
- **길이:** 최대 2줄 이내 (약 60자). 초과 시 ellipsis 처리.
- **어조:** 능동태, 간결체. 완료형 서술. 마침표 생략 가능.

| ✅ Good              | ❌ Bad                                           |
|----------------------|--------------------------------------------------|
| 권한 변경 완료        | 권한이 성공적으로 변경 처리되었습니다             |
| 저장했습니다          | 데이터 저장 작업이 완료되었습니다                 |
| 파일을 삭제했습니다   | 오류가 발생했습니다. 잠시 후 다시 시도해주세요.  |

### 아이콘

- success 타입에는 반드시 체크(✓) 아이콘 사용.
- 아이콘 배경색은 `color.success.icon.background` 토큰 준수.
- 아이콘 제거 금지 (Required).

---

## 8. Accessibility

| 항목          | 규격                                          |
|---------------|-----------------------------------------------|
| ARIA Role     | `role="status"` (success/info/default)        |
|               | `role="alert"` (warning/error)                |
| Live Region   | `aria-live="polite"` (success)                |
| Focus         | 알림 자체는 포커스 받지 않음                  |
| 아이콘        | `aria-hidden="true"` 처리, 의미는 텍스트로 전달 |
| 고대비 모드   | 배경-텍스트 명도 대비 4.5:1 이상             |

---

## 9. Platform Notes

| Platform | 특이사항                                                    |
|----------|-------------------------------------------------------------|
| Web      | hover 시 타이머 일시정지 적용. PC웹 기준 컴포넌트.          |
| iOS      | Safe Area Inset 고려 (bottom position 사용 시)              |
| Android  | System navigation bar 영역 침범 금지                        |

> 현재 컴포넌트는 **PC웹** 페이지 소속. 모바일 스펙은 **(검토 필요)**.

---

## 10. Developer API (Reference)

ts
showSuccessNotification({
  message: string,         // 필수. 최대 60자 권장. 예: '권한 변경 완료'
  duration?: number,       // ms, 기본값 3000
  position?: NotificationPosition, // 기본값은 프로젝트 전역 설정 따름
})

// 범용 API 사용 시
showNotification({
  variant: 'success' | 'error' | 'warning' | 'info' | 'default',
  message: string,
  duration?: number,
  position?: NotificationPosition,
})


---

## 11. Changelog

| Date       | Version | Description                                      | Author |
|------------|---------|--------------------------------------------------|--------|
| 2026-06-14 | 0.1.0   | 초안 작성 (성공 Variant, PC웹 기준, 레이어 분석) | —      |

---

## Related

- [ ] [Error Notification](./error-notification.md) — 작성 예정
- [ ] [Warning Notification](./warning-notification.md) — 작성 예정
- [ ] [Info Notification](./info-notification.md) — 작성 예정
- [ ] [Motion Guidelines](./motion-guidelines.md)
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
