# 설정 가이드

## 환경변수 설정

### 개요

Lost Ark API Service는 환경변수를 통해 모든 설정을 관리합니다. 환경변수는 `.env` 파일을 통해 로드되며, Zod 스키마를 통해 타입 안전성이 보장됩니다.

### 환경변수 템플릿

실제 환경변수 템플릿은 [.env.example](../.env.example) 파일을 참조하세요.

### 필수 환경변수

#### 1. Lost Ark API 설정

```bash
# Lost Ark Developer Portal에서 발급받은 API 키
# https://developer-lostark.game.onstove.com/
LOSTARK_API_KEY=your_lostark_api_key_here

# API 버전 (현재: V9.0.0)
LOSTARK_API_VERSION=V9.0.0
```

#### 2. 서비스 포트 설정

```bash
# REST API 서비스 포트
REST_API_PORT=3000

# UDP Gateway 서비스 포트
UDP_GATEWAY_PORT=3001
```

### 선택적 환경변수

#### 1. Fetch Layer 설정

```bash
# 분당 API 호출 제한 (Lost Ark API 제한: 100회/분)
FETCH_RATE_LIMIT_PER_MINUTE=100

# 재시도 횟수
FETCH_RETRY_ATTEMPTS=3

# 재시도 간격 (밀리초)
FETCH_RETRY_DELAY_MS=1000

# 서킷브레이커 임계값
FETCH_CIRCUIT_BREAKER_THRESHOLD=5

# 서킷브레이커 타임아웃 (밀리초)
FETCH_CIRCUIT_BREAKER_TIMEOUT_MS=30000
```

#### 2. REST API 설정

```bash
# REST API 호스트
REST_API_HOST=0.0.0.0

# CORS 설정
REST_API_CORS_ORIGIN=*

# REST API 레이트 리미팅
REST_API_RATE_LIMIT_PER_MINUTE=100
```

#### 3. UDP Gateway 설정

```bash
# UDP Gateway 호스트
UDP_GATEWAY_HOST=0.0.0.0

# 최대 메시지 크기 (바이트)
UDP_GATEWAY_MAX_MESSAGE_SIZE=8192

# 워커 풀 크기
UDP_GATEWAY_WORKER_POOL_SIZE=4
```

#### 4. 캐시 설정

```bash
# Redis 연결 URL (선택사항)
# CACHE_REDIS_URL=redis://localhost:6379

# Redis 비밀번호 (선택사항)
# CACHE_REDIS_PASSWORD=your_redis_password

# Redis 데이터베이스 번호
CACHE_REDIS_DB=0

# 메모리 캐시 TTL (초)
CACHE_MEMORY_TTL_SECONDS=300

# Redis 캐시 TTL (초)
CACHE_REDIS_TTL_SECONDS=1800
```

#### 5. 로깅 설정

```bash
# 로그 레벨
LOG_LEVEL=info

# 로그 포맷팅 (개발 환경에서만 true 권장)
LOG_PRETTY_PRINT=true
```

#### 6. 데이터베이스 설정

```bash
# 데이터베이스 호스트
DB_HOST=localhost

# 데이터베이스 포트
DB_PORT=3306

# 데이터베이스 사용자명
DB_USERNAME=myuser

# 데이터베이스 비밀번호
DB_PASSWORD=password

# 데이터베이스명
DB_DATABASE=mydb

# 연결 제한
DB_CONNECTION_LIMIT=10
```

### 환경변수 로딩 방식

모든 패키지에서 일관되게 `dotenv + zod`를 통해 환경변수를 로딩합니다:

```typescript
import { parseEnv } from '@lostark/shared/config/env.js';

// parseEnv() 함수가 자동으로 .env 파일을 로드하고 검증합니다
const env = parseEnv();
```

### 타입 안전성

모든 환경변수는 Zod 스키마를 통해 타입 안전성이 보장됩니다:

```typescript
// 숫자 타입 자동 변환
REST_API_PORT: z.coerce.number().min(1).max(65535).default(3000);

// 불린 타입 자동 변환
LOG_PRETTY_PRINT: z.coerce.boolean().default(false);

// 열거형 검증
LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info');
```

### 환경별 설정

#### 개발 환경 (development)

```bash
NODE_ENV=development
LOG_PRETTY_PRINT=true
LOG_LEVEL=debug
```

#### 프로덕션 환경 (production)

```bash
NODE_ENV=production
LOG_PRETTY_PRINT=false
LOG_LEVEL=info
```

#### 스테이징 환경 (staging)

```bash
NODE_ENV=staging
LOG_PRETTY_PRINT=false
LOG_LEVEL=warn
```

### 문제 해결

#### 1. 환경변수 로딩 실패

```bash
# .env 파일 존재 확인
ls -la .env

# 환경변수 로딩 테스트
yarn workspace @lostark/shared test
```

#### 2. 타입 검증 실패

```bash
# 환경변수 스키마 검증
yarn workspace @lostark/shared test:env
```

#### 3. 필수 환경변수 누락

```bash
# 필수 환경변수 확인
grep LOSTARK_API_KEY .env

# 환경변수 로딩 테스트
node -e "require('@lostark/shared/config/env.js').parseEnv()"
```

### 관련 문서

- [개발 가이드](./development-guide.md) - 전체 개발 가이드
- [워크플로우 가이드](./workflows/README.md) - 개발 워크플로우
- [문제 해결 가이드](./workflows/troubleshooting-guide.md) - 문제 해결 방법