#!/usr/bin/env node

/**
 * @cursor-change: 2025-01-15, 1.0.0, Lost Ark API siblings 테스트
 *
 * 실제 Lost Ark API를 호출하여 스트리머 캐릭터들의 siblings 데이터를 수집
 * - Rate Limit 고려 (100/min)
 * - 에러 처리 및 재시도 로직
 * - 결과를 cache/api-test-results/에 저장
 */

import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../../../../lostark-remote-kakao');

// .env 파일 읽기 함수
async function loadEnvFile() {
  // 현재 작업 디렉토리에서 .env 파일 찾기
  const envPath = '.env';

  if (!existsSync(envPath)) {
    throw new Error(
      '.env 파일이 존재하지 않습니다. .env.example을 복사하여 .env 파일을 생성하세요.',
    );
  }

  const envContent = await readFile(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

// Lost Ark API 설정
const LOSTARK_API_BASE = 'https://developer-lostark.game.onstove.com';

// 스트리머 캐릭터 목록 (streamer-list.md에서 가져옴)
const STREAMER_CHARACTERS = [
  '이다',
  '쫀지',
  '노돌리',
  '박서림',
  '로마러',
  '성대',
  '짱여니',
  '선짱',
  '도읍지',
  '게임하는인기',
];

// Rate Limit 관리
let requestCount = 0;
const RATE_LIMIT = 100; // 100 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function makeApiRequest(endpoint, apiKey) {
  if (!apiKey) {
    throw new Error('LOSTARK_API_KEY가 설정되지 않았습니다.');
  }

  const url = `${LOSTARK_API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API 요청 중 오류 발생: ${error.message}`);
    throw error;
  }
}

async function getCharacterSiblings(characterName, apiKey) {
  const endpoint = `/characters/${encodeURIComponent(characterName)}/siblings`;
  console.log(`📡 ${characterName} 캐릭터 siblings 조회 중...`);

  try {
    const data = await makeApiRequest(endpoint, apiKey);
    console.log(`✅ ${characterName}: ${data.length}개 캐릭터 발견`);
    return data;
  } catch (error) {
    console.error(`❌ ${characterName} 조회 실패: ${error.message}`);
    return null;
  }
}

async function testAllStreamers() {
  console.log('🚀 Lost Ark API 실제 테스트 시작\n');

  // .env 파일에서 API 키 로드
  let envVars;
  try {
    envVars = await loadEnvFile();
  } catch (error) {
    console.error(`❌ 환경변수 로드 실패: ${error.message}`);
    process.exit(1);
  }

  const API_KEY = envVars.LOSTARK_API_KEY;

  if (!API_KEY || API_KEY === 'your_lostark_api_key_here') {
    console.error('❌ .env 파일에서 LOSTARK_API_KEY가 설정되지 않았습니다.');
    console.log('1. .env 파일을 열어서 LOSTARK_API_KEY 값을 설정하세요.');
    console.log('2. https://developer-lostark.game.onstove.com/에서 API 키를 발급받으세요.');
    process.exit(1);
  }

  console.log('🔍 API 키 유효성 검증 중...');

  try {
    // 간단한 API 호출로 키 유효성 검증
    await makeApiRequest('/news/notices', API_KEY);
    console.log('✅ API 키가 유효합니다.\n');
  } catch (error) {
    console.error('❌ API 키가 유효하지 않습니다. 다시 확인해주세요.');
    process.exit(1);
  }

  const results = {};
  let successCount = 0;
  let failCount = 0;

  for (const characterName of STREAMER_CHARACTERS) {
    try {
      // Rate Limit 고려하여 요청 간격 조절
      if (requestCount > 0 && requestCount % 10 === 0) {
        console.log('⏳ Rate Limit 고려하여 6초 대기...');
        await sleep(6000); // 10개 요청마다 6초 대기
      }

      const siblings = await getCharacterSiblings(characterName, API_KEY);
      requestCount++;

      if (siblings !== null) {
        results[characterName] = siblings;
        successCount++;
      } else {
        failCount++;
      }

      // 요청 간 1초 대기
      await sleep(1000);
    } catch (error) {
      console.error(`❌ ${characterName} 처리 중 오류: ${error.message}`);
      failCount++;
    }
  }

  // 결과 저장
  const outputDir = 'cache/api-test-results';
  await mkdir(outputDir, { recursive: true });

  const outputFile = join(outputDir, '캐릭터_형제_정보__실제_API_테스트.json');
  await writeFile(outputFile, JSON.stringify(results, null, 2), 'utf8');

  console.log('\n📊 테스트 결과 요약:');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📁 결과 저장: ${outputFile}`);

  // 성공한 데이터만으로 새로운 siblings.json 생성
  if (Object.keys(results).length > 0) {
    const sampleDataFile = 'Docs/lostark-api/V9.0.0/sample-data/characters/siblings.json';
    await writeFile(sampleDataFile, JSON.stringify(results, null, 2), 'utf8');
    console.log(`📁 샘플 데이터 업데이트: ${sampleDataFile}`);

    console.log('\n📋 수집된 데이터:');
    Object.entries(results).forEach(([character, siblings]) => {
      console.log(`  - ${character}: ${siblings.length}개 캐릭터`);
    });
  }

  return results;
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllStreamers().catch(console.error);
}
