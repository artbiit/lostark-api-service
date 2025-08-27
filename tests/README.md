# Tests Directory

<!-- @cursor-change: 2025-01-27, v1.0.2, 테스트 구조 재설계 완료 -->

이 디렉토리는 Lost Ark API 서비스의 테스트 및 데이터 수집 도구들을 포함합니다.

## 📁 새로운 디렉토리 구조

```
tests/
├── unit/                          # 단위 테스트 (TypeScript)
│   ├── shared/                   # shared 패키지 테스트
│   │   ├── env.test.ts          # 환경변수 테스트
│   │   └── config.test.ts       # 설정 모듈 테스트
│   ├── data-service/            # data-service 패키지 테스트
│   ├── rest-service/            # rest-service 패키지 테스트
│   └── udp-service/             # udp-service 패키지 테스트
├── integration/                  # 통합 테스트 (TypeScript)
│   ├── api/                     # API 통합 테스트
│   │   └── armories.test.ts     # ARMORIES API 테스트
│   ├── cache/                   # 캐시 통합 테스트
│   └── services/                # 서비스 간 통합 테스트
├── e2e/                         # 엔드투엔드 테스트 (TypeScript)
├── prototype/                   # 프로토타입 테스트 (.mjs)
│   ├── character-data/          # 캐릭터 데이터 수집/분석
│   └── legacy/                  # 레거시 테스트 파일들
├── common/                      # 공통 모듈
│   ├── test-utils.ts           # 테스트 유틸리티 (TypeScript)
│   ├── test-runner.ts          # 테스트 실행 스크립트 (TypeScript)
│   ├── env-loader.mjs          # 환경변수 로드 (레거시)
│   ├── file-utils.mjs          # 파일 유틸리티 (레거시)
│   ├── streamer-list.mjs       # 스트리머 목록 (레거시)
│   ├── api-client.mjs          # API 클라이언트 (레거시)
│   └── cache-flow-client.mjs   # 캐시 플로우 테스트용 클라이언트 (레거시)
├── fixtures/                    # 테스트 데이터
├── run-tests.mjs               # 테스트 실행 메인 스크립트
└── README.md                   # 이 파일
```

## 🚀 새로운 테스트 실행 방법

### 기본 테스트 실행

```bash
# 전체 테스트 실행
yarn test

# 단위 테스트만 실행
yarn test:unit

# 통합 테스트만 실행
yarn test:integration

# API 테스트만 실행
yarn test:api

# 캐시 플로우 테스트 실행
yarn test:cache-flow

# 워크스페이스별 테스트 실행
yarn test:workspace
```

### 패키지별 테스트 실행

```bash
# shared 패키지 테스트
yarn workspace @lostark/shared test

# data-service 패키지 테스트
yarn workspace @lostark/data-service test

# rest-service 패키지 테스트
yarn workspace @lostark/rest-service test

# udp-service 패키지 테스트
yarn workspace @lostark/udp-service test
```

### 스크립트를 통한 실행

```bash
# 메인 스크립트 사용
node tests/run-tests.mjs unit        # 단위 테스트
node tests/run-tests.mjs integration # 통합 테스트
node tests/run-tests.mjs api         # API 테스트
node tests/run-tests.mjs all         # 전체 테스트
```

### 개발 중 테스트

```bash
# 감시 모드로 테스트 실행
yarn test:watch

# 특정 패키지 감시 모드
yarn workspace @lostark/shared test:watch
```

## 🔧 새로운 테스트 유틸리티

### test-utils.ts

TypeScript 기반 테스트 유틸리티

```typescript
import {
  setupTestEnvironment,
  validateTestEnvironment,
  createTestClient,
  withTimeout,
  saveTestData,
  loadTestData,
} from '../common/test-utils';

// 테스트 환경 설정
const env = setupTestEnvironment();

// 테스트 클라이언트 생성
const client = createTestClient();

// 타임아웃과 함께 테스트
const result = await withTimeout(someAsyncOperation(), 10000);
```

### test-runner.ts

프로그래밍 방식 테스트 실행

```typescript
import {
  runUnitTests,
  runIntegrationTests,
  runAllTests,
} from '../common/test-runner';

// 단위 테스트 실행
const result = await runUnitTests({ verbose: true });

// 전체 테스트 실행
const summary = await runAllTests();
```

