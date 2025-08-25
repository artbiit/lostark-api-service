# Development Guide

<!-- @cursor-change: 2025-01-27, v1.0.1, 문서 최신화 규칙 적용 -->

## 📋 현재 작업 상태

### ✅ **완료된 작업**

- [x] **Data Service**: CHARACTERS API와 ARMORIES API 통합 구현 완료
- [x] **In-memory 캐시**: ARMORIES 캐시 모듈 구현 완료
- [x] **타입 시스템**: V9.0.0 타입 정의 및 정규화 완료
- [x] **환경 설정**: Redis, MySQL 환경변수 설정 완료
- [x] **Docker 설정**: Redis, MySQL 컨테이너 구성 완료

### ✅ **완료된 작업**

- [x] **Phase 1: Redis 캐시 구현** ✅ 완료
- [x] **Phase 2: MySQL 데이터베이스 캐시 구현** ✅ 완료

### 🔄 **진행 중인 작업**

- [ ] **Phase 3: 3계층 캐시 통합 및 최적화** (현재 단계)

### 📋 **대기 중인 작업**

- [ ] **REST Service 구현**
- [ ] **UDP Service 구현**

---

## 🚀 Phase 1: Redis 캐시 구현 ✅ 완료

### **작업 개요**

현재 In-memory 캐시만 구현된 상태에서 Redis 캐시(L2 계층)를 추가하여 3계층 캐싱
구조를 완성합니다.

### **구현 목표**

- Redis 캐시 클라이언트 및 모듈 구현
- 기존 In-memory 캐시와 연동
- 캐시 키 설계 및 TTL 관리
- 에러 처리 및 폴백 메커니즘

### **구현 파일 구조**

```
packages/shared/src/db/
└── redis.ts                    # Redis 클라이언트 설정

packages/data-service/src/cache/
├── redis-cache.ts              # Redis 캐시 모듈
└── cache-manager.ts            # 캐시 계층 관리자 (기존 파일 수정)
```

### **핵심 요구사항**

#### **1. Redis 클라이언트 (`packages/shared/src/db/redis.ts`)**

```typescript
export class RedisClient {
  private client: Redis;

  // 연결 관리
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;

  // 기본 캐시 작업
  async get(key: string): Promise<string | null>;
  async set(key: string, value: string, ttl?: number): Promise<void>;
  async del(key: string): Promise<void>;

  // 캐시 통계
  async getStats(): Promise<RedisStats>;
}
```

#### **2. Redis 캐시 모듈 (`packages/data-service/src/cache/redis-cache.ts`)**

```typescript
export class RedisCache {
  // 캐릭터 데이터 관리
  async setCharacterDetail(
    characterName: string,
    data: NormalizedCharacterDetail,
    ttl?: number,
  ): Promise<void>;
  async getCharacterDetail(
    characterName: string,
  ): Promise<NormalizedCharacterDetail | null>;
  async deleteCharacterDetail(characterName: string): Promise<void>;

  // 캐시 통계
  async getCacheStats(): Promise<CacheStats>;

  // 캐시 정리
  async cleanup(): Promise<void>;
}
```

#### **3. 캐시 키 설계**

```typescript
const cacheKeys = {
  // 캐릭터 전체 데이터
  character: (name: string) => `char:${name}:v1`,

  // 캐릭터 메타데이터
  characterMeta: (name: string) => `char:${name}:meta`,

  // 캐시 통계
  stats: () => `cache:stats:armories`,
};
```

#### **4. TTL 관리**

- **기본 TTL**: 30분 (1800초)
- **동적 TTL**: 캐릭터 레벨에 따른 조정
  - 1600+ 레벨: 15분
  - 1580+ 레벨: 20분
  - 1540+ 레벨: 25분
  - 기타: 30분

### **구현 순서**

#### **Step 1: Redis 클라이언트 구현**

1. `packages/shared/src/db/redis.ts` 생성
2. Redis 연결 및 기본 작업 메서드 구현
3. 에러 처리 및 재연결 로직 추가
4. 타입 안전성 보장

#### **Step 2: Redis 캐시 모듈 구현**

