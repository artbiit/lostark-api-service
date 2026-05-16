/**
 * !분배금 (share) 핸들러 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { shareCommand } from '@lostark/udp-gateway/commands/minigame/share.js';
import type { KakaoMessage } from '@lostark/udp-gateway/contracts/envelope.js';

const msg: KakaoMessage = { sender: { name: 't', hash: 'h' }, content: '!분배금' };
const ctx = {} as any;

test('shareCommand — calculates share for 4/8/16 players', async () => {
  const out = (await shareCommand.handler(['10000'], msg, ctx)) as string;
  // 입력 라인: 10,000 -> 9,500 (afterFee = 95%)
  assert.match(out, /입력된 금액 : 10,000 -> 9,500/);
  // 4인: floor(9500 * 3/4) = 7125
  assert.match(out, /4인 기준 : 7,125/);
  // 8인: floor(9500 * 7/8) = 8312
  assert.match(out, /8인 기준 : 8,312/);
  // 16인: floor(9500 * 15/16) = 8906
  assert.match(out, /16인 기준 : 8,906/);
});

test('shareCommand — returns usage when gold is non-positive', async () => {
  const out = await shareCommand.handler(['0'], msg, ctx);
  assert.strictEqual(out, '!분배금 금액');
});

test('shareCommand — returns usage when arg is not a number', async () => {
  const out = await shareCommand.handler(['abc'], msg, ctx);
  assert.strictEqual(out, '!분배금 금액');
});