## 📊 테스트 유형별 특징

### 단위 테스트 (Unit Tests)

- **목적**: 개별 함수/모듈 검증
- **위치**: `tests/unit/`
- **형식**: `.test.ts`
- **실행**: `yarn test:unit`

### 통합 테스트 (Integration Tests)

- **목적**: 모듈 간 상호작용 검증
- **위치**: `tests/integration/`
- **형식**: `.test.ts`
- **실행**: `yarn test:integration`

### API 테스트 (API Tests)

- **목적**: 외부 API 연동 검증
- **위치**: `tests/integration/api/`
- **형식**: `.test.ts`
- **실행**: `yarn test:api`

### 프로토타입 테스트 (Prototype Tests)

- **목적**: 빠른 개념 검증
- **위치**: `tests/prototype/`
- **형식**: `.mjs`
- **실행**: `node tests/prototype/...`

## 🔄 마이그레이션 완료 사항

### ✅ 완료된 작업

1. **Yarn PnP 설정 명시**
   - `.yarnrc.yml` 생성
   - PnP 모드 및 TypeScript 지원 설정

2. **테스트 스크립트 표준화**
   - 루트 `package.json`에 통일된 테스트 스크립트 추가
   - 모든 패키지에 테스트 스크립트 추가

3. **TypeScript 설정 개선**
   - `tests/tsconfig.json` 생성
   - PnP 호환 경로 매핑 설정

4. **테스트 구조 재설계**
   - `unit/`, `integration/`, `e2e/` 디렉토리 생성
   - 기존 테스트 파일들을 새로운 구조로 이동

5. **테스트 유틸리티 생성**
   - `test-utils.ts`: 공통 테스트 함수들
   - `test-runner.ts`: 프로그래밍 방식 테스트 실행

6. **새로운 테스트 생성**
   - `config.test.ts`: shared config 모듈 테스트
   - `armories.test.ts`: ARMORIES API 통합 테스트

7. **테스트 실행 스크립트**
   - `run-tests.mjs`: 메인 테스트 실행 스크립트

### 🎯 개선된 점

1. **일관된 실행 환경**
   - 모든 테스트가 `tsx`를 통해 실행
   - TypeScript 컴파일 없이 직접 실행

2. **명확한 테스트 분류**
   - 단위/통합/API 테스트 명확히 분리
   - 각 테스트 유형별 실행 방법 제공

3. **개선된 모듈 해석**
   - PnP 환경에서 안정적인 모듈 해석
   - 경로 매핑을 통한 일관된 import

4. **표준화된 테스트 유틸리티**
   - 공통 테스트 함수들 제공
   - 환경 설정 및 검증 자동화

## 🚨 주의사항

### 레거시 파일들

다음 파일들은 레거시로 분류되어 점진적으로 마이그레이션됩니다:

- `tests/common/env-loader.mjs`
- `tests/common/file-utils.mjs`
- `tests/common/streamer-list.mjs`
- `tests/common/api-client.mjs`
- `tests/common/cache-flow-client.mjs`
- `tests/prototype/` 하위의 모든 `.mjs` 파일들

### 마이그레이션 계획

1. **Phase 1**: 새로운 구조로 테스트 작성
2. **Phase 2**: 레거시 테스트를 TypeScript로 변환
3. **Phase 3**: 레거시 파일들 제거

## 📝 테스트 작성 가이드라인

### 새로운 테스트 작성 시

1. **파일 명명**: `{모듈명}.test.ts`
2. **디렉토리 구조**: `tests/{유형}/{패키지명}/`
3. **테스트 구조**: `test > describe > test`
4. **모킹**: `test-utils.ts`의 함수들 활용
5. **환경변수**: `setupTestEnvironment()` 사용

### 예시

```typescript
import assert from 'node:assert';
import { test } from 'node:test';
import { setupTestEnvironment, withTimeout } from '../../common/test-utils';

test('My Module', async (t) => {
  await t.test('should work correctly', async () => {
    const env = setupTestEnvironment();

    const result = await withTimeout(someAsyncOperation(), 5000);

    assert(result !== null);
  });
});
```
