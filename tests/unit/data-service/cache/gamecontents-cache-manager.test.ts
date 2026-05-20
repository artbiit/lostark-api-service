/**
 * @cursor-change: 2026-05-20, v1.0.0, GameContentsCacheManager 통합 테스트 (fake adapter)
 *
 * design.md AC-1, AC-2, AC-4 매핑.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GAMECONTENTS_CALENDAR_CACHE_KEY,
  GameContentsCacheManager,
} from '../../../../packages/data-service/src/cache/gamecontents-cache-manager.js';
import type {
  DatabaseDomainCache,
  DomainCacheRow,
  DomainCacheType,
} from '../../../../packages/data-service/src/cache/database-domain-cache.js';
import type { RedisDomainCache } from '../../../../packages/data-service/src/cache/redis-domain-cache.js';
import type { CacheTierTtl } from '../../../../packages/data-service/src/cache/domain-cache-manager.js';
import type { GameContentsCalendarResponseV9 } from '@lostark/shared/types/V9/gamecontents';

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

const ttl: CacheTierTtl = {
  l1Seconds: 300,
  l2Seconds: 1800,
  l3SoftSeconds: 21600,
  l3HardSeconds: 1209600,
};

function buildManager(): {
  manager: GameContentsCacheManager;
  redis: FakeRedis;
  db: FakeDb;
} {
  const redis = new FakeRedis();
  const db = new FakeDb();
  const manager = new GameContentsCacheManager(ttl);
  const m = manager as unknown as {
    redis: RedisDomainCache;
    db: DatabaseDomainCache;
  };
  m.redis = redis as unknown as RedisDomainCache;
  m.db = db as unknown as DatabaseDomainCache;
  return { manager, redis, db };
}

const fakeCalendar = (label: string): GameContentsCalendarResponseV9 =>
  [
    {
      CategoryName: label,
      ContentsName: 'test',
      ContentsIcon: '',
      MinItemLevel: 1600,
      StartTimes: [],
      Location: '',
      RewardItems: [],
    } as never,
  ] as never;

test('getCalendar — All-miss → API → cache populated (AC-4)', async () => {
  const { manager, redis, db } = buildManager();
  let calls = 0;
  const result = await manager.getCalendar(async () => {
    calls++;
    return fakeCalendar('first');
  });
  assert.equal(result.source, 'api');
  assert.equal(calls, 1);
  assert.equal(redis.store.has(GAMECONTENTS_CALENDAR_CACHE_KEY), true);
  assert.equal(db.rows.has(`gamecontents::${GAMECONTENTS_CALENDAR_CACHE_KEY}`), true);
});

test('getCalendar — second call uses L1 (AC-1)', async () => {
  const { manager } = buildManager();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return fakeCalendar('cached');
  };
  await manager.getCalendar(fetcher);
  const start = Date.now();
  const second = await manager.getCalendar(fetcher);
  const elapsed = Date.now() - start;
  assert.equal(second.source, 'memory');
  assert.equal(calls, 1);
  // 정성적 — fake 환경이라 매우 빠름. AC-1 의 1ms 미만 검증은 실 환경 통합테스트 몫.
  assert.ok(elapsed < 50, `expected fast L1 hit, got ${elapsed}ms`);
});

test('getCalendar — L2 hit when L1 absent (AC-2)', async () => {
  const { manager, redis } = buildManager();
  await redis.set(GAMECONTENTS_CALENDAR_CACHE_KEY, fakeCalendar('redis-warmed'));
  let calls = 0;
  const result = await manager.getCalendar(async () => {
    calls++;
    return fakeCalendar('fresh');
  });
  assert.equal(result.source, 'redis');
  assert.equal(calls, 0);
});

test('invalidateCalendar — clears all tiers', async () => {
  const { manager, redis, db } = buildManager();
  await manager.getCalendar(async () => fakeCalendar('first'));
  await manager.invalidateCalendar();
  assert.equal(redis.store.size, 0);
  assert.equal(db.rows.size, 0);
});
