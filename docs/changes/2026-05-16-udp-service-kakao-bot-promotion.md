---
session_id: 20260515-231420
date: 2026-05-16
type: feat+fix
packages: [udp-service, data-service, shared]
breaking: true
---

# udp-service 카카오봇 승격 + armories-normalizer 정정 (2026-05-16)

## 개요

단순 API 조달 역할이던 `packages/udp-service` 를 카카오톡 명령어 포맷팅 봇으로
승격. legacy JavaScript 봇의 25종 명령을 TypeScript 로 이식하고 신규 2종(`!카드`,
`!전장`) 추가. 동시에 `armories-normalizer` 의 두 결함을 정정.

## 런타임 동작 변경 목록

### 1. UDP envelope 계약 변경 (breaking)

- **이전**: server.ts 가 `{id, type, payload, timestamp}` UdpMessage 4종을 기대
  (실제로 수신하는 클라이언트 없음 — dead code)
- **이후**: `{event: 'message', data: KakaoMessage, session: string}` ClientEnvelope
  (zod 검증) 만 처리. 비정합 입력은 silent drop.
- **영향**: 메신저봇R 클라이언트는 이미 새 형식 사용 → 변경 불필요.
  UdpMessage 4종 타입 호출처 없음 확인.
- **ADR**: [ADR-0001](../adr/ADR-0001-udp-envelope-adoption.md)

### 2. 명령 파서·라우터 도입 (신규)

- `content.startsWith(COMMAND_PREFIX)` 검사 → 파싱 → 핸들러 dispatch.
- `COMMAND_PREFIX` 환경변수 (`shared/env.ts` 에 zod 등록, 기본값 `'!'`).
- 미등록 명령 / prefix 없는 메시지 / envelope 파싱 실패 → **silent drop**
  (reply 송신 없음).

### 3. 카카오톡 명령 27종 (신규/이식)

| 그룹 | 명령 | 비고 |
|------|------|------|
| A. armories | `!정보`, `!장비`, `!스킬`, `!보석`, `!각인`, `!돌`, `!수집`, `!착장`, `!아바타` | legacy 이식 |
| A. armories (신규) | `!카드`, `!전장` | 신규 추가 |
| B. characters | `!부캐` | legacy 이식 |
| C. gamecontents | `!프로키온`, `!이벤트`, `!도비스`, `!도가토` | legacy 이식; MySQL 스케줄러 → getCalendar() 대체 |
| D. auctions | `!보석값` | legacy 이식 |
| E. markets | `!비싼유각`, `!전각`, `!유각` | legacy 이식 |
| F. minigame | `!주사위`, `!vs`(alias `!고민`), `!분배금`, `!시너지`, `!랜전카`, `!질문` | legacy 이식; 재련게임 폐기 |
| G. 도움말 | `!도움말`(alias `!명령어`) | registry 자동 생성 |

**!랜전카**: `sender.hash` + KST date 기반 Redis 키(`udp:randomcard:<hash>:<YYYYMMDD>`) 로
하루 1회 고정. TTL = KST 자정까지 남은 초.

### 4. ServiceContext 싱글톤 모델 (신규)

- 기존: 각 UdpWorker 가 독립적으로 서비스 인스턴스 생성 → 캐시 일관성 불보장.
- 이후: `createServiceContext()` 가 `@lostark/data-service` export 싱글톤
  (`armoriesService`, `charactersService`, …) 을 공유. 모든 worker 동일 캐시 히트.
- `packages/data-service/src/index.ts` 에 6개 싱글톤 re-export 추가.

### 5. armories-normalizer: normalizeCards Effects 정정 (breaking)

- **이전**: `normalizeCards` 반환값 = `Array<{slot,name,...}>` (세트 효과 무시)
- **이후**: `{cards: Array<…>, effects: Array<{index,cardEffects[]}>}` 구조.
  `NormalizedCharacterDetail.cards` 타입도 변경.
- OpenAPI dump diff: **no diff** (rest-service 라우트 미구현).
- **ADR**: [ADR-0002](../adr/ADR-0002-normalizer-colosseums-breaking.md)

### 6. armories-normalizer: normalizeColosseums deathmatch 정정 (breaking)

- **이전**: `deathmatch` 필드 항상 undefined (V9 API 에 해당 키 없음).
- **이후**: `deathmatch` 제거. `coOpBattle`, `oneDeathmatch`, `oneDeathmatchRank`
  신규 필드 추가 (optional, V9 실 키 매핑).
- `NormalizedCharacterDetail.colosseums` 인터페이스 동일하게 변경.
- **ADR**: [ADR-0002](../adr/ADR-0002-normalizer-colosseums-breaking.md)

## 검증 통과 목록

| 항목 | 결과 |
|------|------|
| `yarn typecheck` | pass |
| `yarn validate:monorepo` | pass |
| `yarn build` | pass |
| `yarn lint` | pass |
| `yarn test:unit` (전체 81 tests) | pass |
| `yarn test:integration` (armories L2) | pass |
| `yarn workspace @lostark/rest-api dump:openapi` | no diff |

## 관련 문서

- [세션 work-log](../work-log/2026-05-16-udp-service-kakao-bot-promotion/index.md)
- [ADR-0001](../adr/ADR-0001-udp-envelope-adoption.md)
- [ADR-0002](../adr/ADR-0002-normalizer-colosseums-breaking.md)
- [architecture: udp-service 카카오봇 모듈 구조](../architecture/udp-service-kakao-bot.md)
