---
id: ADR-0005
title:
  PostgreSQL 연결 생명주기 — 부팅 재시도 + 백그라운드 self-heal + lazy 재연결
  single-flight 채택
status: accepted
date: 2026-07-22
deciders: [user, design-advisor]
supersedes: null
superseded_by: null
---

# ADR-0005: PostgreSQL 연결 생명주기 — 부팅 재시도 + 백그라운드 self-heal + lazy 재연결 single-flight 채택

## Status

**Accepted. 구현 완료, 검증 통과(세션 `20260722-095232`).**

- 인시던트 조사(provenance, ephemeral — `.atp/work-session/` gitignore 대상):
  `.atp/work-session/20260722-091754/artifacts/incident-pg-connection.md`
- 설계(provenance): `.atp/work-session/20260722-095232/implementation/design.md`
- 검증: `.atp/work-session/20260722-095232/verification.md` (overall: pass)

## Context

운영 배포 환경에서 `!프로키온` 명령이 "프로키온 정보를 불러올 수 없습니다."(짧은
메시지, 점검 중 fallback 캐시조차 없을 때의 분기)를 반환하는 인시던트가
발생했다. 조사 결과 표면 증상은 "점검(공식 API 503) + L3(PostgreSQL) fallback
row 부재"의 우연한 겹침이었지만, **근본 결함은 PostgreSQL 연결 생명주기 자체**에
있었다.

### 근본 결함

`packages/shared/src/db/postgres.ts` 의 `PgClient` 는 연결을 다음과 같이
관리했다:

- `connect()` — 단발 시도. 성공 시 `isConnected=true`, 실패 시
  `isConnected=false` + throw.
- `isConnected` — **단방향 래치**. `connect()` 성공에서만 `true` 로 바뀐다. pool
  `'error'` 이벤트 핸들러는 로그만 남기고 플래그를 바꾸지 않는다.
- `query()`/`execute()`/`transaction()`/`getConnection()` — 진입부에서
  `if (!isConnected) throw 'PostgreSQL not connected'` 가드만 있고, 재연결
  경로가 전혀 없다.
- `packages/data-service/src/index.ts::initializePostgres()` 는 `connect()` 를
  **1회만** 호출한다. 부팅 후 다시 `connect()` 를 부르는 경로가 없다.

이 구조는 두 상황에서 비대칭적으로 동작한다:

- 부팅 **후** 순단(pg 잠깐 끊김) — node-pg 풀이 다음 획득 시 새 커넥션으로
  투명하게 복구, `isConnected` 는 `true` 로 유지되어 문제 없음.
- 부팅 **시점** 연결 확립 실패 — 래치가 `false` 로 굳고 다시 `true` 가 될 경로가
  없어 **영구 degraded**(메모리 전용, L3 캐시 영구 skip)로 남는다. 프로세스
  재시작 전까지 스스로 회복하지 못한다.

실제로 2026-07-20 11:30(KST) 인프라+앱 동시 재기동 시
`"the database system is starting up"` 레이스로 이 래치가 굳어, 약
2일간(07-20~07-22) L3 캐시가 죽은 채로 운영됐다. 이 창에서 캘린더 캐시 row 가
soft 만료 후 점검과 겹치자 stale fallback 조차 없어 사용자에게 오응답이
노출됐다.

대조적으로 `packages/shared/src/db/redis.ts` 는 node-redis 의 소켓 자동재연결

- `reconnectAttempts` 를 이미 보유한다 — **pg 만 재시도/회복 로직이 없었다.**

이 결함은 코드 한 줄 수정이 아니라 **PgClient 의 연결 관리 정책 자체**를 바꾸는
결정이므로, 단순 `changes/` 항목이 아니라 ADR 로 남긴다 — 향후 `shared/db/`
하위에 새 클라이언트(예: 다른 DB 드라이버)를 추가하거나 이 정책을 다시 바꿀 때
참조할 기준이 되어야 한다.

## Decision

