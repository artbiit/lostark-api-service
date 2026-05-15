/**
 * createRouter / dispatch 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import {
  createRouter,
  type CommandRegistry,
} from '@lostark/udp-gateway/routing/router.js';
import type { KakaoMessage } from '@lostark/udp-gateway/contracts/envelope.js';

function makeCtx(): any {
  return {
    armoriesService: {} as any,
    charactersService: {} as any,
    auctionsService: {} as any,
    marketsService: {} as any,
    gameContentsService: {} as any,
    newsService: {} as any,
    redis: {} as any,
    logger: {
      info: () => undefined,
      warn: () => undefined,
      debug: () => undefined,
      error: () => undefined,
    },
  };
}

function makeMsg(content: string): KakaoMessage {
  return {
    sender: { name: 'tester', hash: 'h' },
    content,
  };
}

test('createRouter', async (t) => {
  await t.test('returns null for unknown command (silent drop)', async () => {
    const router = createRouter({});
    const result = await router.dispatch(
      { name: 'unknown', args: [], raw: '!unknown' },
      makeMsg('!unknown'),
      makeCtx(),
    );
    assert.strictEqual(result, null);
  });

  await t.test('dispatches registered handler', async () => {
    const registry: CommandRegistry = {
      ping: {
        minArgs: 0,
        usage: '!ping',
        description: 'pong',
        handler: async () => 'pong',
      },
    };
    const router = createRouter(registry);
    const result = await router.dispatch(
      { name: 'ping', args: [], raw: '!ping' },
      makeMsg('!ping'),
      makeCtx(),
    );
    assert.strictEqual(result, 'pong');
  });

  await t.test('returns usage when minArgs not satisfied', async () => {
    const registry: CommandRegistry = {
      정보: {
        minArgs: 1,
        usage: '!정보 캐릭터명',
        description: '...',
        handler: async () => 'ok',
      },
    };
    const router = createRouter(registry);
    const result = await router.dispatch(
      { name: '정보', args: [], raw: '!정보' },
      makeMsg('!정보'),
      makeCtx(),
    );
    assert.strictEqual(result, '!정보 캐릭터명');
  });

  await t.test('alias resolves to same handler', async () => {
    const registry: CommandRegistry = {
      vs: {
        minArgs: 2,
        usage: '!vs A B',
        description: '...',
        aliases: ['고민'],
        handler: async (args) => args.join(' vs '),
      },
    };
    const router = createRouter(registry);
    const result = await router.dispatch(
      { name: '고민', args: ['a', 'b'], raw: '!고민 a b' },
      makeMsg('!고민 a b'),
      makeCtx(),
    );
    assert.strictEqual(result, 'a vs b');
  });

  await t.test('skips disabled commands', async () => {
    const registry: CommandRegistry = {
      재련: {
        minArgs: 0,
        usage: '!재련',
        description: '...',
        enabled: false,
        handler: async () => 'should not run',
      },
    };
    const router = createRouter(registry);
    const result = await router.dispatch(
      { name: '재련', args: [], raw: '!재련' },
      makeMsg('!재련'),
      makeCtx(),
    );
    assert.strictEqual(result, null);
  });

  await t.test('catches handler throw and returns friendly text', async () => {
    const registry: CommandRegistry = {
      boom: {
        minArgs: 0,
        usage: '!boom',
        description: '...',
        handler: async () => {
          throw new Error('nope');
        },
      },
    };
    const router = createRouter(registry);
    const result = await router.dispatch(
      { name: 'boom', args: [], raw: '!boom' },
      makeMsg('!boom'),
      makeCtx(),
    );
    assert.match(result ?? '', /처리 중 오류/);
  });

  await t.test('throws on duplicate command name', () => {
    const registry: CommandRegistry = {
      a: { minArgs: 0, usage: '', description: '', handler: async () => null },
      b: {
        minArgs: 0,
        usage: '',
        description: '',
        aliases: ['a'],
        handler: async () => null,
      },
    };
    assert.throws(() => createRouter(registry), /Duplicate command alias/);
  });

  await t.test('listing only contains enabled commands', () => {
    const registry: CommandRegistry = {
      a: { minArgs: 0, usage: '', description: 'A', handler: async () => null },
      b: {
        minArgs: 0,
        usage: '',
        description: 'B',
        enabled: false,
        handler: async () => null,
      },
    };
    const router = createRouter(registry);
    const names = router.listing.map((l) => l.name);
    assert.deepStrictEqual(names, ['a']);
  });
});
