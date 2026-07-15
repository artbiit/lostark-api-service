---
id: ADR-0004
title: 캘린더 캐시 능동 갱신 — 리셋정렬 단독 트랙 + 비파괴적 forceRefresh 채택
status: accepted
date: 2026-07-15
deciders: [user, design-advisor]
supersedes: null
superseded_by: null
---

# ADR-0004: 캘린더 캐시 능동 갱신 — 리셋정렬 단독 트랙 + 비파괴적 forceRefresh 채택

## Status

**Accepted (설계 확정). 구현은 아직 착수되지 않았다 — 후속 세션에서 진행한다.**

본 문서는 세션 `20260715-145536` 에서 `design-advisor` 가 산출한
`design-calendar-refresh.md`(revision 2, 원본은 gitignore 대상
`.atp/work-session/`아래에만 존재하는 ephemeral 파일)의 결정 부분을 후속 구현
세션이 참조할 권위 산출물로 승격한 것이다. 설계의 실질(플로우·파일 영향 맵·env
스키마·계약 시그니처·검증 포인트)은 원본에서 변경 없이 그대로 옮겼다 — 이 승격
작업 자체는 내용을 재판단하지 않는다.

- 원본(provenance):
  `.atp/work-session/20260715-145536/artifacts/design-calendar-refresh.md`
- 요구사항 근거: `.atp/work-session/20260715-145536/report.md`

## Context

`!프로키온`(procyon) 명령은 `packages/data-service` 의 `gamecontents.calendar`
도메인 캐시(L1 메모리 / L2 Redis / L3 PostgreSQL, soft TTL 6시간)를 통해 공식
로스트아크 Calendar API 를 서빙한다. 현재 구조는 순수 lazy-SWR
(stale-while-revalidate) 이다: L3 soft TTL 만료 이후 **사용자 요청이 와야만**
refetch 를 시도한다.

문제는, 점검(공식 API 503) 중에 도착한 사용자 요청의 refetch 가 실패하면 그 캐시
row 는 다음 성공 요청이 올 때까지 그대로 stale 상태로 남는다는 점이다. 다음 성공
요청이 며칠 뒤라면 stale row 는 그만큼 오래된 채로 남고, `formatProcyon` 은 이
stale row 를 "오늘"의 데이터로 오인해 미래 필터를 적용한 끝에 결과를
전멸시킨다(진행 중 콘텐츠가 있음에도 "금일 주요 콘텐츠는 더이상 없습니다"
오응답).

캘린더는 **주간 리셋 시에만 실질 변경되는 저빈도 데이터**다. 즉 능동 갱신이
필요한 유일한 시점은 "변경이 실제 일어나는" 주간 리셋(수요일) 종료 직후이며, 그
외 구간(between-reset)은 데이터가 정적이므로 기존 lazy-SWR 로 충분하다는 것이 이
설계의 핵심 전제다(사용자 확인).

## Decision

세 가지 결정을 채택한다.

### 결정 1 — 능동 갱신은 리셋정렬 트랙(Track B) 단독. 고정 인터벌 트랙(Track A) 기각

능동(사용자 요청과 독립적인) 갱신 트랙을 **하나만** 둔다: 매주 예상 점검 종료
시각(기본 **수요일 10:10 KST**, 사용자 확정 — 과거 초안의 06:00 추정값 대체)에
위상을 맞춰, `RESET_WINDOW_MINUTES`(기본 90분) 동안
`RESET_RETRY_INTERVAL_SECONDS`(기본 300초=5분) 간격으로 촘촘히 재시도한다. 창
안에 점검이 끝나면 첫 성공 refetch 로 신규 주차 데이터를 hydrate 하고 즉시 창을
종료(다음 주 재예약)한다. 창 안에 안 끝나면(연장 점검) 재시도를 소진하고 다음
주로 넘긴다 — 이 경우 between-reset lazy-SWR 이 이어받으므로 비정상이
아니다(경고 로그만 남기는 정상 degradation).

between-reset 구간의 신선도는 **기존 lazy-SWR**(L3-soft 6h + 사용자 요청 시
refetch)에 위임한다 — 고정 주기(예: 30분마다) 능동 refetch 는 저빈도 정적 구간에
불필요한 상시 업스트림 호출·복잡도로 판단해 기각.