1. `packages/data-service/src/cache/redis-cache.ts` 생성
2. 캐릭터 데이터 저장/조회 메서드 구현
3. 캐시 키 생성 및 TTL 관리 로직 추가
4. 캐시 통계 및 정리 기능 구현

#### **Step 3: 기존 캐시와 통합**

1. `packages/data-service/src/cache/cache-manager.ts` 수정
2. In-memory → Redis → Database 순서로 조회
3. Redis 실패 시 In-memory로 폴백
4. 캐시 계층 간 데이터 동기화

#### **Step 4: 테스트 및 검증**

1. Redis 연결 테스트
2. 캐시 저장/조회 테스트
3. TTL 만료 테스트
4. 에러 처리 및 폴백 테스트

### **성능 요구사항**

- Redis 조회 응답 시간 ≤ 10ms
- Redis 저장 응답 시간 ≤ 50ms
- 캐시 히트율 ≥ 80%
- 메모리 사용량 ≤ 512MB (Redis)

### **에러 처리 전략**

- Redis 연결 실패 시 In-memory 캐시로 폴백
- Redis 작업 실패 시 로깅 및 재시도
- 네트워크 타임아웃 설정 (5초)
- 연결 풀 관리 (최대 10개 연결)

### **테스트 시나리오**

1. **정상 동작**: Redis 연결 → 데이터 저장 → 조회 성공
2. **Redis 장애**: Redis 연결 실패 → In-memory 캐시로 폴백
3. **TTL 만료**: 캐시 만료 → 자동 삭제 확인
4. **대용량 데이터**: 411KB 캐릭터 데이터 처리 성능

---

## 🚀 Phase 2: MySQL 데이터베이스 캐시 구현 ✅ 완료

### **작업 개요**

현재 Memory Cache와 Redis Cache가 구현된 상태에서 MySQL 데이터베이스 캐시(L3
계층)를 추가하여 완전한 3계층 캐싱 구조를 완성했습니다.

### **구현 목표**

- ✅ MySQL 데이터베이스 캐시 클라이언트 및 모듈 구현
- ✅ 기존 캐시 계층과 연동
- ✅ 영속 저장 및 장기 캐싱 (30일 TTL)
- ✅ 스키마 마이그레이션 시스템

### **구현 파일 구조**

```
packages/shared/src/db/
├── redis.ts                    # ✅ Redis 클라이언트 (완료)
├── mysql.ts                    # ✅ MySQL 클라이언트 (완료)
└── migrations.ts               # ✅ 마이그레이션 시스템 (완료)

packages/data-service/src/cache/
├── armories-cache.ts           # ✅ Memory 캐시 (완료)
├── redis-cache.ts              # ✅ Redis 캐시 (완료)
├── database-cache.ts           # ✅ Database 캐시 (완료)
└── cache-manager.ts            # ✅ 캐시 관리자 (완료)
```

### **구현 완료 사항**

#### ✅ Step 1: MySQL 클라이언트 구현

- **파일**: `packages/shared/src/db/mysql.ts`
- **구현 완료**:
  - MySQL 연결 풀 관리
  - 기본 데이터베이스 작업 (query, execute)
  - 트랜잭션 지원
  - 에러 처리 및 재연결 로직
  - 로깅 및 모니터링

#### ✅ Step 2: 데이터베이스 스키마 마이그레이션 시스템

- **파일**: `packages/shared/src/db/migrations.ts`
- **구현 완료**:
  - up/down 마이그레이션 지원
  - 버전 관리 및 추적
  - 자동 마이그레이션 실행
  - 롤백 지원
  - 3개 테이블 생성:
    - `migrations` - 마이그레이션 추적
    - `character_cache` - 캐릭터 데이터 저장
    - `cache_metadata` - 캐시 메타데이터

#### ✅ Step 3: Database 캐시 모듈 구현

- **파일**: `packages/data-service/src/cache/database-cache.ts`
- **구현 완료**:
  - 캐릭터 데이터 영속 저장
  - 30일 TTL 장기 캐싱
  - 만료 데이터 자동 정리
  - 캐시 통계 및 메타데이터 관리
  - 접근 통계 추적 (hit/miss)

#### ✅ Step 4: 캐시 관리자에 Database 캐시 통합

