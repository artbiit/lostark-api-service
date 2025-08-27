/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES 데이터 정규화기 생성
 *
 * ARMORIES API 응답 데이터 정규화
 * - API 응답을 내부 도메인 모델로 변환
 * - 데이터 검증 및 정제
 */
import { ArmoryCharacterV9 } from '@lostark/shared/types/V9/armories.js';
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
    changes?: {
        itemLevelChanged?: boolean;
        equipmentChanged?: boolean;
        engravingsChanged?: boolean;
        gemsChanged?: boolean;
    } | undefined;
}
/**
 * ARMORIES API 정규화 모듈
 */
export declare class ArmoriesNormalizer {
    /**
     * 캐릭터 상세 정보 정규화
     */
    normalizeCharacterDetail(characterName: string, armoryData: ArmoryCharacterV9, existingDetail?: NormalizedCharacterDetail): Promise<NormalizationResult>;
    /**
     * 스탯 정보 정규화
     */
    private normalizeStats;
    /**
     * 성향 정보 정규화
     */
    private normalizeTendencies;
    /**
     * 장비 정보 정규화
     */
    private normalizeEquipment;
    /**
     * 각인 정보 정규화
     */
    private normalizeEngravings;
    /**
     * 카드 정보 정규화
     */
    private normalizeCards;
    /**
     * 보석 정보 정규화
     */
    private normalizeGems;
    /**
     * 전투 스킬 정보 정규화
     */
    private normalizeCombatSkills;
    /**
     * 아바타 정보 정규화
     */
    private normalizeAvatars;
    /**
     * 증명의 전장 정보 정규화
     */
    private normalizeColosseums;
    /**
     * 수집품 정보 정규화
     */
    private normalizeCollectibles;
    /**
     * 캐릭터명 추출
     */
    private extractCharacterName;
    /**
     * 서버명 추출
     */
    private extractServerName;
    /**
     * 클래스명 추출
     */
    private extractClassName;
    /**
     * 아이템 레벨 계산
     */
    private calculateItemLevel;
    /**
     * 스탯 값 파싱
     */
    private parseStatValue;
    /**
     * 데이터 해시 계산
     */
    private calculateDataHash;
    /**
     * 변화 감지
     */
    private detectChanges;
    /**
     * 요청 ID 생성
     */
    private generateRequestId;
}
/**
 * ARMORIES 정규화 모듈 인스턴스
 */
export declare const armoriesNormalizer: ArmoriesNormalizer;
