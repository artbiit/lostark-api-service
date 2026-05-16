/**
 * Phase 3 fixture 생성 스크립트.
 *
 * character-ark-passive.json (이다 V9 raw) 를 ArmoriesNormalizer.normalizeCharacterDetail 로
 * 통과시켜 NormalizedCharacterDetail JSON 을 tests/fixtures/armories/character-detail-ida.json 에 저장.
 *
 * 사용:
 *   yarn tsx scripts/gen-ida-fixture.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { ArmoriesNormalizer } from '@lostark/data-service';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const INPUT = resolve(ROOT, 'tests/fixtures/armories/character-ark-passive.json');
const OUTPUT = resolve(ROOT, 'tests/fixtures/armories/character-detail-ida.json');

async function main() {
  const raw = JSON.parse(readFileSync(INPUT, 'utf-8'));
  const norm = new ArmoriesNormalizer();
  const { characterDetail } = await norm.normalizeCharacterDetail('이다', raw);

  // metadata.normalizedAt is Date — serialize as ISO string for reproducibility
  const serialized = JSON.stringify(
    {
      __source: 'tests/fixtures/armories/character-ark-passive.json (V9.0.0 sample data for 이다)',
      ...characterDetail,
      metadata: {
        ...characterDetail.metadata,
        normalizedAt: characterDetail.metadata.normalizedAt.toISOString(),
      },
    },
    null,
    2,
  );

  mkdirSync(resolve(ROOT, 'tests/fixtures/armories'), { recursive: true });
  writeFileSync(OUTPUT, serialized, 'utf-8');
  console.log(`Fixture written to ${OUTPUT}`);
  console.log(`  abilityStone: ${JSON.stringify(characterDetail.abilityStone?.name)}`);
  console.log(`  engravings: ${characterDetail.engravings.length}`);
  console.log(`  combatSkills: ${characterDetail.combatSkills.length}`);
  console.log(`  gems: ${characterDetail.gems.length}`);
  console.log(`  cards.cards: ${characterDetail.cards.cards.length}`);
  console.log(`  colosseums: ${characterDetail.colosseums.length}`);
  console.log(`  collectibles: ${characterDetail.collectibles.length}`);
  console.log(`  avatars: ${characterDetail.avatars.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
