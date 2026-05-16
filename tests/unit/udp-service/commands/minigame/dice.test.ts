/**
 * !주사위 핸들러 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { diceCommand } from '@lostark/udp-gateway/commands/minigame/dice.js';
import type { KakaoMessage } from '@lostark/udp-gateway/contracts/envelope.js';

const msg: KakaoMessage = { sender: { name: 't', hash: 'h' }, content: '!주사위' };
const ctx = {} as any;

test('diceCommand', async (t) => {
  await t.test('no args → 0~100 어딘가의 정수를 반환', async () => {
    const out = await diceCommand.handler([], msg, ctx);
    assert.ok(typeof out === 'string');
    assert.match(out as string, /^주사위 결과 : /);
    const value = Number((out as string).replace('주사위 결과 : ', ''));
    assert.ok(Number.isInteger(value));
    assert.ok(value >= 0 && value <= 100);
  });

  await t.test('범위 지정 → 5~10 사이 정수', async () => {
    for (let i = 0; i < 30; i++) {
      const out = await diceCommand.handler(['5', '10'], msg, ctx);
      assert.match(out as string, /^주사위 결과 : /);
      const value = Number((out as string).replace('주사위 결과 : ', ''));
      assert.ok(Number.isInteger(value));
      assert.ok(value >= 5 && value <= 10, `value=${value}`);
    }
  });

  await t.test('잘못된 범위 (max < min) → 주사위 결과 : 0', async () => {
    const out = await diceCommand.handler(['100', '5'], msg, ctx);
    assert.strictEqual(out, '주사위 결과 : 0');
  });

  await t.test('숫자가 아닌 인자 → 주사위 결과 : 0', async () => {
    const out = await diceCommand.handler(['abc', 'xyz'], msg, ctx);
    assert.strictEqual(out, '주사위 결과 : 0');
  });
});
