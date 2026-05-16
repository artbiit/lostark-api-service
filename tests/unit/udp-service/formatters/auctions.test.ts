/**
 * auctions formatter (!보석값) 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { formatGemSearch } from '@lostark/udp-gateway/formatters/auctions.js';

test('formatGemSearch — renders min/avg + top10 prices', () => {
  const items = [
    {
      name: '10레벨 멸화의 보석',
      auctionInfo: { buyPrice: 1_000_000 },
      options: [{ className: '디스트로이어' }],
    },
    {
      name: '10레벨 멸화의 보석',
      auctionInfo: { buyPrice: 1_200_000 },
      options: [{ className: '바드' }],
    },
    {
      name: '10레벨 멸화의 보석',
      auctionInfo: { buyPrice: 1_500_000 },
      options: [{ className: '워로드' }],
    },
  ];
  const out = formatGemSearch('멸화 10레벨', { items });
  assert.match(out, /\[10레벨 멸화의 보석\] 검색 결과/);
  assert.match(out, /\[최저가\] : 1,000,000/);
  // 평균: floor((1_000_000+1_200_000+1_500_000)/3) = 1,233,333
  assert.match(out, /\[평균가\] : 1,233,333/);
  assert.match(out, /최저가 3개 목록/);
  assert.match(out, /1,000,000 \(디스트로이어\)/);
  assert.match(out, /1,200,000 \(바드\)/);
  assert.match(out, /1,500,000 \(워로드\)/);
});

test('formatGemSearch — returns fallback when items empty', () => {
  const out = formatGemSearch('멸화 10레벨', { items: [] });
  assert.strictEqual(out, '멸화 10레벨 못찾았슴미다.');
});
