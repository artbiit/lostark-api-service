/**
 * @cursor-change: 2025-01-27, v1.0.0, 간단한 캐시 플로우 테스트 생성
 *
 * ARMORIES API 캐시 플로우 테스트 (가장 큰 단위)
 * - in-memory → Redis → MySQL 데이터 이동 확인
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

const TEST_CHARACTERS = ['아이네', '우왁굳']; // 스트리머 리스트에서 선택

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

    // MySQL 확인
    const mysqlResult = await service.getFromDatabase(characterName);
    log(`MySQL - ${characterName}:`, {
      exists: !!mysqlResult,
      dataSize: mysqlResult ? JSON.stringify(mysqlResult).length : 0,
    });

    return {
      memory: !!memoryResult,
      redis: !!redisResult,
      mysql: !!mysqlResult,
    };
  } catch (error) {
    log(`Cache status check failed for ${characterName}:`, { error: error.message });
    return { memory: false, redis: false, mysql: false };
  }
}

// === ARMORIES API 테스트 ===

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

// === 메인 테스트 실행 ===

async function runTest() {
  log('🚀 ARMORIES API 캐시 플로우 테스트 시작');
  log(`테스트 캐릭터: ${TEST_CHARACTERS.join(', ')}`);

  try {
    // API 테스트 실행
    await testArmoriesAPI();

    log('✅ 테스트 완료');
  } catch (error) {
    log('❌ 테스트 실행 중 오류 발생:', { error: error.message });
    console.error(error);
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest();
}
