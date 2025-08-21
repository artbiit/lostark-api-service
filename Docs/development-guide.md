# Development Guide

## 🚀 개발 시작 가이드

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
   - [ ] `packages/shared/src/types/migration.ts` - 마이그레이션 헬퍼 (향후 확장용)

2. **공통 모듈**
   - [ ] `packages/shared/src/config/` - 설정 & 로깅
   - [ ] `packages/shared/src/utils/` - 유틸리티
   - [ ] `packages/shared/src/db/` - 데이터베이스

#### Phase 2: Fetch Layer (1계층)
1. **API 클라이언트**
   - [ ] `packages/fetch/src/clients/armories.ts`
   - [ ] `packages/fetch/src/clients/auctions.ts`
   - [ ] `packages/fetch/src/clients/characters.ts`

2. **데이터 정규화**
   - [ ] `packages/fetch/src/normalizers/` - API 응답 정규화

3. **캐시 시스템**
   - [ ] `packages/fetch/src/cache/` - 캐시 관리

4. **스케줄러**
   - [ ] `packages/fetch/src/scheduler.ts` - 주기적 데이터 갱신

#### Phase 3: REST API (2계층)
1. **서버 설정**
   - [ ] `packages/rest-api/src/server.ts` - Fastify 서버

2. **라우트**
   - [ ] `packages/rest-api/src/routes/v1/armories.ts`
   - [ ] `packages/rest-api/src/routes/v1/auctions.ts`
   - [ ] `packages/rest-api/src/routes/health.ts`

3. **미들웨어**
   - [ ] `packages/rest-api/src/middleware/` - 인증, 로깅 등

#### Phase 4: UDP Gateway (3계층)
1. **서버**
   - [ ] `packages/udp-gateway/src/server.ts` - UDP 서버

2. **메시지 처리**
   - [ ] `packages/udp-gateway/src/handlers/` - 메시지 핸들러
   - [ ] `packages/udp-gateway/src/queue/` - lock-free 큐
   - [ ] `packages/udp-gateway/src/workers/` - 워커 풀

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
  API_ERROR = 'API_ERROR'
}

// 구조화된 에러 응답
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}
```

## 🧪 테스트 전략

### 1. 단위 테스트
```typescript
// packages/shared/src/types/__tests__/migration.test.ts
describe('ProfileMigrator', () => {
  test('should normalize raw data to V9 profile', () => {
    const rawData = {
      CharacterName: '테스트캐릭터',
      HonorPoint: 100
    };
    
    const result = ProfileMigrator.normalizeProfile(rawData);
    expect(result.__version).toBe('V9.0.0');
    expect(result.HonorPoint).toBe(100);
  });
});
```

### 2. 통합 테스트
```typescript
// packages/fetch/src/__tests__/clients.test.ts
describe('ArmoryClient', () => {
  test('should fetch character profile', async () => {
    const client = new ArmoryClient();
    const profile = await client.getCharacterProfile('캐릭터명');
    
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
