/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES 정규화 모듈 생성
 *
 * ARMORIES API 정규화 모듈
 * - API 응답을 도메인 모델로 변환
 * - 데이터 검증 및 계산
 * - 정규화된 캐릭터 상세 정보 생성
 */

import { logger } from '@lostark/shared';
import { ArmoryCharacterV9 } from '@lostark/shared/types/V9';

// === 도메인 모델 ===

/**
 * 정규화된 캐릭터 상세 정보
 */
export interface NormalizedCharacterDetail {
  characterName: string;
  serverName: string;
  className: string;
  itemLevel: number;
  expeditionLevel: number;
  guildName?: string;
  title?: string;
  profile: {
    characterImage: string;
    pvpGrade: string;
    townLevel: number;
    townName: string;
    skillPoints: {
      used: number;
      total: number;
    };
    stats: Array<{
      type: string;
      value: number;
      tooltip: string[];
    }>;
    tendencies: Array<{
      type: string;
      point: number;
      maxPoint: number;
    }>;
  };
  equipment: Array<{
    type: string;
    name: string;
    icon: string;
    grade: string;
    tooltip: string;
  }>;
  engravings: Array<{
    slot: number;
    name: string;
    icon: string;
    tooltip: string;
  }>;
  cards: Array<{
    slot: number;
    name: string;
    icon: string;
    awakeCount: number;
    awakeTotal: number;
    grade: string;
    tooltip: string;
  }>;
  gems: Array<{
    slot: number;
    name: string;
    icon: string;
    level: number;
    grade: string;
    tooltip: string;
  }>;
  combatSkills: Array<{
    name: string;
    icon: string;
    level: number;
    type: string;
    isAwakening: boolean;
    tripods: Array<{
      tier: number;
      slot: number;
      name: string;
      icon: string;
      level: number;
      isSelected: boolean;
    }>;
    rune?: {
      name: string;
      icon: string;
    };
  }>;
  avatars: Array<{
    type: string;
    name: string;
    icon: string;
    grade: string;
    isSet: boolean;
    isInner: boolean;
    tooltip: string;
  }>;
  colosseums: Array<{
    seasonName: string;
    competitive: {
      rank: number;
      rankName: string;
      rankIcon: string;
      classRank: number;
      classRankName: string;
      classRankIcon: string;
      score: number;
      maxScore: number;
    };
    teamDeathmatch: {
      rank: number;
      rankName: string;
      rankIcon: string;
      classRank: number;
      classRankName: string;
      classRankIcon: string;
      score: number;
      maxScore: number;
    };
    deathmatch: {
      rank: number;
      rankName: string;
      rankIcon: string;
      classRank: number;
      classRankName: string;
      classRankIcon: string;
      score: number;
      maxScore: number;
    };
    teamElimination: {
      rank: number;
      rankName: string;
      rankIcon: string;
      classRank: number;
      classRankName: string;
      classRankIcon: string;
      score: number;
      maxScore: number;
    };
  }>;
  collectibles: Array<{
    type: string;
    icon: string;
    point: number;
    maxPoint: number;
    collectiblePoints: Array<{
      pointName: string;
      point: number;
      maxPoint: number;
    }>;
  }>;
  metadata: {
    normalizedAt: Date;
    apiVersion: string;
    dataHash: string;
  };
}

/**
 * 정규화 결과
 */
export interface NormalizationResult {
  characterDetail: NormalizedCharacterDetail;
  changes?:
    | {
        itemLevelChanged?: boolean;
        equipmentChanged?: boolean;
        engravingsChanged?: boolean;
        gemsChanged?: boolean;
      }
    | undefined;
}

// === ARMORIES 정규화 모듈 ===

/**
 * ARMORIES API 정규화 모듈
 */
