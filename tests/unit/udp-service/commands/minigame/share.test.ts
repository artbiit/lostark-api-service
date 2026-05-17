/**
 * !분배금 (share) 핸들러 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { shareCommand } from '@lostark/udp-gateway/commands/minigame/share.js';
import type { KakaoMessage } from '@lostark/udp-gateway/contracts/envelope.js';

const msg: KakaoMessage = { sender: { name: 't', hash: 'h' }, content: '!분배금' };
const ctx = {} as any;

test('shareCommand — outputs 4인/8인 손익분기 입찰 한도 + 비낙찰 분배', async () => {
  const out = (await shareCommand.handler(['100000'], msg, ctx)) as string;
  // 입력 라인
  assert.match(out, /시장최저가 100,000골드/);
  // 4인 블록: 자가소비 71,250 (71.3%), 재판매 67,687 (67.7%), 비낙찰 16,921
  assert.match(out, /\[4인 파티\]/);
  assert.match(out, /자가소비 한도 : 71,250 \(71\.3%\)/);
  assert.match(out, /재판매 한도   : 67,687 \(67\.7%\)/);
  assert.match(out, /비낙찰 분배   : 16,921/);
  // 8인 블록: 자가소비 83,125 (83.1%), 재판매 78,968 (79.0%), 비낙찰 9,871
  assert.match(out, /\[8인 레이드\]/);
  assert.match(out, /자가소비 한도 : 83,125 \(83\.1%\)/);
  assert.match(out, /재판매 한도   : 78,968 \(79\.0%\)/);
  assert.match(out, /비낙찰 분배   : 9,871/);
  // 안내 푸터
  assert.match(out, /거래소 수수료 5% 1회 반영/);
});

test('shareCommand — 16인 인원 제거 (게임 메커니즘 미확인)', async () => {
  const out = (await shareCommand.handler(['100000'], msg, ctx)) as string;
  assert.doesNotMatch(out, /16인/);
});

test('shareCommand — 기존 "분배금 :" 라벨 제거됨 (라벨 재구성)', async () => {
  const out = (await shareCommand.handler(['100000'], msg, ctx)) as string;
  assert.doesNotMatch(out, /^\d+인 기준 : /m);
});

test('shareCommand — 다른 입력값에서도 공식 일관성 유지', async () => {
  const out = (await shareCommand.handler(['50000'], msg, ctx)) as string;
  // 50,000 × 0.95 × 3/4 = 35,625
  assert.match(out, /자가소비 한도 : 35,625/);
  // 50,000 × 0.95² × 3/4 = 33,843.75 → 33,843
  assert.match(out, /재판매 한도   : 33,843/);
});

test('shareCommand — returns usage when gold is non-positive', async () => {
  const out = await shareCommand.handler(['0'], msg, ctx);
  assert.strictEqual(out, '!분배금 금액');
});

test('shareCommand — returns usage when arg is not a number', async () => {
  const out = await shareCommand.handler(['abc'], msg, ctx);
  assert.strictEqual(out, '!분배금 금액');
});
