/**
 * armories formatter 11종 단위 테스트.
 *
 * - 각 formatter 에 대해 정상 케이스 1개 + empty/fallback 케이스 1개 (≥ 22 케이스).
 * - input 은 NormalizedCharacterDetail 의 최소 필드만 inline 으로 선언.
 * - assert.match 로 부분 검증, assert.strictEqual 로 fallback 정확 일치 검증.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import {
  formatAbilityStone,
  formatAvatarUrl,
  formatAvatars,
  formatCards,
  formatCollectibles,
  formatColosseums,
  formatEngravings,
  formatEquipment,
  formatGems,
  formatProfile,
  formatSkills,
} from '@lostark/udp-gateway/formatters/armories.js';

// === formatProfile ===

test('formatProfile', async (t) => {
  await t.test('returns multi-line profile when stats present', () => {
    const detail = {
      title: '심판자',
      className: '디스트로이어',
      itemLevel: 1700,
      characterLevel: 70,
      expeditionLevel: 80,
      serverName: '루페온',
      guildName: '아트네',
      engravings: [{ name: '돌격대장' }, { name: '원한' }],
      profile: {
        stats: [
          { type: '치명', value: 1000 },
          { type: '특화', value: 1200 },
          { type: '신속', value: 800 },
          { type: '공격력', value: '50000' },
          { type: '최대 생명력', value: '90000' },
        ],
        skillPoints: { used: 400, total: 420 },
        pvpGrade: '브론즈',
        tendencies: [],
      },
    };
    const out = formatProfile('아트네', detail);
    assert.match(out, /심판자 아트네/);
    assert.match(out, /디스트로이어/);
    assert.match(out, /템\/전\t1700/);
    assert.match(out, /원정대\t/);
    assert.match(out, /서버\/길드\t루페온\/아트네/);
    assert.match(out, /전투특성\t/);
    assert.match(out, /스킬포인트\t400\/420/);
    assert.match(out, /pvp\t브론즈/);
    assert.match(out, /공격력\/체력\t50000\/90000/);
  });

  await t.test('falls back gracefully when profile missing', () => {
    const detail = { serverName: '루페온' } as Record<string, unknown>;
    const out = formatProfile('빈캐', detail);
    assert.match(out, /빈캐/);
    assert.match(out, /템\/전\t0/);
    assert.match(out, /원정대\t0/);
    assert.match(out, /서버\/길드\t루페온\/없음/);
  });

  // 회귀: getCharacterDetailPartial 이 sections 만 채워서 top-level
  // serverName/guildName 이 undefined 인 경우, '서버/길드 undefined/없음' 으로
  // 박혀 노출되던 버그. (F2)
  await t.test('renders 알 수 없음 when serverName missing', () => {
    const detail = {} as Record<string, unknown>;
    const out = formatProfile('미상캐', detail);
    assert.doesNotMatch(out, /undefined/);
    assert.match(out, /서버\/길드\t알 수 없음\/없음/);
  });

  // F-1: 각인 3줄 (이름 첫글자 / 등급 첫글자 / 레벨)
  await t.test('F-1: renders engraving 3-row block (name/grade/level)', () => {
    const detail = {
      className: '브레이커',
      engravings: [
        { name: '아드레날린', grade: '유물', level: 4 },
        { name: '원한', grade: '유물', level: 4 },
        { name: '돌격대장', grade: '유물', level: 4 },
        { name: '결투의 대가', grade: '유물', level: 4 },
        { name: '예리한 둔기', grade: '유물', level: 4 },
      ],
    };
    const out = formatProfile('아트네', detail);
    assert.match(out, /아 원 돌 결 예/);
    assert.match(out, /유 유 유 유 유/);
    assert.match(out, /4 4 4 4 4/);
  });

  // F-2: 진/깨/도
  await t.test('F-2: renders 진/깨/도 line from arkPassive.points', () => {
    const detail = {
      className: '브레이커',
      arkPassive: {
        isArkPassive: true,
        title: '수라의 길',
        realizationName: '수라의 길',
        points: { evolution: 120, realization: 101, leap: 70 },
        engravingEffects: [],
      },
    };
    const out = formatProfile('아트네', detail);
    assert.match(out, /진\/깨\/도\t120\/101\/70/);
  });

  // F-3: 엘/초/상 — 빈 tooltip 이라도 라인은 출력
  await t.test('F-3: renders 엘/초/상 line when equipment present', () => {
    const detail = {
      itemLevel: 1700,
      equipment: [
        { type: '무기', name: '+25 무기', tooltip: '' },
        { type: '투구', name: '+25 투구', tooltip: '' },
      ],
    };
    const out = formatProfile('아트네', detail);
    assert.match(out, /엘\/초\/상\t0\/0\/0/);
  });

  // F-4: 길드 등급 표기
  await t.test('F-4: renders guild grade after guildName', () => {
    const detail = {
      serverName: '루페온',
      guildName: '모코코',
      guildMemberGrade: '길드장',
    };
    const out = formatProfile('아트네', detail);
    assert.match(out, /서버\/길드\t루페온\/모코코의 길드장/);
  });

  // F-5: 갱신 시간
  await t.test('F-5: renders 갱신된 시간 line when metadata.normalizedAt present', () => {
    const detail = {
      metadata: { normalizedAt: new Date(Date.now() - 1000 * 60 * 5) },
    };
    const out = formatProfile('아트네', detail);
    assert.match(out, /갱신된 시간 /);
  });

  // F-6: 돌 오우너 ≥ 16
  await t.test('F-6: renders 돌 오우너 when positive total >= 16', () => {
    // tooltip: IndentStringGroup with positive entries +9 and +9 (sum 18)
    const tooltip = JSON.stringify({
      e0: {
        type: 'IndentStringGroup',
        value: {
          Element_000: {
            contentStr: {
              k0: { contentStr: '[원한] 효과 +9' },
              k1: { contentStr: '[돌격대장] 효과 +9' },
              k2: { contentStr: '[감소] +7' },
            },
          },
        },
      },
    });
    const detail = {
      equipment: [{ type: '어빌리티 스톤', name: '돌', tooltip }],
    };
    const out = formatProfile('아트네', detail);
    assert.match(out, /"99돌 오우너"/);
  });

  // F-7: 돌 오우너 임계 미만
  await t.test('F-7: omits 돌 오우너 line when total < 16', () => {
    const tooltip = JSON.stringify({
      e0: {
        type: 'IndentStringGroup',
        value: {
          Element_000: {
            contentStr: {
              k0: { contentStr: '[원한] 효과 +7' },
              k1: { contentStr: '[돌격대장] 효과 +5' },
            },
          },
        },
      },
    });
    const detail = {
      equipment: [{ type: '어빌리티 스톤', name: '돌', tooltip }],
    };
    const out = formatProfile('아트네', detail);
    assert.doesNotMatch(out, /돌 오우너/);
  });

  // F-8: ArkPassive null fallback (throw 없음)
  await t.test('F-8: formatProfile does not throw when arkPassive is null', () => {
    const detail = {
      className: '브레이커',
      arkPassive: null,
      engravings: [{ name: '아드레날린' }],
      itemLevel: 1700,
      characterLevel: 70,
      expeditionLevel: 80,
      serverName: '루페온',
    };
    const out = formatProfile('아트네', detail);
    assert.doesNotMatch(out, /진\/깨\/도/);
    assert.doesNotMatch(out, /undefined/);
  });

  // F-9: 템/전 + 원정대 별행. characterLevel 사용 안 함 (제거됨).
  await t.test('F-9: renders 템/전 with combatPower and 원정대 as a separate line', () => {
    const detail = {
      itemLevel: 1700,
      combatPower: 4351.68,
      expeditionLevel: 80,
    };
    const out = formatProfile('아트네', detail);
    assert.match(out, /템\/전\t1700\/4351\.68/);
    assert.match(out, /원정대\t80/);
    // 옛 "템/전/원" 양식 더 이상 사용 안 함
    assert.doesNotMatch(out, /템\/전\/원/);
  });
});

// === formatEquipment ===

test('formatEquipment', async (t) => {
  await t.test('renders 6-slot equipment summary', () => {
    const detail = {
      itemLevel: 1700,
      equipment: [
        { type: '무기', name: '+25 강무기', tooltip: '' },
        { type: '투구', name: '+25 신성투구', tooltip: '' },
        { type: '상의', name: '+25 상의', tooltip: '' },
        { type: '하의', name: '+25 하의', tooltip: '' },
        { type: '어깨', name: '+25 어깨', tooltip: '' },
        { type: '장갑', name: '+25 장갑', tooltip: '' },
        // 어빌리티 스톤 등 비장비 슬롯은 필터되어야 함
        { type: '어빌리티 스톤', name: '돌', tooltip: '' },
      ],
    };
    const out = formatEquipment('아트네', detail);
    assert.match(out, /<아트네의 장비>/);
    assert.match(out, /아이템 레벨 : 1700/);
    assert.match(out, /평균 품질 :/);
  });

  await t.test('returns fallback when no equipment slots match', () => {
    const detail = { equipment: [{ type: '어빌리티 스톤', name: '돌' }] };
    const out = formatEquipment('아트네', detail);
    assert.strictEqual(out, '아트네의 장비를 찾을 수 없습니다.');
  });

  // F-12: 마지막 줄에 갱신된 시간
  await t.test('F-12: appends 갱신된 시간 line when metadata.normalizedAt present', () => {
    const detail = {
      itemLevel: 1700,
      equipment: [{ type: '무기', name: '+25 무기', tooltip: '' }],
      metadata: { normalizedAt: new Date(Date.now() - 1000 * 60 * 3) },
    };
    const out = formatEquipment('아트네', detail);
    assert.match(out, /갱신된 시간 /);
  });
});

// === formatSkills ===

test('formatSkills', async (t) => {
  await t.test('lists skills with level >= 2', () => {
    const detail = {
      combatSkills: [
        { name: '강스킬', level: 10, tripods: [] },
        { name: '약스킬', level: 1, tripods: [] },
        {
          name: '룬스킬',
          level: 4,
          rune: { name: '바람', grade: '전설' },
          tripods: [
            { name: 't1', level: 3, slot: 1, isSelected: true },
            { name: 't2', level: 5, slot: 2, isSelected: true },
            { name: 't3', level: 0, slot: 3, isSelected: false },
          ],
        },
      ],
    };
    const out = formatSkills('아트네', detail);
    assert.match(out, /<아트네의 스킬>/);
    assert.match(out, /Lv\.10 강스킬/);
    assert.match(out, /Lv\.4  룬스킬 \[전 바람\]/);
    assert.ok(!out.includes('약스킬'));
    assert.match(out, /<트라이포드 정보>/);
    assert.match(out, /\[룬스킬\] 12\/35/);
  });

  await t.test('returns fallback when no skill is at level 2+', () => {
    const detail = { combatSkills: [{ name: '약스킬', level: 1, tripods: [] }] };
    const out = formatSkills('아트네', detail);
    assert.strictEqual(out, '아트네의 스킬 정보를 찾을 수 없습니다.');
  });

  // F-13: rune.grade 첫글자가 룬 표기에 포함
  await t.test('F-13: includes rune.grade first char in rune label', () => {
    const detail = {
      combatSkills: [
        {
          name: '파천섬광',
          level: 10,
          tripods: [],
          rune: { name: '속행', grade: '전설' },
        },
      ],
    };
    const out = formatSkills('아트네', detail);
    assert.match(out, /\[전 속행\]/);
  });
});

// === formatGems ===

test('formatGems', async (t) => {
  await t.test('renders gem list when tooltips parse', () => {
    const tooltip = JSON.stringify({
      e0: { type: 'NameTagBox', value: '10레벨 멸화의 보석' },
      e1: {
        type: 'ItemPartBox',
        value: {
          Element_001:
            '[스킬명] 공격력 피해 +20% 효과를 받습니다.',
        },
      },
    });
    const detail = { gems: [{ level: 10, tooltip }] };
    const out = formatGems('아트네', detail);
    assert.match(out, /<아트네의 보석>/);
    assert.match(out, /\[멸화\] Lv\.10/);
  });

  await t.test('returns fallback when gems array empty', () => {
    const out = formatGems('아트네', { gems: [] });
    assert.strictEqual(out, '아트네의 보석을 찾을 수 없습니다.');
  });
});

// === formatEngravings ===

test('formatEngravings', async (t) => {
  await t.test('lists engraving names', () => {
    const detail = { engravings: [{ name: '돌격대장' }, { name: '원한' }] };
    const out = formatEngravings('아트네', detail);
    assert.match(out, /아트네의 각인/);
    assert.match(out, /\[돌격대장\]/);
    assert.match(out, /\[원한\]/);
  });

  await t.test('returns fallback when no engravings', () => {
    const out = formatEngravings('아트네', { engravings: [] });
    assert.strictEqual(out, '아트네은(는) 장착중인 각인이 없는 것 같숨미당.');
  });

  // F-10: ArkPassive 활성 — [등급] 이름 Lv.N
  await t.test('F-10: ArkPassive 활성 시 [등급] 이름 Lv.N 표기', () => {
    const detail = {
      engravings: [{ name: '아드레날린', grade: '유물', level: 4 }],
    };
    const out = formatEngravings('아트네', detail);
    assert.match(out, /\[유물\] 아드레날린 Lv\.4/);
  });

  // F-11: ArkPassive 비활성 — 이름만
  await t.test('F-11: ArkPassive 비활성 (level/grade 부재) 시 이름만', () => {
    const detail = { engravings: [{ name: '아드레날린' }] };
    const out = formatEngravings('아트네', detail);
    assert.match(out, /\[아드레날린\]/);
    assert.doesNotMatch(out, /Lv\./);
  });
});

// === formatAbilityStone ===

test('formatAbilityStone', async (t) => {
  await t.test('renders stone effects from tooltip', () => {
    const tooltip = JSON.stringify({
      e0: {
        type: 'IndentStringGroup',
        value: {
          Element_000: {
            contentStr: {
              k0: { contentStr: '[원한] 효과 +9' },
              k1: { contentStr: '[돌격대장] 효과 +7' },
            },
          },
        },
      },
    });
    const detail = { equipment: [{ type: '어빌리티 스톤', name: '돌', tooltip }] };
    const out = formatAbilityStone('아트네', detail);
    assert.match(out, /아트네의 어빌리티 스톤/);
    assert.match(out, /원한 Lv\.9/);
    assert.match(out, /돌격대장 Lv\.7/);
  });

  await t.test('returns fallback when no stone equipped', () => {
    const out = formatAbilityStone('아트네', { equipment: [] });
    assert.strictEqual(out, '아트네은(는) 장착중인 스톤이 없는 것 같숨미당.');
  });
});

// === formatCollectibles ===

test('formatCollectibles', async (t) => {
  await t.test('renders points and total', () => {
    const detail = {
      collectibles: [
        { type: '모코코 씨앗', point: 1200, maxPoint: 1300 },
        { type: '섬의 마음', point: 90, maxPoint: 100 },
      ],
    };
    const out = formatCollectibles('아트네', detail);
    assert.match(out, /아트네의 수집 포인트/);
    assert.match(out, /\[모코코 씨앗\] 1200/);
    assert.match(out, /\[섬의 마음\] 90/);
    assert.match(out, /\[전체 진행도\] 1290/);
  });

  await t.test('returns fallback when collectibles empty', () => {
    const out = formatCollectibles('아트네', { collectibles: [] });
    assert.strictEqual(out, '아트네은(는) 수집 포인트가 없는 것 같숨미당.');
  });
});

// === formatAvatars ===

test('formatAvatars', async (t) => {
  await t.test('groups avatars by outer/inner', () => {
    const detail = {
      avatars: [
        { type: '머리 아바타', name: '모자A', isInner: false },
        { type: '얼굴 아바타', name: '안경B', isInner: false },
        { type: '머리 아바타', name: '내부모자', isInner: true },
      ],
    };
    const out = formatAvatars('아트네', detail);
    assert.match(out, /<아트네의 착용중인 아바타>/);
    assert.match(out, /\[Outer\]/);
    assert.match(out, /모자A/);
    assert.match(out, /안경B/);
    assert.match(out, /\[Inner\]/);
    assert.match(out, /내부모자/);
  });

  await t.test('returns fallback when avatars empty', () => {
    const out = formatAvatars('아트네', { avatars: [] });
    assert.strictEqual(out, '아트네의 아바타를 불러올 수 없습니다.');
  });
});

// === formatAvatarUrl ===

test('formatAvatarUrl', async (t) => {
  await t.test('returns name + url', () => {
    const detail = { profile: { characterImage: 'https://cdn-lostark.game.onstove.com/a.png' } };
    const out = formatAvatarUrl('아트네', detail);
    assert.match(out, /아트네의 아바타/);
    assert.match(out, /https:\/\/cdn-lostark\.game\.onstove\.com\/a\.png/);
  });

  await t.test('returns fallback when image missing', () => {
    const out = formatAvatarUrl('아트네', {});
    assert.strictEqual(out, '아트네의 아바타를 찾지 못했습니다.');
  });
});

// === formatCards ===

test('formatCards', async (t) => {
  await t.test('renders cards + effects', () => {
    const detail = {
      cards: {
        cards: [
          { grade: '전설', name: '카드A', awakeCount: 5, awakeTotal: 5 },
          { grade: '영웅', name: '카드B', awakeCount: 3, awakeTotal: 5 },
        ],
        effects: [
          {
            items: [
              { name: '세트1 12각성', description: '치명 피해 +10%' },
            ],
          },
        ],
      },
    };
    const out = formatCards('아트네', detail);
    assert.match(out, /<아트네의 카드>/);
    assert.match(out, /\[전설\] 카드A \(5\/5\)/);
    assert.match(out, /\[영웅\] 카드B \(3\/5\)/);
    assert.match(out, /<세트 효과>/);
    assert.match(out, /세트1 12각성 : 치명 피해 \+10%/);
  });

  await t.test('returns fallback when cards empty', () => {
    const out = formatCards('아트네', { cards: { cards: [], effects: [] } });
    assert.strictEqual(out, '아트네의 카드 정보를 찾을 수 없습니다.');
  });
});

// === formatColosseums ===

test('formatColosseums', async (t) => {
  await t.test('renders seasons with active modes', () => {
    const detail = {
      colosseums: [
        {
          seasonName: '2025 시즌1',
          competitive: { rankName: '플래티넘' },
          teamDeathmatch: { rankName: '골드' },
        },
      ],
    };
    const out = formatColosseums('아트네', detail);
    assert.match(out, /<아트네의 증명의 전장>/);
    assert.match(out, /\[2025 시즌1\]/);
    assert.match(out, /경쟁전 : 플래티넘/);
    assert.match(out, /팀 데스매치 : 골드/);
  });

  await t.test('returns fallback when seasons empty', () => {
    const out = formatColosseums('아트네', { colosseums: [] });
    assert.strictEqual(out, '아트네의 증명의 전장 정보를 찾을 수 없습니다.');
  });
});
