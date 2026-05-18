/**
 * ArmoriesNormalizer.normalizeColosseums 단위 테스트.
 *
 * - legacy 의 deathmatch 키 제거 확인
 * - CoOpBattle / OneDeathmatch / OneDeathmatchRank 신규 키 노출 확인
 * - 모든 모드 optional (null 인 모드는 키 자체 생략)
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { ArmoriesNormalizer } from '@lostark/data-service';

const proto = ArmoriesNormalizer.prototype as unknown as {
  normalizeColosseums(data: unknown): Array<{
    seasonName: string;
    competitive?: unknown;
    teamDeathmatch?: unknown;
    teamElimination?: unknown;
    coOpBattle?: unknown;
    oneDeathmatch?: unknown;
    oneDeathmatchRank?: unknown;
  }>;
};

test('normalizeColosseums', async (t) => {
  await t.test('returns [] for missing input', () => {
    const result = proto.normalizeColosseums.call(new ArmoriesNormalizer(), undefined);
    assert.deepStrictEqual(result, []);
  });

  await t.test('omits null modes (no key emitted)', () => {
    const data = {
      Colosseums: [
        {
          SeasonName: '프리 시즌',
          Competitive: null,
          TeamDeathmatch: null,
          TeamElimination: null,
          CoOpBattle: null,
          OneDeathmatch: null,
          OneDeathmatchRank: null,
        },
      ],
    };
    const result = proto.normalizeColosseums.call(new ArmoriesNormalizer(), data);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0]!.seasonName, '프리 시즌');
    assert.ok(!('competitive' in result[0]!));
    assert.ok(!('teamDeathmatch' in result[0]!));
    assert.ok(!('coOpBattle' in result[0]!));
    assert.ok(!('deathmatch' in (result[0]! as any)), 'legacy deathmatch key should not exist');
  });

  await t.test('exposes Competitive when present', () => {
    const data = {
      Colosseums: [
        {
          SeasonName: '시즌 5',
          Competitive: {
            Rank: 19395,
            RankName: '브론즈',
            RankIcon: 'http://x',
            RankLastMmr: 992,
          },
          TeamDeathmatch: null,
          TeamElimination: null,
          CoOpBattle: null,
          OneDeathmatch: null,
          OneDeathmatchRank: null,
        },
      ],
    };
    const result = proto.normalizeColosseums.call(new ArmoriesNormalizer(), data);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0]!.competitive != null);
    assert.deepStrictEqual((result[0]!.competitive as any).RankName, '브론즈');
  });

  await t.test('exposes new V9 modes (CoOpBattle, OneDeathmatch, OneDeathmatchRank)', () => {
    const data = {
      Colosseums: [
        {
          SeasonName: '시즌 99',
          Competitive: null,
          TeamDeathmatch: null,
          TeamElimination: null,
          CoOpBattle: { Rank: 1 },
          OneDeathmatch: { Rank: 2 },
          OneDeathmatchRank: { Rank: 3 },
        },
      ],
    };
    const result = proto.normalizeColosseums.call(new ArmoriesNormalizer(), data);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0]!.coOpBattle, { Rank: 1 });
    assert.deepStrictEqual(result[0]!.oneDeathmatch, { Rank: 2 });
    assert.deepStrictEqual(result[0]!.oneDeathmatchRank, { Rank: 3 });
  });
});
