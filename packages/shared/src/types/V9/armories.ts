/**
 * @lostark-api: V9.0.0
 * @reference: https://developer-lostark.game.onstove.com/getting-started#API-ARMORIES
 *
 * 로스트아크 API V9.0.0 ARMORIES API 타입 정의
 * - 캐릭터 상세 정보 (무기고)
 */

import { ApiVersion } from './base.js';

// === 기본 타입 정의 ===

/**
 * 스탯 정보
 */
export interface StatV9 {
  Type: string;
  Value: string;
  Tooltip: string[];
}

/**
 * 성향 정보
 */
export interface TendencyV9 {
  Type: string;
  Point: number;
  MaxPoint: number;
}

/**
 * 장비 정보
 */
export interface EquipmentV9 {
  Type: string;
  Name: string;
  Icon: string;
  Grade: string;
  Tooltip: string;
}

/**
 * 각인 정보
 */
export interface EngravingV9 {
  Slot: number;
  Name: string;
  Icon: string;
  Tooltip: string;
}

/**
 * 카드 정보
 */
export interface CardV9 {
  Slot: number;
  Name: string;
  Icon: string;
  AwakeCount: number;
  AwakeTotal: number;
  Grade: string;
  Tooltip: string;
}

/**
 * 보석 정보
 */
export interface GemV9 {
  Slot: number;
  Name: string;
  Icon: string;
  Level: number;
  Grade: string;
  Tooltip: string;
}

/**
 * 전투 스킬 정보
 */
export interface CombatSkillV9 {
  Name: string;
  Icon: string;
  Level: number;
  Type: string;
  IsAwakening: boolean;
  Tripods: Array<{
    Tier: number;
    Slot: number;
    Name: string;
    Icon: string;
    Level: number;
    IsSelected: boolean;
  }>;
  Rune: {
    Name: string;
    Icon: string;
  } | null;
}

/**
 * 아바타 정보
 */
export interface AvatarV9 {
  Type: string;
  Name: string;
  Icon: string;
  Grade: string;
  IsSet: boolean;
  IsInner: boolean;
  Tooltip: string;
}

/**
 * 증명의 전장 정보
 */
export interface ColosseumV9 {
  SeasonName: string;
  Competitive: {
    Rank: number;
    RankName: string;
    RankIcon: string;
    ClassRank: number;
    ClassRankName: string;
    ClassRankIcon: string;
    Score: number;
    MaxScore: number;
  };
  TeamDeathmatch: {
    Rank: number;
    RankName: string;
    RankIcon: string;
    ClassRank: number;
    ClassRankName: string;
    ClassRankIcon: string;
    Score: number;
    MaxScore: number;
  };
  Deathmatch: {
    Rank: number;
    RankName: string;
    RankIcon: string;
    ClassRank: number;
    ClassRankName: string;
    ClassRankIcon: string;
    Score: number;
    MaxScore: number;
  };
  TeamElimination: {
    Rank: number;
    RankName: string;
    RankIcon: string;
    ClassRank: number;
    ClassRankName: string;
    ClassRankIcon: string;
    Score: number;
    MaxScore: number;
  };
}

/**
 * 수집품 정보
 */
export interface CollectibleV9 {
  Type: string;
  Icon: string;
  Point: number;
  MaxPoint: number;
  CollectiblePoints: Array<{
    PointName: string;
    Point: number;
    MaxPoint: number;
  }>;
}

// === ARMORY PROFILE ===

/**
 * 캐릭터 프로필 정보
 */
export interface ArmoryProfileV9 extends ApiVersion {
  CharacterImage: string;
  ExpeditionLevel: number;
  PvpGradeName: string;
  TownLevel: number;
  TownName: string;
  Title: string;
  GuildMemberGrade: string;
  GuildName: string;
  UsingSkillPoint: number;
  TotalSkillPoint: number;
  Stats: StatV9[];
  Tendencies: TendencyV9[];
}

// === ARMORY EQUIPMENT ===

/**
 * 장비 정보
 */
export interface ArmoryEquipmentV9 extends ApiVersion {
  Type: string;
  Name: string;
  Icon: string;
  Grade: string;
  Tooltip: string;
}

