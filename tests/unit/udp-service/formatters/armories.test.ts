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
      expeditionLevel: 80,
      serverName: '루페온',
      guildName: '아트네',
      engravings: [{ name: '돌격대장' }, { name: '원한' }],
      profile: {
        stats: [
          { type: '캐릭터 레벨', value: '70' },
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
    assert.match(out, /템\/전\/원\t1700/);
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
    assert.match(out, /템\/전\/원\t0/);
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
