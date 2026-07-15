/**
 * @cursor-change: 2026-07-15, ADR-0004, gamecontents.calendar 리셋정렬 능동 갱신 (Track B)
 *
 * 캘린더는 주간 리셋(수요일) 시에만 실질 변경되는 저빈도 데이터다. 능동 갱신이
 * 필요한 유일한 시점은 리셋 종료 직후이며, 그 외 구간(between-reset)은 기존
 * lazy-SWR 에 위임한다 (ADR-0004 결정1).
 *
 * 매주 예상 점검 종료 시각(기본 수요일 10:10 KST)에 위상을 맞춰
 * `RESET_WINDOW_MINUTES` 동안 `RESET_RETRY_INTERVAL_SECONDS` 간격으로 재시도한다.
 * 창 안에 점검이 끝나면 첫 성공 refetch(`forceRefresh`)로 신규 주차 데이터를
 * hydrate 하고 즉시 창을 종료한다. 재시도가 캐시를 파괴하지 않도록 비파괴적
 * `refreshCalendarNow`(→ `forceRefresh`)만 사용한다 (ADR-0004 결정2).
 *
 * 신규 의존성 0 — 순수 `setTimeout` 재귀 + `unref()` (기존 cleanup 스케줄러 관용구).
 */

import { logger } from '@lostark/shared';
import { parseEnv } from '@lostark/shared/config/env';

import { GameContentsClient } from '../clients/gamecontents-client.js';
import { CacheRefreshOutcome } from './domain-cache-manager.js';
import { gameContentsCacheManager } from './gamecontents-cache-manager.js';

/**
 * 스케줄러 핸들. 테스트/graceful shutdown 용 — 예약된 setTimeout clear +
 * 진행 중 reset-align 재시도 루프에 중단 플래그 전달.
 */
export interface CalendarRefreshSchedulerHandle {
  stop(): void;
}

/**
 * 순수 함수 — 다음 목표 리셋 시각까지 남은 ms. 테스트에서 `now` 를 고정 주입해
 * 검증한다(실시간 타이머 불필요).
 *
 * KST 계산은 `now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })` 로 KST
 * wall-clock 을 재구성한 Date 를 기준으로 한다 (kakao.ts::nowKST 와 동일 관용구 —
 * ADR-0004 §대안 비교: package 경계 유지를 위해 로컬 복제, 승격은 후속 과제).
 * KST(Asia/Seoul)는 DST 가 없어 재구성 Date 간 delta 는 실 경과 ms 와 일치한다.
 *
 * @param now             기준 시각 — 실 코드는 `new Date()`, 테스트는 고정값
 * @param resetDayOfWeek  0=일 ... 6=토 (env RESET_DAY, 기본 3=수요일)
 * @param resetHourKST    목표 KST 시 (0-23)
 * @param resetMinuteKST  목표 KST 분 (0-59)
 */
export function computeMsUntilNextReset(
  now: Date,
  resetDayOfWeek: number,
  resetHourKST: number,
  resetMinuteKST: number,
): number {
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

  const target = new Date(kst);
  const dayDelta = (resetDayOfWeek - kst.getDay() + 7) % 7;
  target.setDate(kst.getDate() + dayDelta);
  target.setHours(resetHourKST, resetMinuteKST, 0, 0);

  // 목표 시각이 이미 지났으면(같은 요일의 목표시각 이후 포함) 다음 주로.
  if (target.getTime() <= kst.getTime()) {
    target.setDate(target.getDate() + 7);
  }

  return target.getTime() - kst.getTime();
}

/**
 * rest-service `server.ts::initializeCacheSystem` 에서 1회 호출. 인자 없음 —
 * 모든 설정은 env 에서 내부적으로 읽는다(gamecontents-cache-manager 의
 * `buildTtlFromEnv()` 와 동일 관례). `CACHE_GAMECONTENTS_CALENDAR_REFRESH_ENABLED`
 * 가 false 면 타이머를 전혀 생성하지 않고 no-op handle 을 반환한다(롤백 스위치).
 */
