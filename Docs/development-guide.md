# Development Guide

## 환경변수 설정

### 1. .env 파일 설정

프로젝트 루트에 `.env` 파일을 생성하고 환경변수를 설정하세요:

```bash
# ⚠️  보안 주의: .env.example을 복사하지 마세요!
# .env.example 파일은 템플릿일 뿐이며, 실제 값이 포함되어 있지 않습니다.

# 수동으로 .env 파일을 생성하고 환경변수를 설정하세요
touch .env

# .env 파일을 편집하여 실제 값으로 수정
# 특히 LOSTARK_API_KEY는 반드시 설정해야 합니다
```

**환경변수 템플릿**: [.env.example](../.env.example) 파일을 참조하세요.

**⚠️ 보안 규칙**:

- `.env.example` 파일을 `.env`로 복사하는 것을 절대 금지합니다
- `.env` 파일은 수동으로 생성하고 실제 값만 입력하세요
- `.env` 파일은 절대 Git에 커밋하지 마세요

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

## 개발 워크플로우

**상세한 개발 워크플로우와 모노레포 의존성 관리**:
[개발자 워크플로우](./workflows/development-workflow.md)를 참조하세요.

**검증 명령어와 자동화 시스템**:
[개발자 워크플로우](./workflows/development-workflow.md#검증-명령어)를
참조하세요.

**모범 사례와 코드 품질 가이드**: [모범 사례](./workflows/best-practices.md)를
참조하세요.

## 관련 문서

- [설정 가이드](./configuration.md) - 환경변수 및 설정 상세 가이드
- [개발자 워크플로우](./workflows/development-workflow.md) - 상세한 개발
  프로세스
- [모범 사례](./workflows/best-practices.md) - 코드 품질 및 문서화 가이드
- [문제 해결 가이드](./workflows/troubleshooting-guide.md) - 자주 발생하는 문제
  해결
