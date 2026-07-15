/**
 * @cursor-change: 2026-05-20, v1.0.0, DomainCacheManager 단위 테스트
 *
 * design.md §"검증 포인트" AC-3, AC-4, AC-5, AC-6, AC-15 매핑.
 *
 * - isMaintenanceError 패턴 매칭 (HTTP 5xx / 네트워크 / 한국어 점검 키워드)
 * - L1 hit / L2 hit / L3 fresh / L3 stale fallback 분기
 * - MaintenanceUnavailableError 던지기
 *
 * Redis/PG 어댑터는 fake 인스턴스를 주입 — 실제 IO 미사용.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CacheTierTtl,
  DomainCacheManager,
  MaintenanceUnavailableError,
} from '../../../../packages/data-service/src/cache/domain-cache-manager.js';
import type {
  DatabaseDomainCache,
  DomainCacheRow,
  DomainCacheType,
} from '../../../../packages/data-service/src/cache/database-domain-cache.js';
import type { RedisDomainCache } from '../../../../packages/data-service/src/cache/redis-domain-cache.js';

// === 테스트 더블 ===

class FakeRedisDomainCache {
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

class FakeDatabaseDomainCache {
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
    this.rows.set(this.composite(cacheType, cacheKey), {
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
    const row = this.rows.get(this.composite(cacheType, cacheKey));
    if (!row) return null;
    if (row.hardExpiresAt.getTime() <= Date.now()) return null;
    return row as DomainCacheRow<T>;
  }
  async del(cacheType: DomainCacheType, cacheKey: string): Promise<void> {
    this.rows.delete(this.composite(cacheType, cacheKey));
  }
  isConnected(): boolean {
    return this.connected;
  }
  private composite(t: DomainCacheType, k: string): string {
    return `${t}::${k}`;
  }
}

class TestNewsCacheManager extends DomainCacheManager<{ kind: string; n: number }> {
  protected readonly cacheType = 'news' as const;
  // 외부 호출이 isMaintenanceError 를 검증할 수 있도록 노출.
  public testIsMaintenance(err: unknown): boolean {
    return this.isMaintenanceError(err);
  }
}

const ttl: CacheTierTtl = {
  l1Seconds: 60,
  l2Seconds: 600,
  l3SoftSeconds: 3600,
  l3HardSeconds: 86400,
};

function buildManager(): {
  manager: TestNewsCacheManager;
  redis: FakeRedisDomainCache;
  db: FakeDatabaseDomainCache;
} {
  const redis = new FakeRedisDomainCache();
  const db = new FakeDatabaseDomainCache();
  const manager = new TestNewsCacheManager(
    ttl,
    redis as unknown as RedisDomainCache,
    db as unknown as DatabaseDomainCache,
  );
  return { manager, redis, db };
}

// === isMaintenanceError ===

test('isMaintenanceError', async (t) => {
  const { manager } = buildManager();

  await t.test('matches HTTP 5xx', () => {
    assert.equal(manager.testIsMaintenance(new Error('HTTP 503: maintenance body')), true);
    assert.equal(manager.testIsMaintenance(new Error('HTTP 500: oops')), true);
    assert.equal(manager.testIsMaintenance(new Error('HTTP 404: not found')), false);
    assert.equal(manager.testIsMaintenance(new Error('HTTP 401: unauth')), false);
  });

  await t.test('matches network errors', () => {
    assert.equal(manager.testIsMaintenance(new Error('fetch failed')), true);
    assert.equal(manager.testIsMaintenance(new Error('connect ECONNREFUSED 1.1.1.1:443')), true);
    assert.equal(manager.testIsMaintenance(new Error('ETIMEDOUT')), true);
    assert.equal(manager.testIsMaintenance(new Error('getaddrinfo ENOTFOUND host')), true);
  });

  await t.test('matches Korean maintenance keywords', () => {
    assert.equal(manager.testIsMaintenance(new Error('서버 점검 중입니다')), true);
    assert.equal(manager.testIsMaintenance(new Error('maintenance window')), true);
  });

  await t.test('rejects non-Error inputs and unrelated messages', () => {
    assert.equal(manager.testIsMaintenance('string'), false);
    assert.equal(manager.testIsMaintenance(undefined), false);
    assert.equal(manager.testIsMaintenance(new Error('Bad request')), false);
  });
});

// === fetchWithFallback 분기 ===

test('fetchWithFallback — All-miss → API success → all tiers populated', async () => {
  const { manager, redis, db } = buildManager();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return { kind: 'fresh', n: 1 };
  };

  const result = await manager.fetchWithFallback('news:x:v1', fetcher);
  assert.equal(result.source, 'api');
  assert.equal(result.stale, false);
  assert.equal(calls, 1);
  // L1 / L2 / L3 모두 set 되었는지
  assert.equal(manager.getMemorySize(), 1);
  assert.equal((await redis.get<unknown>('news:x:v1')) !== null, true);
  assert.equal((await db.getRow('news', 'news:x:v1')) !== null, true);
});

test('fetchWithFallback — L1 hit', async () => {
  const { manager } = buildManager();
  await manager.setAllTiers('news:x:v1', { kind: 'cached', n: 7 });
  let calls = 0;
  const result = await manager.fetchWithFallback('news:x:v1', async () => {
    calls++;
    return { kind: 'fresh', n: 99 };
  });
  assert.equal(result.source, 'memory');
  assert.equal(calls, 0);
  assert.equal(result.data.n, 7);
});

test('fetchWithFallback — L2 hit (memory absent, redis present)', async () => {
  const { manager, redis } = buildManager();
  await redis.set('news:x:v1', { kind: 'cached', n: 42 });
  let calls = 0;
  const result = await manager.fetchWithFallback('news:x:v1', async () => {
    calls++;
    return { kind: 'fresh', n: 99 };
  });
  assert.equal(result.source, 'redis');
  assert.equal(calls, 0);
  assert.equal(result.data.n, 42);
  // L1 동기화 확인
  assert.equal(manager.getMemorySize(), 1);
});

test('fetchWithFallback — L3 fresh hit syncs upper tiers (AC-3)', async () => {
  const { manager, redis, db } = buildManager();
  await db.set('news', 'news:x:v1', { kind: 'cached', n: 5 }, 3600, 86400);
  let calls = 0;
  const result = await manager.fetchWithFallback('news:x:v1', async () => {
    calls++;
    return { kind: 'fresh', n: 99 };
  });
  assert.equal(result.source, 'database');
  assert.equal(calls, 0);
  assert.equal(result.data.n, 5);
  // L1+L2 동기화
  assert.equal(manager.getMemorySize(), 1);
  assert.equal((await redis.get<unknown>('news:x:v1')) !== null, true);
});

test('fetchWithFallback — API maintenance + L3 stale → SWR fallback (AC-5, AC-15)', async () => {
  const { manager, db } = buildManager();
  // 인위적으로 soft 만료, hard 미만료 row 만들기
  const past = new Date(Date.now() - 7200 * 1000); // 2h ago
  // softTtl 1h, hardTtl 1day → 2h 전에 set 된 row 는 soft expired but hard alive
  await db.set('news', 'news:x:v1', { kind: 'stale', n: 1 }, 3600, 86400, past);

  const result = await manager.fetchWithFallback('news:x:v1', async () => {
    throw new Error('HTTP 503: maintenance');
  });

  assert.equal(result.source, 'database-stale');
  assert.equal(result.stale, true);
  assert.ok(typeof result.staleAgeSeconds === 'number');
  assert.ok(result.staleAgeSeconds! >= 7000); // 2h 전후
});

test('fetchWithFallback — API maintenance + no L3 row → MaintenanceUnavailableError (AC-6)', async () => {
  const { manager } = buildManager();
  await assert.rejects(
    () =>
      manager.fetchWithFallback('news:x:v1', async () => {
        throw new Error('HTTP 503: maintenance');
      }),
    (err: unknown) => err instanceof MaintenanceUnavailableError,
  );
});

test('fetchWithFallback — non-maintenance error propagates as-is', async () => {
  const { manager } = buildManager();
  await assert.rejects(
    () =>
      manager.fetchWithFallback('news:x:v1', async () => {
        throw new Error('HTTP 401: unauthorized');
      }),
    (err: unknown) => err instanceof Error && /HTTP 401/.test((err as Error).message),
  );
});

test('invalidate — clears all tiers', async () => {
  const { manager, redis, db } = buildManager();
  await manager.setAllTiers('news:x:v1', { kind: 'cached', n: 1 });
  assert.equal(manager.getMemorySize(), 1);

  await manager.invalidate('news:x:v1');
  assert.equal(manager.getMemorySize(), 0);
  assert.equal(await redis.get('news:x:v1'), null);
  assert.equal(await db.getRow('news', 'news:x:v1'), null);
});

// === forceRefresh (ADR-0004) — 성공/점검/기타에러 3분기 ===

test('forceRefresh — success replaces all tiers (staleAge reset)', async () => {
  const { manager, redis, db } = buildManager();
  // 오래된 기존 값을 미리 적재 (교체 대상).
  await manager.setAllTiers('news:x:v1', { kind: 'old', n: 1 }, new Date(Date.now() - 3600 * 1000));

  let calls = 0;
  const outcome = await manager.forceRefresh('news:x:v1', async () => {
    calls++;
    return { kind: 'new', n: 2 };
  });

  assert.equal(outcome.outcome, 'refreshed');
  assert.equal(calls, 1);
  // L1/L2/L3 전부 신규 값으로 교체됨.
  const redisVal = (await redis.get<{ kind: string; n: number }>('news:x:v1'))!;
  assert.equal(redisVal.n, 2);
  const dbRow = (await db.getRow<{ kind: string; n: number }>('news', 'news:x:v1'))!;
  assert.equal(dbRow.payload.n, 2);
  // staleAge 0 리셋 — sourceFetchedAt 가 방금 시각이라 soft window 안(fresh).
  assert.equal(dbRow.softExpiresAt.getTime() > Date.now(), true);
});

test('forceRefresh — maintenance leaves all tiers untouched', async () => {
  const { manager, redis, db } = buildManager();
  await manager.setAllTiers('news:x:v1', { kind: 'orig', n: 1 });
  const memBefore = manager.getMemorySize();

  const outcome = await manager.forceRefresh('news:x:v1', async () => {
    throw new Error('HTTP 503: maintenance body');
  });

  assert.equal(outcome.outcome, 'maintenance-skip');
  // 기존 L1/L2/L3 snapshot 불변.
  assert.equal(manager.getMemorySize(), memBefore);
  assert.equal((await redis.get<{ kind: string; n: number }>('news:x:v1'))!.n, 1);
  assert.equal((await db.getRow<{ kind: string; n: number }>('news', 'news:x:v1'))!.payload.n, 1);
});

test('forceRefresh — non-maintenance error leaves tiers untouched and reports message', async () => {
  const { manager, redis, db } = buildManager();
  await manager.setAllTiers('news:x:v1', { kind: 'orig', n: 1 });

  const outcome = await manager.forceRefresh('news:x:v1', async () => {
    throw new Error('HTTP 401: unauthorized');
  });

  assert.equal(outcome.outcome, 'error');
  assert.equal(/HTTP 401/.test(outcome.error ?? ''), true);
  // 기존 L1/L2/L3 snapshot 불변.
  assert.equal((await redis.get<{ kind: string; n: number }>('news:x:v1'))!.n, 1);
  assert.equal((await db.getRow<{ kind: string; n: number }>('news', 'news:x:v1'))!.payload.n, 1);
});
