/**
 * @cursor-change: 2024-12-19, 1.0.0, 캐릭터 데이터 분석기
 *
 * 수집된 캐릭터 데이터를 분석하는 도구
 * - 캐시에서 수집된 데이터 읽기
 * - 스트리머별 캐릭터 통계 분석
 * - API 응답 품질 분석
 */

import path from 'path';
import {
  createTimestamp,
  getCurrentDir,
  loadJsonFilesFromDir,
  saveJsonFile,
} from '../../common/file-utils.mjs';
import { STREAMERS } from '../../common/streamer-list.mjs';

// === 설정 ===

const __dirname = getCurrentDir(import.meta.url);
const CACHE_DIR = path.join(__dirname, '../../../cache/character-data');

// === 분석 함수들 ===

/**
 * 캐시 디렉토리에서 수집된 파일들 읽기
 */
async function loadCollectedData() {
  try {
    const files = await loadJsonFilesFromDir(CACHE_DIR);
    return files.filter((file) => file.filename.startsWith('character-'));
  } catch (error) {
    console.error('캐시 데이터 로드 실패:', error.message);
    return [];
  }
}

/**
 * 스트리머별 통계 분석
 */
function analyzeStreamerStats(data) {
  const streamerStats = {};

  for (const item of data) {
    // metadata가 없는 경우 건너뛰기
    if (!item.metadata) {
      console.warn('⚠️  metadata가 없는 파일 발견:', item.filename);
      continue;
    }

    const { streamerName, characterName } = item.metadata;

    // character나 siblings 응답이 없는 경우 건너뛰기
    if (!item.character || !item.siblings) {
      console.warn('⚠️  응답 데이터가 없는 파일 발견:', item.filename);
      continue;
    }

    const characterStatus = item.character.status;
    const siblingsStatus = item.siblings.status;

    if (!streamerStats[streamerName]) {
      streamerStats[streamerName] = {
        streamer: streamerName,
        characters: [],
        totalCharacters: 0,
        apiSuccess: 0,
        apiFailed: 0,
      };
    }

    const stats = streamerStats[streamerName];

    // 메인 캐릭터 정보
    if (characterStatus === 200 && item.character.data) {
      const charData = item.character.data;
      stats.characters.push({
        name: characterName,
        level: charData.CharacterLevel || 0,
        class: charData.CharacterClassName || 'Unknown',
        itemLevel: charData.ItemMaxLevel || 0,
        server: charData.ServerName || 'Unknown',
        type: 'main',
      });
      stats.apiSuccess++;
    } else {
      stats.apiFailed++;
    }

    // 형제 캐릭터들
    if (siblingsStatus === 200 && item.siblings.data) {
      const siblings = Array.isArray(item.siblings.data) ? item.siblings.data : [];
      siblings.forEach((sibling) => {
        if (sibling.CharacterName && sibling.CharacterName !== characterName) {
          stats.characters.push({
            name: sibling.CharacterName,
            level: sibling.CharacterLevel || 0,
            class: sibling.CharacterClassName || 'Unknown',
            itemLevel: sibling.ItemMaxLevel || 0,
            server: sibling.ServerName || 'Unknown',
            type: 'sibling',
          });
        }
      });
    }

    stats.totalCharacters = stats.characters.length;
  }

  return Object.values(streamerStats);
}

/**
 * 클래스별 통계 분석
 */
function analyzeClassStats(streamerStats) {
  const classStats = {};

  for (const streamer of streamerStats) {
    for (const character of streamer.characters) {
      const className = character.class;

      if (!classStats[className]) {
        classStats[className] = {
          class: className,
          count: 0,
          streamers: new Set(),
          avgLevel: 0,
          avgItemLevel: 0,
          levels: [],
          itemLevels: [],
        };
      }

      const stats = classStats[className];
      stats.count++;
      stats.streamers.add(streamer.streamer);
      stats.levels.push(character.level);
      stats.itemLevels.push(character.itemLevel);
    }
  }

  // 평균 계산
  for (const className in classStats) {
    const stats = classStats[className];
    stats.avgLevel =
      stats.levels.length > 0
        ? (stats.levels.reduce((sum, level) => sum + level, 0) / stats.levels.length).toFixed(1)
        : 0;
    stats.avgItemLevel =
      stats.itemLevels.length > 0
        ? (stats.itemLevels.reduce((sum, ilvl) => sum + ilvl, 0) / stats.itemLevels.length).toFixed(
            1,
          )
        : 0;
    stats.streamers = Array.from(stats.streamers);
    delete stats.levels;
    delete stats.itemLevels;
  }

  return Object.values(classStats).sort((a, b) => b.count - a.count);
}