### 결정 2 — 비파괴적 `forceRefresh()` 채택. `invalidate()+refetch` 기각

`invalidateCalendar()` 후 `getCalendarWithCache()` 재호출 방식은 **치명적
결함**이 있다: invalidate 가 L1/L2/L3 를 먼저 삭제하므로, 이후 fetcher 가
점검으로 실패하면 stale row 가 이미 사라져 `fetchWithFallback` 이 stale fallback
대신 `MaintenanceUnavailableError` 를 던진다. 즉 점검 중 스케줄러의 재시도가
**정상 서빙 중이던 SWR stale 캐시를 파괴하는 self-inflicted outage** 를
유발한다(코드 대조로 검증됨).

대신 신규 `forceRefresh()` 를 base class(`DomainCacheManager<T>`)에 추가한다.
**성공했을 때만** L1/L2/L3 를 교체하고, 실패(점검 포함)하면 기존 캐시를 전혀
건드리지 않는다. 이로써 점검 중 재시도가 몇 번 실패하든 기존 SWR stale fallback
은 그대로 유지된다.

이와 별도로 procyon 핸들러는 `result.stale` 을 직접 검사해 "점검 중"임을
정직하게 알리도록 수정한다(상호보완 — 점검창 자체를 없애지는 못하지만 최소한
오도하지는 않는다).

### 결정 3 — 신규 의존성 0

cron 라이브러리 등 신규 의존성을 추가하지 않는다. 순수 `setTimeout` 재귀 +
`unref()` 로 구현 가능함을 확인했다(의존성 선스캔 완료 — 현재 어떤 패키지에도
cron/schedule 계열 의존성 없음, 기존 4개 cleanup 스케줄러가 이미 이 관용구를
사용 중이라 프로젝트 관례에도 부합).

### 플로우 (Track B — 유일한 능동 트랙)

```
[server.ts initializeCacheSystem]
  → setImmediate(warmupDomainCaches)          (기존, 변경 없음)
  → startCalendarRefreshScheduler()            (신규)
       ├─ env.CACHE_GAMECONTENTS_CALENDAR_REFRESH_ENABLED === false
       │    → 로그만 남기고 no-op handle 반환, 종료
       └─ enabled
            └─ scheduleNextResetAlignment()

scheduleNextResetAlignment()
  → delay = computeMsUntilNextReset(now, RESET_DAY, RESET_HOUR_KST, RESET_MINUTE_KST)
  → setTimeout(async () => {
        deadline = now + RESET_WINDOW_MINUTES*60*1000
        while (now < deadline) {
          outcome = forceRefresh(...)             // 비파괴적: 성공시에만 교체
          if (outcome === 'refreshed') break        // self-heal 완료, 창 조기 종료
          await sleep(RESET_RETRY_INTERVAL_SECONDS*1000)
        }
        scheduleNextResetAlignment()                // 다음 주 재예약 (재귀)
     }, delay).unref()
```

`forceRefresh` 3분기: 성공 → `setAllTiers`(L1/L2/L3 전체 교체, staleAge 0 리셋)
→ 창 조기 종료 / 점검(`isMaintenanceError`) → 아무 것도 건드리지 않고 반환,
재시도 지속 / 그 외 에러 → 로그만, 재시도 지속.

**중복 갱신 방지**: 능동 트랙이 Track B 단독이고 재시도 루프가 `sleep` 으로 순차
직렬화되므로 동시 in-flight 겹침은 구조적으로 발생하지 않는다. 다만 lazy-SWR
사용자 요청 경로(`fetchWithFallback`)와 겹칠 수 있어, `forceRefresh` 는 스케줄러
모듈 내부의 단순 boolean `inFlight` 플래그로 자기 자신의 재진입만
가드한다(겹치면 `'skipped-in-flight'` 즉시 반환, 별도 HTTP 호출 없음). 실패 시
캐시를 지우지 않으므로 겹침 자체는 위험하지 않다 — 가드 목적은 업스트림 중복
호출 회피(레이트리밋 100/min 대비 여유는 충분).

### 데이터 모델

