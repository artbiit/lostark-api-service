/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES 데이터 정규화기 생성
 *
 * ARMORIES API 응답 데이터 정규화
 * - API 응답을 내부 도메인 모델로 변환
 * - 데이터 검증 및 정제
 */

import { logger } from '@lostark/shared';
import { ArmoryCharacterV9 } from '@lostark/shared/types/V9/armories';

// === 어빌리티 스톤 분류 색상 코드 (V9 sample 기반) ===

/** 레벨 보너스 라인 식별 색 (`#73DC04`). §5.2 분류 결정 트리. */
const STONE_LEVEL_BONUS_COLOR = '#73DC04';
/** 디버프 라인 식별 색 (`#FE2E2E`). 예: `[이동속도 감소]`. */
const STONE_DEBUFF_COLOR = '#FE2E2E';
/** 토큰 우선순위 매치 — `'레벨 보너스'` 도 level-bonus 트리거. */
const STONE_LEVEL_BONUS_TOKEN = '레벨 보너스';

// === 도메인 모델 ===

/**
 * 어빌리티 스톤 도메인 모델 (V9.0.0 시즌 기준).
 *
 * 입력: ArmoryEquipment[] 중 Type === '어빌리티 스톤' 한 건.
 * Tooltip 파싱 (sample: equipment.json L80):
 *   - Element_006 = ItemPartBox, value.Element_000 = '세공 단계 보너스' 헤더
 *     → craftingBonus = value.Element_001 의 HTML 제거 텍스트
 *   - Element_007 = IndentStringGroup, topStr 포함 '무작위 각인 효과'
 *     → engravingEffects[] = value.Element_000.contentStr.Element_* 각각 분류
 */
export interface NormalizedAbilityStone {
  /** 예: "위대한 비상의 돌" */
  name: string;
  /** 예: "고대" */
  grade: string;
  /** Element_006 의 ItemPartBox.Element_001 텍스트. 없으면 null (legacy 잔존 데이터 호환). */
  craftingBonus: string | null;
  /** Element_007 의 무작위 각인 효과 (이다 샘플 = 4개). 순서 보존. */
  engravingEffects: NormalizedAbilityStoneEffect[];
}

/** 어빌리티 스톤 효과 분류 — 결정 트리는 §5.2. */
export type AbilityStoneEffectKind = 'engraving' | 'debuff' | 'level-bonus';

export interface NormalizedAbilityStoneEffect {
  /** 대괄호 안 첫 토큰. 예: "아드레날린", "이동속도 감소", "레벨 보너스" */
  name: string;
  /** kind ∈ {engraving, debuff} 에서만 의미 있음. level-bonus 는 0. */
  level: number;
  /** §5.2 결정 트리 결과. */
  kind: AbilityStoneEffectKind;
  /** kind === 'level-bonus' 일 때만 채움. 예: "기본 공격력 +1.50%" */
  bonusText: string | null;
}

/**
 * 아크 패시브 도메인 모델 (정규화 후).
 * ArkPassive 활성 캐릭에서만 채워짐. 비활성 캐릭은 NormalizedCharacterDetail.arkPassive === null.
 */
export interface NormalizedArkPassive {
  isArkPassive: boolean;
  title: string;
  /** Points 3종 — 없으면 0 */
  points: { evolution: number; realization: number; leap: number };
  /** Effects[0].Description 의 '>{name} Lv.{n}<' 첫 매치. 추출 실패 시 null */
  realizationName: string | null;
  /** ArmoryEngraving.ArkPassiveEffects 기반 (활성 시), 비활성 시 빈 배열 */
  engravingEffects: Array<{ name: string; level: number; grade: string }>;
}

/**
 * 정규화된 캐릭터 상세 정보
 */
