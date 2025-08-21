#!/usr/bin/env node

/**
 * @cursor-change: 2025-01-15, 1.0.0, API 테스트 스크립트 생성
 * @cursor-change: 2025-01-15, 1.1.0, API 카테고리별 분리 및 선택적 테스트 기능 추가
 *
 * 로스트아크 공식 API를 호출하여 실제 데이터 구조를 확인
 * - 각 API별 응답 데이터 구조 파악
 * - 데이터 크기 측정
 * - 타입 정의를 위한 샘플 데이터 수집
 * - 카테고리별 선택적 테스트 지원
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

// API 카테고리별 정의
const API_CATEGORIES = {
  news: {
    name: 'NEWS API',
    description: '공지사항 및 이벤트 정보',
    apis: [
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
    ],
  },
  characters: {
    name: 'CHARACTERS API',
    description: '캐릭터 기본 정보',
    apis: [
      {
        name: '캐릭터 형제 정보 (스트리머)',
        endpoint: '/characters/이다/siblings',
        method: 'GET',
      },
    ],
  },
  armories: {
    name: 'ARMORIES API',
    description: '캐릭터 상세 정보 (무기고)',
    apis: [
      {
        name: '캐릭터 요약 정보',
        endpoint: '/armories/characters/이다',
        method: 'GET',
      },
      {
        name: '캐릭터 기본 능력치',
        endpoint: '/armories/characters/이다/profiles',
        method: 'GET',
      },
      {
        name: '캐릭터 장비 정보',
        endpoint: '/armories/characters/이다/equipment',
        method: 'GET',
      },
      {
        name: '캐릭터 각인 정보',
        endpoint: '/armories/characters/이다/engravings',
        method: 'GET',
      },
      {
        name: '캐릭터 보석 정보',
        endpoint: '/armories/characters/이다/gems',
        method: 'GET',
      },
      {
        name: '캐릭터 아바타 정보',
        endpoint: '/armories/characters/이다/avatars',
        method: 'GET',
      },
      {
        name: '캐릭터 전투 스킬',
        endpoint: '/armories/characters/이다/combat-skills',
        method: 'GET',
      },
      {
        name: '캐릭터 카드 정보',
        endpoint: '/armories/characters/이다/cards',
        method: 'GET',
      },
      {
        name: '캐릭터 증명의 전장 정보',
        endpoint: '/armories/characters/이다/colosseums',
        method: 'GET',
      },
      {
        name: '캐릭터 수집품 정보',
        endpoint: '/armories/characters/이다/collectibles',
        method: 'GET',
      },
    ],
  },
  auctions: {
    name: 'AUCTIONS API',
    description: '경매장 검색',
    apis: [
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
    ],
  },
  markets: {
    name: 'MARKETS API',
    description: '시장 정보',
    apis: [
      {
        name: '시장 검색 옵션',
        endpoint: '/markets/options',
        method: 'GET',
      },
      {
        name: '아이템 ID로 시장 정보 조회',
        endpoint: '/markets/items/66110223', // 10레벨 홍염 아이템 ID
        method: 'GET',
      },
      {
        name: '시장 아이템 검색',
        endpoint: '/markets/items',
        method: 'POST',
        body: {
          CategoryCode: 210000,
          ItemName: '10레벨 홍염',
          PageNo: 0,
        },
      },
    ],
  },
  gamecontents: {
    name: 'GAMECONTENTS API',
    description: '게임 콘텐츠 정보',
    apis: [
      {
        name: '도비스 던전 목록',
        endpoint: '/gamecontents/challenge-abyss-dungeons',
        method: 'GET',
      },
      {
        name: '도가토 목록',
        endpoint: '/gamecontents/challenge-guardian-raids',
        method: 'GET',
      },
      {
        name: '주간 콘텐츠 달력',
        endpoint: '/gamecontents/calendar',
        method: 'GET',
      },
    ],
  },
  guilds: {
    name: 'GUILDS API',
    description: '길드 정보',
    apis: [
      {
        name: '길드 순위',
        endpoint: '/guilds/rankings?serverName=루페온',
        method: 'GET',
      },
    ],
  },
};

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

// 사용법 출력 함수
function printUsage() {
  console.log('\n📋 사용법:');
  console.log('  node api.test.mjs [카테고리1] [카테고리2] ...');
  console.log('  node api.test.mjs all  # 모든 API 테스트');
  console.log('  node api.test.mjs      # 사용 가능한 카테고리 목록 출력');
  console.log('\n📁 사용 가능한 카테고리:');

  Object.entries(API_CATEGORIES).forEach(([key, category]) => {
    console.log(`  ${key.padEnd(15)} - ${category.name} (${category.apis.length}개 API)`);
  });

  console.log('\n💡 예시:');
  console.log('  node api.test.mjs news characters');
  console.log('  node api.test.mjs armories');
  console.log('  node api.test.mjs gamecontents guilds');
}

// 결과 저장 디렉토리
const resultsDir = join(projectRoot, 'cache', 'api-test-results');

async function main() {
  const args = process.argv.slice(2);

  // 인자가 없으면 사용법 출력
  if (args.length === 0) {
    printUsage();
    return;
  }

  // 테스트할 카테고리 결정
  let categoriesToTest = [];

  if (args.includes('all')) {
    categoriesToTest = Object.keys(API_CATEGORIES);
  } else {
    categoriesToTest = args.filter((category) => API_CATEGORIES[category]);

    // 유효하지 않은 카테고리 체크
    const invalidCategories = args.filter((category) => !API_CATEGORIES[category]);
    if (invalidCategories.length > 0) {
      console.error(`❌ 유효하지 않은 카테고리: ${invalidCategories.join(', ')}`);
      printUsage();
      return;
    }
  }

  if (categoriesToTest.length === 0) {
    console.error('❌ 테스트할 카테고리가 지정되지 않았습니다.');
    printUsage();
    return;
  }

  console.log('🚀 로스트아크 API 테스트 시작\n');
  console.log(
    `📋 테스트 대상: ${categoriesToTest.map((cat) => API_CATEGORIES[cat].name).join(', ')}\n`,
  );

  // 결과 디렉토리 생성
  await fs.mkdir(resultsDir, { recursive: true });

  const results = [];
  let totalAPIs = 0;

  // 선택된 카테고리별로 테스트 실행
  for (const categoryKey of categoriesToTest) {
    const category = API_CATEGORIES[categoryKey];
    console.log(`\n📁 ${category.name} - ${category.description}`);
    console.log('─'.repeat(60));

    for (const api of category.apis) {
      console.log(`\n📋 ${api.name}`);
      console.log('─'.repeat(50));

      const result = await callAPI(api.endpoint, api.method, api.body);

      if (result) {
        results.push({
          category: categoryKey,
          name: api.name,
          endpoint: api.endpoint,
          method: api.method,
          ...result,
        });

        // 결과를 파일로 저장
        const filename = `${api.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.json`;
        const filepath = join(resultsDir, filename);

        await fs.writeFile(filepath, JSON.stringify(result.data, null, 2), 'utf8');
        console.log(`💾 결과 저장: ${filename}`);

        // Rate Limit 확인
        if (parseInt(result.rateLimit.remaining) < 10) {
          console.log('⚠️  Rate Limit이 거의 소진되었습니다. 잠시 대기...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      totalAPIs++;

      // API 호출 간 간격
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // 전체 결과 요약
  console.log('\n📊 테스트 결과 요약');
  console.log('─'.repeat(60));

  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  const avgSize = totalSize / results.length;

  console.log(`총 API 호출: ${results.length}개`);
  console.log(`총 데이터 크기: ${(totalSize / 1024).toFixed(2)}KB`);
  console.log(`평균 응답 크기: ${(avgSize / 1024).toFixed(2)}KB`);

  // 카테고리별 요약
  console.log('\n📈 카테고리별 요약:');
  const categorySummary = {};
  results.forEach((result) => {
    if (!categorySummary[result.category]) {
      categorySummary[result.category] = { count: 0, size: 0 };
    }
    categorySummary[result.category].count++;
    categorySummary[result.category].size += result.size;
  });

  Object.entries(categorySummary).forEach(([category, summary]) => {
    const categoryName = API_CATEGORIES[category].name;
    console.log(`  ${categoryName}: ${summary.count}개 API, ${(summary.size / 1024).toFixed(2)}KB`);
  });

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