DB 스키마 변경 없음. 기존 `domain_cache` 테이블/타입 그대로 사용. `forceRefresh`
성공 경로는 기존 `setAllTiers` 를 그대로 호출.

### 신규 env 스키마 (총 6개)

`packages/shared/src/config/env.ts` 의 `envSchema` z.object 에 기존
`CACHE_GAMECONTENTS_L3_HARD_SECONDS` 다음 줄부터 추가. 전부 `.default(...)`
지정으로 `.env` 부재 시 하위호환. 접두사 `CACHE_GAMECONTENTS_CALENDAR_`
통일(기존 `CACHE_GAMECONTENTS_*` 네이밍 관례 계승). `.env.example` 도 동일
순서·기본값으로 동기화.

| env 키                                                     | 타입/제약                          | 기본값 | 역할                                                              |
| ---------------------------------------------------------- | ---------------------------------- | ------ | ----------------------------------------------------------------- |
| `CACHE_GAMECONTENTS_CALENDAR_REFRESH_ENABLED`              | `z.coerce.boolean()`               | `true` | Track B 스케줄러 전체 토글. `false` 면 타이머 미생성(롤백 스위치) |
| `CACHE_GAMECONTENTS_CALENDAR_RESET_DAY`                    | `z.coerce.number().min(0).max(6)`  | `3`    | 주간 리셋 요일 (0=일 ... 3=수요일)                                |
| `CACHE_GAMECONTENTS_CALENDAR_RESET_HOUR_KST`               | `z.coerce.number().min(0).max(23)` | `10`   | 리셋 목표 KST 시                                                  |
| `CACHE_GAMECONTENTS_CALENDAR_RESET_MINUTE_KST`             | `z.coerce.number().min(0).max(59)` | `10`   | 리셋 목표 KST 분 (목표 = 수요일 10:10 KST)                        |
| `CACHE_GAMECONTENTS_CALENDAR_RESET_WINDOW_MINUTES`         | `z.coerce.number().min(1)`         | `90`   | 리셋 시각부터 재시도를 지속하는 창 길이(분)                       |
| `CACHE_GAMECONTENTS_CALENDAR_RESET_RETRY_INTERVAL_SECONDS` | `z.coerce.number().min(1)`         | `300`  | 창 내 재시도 간격(초, 5분)                                        |

초안의 `CACHE_GAMECONTENTS_CALENDAR_REFRESH_INTERVAL_SECONDS`(고정 인터벌
트랙용)는 Track A 제거로 삭제 — 총 개수는 6개 유지(신규 `RESET_MINUTE_KST` 가 그
자리를 대체).

### 외부 계약

HTTP 라우트 변경 없음. UDP `!프로키온` 명령의 **응답 문자열 분기**만 변경. REST
`/gamecontents/calendar` 응답 envelope(`cache` 필드) 변경 없음 — `forceRefresh`
는 REST 라우트 경로와 무관하게 백그라운드에서만 동작.

```ts
// packages/data-service/src/cache/domain-cache-manager.ts (DomainCacheManager<T> 베이스 클래스에 추가)

export interface CacheRefreshOutcome {
  outcome: 'refreshed' | 'maintenance-skip' | 'error' | 'skipped-in-flight';
  error?: string; // outcome==='error' 일 때만 채움 — 로그/테스트 assertion 용
}

/**
 * TTL 무시하고 즉시 강제 refetch. 성공 시에만 L1/L2/L3 교체.
 * 실패(점검 포함) 시 기존 캐시(및 SWR stale fallback 경로)를 절대 건드리지
 * 않는다 — fetchWithFallback(사용자 요청 경로)과는 별개의 스케줄러 전용
 * 진입점.
 */
async forceRefresh(
  cacheKey: string,           // 대상 캐시 키 (예: gamecontents:calendar:v1)
  fetcher: () => Promise<T>,  // 상위 API 클라이언트 fetch 함수 — 실패를 예외로 판단
): Promise<CacheRefreshOutcome>
```

```ts
// packages/data-service/src/cache/gamecontents-cache-manager.ts (GameContentsCacheManager 에 추가)

/** 스케줄러 전용 — GAMECONTENTS_CALENDAR_CACHE_KEY 고정, forceRefresh 위임. */
async refreshCalendarNow(
  fetcher: () => Promise<GameContentsCalendarResponseV9>, // 스케줄러가 GameContentsClient.getCalendar 바인딩
): Promise<CacheRefreshOutcome>
```

