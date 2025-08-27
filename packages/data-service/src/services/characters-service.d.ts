/**
 * @cursor-change: 2025-01-27, v1.0.0, CHARACTERS API 메인 서비스 생성
 *
 * CHARACTERS API 메인 서비스
 * - siblings API 호출부터 캐시 저장까지 완전한 파이프라인
 * - 변화 감지 및 ARMORIES 큐 연동
 * - 에러 처리 및 로깅
 */
import { AccountInfo, CharacterChangeDetection } from '@lostark/shared/types/domain';
import { charactersCache } from '../cache/characters-cache.js';
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
 * ARMORIES 큐 관리자 인터페이스
 */
export interface ArmoriesQueueManager {
    addToQueue(items: ArmoriesQueueItem[]): Promise<void>;
}
/**
 * CHARACTERS API 메인 서비스
 */
export declare class CharactersService {
    private armoriesQueueManager?;
    private cleanupScheduler?;
    constructor();
    /**
     * ARMORIES 큐 관리자 설정
     */
    setArmoriesQueueManager(queueManager: ArmoriesQueueManager): void;
    /**
     * 캐릭터 siblings 정보 처리 (메인 엔트리 포인트)
     */
    processCharacterSiblings(characterName: string): Promise<{
        accountInfo: AccountInfo;
        changes: CharacterChangeDetection | null;
        queueItems: ArmoriesQueueItem[];
    }>;
    /**
     * 기존 계정 처리
     */
    private handleExistingAccount;
    /**
     * 새 계정 처리
     */
    private handleNewAccount;
    /**
     * 계정 정보 조회
     */
    getAccountInfo(characterName: string): Promise<AccountInfo | null>;
    /**
     * 계정 정보 강제 갱신
     */
    refreshAccountInfo(characterName: string): Promise<AccountInfo>;
    /**
     * 캐시 통계 조회
     */
    getCacheStats(): ReturnType<typeof charactersCache.getCacheStats>;
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
 * CHARACTERS API 서비스 인스턴스
 */
export declare const charactersService: CharactersService;
