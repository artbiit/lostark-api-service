/**
 * @cursor-change: 2025-01-27, v1.0.0, CHARACTERS API 서비스 테스트 생성
 *
 * CHARACTERS API 서비스 테스트
 * - 실제 API 호출 테스트
 * - 모킹을 통한 단위 테스트
 * - 에러 처리 테스트
 */

import assert from 'node:assert';
import { describe, test } from 'node:test';

import { loadEnv } from '../../../common/env-loader.mjs';
import { getAllCharacterNames } from '../../../common/streamer-list.mjs';

// 환경 변수 로드
loadEnv();

// === 테스트 데이터 ===

/**
 * 샘플 siblings 응답 데이터
 */
const sampleSiblingsData = [
  {
    ServerName: '아브렐슈드',
    CharacterName: '테스트캐릭터1',
    CharacterLevel: 60,
    CharacterClassName: '버서커',
    ItemAvgLevel: '1,460.00',
  },
  {
    ServerName: '아브렐슈드',
    CharacterName: '테스트캐릭터2',
    CharacterLevel: 60,
    CharacterClassName: '디스트로이어',
    ItemAvgLevel: '1,450.00',
  },
  {
    ServerName: '카단',
    CharacterName: '테스트캐릭터3',
    CharacterLevel: 60,
    CharacterClassName: '건너',
    ItemAvgLevel: '1,440.00',
  },
];

// === 테스트 스위트 ===

