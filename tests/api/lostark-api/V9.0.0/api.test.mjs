#!/usr/bin/env node

/**
 * @cursor-change: 2025-01-15, 1.0.0, API 테스트 스크립트 생성
 *
 * 로스트아크 공식 API를 호출하여 실제 데이터 구조를 확인
 * - 각 API별 응답 데이터 구조 파악
 * - 데이터 크기 측정
 * - 타입 정의를 위한 샘플 데이터 수집
 */

import fs from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// 환경변수 직접 로드
const envPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../.env');
let envContent = '';

try {
  envContent = await fs.readFile(envPath, 'utf8');
} catch (error) {
  console.error('❌ .env 파일을 읽을 수 없습니다.');
  process.exit(1);
}

// 환경변수 파싱
const env = {};
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#') && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

// 환경변수를 process.env에 설정
Object.assign(process.env, env);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../../');

// API 설정
const API_BASE_URL = 'https://developer-lostark.game.onstove.com';
const API_KEY = process.env.LOSTARK_API_KEY;

if (!API_KEY) {
  console.error('❌ LOSTARK_API_KEY가 설정되지 않았습니다.');
  console.error('   .env 파일에 API 키를 설정해주세요.');
  process.exit(1);
}

// API 호출 함수
async function callAPI(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  try {
    console.log(`🔍 ${method} ${endpoint}`);

    const response = await fetch(url, options);
    const responseText = await response.text();

    // Rate Limit 정보 출력
    const rateLimit = {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset'),
    };

    console.log(`📊 Rate Limit: ${rateLimit.remaining}/${rateLimit.limit}`);

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${responseText}`);
      return null;
    }

    const data = JSON.parse(responseText);
    const dataSize = Buffer.byteLength(responseText, 'utf8');

    console.log(`✅ 응답 크기: ${(dataSize / 1024).toFixed(2)}KB`);

    return {
      data,
      size: dataSize,
      rateLimit,
    };
  } catch (error) {
    console.error(`❌ API 호출 실패: ${error.message}`);
    return null;
  }
}

// 테스트할 API 목록
const apiTests = [
  // NEWS API
  {
    name: '공지사항 목록',
    endpoint: '/news/notices',
    method: 'GET',
  },
  {
    name: '이벤트 목록',
    endpoint: '/news/events',
    method: 'GET',
  },

  // CHARACTERS API
  {
    name: '캐릭터 형제 정보 (테스트용)',
    endpoint: '/characters/테스트캐릭터/siblings',
    method: 'GET',
  },

  // ARMORIES API (가장 중요한 API들)
  {
    name: '캐릭터 요약 정보',
    endpoint: '/armories/characters/테스트캐릭터',
    method: 'GET',
  },
  {
    name: '캐릭터 기본 능력치',
    endpoint: '/armories/characters/테스트캐릭터/profiles',
    method: 'GET',
  },
  {
    name: '캐릭터 장비 정보',
    endpoint: '/armories/characters/테스트캐릭터/equipment',
    method: 'GET',
  },
  {
    name: '캐릭터 각인 정보',
    endpoint: '/armories/characters/테스트캐릭터/engravings',
    method: 'GET',
  },
  {
    name: '캐릭터 보석 정보',
    endpoint: '/armories/characters/테스트캐릭터/gems',
    method: 'GET',
  },

  // AUCTIONS API
  {
    name: '경매장 검색 옵션',
    endpoint: '/auctions/options',
    method: 'GET',
  },
  {
    name: '경매장 아이템 검색',
    endpoint: '/auctions/items',
    method: 'POST',
    body: {
      CategoryCode: 210000,
      Sort: 'BUY_PRICE',
      SortCondition: 'ASC',
      ItemName: '10레벨 홍염',
      PageNo: 0,
    },
  },

  // GAMECONTENTS API
  {
    name: '주간 콘텐츠 달력',
    endpoint: '/gamecontents/calendar',
    method: 'GET',
  },
];

// 결과 저장 디렉토리
const resultsDir = join(projectRoot, 'cache', 'api-test-results');

async function main() {
  console.log('🚀 로스트아크 API 테스트 시작\n');

  // 결과 디렉토리 생성
  await fs.mkdir(resultsDir, { recursive: true });

  const results = [];

  for (const test of apiTests) {
    console.log(`\n📋 ${test.name}`);
    console.log('─'.repeat(50));

    const result = await callAPI(test.endpoint, test.method, test.body);

    if (result) {
      results.push({
        name: test.name,
        endpoint: test.endpoint,
        method: test.method,
        ...result,
      });

      // 결과를 파일로 저장
      const filename = `${test.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.json`;
      const filepath = join(resultsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(result.data, null, 2), 'utf8');
      console.log(`💾 결과 저장: ${filename}`);

      // Rate Limit 확인
      if (parseInt(result.rateLimit.remaining) < 10) {
        console.log('⚠️  Rate Limit이 거의 소진되었습니다. 잠시 대기...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // API 호출 간 간격
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // 전체 결과 요약
  console.log('\n📊 테스트 결과 요약');
  console.log('─'.repeat(50));

  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const avgSize = totalSize / results.length;

  console.log(`총 API 호출: ${results.length}개`);
  console.log(`총 데이터 크기: ${(totalSize / 1024).toFixed(2)}KB`);
  console.log(`평균 응답 크기: ${(avgSize / 1024).toFixed(2)}KB`);

  // 크기별 분류
  const smallAPIs = results.filter((r) => r.size < 10 * 1024);
  const mediumAPIs = results.filter((r) => r.size >= 10 * 1024 && r.size < 100 * 1024);
  const largeAPIs = results.filter((r) => r.size >= 100 * 1024);

  console.log(`\n📈 크기별 분류:`);
  console.log(`  작은 데이터 (<10KB): ${smallAPIs.length}개`);
  console.log(`  중간 데이터 (10-100KB): ${mediumAPIs.length}개`);
  console.log(`  큰 데이터 (>100KB): ${largeAPIs.length}개`);

  console.log(`\n💾 결과 파일 위치: ${resultsDir}`);
  console.log('\n✅ API 테스트 완료!');
}

main().catch(console.error);
