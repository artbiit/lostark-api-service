#!/usr/bin/env node

/**
 * @cursor-change: 2025-01-15, 1.0.0, Lost Ark API 디버깅 테스트
 *
 * API 응답을 자세히 확인하여 문제를 진단
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
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
    throw new Error('.env 파일이 존재하지 않습니다.');
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

async function debugApiRequest() {
  console.log('🔍 Lost Ark API 디버깅 시작\n');

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
    process.exit(1);
  }

  console.log('📋 API 키 정보:');
  console.log(`  - 키 길이: ${API_KEY.length}자`);
  console.log(`  - 키 시작: ${API_KEY.substring(0, 10)}...`);
  console.log(`  - 키 끝: ...${API_KEY.substring(API_KEY.length - 10)}`);

  // 1. 기본 엔드포인트 테스트
  console.log('\n🔍 1. 기본 엔드포인트 테스트');

  const endpoints = [
    { name: '공지사항', path: '/news/notices' },
    { name: '이벤트', path: '/news/events' },
    { name: '캐릭터 siblings', path: '/characters/이다/siblings' },
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📡 ${endpoint.name} 테스트 중...`);

    try {
      const url = `https://developer-lostark.game.onstove.com${endpoint.path}`;
      console.log(`  - URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`  - Status: ${response.status} ${response.statusText}`);
      console.log(`  - Headers:`, Object.fromEntries(response.headers.entries()));

      const text = await response.text();
      console.log(`  - Response Length: ${text.length}자`);
      console.log(`  - Response Preview: ${text.substring(0, 200)}...`);

      if (response.ok) {
        try {
          const json = JSON.parse(text);
          console.log(`  - JSON Parse: 성공`);
          console.log(`  - Data Type: ${Array.isArray(json) ? 'Array' : typeof json}`);
          if (Array.isArray(json)) {
            console.log(`  - Array Length: ${json.length}`);
          }
        } catch (parseError) {
          console.log(`  - JSON Parse: 실패 - ${parseError.message}`);
        }
      }
    } catch (error) {
      console.error(`  - Error: ${error.message}`);
    }
  }

  // 2. API 문서 확인
  console.log('\n🔍 2. API 문서 확인');
  console.log('https://developer-lostark.game.onstove.com/ 에서 올바른 엔드포인트를 확인하세요.');
  console.log('현재 사용 중인 엔드포인트:');
  console.log('  - /news/notices');
  console.log('  - /news/events');
  console.log('  - /armories/characters/{characterName}/siblings');
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  debugApiRequest().catch(console.error);
}
