# Development Guide

<!-- @cursor-change: 2025-01-27, v1.0.1, 문서 최신화 규칙 적용 -->

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

### 2. 개발 순서

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
