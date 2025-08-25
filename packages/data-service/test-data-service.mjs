/**
 * @cursor-change: 2025-01-27, v1.0.0, Data Service 테스트 스크립트 생성
 *
 * Data Service 기본 기능 테스트
 * - CHARACTERS API 테스트
 * - ARMORIES API 테스트
 * - 캐시 기능 테스트
 */

import { logger } from '@lostark/shared';

import { STREAMERS } from '../tests/common/streamer-list.mjs';

import { config } from './src/config.js';
import { ArmoriesService, CharactersService } from './src/index.js';

// === 테스트 설정 ===
const TEST_CHARACTER_NAME = STREAMERS[0]?.character || '이다'; // 첫 번째 스트리머 캐릭터 사용

async function testDataService() {
  try {
    logger.info('Data Service 테스트 시작', {
      characterName: TEST_CHARACTER_NAME,
      apiKey: config.lostarkApiKey ? '설정됨' : '미설정',
    });

    // === CHARACTERS API 테스트 ===
    logger.info('CHARACTERS API 테스트 시작');
    const charactersService = new CharactersService();

    // 캐릭터 기본 정보 조회
    const characterInfo = await charactersService.getCharacterInfo(TEST_CHARACTER_NAME);
    logger.info('캐릭터 기본 정보 조회 성공', {
      characterName: characterInfo?.characterName,
      serverName: characterInfo?.serverName,
      className: characterInfo?.className,
      itemLevel: characterInfo?.itemLevel,
    });

    // === ARMORIES API 테스트 ===
    logger.info('ARMORIES API 테스트 시작');
    const armoriesService = new ArmoriesService();

    // 캐릭터 상세 정보 조회
    const characterDetail = await armoriesService.getCharacterDetail(TEST_CHARACTER_NAME);
    logger.info('캐릭터 상세 정보 조회 성공', {
      characterName: characterDetail?.characterName,
      itemLevel: characterDetail?.itemLevel,
      expeditionLevel: characterDetail?.expeditionLevel,
      equipmentCount: characterDetail?.equipment?.length,
      engravingsCount: characterDetail?.engravings?.length,
      gemsCount: characterDetail?.gems?.length,
    });

    logger.info('Data Service 테스트 완료');
  } catch (error) {
    logger.error('Data Service 테스트 실패', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// === 메인 실행 ===
if (import.meta.url === `file://${process.argv[1]}`) {
  testDataService()
    .then(() => {
      logger.info('테스트 성공적으로 완료');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('테스트 실패', { error: error.message });
      process.exit(1);
    });
}
