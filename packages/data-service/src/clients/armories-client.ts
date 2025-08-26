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
} from '@lostark/shared/types/V9/armories.js';

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

    logger.debug('Fetching character armory data', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryCharacterV9>(endpoint);
  }

  /**
   * 캐릭터 프로필 정보 조회
   */
  async getProfile(characterName: string): Promise<ArmoryProfileV9> {
    const endpoint = ARMORIES_ENDPOINTS.PROFILES(characterName);

    logger.debug('Fetching character profile', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryProfileV9>(endpoint);
  }

  /**
   * 캐릭터 장비 정보 조회
   */
  async getEquipment(characterName: string): Promise<ArmoryEquipmentV9[]> {
    const endpoint = ARMORIES_ENDPOINTS.EQUIPMENT(characterName);

    logger.debug('Fetching character equipment', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryEquipmentV9[]>(endpoint);
  }

  /**
   * 캐릭터 아바타 정보 조회
   */
  async getAvatars(characterName: string): Promise<ArmoryAvatarsV9> {
    const endpoint = ARMORIES_ENDPOINTS.AVATARS(characterName);

    logger.debug('Fetching character avatars', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryAvatarsV9>(endpoint);
  }

  /**
   * 캐릭터 전투 스킬 정보 조회
   */
  async getCombatSkills(characterName: string): Promise<ArmoryCombatSkillsV9> {
    const endpoint = ARMORIES_ENDPOINTS.COMBAT_SKILLS(characterName);

    logger.debug('Fetching character combat skills', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryCombatSkillsV9>(endpoint);
  }

  /**
   * 캐릭터 각인 정보 조회
   */
  async getEngravings(characterName: string): Promise<ArmoryEngravingV9> {
    const endpoint = ARMORIES_ENDPOINTS.ENGRAVINGS(characterName);

    logger.debug('Fetching character engravings', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryEngravingV9>(endpoint);
  }

  /**
   * 캐릭터 카드 정보 조회
   */
  async getCards(characterName: string): Promise<ArmoryCardsV9> {
    const endpoint = ARMORIES_ENDPOINTS.CARDS(characterName);

    logger.debug('Fetching character cards', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryCardsV9>(endpoint);
  }

  /**
   * 캐릭터 보석 정보 조회
   */
  async getGems(characterName: string): Promise<ArmoryGemsV9> {
    const endpoint = ARMORIES_ENDPOINTS.GEMS(characterName);

    logger.debug('Fetching character gems', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryGemsV9>(endpoint);
  }

  /**
   * 캐릭터 증명의 전장 정보 조회
   */
  async getColosseums(characterName: string): Promise<ArmoryColosseumsV9> {
    const endpoint = ARMORIES_ENDPOINTS.COLOSSEUMS(characterName);

    logger.debug('Fetching character colosseums', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryColosseumsV9>(endpoint);
  }

  /**
   * 캐릭터 수집품 정보 조회
   */
  async getCollectibles(characterName: string): Promise<ArmoryCollectiblesV9> {
    const endpoint = ARMORIES_ENDPOINTS.COLLECTIBLES(characterName);

    logger.debug('Fetching character collectibles', {
      characterName,
      endpoint,
    });

    return await this.apiClient.get<ArmoryCollectiblesV9>(endpoint);
  }

  /**
   * 캐릭터 정보 일괄 조회 (전체 정보)
   * 성능 최적화를 위해 전체 API 호출
   */
  async getCharacterFull(characterName: string): Promise<ArmoryCharacterV9> {
    logger.info('Fetching full character armory data', {
      characterName,
    });

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
    logger.info('Fetching partial character armory data', {
      characterName,
      sections,
    });

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
