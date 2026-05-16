/**
 * !vs (pick-one) 핸들러 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { pickOneCommand } from '@lostark/udp-gateway/commands/minigame/pick-one.js';
import type { KakaoMessage } from '@lostark/udp-gateway/contracts/envelope.js';

const msg: KakaoMessage = { sender: { name: 't', hash: 'h' }, content: '!vs A B' };
const ctx = {} as any;

test('pickOneCommand — picks one of provided args', async () => {
  const args = ['짜장', '짬뽕', '탕수육'];
  for (let i = 0; i < 30; i++) {
    const out = await pickOneCommand.handler(args, msg, ctx);
    assert.ok(typeof out === 'string');
    assert.match(out as string, /^당연히 .+!$/);
    const picked = (out as string).replace('당연히 ', '').replace(/!$/, '');
    assert.ok(args.includes(picked), `picked='${picked}' not in args`);
  }
});

test('pickOneCommand — supports two-arg picks', async () => {
  const args = ['A', 'B'];
  const out = await pickOneCommand.handler(args, msg, ctx);
  const picked = (out as string).replace('당연히 ', '').replace(/!$/, '');
  assert.ok(args.includes(picked));
});
