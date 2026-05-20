/**
 * @cursor-change: 2026-05-20, v1.0.0, 도메인 캐시 cold-start warm-up
 *
 * design.md §"Warm-up / Prefetch" 의 `warmupDomainCaches()` 구현.
 *
 * - 세 도메인의 default key 를 PG 에서 hydrate 하고 miss 시 1회 API 호출.
 * - server.ts::initializeCacheSystem 에서 setImmediate 로 비동기 트리거.
 * - 동시 prefetch 도메인 수 = 3 (concerns D-3) — rate limit 100/min 대비 무시 가능.
 */

import { logger } from '@lostark/shared';

import { databaseDomainCache } from './database-domain-cache.js';
import {
  GAMECONTENTS_CALENDAR_CACHE_KEY,
  gameContentsCacheManager,
} from './gamecontents-cache-manager.js';
import {
  NEWS_EVENTS_CACHE_KEY,
  NEWS_NOTICES_DEFAULT_CACHE_KEY,
  newsCacheManager,
} from './news-cache-manager.js';
import { GameContentsClient } from '../clients/gamecontents-client.js';
import { NewsClient } from '../clients/news-client.js';
import { NewsNormalizer } from '../normalizers/news-normalizer.js';

export interface WarmupReport {
  domain: string;
  cacheKey: string;
  outcome: 'hydrated-from-db' | 'fetched-from-api' | 'skipped' | 'failed';
  durationMs: number;
  error?: string;
}

export interface WarmupOptions {
  /** 동시 prefetch 도메인 수. 본 phase 는 사실상 3개 모두 병렬 (default 3). */
  concurrency?: number;
  /** PG 가 비어있을 때 API 호출로 채울지 여부. default true. */
  apiFallbackOnEmpty?: boolean;
}

interface DomainPrefetchSpec {
  domain: string;
  cacheKey: string;
  cacheType: 'news' | 'gamecontents';
  hydrate: (payload: unknown, sourceFetchedAt: Date) => Promise<void>;
  fetchFromApi: () => Promise<unknown>;
  setAllTiers: (payload: unknown) => Promise<void>;
}

/**
 * 세 도메인 default key warm-up.
 *
 * apiFallbackOnEmpty=true 가 default 인 이유 (DP-9): PG 가 비어있는 cold start
 * 직후엔 첫 사용자 요청이 어차피 API 를 친다. warmup 이 그것을 미리 처리해 첫
 * 요청의 latency 를 줄인다. rate limit 부담 미미 (3 req).
 */
export async function warmupDomainCaches(
  options: WarmupOptions = {},
): Promise<WarmupReport[]> {
  const apiFallbackOnEmpty = options.apiFallbackOnEmpty ?? true;

  // PG 미연결 시 warmup skip — hydrate 대상이 없다.
  if (!databaseDomainCache.isConnected()) {
    logger.warn('warmupDomainCaches: PostgreSQL not connected — skipping');
    return [];
  }

  const newsClient = new NewsClient();
  const gameContentsClient = new GameContentsClient();

  const specs: DomainPrefetchSpec[] = [
    {
      domain: 'gamecontents.calendar',
      cacheKey: GAMECONTENTS_CALENDAR_CACHE_KEY,
      cacheType: 'gamecontents',
      hydrate: async (payload, sourceFetchedAt) => {
        await gameContentsCacheManager.hydrateUpperFromPayload(
          GAMECONTENTS_CALENDAR_CACHE_KEY,
          payload as never,
          sourceFetchedAt,
        );
      },
      fetchFromApi: () => gameContentsClient.getCalendar(),
      setAllTiers: async (payload) => {
        await gameContentsCacheManager.setAllTiers(
          GAMECONTENTS_CALENDAR_CACHE_KEY,
          payload as never,
        );
      },
    },
    {
      domain: 'news.notices.default',
      cacheKey: NEWS_NOTICES_DEFAULT_CACHE_KEY,
      cacheType: 'news',
      hydrate: async (payload, sourceFetchedAt) => {
        await newsCacheManager.hydrateUpperFromPayload(
          NEWS_NOTICES_DEFAULT_CACHE_KEY,
          payload as never,
          sourceFetchedAt,
        );
      },
      fetchFromApi: async () => {
        const raw = await newsClient.getNotices();
        return NewsNormalizer.normalizeNotices(raw);
      },
      setAllTiers: async (payload) => {
        await newsCacheManager.setAllTiers(
          NEWS_NOTICES_DEFAULT_CACHE_KEY,
          payload as never,
        );
      },
    },
    {
      domain: 'news.events',
      cacheKey: NEWS_EVENTS_CACHE_KEY,
      cacheType: 'news',
      hydrate: async (payload, sourceFetchedAt) => {
        await newsCacheManager.hydrateUpperFromPayload(
          NEWS_EVENTS_CACHE_KEY,
          payload as never,
          sourceFetchedAt,
        );
      },
      fetchFromApi: async () => {
        const raw = await newsClient.getEvents();
        return NewsNormalizer.normalizeEvents(raw);
      },
      setAllTiers: async (payload) => {
        await newsCacheManager.setAllTiers(NEWS_EVENTS_CACHE_KEY, payload as never);
      },
    },
  ];

  const results = await Promise.all(
    specs.map((spec) => prefetchOne(spec, apiFallbackOnEmpty)),
  );

  logger.info(
    {
      reports: results.map((r) => ({
        domain: r.domain,
        outcome: r.outcome,
        durationMs: r.durationMs,
      })),
    },
    'warmupDomainCaches: completed',
  );

  return results;
}

async function prefetchOne(
  spec: DomainPrefetchSpec,
  apiFallbackOnEmpty: boolean,
): Promise<WarmupReport> {
  const start = Date.now();
  try {
    const dbRow = await databaseDomainCache.getRow(spec.cacheType, spec.cacheKey);
    if (dbRow) {
      await spec.hydrate(dbRow.payload, dbRow.sourceFetchedAt);
      return {
        domain: spec.domain,
        cacheKey: spec.cacheKey,
        outcome: 'hydrated-from-db',
        durationMs: Date.now() - start,
      };
    }

    if (!apiFallbackOnEmpty) {
      return {
        domain: spec.domain,
        cacheKey: spec.cacheKey,
        outcome: 'skipped',
        durationMs: Date.now() - start,
      };
    }

    const fresh = await spec.fetchFromApi();
    await spec.setAllTiers(fresh);
    return {
      domain: spec.domain,
      cacheKey: spec.cacheKey,
      outcome: 'fetched-from-api',
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(
      {
        domain: spec.domain,
        cacheKey: spec.cacheKey,
        error: message,
      },
      'warmupDomainCaches: per-domain failure',
    );
    return {
      domain: spec.domain,
      cacheKey: spec.cacheKey,
      outcome: 'failed',
      durationMs: Date.now() - start,
      error: message,
    };
  }
}
