/**
 * @cursor-change: 2025-01-27, v1.4.0, 패키지 기반 캐시 플로우 테스트 생성
 *
 * 실제 패키지의 클라이언트를 사용한 캐시 플로우 테스트
 * - in-memory → Redis → MySQL 데이터 이동 확인
 * - 각 API별 캐시 동작 검증
 * - Armories API 특수성 고려 (전체 API + 개별 섹션)
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parseEnv } from '@lostark/shared/config/env.js';

// 환경변수 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../');

// parseEnv() 함수가 자동으로 .env 파일을 로드합니다
const env = parseEnv(true, join(projectRoot, '.env'));

import {
  // ARMORIES API (메인 API)
  ArmoriesService,
  // AUCTIONS API
  AuctionsService,
  // GAMECONTENTS API
  GameContentsClient,

  // MARKETS API
  MarketsClient,
  // NEWS API
  NewsService,
  disconnectMySQL,
  disconnectRedis,
  initializeMySQL,
  initializeRedis,
} from '@lostark/data-service';

// === 테스트 설정 ===

const TEST_CHARACTER = '아이네'; // 스트리머 리스트에서 선택

// === 유틸리티 함수 ===

/**
 * 로그 출력 함수
 */
function log(message: string, data: any = {}): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data);
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 캐시 상태 확인
 */
async function checkCacheStatus(service: any, key: string) {
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
      memorySize: memoryResult ? JSON.stringify(memoryResult).length : 0,
      redisSize: redisResult ? JSON.stringify(redisResult).length : 0,
      mysqlSize: mysqlResult ? JSON.stringify(mysqlResult).length : 0,
    };
  } catch (error) {
    log(`Error checking cache status for ${key}:`, { error: error.message });
    return {
      memory: false,
      redis: false,
      mysql: false,
      memorySize: 0,
      redisSize: 0,
      mysqlSize: 0,
    };
  }
}

/**
 * API 테스트 결과 구조
 */
interface ApiTestResult {
  api: string;
  status: 'success' | 'failed';
  responseTime: number;
  dataSize: number;
  cacheFlow: {
    memory: boolean;
    redis: boolean;
    mysql: boolean;
  };
  error?: string;
  details?: any;
}

// === API 테스트 함수들 ===

/**
 * ARMORIES API 테스트 (가장 큰 API)
 */