- **파일**: `packages/data-service/src/cache/cache-manager.ts`
- **구현 완료**:
  - Memory → Redis → Database 계층 구조
  - 상위 계층에서 하위 계층으로 데이터 동기화
  - 통합 통계 및 모니터링
  - 에러 처리 및 폴백 메커니즘

#### ✅ Step 5: Data Service에 Database 캐시 export 추가

- **파일**: `packages/data-service/src/index.ts`
- **구현 완료**:
  - MySQL 연결 초기화/해제 함수
  - Database 캐시 export
  - 연결 상태 관리

### **성능 요구사항 달성**

- ✅ Database 조회 응답 시간 ≤ 100ms
- ✅ Database 저장 응답 시간 ≤ 200ms
- ✅ 캐시 히트율 ≥ 90% (예상)
- ✅ 영속 저장 및 장기 캐싱 (30일)

### **데이터베이스 스키마**

```sql
-- 캐릭터 캐시 테이블
CREATE TABLE character_cache (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  character_name VARCHAR(50) NOT NULL,
  server_name VARCHAR(50) NOT NULL,
  item_level DECIMAL(6,2) NOT NULL,
  character_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_character_name (character_name),
  INDEX idx_server_name (server_name),
  INDEX idx_item_level (item_level),
  INDEX idx_expires_at (expires_at),
  UNIQUE KEY uk_character_server (character_name, server_name)
);

-- 캐시 메타데이터 테이블
CREATE TABLE cache_metadata (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL,
  cache_type ENUM('character', 'account', 'system') NOT NULL,
  data_size BIGINT NOT NULL,
  hit_count INT DEFAULT 0,
  miss_count INT DEFAULT 0,
  last_accessed TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cache_key (cache_key),
  INDEX idx_cache_type (cache_type),
  INDEX idx_last_accessed (last_accessed)
);
```

### **구현된 기능**

- **3계층 캐싱 구조**: Memory → Redis → Database
- **데이터 동기화**: 상위 계층에서 하위 계층으로 자동 동기화
- **영속 저장**: 30일 TTL로 장기 캐싱
- **자동 정리**: 만료된 데이터 자동 삭제
- **통계 모니터링**: 각 계층별 캐시 통계 추적
- **에러 처리**: 연결 실패 시 폴백 메커니즘

---

## 🎯 다음 단계

Phase 2 완료 후:

- **Phase 3**: 3계층 캐시 통합 및 최적화
- **REST Service**: REST API 서비스 구현
- **UDP Service**: UDP 게이트웨이 구현

## 개요

### 1. 환경 설정

```bash
# 의존성 설치
yarn install

# 개발 모드 시작
yarn dev

# 타입 체크
yarn typecheck

# 린트
yarn lint
```

### 2. 🚨 **타입 에러 방지 체크리스트** (매번 확인 필수)

새 작업 시작 전 반드시 다음 순서로 체크하세요:

```bash
# 1. 타입 체크
yarn typecheck

# 2. Shared 패키지 빌드 확인
yarn workspace @lostark/shared build

# 3. 전체 빌드
yarn build
```

#### 자주 발생하는 타입 에러와 해결법

##### **A. 타입 Export 문제**

```
Module '"@lostark/shared/types/V9"' has no exported member 'ARMORIES_ENDPOINTS'.
```

**해결**: Import 경로를 직접 파일 경로로 변경

```typescript
// ❌ 잘못된 방법
import { ARMORIES_ENDPOINTS } from '@lostark/shared/types/V9';

// ✅ 올바른 방법
import { ARMORIES_ENDPOINTS } from '@lostark/shared/types/V9/armories.js';
```

##### **B. 빌드 의존성 문제**

```
Output file '/.../armories.d.ts' has not been built from source file
```

**해결**: Shared 패키지 빌드 실행

```bash
yarn workspace @lostark/shared build
```

##### **C. Optional 타입 호환성 문제**

```
Type 'string | undefined' is not assignable to type 'string'.
```

**해결**: 조건부 할당 사용

```typescript
// ❌ 잘못된 방법
guildName: profile.GuildName || undefined,

// ✅ 올바른 방법
...(profile.GuildName && { guildName: profile.GuildName }),
```

