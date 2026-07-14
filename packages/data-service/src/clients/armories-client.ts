/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES API 클라이언트 생성
 *
 * ARMORIES API 클라이언트
 * - 캐릭터 상세 정보 조회 (무기고)
 * - Rate Limit 관리 및 에러 처리
 * - 재시도 로직 및 로깅
 */

import { logger } from '@lostark/shared';
import {
  ARMORIES_ENDPOINTS,
  ArkPassiveV9,
  ArmoryAvatarsV9,
  ArmoryCardsV9,
  ArmoryCharacterV9,
  ArmoryCollectiblesV9,
  ArmoryColosseumsV9,
  ArmoryCombatSkillsV9,
  ArmoryEngravingV9,
  ArmoryEquipmentV9,
  ArmoryGemsV9,
  ArmoryProfileV9,
} from '@lostark/shared/types/V9/armories';

import { ApiClient } from './api-client.js';

// === ARMORIES API 클라이언트 ===

/**
 * ARMORIES API 클라이언트
 */
export class ArmoriesClient {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = new ApiClient();
  }

  /**
   * 캐릭터 전체 정보 조회
   */
  async getCharacter(characterName: string): Promise<ArmoryCharacterV9> {
    const endpoint = ARMORIES_ENDPOINTS.CHARACTER(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character armory data',
    );

    return await this.apiClient.get<ArmoryCharacterV9>(endpoint);
  }

  /**
   * 캐릭터 프로필 정보 조회
   */
  async getProfile(characterName: string): Promise<ArmoryProfileV9> {
    const endpoint = ARMORIES_ENDPOINTS.PROFILES(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character profile',
    );

    return await this.apiClient.get<ArmoryProfileV9>(endpoint);
  }

  /**
   * 캐릭터 아크 패시브 정보 조회.
   *
   * V9 에서 ArkPassive 는 profiles 응답에서 분리되어 전용 /arkpassive 엔드포인트로
   * 이동했다 (upstream changelog). 저티어/미개방 캐릭터는 null 을 반환할 수 있고,
   * 엔드포인트 자체가 실패해도 profile 조회를 막지 않도록 에러를 흡수해 null 로 강등한다.
   */
  async getArkPassive(characterName: string): Promise<ArkPassiveV9 | null> {
    const endpoint = ARMORIES_ENDPOINTS.ARK_PASSIVE(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character ark passive',
    );

    try {
      return await this.apiClient.get<ArkPassiveV9 | null>(endpoint);
    } catch (err) {
      logger.warn(
        { characterName, endpoint, err: String(err) },
        'ark passive fetch failed — degrading to null',
      );
      return null;
    }
  }

  /**
   * 캐릭터 장비 정보 조회
   */
  async getEquipment(characterName: string): Promise<ArmoryEquipmentV9[]> {
    const endpoint = ARMORIES_ENDPOINTS.EQUIPMENT(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character equipment',
    );

    return await this.apiClient.get<ArmoryEquipmentV9[]>(endpoint);
  }

  /**
   * 캐릭터 아바타 정보 조회
   */
  async getAvatars(characterName: string): Promise<ArmoryAvatarsV9> {
    const endpoint = ARMORIES_ENDPOINTS.AVATARS(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character avatars',
    );

    return await this.apiClient.get<ArmoryAvatarsV9>(endpoint);
  }

  /**
   * 캐릭터 전투 스킬 정보 조회
   */
  async getCombatSkills(characterName: string): Promise<ArmoryCombatSkillsV9> {
    const endpoint = ARMORIES_ENDPOINTS.COMBAT_SKILLS(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character combat skills',
    );

    return await this.apiClient.get<ArmoryCombatSkillsV9>(endpoint);
  }

  /**
   * 캐릭터 각인 정보 조회
   */
  async getEngravings(characterName: string): Promise<ArmoryEngravingV9> {
    const endpoint = ARMORIES_ENDPOINTS.ENGRAVINGS(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character engravings',
    );

    return await this.apiClient.get<ArmoryEngravingV9>(endpoint);
  }

  /**
   * 캐릭터 카드 정보 조회
   */
  async getCards(characterName: string): Promise<ArmoryCardsV9> {
    const endpoint = ARMORIES_ENDPOINTS.CARDS(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character cards',
    );

    return await this.apiClient.get<ArmoryCardsV9>(endpoint);
  }

  /**
   * 캐릭터 보석 정보 조회
   */
  async getGems(characterName: string): Promise<ArmoryGemsV9> {
    const endpoint = ARMORIES_ENDPOINTS.GEMS(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character gems',
    );

    return await this.apiClient.get<ArmoryGemsV9>(endpoint);
  }

  /**
   * 캐릭터 증명의 전장 정보 조회
   */
  async getColosseums(characterName: string): Promise<ArmoryColosseumsV9> {
    const endpoint = ARMORIES_ENDPOINTS.COLOSSEUMS(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character colosseums',
    );

    return await this.apiClient.get<ArmoryColosseumsV9>(endpoint);
  }

  /**
   * 캐릭터 수집품 정보 조회
   */
  async getCollectibles(characterName: string): Promise<ArmoryCollectiblesV9> {
    const endpoint = ARMORIES_ENDPOINTS.COLLECTIBLES(characterName);

    logger.debug(
      {
        characterName,
        endpoint,
      },
      'Fetching character collectibles',
    );

    return await this.apiClient.get<ArmoryCollectiblesV9>(endpoint);
  }

  /**
   * 캐릭터 정보 일괄 조회 (전체 정보)
   * 성능 최적화를 위해 전체 API 호출
   */
  async getCharacterFull(characterName: string): Promise<ArmoryCharacterV9> {
    logger.info(
      {
        characterName,
      },
      'Fetching full character armory data',
    );

    return await this.getCharacter(characterName);
  }

  /**
   * 캐릭터 정보 부분 조회 (특정 섹션만)
   * 필요한 정보만 선택적으로 조회
   */
  async getCharacterPartial(
    characterName: string,
    sections: Array<
      | 'profile'
      | 'equipment'
      | 'avatars'
      | 'combat-skills'
      | 'engravings'
      | 'cards'
      | 'gems'
      | 'colosseums'
      | 'collectibles'
    >,
  ): Promise<Partial<ArmoryCharacterV9>> {
    logger.info(
      {
        characterName,
        sections,
      },
      'Fetching partial character armory data',
    );

    const promises: Array<Promise<any>> = [];
    const result: Partial<ArmoryCharacterV9> = {};

    // 요청된 섹션별로 API 호출
    for (const section of sections) {
      switch (section) {
        case 'profile':
          promises.push(
            this.getProfile(characterName).then((data) => {
              result.ArmoryProfile = data;
            }),
          );
          // ArkPassive 는 profiles 에서 분리돼 전용 엔드포인트로 이동(V9). equipment 가
          // abilityStone 을 동반하듯, profile 조회 시 ArkPassive 를 함께 채운다.
          promises.push(
            this.getArkPassive(characterName).then((data) => {
              result.ArkPassive = data;
            }),
          );
          break;
        case 'equipment':
          promises.push(
            this.getEquipment(characterName).then((data) => {
              result.ArmoryEquipment = data;
            }),
          );
          break;
        case 'avatars':
          promises.push(
            this.getAvatars(characterName).then((data) => {
              result.ArmoryAvatar = data;
            }),
          );
          break;
        case 'combat-skills':
          promises.push(
            this.getCombatSkills(characterName).then((data) => {
              result.ArmorySkill = data;
            }),
          );
          break;
        case 'engravings':
          promises.push(
            this.getEngravings(characterName).then((data) => {
              result.ArmoryEngraving = data;
            }),
          );
          break;
        case 'cards':
          promises.push(
            this.getCards(characterName).then((data) => {
              result.ArmoryCard = data;
            }),
          );
          break;
        case 'gems':
          promises.push(
            this.getGems(characterName).then((data) => {
              result.ArmoryGem = data;
            }),
          );
          break;
        case 'colosseums':
          promises.push(
            this.getColosseums(characterName).then((data) => {
              result.ArmoryColosseum = data;
            }),
          );
          break;
        case 'collectibles':
          promises.push(
            this.getCollectibles(characterName).then((data) => {
              result.Collectibles = data;
            }),
          );
          break;
      }
    }

    // 모든 요청을 병렬로 처리
    await Promise.all(promises);

    return result;
  }
}

// === 싱글톤 인스턴스 ===

/**
 * ARMORIES API 클라이언트 인스턴스
 */
export const armoriesClient = new ArmoriesClient();
