/**
 * @cursor-change: 2026-05-20, v1.0.0, gamecontents 3-tier 캐시 통합 테스트
 *
 * design.md §"검증 포인트" AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-9 매핑.
 *
 * mocked PostgreSQL pgClient + Redis 어댑터 주입 방식.
 * 실 PostgreSQL/Redis 가 없는 환경에서도 동작 (L4 정석은 testcontainers — 별도 검증 단계).
 *
 * AC 매핑:
 *  AC-1  L1 hit 속도 < 50ms (fake 환경; 실 < 1ms 는 bench 에서 검증)
 *  AC-2  L2 Redis hit (fetcher 호출 0회)
 *  AC-3  L3 fresh hit 시 L1+L2 동기화 발생
 *  AC-4  All-miss → API 1회 호출 + 3-tier set
 *  AC-5  API 5xx + L3 stale → 200 + cache.stale=true + staleAgeSeconds > 0
 *  AC-6  API 5xx + L3 모두 hard 만료 → MaintenanceUnavailableError
 *  AC-9  warm-up 후 PG hydrate → API 호출 0회
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GAMECONTENTS_CALENDAR_CACHE_KEY,
  GameContentsCacheManager,
} from '../../../packages/data-service/src/cache/gamecontents-cache-manager.js';
import {
  MaintenanceUnavailableError,
  type CacheTierTtl,
} from '../../../packages/data-service/src/cache/domain-cache-manager.js';
import type {
  DatabaseDomainCache,
  DomainCacheRow,
  DomainCacheType,
} from '../../../packages/data-service/src/cache/database-domain-cache.js';
import type { RedisDomainCache } from '../../../packages/data-service/src/cache/redis-domain-cache.js';
import type { GameContentsCalendarResponseV9 } from '@lostark/shared/types/V9/gamecontents';

// === 테스트 더블 ===

class FakeRedis {
  store = new Map<string, unknown>();
  connected = true;

  async set<T>(key: string, payload: T): Promise<void> {
    this.store.set(key, payload);
  }
  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T | undefined) ?? null;
  }
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
  isConnected(): boolean {
    return this.connected;
  }
}

class FakeDb {
  rows = new Map<string, DomainCacheRow<unknown>>();
  connected = true;

  async set<T>(
    cacheType: DomainCacheType,
    cacheKey: string,
    payload: T,
    softTtlSeconds: number,
    hardTtlSeconds: number,
    sourceFetchedAt: Date = new Date(),
  ): Promise<void> {
    const now = sourceFetchedAt.getTime();
    this.rows.set(`${cacheType}::${cacheKey}`, {
      payload,
      softExpiresAt: new Date(now + softTtlSeconds * 1000),
      hardExpiresAt: new Date(now + hardTtlSeconds * 1000),
      sourceFetchedAt,
    });
  }
  async getRow<T>(
    cacheType: DomainCacheType,
    cacheKey: string,
  ): Promise<DomainCacheRow<T> | null> {
    const row = this.rows.get(`${cacheType}::${cacheKey}`) as
      | DomainCacheRow<T>
      | undefined;
    if (!row) return null;
    // hard 만료 체크
    if (row.hardExpiresAt.getTime() <= Date.now()) return null;
    return row;
  }
  async del(cacheType: DomainCacheType, cacheKey: string): Promise<void> {
    this.rows.delete(`${cacheType}::${cacheKey}`);
  }
  isConnected(): boolean {
    return this.connected;
  }
}

// === 팩토리 ===

const shortTtl: CacheTierTtl = {
  l1Seconds: 60,
  l2Seconds: 300,
  l3SoftSeconds: 600,
  l3HardSeconds: 3600,
};

function buildManager(): {
  manager: GameContentsCacheManager;
  redis: FakeRedis;
  db: FakeDb;
} {
  const redis = new FakeRedis();
  const db = new FakeDb();
  const manager = new GameContentsCacheManager(shortTtl);
  // protected 필드 교체 (테스트 전용)
  const m = manager as unknown as { redis: RedisDomainCache; db: DatabaseDomainCache };
  m.redis = redis as unknown as RedisDomainCache;
  m.db = db as unknown as DatabaseDomainCache;
  return { manager, redis, db };
}

/** 최소한의 GameContentsCalendarResponseV9 fixture. */
const fakeCalendar = (label: string): GameContentsCalendarResponseV9 =>
  [
    {
      CategoryName: label,
      ContentsName: 'test-content',
      ContentsIcon: '',
      MinItemLevel: 1600,
      StartTimes: [],
      Location: '',
      RewardItems: [],
    } as never,
  ] as never;