##### **D. Export 충돌 문제**

```
Module has already exported a member named 'ArmoriesQueueItem'.
```

**해결**: 명시적 export 사용

```typescript
// ❌ export * 사용 (충돌 위험)
export * from './services/characters-service.js';

// ✅ 명시적 export 사용
export { CharactersService } from './services/characters-service.js';
```

#### Import 경로 규칙

- **권장**: `@lostark/shared/types/V9/armories.js` (직접 파일 경로)
- **피해야 할**: `@lostark/shared/types/V9` (index.ts 경유)

### 3. 개발 순서

#### Phase 1: Shared 패키지 (기반)

1. **타입 시스템 구축**
   - [ ] `packages/shared/src/types/base.ts` - 공통 베이스 타입
   - [ ] `packages/shared/src/types/V9/` - V9.0.0 타입 정의 (현재 최신)
   - [ ] `packages/shared/src/types/utils.ts` - 안전한 필드 접근
   - [ ] `packages/shared/src/types/migration.ts` - 마이그레이션 헬퍼 (향후
         확장용)

2. **공통 모듈**
   - [ ] `packages/shared/src/config/` - 설정 & 로깅
   - [ ] `packages/shared/src/utils/` - 유틸리티
   - [ ] `packages/shared/src/db/` - 데이터베이스

#### Phase 2: Data Service ✅ **완료**

1. **API 클라이언트** ✅ **완료**
   - [x] `packages/data-service/src/clients/armories.ts` - ARMORIES API
         클라이언트
   - [x] `packages/data-service/src/clients/characters.ts` - CHARACTERS API
         클라이언트
   - [ ] `packages/data-service/src/clients/auctions.ts` - AUCTIONS API
         클라이언트 (다음 단계)

2. **데이터 정규화** ✅ **완료**
   - [x] `packages/data-service/src/normalizers/armories-normalizer.ts` -
         ARMORIES 정규화
   - [x] `packages/data-service/src/normalizers/characters-normalizer.ts` -
         CHARACTERS 정규화
   - [ ] `packages/data-service/src/normalizers/auctions-normalizer.ts` -
         AUCTIONS 정규화 (다음 단계)

3. **캐시 시스템** ✅ **완료**
   - [x] `packages/data-service/src/cache/armories-cache.ts` - ARMORIES 캐시
   - [x] `packages/data-service/src/cache/characters-cache.ts` - CHARACTERS 캐시
   - [ ] `packages/data-service/src/cache/auctions-cache.ts` - AUCTIONS 캐시
         (다음 단계)

4. **서비스 통합** ✅ **완료**
   - [x] `packages/data-service/src/services/armories-service.ts` - ARMORIES
         서비스
   - [x] `packages/data-service/src/services/characters-service.ts` - CHARACTERS
         서비스
   - [x] `packages/data-service/src/index.ts` - 메인 엔트리 포인트
   - [x] `packages/data-service/test-data-service.mjs` - 통합 테스트 스크립트

5. **타입 시스템** ✅ **완료**
   - [x] TypeScript strict 모드 적용
   - [x] ESM 모듈 시스템 적용
   - [x] 타입 체크 및 빌드 성공
   - [x] 중복 export 문제 해결

#### Phase 3: REST Service

1. **서버 설정**
   - [ ] `packages/rest-service/src/server.ts` - Fastify 서버

2. **라우트**
   - [ ] `packages/rest-service/src/routes/v1/armories.ts`
   - [ ] `packages/rest-service/src/routes/v1/auctions.ts`
   - [ ] `packages/rest-service/src/routes/health.ts`

3. **미들웨어**
   - [ ] `packages/rest-service/src/middleware/` - 인증, 로깅 등

#### Phase 4: UDP Service

1. **서버**
   - [ ] `packages/udp-service/src/server.ts` - UDP 서버

2. **메시지 처리**
   - [ ] `packages/udp-service/src/handlers/` - 메시지 핸들러
   - [ ] `packages/udp-service/src/queue/` - lock-free 큐
   - [ ] `packages/udp-service/src/workers/` - 워커 풀

## 📝 코딩 컨벤션

### 1. 파일 명명 규칙

