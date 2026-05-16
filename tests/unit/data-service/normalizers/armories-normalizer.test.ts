/**
 * ArmoriesNormalizer.normalizeCharacterDetail / normalizeArkPassive /
 * normalizeEngravings / normalizeCombatSkills 단위 테스트 (F7).
 *
 * fixture 출처:
 *   - tests/fixtures/armories/character-ark-passive.json
 *     (= sample-data/armories/characters.json 의 ArmorySkills→ArmorySkill 변환 + CharacterName sanitize)
 *   - tests/fixtures/armories/character-no-ark-passive.json
 *     (= 위 fixture 의 ArkPassive=null + ArmoryEngraving.Engravings-only 변형)
 */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';

import { ArmoriesNormalizer } from '@lostark/data-service';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ARK = resolve(__dirname, '../../../fixtures/armories/character-ark-passive.json');
const FIXTURE_NO_ARK = resolve(
  __dirname,
  '../../../fixtures/armories/character-no-ark-passive.json',
);

function loadFixture(p: string): any {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

// private 메서드 접근용 캐스팅.
const proto = ArmoriesNormalizer.prototype as unknown as {
  normalizeArkPassive(data: unknown): any;
  normalizeEngravings(data: unknown): any[];
};

// === N-1 ArkPassive 활성 캐릭 정규화 ===

test('normalizeCharacterDetail — ArkPassive 활성', async (t) => {
  const fixture = loadFixture(FIXTURE_ARK);

  await t.test('N-1: arkPassive.points + realizationName 매핑', async () => {
    const norm = new ArmoriesNormalizer();
    const { characterDetail } = await norm.normalizeCharacterDetail('테스트캐릭', fixture);
    assert.ok(characterDetail.arkPassive, 'arkPassive should be present');
    assert.deepStrictEqual(characterDetail.arkPassive!.points, {
      evolution: 120,
      realization: 101,
      leap: 70,
    });
    assert.strictEqual(characterDetail.arkPassive!.realizationName, '수라의 길');
    assert.strictEqual(characterDetail.arkPassive!.isArkPassive, true);
    assert.strictEqual(characterDetail.arkPassive!.title, '수라의 길');
    // engravingEffects 는 ArkPassiveEffects 기반 5개
    assert.strictEqual(characterDetail.arkPassive!.engravingEffects.length, 5);
  });

  await t.test('N-3: engravings 가 ArkPassiveEffects 기반', async () => {
    const norm = new ArmoriesNormalizer();
    const { characterDetail } = await norm.normalizeCharacterDetail('테스트캐릭', fixture);
    assert.strictEqual(characterDetail.engravings.length, 5);
    const first = characterDetail.engravings[0]!;
    assert.strictEqual(first.slot, 0);
    assert.strictEqual(first.name, '아드레날린');
    assert.strictEqual(first.icon, '');
    assert.strictEqual(first.level, 4);
    assert.strictEqual(first.grade, '유물');
    assert.ok(typeof first.tooltip === 'string' && first.tooltip.length > 0);
  });

  await t.test('N-4: guildMemberGrade 매핑', async () => {
    const norm = new ArmoriesNormalizer();
    const { characterDetail } = await norm.normalizeCharacterDetail('테스트캐릭', fixture);
    assert.strictEqual(characterDetail.guildMemberGrade, '길드장');
  });

  await t.test('N-5: characterLevel 직접 매핑', async () => {
    const norm = new ArmoriesNormalizer();
    const { characterDetail } = await norm.normalizeCharacterDetail('테스트캐릭', fixture);
    assert.strictEqual(characterDetail.characterLevel, 70);
  });

  await t.test('N-6: Rune.Grade/Tooltip 매핑', async () => {
    const norm = new ArmoriesNormalizer();
    const { characterDetail } = await norm.normalizeCharacterDetail('테스트캐릭', fixture);
    const withRune = characterDetail.combatSkills.find((s) => s.rune);
    assert.ok(withRune, 'at least one skill should have rune in fixture');
    assert.strictEqual(withRune!.rune!.grade, '전설');
    assert.ok(
      typeof withRune!.rune!.tooltip === 'string' && withRune!.rune!.tooltip.length > 0,
      'rune.tooltip should be a non-empty string',
    );
  });
});

// === N-2 ArkPassive 비활성 ===

test('normalizeCharacterDetail — ArkPassive 비활성', async (t) => {
  const fixture = loadFixture(FIXTURE_NO_ARK);

  await t.test('N-2: arkPassive === null, engravings[*].level undefined', async () => {
    const norm = new ArmoriesNormalizer();
    const { characterDetail } = await norm.normalizeCharacterDetail('테스트캐릭', fixture);
    assert.strictEqual(characterDetail.arkPassive, null);
    assert.strictEqual(characterDetail.engravings.length, 3);
    for (const e of characterDetail.engravings) {
      assert.strictEqual(e.level, undefined);
      assert.strictEqual(e.grade, undefined);
    }
  });
});

// === N-7 ArkPassive Effects[] 비어있을 때 realizationName ===

test('normalizeArkPassive — fallback paths', async (t) => {
  await t.test('N-7: Effects 가 빈 배열이면 realizationName === null (throw 없음)', () => {
    const result = proto.normalizeArkPassive.call(new ArmoriesNormalizer(), {
      Title: '제목',
      IsArkPassive: true,
      Points: [
        { Name: '진화', Value: 10 },
        { Name: '깨달음', Value: 20 },
        { Name: '도약', Value: 30 },
      ],
      Effects: [],
    });
    assert.strictEqual(result.realizationName, null);
    assert.deepStrictEqual(result.points, { evolution: 10, realization: 20, leap: 30 });
  });

  await t.test('arkPassiveData === null 이면 결과 === null', () => {
    const result = proto.normalizeArkPassive.call(new ArmoriesNormalizer(), null);
    assert.strictEqual(result, null);
  });

  await t.test('arkPassiveData === undefined 면 결과 === null', () => {
    const result = proto.normalizeArkPassive.call(new ArmoriesNormalizer(), undefined);
    assert.strictEqual(result, null);
  });
});

// === normalizeEngravings 단위 ===

test('normalizeEngravings — 분기', async (t) => {
  await t.test('ArkPassiveEffects 가 있으면 그 배열을 매핑', () => {
    const data = {
      Engravings: null,
      Effects: null,
      ArkPassiveEffects: [
        {
          AbilityStoneLevel: 4,
          Grade: '유물',
          Level: 4,
          Name: '아드레날린',
          Description: 'desc-1',
        },
        {
          AbilityStoneLevel: 4,
          Grade: '영웅',
          Level: 3,
          Name: '원한',
          Description: 'desc-2',
        },
      ],
    };
    const result = proto.normalizeEngravings.call(new ArmoriesNormalizer(), data);
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(result[0], {
      slot: 0,
      name: '아드레날린',
      icon: '',
      tooltip: 'desc-1',
      level: 4,
      grade: '유물',
    });
    assert.strictEqual(result[1]?.grade, '영웅');
    assert.strictEqual(result[1]?.level, 3);
  });

  await t.test('ArkPassiveEffects 가 없으면 Engravings 배열 사용 (level/grade undefined)', () => {
    const data = {
      Engravings: [
        { Slot: 1, Name: '돌격대장', Icon: 'icon-a', Tooltip: 'tip-a' },
      ],
      Effects: [],
    };
    const result = proto.normalizeEngravings.call(new ArmoriesNormalizer(), data);
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0], {
      slot: 1,
      name: '돌격대장',
      icon: 'icon-a',
      tooltip: 'tip-a',
    });
  });

  await t.test('engravingData null/undefined 면 []', () => {
    assert.deepStrictEqual(proto.normalizeEngravings.call(new ArmoriesNormalizer(), null), []);
    assert.deepStrictEqual(proto.normalizeEngravings.call(new ArmoriesNormalizer(), undefined), []);
  });
});
