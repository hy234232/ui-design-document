# Input 조합완료

> **Figma:** [조달과제 건축현장안전관리 / PC웹 → input-조합완료](figma://link/REPLACE_WITH_NODE_ID)  
> **Status:** `Draft` · **Last updated:** 2026-06-14  
> **Owner:** Design System Team

---

## 1. Overview

라벨(필수/선택 표시 포함)과 텍스트 필드를 수직으로 조합한 입력 컴포넌트.  
단일 줄 텍스트 입력에 사용되며, 필수 항목 표시(`*`)를 라벨 영역에 포함한다.  
조달 관련 행정 양식 등 구조화된 폼 화면에서 주로 사용한다.

---

## 2. Anatomy


┌──────────────────────────────────────────────┐
│  라벨 텍스트  *                               │
│ ┌────────────────────────────────────────┐   │
│ │  입력된 텍스트 또는 플레이스홀더        │   │
│ └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘


| # | Element         | Required | Figma Layer Name              |
|---|-----------------|----------|-------------------------------|
| 1 | Title 영역      | ✅       | `title`                       |
| 2 | 라벨 텍스트     | ✅       | `입력 항목(필수/선택)` > TEXT |
| 3 | 필수 표시(`*`)  | 조건부   | `입력 항목(필수/선택)` > `*`  |
| 4 | 텍스트 필드     | ✅       | `textfield`                   |
| 5 | 입력 텍스트     | 조건부   | `textfield` > TEXT            |

---

## 3. Variants

> 현재 수집된 Variant 정의 없음. 아래는 레이어 구조 및 스크린샷 분석 기반 추론.

| Variant      | 용도                          | 필수 표시 | Figma Variant Key            |
|--------------|-------------------------------|-----------|------------------------------|
| `filled`     | 값이 입력된 상태              | 조건부    | `state=filled` (검토 필요)   |
| `empty`      | 값이 없는 초기/플레이스홀더   | 조건부    | `state=empty` (검토 필요)    |
| `focused`    | 포커스 활성 상태              | 조건부    | `state=focused` (검토 필요)  |
| `disabled`   | 비활성화 상태                 | 조건부    | `state=disabled` (검토 필요) |
| `error`      | 유효성 검사 오류 상태         | 조건부    | `state=error` (검토 필요)    |

---

## 4. Design Tokens

### Color

| Token                                    | 상태      | Role                   |
|------------------------------------------|-----------|------------------------|
| `color.input.label.default`              | 기본      | 라벨 텍스트 색상       |
| `color.input.label.required`             | 필수      | 필수 표시(`*`) 색상    |
| `color.input.field.background.default`   | 기본      | 텍스트 필드 배경       |
| `color.input.field.background.focused`   | 포커스    | 포커스 시 배경         |
| `color.input.field.background.disabled`  | 비활성    | 비활성 배경            |
| `color.input.field.border.default`       | 기본      | 테두리 색상            |
| `color.input.field.border.focused`       | 포커스    | 포커스 시 테두리 색상  |
| `color.input.field.border.error`         | 오류      | 오류 시 테두리 색상    |
| `color.input.field.text.default`         | 기본      | 입력 텍스트 색상       |
| `color.input.field.text.placeholder`     | 플레이스홀더 | 플레이스홀더 텍스트 색상 |
| `color.input.field.text.disabled`        | 비활성    | 비활성 텍스트 색상     |

### Spacing & Shape

| Token                          | Value (예시)  | Role                         |
|--------------------------------|---------------|------------------------------|
| `input.width`                  | `422px`       | 컴포넌트 전체 너비           |
| `input.height.total`           | `68px`        | 컴포넌트 전체 높이           |
| `input.field.height`           | `44px`        | 텍스트 필드 높이             |
| `input.title.height`           | `18px`        | 라벨 영역 높이               |
| `input.gap`                    | `6px`         | 라벨-필드 수직 간격          |
| `input.field.padding.horizontal` | `12px`      | 필드 좌우 내부 여백          |
| `input.field.padding.vertical`  | `12px`       | 필드 상하 내부 여백          |
| `input.field.border-radius`    | `6px`         | 필드 모서리 반경             |
| `input.field.border-width`     | `1px`         | 테두리 두께                  |

### Typography

| Token                          | Role                   |
|--------------------------------|------------------------|
| `input.typography.label`       | 라벨 텍스트            |
| `input.typography.required`    | 필수 표시(`*`)         |
| `input.typography.value`       | 입력된 텍스트          |
| `input.typography.placeholder` | 플레이스홀더 텍스트    |

---

## 5. Interaction & Animation

### 5-1. 상태 전환

| Phase       | Animation          | Duration | Easing     |
|-------------|--------------------|----------|------------|
| Focus In    | Border color 변경  | `150ms`  | `ease-out` |
| Focus Out   | Border color 복원  | `150ms`  | `ease-in`  |
| Error       | Border color 변경  | `100ms`  | `ease-out` |

### 5-2. 포커스 동작

| 조건                          | 동작                                       |
|-------------------------------|--------------------------------------------|
| 필드 클릭 또는 Tab 이동       | 포커스 테두리 활성화, 커서 표시            |
| 외부 클릭 또는 Tab 이동       | 포커스 해제, 기본 테두리로 복원            |
| 값 입력 후 포커스 해제        | filled 상태 유지                           |
| 유효성 검사 실패 시           | error 상태 테두리 표시, 오류 메시지 노출   |

### 5-3. 필수 입력 동작

| 조건                          | 동작                                       |
|-------------------------------|--------------------------------------------|
| 필수 항목(`*`) + 값 비어 있음 | 폼 제출 시 error 상태 표시                 |
| 필수 항목 + 값 입력됨         | 정상 제출 허용                             |

---

## 6. Positioning

| 사용 위치         | 설명                                     | 권장 사용처              |
|-------------------|------------------------------------------|--------------------------|
| `form-vertical`   | 폼 내 수직 레이아웃으로 배치             | 기본 폼 화면             |
| `form-grid`       | 다단 그리드 폼 내 1개 셀 점유            | 복잡한 정보 입력 화면    |
| `modal-form`      | 모달 내 폼 요소로 배치                   | 팝업 입력 화면           |

> 폼 내에서 라벨과 필드를 별도로 분리 배치하지 말 것. 반드시 조합 컴포넌트(`input-조합완료`) 단위로 사용.

---

## 7. Content Guidelines

### 라벨 텍스트

- **원칙:** 입력해야 할 정보를 명확히 나타내는 명사형 레이블.
- **길이:** 최대 한 줄 이내 (약 20자). 초과 시 줄바꿈 허용 여부 검토 필요.
- **어조:** 명사형, 간결체. 조사 최소화.

| ✅ Good           | ❌ Bad                              |
|------------------|-------------------------------------|
| 프로젝트명        | 프로젝트의 이름을 입력하세요        |
| 담당자명          | 담당자                              |
| 사업 기간         | 기간을 입력                         |

### 필수 표시(`*`)

- 필수 입력 항목에만 표시.
- 폼 상단 또는 하단에 `* 필수 입력 항목` 안내 문구 병기 권장.
- 선택 항목에는 `(선택)` 텍스트 또는 별도 variant 사용.

### 입력 텍스트 / 플레이스홀더

- 플레이스홀더는 예시 값 또는 간단한 안내 문구로 사용.
- 입력 완료 후 플레이스홀더는 사라지고 입력값으로 대체.
- 최대 입력 글자 수 제한이 있는 경우 필드 우측 하단에 카운터 표시 (검토 필요).

---

## 8. Accessibility

| 항목              | 규격                                                  |
|-------------------|-------------------------------------------------------|
| ARIA Role         | `role="textbox"` (기본 `<input type="text">`)         |
| Label 연결        | `<label for="...">` 또는 `aria-labelledby` 사용 필수 |
| 필수 표시         | `aria-required="true"` 속성 추가                      |
| 오류 상태         | `aria-invalid="true"` + `aria-describedby` 오류 메시지 연결 |
| Focus             | 키보드 Tab으로 접근 가능, 포커스 링 표시 필수         |
| 고대비 모드       | 라벨-배경 명도 대비 4.5:1 이상                        |
| 플레이스홀더      | 라벨 대체 불가. 반드시 별도 라벨 제공                 |

---

## 9. Platform Notes

| Platform | 특이사항                                                              |
|----------|-----------------------------------------------------------------------|
| Web      | `<label>` + `<input>` 마크업 구조 준수. 자동완성(`autocomplete`) 속성 고려 |
| iOS      | `keyboardType` 속성으로 입력 키보드 타입 지정 (text / number 등)      |
| Android  | `inputType` 속성 설정. 소프트 키보드 노출 시 레이아웃 밀림 대응 필요 |

---

## 10. Developer API (Reference)

ts
<InputField
  label="프로젝트명"          // 라벨 텍스트 (필수)
  required={true}             // 필수 여부, 기본값 false
  value={string}              // 입력 값
  placeholder="예: 경기신도시3택지개발사업"  // 플레이스홀더 텍스트 (선택)
  state?: 'default' | 'focused' | 'filled' | 'error' | 'disabled'
  errorMessage?: string       // 오류 상태일 때 하단 안내 문구
  onChange?: (value: string) => void
  maxLength?: number          // 최대 입력 글자 수 (선택)
/>


---

## 11. Changelog

| Date       | Version | Description            | Author |
|------------|---------|------------------------|--------|
| 2026-06-14 | 0.1.0   | 초안 작성              | —      |

---

## Related

- [ ] [Form Layout Guidelines](./form-layout-guidelines.md) — 작성 예정
- [ ] [Validation & Error Handling](./input-validation.md) — 작성 예정
- [ ] [Input Variants](./input-variants.md) — 작성 예정
- [ ] [Figma Plugin Spec](./figma-plugin-spec.md) — 작성 예정