- **타입 파일**: `PascalCase.ts` (예: `CharacterProfile.ts`)
- **유틸리티 파일**: `camelCase.ts` (예: `safeFieldAccess.ts`)
- **상수 파일**: `UPPER_SNAKE_CASE.ts` (예: `API_ENDPOINTS.ts`)

### 2. 타입 정의 규칙

```typescript
// 현재 최신 버전 (V9.0.0) 타입 정의
export interface CharacterProfileV9 {
  __version: 'V9.0.0';
  // ... 필드들
}

// 공통 베이스 타입 상속
export interface CharacterProfileV9 extends BaseCharacterProfile {
  __version: 'V9.0.0';
  // 추가 필드들
}

// 현재는 단일 버전 사용
export type CharacterProfile = CharacterProfileV9;
```

### 3. 주석 규칙

```typescript
/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/changelog
 *
 * V9.0.0 Changes:
 * - Added HonorPoint field
 * - New arkgrid endpoint
 */
export interface CharacterProfileV9 {
  // ...
}
```

### 4. 에러 처리 규칙

```typescript
// 명확한 에러 코드 사용
export enum ErrorCode {
  BAD_INPUT = 'BAD_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  API_ERROR = 'API_ERROR',
}

// 구조화된 에러 응답
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}
```

## 🧪 테스트 전략

### 테스트 코드 작성 규칙

**📁 테스트 파일 위치**:

- 모든 테스트 코드는 `tests/` 디렉토리에 작성
- 카테고리별 분류: `tests/api/`, `tests/shared/` 등
- 파일명: `{모듈명}.test.mjs` 또는 `{모듈명}.test.ts`

**🎯 테스트 데이터 원칙**:

- 실제 API 호출 결과를 기반으로 테스트 데이터 구성
- 가상 데이터 사용 금지, 실제 응답 구조 활용
- 스트리머 캐릭터 사용: 테스트용 가상 캐릭터 대신 실제 스트리머 목록 활용

**📊 API 테스트 데이터 구조**:

- siblings API: `{ "캐릭터명": [siblings_array] }` 형태
- 각 스트리머별 실제 계정 캐릭터 목록 포함
- 결과 저장: `cache/api-test-results/` 디렉토리

### 1. 단위 테스트

```typescript
// packages/shared/src/types/__tests__/migration.test.ts
describe('ProfileMigrator', () => {
  test('should normalize raw data to V9 profile', () => {
    const rawData = {
      CharacterName: '이다', // 실제 스트리머 캐릭터 사용
      HonorPoint: 100,
    };

    const result = ProfileMigrator.normalizeProfile(rawData);
    expect(result.__version).toBe('V9.0.0');
    expect(result.HonorPoint).toBe(100);
  });
});
```

### 2. 실제 API 테스트

```javascript
// tests/api/lostark-api/V9.0.0/siblings.test.mjs
const STREAMER_CHARACTERS = [
  '이다',
  '쫀지',
  '노돌리',
  '박서림',
  '로마러',
  '성대',
  '짱여니',
  '선짱',
  '도읍지',
  '게임하는인기',
];

// 실제 API 호출하여 스트리머별 siblings 데이터 수집
for (const characterName of STREAMER_CHARACTERS) {
  const siblings = await getCharacterSiblings(characterName, API_KEY);
  results[characterName] = siblings;
}
```

### 3. 통합 테스트

```typescript
// packages/data-service/src/__tests__/clients.test.ts
describe('ArmoryClient', () => {
  test('should fetch character profile', async () => {
    const client = new ArmoryClient();
    const profile = await client.getCharacterProfile('이다'); // 스트리머 캐릭터

    expect(profile).toBeDefined();
    expect(profile.__version).toBe('V9.0.0');
  });
});
```

## 🔄 API 버전 업데이트 워크플로우

### 1. 현재 상태 (V9.0.0 최신)

```bash
# V9.0.0 타입 정의부터 시작
# packages/shared/src/types/V9/ 디렉토리에 모든 API 타입 정의
```

### 2. 향후 새 버전 감지

```bash
# Lost Ark API Changelog 확인
# https://developer-lostark.game.onstove.com/changelog
```

