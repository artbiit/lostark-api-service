# Development Guide

## 환경변수 설정

### 1. .env 파일 설정

프로젝트 루트에 `.env` 파일을 생성하고 환경변수를 설정하세요:

```bash
# .env.example 파일을 복사하여 .env 파일 생성
cp .env.example .env

# .env 파일을 편집하여 실제 값으로 수정
# 특히 LOSTARK_API_KEY는 반드시 설정해야 합니다
```

**환경변수 템플릿**: [.env.example](../.env.example) 파일을 참조하세요.

**상세 설정 가이드**: [설정 가이드](./configuration.md#environment-variables)를
참조하세요.

### 2. 환경변수 로딩 방식

모든 패키지에서 일관되게 `dotenv + zod`를 통해 환경변수를 로딩합니다:

```typescript
import { parseEnv } from '@lostark/shared/config/env.js';

// parseEnv() 함수가 자동으로 .env 파일을 로드하고 검증합니다
const env = parseEnv();
```

**환경변수 관리 상세 가이드**:
[설정 가이드](./configuration.md#environment-variables)를 참조하세요.

## 빌드 및 실행

### 1. 전체 프로젝트 빌드

```bash
# 모든 패키지 빌드
yarn build

# 특정 패키지만 빌드
yarn workspace @lostark/shared build
yarn workspace @lostark/data-service build
yarn workspace @lostark/rest-service build
yarn workspace @lostark/udp-service build
```

### 2. 개발 모드 실행

```bash
# 모든 패키지 개발 모드 (watch)
yarn dev

# 특정 패키지만 개발 모드
yarn workspace @lostark/shared dev
yarn workspace @lostark/data-service dev
yarn workspace @lostark/rest-service dev
yarn workspace @lostark/udp-service dev
```

### 3. 서비스 실행

```bash
# REST API 서비스 실행
yarn workspace @lostark/rest-service start

# UDP Gateway 서비스 실행
yarn workspace @lostark/udp-service start

# Data Service 실행
yarn workspace @lostark/data-service start
```

## 테스트

### 1. 환경변수 테스트

```bash
# 환경변수 로딩 테스트
yarn workspace @lostark/shared test

# 또는 전체 테스트
yarn test
```

### 2. 캐시 플로우 테스트

```bash
# 패키지 기반 캐시 플로우 테스트
yarn test:cache-flow
```

### 3. API 테스트

```bash
# 특정 API 테스트
yarn workspace @lostark/data-service test
```

## 환경변수 검증

### 1. 필수 환경변수

- `LOSTARK_API_KEY`: Lost Ark Developer Portal에서 발급받은 API 키

### 2. 기본값

대부분의 환경변수는 기본값이 설정되어 있어 `.env` 파일에 명시하지 않아도 됩니다.

**환경변수 기본값 목록**: [.env.example](../.env.example) 파일을 참조하세요.

### 3. 타입 안전성

모든 환경변수는 Zod 스키마를 통해 타입 안전성이 보장됩니다:

```typescript
// 숫자 타입 자동 변환
REST_API_PORT: z.coerce.number().min(1).max(65535).default(3000);

// 불린 타입 자동 변환
LOG_PRETTY_PRINT: z.coerce.boolean().default(false);

// 열거형 검증
LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default(
  'info',
);
```

## 문제 해결

### 1. 환경변수 로딩 실패

```bash
# .env 파일 존재 확인
ls -la .env

# 환경변수 로딩 테스트
yarn workspace @lostark/shared test
```

### 2. 빌드 실패

```bash
# 의존성 재설치
yarn install

# 캐시 정리
yarn clean

# 다시 빌드
yarn build
```

### 3. 테스트 실패

```bash
# 환경변수 설정 확인
grep LOSTARK_API_KEY .env

# 테스트 재실행
yarn test
```

# 개발 가이드라인

## 모노레포 의존성 관리

### 📋 의존성 규칙

#### 1. 패키지 간 의존성 방향

```
rest-service → data-service → shared
udp-service → data-service → shared
```

#### 2. 허용된 참조 관계

- **shared**: 모든 패키지에서 참조 가능
- **data-service**: rest-service, udp-service에서만 참조 가능
- **rest-service**: 다른 패키지에서 참조 불가
- **udp-service**: 다른 패키지에서 참조 불가

#### 3. TypeScript Project References 설정

```json
{
  "references": [
    { "path": "../shared" },
    { "path": "../data-service" } // 필요한 경우만
  ]
}
```

### 🔧 개발 워크플로우

#### 1. 새 패키지 추가 시

```bash
# 1. 패키지 생성
mkdir packages/new-package
cd packages/new-package

# 2. package.json 설정
# 3. tsconfig.json 설정 (references 포함)
# 4. 의존성 검증
yarn validate:monorepo
```

#### 2. 의존성 변경 시

```bash
# 1. package.json 수정
# 2. tsconfig.json references 수정
# 3. 검증 실행
yarn validate:deps
yarn validate:refs
```

#### 3. 자동화된 검증 시스템

**Git Hooks (자동 실행)**:

- **pre-commit**: `yarn validate:monorepo && yarn test:unit && yarn lint`
- **pre-push**: `yarn validate:monorepo && yarn test && yarn build`

**CI/CD Pipeline**:

- GitHub Actions에서 자동 검증
- main/develop 브랜치 푸시 시 실행
- Pull Request 시 실행

#### 4. 수동 검증 명령어

```bash
# 커밋 전 검증 (자동 실행됨)
yarn precommit

# 푸시 전 검증 (자동 실행됨)
yarn prepush

# 전체 검증
yarn validate:full
```

### 🚨 자주 발생하는 문제들

#### 1. "File is not under 'rootDir'" 오류

**원인**: 다른 패키지의 내부 파일을 직접 import **해결**:

- 패키지의 공개 API만 사용
- tsconfig.json의 references 설정 확인

#### 2. "File is not listed within the file list" 오류

**원인**: Project References 설정 누락 **해결**:

```json
{
  "references": [{ "path": "../shared" }, { "path": "../data-service" }]
}
```

#### 3. 순환 참조 오류

**원인**: 패키지 간 순환 의존성 **해결**: 의존성 방향 재설계

### 📝 검증 명령어

```bash
# 전체 모노레포 검증
yarn validate:monorepo

# 의존성만 검증
yarn validate:deps

# TypeScript 참조만 검증
yarn validate:refs

# 빌드 검증
yarn validate:build

# 전체 검증 (모든 테스트 + 빌드 + 린트)
yarn validate:full
```

### 🛠️ 문제 해결 체크리스트

- [ ] package.json의 dependencies 확인
- [ ] tsconfig.json의 references 확인
- [ ] import 경로가 올바른지 확인
- [ ] 순환 참조가 없는지 확인
- [ ] 검증 스크립트 실행
- [ ] 빌드 테스트

### 📚 추가 리소스

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Yarn Workspaces](https://yarnpkg.com/features/workspaces)
- [모노레포 모범 사례](https://monorepo.tools/)
