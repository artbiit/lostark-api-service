/**
 * @cursor-change: 2026-05-20, v1.0.0, gamecontents (프로키온) 도메인 3-tier 캐시 매니저
 *
 * design.md §"도메인 서브클래스 시그니처" 의 GameContentsCacheManager 구현.
 *
 * - 키 네임스페이스: `gamecontents:calendar:v1` 단일 키
 * - filter-on-read 정책 (FR-1-4): getActiveContents/getContentsByCategory 등은
 *   getCalendar() 캐시 결과를 메모리 필터 — 추가 캐시 키 미생성.
 * - 주간 리셋 (FR-1-5) 은 본 phase 에서 cron 미도입 (DP-8). invalidate 메서드만 노출.
 */

import type { GameContentsCalendarResponseV9 } from '@lostark/shared/types/V9/gamecontents';
import { parseEnv } from '@lostark/shared/config/env';

import { databaseDomainCache } from './database-domain-cache.js';
import {
  CacheLookupResult,
  CacheTierTtl,
  DomainCacheManager,
} from './domain-cache-manager.js';
import { redisDomainCache } from './redis-domain-cache.js';

export const GAMECONTENTS_CALENDAR_CACHE_KEY = 'gamecontents:calendar:v1';

function buildTtlFromEnv(): CacheTierTtl {
  const env = parseEnv();
  return {
    l1Seconds: env.CACHE_GAMECONTENTS_L1_SECONDS,
    l2Seconds: env.CACHE_GAMECONTENTS_L2_SECONDS,
    l3SoftSeconds: env.CACHE_GAMECONTENTS_L3_SOFT_SECONDS,
    l3HardSeconds: env.CACHE_GAMECONTENTS_L3_HARD_SECONDS,
  };
}

export class GameContentsCacheManager extends DomainCacheManager<GameContentsCalendarResponseV9> {
  protected readonly cacheType = 'gamecontents' as const;

  constructor(ttlOverride?: CacheTierTtl) {
    super(ttlOverride ?? buildTtlFromEnv(), redisDomainCache, databaseDomainCache);
  }

  /**
   * 주간 콘텐츠 달력 — 단일 키 `gamecontents:calendar:v1`.
   */
  async getCalendar(
    fetcher: () => Promise<GameContentsCalendarResponseV9>,
  ): Promise<CacheLookupResult<GameContentsCalendarResponseV9>> {
    return this.fetchWithFallback(GAMECONTENTS_CALENDAR_CACHE_KEY, fetcher);
  }

  /**
   * 주간 리셋 등에 호출 (FR-1-5). 매니저 자체에 cron 은 두지 않음.
   */
  async invalidateCalendar(): Promise<void> {
    await this.invalidate(GAMECONTENTS_CALENDAR_CACHE_KEY);
  }
}

// === 싱글톤 인스턴스 ===

export const gameContentsCacheManager = new GameContentsCacheManager();