기존 `connect()` 의 계약(단발 시도·성공/실패 시 명확한 throw)은 그대로 보존한
채, 그 위에 3개 계층을 추가한다. 신규 의존성은 0 — 기존 `pg`/`zod` 만 사용한다.

### 결정 1 — 부팅 재시도: `connectWithRetry()`

`connect()` 를 지수백오프로 감싸 bounded 재시도하는 신규 public 메서드를
추가한다. `initializePostgres()` 가 `connect()` 대신 이를 호출한다.

```
attempt=1: connect() 성공? → return
           실패 → attempt < maxAttempts? sleep(delay) → delay=min(delay*2,maxDelay) → attempt+1
attempt=maxAttempts 도달 & 실패 → 원본 error throw
```

REST/UDP 양쪽 부팅부(`initializeCacheSystem()`/`initialize()`)는 이미
`connectWithRetry()` 를 `Promise.race`/타임아웃으로 감싸고 있어 — "루저"
프로미스는 취소되지 않으므로, 외부 타임아웃이 지나 "연결 실패, 계속 진행" 로그가
찍힌 뒤에도 `connectWithRetry()` 는 백그라운드에서 계속 재시도하다가 성공하면
`migrationManager.migrate()` 까지 마친다. 이것이 "지연 기동 레이스 흡수"의 실제
메커니즘이다.

**대안**: `connect()` 자체에 재시도 내장 — 기각. `scripts/migrate.ts` 의
fail-fast 단발 계약(CLI 스크립트가 지연을 원치 않음)을 깨뜨린다.
`initializePostgres()` 루프에서 재시도 — 기각. 재시도 로직이 data-service 로
새어나가 UDP 쪽에 별도 구현이 필요해진다.

### 결정 2 — 백그라운드 self-heal: `startHealthCheck()`/`stopHealthCheck()`

`PgClient` 내부에 `setInterval`(+`unref()`) 타이머를 두고, 미연결 상태일 때만
주기적으로 재연결을 시도한다.

- `startHealthCheck()` — `DB_HEALTH_CHECK_ENABLED=false` 면 타이머를 생성하지
  않고 로그만 남긴다. 이미 실행 중이면 idempotent.
- `stopHealthCheck()` — 타이머가 있으면 clear.
- 배선: `initializePostgres()` 의 `finally` 블록에서 `startHealthCheck()`
  (성공/실패 무관 항상 기동), `disconnectPostgres()` 가 `pgClient.disconnect()`
  이전에 `stopHealthCheck()` 를 먼저 호출.
- `initializePostgres()`/`disconnectPostgres()` 는 이미 REST
  (`packages/rest-service/src/server.ts::stop()`)·UDP
  (`packages/udp-service/src/server.ts::stop()`) 양쪽에서 호출되고 있으므로,
  **두 서버 파일은 한 줄도 변경할 필요가 없다** — 기존
  `calendarRefreshScheduler` 의 `stop()`/`close()` 정리 누락 패턴을 자연스럽게
  회피한다.

**대안**: data-service 에 신규 scheduler 파일(calendar 리셋정렬 스케줄러 패턴
답습) — 기각. `PgClient` 내부 상태(`isConnected`)에 접근하려면 public API 노출이
필요하고, REST/UDP 서버에 필드+`stop()` 배선을 다시 추가해야 해 정리 누락 위험을
재답습한다.

### 결정 3 — lazy 재연결 single-flight: `ensureConnected()`

`query()`/`execute()`/`transaction()`/`getConnection()` 4개 가드와 헬스체크 tick
이 공유하는 단일 재연결 진입점을 신규 private 메서드로 둔다.
`private reconnecting: Promise<void> | null` 필드로 동시 호출을 하나의 in-flight
재연결로 합친다.

```
isConnected===true  → 즉시 return (no-op)
isConnected===false:
  reconnecting 없음 → connect() 호출 → reconnecting 에 대입 → .finally(reconnecting=null)
  reconnecting 있음 → 그 Promise 를 그대로 await (신규 connect() 미발생)
재확인 후 여전히 false → new Error('PostgreSQL not connected') throw (원 계약 보존)
```

