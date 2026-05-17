/**
 * armories formatter 11개 명령 골든 출력 테스트 (Phase 3).
 *
 * fixture: tests/fixtures/armories/character-detail-ida.json
 *   — ArmoriesNormalizer.normalizeCharacterDetail 의 이다 V9 sample 결과 직렬화.
 *   — 재현: yarn tsx scripts/gen-ida-fixture.ts
 *
 * 각 테스트는 fixture 데이터로 formatter 를 호출하고 byte-equal 또는 구조 검증을 수행.
 * design.md §3.1~§3.11 의 "예시 ('이다' 데이터)" 블록과 일치해야 한다.
 */

import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';

import {
  formatProfile,
  formatEquipment,
  formatAvatarUrl,
  formatSkills,
  formatGems,
  formatAbilityStone,
  formatEngravings,
  formatCollectibles,
  formatAvatars,
  formatCards,
  formatColosseums,
} from '@lostark/udp-gateway/formatters/armories.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(
  __dirname,
  '../../../fixtures/armories/character-detail-ida.json',
);

function loadFixture(): Record<string, any> {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
}

const CHAR = '이다';

// === !정보 ===

test('골든: formatProfile — 이다', () => {
  const detail = loadFixture();
  const out = formatProfile(CHAR, detail);

  // 헤더: 칭호 + 이름
  assert.match(out, /심연의 대적자 이다/);
  // 수라의 길 + 직업
  assert.match(out, /수라의 길 브레이커/);
  // 템/전
  assert.match(out, /템\/전\t1760\/4351\.68/);
  // 원정대 — 별행
  assert.match(out, /원정대\t353/);
  // 서버/길드 + 등급
  assert.match(out, /서버\/길드\t루페온\/모코코의 길드장/);
  // 전투특성 — 치명 1851, 신속 659 (상위 2개)
  assert.match(out, /전투특성\t치:1851 신:659/);
  // 스킬포인트
  assert.match(out, /스킬포인트\t482\/483/);
  // pvp
  assert.match(out, /pvp\t초단/);
  // 공격력/체력
  assert.match(out, /공격력\/체력\t195116\/392922/);
  // 엘/초/상 (equipment 있을 때)
  assert.match(out, /엘\/초\/상\t50\/126\/240/);
  // 진/깨/도
  assert.match(out, /진\/깨\/도\t120\/101\/70/);
  // 각인 3줄 폐기 — 미출력 검증
  assert.doesNotMatch(out, /아 원 돌 결 예/);
  assert.doesNotMatch(out, /돌 오우너/);
  // 갱신 시간
  assert.match(out, /갱신된 시간 /);
});

// === !장비 ===

test('골든: formatEquipment — 이다', () => {
  const detail = loadFixture();
  const out = formatEquipment(CHAR, detail);

  assert.match(out, /<이다의 장비>/);
  assert.match(out, /아이템 레벨 : 1760/);
  assert.match(out, /평균 품질 : 100\.00/);
  // 6장비 슬롯 모두 포함
  assert.match(out, /무기/);
  assert.match(out, /투구/);
  assert.match(out, /상의/);
  assert.match(out, /하의/);
  assert.match(out, /장갑/);
  assert.match(out, /어깨/);
  // 엘릭서 섹션
  assert.match(out, /<엘릭서 정보>/);
  // 갱신 시간 (fixture normalizedAt 이 존재하므로)
  assert.match(out, /갱신된 시간 /);
});

// === !아바타 ===

test('골든: formatAvatarUrl — 이다', () => {
  const detail = loadFixture();
  const out = formatAvatarUrl(CHAR, detail);

  // 헤더
  assert.match(out, /이다의 아바타/);
  // 이미지 URL
  assert.match(out, /lostark\.co\.kr\/armory\//);
  // 2줄 정확히
  const lines = out.split('\n');
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0], '이다의 아바타');
  assert.ok(lines[1]?.startsWith('https://'), 'second line should be URL');
});

// === !스킬 ===