```ts
// packages/data-service/src/cache/calendar-refresh-scheduler.ts (신규 파일)

export interface CalendarRefreshSchedulerHandle {
  stop(): void; // 테스트/graceful shutdown 용 — 예약된 setTimeout clear + 진행 중 reset-align 재시도 루프에 중단 플래그 전달
}

/** rest-service server.ts::initializeCacheSystem 에서 1회 호출. 인자 없음 —
 * 모든 설정은 env.ts 에서 내부적으로 읽는다(gamecontents-cache-manager.ts 의
 * buildTtlFromEnv() 와 동일 관례). enabled=false 면 no-op handle 반환. */
export function startCalendarRefreshScheduler(): CalendarRefreshSchedulerHandle;

/** 순수 함수 — 다음 목표 리셋 시각까지 남은 ms. 테스트에서 now 를 고정 주입해
 * 검증(실시간 타이머 불필요). */
export function computeMsUntilNextReset(
  now: Date, // 기준 시각 — 실 코드는 new Date(), 테스트는 고정값
  resetDayOfWeek: number, // 0=일요일 ... 6=토요일 (env RESET_DAY, 기본 3=수요일)
  resetHourKST: number, // 목표 KST 시(0-23) (env RESET_HOUR_KST, 기본 10)
  resetMinuteKST: number, // 목표 KST 분(0-59) (env RESET_MINUTE_KST, 기본 10)
): number;
```

`startCalendarRefreshScheduler()` 를 무인자로 설계한 이유: 옵션 오버라이드가
필요해지면 그때 `options?: Partial<...>` 를 추가하는 최소 인자 원칙을
따른다(현재는 env 만으로 충분).

procyon 핸들러 3분기 계약:

```ts
// packages/udp-service/src/commands/gamecontents/procyon.ts
handler: async (_args, _message, ctx) => {
  try {
    const result = await ctx.gameContentsService.getCalendarWithCache();
    if (result.stale) {
      // BRANCH: stale
      return '로스트아크 점검 중으로 최신 프로키온 정보를 불러올 수 없습니다.';
    }
    // BRANCH: fresh
    return formatProcyon(result.data as any);
  } catch (err) {
    // BRANCH: maintenance
    ctx.logger.warn({ err: String(err) }, 'procyon command failed');
    return '프로키온 정보를 불러올 수 없습니다.';
  }
};
```

`// BRANCH: <fresh|stale|maintenance>` 주석은 검증 포인트의 전수 AC 앵커로
쓰인다 — 구현 시 반드시 리터럴로 남긴다(양방향 계약, 표현이 바뀌어도 앵커 자체는
grep 가능).

### 파일 영향 맵 (구현 세션 대상)

| 변경 유형 | 경로                                                                    | 역할                                                                                                                           |
| --------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 수정      | `packages/shared/src/config/env.ts`                                     | `CACHE_GAMECONTENTS_CALENDAR_*` 6개 zod 필드 추가 (기존 `CACHE_GAMECONTENTS_L3_HARD_SECONDS` 다음 줄)                          |
| 수정      | `.env.example`                                                          | 위 6개 신규 env 기본값 문서화 (env.ts 와 동기, CLAUDE.md 규칙)                                                                 |
| 수정      | `packages/data-service/src/cache/domain-cache-manager.ts`               | `CacheRefreshOutcome` 타입 + `forceRefresh()` 메서드 추가 (base class)                                                         |
| 수정      | `packages/data-service/src/cache/gamecontents-cache-manager.ts`         | `refreshCalendarNow()` wrapper 추가                                                                                            |
| 신규      | `packages/data-service/src/cache/calendar-refresh-scheduler.ts`         | Track B(리셋정렬) 전용 스케줄러, `computeMsUntilNextReset` pure fn                                                             |
| 수정      | `packages/data-service/src/index.ts`                                    | `startCalendarRefreshScheduler`, `CalendarRefreshSchedulerHandle`, `CacheRefreshOutcome` export 추가                           |
| 수정      | `packages/rest-service/src/server.ts`                                   | `initializeCacheSystem()` 내 warmup 인접 setImmediate 블록에 `startCalendarRefreshScheduler()` 호출 추가                       |
| 수정      | `packages/udp-service/src/commands/gamecontents/procyon.ts`             | 핸들러를 `getCalendarWithCache()` 3분기(fresh/stale/maintenance)로 교체                                                        |
| 신규      | `tests/unit/data-service/cache/calendar-refresh-scheduler.test.ts`      | `computeMsUntilNextReset` 순수함수 + `forceRefresh`/`refreshCalendarNow` fake-adapter 테스트                                   |
| 수정      | `tests/unit/data-service/cache/domain-cache-manager.test.ts`            | `forceRefresh` 성공/점검/기타에러 3케이스 추가                                                                                 |
| 신규      | `tests/unit/udp-service/commands/gamecontents/procyon.test.ts`          | 3분기 회귀 테스트                                                                                                              |
| 불변      | `packages/udp-service/src/formatters/gamecontents.ts` (`formatProcyon`) | 순수 시간상대 뷰 함수 — 시그니처/로직 변경 없음. stale 판정은 handler 책임이지 포맷터 책임이 아니므로 수정 불필요(관심사 분리) |

