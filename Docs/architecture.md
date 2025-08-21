# Lost Ark API Service - 3-Tier Architecture

## 📋 개요

Lost Ark API Service는 3계층 아키텍처를 기반으로 한 TypeScript + ESM 모노레포 구조입니다.

## 🏗️ 아키텍처 개요

### 3-Tier 구조

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UDP Gateway   │    │   REST API      │    │   Fetch Layer   │
│   (3계층)        │    │   (2계층)        │    │   (1계층)        │
│                 │    │                 │    │                 │
│ • 초저지연 전송   │    │ • 정규화된 데이터 │    │ • 외부 API 호출  │
│ • 기존 메시지     │    │ • 필요시 Fetch   │    │ • 데이터 정규화  │
│   규격 유지      │    │   호출          │    │ • 캐싱          │
│ • Lock-free 큐   │    │ • Fastify 기반  │    │ • 스케줄러      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 디렉토리 구조

```
lostark-remote-kakao/
├── packages/
│   ├── shared/                    # 공통 모듈 통합 패키지
│   │   ├── src/
│   │   │   ├── types/            # 타입 정의 (버전별)
│   │   │   │   ├── V9/           # Lost Ark API V9.0.0 (현재 최신)
│   │   │   │   ├── latest/       # 최신 버전 별칭 (→ V9)
│   │   │   │   └── domain/       # 내부 도메인 타입
│   │   │   ├── config/           # 설정 & 로깅
│   │   │   ├── utils/            # 유틸리티
│   │   │   ├── db/               # 데이터베이스
│   │   │   └── index.ts          # 통합 진입점
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── fetch/                     # 1계층: Fetch & Normalize
│   │   ├── src/
│   │   │   ├── clients/           # Lost Ark API 클라이언트
│   │   │   ├── normalizers/       # 데이터 정규화
│   │   │   ├── cache/             # 캐시 관리
│   │   │   ├── scheduler.ts       # 스케줄러
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── rest-api/                  # 2계층: REST API
│   │   ├── src/
│   │   │   ├── routes/            # Fastify 라우트
│   │   │   │   └── v1/            # API 버전별
│   │   │   ├── middleware/        # 미들웨어
│   │   │   ├── plugins/           # Fastify 플러그인
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── udp-gateway/               # 3계층: UDP Gateway
│       ├── src/
│       │   ├── handlers/          # 메시지 핸들러
│       │   ├── queue/             # lock-free 큐
│       │   ├── workers/           # 워커 풀
│       │   └── server.ts
│       ├── package.json
│       └── tsconfig.json
│
├── cache/                         # 캐시 데이터 (gitignore)
├── Docs/                          # 문서
├── legacy/                        # 레거시 코드
└── tools/                         # 개발 도구
```

## 🔧 타입 시스템 설계

### 버전별 타입 관리

현재 최신 버전인 Lost Ark API V9.0.0부터 시작하여 타입 안전성과 변경 추적을 확보합니다.

#### 타입 구조 예시

```typescript
// packages/shared/src/types/V9/armories.ts
/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/changelog
 * 
 * V9.0.0 Changes:
 * - GET /armories/characters/{characterName}/profiles : Added 'HonorPoint' data
 * - GET /armories/characters/{characterName}/arkgrid : New endpoint
 */
export interface CharacterProfileV9 extends BaseCharacterProfile {
  __version: 'V9.0.0';
  HonorPoint: number;        // V9에서 추가
  CombatPower: number;       // V8에서 추가
  Decorations: Decoration[]; // V8에서 추가
}

// packages/shared/src/types/latest/armories.ts
// → V9/armories.ts의 별칭
export * from '../V9/armories';
```

#### 안전한 필드 접근

```typescript
// packages/shared/src/types/utils.ts
export class SafeFieldAccess {
  static getHonorPoint(profile: CharacterProfileV9): number {
    return profile.HonorPoint; // V9에서만 사용 가능
  }

  static getCombatPower(profile: CharacterProfileV9): number {
    return profile.CombatPower; // V8, V9에서 사용 가능
  }
}
```

#### 마이그레이션 헬퍼 (향후 확장용)

```typescript
// packages/shared/src/types/migration.ts
export class ProfileMigrator {
  // 현재는 V9가 최신이므로 단순 변환
  static normalizeProfile(data: any): CharacterProfileV9 {
    return {
      ...data,
      __version: 'V9.0.0',
      HonorPoint: data.HonorPoint || 0,
      CombatPower: data.CombatPower || 0,
      Decorations: data.Decorations || []
    };
  }

  // 향후 V10 출시 시 마이그레이션 로직 추가
  static migrateToV10(profile: CharacterProfileV9): CharacterProfileV10 {
    // V10 마이그레이션 로직
  }
}
```

## 🚀 개발 워크플로우

### 1. 현재 최신 버전 (V9.0.0) 구현

```bash
# V9.0.0 타입 정의부터 시작
# packages/shared/src/types/V9/ 디렉토리에 모든 API 타입 정의
```

### 2. 향후 새 API 버전 출시 시

```bash
# 1. 새 버전 디렉토리 생성
mkdir packages/shared/src/types/V10

# 2. 기존 타입 복사 후 수정
cp -r packages/shared/src/types/V9/* packages/shared/src/types/V10/

# 3. latest 별칭 업데이트
# packages/shared/src/types/latest/index.ts → V10/index.ts

# 4. 마이그레이션 헬퍼 추가
```

### 3. 타입 사용

```typescript
// 최신 버전 사용 (권장)
import { CharacterProfileV9 } from '@lostark/shared/types/latest/armories';

// 특정 버전 사용
import { CharacterProfileV9 } from '@lostark/shared/types/V9/armories';

// 안전한 필드 접근
import { SafeFieldAccess } from '@lostark/shared/types/utils';
const honorPoint = SafeFieldAccess.getHonorPoint(profile);

// 마이그레이션
import { ProfileMigrator } from '@lostark/shared/types/migration';
const normalizedProfile = ProfileMigrator.normalizeProfile(rawData);
```

## 📊 성능 목표

- **REST API**: p95 ≤ 50ms (캐시 히트 기준)
- **UDP Gateway**: p95 ≤ 10ms (캐시 히트 기준)
- **Fetch Layer**: 싱글플라이트, 서킷브레이커, 지수백오프 재시도

## 🔄 캐시 전략

- **In-memory**: 짧은 TTL (1-5분)
- **Redis**: 중간 TTL (10-30분)
- **Stale-while-revalidate**: 허용
- **강제 리프레시**: 쿼리 파라미터 또는 헤더로 제공

## 🛡️ 안정성

- **Graceful Degrade**: 외부 API 장애 시 캐시 서빙
- **Circuit Breaker**: 외부 API 호출 실패 시 자동 차단
- **Rate Limiting**: REST와 Fetch 분리 관리
- **Error Handling**: 명확한 에러 코드와 메시지

## 📝 TODO

- [ ] V9.0.0 타입 정의 (현재 최신 버전)
- [ ] 공통 베이스 타입 생성
- [ ] 안전한 필드 접근 유틸리티
- [ ] 마이그레이션 헬퍼 (향후 확장용)
- [ ] Fetch Layer 구현
- [ ] REST API 구현
- [ ] UDP Gateway 구현
- [ ] 캐시 시스템 구현
- [ ] 테스트 코드 작성
- [ ] 문서화 완료