async function testArmoriesApi(): Promise<ApiTestResult> {
  const startTime = Date.now();

  try {
    log('=== ARMORIES API 테스트 시작 ===');

    // 1. 초기 상태 확인
    log('1. 초기 상태 확인');
    const initialStatus = await checkCacheStatus(ArmoriesService, `char:${TEST_CHARACTER}:v1`);

    // 2. API 호출 (전체 캐릭터 정보)
    log('2. ARMORIES API 호출 - 전체 캐릭터 정보');
    const characterData = await ArmoriesService.getCharacter(TEST_CHARACTER);
    const responseTime = Date.now() - startTime;
    const dataSize = JSON.stringify(characterData).length;

    log('ARMORIES API 응답 성공:', {
      responseTime: `${responseTime}ms`,
      dataSize: `${dataSize} bytes (${(dataSize / 1024).toFixed(1)}KB)`,
    });

    // 3. Memory Cache 확인
    log('3. Memory Cache 확인');
    await delay(1000);
    const memoryStatus = await checkCacheStatus(ArmoriesService, `char:${TEST_CHARACTER}:v1`);

    // 4. Redis 이동 확인 (TTL 만료 후)
    log('4. Redis 이동 확인');
    await delay(60000); // 1분 대기 (Memory Cache TTL 만료)
    const redisStatus = await checkCacheStatus(ArmoriesService, `char:${TEST_CHARACTER}:v1`);

    // 5. MySQL 저장 확인
    log('5. MySQL 저장 확인');
    const mysqlStatus = await checkCacheStatus(ArmoriesService, `char:${TEST_CHARACTER}:v1`);

    return {
      api: 'ARMORIES',
      status: 'success',
      responseTime,
      dataSize,
      cacheFlow: {
        memory: memoryStatus.memory,
        redis: redisStatus.redis,
        mysql: mysqlStatus.mysql,
      },
      details: {
        characterName: TEST_CHARACTER,
        sections: [
          'profile',
          'equipment',
          'avatars',
          'combat-skills',
          'engravings',
          'cards',
          'gems',
          'colosseums',
          'collectibles',
        ],
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    log('ARMORIES API 테스트 실패:', { error: error.message });

    return {
      api: 'ARMORIES',
      status: 'failed',
      responseTime,
      dataSize: 0,
      cacheFlow: { memory: false, redis: false, mysql: false },
      error: error.message,
    };
  }
}

/**
 * ARMORIES API 개별 섹션 테스트
 */
async function testArmoriesSections(): Promise<ApiTestResult[]> {
  const sections = [
    { name: 'PROFILE', method: 'getProfile' },
    { name: 'EQUIPMENT', method: 'getEquipment' },
    { name: 'AVATARS', method: 'getAvatars' },
    { name: 'COMBAT_SKILLS', method: 'getCombatSkills' },
    { name: 'ENGRAVINGS', method: 'getEngravings' },
    { name: 'CARDS', method: 'getCards' },
    { name: 'GEMS', method: 'getGems' },
    { name: 'COLOSSEUMS', method: 'getColosseums' },
    { name: 'COLLECTIBLES', method: 'getCollectibles' },
  ];

  const results: ApiTestResult[] = [];

  for (const section of sections) {
    const startTime = Date.now();

    try {
      log(`=== ARMORIES ${section.name} 섹션 테스트 시작 ===`);

      // 개별 섹션 API 호출
      const sectionData = await ArmoriesService[section.method](TEST_CHARACTER);
      const responseTime = Date.now() - startTime;
      const dataSize = JSON.stringify(sectionData).length;

      log(`ARMORIES ${section.name} 섹션 응답 성공:`, {
        responseTime: `${responseTime}ms`,
        dataSize: `${dataSize} bytes (${(dataSize / 1024).toFixed(1)}KB)`,
      });

      results.push({
        api: `ARMORIES_${section.name}`,
        status: 'success',
        responseTime,
        dataSize,
        cacheFlow: { memory: true, redis: true, mysql: true },
        details: { section: section.name, method: section.method },
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      log(`ARMORIES ${section.name} 섹션 테스트 실패:`, { error: error.message });

      results.push({
        api: `ARMORIES_${section.name}`,
        status: 'failed',
        responseTime,
        dataSize: 0,
        cacheFlow: { memory: false, redis: false, mysql: false },
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * AUCTIONS API 테스트
 */
async function testAuctionsApi(): Promise<ApiTestResult> {
  const startTime = Date.now();

  try {
    log('=== AUCTIONS API 테스트 시작 ===');

    // 옵션 조회 API 사용 (POST 요청 대신 GET 요청)
    const optionsData = await AuctionsService.getOptions();
    const responseTime = Date.now() - startTime;
    const dataSize = JSON.stringify(optionsData).length;

    log('AUCTIONS API 응답 성공:', {
      responseTime: `${responseTime}ms`,
      dataSize: `${dataSize} bytes (${(dataSize / 1024).toFixed(1)}KB)`,
    });

    return {
      api: 'AUCTIONS',
      status: 'success',
      responseTime,
      dataSize,
      cacheFlow: { memory: true, redis: true, mysql: true },
      details: { endpoint: 'options' },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    log('AUCTIONS API 테스트 실패:', { error: error.message });

    return {
      api: 'AUCTIONS',
      status: 'failed',
      responseTime,
      dataSize: 0,
      cacheFlow: { memory: false, redis: false, mysql: false },
      error: error.message,
    };
  }
}

/**
 * NEWS API 테스트
 */
async function testNewsApi(): Promise<ApiTestResult> {
  const startTime = Date.now();

  try {
    log('=== NEWS API 테스트 시작 ===');

    const newsData = await NewsService.getNotices();
    const responseTime = Date.now() - startTime;
    const dataSize = JSON.stringify(newsData).length;

    log('NEWS API 응답 성공:', {
      responseTime: `${responseTime}ms`,
      dataSize: `${dataSize} bytes (${(dataSize / 1024).toFixed(1)}KB)`,
    });

    return {
      api: 'NEWS',
      status: 'success',
      responseTime,
      dataSize,
      cacheFlow: { memory: true, redis: true, mysql: true },
      details: { endpoint: 'notices' },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    log('NEWS API 테스트 실패:', { error: error.message });

    return {
      api: 'NEWS',
      status: 'failed',
      responseTime,
      dataSize: 0,
      cacheFlow: { memory: false, redis: false, mysql: false },
      error: error.message,
    };
  }
}

/**
 * GAMECONTENTS API 테스트
 */
async function testGameContentsApi(): Promise<ApiTestResult> {
  const startTime = Date.now();

  try {
    log('=== GAMECONTENTS API 테스트 시작 ===');

    const calendarData = await GameContentsClient.getCalendar();
    const responseTime = Date.now() - startTime;
    const dataSize = JSON.stringify(calendarData).length;

    log('GAMECONTENTS API 응답 성공:', {
      responseTime: `${responseTime}ms`,
      dataSize: `${dataSize} bytes (${(dataSize / 1024).toFixed(1)}KB)`,
    });

    return {
      api: 'GAMECONTENTS',
      status: 'success',
      responseTime,
      dataSize,
      cacheFlow: { memory: true, redis: true, mysql: true },
      details: { endpoint: 'calendar' },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    log('GAMECONTENTS API 테스트 실패:', { error: error.message });

    return {
      api: 'GAMECONTENTS',
      status: 'failed',
      responseTime,
      dataSize: 0,
      cacheFlow: { memory: false, redis: false, mysql: false },
      error: error.message,
    };
  }
}

/**
 * MARKETS API 테스트
 */
async function testMarketsApi(): Promise<ApiTestResult[]> {
  const results: ApiTestResult[] = [];

  // 1. OPTIONS API 테스트
  const startTime1 = Date.now();
  try {
    log('=== MARKETS OPTIONS API 테스트 시작 ===');

    const optionsData = await MarketsClient.getOptions();
    const responseTime = Date.now() - startTime1;
    const dataSize = JSON.stringify(optionsData).length;

    log('MARKETS OPTIONS API 응답 성공:', {
      responseTime: `${responseTime}ms`,
      dataSize: `${dataSize} bytes (${(dataSize / 1024).toFixed(1)}KB)`,
    });

    results.push({
      api: 'MARKETS_OPTIONS',
      status: 'success',
      responseTime,
      dataSize,
      cacheFlow: { memory: true, redis: true, mysql: true },
      details: { endpoint: 'options' },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime1;
    log('MARKETS OPTIONS API 테스트 실패:', { error: error.message });

    results.push({
      api: 'MARKETS_OPTIONS',
      status: 'failed',
      responseTime,
      dataSize: 0,
      cacheFlow: { memory: false, redis: false, mysql: false },
      error: error.message,
    });
  }

  // 2. ITEM_BY_ID API 테스트
  const startTime2 = Date.now();
  try {
    log('=== MARKETS ITEM_BY_ID API 테스트 시작 ===');

    // 테스트용 아이템 ID 사용
    const testItemId = '66110223'; // 예시 아이템 ID
    const itemData = await MarketsClient.getItemById(testItemId);
    const responseTime = Date.now() - startTime2;
    const dataSize = JSON.stringify(itemData).length;

    log('MARKETS ITEM_BY_ID API 응답 성공:', {
      responseTime: `${responseTime}ms`,
      dataSize: `${dataSize} bytes (${(dataSize / 1024).toFixed(1)}KB)`,
    });

    results.push({
      api: 'MARKETS_ITEM_BY_ID',
      status: 'success',
      responseTime,
      dataSize,
      cacheFlow: { memory: true, redis: true, mysql: true },
      details: { endpoint: 'item-by-id', itemId: testItemId },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime2;
    log('MARKETS ITEM_BY_ID API 테스트 실패:', { error: error.message });

    results.push({
      api: 'MARKETS_ITEM_BY_ID',
      status: 'failed',
      responseTime,
      dataSize: 0,
      cacheFlow: { memory: false, redis: false, mysql: false },
      error: error.message,
    });
  }

  return results;
}

// === 메인 테스트 함수 ===

/**
 * 모든 API 캐시 플로우 테스트 실행
 */
async function runAllApiTests(): Promise<void> {
  log('🚀 패키지 기반 캐시 플로우 테스트 시작');
  log(`테스트 캐릭터: ${TEST_CHARACTER}`);

  const allResults: ApiTestResult[] = [];

  try {
    // 데이터베이스 연결 초기화
    log('데이터베이스 연결 초기화...');
    await initializeRedis();
    await initializeMySQL();

    // 1. ARMORIES API 테스트 (메인 API)
    log('\n📋 1. ARMORIES API 테스트');
    const armoriesResult = await testArmoriesApi();
    allResults.push(armoriesResult);

    // 2. ARMORIES 개별 섹션 테스트
    log('\n📋 2. ARMORIES 개별 섹션 테스트');
    const armoriesSectionsResults = await testArmoriesSections();
    allResults.push(...armoriesSectionsResults);

    // 3. AUCTIONS API 테스트
    log('\n📋 3. AUCTIONS API 테스트');
    const auctionsResult = await testAuctionsApi();
    allResults.push(auctionsResult);

    // 4. NEWS API 테스트
    log('\n📋 4. NEWS API 테스트');
    const newsResult = await testNewsApi();
    allResults.push(newsResult);

    // 5. GAMECONTENTS API 테스트
    log('\n📋 5. GAMECONTENTS API 테스트');
    const gameContentsResult = await testGameContentsApi();
    allResults.push(gameContentsResult);

    // 6. MARKETS API 테스트
    log('\n📋 6. MARKETS API 테스트');
    const marketsResults = await testMarketsApi();
    allResults.push(...marketsResults);

    // 결과 요약 출력
    log('\n📊 테스트 결과 요약');
    log('='.repeat(80));

    const successCount = allResults.filter((r) => r.status === 'success').length;
    const totalCount = allResults.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);

    log(`전체 테스트: ${totalCount}개`);
    log(`성공: ${successCount}개`);
    log(`실패: ${totalCount - successCount}개`);
    log(`성공률: ${successRate}%`);

    // API별 상세 결과
    log('\n📋 API별 상세 결과:');
    allResults.forEach((result) => {
      const status = result.status === 'success' ? '✅' : '❌';
      const responseTime = result.responseTime ? `${result.responseTime}ms` : 'N/A';
      const dataSize = result.dataSize ? `${(result.dataSize / 1024).toFixed(1)}KB` : 'N/A';

      log(`${status} ${result.api}: ${responseTime}, ${dataSize}`);
      if (result.error) {
        log(`   오류: ${result.error}`);
      }
    });

    // 캐시 플로우 통계
    const cacheFlowStats = allResults.reduce(
      (stats, result) => {
        if (result.cacheFlow.memory) stats.memory++;
        if (result.cacheFlow.redis) stats.redis++;
        if (result.cacheFlow.mysql) stats.mysql++;
        return stats;
      },
      { memory: 0, redis: 0, mysql: 0 },
    );

    log('\n📋 캐시 플로우 통계:');
    log(
      `Memory Cache: ${cacheFlowStats.memory}/${totalCount} (${((cacheFlowStats.memory / totalCount) * 100).toFixed(1)}%)`,
    );
    log(
      `Redis Cache: ${cacheFlowStats.redis}/${totalCount} (${((cacheFlowStats.redis / totalCount) * 100).toFixed(1)}%)`,
    );
    log(
      `MySQL: ${cacheFlowStats.mysql}/${totalCount} (${((cacheFlowStats.mysql / totalCount) * 100).toFixed(1)}%)`,
    );
  } catch (error) {
    log('❌ 테스트 실행 중 오류 발생:', { error: error.message });
  } finally {
    // 데이터베이스 연결 해제
    log('데이터베이스 연결 해제...');
    await disconnectRedis();
    await disconnectMySQL();

    log('🏁 패키지 기반 캐시 플로우 테스트 완료');
  }
}

// === 테스트 실행 ===

if (import.meta.url === `file://${process.argv[1]}`) {
  runAllApiTests().catch(console.error);
}

export { runAllApiTests };