동시 N개 호출이 모두 `isConnected===false` 시점에 진입해도 실제 `connect()`
호출은 1회만 발생한다.

**대안**: 4개 가드마다 개별 `reconnecting` 플래그 — 기각. 4배 중복 상태,
헬스체크 tick 과 별도 경로라 이중 `connect()` 발생 가능.

### 신규 env 5종 (하위호환 `.default`)

`packages/shared/src/config/env.ts` zod 스키마 + `defaultConfig` +
`.env.example` 3곳에 동일 값으로 동기 등록.

| env 키                              | 기본값  | 역할                                               |
| ----------------------------------- | ------- | -------------------------------------------------- |
| `DB_CONNECT_RETRY_MAX_ATTEMPTS`     | `5`     | `connectWithRetry()` 최대 시도 (1=재시도 비활성화) |
| `DB_CONNECT_RETRY_INITIAL_DELAY_MS` | `500`   | 최초 재시도 대기(ms), 이후 2배씩 증가              |
| `DB_CONNECT_RETRY_MAX_DELAY_MS`     | `10000` | 지수백오프 지연 상한(ms)                           |
| `DB_HEALTH_CHECK_ENABLED`           | `true`  | 헬스체크 self-heal 토글 (false=롤백)               |
| `DB_HEALTH_CHECK_INTERVAL_MS`       | `30000` | 헬스체크 재연결 시도 간격(ms)                      |

### 테스트 DI: `constructor(pool?: Pool)`

`PgClient` 생성자에 optional `Pool` 주입 포인트를 추가해 결정적 회귀
테스트(`FakePool`)를 가능하게 한다. 미전달 시 기존과 동일하게 env 기반 `Pool` 을
생성하므로 `pgClient = new PgClient()` 싱글턴과 `scripts/migrate.ts` 는 100%
하위호환(무인자 호출 유지).

### 롤백 경로

코드 롤백 없이 `DB_HEALTH_CHECK_ENABLED=false` +
`DB_CONNECT_RETRY_MAX_ATTEMPTS=1` env 설정만으로 결함 수정 이전 동작(단발
`connect()`, 헬스체크 없음)으로 즉시 복귀 가능. 완전 롤백 시 아래 4개 수정 파일
revert.

### 스코프 밖 (명시적으로 손대지 않음)

- Redis 재연결/회복 로직 — node-redis 가 이미 자동재연결 보유, 요구사항에서
  명시적으로 제외.
- `getStats()`/`getPoolStatus()` 중복 로직 정리 — 별개 기존 이슈.
- REST `calendarRefreshScheduler` 의 `stop()`/`close()` 비일관성 자체 — 별개
  기존 결함. 단, 본 결정이 추가하는 헬스체크 정리는 `disconnectPostgres()`
  경유로 배선해 이 함정을 스스로 답습하지 않는다.
- `docs/maintenance/deployment.md` 가 운영 DB 를 로컬 기본값 이름으로 기술하는
  문서 드리프트 — 인시던트 조사 중 발견된 별개 항목, 정정 필요(후속 과제).

## Consequences

**긍정적**

- 부팅 시점 DB 지연 기동 레이스가 더 이상 영구 degraded 로 이어지지 않는다 —
  bounded 지수백오프로 흡수.
- 런타임 중 연결이 끊겨도 프로세스 재시작 없이 최대
  `DB_HEALTH_CHECK_INTERVAL_MS` (기본 30초) 이내 self-heal.
- `query`/`execute`/`transaction`/`getConnection` 호출이 미연결 상태에서도 즉시
  포기하지 않고 1회 lazy 재연결을 시도하며, 동시 다발 호출도 단일 재연결로
  수렴(stampede 없음).
