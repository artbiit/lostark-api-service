# Lost Ark API Service - 3-Service Architecture

<!-- @cursor-change: 2025-01-27, v1.0.1, 문서 최신화 규칙 적용 -->

## 📋 개요

Lost Ark API Service는 3서비스 아키텍처를 기반으로 한 TypeScript + ESM 모노레포
구조입니다.

## 🏗️ 아키텍처 개요

### 3-Service 구조

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UDP Service   │    │   REST Service  │    │   Data Service  │
│                 │    │                 │    │                 │
│ • UDP 메시지     │    │ • REST API      │    │ • 외부 API 호출  │
│   변환/전송      │    │   제공          │    │ • 데이터 정규화  │
│ • 기존 규격      │    │ • Fastify 기반  │    │ • 캐싱          │
│   유지          │    │ • 정규화 데이터  │    │ • 스케줄러      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 아키텍처 설계 원칙

**서비스 (Services)**

- **독립성**: 각 서비스는 독립적으로 실행 가능
- **단일 책임**: 각 서비스는 명확한 하나의 역할만 담당
- **병렬 구조**: REST Service와 UDP Service는 Data Service에 병렬로 의존
- **프로토콜 분리**: 각 서비스는 고유한 통신 프로토콜 사용

**모듈 (Modules)**

- **재사용성**: 여러 서비스에서 공통으로 사용
- **관심사 분리**: 타입, 설정, 유틸리티 등 기능별 분리
- **중앙 관리**: `shared` 패키지로 통합 관리
- **버전 관리**: API 버전별 타입 정의 체계화

### 서비스별 상세 역할

**Data Service**

- **외부 API 통신**: Lost Ark Developer API 호출
- **데이터 정규화**: 외부 API 응답을 내부 표준 형식으로 변환
- **캐시 관리**: Redis/In-memory 캐시를 통한 성능 최적화
- **스케줄링**: 주기적 데이터 수집 및 업데이트
- **장애 처리**: 서킷브레이커, 재시도 로직

**REST Service**

- **HTTP API 제공**: 표준 REST API 엔드포인트
- **Fastify 기반**: 고성능 Node.js 웹 프레임워크 활용
- **미들웨어 체인**: 인증, 로깅, CORS, 레이트리밋
- **버전 관리**: API 버전별 라우트 분리
- **응답 캐싱**: ETag, Cache-Control 헤더 관리

**UDP Service**

- **초저지연 전송**: UDP 프로토콜을 통한 실시간 데이터 전송
- **메시지 변환**: 정규화된 데이터를 UDP 메시지 형식으로 변환
- **Lock-free 큐**: 고성능 메시지 처리
- **워커 풀**: 병렬 메시지 처리
- **기존 호환성**: 레거시 시스템과의 메시지 규격 유지

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
│   ├── data-service/              # Data Service
│   │   ├── src/
│   │   │   ├── clients/           # Lost Ark API 클라이언트
│   │   │   ├── normalizers/       # 데이터 정규화
│   │   │   ├── cache/             # 캐시 관리
│   │   │   ├── scheduler.ts       # 스케줄러
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── rest-service/              # REST Service
│   │   ├── src/
│   │   │   ├── routes/            # Fastify 라우트
│   │   │   │   └── v1/            # API 버전별
│   │   │   ├── middleware/        # 미들웨어
│   │   │   ├── plugins/           # Fastify 플러그인
│   │   │   └── server.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── udp-service/               # UDP Service
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

현재 최신 버전인 Lost Ark API V9.0.0부터 시작하여 타입 안전성과 변경 추적을
확보합니다.

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
  HonorPoint: number; // V9에서 추가
  CombatPower: number; // V8에서 추가
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
      Decorations: data.Decorations || [],
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

- **REST Service**: p95 ≤ 50ms (캐시 히트 기준)
- **UDP Service**: p95 ≤ 10ms (캐시 히트 기준)
- **Data Service**: 싱글플라이트, 서킷브레이커, 지수백오프 재시도

## 🔄 캐시 전략

- **In-memory**: 짧은 TTL (1-5분)
- **Redis**: 중간 TTL (10-30분)
- **Stale-while-revalidate**: 허용
- **강제 리프레시**: 쿼리 파라미터 또는 헤더로 제공
- **능동 캐시 refetch 는 비파괴 `forceRefresh` 사용, `invalidate()+refetch`
  금지**: invalidate 가 L1/L2/L3 를 먼저 삭제하므로 점검 중 refetch 실패 시 SWR
  stale fallback 을 스스로 파괴하는 self-inflicted outage 가 된다. 능동 갱신은
  성공 시에만 캐시를 교체하는 `forceRefresh` 로만 수행한다
  ([ADR-0004](../adr/ADR-0004-calendar-cache-reset-aligned-refresh.md)).

## 🛡️ 안정성

- **Graceful Degrade**: 외부 API 장애 시 캐시 서빙
- **Circuit Breaker**: 외부 API 호출 실패 시 자동 차단
- **Rate Limiting**: REST와 Data Service 분리 관리
- **Error Handling**: 명확한 에러 코드와 메시지

## 📝 TODO

- [ ] V9.0.0 타입 정의 (현재 최신 버전)
- [ ] 공통 베이스 타입 생성
- [ ] 안전한 필드 접근 유틸리티
- [ ] 마이그레이션 헬퍼 (향후 확장용)
- [ ] Data Service 구현
- [ ] REST Service 구현
- [ ] UDP Service 구현
- [ ] 캐시 시스템 구현
- [ ] 테스트 코드 작성
- [ ] 문서화 완료
