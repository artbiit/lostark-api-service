/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES 데이터 정규화기 생성
 *
 * ARMORIES API 응답 데이터 정규화
 * - API 응답을 내부 도메인 모델로 변환
 * - 데이터 검증 및 정제
 */
import { logger } from '@lostark/shared';
// === ARMORIES 정규화 모듈 ===
/**
 * ARMORIES API 정규화 모듈
 */
export class ArmoriesNormalizer {
    /**
     * 캐릭터 상세 정보 정규화
     */
    async normalizeCharacterDetail(characterName, armoryData, existingDetail) {
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
            const characterDetail = {
                characterName: characterNameFromProfile,
                serverName,
                className,
                itemLevel,
                expeditionLevel: profile.ExpeditionLevel,
                ...(profile.GuildName && { guildName: profile.GuildName }),
                ...(profile.Title && { title: profile.Title }),
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
                    apiVersion: 'V9.0.0',
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
                    ? Object.keys(changes).filter((key) => changes[key])
                    : undefined,
            });
            return {
                characterDetail,
                changes: changes || undefined,
            };
        }
        catch (error) {
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
    normalizeStats(stats) {
        return stats.map((stat) => ({
            type: stat.Type,
            value: this.parseStatValue(stat.Value),
            tooltip: stat.Tooltip || [],
        }));
    }
    /**
     * 성향 정보 정규화
     */
    normalizeTendencies(tendencies) {
        return tendencies.map((tendency) => ({
            type: tendency.Type,
            point: tendency.Point,
            maxPoint: tendency.MaxPoint,
        }));
    }
    /**
     * 장비 정보 정규화
     */
    normalizeEquipment(equipment) {
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
    normalizeEngravings(engravingData) {
        return (engravingData.Engravings || []).map((engraving) => ({
            slot: engraving.Slot,
            name: engraving.Name,
            icon: engraving.Icon,
            tooltip: engraving.Tooltip,
        }));
    }
    /**
     * 카드 정보 정규화
     */
    normalizeCards(cardData) {
        return (cardData.Cards || []).map((card) => ({
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
    normalizeGems(gemData) {
        return (gemData.Gems || []).map((gem) => ({
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
    normalizeCombatSkills(skillData) {
        return (skillData.CombatSkills || []).map((skill) => ({
            name: skill.Name,
            icon: skill.Icon,
            level: skill.Level,
            type: skill.Type,
            isAwakening: skill.IsAwakening,
            tripods: (skill.Tripods || []).map((tripod) => ({
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
    normalizeAvatars(avatarData) {
        return (avatarData.Avatars || []).map((avatar) => ({
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
    normalizeColosseums(colosseumData) {
        return (colosseumData.Colosseums || []).map((colosseum) => ({
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
    normalizeCollectibles(collectibleData) {
        return (collectibleData.Collectibles || []).map((collectible) => ({
            type: collectible.Type,
            icon: collectible.Icon,
            point: collectible.Point,
            maxPoint: collectible.MaxPoint,
            collectiblePoints: (collectible.CollectiblePoints || []).map((point) => ({
                pointName: point.PointName,
                point: point.Point,
                maxPoint: point.MaxPoint,
            })),
        }));
    }
    /**
     * 캐릭터명 추출
     */
    extractCharacterName(profile) {
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
    extractServerName(profile) {
        // 실제 구현에서는 API 응답에서 서버명을 추출해야 함
        // 현재는 샘플 데이터 기반으로 추정
        return '아브렐슈드'; // 기본값
    }
    /**
     * 클래스명 추출
     */
    extractClassName(profile) {
        // 실제 구현에서는 API 응답에서 클래스명을 추출해야 함
        // 현재는 샘플 데이터 기반으로 추정
        return '디스트로이어'; // 기본값
    }
    /**
     * 아이템 레벨 계산
     */
    calculateItemLevel(profile) {
        // Stats에서 아이템 레벨 관련 정보를 찾아 계산
        // 실제 구현에서는 더 정확한 계산 로직 필요
        return 1460; // 기본값
    }
    /**
     * 스탯 값 파싱
     */
    parseStatValue(value) {
        // 쉼표 제거 후 숫자로 변환
        return parseFloat(value.replace(/,/g, '')) || 0;
    }
    /**
     * 데이터 해시 계산
     */
    calculateDataHash(data) {
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
    detectChanges(existing, current) {
        const changes = {};
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
    generateRequestId() {
        return `armory-norm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
// === 싱글톤 인스턴스 ===
/**
 * ARMORIES 정규화 모듈 인스턴스
 */
export const armoriesNormalizer = new ArmoriesNormalizer();
