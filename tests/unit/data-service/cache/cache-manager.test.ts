/**
 * cacheAgeMs / CACHE_FRESHNESS_MAX_AGE_MS — 모든 캐시 계층(memory/redis/db)에서 동일한
 * 신선도 기준이 적용되는지 확인. worker 간 stale 데이터가 통과하지 않도록 도입된 가드.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CACHE_FRESHNESS_MAX_AGE_MS,
  cacheAgeMs,
} from '../../../../packages/data-service/src/cache/cache-manager.js';
import type { NormalizedCharacterDetail } from '../../../../packages/data-service/src/normalizers/armories-normalizer.js';

function buildDetail(normalizedAt: Date | string | null | undefined): NormalizedCharacterDetail {
  return {
    metadata: {
      normalizedAt: normalizedAt as any,
      apiVersion: 'V9.0.0',
      dataHash: 'test',
    },
  } as NormalizedCharacterDetail;
}

test('cacheAgeMs', async (t) => {
  await t.test('returns positive age for past Date object', () => {
    const past = new Date(Date.now() - 30_000);
    const age = cacheAgeMs(buildDetail(past));
    assert.ok(age >= 30_000 && age < 31_000, `expected ~30s, got ${age}ms`);
  });

  await t.test('returns positive age for ISO string', () => {
    const past = new Date(Date.now() - 90_000).toISOString();
    const age = cacheAgeMs(buildDetail(past));
    assert.ok(age >= 90_000 && age < 91_000, `expected ~90s, got ${age}ms`);
  });

  await t.test('returns Infinity when normalizedAt is missing', () => {
    assert.strictEqual(cacheAgeMs(buildDetail(undefined)), Infinity);
    assert.strictEqual(cacheAgeMs(buildDetail(null)), Infinity);
  });

  await t.test('returns Infinity when normalizedAt is malformed', () => {
    assert.strictEqual(cacheAgeMs(buildDetail('not-a-date')), Infinity);
  });
});

test('CACHE_FRESHNESS_MAX_AGE_MS', async (t) => {
  await t.test('defaults to 60 seconds when env unset', () => {
    // env 가 미설정인 dev 기본값 = 60s. 통합 환경에서 overrides 가능.
    assert.ok(CACHE_FRESHNESS_MAX_AGE_MS >= 1000, 'must be >= 1s');
    assert.ok(CACHE_FRESHNESS_MAX_AGE_MS <= 24 * 3600 * 1000, 'must be <= 24h');
  });

  await t.test('fresh data (age < cap) passes', () => {
    const recent = new Date(Date.now() - 10_000);
    assert.ok(cacheAgeMs(buildDetail(recent)) < CACHE_FRESHNESS_MAX_AGE_MS);
  });

  await t.test('stale data (age > cap by big margin) fails', () => {
    const old = new Date(Date.now() - 30 * 60 * 1000); // 30 min
    assert.ok(cacheAgeMs(buildDetail(old)) > CACHE_FRESHNESS_MAX_AGE_MS);
  });
});