test('골든: formatSkills — 이다 (30 라인 미만, truncate 미적용)', () => {
  const detail = loadFixture();
  const out = formatSkills(CHAR, detail);

  assert.match(out, /<이다의 스킬>/);
  // Lv2 이상 스킬만 포함 — 이다 fixture 에서 Lv>=2 스킬
  assert.match(out, /Lv\.\d+\s+/);
  // 트라이포드 슬롯이 스킬 라인에 흡수 — 별도 섹션은 더 이상 출력하지 않는다.
  assert.doesNotMatch(out, /<트라이포드 정보>/);
  // 적어도 한 스킬은 선택된 슬롯이 라인에 붙어 있어야 한다 (이다 fixture 기준).
  assert.match(out, /^Lv\.\d+ {1,2}\S.* \d{2,3}( \[|$)/m);
  // 30 라인 이하 — truncate 미적용
  const lineCount = out.split('\n').length;
  assert.ok(lineCount <= 30, `skills output should be <= 30 lines, got ${lineCount}`);
  // truncate footer 미출력
  assert.doesNotMatch(out, /\.\.\. 외 \d+개 생략/);
});

// === !보석 ===

test('골든: formatGems — 이다', () => {
  const detail = loadFixture();
  const out = formatGems(CHAR, detail);

  assert.match(out, /<이다의 보석>/);
  // 이다는 광휘 보석 11개
  const gemLines = out.split('\n').filter((l) => l.startsWith('['));
  assert.ok(gemLines.length >= 11, `expected >= 11 gem lines, got ${gemLines.length}`);
  // Lv.10 등급 확인
  assert.match(out, /Lv\.10/);
});

// === !돌 — design §3.6 byte-equal ===

test('골든: formatAbilityStone — 이다 (design §3.6 byte-equal)', () => {
  const detail = loadFixture();
  const out = formatAbilityStone(CHAR, detail);

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

// === !각인 — design §3.7 ===

test('골든: formatEngravings — 이다 5개 [유물] level desc + name asc', () => {
  const detail = loadFixture();
  const out = formatEngravings(CHAR, detail);

  assert.match(out, /이다의 각인/);
  const lines = out.split('\n');
  // 헤더 + 5개
  assert.strictEqual(lines.length, 6);
  // 모두 [유물] 접두
  for (let i = 1; i <= 5; i++) {
    assert.match(lines[i] ?? '', /\[유물\]/);
    assert.match(lines[i] ?? '', /Lv\.4/);
  }
  // level 이 모두 4로 동일 → name asc 정렬 (localeCompare 기준)
  // design §3.7 예시: 결투의 대가 / 돌격대장 / 아드레날린 / 예리한 둔기 / 원한
  const names = lines.slice(1).map((l) => {
    const m = l.match(/\] (.+?) Lv\./);
    return m?.[1] ?? '';
  });
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(names, sortedNames);
  // design 예시의 5개 이름 포함 검증
  assert.match(out, /아드레날린/);
  assert.match(out, /원한/);
  assert.match(out, /돌격대장/);
  assert.match(out, /결투의 대가/);
  assert.match(out, /예리한 둔기/);
});

// === !수집 — 이다 fixture 에서 collectibles 빈 배열 → fallback ===

test('골든: formatCollectibles — 이다 (fixture collectibles 빈 배열)', () => {
  const detail = loadFixture();
  // 이다 fixture 의 collectibles 가 빈 배열이면 fallback 반환
  if (Array.isArray(detail.collectibles) && detail.collectibles.length === 0) {
    const out = formatCollectibles(CHAR, detail);
    assert.strictEqual(out, '이다 은(는) 수집 포인트가 없는 것 같숨미당.');
  } else {
    // 데이터가 있는 경우 헤더 확인
    const out = formatCollectibles(CHAR, detail);
    assert.match(out, /이다의 수집 포인트/);
  }
});

// === !착장 ===

test('골든: formatAvatars — 이다 아바타 목록', () => {
  const detail = loadFixture();
  const out = formatAvatars(CHAR, detail);

  assert.match(out, /<이다의 착용중인 아바타>/);
  // Outer / Inner 섹션
  assert.match(out, /\[Outer\]/);
  // 이다 fixture 에 10개 아바타 있음
  const avatarLines = out.split('\n').filter((l) => l.trim().startsWith('[') && !l.includes('Outer') && !l.includes('Inner'));
  assert.ok(avatarLines.length > 0, 'should have avatar items');
});

// === !카드 ===

test('골든: formatCards — 이다 카드 6장 + 세트 효과', () => {
  const detail = loadFixture();
  const out = formatCards(CHAR, detail);

  assert.match(out, /<이다의 카드>/);
  // 6장 모두 전설 등급
  const cardLines = out.split('\n').filter((l) => l.startsWith('[전설]'));
  assert.strictEqual(cardLines.length, 6);
  // 이다 카드명
  assert.match(out, /에버그레이스/);
  assert.match(out, /가디언 루/);
  // 세트 효과 섹션
  assert.match(out, /<세트 효과>/);
});

// === !전장 — 이다 colosseums 빈 배열 → fallback ===

test('골든: formatColosseums — 이다 전장 기록 없음 (fallback)', () => {
  const detail = loadFixture();
  // 이다 fixture 에 colosseums 가 없으면 fallback
  if (Array.isArray(detail.colosseums) && detail.colosseums.length === 0) {
    const out = formatColosseums(CHAR, detail);
    assert.strictEqual(out, '이다 은(는) 증명의 전장 기록이 없는 것 같숨미당.');
  } else {
    const out = formatColosseums(CHAR, detail);
    assert.match(out, /<이다의 증명의 전장>/);
  }
});

// === 추가: truncate 가드 (이다 fixture 24스킬 → 30 미만, 명시 검증) ===

test('골든: formatSkills — truncate threshold 경계 (이다 24스킬 < 30)', () => {
  const detail = loadFixture();
  const out = formatSkills(CHAR, detail);
  // 이다는 스킬 24개 — 30 미만이므로 truncate 없음
  const lineCount = out.split('\n').length;
  assert.ok(lineCount < 30, `이다 스킬 출력이 30 라인 미만이어야 함 (실제: ${lineCount})`);
  assert.doesNotMatch(out, /\.\.\. 외 \d+개 생략/);
});
