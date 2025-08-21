# Test Structure

> **테스트 디렉토리 구조 및 가이드**

## 📁 디렉토리 구조

```
tests/
├── README.md                    # 이 파일
├── api/                         # API 테스트
│   └── lostark-api/            # 로스트아크 API 테스트
│       └── V9.0.0/             # V9.0.0 API 테스트
│           ├── api.test.mjs    # 기본 API 테스트
│           ├── siblings.test.mjs # 스트리머 siblings API 테스트
│           └── debug-api.test.mjs # API 디버깅 테스트
└── shared/                      # Shared 패키지 테스트
    └── types.test.mjs          # 타입 정의 테스트
```

## 🧪 테스트 카테고리

### 1. API 테스트 (`tests/api/`)

- **lostark-api**: 로스트아크 공식 API 호출 테스트
  - `api.test.mjs`: 기본 API 테스트
  - `siblings.test.mjs`: 스트리머 siblings API 테스트
  - `debug-api.test.mjs`: API 디버깅 테스트

### 2. Shared 패키지 테스트 (`tests/shared/`)

- **types**: 타입 정의 정확성 테스트
  - `types.test.mjs`: 실제 데이터와 타입 매칭 테스트

## 🚀 테스트 실행

```bash
# 전체 테스트 실행
node tests/shared/types.test.mjs
node tests/api/lostark-api/V9.0.0/api.test.mjs
node tests/api/lostark-api/V9.0.0/siblings.test.mjs
node tests/api/lostark-api/V9.0.0/debug-api.test.mjs

# 특정 카테고리 테스트
node tests/api/lostark-api/V9.0.0/*.mjs
node tests/shared/*.mjs

# 특정 파일 테스트
node tests/api/lostark-api/V9.0.0/api.test.mjs
node tests/api/lostark-api/V9.0.0/siblings.test.mjs
node tests/api/lostark-api/V9.0.0/debug-api.test.mjs
node tests/shared/types.test.mjs
```

## 📝 테스트 작성 가이드

### 1. 파일 명명 규칙

- **테스트 파일**: `{모듈명}.test.ts`
- **설정 파일**: `{모듈명}.config.test.ts`
- **통합 테스트**: `{목적}.test.ts`

### 2. 테스트 구조

```typescript
describe('모듈명', () => {
  describe('기능명', () => {
    it('should 동작_설명', async () => {
      // Given
      const input = {
        /* 테스트 데이터 */
      };

      // When
      const result = await functionToTest(input);

      // Then
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

### 3. 테스트 데이터

- **Mock 데이터**: `tests/fixtures/` 디렉토리에 저장
- **실제 API 응답**: `cache/api-test-results/` 활용
- **환경별 설정**: `.env.test` 파일 사용

### 4. 성능 테스트

```typescript
describe('Performance', () => {
  it('should respond within 50ms (p95)', async () => {
    const startTime = Date.now();
    await apiCall();
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(50);
  });
});
```

## 🔧 테스트 설정

### Jest 설정

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'packages/**/src/**/*.ts',
    '!packages/**/src/**/*.d.ts',
  ],
};
```

### 환경변수

```bash
# .env.test
NODE_ENV=test
LOSTARK_API_KEY=test_api_key
CACHE_REDIS_URL=redis://localhost:6379/1
```

## 📊 테스트 커버리지 목표

- **전체 커버리지**: 80% 이상
- **핵심 로직**: 90% 이상
- **타입 정의**: 100% (모든 타입 검증)
- **API 엔드포인트**: 100% (모든 엔드포인트 테스트)

## 🚨 주의사항

- **실제 API 호출**: 테스트 시 Rate Limit 고려
- **비동기 테스트**: `async/await` 사용
- **타임아웃**: 장시간 실행되는 테스트는 적절한 타임아웃 설정
- **리소스 정리**: `afterEach`, `afterAll`에서 정리 작업 수행