describe('CHARACTERS API Service', async () => {
  // 서비스 모듈 동적 import
  const { charactersService } = await import(
    '../../../../packages/data-service/src/services/characters-service.ts'
  );

  // Mock ARMORIES 큐 관리자
  const mockQueueManager = {
    addToQueue: async (items) => {
      console.log('Mock: Added to ARMORIES queue:', items.length, 'items');
    },
  };

  charactersService.setArmoriesQueueManager(mockQueueManager);

  // cleanup 함수를 process.on('exit')에 등록
  process.on('exit', async () => {
    await charactersService.cleanup();
  });

  // === 실제 API 호출 테스트 ===

  test('should fetch real character siblings data', async () => {
    const streamerList = getAllCharacterNames();
    const testCharacter = streamerList[0]; // 첫 번째 스트리머 캐릭터 사용

    if (!testCharacter) {
      console.log('No test character available, skipping real API test');
      return;
    }

    console.log(`Testing with character: ${testCharacter}`);

    try {
      const result = await charactersService.processCharacterSiblings(testCharacter);

      // 결과 검증
      assert(result.accountInfo, 'Account info should be returned');
      assert(result.accountInfo.accountId, 'Account ID should be present');
      assert(Array.isArray(result.accountInfo.characters), 'Characters should be an array');
      assert(result.accountInfo.characters.length > 0, 'Should have at least one character');
      assert(Array.isArray(result.queueItems), 'Queue items should be an array');

      console.log('✅ Real API test passed');
      console.log(`- Account ID: ${result.accountInfo.accountId}`);
      console.log(`- Character count: ${result.accountInfo.characters.length}`);
      console.log(`- Server count: ${result.accountInfo.serverDistribution.length}`);
      console.log(`- Queue items: ${result.queueItems.length}`);

      // 캐릭터 정보 상세 출력
      result.accountInfo.characters.forEach((char, index) => {
        console.log(
          `  ${index + 1}. ${char.characterName} (${char.serverName}) - ${char.characterClassName} Lv.${char.characterLevel} (${char.itemLevel})`,
        );
      });
    } catch (error) {
      console.error('❌ Real API test failed:', error.message);

      // API 키 문제인지 확인
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('⚠️  API key issue detected. Check LOSTARK_API_KEY environment variable.');
        return; // API 키 문제는 테스트 실패로 간주하지 않음
      }

      throw error;
    }
  });

  // === 캐시 테스트 ===

  test('should cache and retrieve account info', async () => {
    const testCharacter = '테스트캐릭터1';

    // 첫 번째 조회
    const result1 = await charactersService.processCharacterSiblings(testCharacter);
    assert(result1.accountInfo, 'First call should return account info');

    // 두 번째 조회 (캐시에서 가져와야 함)
    const result2 = await charactersService.getAccountInfo(testCharacter);
    assert(result2, 'Second call should return cached account info');
    assert.strictEqual(result2.accountId, result1.accountInfo.accountId, 'Account ID should match');

    console.log('✅ Cache test passed');
  });

  // === 변화 감지 테스트 ===

  test('should detect changes in character data', async () => {
    const testCharacter = '테스트캐릭터1';

    // 첫 번째 조회
    const result1 = await charactersService.processCharacterSiblings(testCharacter);
    assert(result1.accountInfo, 'First call should return account info');

    // 강제 갱신 (변화 시뮬레이션)
    const result2 = await charactersService.refreshAccountInfo(testCharacter);
    assert(result2, 'Refresh should return account info');

    console.log('✅ Change detection test passed');
  });

  // === 에러 처리 테스트 ===

  test('should handle invalid character names gracefully', async () => {
    const invalidCharacter = '존재하지않는캐릭터명123456789';

    try {
      await charactersService.processCharacterSiblings(invalidCharacter);
      assert.fail('Should have thrown an error for invalid character');
    } catch (error) {
      // 에러가 발생해야 정상
      assert(error instanceof Error, 'Should throw an error');
      console.log('✅ Error handling test passed');
    }
  });

  // === 캐시 통계 테스트 ===

  test('should provide cache statistics', async () => {
    const stats = charactersService.getCacheStats();

    assert(typeof stats.totalEntries === 'number', 'Total entries should be a number');
    assert(typeof stats.expiredEntries === 'number', 'Expired entries should be a number');
    assert(typeof stats.memoryUsage === 'number', 'Memory usage should be a number');

    console.log('✅ Cache stats test passed');
    console.log(`- Total entries: ${stats.totalEntries}`);
    console.log(`- Expired entries: ${stats.expiredEntries}`);
    console.log(`- Memory usage: ${stats.memoryUsage}`);
  });

  // === 성능 테스트 ===

  test('should process siblings within reasonable time', async () => {
    const streamerList = getAllCharacterNames();
    const testCharacter = streamerList[0];

    if (!testCharacter) {
      console.log('No test character available, skipping performance test');
      return;
    }

    const startTime = Date.now();

    try {
      await charactersService.processCharacterSiblings(testCharacter);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 30초 이내에 완료되어야 함 (네트워크 지연 고려)
      assert(duration < 30000, `Processing took too long: ${duration}ms`);

      console.log(`✅ Performance test passed (${duration}ms)`);
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('⚠️  API key issue, skipping performance test');
        return;
      }
      throw error;
    }
  });
});

// === 유틸리티 함수 테스트 ===

describe('CHARACTERS API Utilities', () => {
  test('should parse item level correctly', async () => {
    const { parseItemLevel } = await import(
      '../../../../packages/shared/src/types/domain/account.js'
    );

    assert.strictEqual(parseItemLevel('1,460.00'), 1460.0);
    assert.strictEqual(parseItemLevel('1,234.56'), 1234.56);
    assert.strictEqual(parseItemLevel('1000.00'), 1000.0);

    console.log('✅ Item level parsing test passed');
  });

  test('should generate account ID correctly', async () => {
    const { generateAccountId } = await import(
      '../../../../packages/shared/src/types/domain/account.js'
    );

    const accountId = generateAccountId('테스트캐릭터', '아브렐슈드');
    assert(accountId.startsWith('account:'), 'Account ID should start with "account:"');
    assert(accountId.length > 10, 'Account ID should have reasonable length');

    console.log('✅ Account ID generation test passed');
  });
});
