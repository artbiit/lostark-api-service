/**
 * @cursor-change: 2025-01-27, v1.0.0, 캐시 플로우 테스트 생성
 *
 * API 단위 캐시 플로우 테스트
 * - in-memory → Redis → PostgreSQL 데이터 이동 확인
 * - 각 API별 캐시 동작 검증
 */

import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// 환경변수 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

dotenv.config({ path: join(projectRoot, '.env') });

// 공통 모듈 import
import { createCacheFlowClient } from '../../common/cache-flow-client.mjs';
import { loadStreamerList } from '../../common/streamer-list.mjs';

// === 테스트 설정 ===

const TEST_CHARACTERS = ['아트네']; // 사용자 보유 캐릭터
const API_ENDPOINTS = [
  'characters',
  'armories', // 가장 큰 단위
  'auctions',
  'news',
  'gamecontents',
  'markets',
];

// === 유틸리티 함수 ===

/**
 * 로그 출력 함수
 */
function log(message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data);
}

/**
 * 지연 함수
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 캐시 상태 확인
 */
async function checkCacheStatus(service, characterName) {
  try {
    // Memory Cache 확인
    const memoryResult = await service.getFromMemory(characterName);
    log(`Memory Cache - ${characterName}:`, {
      exists: !!memoryResult,
      dataSize: memoryResult ? JSON.stringify(memoryResult).length : 0,
    });

    // Redis Cache 확인
    const redisResult = await service.getFromRedis(characterName);
    log(`Redis Cache - ${characterName}:`, {
      exists: !!redisResult,
      dataSize: redisResult ? JSON.stringify(redisResult).length : 0,
    });

    // PostgreSQL 확인
    const postgresqlResult = await service.getFromDatabase(characterName);
    log(`PostgreSQL - ${characterName}:`, {
      exists: !!postgresqlResult,
      dataSize: postgresqlResult ? JSON.stringify(postgresqlResult).length : 0,
    });

    return {
      memory: !!memoryResult,
      redis: !!redisResult,
      postgresql: !!postgresqlResult,
    };
  } catch (error) {
    log(`Cache status check failed for ${characterName}:`, { error: error.message });
    return { memory: false, redis: false, postgresql: false };
  }
}

// === API별 테스트 함수 ===

/**
 * CHARACTERS API 테스트
 */
async function testCharactersAPI() {
  log('=== CHARACTERS API 테스트 시작 ===');

  const apiClient = createCacheFlowClient();

  for (const characterName of TEST_CHARACTERS) {
    log(`\n--- ${characterName} 캐릭터 테스트 ---`);

    // 1. 초기 상태 확인
    log('1. 초기 캐시 상태 확인');
    await checkCacheStatus(apiClient.characters, characterName);

    // 2. API 호출 (Memory Cache에 저장)
    log('2. API 호출 및 Memory Cache 저장');
    const startTime = Date.now();
    const result = await apiClient.characters.getCharacter(characterName);
    const apiTime = Date.now() - startTime;

    log('API 호출 결과:', {
      success: !!result,
      responseTime: `${apiTime}ms`,
      dataSize: result ? JSON.stringify(result).length : 0,
    });

    // 3. Memory Cache 확인
    log('3. Memory Cache 상태 확인');
    await checkCacheStatus(apiClient.characters, characterName);

    // 4. Redis로 이동 확인 (TTL 만료 후)
    log('4. Redis 이동 확인 (5초 대기)');
    await delay(5000);
    await checkCacheStatus(apiClient.characters, characterName);

    // 5. PostgreSQL 저장 확인
    log('5. PostgreSQL 저장 확인');
    await apiClient.characters.saveToDatabase(characterName);
    await checkCacheStatus(apiClient.characters, characterName);

    await delay(2000); // 다음 캐릭터 전 대기
  }
}

/**
 * ARMORIES API 테스트 (가장 큰 단위)
 */
async function testArmoriesAPI() {
  log('=== ARMORIES API 테스트 시작 ===');

  const apiClient = createCacheFlowClient();

  for (const characterName of TEST_CHARACTERS) {
    log(`\n--- ${characterName} 아머리 테스트 ---`);

    // 1. 초기 상태 확인
    log('1. 초기 캐시 상태 확인');
    await checkCacheStatus(apiClient.armories, characterName);

    // 2. API 호출 (Memory Cache에 저장)
    log('2. API 호출 및 Memory Cache 저장');
    const startTime = Date.now();
    const result = await apiClient.armories.getCharacterDetail(characterName);
    const apiTime = Date.now() - startTime;

    log('API 호출 결과:', {
      success: !!result,
      responseTime: `${apiTime}ms`,
      dataSize: result ? JSON.stringify(result).length : 0,
      hasEquipment: result?.equipment ? Object.keys(result.equipment).length : 0,
      hasEngravings: result?.engravings ? result.engravings.length : 0,
      hasGems: result?.gems ? result.gems.length : 0,
    });

    // 3. Memory Cache 확인
    log('3. Memory Cache 상태 확인');
    await checkCacheStatus(apiClient.armories, characterName);

    // 4. Redis로 이동 확인 (TTL 만료 후)
    log('4. Redis 이동 확인 (10초 대기)');
    await delay(10000);
    await checkCacheStatus(apiClient.armories, characterName);

    // 5. PostgreSQL 저장 확인
    log('5. PostgreSQL 저장 확인');
    await apiClient.armories.saveToDatabase(characterName);
    await checkCacheStatus(apiClient.armories, characterName);

    await delay(3000); // 다음 캐릭터 전 대기
  }
}

/**
 * AUCTIONS API 테스트
 */