### 롤아웃 순서 (구현 세션 대상)

1. `env.ts` 에 신규 6개 필드 추가 — 전부 `.default(...)` 지정이므로 기존 `.env`
   파일에 아무 값도 없어도 하위호환.
2. `.env.example` 동기화.
3. `domain-cache-manager.ts` / `gamecontents-cache-manager.ts` 에 메서드 추가 —
   기존 메서드 시그니처/동작 변경 없음(순수 추가), 기존 테스트 회귀 없음.
4. `calendar-refresh-scheduler.ts` 신규 — `server.ts` 에서 명시적으로 호출하기
   전까지는 아무 동작도 하지 않음(import 되어도 부작용 없음).
5. `server.ts` 변경 — 기존 `warmupDomainCaches()` setImmediate 블록 바로 아래에
   `startCalendarRefreshScheduler()` 호출 추가. `try/catch` 로 감싸 스케줄러
   시작 실패가 서버 부팅을 막지 않도록 한다(기존 `initializeCacheSystem` 전체가
   이미 이 관례).
6. `procyon.ts` 핸들러 변경 — 응답 문자열 분기만 바뀌므로 라우트/스키마 영향
   없음. 카카오톡 봇 하위 소비자(LoA-Bot 등)는 응답이 여전히 plain string 이므로
   계약 변경 없음.
7. 순서 의존성: env.ts → domain-cache-manager.ts → gamecontents-cache-manager.ts
   → calendar-refresh-scheduler.ts → index.ts export → server.ts 호출 순으로
   구현하면 각 단계가 독립적으로 typecheck 가능(단방향 의존). procyon.ts 변경은
   이 체인과 독립적으로 병행 가능.

## Consequences

**긍정적**

- 리셋 직후 점검 종료를 self-heal 하여, 다음 사용자 요청까지 stale 이 방치되는
  창을 좁힌다.
- 비파괴적 `forceRefresh` 덕분에 스케줄러 재시도가 실패해도 기존 SWR stale
  fallback 을 절대 파괴하지 않는다(자기파괴 안티패턴 원천 차단).
- 신규 의존성 0, 기존 cleanup 스케줄러 관용구(`setTimeout`+`unref()`) 재사용.
- **롤백 경로**: `CACHE_GAMECONTENTS_CALENDAR_REFRESH_ENABLED=false` 로 즉시
  Track B 비활성화 가능(코드 롤백 불필요, env 토글만으로 이전 동작 —
  lazy-SWR-only — 로 복귀). procyon 핸들러 변경은 되돌리려면 git revert 필요(env
  토글 없음 — 3분기 자체가 버그 수정 본체이므로 토글 대상이 아님).

**부정적 / 위험**

- 연장 점검(재시도 창 소진) 시 신규 주차 데이터의 능동 hydrate 는 다음 주까지
  미뤄진다 — 다만 between-reset lazy-SWR 이 이어받으므로 영구 stale 은
  아니다(경고 로그만 남는 정상 degradation).