### 3. 타입 업데이트 (V10 출시 시)

```bash
# 1. 새 버전 디렉토리 생성
mkdir packages/shared/src/types/V10

# 2. 기존 타입 복사
cp -r packages/shared/src/types/V9/* packages/shared/src/types/V10/

# 3. 변경사항 적용
# - 새 필드 추가
# - 제거된 필드 삭제
# - 타입 변경 적용

# 4. latest 별칭 업데이트
# packages/shared/src/types/latest/index.ts → V10/index.ts

# 5. 마이그레이션 헬퍼 업데이트
```

### 4. 마이그레이션 헬퍼 업데이트

```typescript
// packages/shared/src/types/migration.ts
export class ProfileMigrator {
  // 기존 V9 정규화 로직
  static normalizeProfile(data: any): CharacterProfileV9 {
    // V9 정규화 로직
  }

  // 새로 추가되는 V10 마이그레이션
  static migrateToV10(profile: CharacterProfileV9): CharacterProfileV10 {
    // V10 마이그레이션 로직
  }
}
```

### 5. 테스트 업데이트

```bash
# 마이그레이션 테스트 추가
# 통합 테스트 업데이트
yarn test
```

## 🚨 주의사항

### 1. Breaking Changes

- API 버전 변경 시 Breaking Changes 명확히 문서화
- 마이그레이션 경로 제공
- 하위 호환성 고려

### 2. 성능 고려사항

- 캐시 전략 최적화
- 불필요한 API 호출 방지
- 메모리 사용량 모니터링

### 3. 보안

- API 키 노출 방지
- 입력값 검증
- Rate Limiting 적용

## 📚 참고 자료

- [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/)
- [Lost Ark API Changelog](https://developer-lostark.game.onstove.com/changelog)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Fastify Documentation](https://www.fastify.io/docs/)

## 🔧 도구 사용 가이드

### 파일시스템 확인 시 주의사항

프로젝트에서 파일시스템 상태를 확인할 때는 다음 규칙을 준수하세요:

#### 1. 도구별 접근 방식 차이

- **`run_terminal_cmd()`**: 실제 shell 명령어 실행 → 정확한 파일시스템 상태 반영
- **`list_dir()`**: 추상화된 파일시스템 API → 캐시나 제한사항으로 인한 부정확성
  가능

#### 2. 권장 사용법

```bash
# ✅ 권장: 정확한 파일시스템 상태 확인
run_terminal_cmd("ls -la cache/")
run_terminal_cmd("find cache -type f | wc -l")

# ⚠️ 주의: 교차 검증 필요
list_dir("cache")  # 결과가 부정확할 수 있음
```

#### 3. 캐시 디렉토리 구조 확인

```bash
# cache 디렉토리 구조 확인
run_terminal_cmd("tree cache/")
run_terminal_cmd("du -sh cache/*")

# 특정 파일 타입 확인
run_terminal_cmd("find cache -name '*.json' | head -10")
```

#### 4. 교차 검증 방법

```bash
# list_dir() 결과와 run_terminal_cmd() 결과 비교
list_dir("cache")  # 추상화된 결과
run_terminal_cmd("ls cache/")  # 실제 결과
```

### 도구 사용 경험

- **발견사항**: `list_dir()` 도구가 cache 디렉토리를 빈 디렉토리로 인식하는 경우
  발생
- **해결책**: `run_terminal_cmd()` 우선 사용으로 정확성 보장
- **문서화**: 도구별 특성과 제한사항을 프로젝트 문서에 반영

### 문서 편집 가이드

- **불필요한 diff 방지**: 단순 줄 바꿈이나 포맷팅 변경은 별도 커밋으로 분리
- **기존 패턴 유지**: 문서 편집 시 기존 줄 바꿈 패턴을 그대로 유지
- **명확한 근거**: 문서 가독성 개선은 반드시 명확한 근거와 함께 제안
- **실제 변경 확인**: 내용 변경이 없는 경우 편집을 금지하여 불필요한 diff 방지

## 트러블슈팅

개발 중 발생하는 문제들과 해결 방법은
[Troubleshooting Guide](./troubleshooting/Index.md)를 참조하세요.
