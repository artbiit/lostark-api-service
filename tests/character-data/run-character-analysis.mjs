/**
 * @cursor-change: 2024-12-19, 1.0.0, 캐릭터 데이터 수집 및 분석 실행 스크립트
 *
 * 캐릭터 데이터 수집과 분석을 순차적으로 실행하는 통합 스크립트
 */

import { analyzeCharacterData } from './analyzer/character-data-analyzer.mjs';
import { collectCharacterData } from './collector/character-data-collector.mjs';

/**
 * 메인 실행 함수
 */
async function runCharacterAnalysis() {
  console.log('🚀 캐릭터 데이터 수집 및 분석 시작');
  console.log('='.repeat(60));

  try {
    // 1단계: 데이터 수집
    console.log('\n📊 1단계: 캐릭터 데이터 수집');
    console.log('-'.repeat(40));

    const collectionResults = await collectCharacterData();

    if (!collectionResults) {
      console.log('❌ 데이터 수집이 실패했습니다.');
      return;
    }

    console.log(
      `\n✅ 데이터 수집 완료: ${collectionResults.successful}/${collectionResults.totalStreamers} 성공`,
    );

    // 2단계: 데이터 분석
    console.log('\n🔍 2단계: 수집된 데이터 분석');
    console.log('-'.repeat(40));

    const analysisResults = await analyzeCharacterData();

    if (!analysisResults) {
      console.log('❌ 데이터 분석이 실패했습니다.');
      return;
    }

    // 3단계: 최종 요약
    console.log('\n📋 3단계: 최종 요약');
    console.log('-'.repeat(40));

    console.log('🎯 수집 결과:');
    console.log(`  - 총 스트리머: ${collectionResults.totalStreamers}`);
    console.log(`  - 성공: ${collectionResults.successful}`);
    console.log(`  - 실패: ${collectionResults.failed}`);

    console.log('\n📊 분석 결과:');
    console.log(`  - API 성공률: ${analysisResults.apiQuality.successRate}%`);
    console.log(`  - 총 캐릭터 수: ${analysisResults.summary.totalCharacters}`);
    console.log(`  - 클래스 종류: ${analysisResults.summary.uniqueClasses}개`);

    console.log('\n✅ 캐릭터 데이터 수집 및 분석이 완료되었습니다!');
    console.log('\n📁 저장된 파일들:');
    console.log(`  - 캐시 디렉토리: cache/character-data/`);
    console.log(`  - 수집 요약: collection-summary-*.json`);
    console.log(`  - 분석 결과: analysis-*.json`);
  } catch (error) {
    console.error('\n❌ 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

// === 실행 ===

if (import.meta.url === `file://${process.argv[1]}`) {
  runCharacterAnalysis()
    .then(() => {
      console.log('\n🎉 모든 작업이 성공적으로 완료되었습니다!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 치명적 오류 발생:', error);
      process.exit(1);
    });
}

export { runCharacterAnalysis };
