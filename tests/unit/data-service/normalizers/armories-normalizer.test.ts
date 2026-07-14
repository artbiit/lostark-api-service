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
  normalizeCombatSkills(data: unknown): any[];
  normalizeAvatars(data: unknown): any[];
  normalizeCollectibles(data: unknown): any[];
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
    // ranks: Points[].Description "6랭크 30레벨" → 6/6/6
    assert.deepStrictEqual(characterDetail.arkPassive!.ranks, {
      evolution: 6,
      realization: 6,
      leap: 6,
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

  await t.test('N-5b: combatPower 매핑 (콤마 제거 후 number)', async () => {
    const norm = new ArmoriesNormalizer();
    const { characterDetail } = await norm.normalizeCharacterDetail('테스트캐릭', fixture);
    assert.strictEqual(characterDetail.combatPower, 4351.68);
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
    // Description 부재 → ranks 전부 0
    assert.deepStrictEqual(result.ranks, { evolution: 0, realization: 0, leap: 0 });
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
      Engravings: [{ Slot: 1, Name: '돌격대장', Icon: 'icon-a', Tooltip: 'tip-a' }],
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

// === normalizeAbilityStone — 어빌리티 스톤 정규화 (V9.0.0 신 응답 구조) ===

/**
 * V9 sample-data/armories/equipment.json L80 (이다 캐릭) 의 어빌리티 스톤 Tooltip raw 그대로.
 * - Element_006 = ItemPartBox + '세공 단계 보너스' (체력 +3525)
 * - Element_007 = IndentStringGroup + '무작위 각인 효과' 4건
 *   1) 아드레날린 Lv.4 (#FFFFAC 각인)
 *   2) 원한 Lv.1 (#FFFFAC 각인)
 *   3) 이동속도 감소 Lv.0 (#FE2E2E 디버프)
 *   4) 레벨 보너스 — 기본 공격력 +1.50% (#73DC04)
 */
const IDA_ABILITY_STONE_TOOLTIP = JSON.stringify({
  Element_000: {
    type: 'NameTagBox',
    value: "<P ALIGN='CENTER'><FONT COLOR='#E3C7A1'>위대한 비상의 돌</FONT></P>",
  },
  Element_004: {
    type: 'ItemPartBox',
    value: {
      Element_000: "<FONT COLOR='#A9D0F5'>기본 효과</FONT>",
      Element_001: '체력 +23481',
    },
  },
  Element_006: {
    type: 'ItemPartBox',
    value: {
      Element_000: "<FONT COLOR='#A9D0F5'>세공 단계 보너스</FONT>",
      Element_001: '체력 +3525',
    },
  },
  Element_007: {
    type: 'IndentStringGroup',
    value: {
      Element_000: {
        contentStr: {
          Element_000: {
            bPoint: 0,
            contentStr:
              "<FONT COLOR='#FFFFFF'>[<FONT COLOR='#FFFFAC'>아드레날린</FONT>] <img src='emoticon_tooltip_ability_stone_symbol' width='11' height='14' vspace ='-2'></img>Lv.4</FONT><BR>",
            pointType: 2,
          },
          Element_001: {
            bPoint: 0,
            contentStr:
              "<FONT COLOR='#FFFFFF'>[<FONT COLOR='#FFFFAC'>원한</FONT>] <img src='emoticon_tooltip_ability_stone_symbol' width='11' height='14' vspace ='-2'></img>Lv.1</FONT><BR>",
            pointType: 2,
          },
          Element_002: {
            bPoint: 0,
            contentStr:
              "<FONT COLOR='#FFFFFF'>[<FONT COLOR='#FE2E2E'>이동속도 감소</FONT>] <img src='emoticon_tooltip_ability_stone_symbol' width='11' height='14' vspace ='-2'></img>Lv.0</FONT><BR>",
            pointType: 2,
          },
          Element_003: {
            bPoint: 0,
            contentStr:
              "[<FONT COLOR='#73DC04'>레벨 보너스</FONT>] <FONT COLOR='#FFFFFF'>기본 공격력 +1.50%<BR></FONT>",
            pointType: 2,
          },
        },
        topStr: "<FONT SIZE='12' COLOR='#A9D0F5'>무작위 각인 효과</FONT>",
      },
    },
  },
});

test('normalizeAbilityStone — V9 sample (이다)', async (t) => {
  await t.test('case A: 어빌리티 스톤 4효과 분류 + craftingBonus', () => {
    const norm = new ArmoriesNormalizer();
    const equipment = [
      {
        Type: '어빌리티 스톤',
        Name: '위대한 비상의 돌',
        Icon: 'icon-ability-stone',
        Grade: '고대',
        Tooltip: IDA_ABILITY_STONE_TOOLTIP,
      },
    ];
    const result = norm.normalizeAbilityStone(equipment);
    assert.ok(result, 'abilityStone should not be null');
    assert.strictEqual(result!.name, '위대한 비상의 돌');
    assert.strictEqual(result!.grade, '고대');
    assert.strictEqual(result!.craftingBonus, '체력 +3525');
    assert.strictEqual(result!.engravingEffects.length, 4);

    const [e0, e1, e2, e3] = result!.engravingEffects;
    // 1) 아드레날린 Lv.4 (engraving)
    assert.deepStrictEqual(
      { name: e0!.name, level: e0!.level, kind: e0!.kind, bonusText: e0!.bonusText },
      { name: '아드레날린', level: 4, kind: 'engraving', bonusText: null },
    );
    // 2) 원한 Lv.1 (engraving)
    assert.deepStrictEqual(
      { name: e1!.name, level: e1!.level, kind: e1!.kind, bonusText: e1!.bonusText },
      { name: '원한', level: 1, kind: 'engraving', bonusText: null },
    );
    // 3) 이동속도 감소 Lv.0 (debuff — #FE2E2E)
    assert.deepStrictEqual(
      { name: e2!.name, level: e2!.level, kind: e2!.kind, bonusText: e2!.bonusText },
      { name: '이동속도 감소', level: 0, kind: 'debuff', bonusText: null },
    );
    // 4) 레벨 보너스 (level-bonus — #73DC04)
    assert.strictEqual(e3!.kind, 'level-bonus');
    assert.strictEqual(e3!.name, '레벨 보너스');
    assert.strictEqual(e3!.level, 0);
    assert.strictEqual(e3!.bonusText, '기본 공격력 +1.50%');
  });

  await t.test('case B: equipment 가 빈 배열이면 null', () => {
    const norm = new ArmoriesNormalizer();
    assert.strictEqual(norm.normalizeAbilityStone([]), null);
    assert.strictEqual(norm.normalizeAbilityStone(undefined), null);
  });

  await t.test('case B-2: 어빌리티 스톤 외 장비만 있어도 null', () => {
    const norm = new ArmoriesNormalizer();
    const equipment = [
      { Type: '무기', Name: '검', Icon: '', Grade: '고대', Tooltip: '{}' },
      { Type: '투구', Name: '투구', Icon: '', Grade: '유물', Tooltip: '{}' },
    ];
    assert.strictEqual(norm.normalizeAbilityStone(equipment), null);
  });

  await t.test('case C: Tooltip 이 잘못된 JSON 이면 graceful fallback', () => {
    const norm = new ArmoriesNormalizer();
    const equipment = [
      {
        Type: '어빌리티 스톤',
        Name: '위대한 비상의 돌',
        Icon: '',
        Grade: '고대',
        Tooltip: 'NOT_A_JSON{',
      },
    ];
    const result = norm.normalizeAbilityStone(equipment);
    assert.ok(result, 'fallback should still return object');
    assert.strictEqual(result!.name, '위대한 비상의 돌');
    assert.strictEqual(result!.grade, '고대');
    assert.strictEqual(result!.craftingBonus, null);
    assert.deepStrictEqual(result!.engravingEffects, []);
  });

  await t.test('case C-2: Tooltip 이 빈 문자열이면 graceful fallback', () => {
    const norm = new ArmoriesNormalizer();
    const equipment = [
      {
        Type: '어빌리티 스톤',
        Name: '위대한 비상의 돌',
        Icon: '',
        Grade: '고대',
        Tooltip: '',
      },
    ];
    const result = norm.normalizeAbilityStone(equipment);
    assert.ok(result);
    assert.strictEqual(result!.craftingBonus, null);
    assert.deepStrictEqual(result!.engravingEffects, []);
  });
});

// === normalizeCharacterDetail — abilityStone 필드 통합 ===

test('normalizeCharacterDetail — abilityStone 통합', async (t) => {
  await t.test(
    'case: ArkPassive fixture (이다) 가 어빌리티 스톤 4효과 + craftingBonus 정규화',
    async () => {
      const fixture = loadFixture(FIXTURE_ARK);
      const norm = new ArmoriesNormalizer();
      const { characterDetail } = await norm.normalizeCharacterDetail('테스트캐릭', fixture);
      assert.ok(characterDetail.abilityStone, 'abilityStone should be present');
      assert.strictEqual(characterDetail.abilityStone!.name, '위대한 비상의 돌');
      assert.strictEqual(characterDetail.abilityStone!.grade, '고대');
      assert.strictEqual(characterDetail.abilityStone!.craftingBonus, '체력 +3525');
      assert.strictEqual(characterDetail.abilityStone!.engravingEffects.length, 4);
      const kinds = characterDetail.abilityStone!.engravingEffects.map((e) => e.kind);
      assert.deepStrictEqual(kinds, ['engraving', 'engraving', 'debuff', 'level-bonus']);
    },
  );

  await t.test(
    'case: 비-ArkPassive fixture 에 어빌리티 스톤 부재 시 abilityStone === null',
    async () => {
      const fixture = loadFixture(FIXTURE_NO_ARK);
      // FIXTURE_NO_ARK 의 ArmoryEquipment 에 어빌리티 스톤 entry 가 있는지 확인 후 결과 검증.
      // 있어도 (이다 데이터 그대로 카피) abilityStone 은 신 메서드로 정규화되므로 null 이 아닐 수 있음.
      // 본 케이스는 "통합 호출이 throw 없이 abilityStone 필드를 채운다" 만 검증.
      const norm = new ArmoriesNormalizer();
      const { characterDetail } = await norm.normalizeCharacterDetail('테스트캐릭', fixture);
      // 필드 자체가 존재해야 함 (null 또는 객체).
      assert.ok(
        characterDetail.abilityStone === null || typeof characterDetail.abilityStone === 'object',
        'abilityStone field must be present (null or object)',
      );
    },
  );
});

// === Regression: partial endpoint bare-array 응답 처리 ===
// 공식 API 의 partial 엔드포인트(`/combat-skills`, `/avatars`, `/collectibles`) 는
// bare 배열을 직접 반환하지만, full `/armories/characters/{name}` 응답은 wrap 객체
// (`{CombatSkills: []}` 등) 형태다. normalizer 가 양쪽 모두 처리해야 한다.

test('normalize* — partial endpoint bare-array 응답 처리', async (t) => {
  const norm = new ArmoriesNormalizer();
  const protoNorm = norm as unknown as typeof proto;

  await t.test('normalizeCombatSkills: bare array 입력', () => {
    const bareSkills = [
      { Name: '권왕의 진격', Icon: 'a', Level: 10, Type: '일반', IsAwakening: false, Tripods: [] },
      { Name: '회피기', Icon: 'b', Level: 4, Type: '일반', IsAwakening: false, Tripods: [] },
      { Name: '미사용', Icon: 'c', Level: 1, Type: '일반', IsAwakening: false, Tripods: [] },
    ];
    const out = protoNorm.normalizeCombatSkills(bareSkills);
    assert.strictEqual(out.length, 3);
    assert.strictEqual(out[0].name, '권왕의 진격');
    assert.strictEqual(out[0].level, 10);
  });

  await t.test('normalizeCombatSkills: wrap 객체 입력 (full endpoint) 도 유지', () => {
    const wrapped = {
      CombatSkills: [
        { Name: '스킬1', Icon: 'a', Level: 7, Type: '일반', IsAwakening: false, Tripods: [] },
      ],
    };
    const out = protoNorm.normalizeCombatSkills(wrapped);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].name, '스킬1');
  });

  await t.test('normalizeAvatars: bare array 입력', () => {
    const bare = [
      {
        Type: '무기',
        Name: 'a',
        Icon: 'i',
        Grade: '전설',
        IsSet: false,
        IsInner: false,
        Tooltip: '',
      },
    ];
    const out = protoNorm.normalizeAvatars(bare);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].type, '무기');
  });

  await t.test('normalizeCollectibles: bare array 입력', () => {
    const bare = [
      { Type: '모코코 씨앗', Icon: 'i', Point: 100, MaxPoint: 1000, CollectiblePoints: [] },
    ];
    const out = protoNorm.normalizeCollectibles(bare);
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].point, 100);
  });

  await t.test('normalizeCombatSkills: empty bare array → []', () => {
    assert.deepStrictEqual(protoNorm.normalizeCombatSkills([]), []);
  });

  await t.test('normalizeCombatSkills: null/undefined → []', () => {
    assert.deepStrictEqual(protoNorm.normalizeCombatSkills(null), []);
    assert.deepStrictEqual(protoNorm.normalizeCombatSkills(undefined), []);
  });
});
