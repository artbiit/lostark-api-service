/**
 * markets formatter (!비싼유각/!전각/!유각) 단위 테스트.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import {
  formatEngravingSearch,
  formatExpensiveEngravings,
} from '@lostark/udp-gateway/formatters/markets.js';

test('formatExpensiveEngravings — renders price-sorted list', () => {
  const result = {
    Items: [
      { Name: '[유물] 돌격대장 각인서', CurrentMinPrice: 12000 },
      { Name: '[유물] 원한 각인서', YDayAvgPrice: 9000 },
      { Name: '예지 각인서', RecentPrice: 5000 },
    ],
  };
  const out = formatExpensiveEngravings(result);
  assert.match(out, /\[비싼 각인서\]/);
  assert.match(out, /\[돌격대장\] 12,000/);
  assert.match(out, /\[원한\] 9,000/);
  assert.match(out, /\[예지\] 5,000/);
});

test('formatExpensiveEngravings — returns fallback when Items empty', () => {
  const out = formatExpensiveEngravings({ Items: [] });
  assert.strictEqual(out, '각인서를 찾을 수 없습니다.');
});

test('formatExpensiveEngravings — returns fallback when Items missing', () => {
  const out = formatExpensiveEngravings({});
  assert.strictEqual(out, '각인서를 찾을 수 없습니다.');
});

test('formatEngravingSearch — returns single-line min price string', () => {
  const result = {
    Items: [{ Name: '[전설] 돌격대장 각인서', CurrentMinPrice: 4000 }],
  };
  const out = formatEngravingSearch(result);
  assert.strictEqual(out, '[돌격대장] : 4,000');
});

test('formatEngravingSearch — uses YDayAvgPrice fallback when CurrentMinPrice missing', () => {
  const result = {
    Items: [{ Name: '[유물] 원한 각인서', YDayAvgPrice: 8500 }],
  };
  const out = formatEngravingSearch(result);
  assert.strictEqual(out, '[원한] : 8,500');
});

test('formatEngravingSearch — returns fallback when Items empty', () => {
  const out = formatEngravingSearch({ Items: [] });
  assert.strictEqual(out, '각인서를 찾을 수 없습니다.');
});
