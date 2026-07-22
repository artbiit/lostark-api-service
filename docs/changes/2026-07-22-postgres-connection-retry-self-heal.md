---
session_id: 20260722-095232
date: 2026-07-22
type: fix
scope: shared, data-service
---

# 변경: PostgreSQL 연결 재시도·자동 회복 결함 수정

세션 `20260722-095232` 에서 반영된 구현 변경 이력. 인시던트(세션
`20260722-091754`, `!프로키온` 응답 실패)의 근본 결함 — 부팅 시점 PostgreSQL
연결 확립 레이스 시 영구 degraded(메모리 전용, L3 캐시 영구 skip) — 를 수정.
정책 결정 자체는
[ADR-0005](../adr/ADR-0005-postgres-connection-retry-self-heal.md) 참조, 이
문서는 실제 변경된 파일/테스트만 기록한다.

## 변경 유형

| 유형 | 범위                                                                      |
| ---- | ------------------------------------------------------------------------- |
| fix  | `PgClient` 연결 생명주기 — 부팅 재시도 + 헬스체크 self-heal + lazy 재연결 |
| feat | env 5종 신규 등록(하위호환 default)                                       |
| test | 회귀 테스트 신규 2건(부팅 레이스 래치 회복, lazy single-flight)           |

## 수정된 파일

| 파일                                 | 변경 내용                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared/src/db/postgres.ts` | `constructor(pool?: Pool)` DI 포인트 추가, 신규 `connectWithRetry()`/`ensureConnected()`(private)/`startHealthCheck()`/`stopHealthCheck()`, 4개 가드(`query`/`execute`/`transaction`/`getConnection`)를 `ensureConnected()` 경유로 교체, 모듈 private `sleep()` 헬퍼 추가. `connect()`/`disconnect()`/`isConnectedToPostgres()`/`getStats()`/`getPoolStatus()` 계약 불변 |
| `packages/shared/src/config/env.ts`  | zod 스키마에 `DB_CONNECT_RETRY_MAX_ATTEMPTS`/`DB_CONNECT_RETRY_INITIAL_DELAY_MS`/`DB_CONNECT_RETRY_MAX_DELAY_MS`/`DB_HEALTH_CHECK_ENABLED`/`DB_HEALTH_CHECK_INTERVAL_MS` 5건 추가 + `defaultConfig` 동기화                                                                                                                                                               |
| `.env.example`                       | DB 섹션에 신규 5키 기본값 문서화                                                                                                                                                                                                                                                                                                                                         |
| `packages/data-service/src/index.ts` | `initializePostgres()` 가 `connect()` 대신 `connectWithRetry()` 호출 + `finally` 블록에서 `startHealthCheck()`. `disconnectPostgres()` 가 `disconnect()` 전에 `stopHealthCheck()` 선행 호출                                                                                                                                                                              |

## 신규 파일

| 파일                                       | 설명                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/unit/shared/postgres-retry.test.ts` | `FakePool` DI 기반 회귀 2건 — "부팅 레이스 래치 회복"(2회 실패 후 3회째 성공), "lazy single-flight"(동시 query 5회 → connect() 1회만 발생) |

## 무변경(확인됨)

| 파일                                  | 사유                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `packages/rest-service/src/server.ts` | 이미 `stop()` 내부에서 `disconnectPostgres()` 호출 — 헬스체크 정리가 자동 배선됨 |
| `packages/udp-service/src/server.ts`  | 동일 이유로 무변경                                                               |
| `scripts/migrate.ts`                  | `pgClient.connect()` 직접 호출 유지 — CLI 단발 fail-fast 의도 보존               |

## 호환성 영향

| 항목                                                   | 영향                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| 기존 `.env` 파일                                       | 영향 없음 — 신규 5키 전부 `.default()`                                     |
| REST/UDP 서버 부팅 경로                                | 변경 없음(파일 diff 0줄) — `connectWithRetry`/헬스체크가 내부적으로 배선됨 |
| `query`/`execute`/`transaction`/`getConnection` 호출부 | 에러 메시지(`'PostgreSQL not connected'`) 동일 — 호출부 무변경             |
| DB 스키마                                              | 변경 없음                                                                  |
| REST/OpenAPI 계약                                      | 변경 없음                                                                  |

## 롤백

코드 revert 불필요. `DB_HEALTH_CHECK_ENABLED=false` +
`DB_CONNECT_RETRY_MAX_ATTEMPTS=1` env 설정만으로 수정 이전 동작(단발 connect,
헬스체크 없음)으로 즉시 복귀 가능. 상세:
[ADR-0005](../adr/ADR-0005-postgres-connection-retry-self-heal.md) 의 "롤백
경로" 절 참조.

## 검증

| 항목                    | 결과                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| L1 build                | PASS                                                                                                            |
| L1 typecheck            | PASS (최초 typecheck 단독 실행은 composite project reference stale `.d.ts` 로 오탐 — build 선행 후 재판정 PASS) |
| L1 test:unit            | PASS (273/273, `postgres-retry.test.ts` 2건 포함)                                                               |
| L2/L3                   | scope 미매칭 — 실행 안 함 (client/normalizer/cache-flow 변경 없음)                                              |
| 운영 스모크(미완, 권장) | 실 DB 지연 기동 레이스 + 런타임 순단 self-heal 관측은 사용자 환경 확인 필요                                     |

## 부수 발견 (이번 스코프 밖)

- `docs/maintenance/deployment.md` 가 운영 DB 를 로컬 기본값 이름으로 기술하는
  문서 드리프트 — 별도 정정 필요.
- REST `calendarRefreshScheduler` 의 `stop()`/`close()` 정리 누락 기존 비일관성
  — 이번 결정은 이 함정을 답습하지 않도록 배선했으나, 기존 결함 자체는 미해결.

## 관련 문서

- [ADR-0005: PostgreSQL 연결 생명주기 — 재시도·self-heal·single-flight 채택](../adr/ADR-0005-postgres-connection-retry-self-heal.md)
- [architecture: system-overview](../architecture/system-overview.md) (안정성
  섹션)
