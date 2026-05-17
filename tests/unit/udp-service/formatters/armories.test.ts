/**
 * armories formatter 11종 단위 테스트.
 *
 * - 각 formatter 에 대해 정상 케이스 1개 + empty/fallback 케이스 1개 (≥ 22 케이스).
 * - input 은 NormalizedCharacterDetail 의 최소 필드만 inline 으로 선언.
 * - assert.match 로 부분 검증, assert.strictEqual 로 fallback 정확 일치 검증.
 *
 * V9 / 아크패시브 시즌 재기획 (.claude/work-session/20260517-010704/design.md):
 *  - formatProfile 의 각인 3줄 / 돌 오우너 라인 폐기 → 관련 케이스 제거.
 *  - formatAbilityStone 입력이 detail.equipment → detail.abilityStone (NormalizedAbilityStone) 로 변경.
 *  - 빈 응답 메시지 톤 통일 (`찾을 수 없습니다.` → `~ 없는 것 같숨미당.`).
 *  - formatEngravings 정렬 (level desc, name asc) 검증 추가.
 *  - formatSkills 30 라인 절단 가드 검증 추가.
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

  // F-1 (폐기): 각인 3줄 (이름 첫글자 / 등급 첫글자 / 레벨) — design §3.1 에 따라 라인 자체 제거.
  await t.test('F-1 (deprecated): does NOT render engraving 3-row block', () => {
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
    // V9 아크패시브 시즌에 의미 없음 → 라인 미출력
    assert.doesNotMatch(out, /아 원 돌 결 예/);
    assert.doesNotMatch(out, /유 유 유 유 유/);
    assert.doesNotMatch(out, /^4 4 4 4 4$/m);
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

  // F-6 / F-7 (폐기): 돌 오우너 라인 — design §3.1 에 따라 라인 자체 제거.
  await t.test('F-6 (deprecated): does NOT render 돌 오우너 line even with positive total >= 16', () => {
    const tooltip = JSON.stringify({
      e0: {
        type: 'IndentStringGroup',
        value: {
          Element_000: {
            contentStr: {
              k0: { contentStr: '[원한] 효과 +9' },
              k1: { contentStr: '[돌격대장] 효과 +9' },
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
    assert.strictEqual(out, '아트네 은(는) 장착중인 장비가 없는 것 같숨미당.');
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
    // 슬롯(12) 가 스킬 라인에 흡수, 룬 라벨은 그 뒤. 별도 트라이포드 섹션은 없다.
    assert.match(out, /Lv\.4  룬스킬 12 \[전 바람\]/);
    assert.ok(!out.includes('약스킬'));
    assert.doesNotMatch(out, /<트라이포드 정보>/);
    assert.ok(!out.includes('12/35'));
  });

  await t.test('returns fallback when no skill is at level 2+', () => {
    const detail = { combatSkills: [{ name: '약스킬', level: 1, tripods: [] }] };
    const out = formatSkills('아트네', detail);
    assert.strictEqual(out, '아트네 은(는) Lv.2 이상 스킬이 없는 것 같숨미당.');
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

  // F-15: V9 응답은 트라이포드 Level 부재 → 슬롯을 스킬 라인에 흡수, 별도 섹션 미출력.
  await t.test('F-15: absorbs selected tripod slots into the skill line (no tripod section)', () => {
    const detail = {
      combatSkills: [
        {
          name: '과충전 배터리',
          level: 10,
          tripods: [
            { name: 't1', slot: 2, isSelected: true },
            { name: 't2', slot: 3, isSelected: true },
            { name: 't3', slot: 1, isSelected: true },
            { name: 't4', slot: 2, isSelected: false },
          ],
        },
      ],
    };
    const out = formatSkills('아트네', detail);
    assert.match(out, /Lv\.10 과충전 배터리 231(?:\n|$)/);
    assert.doesNotMatch(out, /<트라이포드 정보>/);
    assert.ok(!out.includes('231/'));
  });

  // F-16: 룬은 라벨만 (등급 첫글자 + 이름). tooltip 효과 설명은 출력 대상이 아니다.
  await t.test('F-16: rune label only — tooltip effect is not appended', () => {
    const tooltip = JSON.stringify({
      Element_000: { type: 'NameTagBox', value: '<P>속행</P>' },
      Element_003: {
        type: 'ItemPartBox',
        value: {
          Element_000: "<FONT COLOR='#A9D0F5'>스킬 룬 효과</FONT>",
          Element_001: '스킬 사용 시 일정 확률로 전체 재사용 대기 시간이 16% 감소',
        },
      },
    });
    const detail = {
      combatSkills: [
        {
          name: '파천섬광',
          level: 10,
          tripods: [],
          rune: { name: '속행', grade: '전설', tooltip },
        },
      ],
    };
    const out = formatSkills('아트네', detail);
    const lines = out.split('\n');
    assert.ok(lines.some((l) => l.endsWith('[전 속행]')), '룬 라벨로 끝나는 라인 존재');
    assert.ok(!out.includes('재사용 대기'), 'tooltip 효과 문구는 미부착');
  });

  // F-17: 슬롯·룬 동시 부착 시 순서는 "<슬롯> [등급 룬이름]" (룬 라벨이 항상 라인 끝).
  await t.test('F-17: slot precedes rune label on the same line', () => {
    const detail = {
      combatSkills: [
        {
          name: '소나티네',
          level: 10,
          tripods: [
            { name: 't1', slot: 1, isSelected: true },
            { name: 't2', slot: 3, isSelected: true },
            { name: 't3', slot: 2, isSelected: true },
          ],
          rune: { name: '속행', grade: '영웅' },
        },
      ],
    };
    const out = formatSkills('아트네', detail);
    assert.match(out, /Lv\.10 소나티네 132 \[영 속행\](?:\n|$)/);
  });

  // F-14 (신규): 30 라인 초과 시 마지막 라인이 `... 외 N개 생략` 으로 절단 (design §1.4).
  await t.test('F-14: truncates output to 30 lines with omission footer', () => {
    // 40 개 스킬 → 헤더 1 + 본문 40 = 41 라인 → 30 라인으로 절단
    const skills = Array.from({ length: 40 }, (_, i) => ({
      name: `스킬${i + 1}`,
      level: 5,
      tripods: [],
    }));
    const out = formatSkills('아트네', { combatSkills: skills });
    const lineCount = out.split('\n').length;
    assert.strictEqual(lineCount, 30);
    assert.match(out, /\.\.\. 외 \d+개 생략$/);
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
    assert.strictEqual(out, '아트네 은(는) 장착중인 보석이 없는 것 같숨미당.');
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
    assert.strictEqual(out, '아트네 은(는) 장착중인 각인이 없는 것 같숨미당.');
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

  // F-15 (신규): 정렬 — level desc, name asc.
  await t.test('F-15: sorts by level desc, then name asc', () => {
    const detail = {
      engravings: [
        { name: '원한', grade: '유물', level: 4 },
        { name: '돌격대장', grade: '유물', level: 4 },
        { name: '아드레날린', grade: '유물', level: 4 },
        { name: '결투의 대가', grade: '유물', level: 4 },
        { name: '예리한 둔기', grade: '유물', level: 4 },
      ],
    };
    const out = formatEngravings('아트네', detail);
    const lines = out.split('\n');
    // 첫 줄 = 헤더, 그 뒤 5줄이 이름순 (모두 동일 level)
    // 한글 가나다 (localeCompare ko-KR or default) — 결과 순서 검증.
    assert.strictEqual(lines[0], '아트네의 각인');
    // 동일 level 일 때 name asc 정렬 → 한글 사전순 (결투의 대가 < 돌격대장 < 아드레날린 < 예리한 둔기 < 원한)
    // localeCompare 기본 (en-US locale) 결과를 그대로 사용 (한글은 unicode codepoint 순과 유사).
    // 출력 순서를 명시적으로 검증.
    const namesInOrder = lines.slice(1).map((ln) => {
      const m = ln.match(/\] (.+?) Lv\./);
      return m?.[1] ?? '';
    });
    // assertion: 동일 level → 이름 사전순
    const sorted = [...namesInOrder].sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(namesInOrder, sorted);
  });

  // F-16 (신규): level desc 우선.
  await t.test('F-16: higher level first', () => {
    const detail = {
      engravings: [
        { name: 'A', grade: '유물', level: 1 },
        { name: 'B', grade: '유물', level: 4 },
        { name: 'C', grade: '유물', level: 2 },
      ],
    };
    const out = formatEngravings('아트네', detail);
    const lines = out.split('\n').slice(1);
    assert.match(lines[0] ?? '', /B Lv\.4/);
    assert.match(lines[1] ?? '', /C Lv\.2/);
    assert.match(lines[2] ?? '', /A Lv\.1/);
  });
});

// === formatAbilityStone ===

test('formatAbilityStone', async (t) => {
  await t.test('renders stone with engravings, debuff, level-bonus, crafting bonus', () => {
    const detail = {
      abilityStone: {
        name: '위대한 비상의 돌',
        grade: '고대',
        craftingBonus: '체력 +3525',
        engravingEffects: [
          { name: '아드레날린', level: 4, kind: 'engraving', bonusText: null },
          { name: '원한', level: 1, kind: 'engraving', bonusText: null },
          { name: '이동속도 감소', level: 0, kind: 'debuff', bonusText: null },
          { name: '레벨 보너스', level: 0, kind: 'level-bonus', bonusText: '기본 공격력 +1.50%' },
        ],
      },
    };
    const out = formatAbilityStone('이다', detail);
    // design §3.6 예시 byte-equal 검증
    const expected = [
      '이다의 어빌리티 스톤',
      '[고대] 위대한 비상의 돌',
      '',
      '[각인]',
      ' [아드레날린] Lv.4',
      ' [원한] Lv.1',
      '',
      '[디버프]',
      ' [이동속도 감소] Lv.0',
      '',
      '[레벨 보너스]',
      ' 기본 공격력 +1.50%',
      '',
      '[세공]',
      ' 체력 +3525',
    ].join('\n');
    assert.strictEqual(out, expected);
  });

  await t.test('returns fallback when no stone equipped (abilityStone null)', () => {
    const out = formatAbilityStone('아트네', { abilityStone: null });
    assert.strictEqual(out, '아트네 은(는) 장착중인 스톤이 없는 것 같숨미당.');
  });

  await t.test('returns fallback when abilityStone field absent', () => {
    const out = formatAbilityStone('아트네', {});
    assert.strictEqual(out, '아트네 은(는) 장착중인 스톤이 없는 것 같숨미당.');
  });

  // 신규: engraving 만 있는 경우 (디버프/레벨보너스/세공 섹션 미출력)
  await t.test('renders only engraving section when only engravings present', () => {
    const detail = {
      abilityStone: {
        name: '돌',
        grade: '고대',
        craftingBonus: null,
        engravingEffects: [
          { name: '원한', level: 7, kind: 'engraving', bonusText: null },
          { name: '돌격대장', level: 5, kind: 'engraving', bonusText: null },
        ],
      },
    };
    const out = formatAbilityStone('아트네', detail);
    assert.match(out, /\[각인\]/);
    assert.doesNotMatch(out, /\[디버프\]/);
    assert.doesNotMatch(out, /\[레벨 보너스\]/);
    assert.doesNotMatch(out, /\[세공\]/);
    // level desc 정렬 검증
    const idx원한 = out.indexOf('원한');
    const idx돌격대장 = out.indexOf('돌격대장');
    assert.ok(idx원한 < idx돌격대장, 'level desc → 원한(7) 이 돌격대장(5) 보다 앞');
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
    assert.strictEqual(out, '아트네 은(는) 수집 포인트가 없는 것 같숨미당.');
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
    assert.strictEqual(out, '아트네 은(는) 착용 아바타가 없는 것 같숨미당.');
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
    assert.strictEqual(out, '아트네 의 아바타가 없는 것 같숨미당.');
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
    assert.strictEqual(out, '아트네 은(는) 장착중인 카드가 없는 것 같숨미당.');
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
    assert.strictEqual(out, '아트네 은(는) 증명의 전장 기록이 없는 것 같숨미당.');
  });

  await t.test('returns fallback when seasons exist but no active modes', () => {
    const out = formatColosseums('아트네', { colosseums: [{ seasonName: '시즌X' }] });
    assert.strictEqual(out, '아트네 은(는) 증명의 전장 기록이 없는 것 같숨미당.');
  });

  // F-17 (신규): 5 시즌 이상이면 최근 3 시즌만 (design §1.4).
  await t.test('F-17: keeps only last 3 seasons when total >= 5', () => {
    const seasons = Array.from({ length: 6 }, (_, i) => ({
      seasonName: `시즌${i + 1}`,
      competitive: { rankName: `등급${i + 1}` },
    }));
    const out = formatColosseums('아트네', { colosseums: seasons });
    // 마지막 3개 (시즌4, 시즌5, 시즌6) 만 표기
    assert.match(out, /\[시즌4\]/);
    assert.match(out, /\[시즌5\]/);
    assert.match(out, /\[시즌6\]/);
    assert.doesNotMatch(out, /\[시즌1\]/);
    assert.doesNotMatch(out, /\[시즌2\]/);
    assert.doesNotMatch(out, /\[시즌3\]/);
  });
});
