/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES API 통합 테스트
 *
 * ARMORIES API 통합 테스트
 * - 실제 API 호출
 * - 캐시 동작
 * - 정규화 처리
 *
 * Phase 3 추가 (verification-strategies.md L2 의무):
 *   - 어빌리티 스톤 normalize live 호출 1 case (SKIP_LIVE_API=1 환경에서 skip)
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { getTestCharacters, setupTestEnvironment, withTimeout } from '../../common/test-utils';
import { armoriesService } from '@lostark/data-service';

test('ARMORIES API Integration', async (t) => {
  await t.test('should fetch character armory data', async () => {
    const env = setupTestEnvironment();
    const testCharacters = getTestCharacters();

    if (testCharacters.length === 0) {
      console.log('⚠️  테스트 캐릭터가 없어 테스트를 건너뜁니다');
      return;
    }

    const testCharacter = testCharacters[0];

    try {
      // 실제 API 호출 테스트
      const response = await withTimeout(
        fetch(
          `https://developer-lostark.game.onstove.com/armories/characters/${encodeURIComponent(testCharacter)}`,
          {
            headers: {
              Authorization: `Bearer ${env.LOSTARK_API_KEY}`,
              'Content-Type': 'application/json',
            },
          },
        ),
        10000,
      );

      if (response.status === 401 || response.status === 403) {
        console.log('⚠️  API 키 인증 실패, 테스트를 건너뜁니다');
        return;
      }

      assert.strictEqual(response.status, 200);

      const data = await response.json();

      // 기본 구조 검증
      assert(data !== null);
      assert(typeof data === 'object');

      console.log(`✅ ARMORIES API 테스트 성공: ${testCharacter}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.log('⚠️  API 호출 타임아웃, 테스트를 건너뜁니다');
        return;
      }
      throw error;
    }
  });

  await t.test('should handle API errors gracefully', async () => {
    const env = setupTestEnvironment();

    try {
      const response = await withTimeout(
        fetch(
          'https://developer-lostark.game.onstove.com/armories/characters/nonexistent-character',
          {
            headers: {
              Authorization: `Bearer ${env.LOSTARK_API_KEY}`,
              'Content-Type': 'application/json',
            },
          },
        ),
        10000,
      );

      // 존재하지 않는 캐릭터는 404를 반환해야 함
      assert(response.status === 404 || response.status === 400);

      console.log('✅ API 에러 처리 테스트 성공');
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        console.log('⚠️  API 호출 타임아웃, 테스트를 건너뜁니다');
        return;
      }
      throw error;
    }
  });
});

// === L2 의무: 어빌리티 스톤 normalize live 호출 검증 ===
// verification-strategies.md §L2 의무 — normalizer 수정 범주
// SKIP_LIVE_API=1 환경에서 skip 처리.

test('어빌리티 스톤 — live 호출 normalize 정상 (L2)', async () => {
  if (process.env['SKIP_LIVE_API'] === '1') {
    console.log('⚠️  SKIP_LIVE_API=1, L2 어빌리티 스톤 테스트 건너뜁니다');
    return;
  }

  const testCharacters = getTestCharacters();
  if (testCharacters.length === 0) {
    console.log('⚠️  테스트 캐릭터가 없어 L2 어빌리티 스톤 테스트를 건너뜁니다');
    return;
  }

  const liveCharacter = testCharacters[0]!;

  try {
    const detail = await withTimeout(
      armoriesService.getCharacterDetailPartial(liveCharacter, ['equipment']),
      15000,
    );

    if (!detail) {
      console.log(`⚠️  ${liveCharacter} 캐릭터를 찾을 수 없어 건너뜁니다`);
      return;
    }

    // L2 의무: abilityStone 필드가 항상 존재 (null 포함)
    assert('abilityStone' in detail, 'detail should have abilityStone field (may be null)');

    if (detail.abilityStone !== null && detail.abilityStone !== undefined) {
      // 어빌리티 스톤이 장착된 경우 normalize 결과 구조 검증
      assert(typeof detail.abilityStone.name === 'string', 'abilityStone.name should be string');
      assert(detail.abilityStone.name.length > 0, 'abilityStone.name should not be empty');
      assert(typeof detail.abilityStone.grade === 'string', 'abilityStone.grade should be string');
      assert(detail.abilityStone.grade.length > 0, 'abilityStone.grade should not be empty');
      assert(
        Array.isArray(detail.abilityStone.engravingEffects),
        'abilityStone.engravingEffects should be array',
      );
      console.log(
        `✅ L2 어빌리티 스톤 normalize 성공: ${liveCharacter} — ${detail.abilityStone.grade} ${detail.abilityStone.name} (effects: ${detail.abilityStone.engravingEffects.length})`,
      );
    } else {
      // null 도 유효한 응답 (미장착)
      console.log(`✅ L2 어빌리티 스톤 테스트 성공: ${liveCharacter} — 스톤 미장착 (null)`);
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('401') || error.message.includes('403'))) {
      console.log(`⚠️  API 접근 불가 (${error.message}), L2 테스트 건너뜁니다`);
      return;
    }
    throw error;
  }
});