/**
 * API 품질 분석
 */
function analyzeApiQuality(data) {
  let totalRequests = 0;
  let successfulRequests = 0;
  let failedRequests = 0;

  for (const item of data) {
    if (item.character) {
      totalRequests++;
      if (item.character.status === 200) {
        successfulRequests++;
      } else {
        failedRequests++;
      }
    }

    if (item.siblings) {
      totalRequests++;
      if (item.siblings.status === 200) {
        successfulRequests++;
      } else {
        failedRequests++;
      }
    }
  }

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    successRate: totalRequests > 0 ? ((successfulRequests / totalRequests) * 100).toFixed(1) : 0,
  };
}

/**
 * 캐릭터 데이터 분석 메인 함수
 */
export async function analyzeCharacterData() {
  console.log('🔍 캐릭터 데이터 분석 시작');
  console.log('='.repeat(50));

  // 수집된 데이터 로드
  const data = await loadCollectedData();

  if (data.length === 0) {
    console.log('❌ 분석할 데이터가 없습니다.');
    return null;
  }

  console.log(`📊 분석 대상 파일: ${data.length}개`);

  // 스트리머별 통계 분석
  console.log('\n📈 스트리머별 통계 분석 중...');
  const streamerStats = analyzeStreamerStats(data);

  // 클래스별 통계 분석
  console.log('🎮 클래스별 통계 분석 중...');
  const classStats = analyzeClassStats(streamerStats);

  // API 품질 분석
  console.log('🔧 API 품질 분석 중...');
  const apiQuality = analyzeApiQuality(data);

  // 분석 결과 저장
  const analysisResult = {
    timestamp: createTimestamp(),
    summary: {
      totalStreamers: STREAMERS.length,
      analyzedFiles: data.length,
      totalCharacters: streamerStats.reduce((sum, s) => sum + s.totalCharacters, 0),
      uniqueClasses: classStats.length,
    },
    apiQuality,
    streamerStats,
    classStats,
  };

  const analysisFilename = `analysis-${createTimestamp()}.json`;
  const analysisFilepath = path.join(CACHE_DIR, analysisFilename);
  await saveJsonFile(analysisFilepath, analysisResult);

  // 결과 출력
  console.log('\n📋 분석 결과 요약:');
  console.log(`  - 분석된 파일: ${data.length}개`);
  console.log(`  - 총 캐릭터 수: ${analysisResult.summary.totalCharacters}개`);
  console.log(`  - 클래스 종류: ${classStats.length}개`);
  console.log(`  - API 성공률: ${apiQuality.successRate}%`);

  console.log('\n🏆 상위 클래스:');
  classStats.slice(0, 5).forEach((cls, index) => {
    console.log(`  ${index + 1}. ${cls.class}: ${cls.count}개 (평균 레벨: ${cls.avgLevel})`);
  });

  console.log('\n👥 스트리머별 캐릭터 수:');
  streamerStats
    .sort((a, b) => b.totalCharacters - a.totalCharacters)
    .slice(0, 5)
    .forEach((streamer, index) => {
      console.log(`  ${index + 1}. ${streamer.streamer}: ${streamer.totalCharacters}개`);
    });

  return analysisResult;
}

// === 실행 ===

if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeCharacterData()
    .then((results) => {
      if (results) {
        console.log('\n🎉 캐릭터 데이터 분석이 완료되었습니다!');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 치명적 오류 발생:', error);
      process.exit(1);
    });
}

export { analyzeCharacterData };