// === AC-4: All-miss → API 1회 호출 + 3-tier set ===

test('AC-4: All-miss → API fetched once → all tiers populated', async () => {
  const { manager, redis, db } = buildManager();
  let calls = 0;

  const result = await manager.getCalendar(async () => {
    calls++;
    return fakeCalendar('fresh');
  });

  assert.equal(result.source, 'api');
  assert.equal(result.stale, false);
  assert.equal(calls, 1, 'fetcher must be called exactly once');

  // L1 확인
  assert.equal(manager.getMemorySize(), 1);
  // L2 확인
  assert.ok(redis.store.has(GAMECONTENTS_CALENDAR_CACHE_KEY), 'redis must contain the key');
  // L3 확인
  assert.ok(
    db.rows.has(`gamecontents::${GAMECONTENTS_CALENDAR_CACHE_KEY}`),
    'db must contain the row',
  );
});

// === AC-1: L1 hit ===

test('AC-1: second call returns L1 hit (fast)', async () => {
  const { manager } = buildManager();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return fakeCalendar('cached');
  };

  await manager.getCalendar(fetcher); // populates L1
  const start = Date.now();
  const second = await manager.getCalendar(fetcher);
  const elapsed = Date.now() - start;

  assert.equal(second.source, 'memory');
  assert.equal(calls, 1, 'fetcher must not be called on L1 hit');
  assert.ok(elapsed < 50, `L1 hit should be very fast, got ${elapsed}ms`);
});

// === AC-2: L2 Redis hit ===

test('AC-2: Redis hit when L1 absent → fetcher not called', async () => {
  const { manager, redis } = buildManager();
  await redis.set(GAMECONTENTS_CALENDAR_CACHE_KEY, fakeCalendar('redis-cached'));

  let calls = 0;
  const result = await manager.getCalendar(async () => {
    calls++;
    return fakeCalendar('fresh');
  });

  assert.equal(result.source, 'redis');
  assert.equal(calls, 0, 'fetcher must not be called on L2 hit');
  assert.deepEqual(result.data, fakeCalendar('redis-cached'));
});

// === AC-3: L3 fresh hit → L1+L2 sync ===

test('AC-3: L3 fresh hit → L1+L2 synced, fetcher not called', async () => {
  const { manager, redis, db } = buildManager();

  // L3 에만 fresh 행 삽입 (soft TTL 1h, hard TTL 1d)
  await db.set('gamecontents', GAMECONTENTS_CALENDAR_CACHE_KEY, fakeCalendar('db-cached'), 3600, 86400);

  let calls = 0;
  const result = await manager.getCalendar(async () => {
    calls++;
    return fakeCalendar('fresh');
  });

  assert.equal(result.source, 'database');
  assert.equal(result.stale, false);
  assert.equal(calls, 0, 'fetcher must not be called on L3 fresh hit');

  // L1 sync 확인
  assert.equal(manager.getMemorySize(), 1, 'L1 must be populated after L3 hit');
  // L2 sync 확인
  assert.ok(
    redis.store.has(GAMECONTENTS_CALENDAR_CACHE_KEY),
    'L2 must be populated after L3 hit (AC-3)',
  );
});

// === AC-5: API 5xx + L3 stale → 200 + cache.stale=true ===

