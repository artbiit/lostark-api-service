/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES API 클라이언트 생성
 *
 * ARMORIES API 클라이언트
 * - 캐릭터 상세 정보 조회 (무기고)
 * - Rate Limit 관리 및 에러 처리
 * - 재시도 로직 및 로깅
 */
import { ArmoryAvatarsV9, ArmoryCardsV9, ArmoryCharacterV9, ArmoryCollectiblesV9, ArmoryColosseumsV9, ArmoryCombatSkillsV9, ArmoryEngravingV9, ArmoryEquipmentV9, ArmoryGemsV9, ArmoryProfileV9 } from '@lostark/shared/types/V9/armories.js';
/**
 * ARMORIES API 클라이언트
 */
export declare class ArmoriesClient {
    private apiClient;
    constructor();
    /**
     * 캐릭터 전체 정보 조회
     */
    getCharacter(characterName: string): Promise<ArmoryCharacterV9>;
    /**
     * 캐릭터 프로필 정보 조회
     */
    getProfile(characterName: string): Promise<ArmoryProfileV9>;
    /**
     * 캐릭터 장비 정보 조회
     */
    getEquipment(characterName: string): Promise<ArmoryEquipmentV9[]>;
    /**
     * 캐릭터 아바타 정보 조회
     */
    getAvatars(characterName: string): Promise<ArmoryAvatarsV9>;
    /**
     * 캐릭터 전투 스킬 정보 조회
     */
    getCombatSkills(characterName: string): Promise<ArmoryCombatSkillsV9>;
    /**
     * 캐릭터 각인 정보 조회
     */
    getEngravings(characterName: string): Promise<ArmoryEngravingV9>;
    /**
     * 캐릭터 카드 정보 조회
     */
    getCards(characterName: string): Promise<ArmoryCardsV9>;
    /**
     * 캐릭터 보석 정보 조회
     */
    getGems(characterName: string): Promise<ArmoryGemsV9>;
    /**
     * 캐릭터 증명의 전장 정보 조회
     */
    getColosseums(characterName: string): Promise<ArmoryColosseumsV9>;
    /**
     * 캐릭터 수집품 정보 조회
     */
    getCollectibles(characterName: string): Promise<ArmoryCollectiblesV9>;
    /**
     * 캐릭터 정보 일괄 조회 (전체 정보)
     * 성능 최적화를 위해 전체 API 호출
     */
    getCharacterFull(characterName: string): Promise<ArmoryCharacterV9>;
    /**
     * 캐릭터 정보 부분 조회 (특정 섹션만)
     * 필요한 정보만 선택적으로 조회
     */
    getCharacterPartial(characterName: string, sections: Array<'profile' | 'equipment' | 'avatars' | 'combat-skills' | 'engravings' | 'cards' | 'gems' | 'colosseums' | 'collectibles'>): Promise<Partial<ArmoryCharacterV9>>;
}
/**
 * ARMORIES API 클라이언트 인스턴스
 */
export declare const armoriesClient: ArmoriesClient;