async function testAuctionsAPI() {
  log('=== AUCTIONS API 테스트 시작 ===');

  const apiClient = createCacheFlowClient();

  // 경매장 검색 테스트
  const searchParams = {
    CategoryCode: 200000, // 무기
    ItemTier: 3,
    ItemGrade: '고급',
    PageNo: 1,
    Sort: 'BUY_PRICE',
  };

  log('1. 초기 캐시 상태 확인');
  await checkCacheStatus(apiClient.auctions, JSON.stringify(searchParams));

  log('2. API 호출 및 Memory Cache 저장');
  const startTime = Date.now();
  const result = await apiClient.auctions.searchItems(searchParams);
  const apiTime = Date.now() - startTime;

  log('API 호출 결과:', {
    success: !!result,
    responseTime: `${apiTime}ms`,
    dataSize: result ? JSON.stringify(result).length : 0,
    itemCount: result?.Items?.length || 0,
  });

  log('3. Memory Cache 상태 확인');
  await checkCacheStatus(apiClient.auctions, JSON.stringify(searchParams));

  log('4. Redis 이동 확인 (5초 대기)');
  await delay(5000);
  await checkCacheStatus(apiClient.auctions, JSON.stringify(searchParams));

  log('5. PostgreSQL 저장 확인');
  await apiClient.auctions.saveToDatabase(searchParams);
  await checkCacheStatus(apiClient.auctions, JSON.stringify(searchParams));
}

/**
 * NEWS API 테스트
 */
async function testNewsAPI() {
  log('=== NEWS API 테스트 시작 ===');

  const apiClient = createCacheFlowClient();

  log('1. 초기 캐시 상태 확인');
  await checkCacheStatus(apiClient.news, 'notices');

  log('2. API 호출 및 Memory Cache 저장');
  const startTime = Date.now();
  const result = await apiClient.news.getNotices();
  const apiTime = Date.now() - startTime;

  log('API 호출 결과:', {
    success: !!result,
    responseTime: `${apiTime}ms`,
    dataSize: result ? JSON.stringify(result).length : 0,
    noticeCount: result?.length || 0,
  });

  log('3. Memory Cache 상태 확인');
  await checkCacheStatus(apiClient.news, 'notices');

  log('4. Redis 이동 확인 (5초 대기)');
  await delay(5000);
  await checkCacheStatus(apiClient.news, 'notices');

  log('5. PostgreSQL 저장 확인');
  await apiClient.news.saveToDatabase('notices');
  await checkCacheStatus(apiClient.news, 'notices');
}

/**
 * GAMECONTENTS API 테스트
 */
async function testGameContentsAPI() {
  log('=== GAMECONTENTS API 테스트 시작 ===');

  const apiClient = createCacheFlowClient();

  log('1. 초기 캐시 상태 확인');
  await checkCacheStatus(apiClient.gamecontents, 'calendar');

  log('2. API 호출 및 Memory Cache 저장');
  const startTime = Date.now();
  const result = await apiClient.gamecontents.getCalendar();
  const apiTime = Date.now() - startTime;

  log('API 호출 결과:', {
    success: !!result,
    responseTime: `${apiTime}ms`,
    dataSize: result ? JSON.stringify(result).length : 0,
    eventCount: result?.length || 0,
  });

  log('3. Memory Cache 상태 확인');
  await checkCacheStatus(apiClient.gamecontents, 'calendar');

  log('4. Redis 이동 확인 (5초 대기)');
  await delay(5000);
  await checkCacheStatus(apiClient.gamecontents, 'calendar');

  log('5. PostgreSQL 저장 확인');
  await apiClient.gamecontents.saveToDatabase('calendar');
  await checkCacheStatus(apiClient.gamecontents, 'calendar');
}

/**
 * MARKETS API 테스트
 */
async function testMarketsAPI() {
  log('=== MARKETS API 테스트 시작 ===');

  const apiClient = createCacheFlowClient();

  log('1. 초기 캐시 상태 확인');
  await checkCacheStatus(apiClient.markets, 'items');

  log('2. API 호출 및 Memory Cache 저장');
  const startTime = Date.now();
  const result = await apiClient.markets.getItems();
  const apiTime = Date.now() - startTime;

  log('API 호출 결과:', {
    success: !!result,
    responseTime: `${apiTime}ms`,
    dataSize: result ? JSON.stringify(result).length : 0,
    itemCount: result?.length || 0,
  });

  log('3. Memory Cache 상태 확인');
  await checkCacheStatus(apiClient.markets, 'items');

  log('4. Redis 이동 확인 (5초 대기)');
  await delay(5000);
  await checkCacheStatus(apiClient.markets, 'items');

  log('5. PostgreSQL 저장 확인');
  await apiClient.markets.saveToDatabase('items');
  await checkCacheStatus(apiClient.markets, 'items');
}

// === 메인 테스트 실행 ===

async function runAllTests() {
  log('🚀 캐시 플로우 테스트 시작');
  log(`테스트 캐릭터: ${TEST_CHARACTERS.join(', ')}`);
  log(`API 엔드포인트: ${API_ENDPOINTS.join(', ')}`);

  try {
    // 스트리머 리스트 로드 확인
    const streamers = await loadStreamerList();
    log(`스트리머 리스트 로드 완료: ${streamers.length}명`);

    // API별 테스트 실행
    await testCharactersAPI();
    await delay(2000);

    await testArmoriesAPI(); // 가장 큰 단위
    await delay(2000);

    await testAuctionsAPI();
    await delay(2000);

    await testNewsAPI();
    await delay(2000);

    await testGameContentsAPI();
    await delay(2000);

    await testMarketsAPI();

    log('✅ 모든 테스트 완료');
  } catch (error) {
    log('❌ 테스트 실행 중 오류 발생:', { error: error.message });
    console.error(error);
  }
}

// 스크립트 실행
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAllTests();
}