export function startCalendarRefreshScheduler(): CalendarRefreshSchedulerHandle {
  const env = parseEnv();

  if (!env.CACHE_GAMECONTENTS_CALENDAR_REFRESH_ENABLED) {
    logger.info(
      {},
      'CalendarRefreshScheduler: disabled (CACHE_GAMECONTENTS_CALENDAR_REFRESH_ENABLED=false), lazy-SWR only',
    );
    return { stop() {} };
  }

  const resetDay = env.CACHE_GAMECONTENTS_CALENDAR_RESET_DAY;
  const resetHour = env.CACHE_GAMECONTENTS_CALENDAR_RESET_HOUR_KST;
  const resetMinute = env.CACHE_GAMECONTENTS_CALENDAR_RESET_MINUTE_KST;
  const windowMs = env.CACHE_GAMECONTENTS_CALENDAR_RESET_WINDOW_MINUTES * 60 * 1000;
  const intervalMs = env.CACHE_GAMECONTENTS_CALENDAR_RESET_RETRY_INTERVAL_SECONDS * 1000;

  const client = new GameContentsClient();

  let stopped = false;
  let inFlight = false;
  let resetTimer: NodeJS.Timeout | null = null;
  let sleepTimer: NodeJS.Timeout | null = null;
  let sleepResolve: ((completed: boolean) => void) | null = null;

  /** 중단 가능한 sleep. resolve(true)=정상 경과, resolve(false)=stop() 으로 중단. */
  const sleep = (ms: number): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      sleepResolve = resolve;
      sleepTimer = setTimeout(() => {
        sleepTimer = null;
        sleepResolve = null;
        resolve(true);
      }, ms);
      sleepTimer.unref();
    });

  /** inFlight 가드 — 자기 재진입만 방지. 실패해도 캐시를 지우지 않으므로 겹침 자체는 무해. */
  const refreshOnce = async (): Promise<CacheRefreshOutcome> => {
    if (inFlight) {
      return { outcome: 'skipped-in-flight' };
    }
    inFlight = true;
    try {
      return await gameContentsCacheManager.refreshCalendarNow(() => client.getCalendar());
    } finally {
      inFlight = false;
    }
  };

  const runResetWindow = async (): Promise<void> => {
    if (stopped) return;
    const deadline = Date.now() + windowMs;
    logger.info(
      { windowMs, intervalMs },
      'CalendarRefreshScheduler: reset window opened, retrying forceRefresh',
    );

    while (!stopped && Date.now() < deadline) {
      const outcome = await refreshOnce();
      if (outcome.outcome === 'refreshed') {
        logger.info({}, 'CalendarRefreshScheduler: self-heal complete, closing window early');
        break;
      }
      const completed = await sleep(intervalMs);
      if (!completed) break; // stop() 중단
    }

    scheduleNextResetAlignment(); // 다음 주 재예약 (재귀)
  };

  function scheduleNextResetAlignment(): void {
    if (stopped) return;
    const delay = computeMsUntilNextReset(new Date(), resetDay, resetHour, resetMinute);
    logger.info(
      { delayMs: delay, resetDay, resetHour, resetMinute },
      'CalendarRefreshScheduler: next reset alignment scheduled',
    );
    resetTimer = setTimeout(() => {
      void runResetWindow();
    }, delay);
    resetTimer.unref();
  }

  scheduleNextResetAlignment();

  return {
    stop() {
      stopped = true;
      if (resetTimer) {
        clearTimeout(resetTimer);
        resetTimer = null;
      }
      if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
      }
      if (sleepResolve) {
        sleepResolve(false);
        sleepResolve = null;
      }
      logger.info({}, 'CalendarRefreshScheduler: stopped');
    },
  };
}