- `nowKST` 계산 로직이 `calendar-refresh-scheduler.ts` 에 로컬 복제된다(§ 대안
  비교 참조) — 두 곳에 동일 로직 존재는 문서화된 중복이며, `@lostark/shared`
  로의 승격은 본 결정 스코프 밖 후속 과제.
- 리셋 시각(수요일 10:10 KST)은 사용자 확정값이며, 실제 점검 종료 시각이
  구조적으로 변경되면(예: 점검 시간대 정책 변경) env 재설정이 필요하다.

**검증 계획** (구현 세션의 `verification-advisor` 가 점검할 AC. L 레벨은
`docs/development/verification-strategies.md` 매핑 기준):

- AC-1 (L1+L3): `forceRefresh` 성공 경로 — fake fetcher 성공 시 `setAllTiers` 가
  호출되어 L1/L2/L3 전 계층에 반영됨.
- AC-2 (L1+L3): `forceRefresh` 점검 실패 경로 — `isMaintenanceError` 매칭 에러
  발생 시 기존 L1/L2/L3 값이 **변경되지 않음**(호출 전/후
  `redis.store`/`db.rows` snapshot 동일성 비교).
- AC-3 (L1): `computeMsUntilNextReset` 순수함수 — 고정 `now` 입력 4케이스 (목표
  요일 이전 / 당일 목표시각 이전 / 당일 목표시각 이후 / 목표 시각의 분 경계
  직전) 에서 반환 ms 검증.
- AC-4 (L1): `startCalendarRefreshScheduler()` 가
  `CACHE_GAMECONTENTS_CALENDAR_REFRESH_ENABLED=false` 일 때 타이머를 전혀
  생성하지 않고 no-op handle 반환.
- AC-5 (L1, 버그 재현 회귀): `procyon.ts` 핸들러가 `result.stale === true` 일 때
  "로스트아크 점검 중으로 최신 프로키온 정보를 불러올 수 없습니다." 반환 (수정
  전에는 "금일 주요 콘텐츠는 더이상 없습니다." 를 반환했음을 revert 시 실패로
  증명).
- AC-6 (L1, 회귀 없음): `result.stale === false` 이고 `formatProcyon` 이 빈
  결과를 내는 정상 케이스에서 "금일 주요 콘텐츠는 더이상 없습니다." 그대로 반환
  — AC-5 수정이 정상 케이스를 오염시키지 않음을 보증.
- AC-7 (L1): `getCalendarWithCache()` 가 `MaintenanceUnavailableError` 를
  throw(점검 + stale row 도 없음)할 때 핸들러가 catch 하여 "프로키온 정보를
  불러올 수 없습니다." 그대로 반환(기존 메시지 보존).
- AC-8 (L1+L4+수동 스모크): `env.ts` 신규 필드 6개가 전부 `.default(...)` 를
  가져 `.env` 값 부재 시에도 `parseEnv()` 가 throw 하지 않음.
- AC-9 (전수):
  `grep -c 'CACHE_GAMECONTENTS_CALENDAR_' packages/shared/src/config/env.ts`
  == 6.
- AC-10 (전수, 양방향 계약):
  `grep -c '// BRANCH:' packages/udp-service/src/commands/gamecontents/procyon.ts`
  == 3.
- AC-11 (전수):
  `grep -c '^test(' tests/unit/udp-service/commands/gamecontents/procyon.test.ts`
  == 3.

## Alternatives Considered

