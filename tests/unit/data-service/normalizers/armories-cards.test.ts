/**
 * ArmoriesNormalizer.normalizeCards 단위 테스트.
 * - Cards 와 Effects 가 모두 함께 정규화되는지 확인 (legacy 누락 정정).
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { ArmoriesNormalizer } from '@lostark/data-service';

// private 메서드 접근을 위해 prototype 캐스팅.
const proto = ArmoriesNormalizer.prototype as unknown as {
  normalizeCards(data: unknown): {
    cards: Array<{ slot: number; name: string }>;
    effects: Array<{
      index: number;
      cardSlots: number[];
      items: Array<{ name: string; description: string }>;
    }>;
  };
};

test('normalizeCards', async (t) => {
  await t.test('returns empty arrays for missing input', () => {
    const result = proto.normalizeCards.call(new ArmoriesNormalizer(), undefined);
    assert.deepStrictEqual(result, { cards: [], effects: [] });
  });

  await t.test('returns empty effects when Effects missing', () => {
    const data = {
      Cards: [
        {
          Slot: 0,
          Name: '에버그레이스',
          Icon: 'http://x',
          AwakeCount: 5,
          AwakeTotal: 5,
          Grade: '전설',
          Tooltip: '',
        },
      ],
    };
    const result = proto.normalizeCards.call(new ArmoriesNormalizer(), data);
    assert.strictEqual(result.cards.length, 1);
    assert.strictEqual(result.cards[0]!.name, '에버그레이스');
    assert.deepStrictEqual(result.effects, []);
  });

  await t.test('normalizes Effects with items', () => {
    const data = {
      Cards: [],
      Effects: [
        {
          Index: 0,
          CardSlots: [0, 1, 2, 3, 4, 5],
          Items: [
            { Name: '굳센 대지의 숨결 2세트', Description: '뇌속성 피해 감소 +10.00%' },
            { Name: '굳센 대지의 숨결 4세트', Description: '뇌속성 피해 감소 +10.00%' },
          ],
        },
      ],
    };
    const result = proto.normalizeCards.call(new ArmoriesNormalizer(), data);
    assert.strictEqual(result.effects.length, 1);
    assert.strictEqual(result.effects[0]!.index, 0);
    assert.deepStrictEqual(result.effects[0]!.cardSlots, [0, 1, 2, 3, 4, 5]);
    assert.strictEqual(result.effects[0]!.items.length, 2);
    assert.strictEqual(result.effects[0]!.items[0]!.name, '굳센 대지의 숨결 2세트');
  });
});
