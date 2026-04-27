# Troubleshooting Guide

## ESLint Import 해석 문제 (Yarn Berry PnP)

### 문제 현상

- IDE에서 `Unable to resolve path to module 'zod'` 오류 발생
- `import/no-unresolved` ESLint 규칙 오류
- 터미널에서는 빌드/린트 정상 작동
- IDE 재시작, TypeScript 언어 서버 재시작해도 해결되지 않음

### 원인

Yarn Berry PnP(Plug'n'Play) 모드에서 ESLint import 플러그인이 외부 모듈 경로를
제대로 해석하지 못하는 호환성 문제

### 해결 과정

#### 시도 1: 기본적인 ESLint 설정 개선

- `eslint-import-resolver-typescript` 패키지 설치
- ESLint 설정에 TypeScript 해석기 추가
- **결과**: 터미널에서는 작동하지만 IDE에서 여전히 오류 발생

#### 시도 2: import 플러그인 완전 제거

- ESLint에서 import 플러그인과 관련 규칙 모두 제거
- **결과**: import 순서 규칙도 함께 제거되어 코드 품질 저하

#### 시도 3: 최적화된 설정 적용 (최종 해결책)

**1단계: ESLint 설정 최적화**

```json
// .eslintrc.json
{
  "plugins": ["@typescript-eslint", "import", "unused-imports"],
  "rules": {
    "import/no-unresolved": "off", // PnP 호환성을 위해 비활성화
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ]
  }
}
```

**2단계: 필요한 패키지 설치**

```bash
yarn add -D eslint-import-resolver-typescript
```

**3단계: 캐시 클리어 (핵심)**

```bash
rm -rf .eslintcache
```

**4단계: IDE 재시작**

- VSCode 완전 재시작
- 또는 Command Palette → "ESLint: Restart ESLint Server"

### 설정 원리

- `import/no-unresolved: "off"`: PnP 모드에서 발생하는 경로 해석 오류만 비활성화
- `import/order`: 코드 품질을 위한 import 순서 규칙은 유지
- TypeScript 컴파일러가 실제 타입 체크를 담당하므로 코드 품질에는 영향 없음

### 확인 방법

```bash
# 터미널에서 ESLint 정상 작동 확인
yarn lint packages/shared/src/config/logger.ts

# 전체 프로젝트 린트 확인
yarn lint

# TypeScript 컴파일 확인
yarn tsc --noEmit
```

### 핵심 포인트

- **캐시 클리어가 핵심**: ESLint 설정 변경 후 반드시 `.eslintcache` 삭제 필요
- **IDE 재시작 필수**: 설정 변경 후 VSCode 완전 재시작 또는 ESLint 서버 재시작
- **터미널 vs IDE 차이**: 터미널에서는 정상 작동하지만 IDE에서만 오류 발생하는
  경우가 많음

### 주의사항

- 실제 빌드와 타입 체크는 TypeScript 컴파일러가 담당
- ESLint는 코드 스타일과 사용하지 않는 import 제거만 담당
- PnP 모드에서 import 경로 해석 문제가 재발하면 캐시 삭제부터 시도
- import 순서 규칙은 유지하되, 경로 해석 오류만 비활성화하는 것이 최적

---

_마지막 업데이트: 2025-01-15_
