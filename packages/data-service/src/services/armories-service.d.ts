/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES 서비스 생성
 *
 * ARMORIES API 서비스
 * - 캐릭터 상세 정보 조회 및 캐싱
 * - 데이터 정규화 및 검증
 * - 에러 처리 및 로깅
 */
import { armoriesCache } from '../cache/armories-cache.js';
import { cacheManager } from '../cache/cache-manager.js';
import { NormalizedCharacterDetail } from '../normalizers/armories-normalizer.js';
/**
 * ARMORIES 큐 항목
 */
export interface ArmoriesQueueItem {
    characterName: string;
    reason: string;
    priority: number;
    accountId?: string;
    queuedAt: Date;
}
/**
 * 처리 결과
 */
export interface ProcessingResult {
    characterDetail: NormalizedCharacterDetail;
    changes?: {
        itemLevelChanged?: boolean;
        equipmentChanged?: boolean;
        engravingsChanged?: boolean;
        gemsChanged?: boolean;
    } | undefined;
    processingTime: number;
    cacheHit: boolean;
}
/**
 * ARMORIES API 메인 서비스
 */
export declare class ArmoriesService {
    private cleanupScheduler?;
    private processingQueue;
    private isProcessing;
    constructor();
    /**
     * 큐에 항목 추가
     */
    addToQueue(items: ArmoriesQueueItem[]): Promise<void>;
    /**
     * 큐 처리
     */
    private processQueue;
    /**
     * 큐 항목 처리
     */
    private processQueueItem;
    /**
     * 캐릭터 상세 정보 처리 (메인 엔트리 포인트)
     */
    processCharacterDetail(characterName: string): Promise<ProcessingResult>;
    /**
     * 캐릭터 상세 정보 조회
     */
    getCharacterDetail(characterName: string): Promise<NormalizedCharacterDetail | null>;
    /**
     * 캐릭터 상세 정보 강제 갱신
     */
    refreshCharacterDetail(characterName: string): Promise<NormalizedCharacterDetail>;
    /**
     * 캐릭터 상세 정보 부분 조회
     */
    getCharacterDetailPartial(characterName: string, sections: Array<'profile' | 'equipment' | 'avatars' | 'combat-skills' | 'engravings' | 'cards' | 'gems' | 'colosseums' | 'collectibles'>): Promise<Partial<NormalizedCharacterDetail> | null>;
    /**
     * 캐시 통계 조회
     */
    getCacheStats(): Promise<ReturnType<typeof cacheManager.getCacheStats>>;
    /**
     * 큐 상태 조회
     */
    getQueueStatus(): {
        queueSize: number;
        isProcessing: boolean;
        nextItems: Array<{
            characterName: string;
            reason: string;
            priority: number;
        }>;
    };
    /**
     * 자주 조회되는 캐릭터 목록
     */
    getFrequentlyAccessedCharacters(limit?: number): ReturnType<typeof armoriesCache.getFrequentlyAccessedCharacters>;
    /**
     * 서비스 정리
     */
    cleanup(): Promise<void>;
    /**
     * 요청 ID 생성
     */
    private generateRequestId;
}
/**
 * ARMORIES API 서비스 인스턴스
 */
export declare const armoriesService: ArmoriesService;
