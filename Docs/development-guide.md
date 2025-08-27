# Development Guide

## 환경변수 설정

### 1. .env 파일 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 환경변수들을 설정하세요:

```bash
# === 환경 설정 ===
NODE_ENV=development

# === Lost Ark API 설정 ===
LOSTARK_API_KEY=your_lostark_api_key_here

# === Fetch Layer 설정 ===
FETCH_RATE_LIMIT_PER_MINUTE=100
FETCH_RETRY_ATTEMPTS=3
FETCH_RETRY_DELAY_MS=1000
FETCH_CIRCUIT_BREAKER_THRESHOLD=5
FETCH_CIRCUIT_BREAKER_TIMEOUT_MS=30000

# === REST API 설정 ===
REST_API_PORT=3000
REST_API_HOST=0.0.0.0
REST_API_CORS_ORIGIN=*
REST_API_RATE_LIMIT_PER_MINUTE=100

# === UDP Gateway 설정 ===
UDP_GATEWAY_PORT=3001
UDP_GATEWAY_HOST=0.0.0.0
UDP_GATEWAY_MAX_MESSAGE_SIZE=8192
UDP_GATEWAY_WORKER_POOL_SIZE=4

# === 캐시 설정 ===
CACHE_MEMORY_TTL_SECONDS=300
CACHE_REDIS_TTL_SECONDS=1800

# === 로깅 설정 ===
LOG_LEVEL=info
LOG_PRETTY_PRINT=false

# === 데이터베이스 설정 ===
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=lostark
DB_CONNECTION_LIMIT=10
```

### 2. 환경변수 로딩 방식

모든 패키지에서 일관되게 `dotenv + zod`를 통해 환경변수를 로딩합니다:

```typescript
import { parseEnv } from '@lostark/shared/config/env.js';

// parseEnv() 함수가 자동으로 .env 파일을 로드하고 검증합니다
const env = parseEnv();
```

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

대부분의 환경변수는 기본값이 설정되어 있어 `.env` 파일에 명시하지 않아도 됩니다:

- `NODE_ENV`: development
- `LOSTARK_API_VERSION`: V9.0.0
- `REST_API_PORT`: 3000
- `UDP_GATEWAY_PORT`: 3001
- `FETCH_RATE_LIMIT_PER_MINUTE`: 100
- `FETCH_RETRY_ATTEMPTS`: 3
- `LOG_LEVEL`: info

### 3. 타입 안전성

모든 환경변수는 Zod 스키마를 통해 타입 안전성이 보장됩니다:

```typescript
// 숫자 타입 자동 변환
REST_API_PORT: z.coerce.number().min(1).max(65535).default(3000)

// 불린 타입 자동 변환
LOG_PRETTY_PRINT: z.coerce.boolean().default(false)

// 열거형 검증
LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
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
