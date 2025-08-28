/**
 * @cursor-change: 2025-01-27, v1.0.0, 캐릭터 도메인 모델 생성
 *
 * 캐릭터 관련 도메인 타입 정의
 * - 캐릭터 기본 정보
 * - 캐릭터 상세 정보
 * - 캐릭터 통계
 */

/**
 * 캐릭터 기본 정보
 */
export interface Character {
  name: string;
  level: number;
  class: string;
  itemLevel: number;
  server: string;
  guildName?: string;
  guildGrade?: string;
  title?: string;
  expeditionLevel: number;
  pvpGrade: string;
  usingSkillPoint: number;
  totalSkillPoint: number;
  lastUpdate: string;
}

/**
 * 캐릭터 상세 정보
 */
export interface CharacterDetail extends Character {
  equipment: Equipment[];
  engravings: Engraving[];
  skills: Skill[];
  cards: Card[];
  gems: Gem[];
  collectibles: Collectible[];
  avatars: Avatar[];
  combatSkills: CombatSkill[];
  colosseums: Colosseum[];
}

/**
 * 장비 정보
 */
export interface Equipment {
  id: number;
  name: string;
  icon: string;
  grade: string;
  tier: number;
  level: number;
  quality: number;
  honingLevel: number;
  options: EquipmentOption[];
}

/**
 * 장비 옵션
 */
export interface EquipmentOption {
  type: string;
  name: string;
  value: number;
  isPenalty: boolean;
}

/**
 * 각인 정보
 */
export interface Engraving {
  name: string;
  grade: string;
  level: number;
}

/**
 * 스킬 정보
 */
export interface Skill {
  name: string;
  level: number;
  tripods: Tripod[];
}

/**
 * 트라이포드
 */
export interface Tripod {
  name: string;
  level: number;
  tier: number;
}

/**
 * 카드 정보
 */
export interface Card {
  name: string;
  awakening: number;
  level: number;
}

/**
 * 보석 정보
 */
export interface Gem {
  name: string;
  level: number;
  grade: string;
  skillName: string;
}

/**
 * 수집품 정보
 */
export interface Collectible {
  name: string;
  count: number;
  total: number;
}

/**
 * 아바타 정보
 */
export interface Avatar {
  name: string;
  icon: string;
  grade: string;
}

/**
 * 전투 스킬 정보
 */
export interface CombatSkill {
  name: string;
  level: number;
  tripods: Tripod[];
}

/**
 * 증명의 전장 정보
 */
export interface Colosseum {
  name: string;
  tier: number;
  grade: string;
}

/**
 * 캐릭터 통계
 */
export interface CharacterStats {
  attack: number;
  health: number;
  critical: number;
  criticalDamage: number;
  swiftness: number;
  domination: number;
  expertise: number;
  endurance: number;
}

/**
 * 직업전용 노드 정보
 */
export interface ClassSpecificNodes {
  class: string;
  nodes: ClassNode[];
  requirements: {
    minItemLevel: number;
  };
}

/**
 * 직업 노드
 */
export interface ClassNode {
  name: string;
  type: '각인' | '스킬';
  description: string;
}

/**
 * 캐릭터 형제 정보
 */
export interface CharacterSiblings {
  characterName: string;
  siblings: Character[];
}

/**
 * 캐릭터 검색 결과
 */
export interface CharacterSearchResult {
  characters: Character[];
  totalCount: number;
  pageNo: number;
  pageSize: number;
}

/**
 * 캐릭터 캐시 정보
 */
export interface CharacterCacheInfo {
  characterName: string;
  lastUpdate: string;
  cacheHit: boolean;
  cacheSource: 'memory' | 'redis' | 'database' | 'api';
  responseTime: number;
}