// === ARMORY ENGRAVING ===

/**
 * 각인 정보
 */
export interface ArmoryEngravingV9 extends ApiVersion {
  Engravings: EngravingV9[];
  Effects: Array<{
    Name: string;
    Description: string;
  }>;
}

// === ARMORY CARDS ===

/**
 * 카드 정보
 */
export interface ArmoryCardsV9 extends ApiVersion {
  Cards: CardV9[];
  Effects: Array<{
    SetName: string;
    SetCount: number;
    SetEffect: string;
  }>;
}

// === ARMORY GEMS ===

/**
 * 보석 정보
 */
export interface ArmoryGemsV9 extends ApiVersion {
  Gems: GemV9[];
}

// === ARMORY COMBAT SKILLS ===

/**
 * 전투 스킬 정보
 */
export interface ArmoryCombatSkillsV9 extends ApiVersion {
  CombatSkills: CombatSkillV9[];
}

// === ARMORY AVATARS ===

/**
 * 아바타 정보
 */
export interface ArmoryAvatarsV9 extends ApiVersion {
  Avatars: AvatarV9[];
}

// === ARMORY COLOSSEUMS ===

/**
 * 증명의 전장 정보
 */
export interface ArmoryColosseumsV9 extends ApiVersion {
  Colosseums: ColosseumV9[];
}

// === ARMORY COLLECTIBLES ===

/**
 * 수집품 정보
 */
export interface ArmoryCollectiblesV9 extends ApiVersion {
  Collectibles: CollectibleV9[];
}

// === 전체 ARMORY 정보 ===

/**
 * 캐릭터 전체 정보 (무기고)
 */
export interface ArmoryCharacterV9 extends ApiVersion {
  ArmoryProfile: ArmoryProfileV9;
  ArmoryEquipment: ArmoryEquipmentV9[];
  ArmoryEngraving: ArmoryEngravingV9;
  ArmoryCard: ArmoryCardsV9;
  ArmoryGem: ArmoryGemsV9;
  ArmorySkill: ArmoryCombatSkillsV9;
  ArmoryAvatar: ArmoryAvatarsV9;
  ArmoryColosseum: ArmoryColosseumsV9;
  Collectibles: ArmoryCollectiblesV9;
}

// === API 엔드포인트 타입 ===

/**
 * ARMORIES API 엔드포인트
 */
export const ARMORIES_ENDPOINTS = {
  CHARACTER: (characterName: string) => `/armories/characters/${characterName}`,
  PROFILES: (characterName: string) => `/armories/characters/${characterName}/profiles`,
  EQUIPMENT: (characterName: string) => `/armories/characters/${characterName}/equipment`,
  AVATARS: (characterName: string) => `/armories/characters/${characterName}/avatars`,
  COMBAT_SKILLS: (characterName: string) => `/armories/characters/${characterName}/combat-skills`,
  ENGRAVINGS: (characterName: string) => `/armories/characters/${characterName}/engravings`,
  CARDS: (characterName: string) => `/armories/characters/${characterName}/cards`,
  GEMS: (characterName: string) => `/armories/characters/${characterName}/gems`,
  COLOSSEUMS: (characterName: string) => `/armories/characters/${characterName}/colosseums`,
  COLLECTIBLES: (characterName: string) => `/armories/characters/${characterName}/collectibles`,
} as const;

// === 현재 버전 별칭 ===

/**
 * 현재 버전 타입 별칭
 */
export type ArmoryProfile = ArmoryProfileV9;
export type ArmoryEquipment = ArmoryEquipmentV9;
export type ArmoryEngraving = ArmoryEngravingV9;
export type ArmoryCards = ArmoryCardsV9;
export type ArmoryGems = ArmoryGemsV9;
export type ArmoryCombatSkills = ArmoryCombatSkillsV9;
export type ArmoryAvatars = ArmoryAvatarsV9;
export type ArmoryColosseums = ArmoryColosseumsV9;
export type ArmoryCollectibles = ArmoryCollectiblesV9;
export type ArmoryCharacter = ArmoryCharacterV9;
