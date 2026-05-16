/**
 * characters formatter (!부캐) 단위 테스트.
 *
 * 정상 케이스: 동일 서버 캐릭터 itemLevel 내림차순 정렬
 * fallback 케이스: 빈 characters 배열
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { formatSiblings } from '@lostark/udp-gateway/formatters/characters.js';

test('formatSiblings — same server characters sorted by itemLevel desc', () => {
  const data = {
    accountInfo: {
      characters: [
        {
          characterName: '아트네',
          serverName: '루페온',
          characterClassName: '디스트로이어',
          characterLevel: 70,
          itemLevel: 1700,
        },
        {
          characterName: '서브1',
          serverName: '루페온',
          characterClassName: '바드',
          characterLevel: 60,
          itemLevel: 1620,
        },
        {
          characterName: '다른섭',
          serverName: '실리안',
          characterClassName: '워로드',
          characterLevel: 70,
          itemLevel: 1750,
        },
      ],
    },
  };
  const out = formatSiblings('아트네', data);
  assert.match(out, /<아트네님과 같은 루페온 서버 캐릭터들>/);
  assert.match(out, /디스트로이어/);
  assert.match(out, /아트네/);
  assert.match(out, /바드/);
  assert.match(out, /서브1/);
  // 다른 서버 캐릭은 포함되지 않아야 함
  assert.ok(!out.includes('다른섭'));
  assert.ok(!out.includes('실리안'));
  // 정렬: itemLevel 내림차순 → 1700 이 1620 보다 먼저
  const idx1700 = out.indexOf('(1700)');
  const idx1620 = out.indexOf('(1620)');
  assert.ok(idx1700 >= 0 && idx1620 > idx1700);
});

test('formatSiblings — empty characters returns fallback', () => {
  const out = formatSiblings('아트네', { accountInfo: { characters: [] } });
  assert.strictEqual(out, '아트네 캐릭터는 없는 것 같숨미당');
});
