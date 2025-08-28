/**
 * @cursor-change: 2025-01-27, v1.0.0, REST Service 간단 통합 테스트
 *
 * REST Service의 기본 기능 통합 테스트
 * - 헬스 체크
 * - 캐시 상태
 * - 기본 API 엔드포인트
 */

import { loadEnv } from '../../common/env-loader.mjs';

// 간단한 로거
const logger = {
  info: (message, data) => console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : ''),
  error: (message, data) => console.error(`[ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : ''),
  warn: (message, data) => console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : ''),
};

logger.info('🚀 REST Service 통합 테스트 시작');

async function testHealthCheck(baseUrl) {
  try {
    logger.info('📋 헬스 체크 테스트 시작');
    
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();
    
    if (response.status === 200 && data.status === 'ok') {
      logger.info('✅ 헬스 체크 성공');
      return true;
    } else {
      logger.error('❌ 헬스 체크 실패', { status: response.status, data });
      return false;
    }
  } catch (error) {
    logger.error('❌ 헬스 체크 에러', { error: error.message });
    return false;
  }
}

async function testCacheStatus(baseUrl) {
  try {
    logger.info('📋 캐시 상태 테스트 시작');
    
    const response = await fetch(`${baseUrl}/cache/status`);
    const data = await response.json();
    
    if (response.status === 200 && data.cache) {
      logger.info('✅ 캐시 상태 조회 성공');
      return true;
    } else {
      logger.error('❌ 캐시 상태 조회 실패', { status: response.status, data });
      return false;
    }
  } catch (error) {
    logger.error('❌ 캐시 상태 조회 에러', { error: error.message });
    return false;
  }
}

async function testCharacterAPI(baseUrl) {
  try {
    logger.info('📋 캐릭터 API 테스트 시작');
    
    const characterName = '테스트캐릭터1';
    const response = await fetch(`${baseUrl}/characters/${encodeURIComponent(characterName)}`);
    
    if (response.status === 200) {
      const data = await response.json();
      if (data.success && data.data) {
        logger.info('✅ 캐릭터 API 성공');
        return true;
      }
    } else if (response.status === 404) {
      logger.info('⚠️ 캐릭터를 찾을 수 없음 (정상적인 응답)');
      return true;
    }
    
    logger.error('❌ 캐릭터 API 실패', { status: response.status });
    return false;
  } catch (error) {
    logger.error('❌ 캐릭터 API 에러', { error: error.message });
    return false;
  }
}

async function testAuctionsAPI(baseUrl) {
  try {
    logger.info('📋 경매장 API 테스트 시작');
    
    const response = await fetch(`${baseUrl}/auctions/search?itemName=파괴석&pageNo=1`);
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      logger.info('✅ 경매장 API 성공');
      return true;
    } else {
      logger.error('❌ 경매장 API 실패', { status: response.status, data });
      return false;
    }
  } catch (error) {
    logger.error('❌ 경매장 API 에러', { error: error.message });
    return false;
  }
}

async function testNewsAPI(baseUrl) {
  try {
    logger.info('📋 공지사항 API 테스트 시작');
    
    const response = await fetch(`${baseUrl}/news?type=notices`);
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      logger.info('✅ 공지사항 API 성공');
      return true;
    } else {
      logger.error('❌ 공지사항 API 실패', { status: response.status, data });
      return false;
    }
  } catch (error) {
    logger.error('❌ 공지사항 API 에러', { error: error.message });
    return false;
  }
}

async function testGameContentsAPI(baseUrl) {
  try {
    logger.info('📋 게임 콘텐츠 API 테스트 시작');
    
    const response = await fetch(`${baseUrl}/game-contents`);
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      logger.info('✅ 게임 콘텐츠 API 성공');
      return true;
    } else {
      logger.error('❌ 게임 콘텐츠 API 실패', { status: response.status, data });
      return false;
    }
  } catch (error) {
    logger.error('❌ 게임 콘텐츠 API 에러', { error: error.message });
    return false;
  }
}

async function testMarketsAPI(baseUrl) {
  try {
    logger.info('📋 시장 API 테스트 시작');
    
    const response = await fetch(`${baseUrl}/markets?itemIds=66110223,66110224`);
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      logger.info('✅ 시장 API 성공');
      return true;
    } else {
      logger.error('❌ 시장 API 실패', { status: response.status, data });
      return false;
    }
  } catch (error) {
    logger.error('❌ 시장 API 에러', { error: error.message });
    return false;
  }
}

async function testCacheOptimization(baseUrl) {
  try {
    logger.info('📋 캐시 최적화 테스트 시작');
    
    const response = await fetch(`${baseUrl}/cache/optimize`, {
      method: 'POST',
    });
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      logger.info('✅ 캐시 최적화 성공');
      return true;
    } else {
      logger.error('❌ 캐시 최적화 실패', { status: response.status, data });
      return false;
    }
  } catch (error) {
    logger.error('❌ 캐시 최적화 에러', { error: error.message });
    return false;
  }
}

async function runIntegrationTests() {
  try {
    // 환경변수 로딩
    const env = loadEnv();
    const baseUrl = `http://localhost:${env.REST_SERVER_PORT || 3000}`;
    
    logger.info('🎯 REST Service 통합 테스트 시작', { baseUrl });
    
    const tests = [
      { name: '헬스 체크', fn: () => testHealthCheck(baseUrl) },
      { name: '캐시 상태', fn: () => testCacheStatus(baseUrl) },
      { name: '캐릭터 API', fn: () => testCharacterAPI(baseUrl) },
      { name: '경매장 API', fn: () => testAuctionsAPI(baseUrl) },
      { name: '공지사항 API', fn: () => testNewsAPI(baseUrl) },
      { name: '게임 콘텐츠 API', fn: () => testGameContentsAPI(baseUrl) },
      { name: '시장 API', fn: () => testMarketsAPI(baseUrl) },
      { name: '캐시 최적화', fn: () => testCacheOptimization(baseUrl) },
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
      logger.info(`\n🧪 ${test.name} 테스트 실행 중...`);
      const result = await test.fn();
      
      if (result) {
        passedTests++;
        logger.info(`✅ ${test.name} 테스트 통과`);
      } else {
        logger.error(`❌ ${test.name} 테스트 실패`);
      }
    }
    
    logger.info('\n📊 테스트 결과 요약');
    logger.info(`총 테스트: ${totalTests}개`);
    logger.info(`통과: ${passedTests}개`);
    logger.info(`실패: ${totalTests - passedTests}개`);
    
    if (passedTests === totalTests) {
      logger.info('🎉 모든 테스트 통과!');
      return true;
    } else {
      logger.error('❌ 일부 테스트 실패');
      return false;
    }
    
  } catch (error) {
    logger.error('❌ 통합 테스트 실행 중 에러 발생', { error: error.message });
    return false;
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logger.error('❌ 테스트 실행 실패', { error: error.message });
      process.exit(1);
    });
}

export { runIntegrationTests };
