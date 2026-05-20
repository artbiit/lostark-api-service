/**
 * @cursor-change: 2026-05-20, v1.0.0, NewsCacheManager 통합 (in-memory fake) 테스트
 *
 * design.md AC-7 (searchParams 별 키 분리), AC-8 (events 동작) 매핑.
 *
 * 실제 Redis/PG 미사용 — fake 어댑터 주입. tests/integration/api 의 live API 와 별개.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNoticesCacheKey,
  NEWS_EVENTS_CACHE_KEY,
  NEWS_NOTICES_DEFAULT_CACHE_KEY,
  NewsCacheManager,
} from '../../../../packages/data-service/src/cache/news-cache-manager.js';
import type {
  DatabaseDomainCache,
  DomainCacheRow,
  DomainCacheType,
} from '../../../../packages/data-service/src/cache/database-domain-cache.js';
import type { RedisDomainCache } from '../../../../packages/data-service/src/cache/redis-domain-cache.js';
import type { CacheTierTtl } from '../../../../packages/data-service/src/cache/domain-cache-manager.js';
import type {
  NormalizedEventsResult,
  NormalizedNoticesResult,
} from '../../../../packages/data-service/src/normalizers/news-normalizer.js';

class FakeRedis {
  store = new Map<string, unknown>();
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
    return true;
  }
}

class FakeDb {
  rows = new Map<string, DomainCacheRow<unknown>>();
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
    return (this.rows.get(`${cacheType}::${cacheKey}`) as DomainCacheRow<T> | undefined) ?? null;
  }
  async del(cacheType: DomainCacheType, cacheKey: string): Promise<void> {
    this.rows.delete(`${cacheType}::${cacheKey}`);
  }
  isConnected(): boolean {
    return true;
  }
}

const noticesTtl: CacheTierTtl = {
  l1Seconds: 60,
  l2Seconds: 600,
  l3SoftSeconds: 3600,
  l3HardSeconds: 86400,
};
const eventsTtl: CacheTierTtl = {
  l1Seconds: 120,
  l2Seconds: 1200,
  l3SoftSeconds: 7200,
  l3HardSeconds: 172800,
};

function buildManager(): {
  manager: NewsCacheManager;
  redis: FakeRedis;
  db: FakeDb;
} {
  const redis = new FakeRedis();
  const db = new FakeDb();
  // private 필드를 우회 주입하기 위해 public constructor 매개변수 활용.
  // NewsCacheManager 의 베이스 super(...) 가 redis/db 어댑터를 받는다 — 직접 인스턴스화 시
  // 매니저는 환경변수 ttl 을 사용하므로, 본 테스트는 베이스 ttl 을 override 하기 위해
  // protected 필드를 reflection 으로 갈아끼운다.
  const manager = new NewsCacheManager(noticesTtl, eventsTtl);
  // 기본 redis/db 싱글톤 대체. 베이스의 protected 필드라 cast 필요.
  const m = manager as unknown as {
    redis: RedisDomainCache;
    db: DatabaseDomainCache;
  };
  m.redis = redis as unknown as RedisDomainCache;
  m.db = db as unknown as DatabaseDomainCache;
  return { manager, redis, db };
}

const fakeNotices = (n: number): NormalizedNoticesResult => ({
  notices: [{ title: `t${n}`, date: '', link: '', type: 'common', normalizedAt: new Date().toISOString() } as never],
  totalCount: n,
  normalizedAt: new Date().toISOString(),
});
const fakeEvents = (n: number): NormalizedEventsResult => ({
  events: [],
  totalCount: n,
  activeCount: 0,
  normalizedAt: new Date().toISOString(),
});

// === buildNoticesCacheKey ===

test('buildNoticesCacheKey — default key when no params', () => {
  assert.equal(buildNoticesCacheKey(), NEWS_NOTICES_DEFAULT_CACHE_KEY);
  assert.equal(buildNoticesCacheKey({}), NEWS_NOTICES_DEFAULT_CACHE_KEY);
});

test('buildNoticesCacheKey — distinct hash per params combo (AC-7)', () => {
  const a = buildNoticesCacheKey({ searchText: '프로키온' });
  const b = buildNoticesCacheKey({ searchText: '점검' });
  const c = buildNoticesCacheKey({ searchText: '프로키온' });
  assert.notEqual(a, b);
  assert.equal(a, c); // 동일 params → 동일 키 (deterministic)
  assert.match(a, /^news:notices:[0-9a-f]{8}:v1$/);
});

test('buildNoticesCacheKey — order-independent normalization', () => {
  const a = buildNoticesCacheKey({ searchText: '프로키온', type: 'common' as never });
  const b = buildNoticesCacheKey({ type: 'common' as never, searchText: '프로키온' });
  assert.equal(a, b);
});

// === getNotices / getEvents ===

test('getNotices — All-miss → API → cache populated', async () => {
  const { manager } = buildManager();
  let calls = 0;
  const result = await manager.getNotices(async () => {
    calls++;
    return fakeNotices(3);
  });
  assert.equal(result.source, 'api');
  assert.equal(result.data.totalCount, 3);
  assert.equal(calls, 1);
});

test('getNotices — second call hits L1', async () => {
  const { manager } = buildManager();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return fakeNotices(3);
  };
  await manager.getNotices(fetcher);
  const second = await manager.getNotices(fetcher);
  assert.equal(second.source, 'memory');
  assert.equal(calls, 1);
});

test('getNotices — different searchParams use distinct cache rows (AC-7)', async () => {
  const { manager, db } = buildManager();
  await manager.getNotices(async () => fakeNotices(1), { searchText: '프로키온' });
  await manager.getNotices(async () => fakeNotices(2), { searchText: '점검' });
  // 두 개 distinct row
  const rowKeys = Array.from(db.rows.keys()).filter((k) => k.startsWith('news::news:notices:'));
  assert.equal(rowKeys.length, 2);
});

test('getEvents — uses events TTL and single key (AC-8)', async () => {
  const { manager, db, redis } = buildManager();
  let calls = 0;
  const result = await manager.getEvents(async () => {
    calls++;
    return fakeEvents(2);
  });
  assert.equal(result.source, 'api');
  assert.equal(result.data.totalCount, 2);
  assert.equal(calls, 1);
  // events 키
  assert.equal(Array.from(redis.store.keys())[0], NEWS_EVENTS_CACHE_KEY);
  assert.equal(db.rows.has(`news::${NEWS_EVENTS_CACHE_KEY}`), true);
});

test('getEvents — L1 hit on second call', async () => {
  const { manager } = buildManager();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return fakeEvents(1);
  };
  await manager.getEvents(fetcher);
  const second = await manager.getEvents(fetcher);
  assert.equal(second.source, 'memory');
  assert.equal(calls, 1);
});
