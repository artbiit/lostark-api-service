/**
 * @cursor-change: 2026-07-15, ADR-0004, calendar-refresh-scheduler 단위 테스트
 *
 * AC-3 (computeMsUntilNextReset 4케이스) + refreshCalendarNow fake-adapter 위임.
 *
 * KST(Asia/Seoul)는 DST 가 없고 테스트 대상 날짜(2026-07-13~20)가 어떤 호스트
 * timezone 기준으로도 DST 전환을 걸치지 않으므로, 반환 delta(ms)는 호스트 tz 와
 * 무관하게 결정적이다.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { computeMsUntilNextReset } from '../../../../packages/data-service/src/cache/calendar-refresh-scheduler.js';
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

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;

// 기본 리셋: 수요일(3) 10:10 KST.
const RESET_DAY = 3;
const RESET_HOUR = 10;
const RESET_MINUTE = 10;

// === AC-3: computeMsUntilNextReset 순수함수 ===

test('computeMsUntilNextReset — fixed now, 4 phase cases', async (t) => {
  await t.test('목표 요일 이전 (월요일 10:10 KST → 수요일 10:10 KST = 2일)', () => {
    // 2026-07-13 01:10 UTC = 월요일 10:10 KST.
    const now = new Date(Date.UTC(2026, 6, 13, 1, 10, 0));
    const ms = computeMsUntilNextReset(now, RESET_DAY, RESET_HOUR, RESET_MINUTE);
    assert.equal(ms, 2 * DAY);
  });

  await t.test('당일 목표시각 이전 (수요일 09:00 KST → 당일 10:10 = 70분)', () => {
    // 2026-07-15 00:00 UTC = 수요일 09:00 KST.
    const now = new Date(Date.UTC(2026, 6, 15, 0, 0, 0));
    const ms = computeMsUntilNextReset(now, RESET_DAY, RESET_HOUR, RESET_MINUTE);
    assert.equal(ms, 70 * MINUTE);
  });

  await t.test('당일 목표시각 이후 (수요일 11:00 KST → 다음 주 수요일 10:10)', () => {
    // 2026-07-15 02:00 UTC = 수요일 11:00 KST.
    const now = new Date(Date.UTC(2026, 6, 15, 2, 0, 0));
    const ms = computeMsUntilNextReset(now, RESET_DAY, RESET_HOUR, RESET_MINUTE);
    // 7일 - 50분.
    assert.equal(ms, 7 * DAY - 50 * MINUTE);
  });

  await t.test('목표시각의 분 경계 직전 (수요일 10:09:59 → 10:10:00 = 1초)', () => {
    // 2026-07-15 01:09:59 UTC = 수요일 10:09:59 KST.
    // 분(minute)을 무시하고 시(hour)만 봤다면 목표 10:00 이 이미 지나 다음 주로
    // 밀렸을 것 — delta 1초는 분 포함 계산이 맞음을 증명한다.
    const now = new Date(Date.UTC(2026, 6, 15, 1, 9, 59));
    const ms = computeMsUntilNextReset(now, RESET_DAY, RESET_HOUR, RESET_MINUTE);
    assert.equal(ms, 1 * SECOND);
  });
});

// === refreshCalendarNow → forceRefresh 위임 (fake adapter) ===

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
  async getRow<T>(cacheType: DomainCacheType, cacheKey: string): Promise<DomainCacheRow<T> | null> {
    const row = this.rows.get(`${cacheType}::${cacheKey}`);
    if (!row) return null;
    if (row.hardExpiresAt.getTime() <= Date.now()) return null;
    return row as DomainCacheRow<T>;
  }
  async del(cacheType: DomainCacheType, cacheKey: string): Promise<void> {
    this.rows.delete(`${cacheType}::${cacheKey}`);
  }
  isConnected(): boolean {
    return true;
  }
}

const ttl: CacheTierTtl = {
  l1Seconds: 60,
  l2Seconds: 600,
  l3SoftSeconds: 3600,
  l3HardSeconds: 86400,
};

function buildManager(): { manager: GameContentsCacheManager; redis: FakeRedis; db: FakeDb } {
  const redis = new FakeRedis();
  const db = new FakeDb();
  const manager = new GameContentsCacheManager(ttl);
  const m = manager as unknown as { redis: RedisDomainCache; db: DatabaseDomainCache };
  m.redis = redis as unknown as RedisDomainCache;
  m.db = db as unknown as DatabaseDomainCache;
  return { manager, redis, db };
}

const fakeCalendar = (tag: string) =>
  [{ CategoryName: tag }] as unknown as GameContentsCalendarResponseV9;

test('refreshCalendarNow — success replaces all tiers', async () => {
  const { manager, redis, db } = buildManager();
  const outcome = await manager.refreshCalendarNow(async () => fakeCalendar('fresh'));

  assert.equal(outcome.outcome, 'refreshed');
  assert.equal(redis.store.has(GAMECONTENTS_CALENDAR_CACHE_KEY), true);
  assert.equal(db.rows.has(`gamecontents::${GAMECONTENTS_CALENDAR_CACHE_KEY}`), true);
});

test('refreshCalendarNow — maintenance leaves existing cache untouched', async () => {
  const { manager, redis, db } = buildManager();
  // 기존 값 미리 적재.
  await manager.setAllTiers(GAMECONTENTS_CALENDAR_CACHE_KEY, fakeCalendar('orig'));
  const redisBefore = redis.store.get(GAMECONTENTS_CALENDAR_CACHE_KEY);

  const outcome = await manager.refreshCalendarNow(async () => {
    throw new Error('HTTP 503: maintenance');
  });

  assert.equal(outcome.outcome, 'maintenance-skip');
  // 기존 캐시 객체 그대로 (교체 안 됨).
  assert.equal(redis.store.get(GAMECONTENTS_CALENDAR_CACHE_KEY), redisBefore);
  assert.equal(db.rows.has(`gamecontents::${GAMECONTENTS_CALENDAR_CACHE_KEY}`), true);
});
