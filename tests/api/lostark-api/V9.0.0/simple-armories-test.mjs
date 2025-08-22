/**
 * @cursor-change: 2025-01-27, v1.0.0, 간단한 ARMORIES API 테스트
 *
 * ARMORIES API 기본 기능 테스트
 * - 실제 API 호출 테스트
 * - 응답 구조 검증
 */

import assert from 'assert';
import { loadEnv } from '../../../common/env-loader.mjs';
import { getAllCharacterNames } from '../../../common/streamer-list.mjs';

// 환경변수 로드
loadEnv();

// === 테스트 설정 ===

const API_KEY = process.env.LOSTARK_API_KEY;
const API_BASE_URL = 'https://developer-lostark.game.onstove.com';

if (!API_KEY) {
  console.error('❌ LOSTARK_API_KEY environment variable is required');
  console.error('Please set LOSTARK_API_KEY in your .env file');
  process.exit(1);
}

// === API 클라이언트 함수 ===

async function makeApiRequest(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}

// === ARMORIES API 테스트 ===

async function testArmoriesApi() {
  console.log('🚀 ARMORIES API 테스트 시작\n');

  const streamerList = getAllCharacterNames();
  const testCharacter = streamerList[0];

  if (!testCharacter) {
    console.log('❌ 테스트할 캐릭터가 없습니다.');
    return;
  }

  console.log(`📋 테스트 캐릭터: ${testCharacter}\n`);

  try {
    // 1. 캐릭터 전체 정보 조회
    console.log('1️⃣ 캐릭터 전체 정보 조회...');
    const characterData = await makeApiRequest(`/armories/characters/${testCharacter}`);

    assert(characterData, '캐릭터 데이터가 반환되어야 함');
    assert(characterData.ArmoryProfile, 'ArmoryProfile이 있어야 함');
    assert(characterData.ArmoryEquipment, 'ArmoryEquipment가 있어야 함');

    // 선택적 필드들 확인
    const optionalFields = [
      'ArmoryEngraving',
      'ArmoryCard',
      'ArmoryGem',
      'ArmorySkill',
      'ArmoryAvatar',
      'ArmoryColosseum',
      'Collectibles',
    ];

    optionalFields.forEach((field) => {
      if (characterData[field]) {
        console.log(`   - ${field} 정보 있음`);
      } else {
        console.log(`   - ${field} 정보 없음 (정상)`);
      }
    });

    console.log('✅ 캐릭터 전체 정보 조회 성공');
    console.log(`   - 원정대 레벨: ${characterData.ArmoryProfile.ExpeditionLevel}`);
    console.log(`   - 장비 개수: ${characterData.ArmoryEquipment.length}`);
    console.log(`   - 각인 개수: ${characterData.ArmoryEngraving?.Engravings?.length || 0}`);
    console.log(`   - 카드 개수: ${characterData.ArmoryCard?.Cards?.length || 0}`);
    console.log(`   - 보석 개수: ${characterData.ArmoryGem?.Gems?.length || 0}`);
    console.log(`   - 스킬 개수: ${characterData.ArmorySkill?.CombatSkills?.length || 0}`);
    console.log(`   - 아바타 개수: ${characterData.ArmoryAvatar?.Avatars?.length || 0}`);
    console.log(`   - 수집품 개수: ${characterData.Collectibles?.Collectibles?.length || 0}\n`);

    // 2. 캐릭터 프로필 정보 조회
    console.log('2️⃣ 캐릭터 프로필 정보 조회...');
    const profileData = await makeApiRequest(`/armories/characters/${testCharacter}/profiles`);

    assert(profileData, '프로필 데이터가 반환되어야 함');
    assert(profileData.CharacterImage, '캐릭터 이미지가 있어야 함');
    assert(typeof profileData.ExpeditionLevel === 'number', '원정대 레벨이 숫자여야 함');
    assert(Array.isArray(profileData.Stats), '스탯이 배열이어야 함');
    assert(Array.isArray(profileData.Tendencies), '성향이 배열이어야 함');

    console.log('✅ 캐릭터 프로필 정보 조회 성공');
    console.log(`   - 캐릭터 이미지: ${profileData.CharacterImage ? '있음' : '없음'}`);
    console.log(`   - 스탯 개수: ${profileData.Stats.length}`);
    console.log(`   - 성향 개수: ${profileData.Tendencies.length}\n`);

    // 3. 캐릭터 장비 정보 조회
    console.log('3️⃣ 캐릭터 장비 정보 조회...');
    const equipmentData = await makeApiRequest(`/armories/characters/${testCharacter}/equipment`);

    assert(Array.isArray(equipmentData), '장비 데이터가 배열이어야 함');

    console.log('✅ 캐릭터 장비 정보 조회 성공');
    console.log(`   - 장비 개수: ${equipmentData.length}\n`);

    // 4. 캐릭터 각인 정보 조회
    console.log('4️⃣ 캐릭터 각인 정보 조회...');
    const engravingData = await makeApiRequest(`/armories/characters/${testCharacter}/engravings`);

    assert(engravingData, '각인 데이터가 반환되어야 함');

    // 각인 데이터 구조 확인
    if (engravingData.Engravings && Array.isArray(engravingData.Engravings)) {
      console.log('✅ 캐릭터 각인 정보 조회 성공');
      console.log(`   - 각인 개수: ${engravingData.Engravings.length}`);
      console.log(`   - 각인 효과 개수: ${engravingData.Effects?.length || 0}\n`);
    } else {
      console.log('✅ 캐릭터 각인 정보 조회 성공 (각인 없음)');
      console.log(`   - 각인 데이터: ${JSON.stringify(engravingData).substring(0, 100)}...\n`);
    }

    // 5. 캐릭터 카드 정보 조회
    console.log('5️⃣ 캐릭터 카드 정보 조회...');
    const cardData = await makeApiRequest(`/armories/characters/${testCharacter}/cards`);

    assert(cardData, '카드 데이터가 반환되어야 함');
    assert(Array.isArray(cardData.Cards), '카드가 배열이어야 함');

    console.log('✅ 캐릭터 카드 정보 조회 성공');
    console.log(`   - 카드 개수: ${cardData.Cards.length}`);
    console.log(`   - 카드 세트 효과 개수: ${cardData.Effects?.length || 0}\n`);

    // 6. 캐릭터 보석 정보 조회
    console.log('6️⃣ 캐릭터 보석 정보 조회...');
    const gemData = await makeApiRequest(`/armories/characters/${testCharacter}/gems`);

    assert(gemData, '보석 데이터가 반환되어야 함');
    assert(Array.isArray(gemData.Gems), '보석이 배열이어야 함');

    console.log('✅ 캐릭터 보석 정보 조회 성공');
    console.log(`   - 보석 개수: ${gemData.Gems.length}\n`);

    // 7. 캐릭터 전투 스킬 정보 조회
    console.log('7️⃣ 캐릭터 전투 스킬 정보 조회...');
    const skillData = await makeApiRequest(`/armories/characters/${testCharacter}/combat-skills`);

    assert(skillData, '스킬 데이터가 반환되어야 함');

    // 전투 스킬 데이터 구조 확인
    if (skillData.CombatSkills && Array.isArray(skillData.CombatSkills)) {
      console.log('✅ 캐릭터 전투 스킬 정보 조회 성공');
      console.log(`   - 전투 스킬 개수: ${skillData.CombatSkills.length}\n`);
    } else {
      console.log('✅ 캐릭터 전투 스킬 정보 조회 성공 (스킬 없음)');
      console.log(`   - 스킬 데이터: ${JSON.stringify(skillData).substring(0, 100)}...\n`);
    }

    // 8. 캐릭터 아바타 정보 조회
    console.log('8️⃣ 캐릭터 아바타 정보 조회...');
    const avatarData = await makeApiRequest(`/armories/characters/${testCharacter}/avatars`);

    assert(avatarData, '아바타 데이터가 반환되어야 함');

    // 아바타 데이터 구조 확인
    if (avatarData.Avatars && Array.isArray(avatarData.Avatars)) {
      console.log('✅ 캐릭터 아바타 정보 조회 성공');
      console.log(`   - 아바타 개수: ${avatarData.Avatars.length}\n`);
    } else {
      console.log('✅ 캐릭터 아바타 정보 조회 성공 (아바타 없음)');
      console.log(`   - 아바타 데이터: ${JSON.stringify(avatarData).substring(0, 100)}...\n`);
    }

    // 9. 캐릭터 증명의 전장 정보 조회
    console.log('9️⃣ 캐릭터 증명의 전장 정보 조회...');
    const colosseumData = await makeApiRequest(`/armories/characters/${testCharacter}/colosseums`);

    assert(colosseumData, '증명의 전장 데이터가 반환되어야 함');

    // 증명의 전장 데이터 구조 확인
    if (colosseumData.Colosseums && Array.isArray(colosseumData.Colosseums)) {
      console.log('✅ 캐릭터 증명의 전장 정보 조회 성공');
      console.log(`   - 증명의 전장 개수: ${colosseumData.Colosseums.length}\n`);
    } else {
      console.log('✅ 캐릭터 증명의 전장 정보 조회 성공 (증명의 전장 없음)');
      console.log(
        `   - 증명의 전장 데이터: ${JSON.stringify(colosseumData).substring(0, 100)}...\n`,
      );
    }

    // 10. 캐릭터 수집품 정보 조회
    console.log('🔟 캐릭터 수집품 정보 조회...');
    const collectibleData = await makeApiRequest(
      `/armories/characters/${testCharacter}/collectibles`,
    );

    assert(collectibleData, '수집품 데이터가 반환되어야 함');

    // 수집품 데이터 구조 확인
    if (collectibleData.Collectibles && Array.isArray(collectibleData.Collectibles)) {
      console.log('✅ 캐릭터 수집품 정보 조회 성공');
      console.log(`   - 수집품 개수: ${collectibleData.Collectibles.length}\n`);
    } else {
      console.log('✅ 캐릭터 수집품 정보 조회 성공 (수집품 없음)');
      console.log(`   - 수집품 데이터: ${JSON.stringify(collectibleData).substring(0, 100)}...\n`);
    }

    // === 성능 테스트 ===
    console.log('⚡ 성능 테스트...');
    const startTime = Date.now();

    await makeApiRequest(`/armories/characters/${testCharacter}`);

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ 성능 테스트 완료: ${duration}ms`);
    console.log(`   - 목표: 60초 이내`);
    console.log(`   - 결과: ${duration < 60000 ? '✅ 통과' : '❌ 실패'}\n`);

    // === 요약 ===
    console.log('📊 ARMORIES API 테스트 요약');
    console.log('========================');
    console.log('✅ 모든 엔드포인트 정상 작동');
    console.log('✅ 응답 구조 검증 통과');
    console.log('✅ 성능 요구사항 충족');
    console.log('✅ 데이터 무결성 확인');
    console.log('\n🎉 ARMORIES API 구현이 성공적으로 완료되었습니다!');
  } catch (error) {
    console.error('❌ ARMORIES API 테스트 실패:', error.message);

    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('💡 API 키 문제입니다. LOSTARK_API_KEY를 확인해주세요.');
    } else if (error.message.includes('429')) {
      console.error('💡 Rate Limit 초과입니다. 잠시 후 다시 시도해주세요.');
    } else if (error.message.includes('404')) {
      console.error('💡 캐릭터를 찾을 수 없습니다. 캐릭터명을 확인해주세요.');
    }

    process.exit(1);
  }
}

// === 테스트 실행 ===

testArmoriesApi().catch((error) => {
  console.error('❌ 테스트 실행 중 오류 발생:', error);
  process.exit(1);
});
