/**
 * @cursor-change: 2025-01-27, v1.0.0, 모든 API 캐시 플로우 테스트 생성
 *
 * 모든 API의 캐시 플로우 테스트
 * - in-memory → Redis → MySQL 데이터 이동 확인
 * - 각 API별 캐시 동작 검증
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// 환경변수 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../');

// .env 파일 직접 읽기
function loadEnv() {
  try {
    const envPath = join(projectRoot, '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    });

    // 환경변수 설정
    Object.entries(envVars).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn('Warning: Could not load .env file:', error.message);
  }
}

loadEnv();

import { createCacheFlowClient } from '../common/cache-flow-client.mjs';

// === 테스트 설정 ===

const TEST_CHARACTERS = ['아이네']; // 스트리머 리스트에서 선택

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
async function checkCacheStatus(service, key) {
  try {
    // Memory Cache 확인
    const memoryResult = await service.getFromMemory(key);
    log(`Memory Cache - ${key}:`, {
      exists: !!memoryResult,
      dataSize: memoryResult ? JSON.stringify(memoryResult).length : 0,
    });

    // Redis Cache 확인
    const redisResult = await service.getFromRedis(key);
    log(`Redis Cache - ${key}:`, {
      exists: !!redisResult,
      dataSize: redisResult ? JSON.stringify(redisResult).length : 0,
    });

    // MySQL 확인
    const mysqlResult = await service.getFromDatabase(key);
    log(`MySQL - ${key}:`, {
      exists: !!mysqlResult,
      dataSize: mysqlResult ? JSON.stringify(mysqlResult).length : 0,
    });

    return {
      memory: !!memoryResult,
      redis: !!redisResult,
      mysql: !!mysqlResult,
    };
  } catch (error) {
    log(`Cache status check failed for ${key}:`, { error: error.message });
    return { memory: false, redis: false, mysql: false };
  }
}

// === API별 테스트 함수 ===

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

    // 5. MySQL 저장 확인
    log('5. MySQL 저장 확인');
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
  const key = 'options';

  log('1. 초기 캐시 상태 확인');
  await checkCacheStatus(apiClient.auctions, key);

  log('2. API 호출 및 Memory Cache 저장');
  const startTime = Date.now();
  const result = await apiClient.auctions.getOptions();
  const apiTime = Date.now() - startTime;

  log('API 호출 결과:', {
    success: !!result,
    responseTime: `${apiTime}ms`,
    dataSize: result ? JSON.stringify(result).length : 0,
    categoryCount: result?.Categories?.length || 0,
  });

  log('3. Memory Cache 상태 확인');
  await checkCacheStatus(apiClient.auctions, key);

  log('4. Redis 이동 확인 (5초 대기)');
  await delay(5000);
  await checkCacheStatus(apiClient.auctions, key);

  log('5. MySQL 저장 확인');
  await apiClient.auctions.saveToDatabase(key);
  await checkCacheStatus(apiClient.auctions, key);
}

/**
 * NEWS API 테스트
 */
async function testNewsAPI() {
  log('=== NEWS API 테스트 시작 ===');

  const apiClient = createCacheFlowClient();
  const key = 'notices';

  log('1. 초기 캐시 상태 확인');
  await checkCacheStatus(apiClient.news, key);

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
  await checkCacheStatus(apiClient.news, key);

  log('4. Redis 이동 확인 (5초 대기)');
  await delay(5000);
  await checkCacheStatus(apiClient.news, key);

  log('5. MySQL 저장 확인');
  await apiClient.news.saveToDatabase(key);
  await checkCacheStatus(apiClient.news, key);
}

/**
 * GAMECONTENTS API 테스트
 */
async function testGameContentsAPI() {
  log('=== GAMECONTENTS API 테스트 시작 ===');

  const apiClient = createCacheFlowClient();
  const key = 'calendar';

  log('1. 초기 캐시 상태 확인');
  await checkCacheStatus(apiClient.gamecontents, key);

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
  await checkCacheStatus(apiClient.gamecontents, key);

  log('4. Redis 이동 확인 (5초 대기)');
  await delay(5000);
  await checkCacheStatus(apiClient.gamecontents, key);

  log('5. MySQL 저장 확인');
  await apiClient.gamecontents.saveToDatabase(key);
  await checkCacheStatus(apiClient.gamecontents, key);
}

/**
 * MARKETS API 테스트
 */
async function testMarketsAPI() {
  log('=== MARKETS API 테스트 시작 ===');

  const apiClient = createCacheFlowClient();
  const key = 'options';

  log('1. 초기 캐시 상태 확인');
  await checkCacheStatus(apiClient.markets, key);

  log('2. API 호출 및 Memory Cache 저장');
  const startTime = Date.now();
  const result = await apiClient.markets.getOptions();
  const apiTime = Date.now() - startTime;

  log('API 호출 결과:', {
    success: !!result,
    responseTime: `${apiTime}ms`,
    dataSize: result ? JSON.stringify(result).length : 0,
    categoryCount: result?.Categories?.length || 0,
  });

  log('3. Memory Cache 상태 확인');
  await checkCacheStatus(apiClient.markets, key);

  log('4. Redis 이동 확인 (5초 대기)');
  await delay(5000);
  await checkCacheStatus(apiClient.markets, key);

  log('5. MySQL 저장 확인');
  await apiClient.markets.saveToDatabase(key);
  await checkCacheStatus(apiClient.markets, key);
}

// === 메인 테스트 실행 ===

async function runAllTests() {
  log('🚀 모든 API 캐시 플로우 테스트 시작');
  log(`테스트 캐릭터: ${TEST_CHARACTERS.join(', ')}`);

  try {
    // API별 테스트 실행 (CHARACTERS API 제거)
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
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
