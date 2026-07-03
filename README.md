# UI Design Document Figma Plugin

Figma에서 화면 정의서, 예외 케이스, 화면 구조/사이즈, 컴포넌트 MD 명세를 생성하는 로컬 플러그인입니다.

## 사용 방법

1. 이 저장소를 내려받습니다.
2. 터미널에서 플러그인 폴더로 이동한 뒤 서버를 실행합니다.

```bash
./start-server.sh
```

3. Figma Desktop에서 `Plugins > Development > Import plugin from manifest...`를 선택합니다.
4. 이 폴더의 `manifest.json`을 선택합니다.
5. 플러그인을 실행한 뒤 필요한 탭에서 기능을 사용합니다.

## 포함 기능

- 화면 정의서 생성
- 예외 케이스 생성 및 예외 페이지 제작
- 화면 플로우/구조/사이즈 생성
- 컴포넌트 MD 명세 생성 및 GitHub 링크 생성
- 컴포넌트 캡쳐 이미지 포함 MD 생성