- 신규 의존성 0. 기존 `pg`/`zod` 관용구만 사용. REST/UDP 서버 파일 변경 0줄.
- `connect()`/`disconnect()`/`isConnectedToPostgres()`/`getStats()`/
  `getPoolStatus()` 계약 불변 — 기존 호출부(`database-cache.ts`,
  `database-domain-cache.ts` 등) 무영향.
- 롤백은 env 토글만으로 가능, 코드 revert 불필요.

**부정적 / 위험**

- `PgClient` 가 "연결 관리 + 헬스체크 스케줄러" 두 책임을 갖게 됐다(응집도 높은
  상태 공유라 수용 가능하나, 향후 책임 분리 리팩터 여지는 남는다).
- 실 운영 환경에서의 "인프라+앱 동시 재시작 시 pg 지연 기동 레이스" 스모크는
  `FakePool` DI 기반 결정적 회귀로만 검증됐고, 실 DB 재시작 타이밍 자체의 운영
  확인은 아직 이관 상태(아래 참조).

## 검증

세션 `20260722-095232` 검증 결과(overall: pass):

- L1 build → typecheck → test:unit 전체 그린(273/273, 신규
  `tests/unit/shared/postgres-retry.test.ts` 2건 — "부팅 레이스 래치 회복",
  "lazy single-flight" — 포함).
- 최초 typecheck 단독 실행은 monorepo composite project reference 의 stale
  `.d.ts` 로 TS2339 오탐을 냈다 — `yarn build` 선행 후 재판정 시 소멸(코드 결함
  아님, 검증 절차 순서 문제).
- 운영 스모크 미완(사용자 확인 권장): 실 DB "database system is starting up"
  지연 기동 레이스에서 `connectWithRetry()` 백오프 후 연결 성공 + 헬스체크 시작
  로그 관측, 런타임 순단 후 30초 내 self-heal 재연결 로그 관측.

## Alternatives Considered

| 결정 축            | 채택안                                                     | 기각안                                                                                                        |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 재시도 위치        | 신규 `connectWithRetry()`, `connect()` 순수 유지           | `connect()` 자체 내장(migrate.ts fail-fast 파괴) / `initializePostgres()` 루프(재사용성 저하)                 |
| 헬스체크 배치      | `PgClient` 내부 `setInterval`+`unref()`                    | data-service 신규 scheduler 파일(REST 정리누락 함정 재답습 위험) / `setTimeout` 재귀(고정 주기 폴링엔 과설계) |
| single-flight 구현 | `ensureConnected()` 공용 진입점 + 단일 `reconnecting` 필드 | 4개 가드별 개별 플래그(중복 상태, 이중 connect 가능)                                                          |
| env 이름/기본값    | 5키(`MAX_ATTEMPTS=1` 이 곧 재시도 비활성화와 동치)         | 재시도 on/off 별도 6번째 토글(중복)                                                                           |
| 테스트 DI          | `constructor(pool?: Pool)` optional 주입                   | reflection 우회(불필요하게 우회적)                                                                            |

## References

- 인시던트 조사(provenance, ephemeral):
  `.atp/work-session/20260722-091754/artifacts/incident-pg-connection.md`
- 설계(provenance): `.atp/work-session/20260722-095232/implementation/design.md`
- 검증: `.atp/work-session/20260722-095232/verification.md`
- 변경 이력:
  [changes/2026-07-22-postgres-connection-retry-self-heal.md](../changes/2026-07-22-postgres-connection-retry-self-heal.md)
- 관련 아키텍처: [system-overview.md](../architecture/system-overview.md)
  (안정성/캐시 계층 구성)
- 관련 ADR(같은 세션 계열 아님, 인접 캐시 결정):
  [ADR-0004](ADR-0004-calendar-cache-reset-aligned-refresh.md) — 이번 결정과
  별개 계층(캐시 refetch 정책 vs 연결 생명주기)이나 둘 다 "점검 중
  self-inflicted outage 방지"라는 동일 문제의식을 공유한다.
