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
    Grade: string;
    Tooltip: string;
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
 * 증명의 전장 시즌 단일 모드 기록.
 * 실응답 7 키 ({Rank,RankName,RankIcon,RankLastMmr,PlayCount,
 * VictoryCount,LoseCount,TieCount,KillCount,AceCount,DeathCount}) 매핑.
 * 모드별로 미참여 시 null.
 */
export interface ColosseumModeStatV9 {
  Rank: number;
  RankName: string;
  RankIcon: string;
  RankLastMmr: number;
  PlayCount: number;
  VictoryCount: number;
  LoseCount: number;
  TieCount: number;
  KillCount: number;
  AceCount: number;
  DeathCount: number;
}

/**
 * 증명의 전장 시즌별 기록.
 * - legacy 의 `Deathmatch` 키는 V9 응답에 없음.
 * - V9 응답에 추가된 키: `CoOpBattle`, `OneDeathmatch`, `OneDeathmatchRank`.
 */
export interface ColosseumV9 {
  SeasonName: string;
  Competitive: ColosseumModeStatV9 | null;
  TeamDeathmatch: ColosseumModeStatV9 | null;
  TeamElimination: ColosseumModeStatV9 | null;
  CoOpBattle: ColosseumModeStatV9 | null;
  OneDeathmatch: ColosseumModeStatV9 | null;
  OneDeathmatchRank: ColosseumModeStatV9 | null;
}

/**
 * 아크 패시브 포인트 (3종: 진화/깨달음/도약)
 * 실응답: docs/contracts/upstream-lostark-api/V9.0.0/sample-data/armories/characters.json L2169
 */
export interface ArkPassivePointV9 {
  Name: '진화' | '깨달음' | '도약';
  Value: number;
  Tooltip: string;
  Description: string;
}

/**
 * 아크 패시브 효과 노드 (티어별 각인 효과).
 * 실응답 sample L2189. Effects[0] 가 항상 깨달음 1티어이며
 * Description 의 `>([^<]+)\s+Lv\.` 정규식으로 realization_name 추출 (legacy commandUtils.js:47).
 *
 * 주의: 키 표기 `ToolTip` 은 sample 응답 원본 그대로 보존 (다른 도메인의 `Tooltip` 과 표기 다름).
 */
export interface ArkPassiveEffectV9 {
  Name: '진화' | '깨달음' | '도약';
  Description: string;
  Icon: string;
  ToolTip: string;
}

/**
 * 아크 패시브 루트. 저티어 캐릭은 null 가능.
 */
export interface ArkPassiveV9 {
  Title: string;
  IsArkPassive: boolean;
  Points: ArkPassivePointV9[];
  Effects: ArkPassiveEffectV9[];
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
  CharacterName: string;
  /** 캐릭터 전투 레벨. sample L132: ArmoryProfile 최상위 필드. */
  CharacterLevel: number;
  ServerName: string;
  CharacterClassName: string;
  ItemAvgLevel: string; // 예: "1,620.00" — 공식 API 원본 문자열 형식
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
 * 아크 패시브 활성 캐릭터의 각인 항목.
 * 실응답: ArmoryEngraving.ArkPassiveEffects (sample L1xxx).
 * legacy commandUtils.js:566-577 동일 패턴 — 각 각인의 {Name, Level, Grade} 권위 소스.
 */
export interface ArkPassiveEngravingEntryV9 {
  AbilityStoneLevel: number | null;
  Grade: string;
  Level: number;
  Name: string;
  Description: string;
}

/**
 * 각인 정보.
 * - ArkPassive 활성: Engravings/Effects 가 null, ArkPassiveEffects 가 채워짐.
 * - ArkPassive 비활성: Engravings/Effects 가 채워짐, ArkPassiveEffects 부재 또는 null.
 */
export interface ArmoryEngravingV9 extends ApiVersion {
  Engravings: EngravingV9[] | null;
  Effects: Array<{
    Name: string;
    Description: string;
  }> | null;
  ArkPassiveEffects?: ArkPassiveEngravingEntryV9[] | null;
}

// === ARMORY CARDS ===

/**
 * 카드 정보
 */
export interface ArmoryCardsV9 extends ApiVersion {
  Cards: CardV9[];
  /**
   * 카드 세트 효과. 실응답:
   * `[{Index, CardSlots:[number], Items:[{Name, Description}]}]`.
   * legacy 의 `{SetName, SetCount, SetEffect}` 는 V9 에 존재하지 않음.
   */
  Effects: Array<{
    Index: number;
    CardSlots: number[];
    Items: Array<{ Name: string; Description: string }>;
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
  /** 아크 패시브 (저티어 캐릭은 null). */
  ArkPassive: ArkPassiveV9 | null;
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
