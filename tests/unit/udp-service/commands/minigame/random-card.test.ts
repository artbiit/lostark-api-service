/**
 * !랜전카 명령 단위 테스트.
 *
 * Redis mock 으로:
 * - 같은 senderHash + 같은 KST 일자 → 동일 카드 (캐시 hit)
 * - 캐시 미존재 → 추첨 후 set 호출
 * - Redis 예외 → 추첨은 계속 (silent fallback)
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { randomCardCommand } from '@lostark/udp-gateway/commands/minigame/random-card.js';
import { RANDOM_CARD_LIST } from '@lostark/udp-gateway/commands/minigame/card-list.js';
import type { KakaoMessage } from '@lostark/udp-gateway/contracts/envelope.js';

function makeRedisMock() {
  const store = new Map<string, string>();
  const setCalls: Array<{ key: string; value: string; ttl?: number }> = [];
  return {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async set(key: string, value: string, ttl?: number): Promise<void> {
      store.set(key, value);
      setCalls.push({ key, value, ttl });
    },
    setCalls,
    store,
  };
}

function makeCtx(redis: any): any {
  return {
    armoriesService: {} as any,
    charactersService: {} as any,
    auctionsService: {} as any,
    marketsService: {} as any,
    gameContentsService: {} as any,
    newsService: {} as any,
    redis,
    logger: {
      info: () => undefined,
      warn: () => undefined,
      debug: () => undefined,
      error: () => undefined,
    },
  };
}

const msg: KakaoMessage = {
  sender: { name: '아트네', hash: 'sender-hash-1' },
  content: '!랜전카',
};

test('randomCardCommand', async (t) => {
  await t.test('uses cached card on second call for same sender', async () => {
    const redis = makeRedisMock();
    const ctx = makeCtx(redis);
    const first = await randomCardCommand.handler([], msg, ctx);
    const second = await randomCardCommand.handler([], msg, ctx);
    assert.strictEqual(first, second);
  });

  await t.test('picks from RANDOM_CARD_LIST', async () => {
    const redis = makeRedisMock();
    const ctx = makeCtx(redis);
    const result = await randomCardCommand.handler([], msg, ctx);
    assert.ok(result !== null);
    const card = (result as string).split('\n')[1];
    assert.ok(RANDOM_CARD_LIST.includes(card!));
  });

  await t.test('calls redis.set with TTL on cache miss', async () => {
    const redis = makeRedisMock();
    const ctx = makeCtx(redis);
    await randomCardCommand.handler([], msg, ctx);
    assert.strictEqual(redis.setCalls.length, 1);
    assert.ok(typeof redis.setCalls[0]!.ttl === 'number');
    assert.ok(redis.setCalls[0]!.ttl! > 0);
  });

  await t.test('falls back when redis throws', async () => {
    const failingRedis = {
      async get() {
        throw new Error('redis down');
      },
      async set() {
        throw new Error('redis down');
      },
    };
    const ctx = makeCtx(failingRedis);
    const result = await randomCardCommand.handler([], msg, ctx);
    assert.ok(typeof result === 'string');
    assert.ok((result as string).startsWith('아트네님의 오늘의 랜전카'));
  });
});
