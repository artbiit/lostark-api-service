/**
 * !질문 (fortune) 핸들러 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { fortuneCommand } from '@lostark/udp-gateway/commands/minigame/fortune.js';
import type { KakaoMessage } from '@lostark/udp-gateway/contracts/envelope.js';

const msg: KakaoMessage = { sender: { name: '아트네', hash: 'h' }, content: '!질문' };
const ctx = {} as any;

test('fortuneCommand — returns one of two patterns', async () => {
  // 30번 시도하여 두 분기 모두 비어있지 않음을 확인.
  for (let i = 0; i < 30; i++) {
    const out = (await fortuneCommand.handler([], msg, ctx)) as string;
    assert.ok(typeof out === 'string' && out.length > 0);
    // 분기 (Math.random() > 0.5): `그 ${name} 래` 또는 `안 ${name} 돼`.
    assert.ok(
      out === `그 ${msg.sender.name} 래` || out === `안 ${msg.sender.name} 돼`,
      `unexpected: '${out}'`,
    );
  }
});

test('fortuneCommand — uses sender name in response', async () => {
  const customMsg: KakaoMessage = {
    sender: { name: '테스터', hash: 'h2' },
    content: '!질문',
  };
  const out = (await fortuneCommand.handler([], customMsg, ctx)) as string;
  assert.ok(out.includes('테스터'));
});