export class ArmoriesNormalizer {
  /**
   * 캐릭터 상세 정보 정규화
   */
  async normalizeCharacterDetail(
    characterName: string,
    armoryData: ArmoryCharacterV9,
    existingDetail?: NormalizedCharacterDetail,
  ): Promise<NormalizationResult> {
    const requestId = this.generateRequestId();

    logger.info('Normalizing character armory data', {
      characterName,
      requestId,
    });

    try {
      // 1. 기본 정보 추출
      const profile = armoryData.ArmoryProfile;
      const characterNameFromProfile = this.extractCharacterName(profile);
      const serverName = this.extractServerName(profile);
      const className = this.extractClassName(profile);
      const itemLevel = this.calculateItemLevel(profile);

      // 2. 정규화된 데이터 생성
      const characterDetail: NormalizedCharacterDetail = {
        characterName: characterNameFromProfile,
        serverName,
        className,
        itemLevel,
        expeditionLevel: profile.ExpeditionLevel,
        guildName: profile.GuildName || undefined,
        title: profile.Title || undefined,
        profile: {
          characterImage: profile.CharacterImage,
          pvpGrade: profile.PvpGradeName,
          townLevel: profile.TownLevel,
          townName: profile.TownName,
          skillPoints: {
            used: profile.UsingSkillPoint,
            total: profile.TotalSkillPoint,
          },
          stats: this.normalizeStats(profile.Stats),
          tendencies: this.normalizeTendencies(profile.Tendencies),
        },
        equipment: this.normalizeEquipment(armoryData.ArmoryEquipment),
        engravings: this.normalizeEngravings(armoryData.ArmoryEngraving),
        cards: this.normalizeCards(armoryData.ArmoryCard),
        gems: this.normalizeGems(armoryData.ArmoryGem),
        combatSkills: this.normalizeCombatSkills(armoryData.ArmorySkill),
        avatars: this.normalizeAvatars(armoryData.ArmoryAvatar),
        colosseums: this.normalizeColosseums(armoryData.ArmoryColosseum),
        collectibles: this.normalizeCollectibles(armoryData.Collectibles),
        metadata: {
          normalizedAt: new Date(),
          apiVersion: armoryData.ApiVersion || 'V9.0.0',
          dataHash: this.calculateDataHash(armoryData),
        },
      };

      // 3. 변화 감지
      const changes = existingDetail
        ? this.detectChanges(existingDetail, characterDetail)
        : undefined;

      logger.info('Character armory data normalized successfully', {
        characterName,
        itemLevel,
        requestId,
        changes: changes
          ? Object.keys(changes).filter((key) => changes[key as keyof typeof changes])
          : undefined,
      });

      return {
        characterDetail,
        changes: changes || undefined,
      };
    } catch (error) {
      logger.error('Failed to normalize character armory data', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });
      throw error;
    }
  }

  /**
   * 스탯 정보 정규화
   */
  private normalizeStats(stats: any[]): Array<{ type: string; value: number; tooltip: string[] }> {
    return stats.map((stat) => ({
      type: stat.Type,
      value: this.parseStatValue(stat.Value),
      tooltip: stat.Tooltip || [],
    }));
  }

  /**
   * 성향 정보 정규화
   */
  private normalizeTendencies(
    tendencies: any[],
  ): Array<{ type: string; point: number; maxPoint: number }> {
    return tendencies.map((tendency) => ({
      type: tendency.Type,
      point: tendency.Point,
      maxPoint: tendency.MaxPoint,
    }));
  }

  /**
   * 장비 정보 정규화
   */
  private normalizeEquipment(
    equipment: any[],
  ): Array<{ type: string; name: string; icon: string; grade: string; tooltip: string }> {
    return equipment.map((item) => ({
      type: item.Type,
      name: item.Name,
      icon: item.Icon,
      grade: item.Grade,
      tooltip: item.Tooltip,
    }));
  }

  /**
   * 각인 정보 정규화
   */
  private normalizeEngravings(
    engravingData: any,
  ): Array<{ slot: number; name: string; icon: string; tooltip: string }> {
    return (engravingData.Engravings || []).map((engraving: any) => ({
      slot: engraving.Slot,
      name: engraving.Name,
      icon: engraving.Icon,
      tooltip: engraving.Tooltip,
    }));
  }

  /**
   * 카드 정보 정규화
   */
  private normalizeCards(
    cardData: any,
  ): Array<{
    slot: number;
    name: string;
    icon: string;
    awakeCount: number;
    awakeTotal: number;
    grade: string;
    tooltip: string;
  }> {
    return (cardData.Cards || []).map((card: any) => ({
      slot: card.Slot,
      name: card.Name,
      icon: card.Icon,
      awakeCount: card.AwakeCount,
      awakeTotal: card.AwakeTotal,
      grade: card.Grade,
      tooltip: card.Tooltip,
    }));
  }

  /**
   * 보석 정보 정규화
   */
  private normalizeGems(
    gemData: any,
  ): Array<{
    slot: number;
    name: string;
    icon: string;
    level: number;
    grade: string;
    tooltip: string;
  }> {
    return (gemData.Gems || []).map((gem: any) => ({
      slot: gem.Slot,
      name: gem.Name,
      icon: gem.Icon,
      level: gem.Level,
      grade: gem.Grade,
      tooltip: gem.Tooltip,
    }));
  }

  /**
   * 전투 스킬 정보 정규화
   */
  private normalizeCombatSkills(skillData: any): Array<{
    name: string;
    icon: string;
    level: number;
    type: string;
    isAwakening: boolean;
    tripods: Array<{
      tier: number;
      slot: number;
      name: string;
      icon: string;
      level: number;
      isSelected: boolean;
    }>;
    rune?: {
      name: string;
      icon: string;
    };
  }> {
    return (skillData.CombatSkills || []).map((skill: any) => ({
      name: skill.Name,
      icon: skill.Icon,
      level: skill.Level,
      type: skill.Type,
      isAwakening: skill.IsAwakening,
      tripods: (skill.Tripods || []).map((tripod: any) => ({
        tier: tripod.Tier,
        slot: tripod.Slot,
        name: tripod.Name,
        icon: tripod.Icon,
        level: tripod.Level,
        isSelected: tripod.IsSelected,
      })),
      rune: skill.Rune
        ? {
            name: skill.Rune.Name,
            icon: skill.Rune.Icon,
          }
        : undefined,
    }));
  }

  /**
   * 아바타 정보 정규화
   */
  private normalizeAvatars(
    avatarData: any,
  ): Array<{
    type: string;
    name: string;
    icon: string;
    grade: string;
    isSet: boolean;
    isInner: boolean;
    tooltip: string;
  }> {
    return (avatarData.Avatars || []).map((avatar: any) => ({
      type: avatar.Type,
      name: avatar.Name,
      icon: avatar.Icon,
      grade: avatar.Grade,
      isSet: avatar.IsSet,
      isInner: avatar.IsInner,
      tooltip: avatar.Tooltip,
    }));
  }

  /**
   * 증명의 전장 정보 정규화
   */
  private normalizeColosseums(colosseumData: any): Array<{
    seasonName: string;
    competitive: any;
    teamDeathmatch: any;
    deathmatch: any;
    teamElimination: any;
  }> {
    return (colosseumData.Colosseums || []).map((colosseum: any) => ({
      seasonName: colosseum.SeasonName,
      competitive: colosseum.Competitive,
      teamDeathmatch: colosseum.TeamDeathmatch,
      deathmatch: colosseum.Deathmatch,
      teamElimination: colosseum.TeamElimination,
    }));
  }

  /**
   * 수집품 정보 정규화
   */
  private normalizeCollectibles(collectibleData: any): Array<{
    type: string;
    icon: string;
    point: number;
    maxPoint: number;
    collectiblePoints: Array<{
      pointName: string;
      point: number;
      maxPoint: number;
    }>;
  }> {
    return (collectibleData.Collectibles || []).map((collectible: any) => ({
      type: collectible.Type,
      icon: collectible.Icon,
      point: collectible.Point,
      maxPoint: collectible.MaxPoint,
      collectiblePoints: (collectible.CollectiblePoints || []).map((point: any) => ({
        pointName: point.PointName,
        point: point.Point,
        maxPoint: point.MaxPoint,
      })),
    }));
  }

  /**
   * 캐릭터명 추출
   */
  private extractCharacterName(profile: any): string {
    // CharacterImage URL에서 캐릭터명 추출 시도
    const imageUrl = profile.CharacterImage;
    if (imageUrl) {
      const match = imageUrl.match(/\/armory\/[^\/]+\/([^\/]+)\.jpg/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }

    // 기본값으로 빈 문자열 반환 (실제로는 API에서 제공해야 함)
    return '';
  }

  /**
   * 서버명 추출
   */
  private extractServerName(profile: any): string {
    // 실제 구현에서는 API 응답에서 서버명을 추출해야 함
    // 현재는 샘플 데이터 기반으로 추정
    return '아브렐슈드'; // 기본값
  }

  /**
   * 클래스명 추출
   */
  private extractClassName(profile: any): string {
    // 실제 구현에서는 API 응답에서 클래스명을 추출해야 함
    // 현재는 샘플 데이터 기반으로 추정
    return '디스트로이어'; // 기본값
  }

  /**
   * 아이템 레벨 계산
   */
  private calculateItemLevel(profile: any): number {
    // Stats에서 아이템 레벨 관련 정보를 찾아 계산
    // 실제 구현에서는 더 정확한 계산 로직 필요
    return 1460; // 기본값
  }

  /**
   * 스탯 값 파싱
   */
  private parseStatValue(value: string): number {
    // 쉼표 제거 후 숫자로 변환
    return parseFloat(value.replace(/,/g, '')) || 0;
  }

  /**
   * 데이터 해시 계산
   */
  private calculateDataHash(data: any): string {
    // 간단한 해시 계산 (실제로는 더 정교한 해시 알고리즘 사용)
    const jsonString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return hash.toString(36);
  }

  /**
   * 변화 감지
   */
  private detectChanges(
    existing: NormalizedCharacterDetail,
    current: NormalizedCharacterDetail,
  ): {
    itemLevelChanged?: boolean;
    equipmentChanged?: boolean;
    engravingsChanged?: boolean;
    gemsChanged?: boolean;
  } {
    const changes: any = {};

    // 아이템 레벨 변화 감지
    if (existing.itemLevel !== current.itemLevel) {
      changes.itemLevelChanged = true;
    }

    // 장비 변화 감지
    if (JSON.stringify(existing.equipment) !== JSON.stringify(current.equipment)) {
      changes.equipmentChanged = true;
    }

    // 각인 변화 감지
    if (JSON.stringify(existing.engravings) !== JSON.stringify(current.engravings)) {
      changes.engravingsChanged = true;
    }

    // 보석 변화 감지
    if (JSON.stringify(existing.gems) !== JSON.stringify(current.gems)) {
      changes.gemsChanged = true;
    }

    return changes;
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `armory-norm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === 싱글톤 인스턴스 ===

/**
 * ARMORIES 정규화 모듈 인스턴스
 */
export const armoriesNormalizer = new ArmoriesNormalizer();