| 안                                                                 | 이유로 기각/채택                                                                                                                                                      | 채택? |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| between-reset 신선도: 고정 인터벌 능동 refetch(Track A, 기본 30분) | 캘린더는 주간 리셋 시에만 실질 변경되는 저빈도 데이터 — 정적 구간을 30분마다 능동 refetch 하는 것은 불필요한 상시 업스트림 호출·복잡도                                | 기각  |
| between-reset 신선도: 기존 lazy-SWR 위임                           | 신규 코드 0, 저빈도 정적 구간에 적합. 리셋 외 시점 장애 시 다음 사용자 요청까지 stale 지속되나 procyon 점검메시지 상호보완으로 오도는 방지됨                          | 채택  |
| `invalidateCalendar()` 후 `getCalendarWithCache()` 재호출          | **치명적 결함**: invalidate 가 L1/L2/L3 를 먼저 삭제 → 점검으로 실패 시 stale row 소멸 → 정상 서빙 중이던 SWR stale 캐시를 파괴하는 self-inflicted outage             | 기각  |
| 신규 `forceRefresh()` — 성공시에만 교체                            | 비파괴적. 점검 중에도 기존 stale row 유지 → SWR 안전망 그대로 작동                                                                                                    | 채택  |
| 리셋정렬 재시도: 지수 백오프                                       | 점검 종료 시각 불확실성이 이미 `RESET_WINDOW_MINUTES` 로 흡수되므로 이득이 적고, 테스트 결정성이 떨어짐                                                               | 기각  |
| 리셋정렬 재시도: 고정 간격(`RESET_RETRY_INTERVAL_SECONDS`)         | 결정적, 테스트 쉬움, 신규 의존성 없음                                                                                                                                 | 채택  |
| KST 계산: `udp-service/formatters/kakao.ts::nowKST` 재사용         | rest-service/data-service → udp-service 방향 의존이 package.json 상 존재하지 않음(확인 완료). 새 의존 엣지를 만드는 건 스코프 밖의 패키지 경계 변경                   | 기각  |
| KST 계산: `calendar-refresh-scheduler.ts` 내 로컬 복제             | 의존 엣지 불변, 10줄 미만 순수함수라 복제 리스크 낮음. 두 곳에 동일 로직 존재(문서화된 중복) — `nowKST` 를 `@lostark/shared` 로 승격하는 리팩터는 스코프 밖 후속 과제 | 채택  |
| 스케줄러 라이브러리(node-cron 등) 도입                             | 의존성 선스캔 결과 현재 어떤 패키지에도 cron/schedule 계열 의존성 없음 — 신규 도입은 프로젝트 관례(순수 `setInterval`/`setTimeout`+`unref()`) 이탈                    | 기각  |
| 순수 `setTimeout` 재귀(다음 목표시각 재계산)                       | 신규 의존성 0, 기존 cleanup 스케줄러와 동일 관용구, `unref()` 로 프로세스 종료 방해 없음, 주 1회 위상-정렬에 `setInterval`(고정 주기)보다 적합                        | 채택  |

## Open Questions

- **OQ-2**: calendar API 가 반환하는 `StartTimes` 가 "당일 미래" 이벤트를
  요일-반복 스케줄로서 항상 포함하는지는 API 응답 구조를 코드로만 봐서는 단정
  불가 — 실측/운영 확인 필요. 능동 갱신이 리셋정렬(Track B) 단독으로 정리된
  뒤로는 이 미확인이 능동 갱신 유효성에는 영향이 없다: 리셋 직후 refetch 는 신규
  주차 데이터를 가져오므로 fresh by definition 이다. 이 항목의 잔존 영향은 오직
  procyon 의 stale 판정/표시 정확성에 국한되며, 그 경로도
  `CacheLookupResult.stale` 메타에만 의존하고 `StartTimes` 내용에는 의존하지
  않으므로 설계 유효성을 막지 않는다.
- **OQ-3**: staleAge≈3일 정체가 발생한 실제 반복 빈도/원인(점검 창 전용 vs
  저트래픽 구간과의 우연한 겹침)은 실패 로그가 영속화되지 않아 특정 불가.
  엔드포인트별 실패 집계 로깅(캘린더 특정 vs 광역 장애 판별)은 본 결정 스코프 밖
  — 별도 관측성 백로그 항목으로 이관 권장.

## References

- 원본 설계(provenance):
  `.atp/work-session/20260715-145536/artifacts/design-calendar-refresh.md`
  (revision 2)
- 요구사항: `.atp/work-session/20260715-145536/report.md`
- 관련 아키텍처:
  [udp-service-kakao-bot.md](../architecture/udp-service-kakao-bot.md) (procyon
  명령의 현재 라우팅·의존 구조)
- 이전 ADR: [ADR-0001](ADR-0001-udp-envelope-adoption.md),
  [ADR-0002](ADR-0002-normalizer-colosseums-breaking.md),
  [ADR-0003](ADR-0003-abyss-guardian-removal.md)
- 검증 사다리: `docs/development/verification-strategies.md`
