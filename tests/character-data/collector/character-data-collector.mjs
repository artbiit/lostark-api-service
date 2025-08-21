/**
 * @cursor-change: 2024-12-19, 1.0.0, 캐릭터 데이터 수집기
 *
 * 스트리머들의 캐릭터 정보를 수집하고 분석할 준비를 위한 데이터 수집기
 * - API 응답 전체(성공/실패 포함)를 캐시에 저장
 * - 스트리머 목록 기반으로 대표 캐릭터와 형제 캐릭터들 수집
 */

import path from 'path';
import { getCharacterInfo, getCharacterSiblings } from '../../common/api-client.mjs';
import { loadEnv, validateRequiredEnvVars } from '../../common/env-loader.mjs';
import {
  createTimestamp,
  ensureCacheDir,
  getCurrentDir,
  saveJsonFile,
} from '../../common/file-utils.mjs';
import { STREAMERS } from '../../common/streamer-list.mjs';

// 환경변수 로드
loadEnv();
validateRequiredEnvVars();

// === 설정 ===

const __dirname = getCurrentDir(import.meta.url);
const CACHE_DIR = path.join(__dirname, '../../../cache/character-data');

// === 수집 함수들 ===

/**
 * 캐릭터 정보 수집
 */
async function collectCharacterInfo(streamerName, characterName) {
  console.log(`📊 ${streamerName} (${characterName}) 캐릭터 정보 수집 중...`);

  const timestamp = createTimestamp();
  const filename = `character-${characterName}-${timestamp}.json`;

  try {
    // 캐릭터 정보 조회
    const characterResponse = await getCharacterInfo(characterName);

    // 형제 캐릭터 조회
    const siblingsResponse = await getCharacterSiblings(characterName);

    const data = {
      metadata: {
        streamerName,
        characterName,
        endpoint: '/armories/characters',
        timestamp,
        filename,
      },
      character: characterResponse,
      siblings: siblingsResponse,
    };

    // 파일 저장
    const filepath = path.join(CACHE_DIR, filename);
    const saved = await saveJsonFile(filepath, data);

    if (saved) {
      console.log(`✅ ${characterName} 데이터 수집 완료`);
      return {
        success: true,
        characterName,
        filename,
        characterStatus: characterResponse.status,
        siblingsStatus: siblingsResponse.status,
      };
    } else {
      console.log(`❌ ${characterName} 파일 저장 실패`);
      return {
        success: false,
        characterName,
        error: 'FILE_SAVE_FAILED',
      };
    }
  } catch (error) {
    console.error(`❌ ${characterName} 수집 중 오류:`, error.message);
    return {
      success: false,
      characterName,
      error: error.message,
    };
  }
}

/**
 * 모든 스트리머 캐릭터 데이터 수집
 */
export async function collectCharacterData() {
  console.log('🚀 캐릭터 데이터 수집 시작');
  console.log('='.repeat(50));

  // 캐시 디렉토리 생성
  await ensureCacheDir(CACHE_DIR);

  const results = [];
  let successful = 0;
  let failed = 0;

  // 각 스트리머의 캐릭터 정보 수집
  for (const streamer of STREAMERS) {
    const result = await collectCharacterInfo(streamer.name, streamer.character);
    results.push(result);

    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // API 호출 간격 조절 (1초 대기)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 수집 요약 저장
  const summary = {
    timestamp: createTimestamp(),
    totalStreamers: STREAMERS.length,
    successful,
    failed,
    results,
  };

  const summaryFilename = `collection-summary-${createTimestamp()}.json`;
  const summaryFilepath = path.join(CACHE_DIR, summaryFilename);
  await saveJsonFile(summaryFilepath, summary);

  console.log('\n📋 수집 완료 요약:');
  console.log(`  - 총 스트리머: ${STREAMERS.length}`);
  console.log(`  - 성공: ${successful}`);
  console.log(`  - 실패: ${failed}`);
  console.log(`  - 성공률: ${((successful / STREAMERS.length) * 100).toFixed(1)}%`);

  return {
    totalStreamers: STREAMERS.length,
    successful,
    failed,
    results,
  };
}

// === 실행 ===

if (import.meta.url === `file://${process.argv[1]}`) {
  collectCharacterData()
    .then((results) => {
      console.log('\n🎉 캐릭터 데이터 수집이 완료되었습니다!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 치명적 오류 발생:', error);
      process.exit(1);
    });
}

export { collectCharacterData };