test('AC-5: API maintenance + L3 stale row → stale fallback returned', async () => {
  const { manager, db } = buildManager();

  // soft 만료 (2h ago) but hard alive → stale 후보
  const past = new Date(Date.now() - 2 * 3600 * 1000);
  await db.set('gamecontents', GAMECONTENTS_CALENDAR_CACHE_KEY, fakeCalendar('stale'), 3600, 86400, past);

  const result = await manager.getCalendar(async () => {
    throw new Error('HTTP 503: maintenance body');
  });

  assert.equal(result.source, 'database-stale');
  assert.equal(result.stale, true);
  assert.ok(
    typeof result.staleAgeSeconds === 'number' && result.staleAgeSeconds >= 3600,
    `staleAgeSeconds should be >= 3600, got ${result.staleAgeSeconds}`,
  );
  assert.deepEqual(result.data, fakeCalendar('stale'));
});

// === AC-6: API 5xx + L3 hard 만료 → MaintenanceUnavailableError ===

test('AC-6: API maintenance + no valid L3 row → MaintenanceUnavailableError', async () => {
  const { manager, db } = buildManager();

  // hard 만료된 행 (hard TTL 이 이미 지난 과거에 set)
  const veryPast = new Date(Date.now() - 48 * 3600 * 1000); // 48h 전
  // softTtlSeconds=3600, hardTtlSeconds=3600 → 48h 전에 set → 둘 다 만료
  await db.set('gamecontents', GAMECONTENTS_CALENDAR_CACHE_KEY, fakeCalendar('expired'), 3600, 3600, veryPast);

  await assert.rejects(
    () =>
      manager.getCalendar(async () => {
        throw new Error('HTTP 503: maintenance');
      }),
    (err) => err instanceof MaintenanceUnavailableError,
  );
});

// === AC-6 (variant): 아예 row 없음 → MaintenanceUnavailableError ===

test('AC-6 (no row): API maintenance + no L3 row → MaintenanceUnavailableError', async () => {
  const { manager } = buildManager();

  await assert.rejects(
    () =>
      manager.getCalendar(async () => {
        throw new Error('fetch failed');
      }),
    (err) => err instanceof MaintenanceUnavailableError,
  );
});

// === AC-9: warm-up — PG hydrate → API 호출 0회 ===

test('AC-9: after hydrateUpperFromPayload, getCalendar returns memory (API 0 calls)', async () => {
  const { manager } = buildManager();
  const payload = fakeCalendar('warmup-payload');
  const sourceFetchedAt = new Date(Date.now() - 60 * 1000); // 1분 전에 fetch됨

  // warm-up 과정 시뮬레이션: PG 에서 hydrate
  await manager.hydrateUpperFromPayload(GAMECONTENTS_CALENDAR_CACHE_KEY, payload, sourceFetchedAt);

  let calls = 0;
  const result = await manager.getCalendar(async () => {
    calls++;
    return fakeCalendar('should-not-be-called');
  });

  assert.equal(calls, 0, 'API must not be called after warm-up hydration (AC-9)');
  assert.equal(result.source, 'memory');
  assert.deepEqual(result.data, payload);
});

// === envelope 검증: stale=false 시 staleAgeSeconds 없음 ===

test('envelope: fresh result has no staleAgeSeconds', async () => {
  const { manager } = buildManager();
  const result = await manager.getCalendar(async () => fakeCalendar('fresh'));
  assert.equal(result.stale, false);
  assert.equal(result.staleAgeSeconds, undefined);
});

// === non-maintenance error 는 그대로 전파 ===

test('non-maintenance error propagates as-is (not wrapped in MaintenanceUnavailableError)', async () => {
  const { manager } = buildManager();

  await assert.rejects(
    () =>
      manager.getCalendar(async () => {
        throw new Error('HTTP 401: unauthorized');
      }),
    (err) => err instanceof Error && /HTTP 401/.test((err as Error).message),
  );
});