export interface NormalizedCharacterDetail {
  characterName: string;
  serverName: string;
  className: string;
  itemLevel: number;
  /** ArmoryProfile.CharacterLevel 직접. Stats 우회 제거. */
  characterLevel: number;
  /** ArmoryProfile.CombatPower 의 콤마 제거 후 number. 예: "4,351.68" → 4351.68 */
  combatPower: number;
  expeditionLevel: number;
  guildName?: string;
  /** ArmoryProfile.GuildMemberGrade — 예: '길드장', '부길드장', '길드원'. */
  guildMemberGrade?: string;
  title?: string;
  /** ArkPassive 활성 시. 비활성/응답 부재 시 null. */
  arkPassive: NormalizedArkPassive | null;
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
  /**
   * 어빌리티 스톤 (장착 0개면 null).
   * equipment[] 의 Type === '어빌리티 스톤' 1건을 normalize 한 결과.
   * formatAbilityStone 이 직접 읽는 권위 소스 — equipment[].tooltip 재파싱 금지 (Phase 2 에서 적용).
   */
  abilityStone: NormalizedAbilityStone | null;
  engravings: Array<{
    slot: number;
    name: string;
    icon: string;
    tooltip: string;
    /** ArkPassiveEffects 기반 보강 (활성 시). 비활성 캐릭은 undefined. */
    level?: number;
    grade?: string;
  }>;
  cards: {
    cards: Array<{
      slot: number;
      name: string;
      icon: string;
      awakeCount: number;
      awakeTotal: number;
      grade: string;
      tooltip: string;
    }>;
    effects: Array<{
      index: number;
      cardSlots: number[];
      items: Array<{ name: string; description: string }>;
    }>;
  };
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
      grade?: string;
      tooltip?: string;
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
    competitive?: unknown;
    teamDeathmatch?: unknown;
    teamElimination?: unknown;
    coOpBattle?: unknown;
    oneDeathmatch?: unknown;
    oneDeathmatchRank?: unknown;
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
    /**
     * 이 cache entry 를 생성할 때 실제 API 를 호출한 section 목록.
     * partial fetch: 요청한 sections 만 열거.
     * full fetch: FULL_SECTIONS (9개) 전부.
     * 부재(old entry): 모든 section 이 fetch 된 것으로 backward-compat 처리.
     */
    fetchedSections: string[];
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

    logger.info({
      characterName,
      requestId,
    }, 'Normalizing character armory data');

