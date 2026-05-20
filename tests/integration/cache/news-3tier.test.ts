/**
 * @cursor-change: 2026-05-20, v1.0.0, news 도메인 3-tier 캐시 통합 테스트
 *
 * design.md §"검증 포인트" AC-7, AC-8, AC-11 매핑.
 *
 * mocked PostgreSQL + Redis 어댑터 주입 방식.
 * 실 PostgreSQL/Redis 가 없는 환경에서도 동작 (L4 정석은 testcontainers — 별도 검증 단계).
 *
 * AC 매핑:
 *  AC-7   news.notices searchParams 별 키 분리 → 두 params → 두 distinct PG row
 *  AC-8   news.events 캐시 동작 (L1 hit / L2 hit / L3 fresh / stale fallback / all-miss)
 *  AC-11  기존 envelope 의 success/data/timestamp 보존 (data 필드 형태 회귀)
 *
 * 추가:
 *  AC-5 변형  news.notices: API 5xx + L3 stale → stale fallback (cache.stale=true)
 *  AC-6 변형  news.notices: API 5xx + no row → MaintenanceUnavailableError
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNoticesCacheKey,
  NewsCacheManager,
  NEWS_NOTICES_DEFAULT_CACHE_KEY,
  NEWS_EVENTS_CACHE_KEY,
} from '../../../packages/data-service/src/cache/news-cache-manager.js';
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
import type {
  NormalizedEventsResult,
  NormalizedNoticesResult,
} from '../../../packages/data-service/src/normalizers/news-normalizer.js';

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

const noticeTtl: CacheTierTtl = {
  l1Seconds: 60,
  l2Seconds: 300,
  l3SoftSeconds: 600,
  l3HardSeconds: 3600,
};
const eventsTtl: CacheTierTtl = {
  l1Seconds: 120,
  l2Seconds: 600,
  l3SoftSeconds: 1200,
  l3HardSeconds: 7200,
};

function buildManager(): {
  manager: NewsCacheManager;
  redis: FakeRedis;
  db: FakeDb;
} {
  const redis = new FakeRedis();
  const db = new FakeDb();
  const manager = new NewsCacheManager(noticeTtl, eventsTtl);
  const m = manager as unknown as { redis: RedisDomainCache; db: DatabaseDomainCache };
  m.redis = redis as unknown as RedisDomainCache;
  m.db = db as unknown as DatabaseDomainCache;
  return { manager, redis, db };
}

// === Fixtures ===

function fakeNotices(label: string): NormalizedNoticesResult {
  return {
    notices: [{ title: label, date: new Date().toISOString(), link: '#', type: '공지', normalizedAt: new Date().toISOString() }],
    totalCount: 1,
    normalizedAt: new Date().toISOString(),
  };
}

function fakeEvents(label: string): NormalizedEventsResult {
  return {
    events: [
      {
        title: label,
        thumbnail: '',
        link: '#',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        rewardDate: null,
        rewardItems: [],
        isActive: true,
        normalizedAt: new Date().toISOString(),
      },
    ],
    totalCount: 1,
    activeCount: 1,
    normalizedAt: new Date().toISOString(),
  };
}

// === AC-7: searchParams 별 키 분리 ===

test('AC-7: different searchParams produce distinct cache keys → distinct PG rows', async () => {
  const { manager, db } = buildManager();

  // params A
  const paramsA = { searchText: '점검' };
  await manager.getNotices(async () => fakeNotices('notices-A'), paramsA);

  // params B (다른 검색어)
  const paramsB = { searchText: '이벤트' };
  await manager.getNotices(async () => fakeNotices('notices-B'), paramsB);

  const keyA = buildNoticesCacheKey(paramsA);
  const keyB = buildNoticesCacheKey(paramsB);

  assert.notEqual(keyA, keyB, 'keys must differ for different searchParams');
  assert.ok(db.rows.has(`news::${keyA}`), 'PG row for paramsA must exist');
  assert.ok(db.rows.has(`news::${keyB}`), 'PG row for paramsB must exist');
  assert.equal(db.rows.size, 2, 'exactly 2 distinct PG rows (AC-7)');
});

test('AC-7: no params → default key', () => {
  const keyDefault = buildNoticesCacheKey();
  assert.equal(keyDefault, NEWS_NOTICES_DEFAULT_CACHE_KEY);
});

test('AC-7: empty params → default key', () => {
  const keyEmpty = buildNoticesCacheKey({});
  assert.equal(keyEmpty, NEWS_NOTICES_DEFAULT_CACHE_KEY);
});

// === AC-8: news.events 캐시 동작 ===

test('AC-8: events All-miss → API fetched once → all tiers populated', async () => {
  const { manager, redis, db } = buildManager();
  let calls = 0;

  const result = await manager.getEvents(async () => {
    calls++;
    return fakeEvents('fresh-events');
  });

  assert.equal(result.source, 'api');
  assert.equal(result.stale, false);
  assert.equal(calls, 1, 'fetcher must be called exactly once');
  assert.ok(redis.store.has(NEWS_EVENTS_CACHE_KEY), 'redis must contain events key');
  assert.ok(db.rows.has(`news::${NEWS_EVENTS_CACHE_KEY}`), 'db must contain events row');
});

test('AC-8: events L1 hit — fetcher not called', async () => {
  const { manager } = buildManager();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return fakeEvents('cached-events');
  };

  await manager.getEvents(fetcher); // populate
  const second = await manager.getEvents(fetcher);

  assert.equal(second.source, 'memory');
  assert.equal(calls, 1, 'fetcher must not be called on L1 hit');
});

test('AC-8: events L2 Redis hit — fetcher not called', async () => {
  const { manager, redis } = buildManager();
  await redis.set(NEWS_EVENTS_CACHE_KEY, fakeEvents('redis-events'));
  let calls = 0;

  const result = await manager.getEvents(async () => {
    calls++;
    return fakeEvents('fresh');
  });

  assert.equal(result.source, 'redis');
  assert.equal(calls, 0, 'fetcher must not be called on L2 hit');
});

test('AC-8: events L3 fresh hit → L1+L2 sync', async () => {
  const { manager, redis, db } = buildManager();
  await db.set('news', NEWS_EVENTS_CACHE_KEY, fakeEvents('db-events'), 3600, 86400);
  let calls = 0;

  const result = await manager.getEvents(async () => {
    calls++;
    return fakeEvents('fresh');
  });

  assert.equal(result.source, 'database');
  assert.equal(calls, 0, 'fetcher must not be called on L3 fresh');
  assert.ok(redis.store.has(NEWS_EVENTS_CACHE_KEY), 'L2 must be populated after L3 hit');
});

test('AC-8: events stale fallback — API maintenance + soft-expired row', async () => {
  const { manager, db } = buildManager();

  const past = new Date(Date.now() - 4000 * 1000); // 4000s 전 (> eventsTtl.l3SoftSeconds=1200)
  await db.set('news', NEWS_EVENTS_CACHE_KEY, fakeEvents('stale-events'), 1200, 86400, past);

  const result = await manager.getEvents(async () => {
    throw new Error('HTTP 503: server maintenance');
  });

  assert.equal(result.source, 'database-stale');
  assert.equal(result.stale, true);
  assert.ok(
    typeof result.staleAgeSeconds === 'number' && result.staleAgeSeconds >= 1200,
    `staleAgeSeconds should be >= 1200, got ${result.staleAgeSeconds}`,
  );
});

test('AC-8: events no stale → MaintenanceUnavailableError', async () => {
  const { manager } = buildManager();

  await assert.rejects(
    () =>
      manager.getEvents(async () => {
        throw new Error('ECONNREFUSED 127.0.0.1:443');
      }),
    (err) => err instanceof MaintenanceUnavailableError,
  );
});

// === AC-11: envelope 보존 (data 필드 형태 회귀) ===

test('AC-11: notices result preserves data shape (notices array + totalCount + normalizedAt)', async () => {
  const { manager } = buildManager();
  const original = fakeNotices('envelope-test');

  const result = await manager.getNotices(async () => original);

  // data 필드가 NormalizedNoticesResult 형태 그대로
  const data = result.data as NormalizedNoticesResult;
  assert.ok(Array.isArray(data.notices), 'data.notices must be an array (AC-11)');
  assert.equal(typeof data.totalCount, 'number', 'data.totalCount must be a number (AC-11)');
  assert.equal(typeof data.normalizedAt, 'string', 'data.normalizedAt must be a string (AC-11)');
  assert.equal(result.stale, false);
});

test('AC-11: events result preserves data shape (events + totalCount + activeCount + normalizedAt)', async () => {
  const { manager } = buildManager();
  const original = fakeEvents('envelope-events');

  const result = await manager.getEvents(async () => original);

  const data = result.data as NormalizedEventsResult;
  assert.ok(Array.isArray(data.events), 'data.events must be an array (AC-11)');
  assert.equal(typeof data.totalCount, 'number', 'data.totalCount must be a number (AC-11)');
  assert.equal(typeof data.activeCount, 'number', 'data.activeCount must be a number (AC-11)');
  assert.equal(typeof data.normalizedAt, 'string', 'data.normalizedAt must be a string (AC-11)');
});

// === notices: AC-5/AC-6 변형 ===

test('notices: stale fallback when API maintenance', async () => {
  const { manager, db } = buildManager();
  const past = new Date(Date.now() - 2 * noticeTtl.l3SoftSeconds * 1000);
  await db.set('news', NEWS_NOTICES_DEFAULT_CACHE_KEY, fakeNotices('stale-notice'), noticeTtl.l3SoftSeconds, noticeTtl.l3HardSeconds, past);

  const result = await manager.getNotices(async () => {
    throw new Error('HTTP 503: maintenance');
  });

  assert.equal(result.source, 'database-stale');
  assert.equal(result.stale, true);
});

test('notices: MaintenanceUnavailableError when no row and API fails', async () => {
  const { manager } = buildManager();

  await assert.rejects(
    () =>
      manager.getNotices(async () => {
        throw new Error('fetch failed');
      }),
    (err) => err instanceof MaintenanceUnavailableError,
  );
});

// === invalidate ===

test('invalidateNotices clears specific params key', async () => {
  const { manager, redis, db } = buildManager();
  const params = { searchText: '인벤' };
  await manager.getNotices(async () => fakeNotices('cached'), params);

  const key = buildNoticesCacheKey(params);
  assert.ok(redis.store.has(key));
  assert.ok(db.rows.has(`news::${key}`));

  await manager.invalidateNotices(params);
  assert.ok(!redis.store.has(key));
  assert.ok(!db.rows.has(`news::${key}`));
});
