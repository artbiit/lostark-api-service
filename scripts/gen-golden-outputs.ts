/**
 * Phase 3 골든 출력 생성 스크립트.
 *
 * tests/fixtures/armories/character-detail-ida.json 을 읽어
 * 11개 명령 formatter 의 실제 출력을 콘솔에 덤프한다.
 * 이 출력이 골든 테스트의 expected 값이 된다.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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
const ROOT = resolve(__dirname, '..');
const FIXTURE = resolve(ROOT, 'tests/fixtures/armories/character-detail-ida.json');

const detail = JSON.parse(readFileSync(FIXTURE, 'utf-8'));
const name = '이다';

const commands = [
  { cmd: '!정보', fn: () => formatProfile(name, detail) },
  { cmd: '!장비', fn: () => formatEquipment(name, detail) },
  { cmd: '!아바타', fn: () => formatAvatarUrl(name, detail) },
  { cmd: '!스킬', fn: () => formatSkills(name, detail) },
  { cmd: '!보석', fn: () => formatGems(name, detail) },
  { cmd: '!돌', fn: () => formatAbilityStone(name, detail) },
  { cmd: '!각인', fn: () => formatEngravings(name, detail) },
  { cmd: '!수집', fn: () => formatCollectibles(name, detail) },
  { cmd: '!착장', fn: () => formatAvatars(name, detail) },
  { cmd: '!카드', fn: () => formatCards(name, detail) },
  { cmd: '!전장', fn: () => formatColosseums(name, detail) },
];

for (const { cmd, fn } of commands) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${cmd}]`);
  console.log(`${'='.repeat(60)}`);
  try {
    const out = fn();
    console.log(out);
    console.log(`--- lines: ${out.split('\n').length}`);
  } catch (e) {
    console.error(`ERROR:`, e);
  }
}
# hook test 105411