    try {
      // 1. 기본 정보 추출
      const profile = armoryData.ArmoryProfile;

      if (!profile) {
        throw new Error('404: Armory profile not found');
      }

      const stats = Array.isArray(profile.Stats) ? profile.Stats : [];
      const tendencies = Array.isArray(profile.Tendencies) ? profile.Tendencies : [];
      const equipment = Array.isArray(armoryData.ArmoryEquipment) ? armoryData.ArmoryEquipment : [];
      const engravings = armoryData.ArmoryEngraving ?? {};
      const cards = armoryData.ArmoryCard ?? {};
      const gems = armoryData.ArmoryGem ?? {};
      const combatSkills = armoryData.ArmorySkill ?? {};
      const avatars = armoryData.ArmoryAvatar ?? {};
      const colosseums = armoryData.ArmoryColosseum ?? {};
      const collectibles = armoryData.Collectibles ?? {};
      const characterNameFromProfile = this.extractCharacterName(profile);
      const serverName = this.extractServerName(profile);
      const className = this.extractClassName(profile);
      const itemLevel = this.calculateItemLevel(profile);

      // 2. ArkPassive + 각인 사전 정규화 (engravings 가 arkPassive.engravingEffects 의 소스)
      const arkPassive = this.normalizeArkPassive(armoryData.ArkPassive);
      const normalizedEngravings = this.normalizeEngravings(engravings);
      const normalizedEquipment = this.normalizeEquipment(equipment);
      const abilityStone = this.normalizeAbilityStone(equipment);
      if (arkPassive) {
        arkPassive.engravingEffects = normalizedEngravings
          .filter((e) => typeof e.level === 'number' && typeof e.grade === 'string')
          .map((e) => ({ name: e.name, level: e.level as number, grade: e.grade as string }));
      }

      // 3. 정규화된 데이터 생성
      const characterLevel =
        typeof (profile as any).CharacterLevel === 'number' ? (profile as any).CharacterLevel : 0;
      const combatPower = this.parseCombatPower((profile as any).CombatPower);

      const characterDetail: NormalizedCharacterDetail = {
        characterName: characterNameFromProfile,
        serverName,
        className,
        itemLevel,
        characterLevel,
        combatPower,
        expeditionLevel: profile.ExpeditionLevel,
        ...(profile.GuildName && { guildName: profile.GuildName }),
        ...(profile.GuildMemberGrade && { guildMemberGrade: profile.GuildMemberGrade }),
        ...(profile.Title && { title: profile.Title }),
        arkPassive,
        profile: {
          characterImage: profile.CharacterImage,
          pvpGrade: profile.PvpGradeName,
          townLevel: profile.TownLevel,
          townName: profile.TownName,
          skillPoints: {
            used: profile.UsingSkillPoint,
            total: profile.TotalSkillPoint,
          },
          stats: this.normalizeStats(stats),
          tendencies: this.normalizeTendencies(tendencies),
        },
        equipment: normalizedEquipment,
        abilityStone,
        engravings: normalizedEngravings,
        cards: this.normalizeCards(cards),
        gems: this.normalizeGems(gems),
        combatSkills: this.normalizeCombatSkills(combatSkills),
        avatars: this.normalizeAvatars(avatars),
        colosseums: this.normalizeColosseums(colosseums),
        collectibles: this.normalizeCollectibles(collectibles),
        metadata: {
          normalizedAt: new Date(),
          apiVersion: 'V9.0.0',
          dataHash: this.calculateDataHash(armoryData),
          // fetchedSections 는 service 레이어(getCharacterDetailPartial / processCharacterDetail)가 덮어씀.
          // normalizer 는 전체 데이터를 받아 정규화하므로 여기서는 [] 로 초기화.
          fetchedSections: [],
        },
      };

      // 3. 변화 감지
      const changes = existingDetail
        ? this.detectChanges(existingDetail, characterDetail)
        : undefined;

      logger.info({
        characterName,
        itemLevel,
        requestId,
        changes: changes
          ? Object.keys(changes).filter((key) => changes[key as keyof typeof changes])
          : undefined,
      }, 'Character armory data normalized successfully');

      return {
        characterDetail,
        changes: changes || undefined,
      };
    } catch (error) {
      logger.error({
        characterName,
        error: error instanceof Error ? error.message : String(error),
        requestId,
      }, 'Failed to normalize character armory data');
      throw error;
    }
  }

  /**
   * 스탯 정보 정규화
   */
  private normalizeStats(
    stats: any[] | undefined,
  ): Array<{ type: string; value: number; tooltip: string[] }> {
    return (stats ?? []).map((stat) => ({
      type: stat.Type,
      value: this.parseStatValue(stat.Value),
      tooltip: stat.Tooltip || [],
    }));
  }

  /**
   * 성향 정보 정규화
   */
  private normalizeTendencies(
    tendencies: any[] | undefined,
  ): Array<{ type: string; point: number; maxPoint: number }> {
    return (tendencies ?? []).map((tendency) => ({
      type: tendency.Type,
      point: tendency.Point,
      maxPoint: tendency.MaxPoint,
    }));
  }

  /**
   * 장비 정보 정규화
   */
  normalizeEquipment(
    equipment: any[] | undefined,
  ): Array<{ type: string; name: string; icon: string; grade: string; tooltip: string }> {
    return (equipment ?? []).map((item) => ({
      type: item.Type,
      name: item.Name,
      icon: item.Icon,
      grade: item.Grade,
      tooltip: item.Tooltip,
    }));
  }

  /**
   * 어빌리티 스톤 정규화 (V9.0.0 신 응답 구조 대응).
   *
   * 처리 단계 (설계 §5.1):
   * 1. equipment 에서 Type === '어빌리티 스톤' 필터. 0건 → null.
   * 2. 복수 보유 가정 안 함 — 첫 건 채택.
   * 3. Tooltip raw JSON 파싱. 실패 시 graceful fallback (craftingBonus=null, engravingEffects=[]).
   * 4. Element_006 (ItemPartBox + '세공 단계 보너스') → craftingBonus.
   * 5. Element_007 (IndentStringGroup + '무작위 각인 효과') → engravingEffects[] (분류는 §5.2).
   * 6. return.
   */
  normalizeAbilityStone(equipment: any[] | undefined): NormalizedAbilityStone | null {
    const stones = (equipment ?? []).filter((e) => e?.Type === '어빌리티 스톤');
    if (stones.length === 0) return null;
    const stone = stones[0]!;
    const name = typeof stone.Name === 'string' ? stone.Name : '';
    const grade = typeof stone.Grade === 'string' ? stone.Grade : '';
    const fallback: NormalizedAbilityStone = {
      name,
      grade,
      craftingBonus: null,
      engravingEffects: [],
    };

    if (typeof stone.Tooltip !== 'string' || stone.Tooltip.length === 0) {
      return fallback;
    }

    let tooltipObj: Record<string, any>;
    try {
      tooltipObj = JSON.parse(stone.Tooltip);
    } catch {
      return fallback;
    }

    // 4. craftingBonus 추출 — ItemPartBox + '세공 단계 보너스'
    let craftingBonus: string | null = null;
    for (const el of Object.values(tooltipObj)) {
      if (
        el &&
        typeof el === 'object' &&
        (el as any).type === 'ItemPartBox' &&
        typeof (el as any).value?.Element_000 === 'string' &&
        ((el as any).value.Element_000 as string).includes('세공 단계 보너스')
      ) {
        const e1 = (el as any).value.Element_001;
        if (typeof e1 === 'string') {
          craftingBonus = stripHtmlTags(e1).trim();
        }
        break;
      }
    }

    // 5. engravingEffects 추출 — IndentStringGroup + topStr 에 '무작위 각인 효과'
    const engravingEffects: NormalizedAbilityStoneEffect[] = [];
    for (const el of Object.values(tooltipObj)) {
      if (
        !el ||
        typeof el !== 'object' ||
        (el as any).type !== 'IndentStringGroup' ||
        !(el as any).value
      ) {
        continue;
      }
      const group = (el as any).value;
      // group.Element_000 = { contentStr: {...}, topStr: '...' }
      const inner = group?.Element_000;
      if (!inner || typeof inner.topStr !== 'string') continue;
      if (!inner.topStr.includes('무작위 각인 효과')) continue;
      const contentStr = inner.contentStr;
      if (!contentStr || typeof contentStr !== 'object') continue;

      for (const entry of Object.values(contentStr)) {
        if (!entry || typeof entry !== 'object') continue;
        const raw = (entry as any).contentStr;
        if (typeof raw !== 'string') continue;
        engravingEffects.push(this.classifyAbilityStoneEffect(raw));
      }
      break;
    }

    return { name, grade, craftingBonus, engravingEffects };
  }

  /**
   * 어빌리티 스톤 raw contentStr 1건을 분류한다 (설계 §5.2).
   *
   * 결정 트리 (우선순위 순):
   *   1. raw 가 '레벨 보너스' 토큰 OR `#73DC04` 포함 → level-bonus.
   *      name='레벨 보너스', level=0, bonusText=닫는 `]` 이후 텍스트 (HTML 제거 + trim).
   *   2. raw 가 `#FE2E2E` 포함 → debuff.
   *   3. else → engraving.
   * name/level 은 공통 헬퍼로 추출.
   */
  private classifyAbilityStoneEffect(rawContent: string): NormalizedAbilityStoneEffect {
    const lvMatch = rawContent.match(/Lv\.(\d+)/);
    const level = lvMatch ? Number(lvMatch[1]) : 0;
    const bracketName = extractBracketName(rawContent);

    // 1. 레벨 보너스
    if (
      rawContent.includes(STONE_LEVEL_BONUS_TOKEN) ||
      rawContent.includes(STONE_LEVEL_BONUS_COLOR)
    ) {
      // 닫는 ']' 이후 텍스트의 HTML 제거 + trim. <BR> 류는 제거 후 잔여 공백 정돈.
      const closeIdx = rawContent.indexOf(']');
      const afterBracket = closeIdx >= 0 ? rawContent.slice(closeIdx + 1) : rawContent;
      const bonusText = stripHtmlTags(afterBracket).trim();
      return {
        name: bracketName || '레벨 보너스',
        level: 0,
        kind: 'level-bonus',
        bonusText: bonusText.length > 0 ? bonusText : null,
      };
    }

    // 2. 디버프
    if (rawContent.includes(STONE_DEBUFF_COLOR)) {
      return { name: bracketName, level, kind: 'debuff', bonusText: null };
    }

    // 3. 각인 효과
    return { name: bracketName, level, kind: 'engraving', bonusText: null };
  }

  /**
   * 각인 정보 정규화.
   *
   * 분기:
   * 1. ArkPassive 활성 — `ArmoryEngraving.ArkPassiveEffects[]` 우선.
   *    각 entry 의 `{Name, Description, Level, Grade}` 를 매핑.
   * 2. ArkPassive 비활성 — 기존 `Engravings[]` 사용 (level/grade 없음).
   */
  normalizeEngravings(
    engravingData: any,
  ): Array<{
    slot: number;
    name: string;
    icon: string;
    tooltip: string;
    level?: number;
    grade?: string;
  }> {
    if (!engravingData) return [];

    // 분기 1: ArkPassive 활성
    if (Array.isArray(engravingData.ArkPassiveEffects)) {
      return engravingData.ArkPassiveEffects.map((eff: any, idx: number) => ({
        slot: idx,
        name: typeof eff?.Name === 'string' ? eff.Name : '',
        icon: '', // ArkPassiveEffects 에는 Icon 없음
        tooltip: typeof eff?.Description === 'string' ? eff.Description : '',
        ...(typeof eff?.Level === 'number' && { level: eff.Level }),
        ...(typeof eff?.Grade === 'string' && { grade: eff.Grade }),
      }));
    }

    // 분기 2: 비-ArkPassive
    const engravings = Array.isArray(engravingData.Engravings) ? engravingData.Engravings : [];
    return engravings.map((engraving: any) => ({
      slot: typeof engraving?.Slot === 'number' ? engraving.Slot : 0,
      name: typeof engraving?.Name === 'string' ? engraving.Name : '',
      icon: typeof engraving?.Icon === 'string' ? engraving.Icon : '',
      tooltip: typeof engraving?.Tooltip === 'string' ? engraving.Tooltip : '',
    }));
  }

  /**
   * 아크 패시브 정규화. arkPassiveData 가 null/undefined 면 null 반환.
   * engravingEffects 는 본 메서드 시점에서 [] 로 두고, normalizeCharacterDetail 이
   * normalizeEngravings 결과로 채워 넣는다.
   */
  normalizeArkPassive(arkPassiveData: any): NormalizedArkPassive | null {
    if (!arkPassiveData) return null;

    const points = { evolution: 0, realization: 0, leap: 0 };
    if (Array.isArray(arkPassiveData.Points)) {
      for (const p of arkPassiveData.Points) {
        const v = typeof p?.Value === 'number' ? p.Value : 0;
        if (p?.Name === '진화') points.evolution = v;
        else if (p?.Name === '깨달음') points.realization = v;
        else if (p?.Name === '도약') points.leap = v;
      }
    }

    // legacy commandUtils.js:47 동일 패턴. Effects[0] 은 항상 깨달음 1티어.
    let realizationName: string | null = null;
    const firstEffect = Array.isArray(arkPassiveData.Effects) ? arkPassiveData.Effects[0] : null;
    if (firstEffect && typeof firstEffect.Description === 'string') {
      const m = firstEffect.Description.match(/>([^<]+)\s+Lv\./);
      if (m && m[1]) realizationName = m[1].trim();
    }

    return {
      isArkPassive: !!arkPassiveData.IsArkPassive,
      title: typeof arkPassiveData.Title === 'string' ? arkPassiveData.Title : '',
      points,
      realizationName,
      engravingEffects: [],
    };
  }

  /**
   * 카드 정보 정규화 (세트 효과 Effects 포함)
   */
  normalizeCards(cardData: any): {
    cards: Array<{
      slot: number;
      name: string;
      icon: string;
      awakeCount: number;
      awakeTotal: number;
      grade: string;
      tooltip: string;
    }>;
    effects: Array<{
      index: number;
      cardSlots: number[];
      items: Array<{ name: string; description: string }>;
    }>;
  } {
    const cards = (cardData?.Cards ?? []).map((card: any) => ({
      slot: card.Slot,
      name: card.Name,
      icon: card.Icon,
      awakeCount: card.AwakeCount,
      awakeTotal: card.AwakeTotal,
      grade: card.Grade,
      tooltip: card.Tooltip,
    }));

    const effects = (cardData?.Effects ?? []).map((effect: any) => ({
      index: effect.Index,
      cardSlots: Array.isArray(effect.CardSlots) ? effect.CardSlots : [],
      items: (effect.Items ?? []).map((item: any) => ({
        name: item.Name,
        description: item.Description,
      })),
    }));

    return { cards, effects };
  }

  /**
   * 보석 정보 정규화
   */
  normalizeGems(gemData: any): Array<{
    slot: number;
    name: string;
    icon: string;
    level: number;
    grade: string;
    tooltip: string;
  }> {
    const gems = gemData?.Gems ?? [];

    return gems.map((gem: any) => ({
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
  normalizeCombatSkills(skillData: any): Array<{
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
      grade?: string;
      tooltip?: string;
    };
  }> {
    // partial `/combat-skills` 엔드포인트는 bare 배열, full `/armories/characters/{name}` 은 `{CombatSkills: []}` wrap 객체로 반환.
    const skills = Array.isArray(skillData) ? skillData : (skillData?.CombatSkills ?? []);

    return skills.map((skill: any) => ({
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
            ...(typeof skill.Rune.Grade === 'string' && { grade: skill.Rune.Grade }),
            ...(typeof skill.Rune.Tooltip === 'string' && { tooltip: skill.Rune.Tooltip }),
          }
        : undefined,
    }));
  }

  /**
   * 아바타 정보 정규화
   */
  normalizeAvatars(avatarData: any): Array<{
    type: string;
    name: string;
    icon: string;
    grade: string;
    isSet: boolean;
    isInner: boolean;
    tooltip: string;
  }> {
    // partial `/avatars` 엔드포인트는 bare 배열, full 응답은 `{Avatars: []}` wrap 객체.
    const avatars = Array.isArray(avatarData) ? avatarData : (avatarData?.Avatars ?? []);

    return avatars.map((avatar: any) => ({
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
   * 증명의 전장 정보 정규화 (V9 실 응답 스키마 매핑)
   * - 비어있는 모드는 키 자체 생략 (optional)
   * - legacy 의 deathmatch 키는 폐기 (API 응답에 없음)
   */
  normalizeColosseums(colosseumData: any): Array<{
    seasonName: string;
    competitive?: unknown;
    teamDeathmatch?: unknown;
    teamElimination?: unknown;
    coOpBattle?: unknown;
    oneDeathmatch?: unknown;
    oneDeathmatchRank?: unknown;
  }> {
    const colosseums = colosseumData?.Colosseums ?? [];

    return colosseums.map((colosseum: any) => {
      const result: {
        seasonName: string;
        competitive?: unknown;
        teamDeathmatch?: unknown;
        teamElimination?: unknown;
        coOpBattle?: unknown;
        oneDeathmatch?: unknown;
        oneDeathmatchRank?: unknown;
      } = {
        seasonName: colosseum.SeasonName,
      };

      if (colosseum.Competitive != null) result.competitive = colosseum.Competitive;
      if (colosseum.TeamDeathmatch != null) result.teamDeathmatch = colosseum.TeamDeathmatch;
      if (colosseum.TeamElimination != null) result.teamElimination = colosseum.TeamElimination;
      if (colosseum.CoOpBattle != null) result.coOpBattle = colosseum.CoOpBattle;
      if (colosseum.OneDeathmatch != null) result.oneDeathmatch = colosseum.OneDeathmatch;
      if (colosseum.OneDeathmatchRank != null) {
        result.oneDeathmatchRank = colosseum.OneDeathmatchRank;
      }

      return result;
    });
  }

  /**
   * 수집품 정보 정규화
   */
  normalizeCollectibles(collectibleData: any): Array<{
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
    // partial `/collectibles` 와 full 응답 모두 bare 배열이지만, 과거 wrap 형태 호환을 위해 양쪽 모두 허용.
    const collectibles = Array.isArray(collectibleData)
      ? collectibleData
      : (collectibleData?.Collectibles ?? []);

    return collectibles.map((collectible: any) => ({
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
    // CharacterName 필드가 있으면 우선 사용 (공식 API 필드)
    if (profile.CharacterName) {
      return profile.CharacterName as string;
    }
    // 방어적 fallback: CharacterImage URL에서 캐릭터명 추출 시도
    const imageUrl = profile.CharacterImage as string | undefined;
    if (imageUrl) {
      const match = imageUrl.match(/\/armory\/[^\/]+\/([^\/]+)\.jpg/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    return '';
  }

  /**
   * 서버명 추출
   */
  private extractServerName(profile: any): string {
    return (profile.ServerName as string) ?? '';
  }

  /**
   * 클래스명 추출
   */
  private extractClassName(profile: any): string {
    return (profile.CharacterClassName as string) ?? '';
  }

  /**
   * 아이템 레벨 계산
   */
  private calculateItemLevel(profile: any): number {
    // ItemAvgLevel 은 "1,620.00" 형식의 문자열
    const raw = profile.ItemAvgLevel as string | undefined;
    if (!raw) return 0;
    return parseFloat(raw.replace(/,/g, '')) || 0;
  }

  /**
   * 전투력 파싱. CombatPower 는 "4,351.68" 형식 문자열.
   */
  private parseCombatPower(raw: unknown): number {
    if (typeof raw !== 'string' || raw.length === 0) return 0;
    return parseFloat(raw.replace(/,/g, '')) || 0;
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

// === 모듈 헬퍼 — 어빌리티 스톤 raw HTML 파싱 ===

/** HTML 태그 (`<...>`) 전부 제거. content 외 문자는 보존. */
function stripHtmlTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, '');
}

/**
 * `[...]` 안 첫 토큰을 trim 하여 반환.
 * 내부 `<FONT>` 류 태그를 먼저 제거한 후 매치. 매치 실패 시 빈 문자열.
 */
function extractBracketName(raw: string): string {
  const stripped = stripHtmlTags(raw);
  const m = stripped.match(/\[([^\]]+)\]/);
  return m && m[1] ? m[1].trim() : '';
}

// === 싱글톤 인스턴스 ===

/**
 * ARMORIES 정규화 모듈 인스턴스
 */
export const armoriesNormalizer = new ArmoriesNormalizer();
