/**
 * @cursor-change: 2026-07-15, ADR-0004, !프로키온 핸들러 3분기 회귀 테스트
 *
 * 버그: 수요일 점검 시간대에 calendar API 503 → SWR stale row → formatProcyon
 * 미래필터 전멸 → "금일 주요 콘텐츠는 더이상 없습니다." 오응답.
 *
 * AC-5 (stale → 점검 메시지) / AC-6 (fresh+빈결과 → 기존 메시지 회귀 없음) /
 * AC-7 (throw → 기존 실패 메시지 보존). AC-11: 본 파일 top-level test() 정확히 3개.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { procyonCommand } from '../../../../../packages/udp-service/src/commands/gamecontents/procyon.js';
import { MaintenanceUnavailableError } from '../../../../../packages/data-service/src/cache/domain-cache-manager.js';

/** getCalendarWithCache 만 스텁한 최소 ctx. */
function makeCtx(getCalendarWithCache: () => Promise<unknown>): any {
  return {
    gameContentsService: { getCalendarWithCache },
    logger: {
      info: () => undefined,
      warn: () => undefined,
      debug: () => undefined,
      error: () => undefined,
    },
  };
}

const msg: any = { sender: { name: '아트네', hash: 'h1' }, content: '!프로키온' };

test('procyon — stale(점검) returns maintenance-in-progress message', async () => {
  const ctx = makeCtx(async () => ({
    data: [],
    source: 'database-stale',
    stale: true,
    staleAgeSeconds: 259200,
  }));

  const out = await procyonCommand.handler([], msg, ctx);
  assert.equal(out, '로스트아크 점검 중으로 최신 프로키온 정보를 불러올 수 없습니다.');
});

test('procyon — fresh empty result keeps "금일 주요 콘텐츠" message (AC-6 regression)', async () => {
  // stale=false 이고 formatProcyon 이 빈 결과를 내는 정상 케이스 —
  // 점검 메시지 수정이 정상 케이스를 오염시키지 않아야 한다.
  const ctx = makeCtx(async () => ({ data: [], source: 'database', stale: false }));

  const out = await procyonCommand.handler([], msg, ctx);
  assert.equal(out, '금일 주요 콘텐츠는 더이상 없습니다.');
});

test('procyon — thrown MaintenanceUnavailableError returns generic failure message', async () => {
  const ctx = makeCtx(async () => {
    throw new MaintenanceUnavailableError('gamecontents:calendar:v1', new Error('HTTP 503'));
  });

  const out = await procyonCommand.handler([], msg, ctx);
  assert.equal(out, '프로키온 정보를 불러올 수 없습니다.');
});
