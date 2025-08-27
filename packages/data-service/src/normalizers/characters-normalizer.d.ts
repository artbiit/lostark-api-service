/**
 * @cursor-change: 2025-01-27, v1.0.0, CHARACTERS API ETL 모듈 생성
 *
 * CHARACTERS API ETL 모듈
 * - siblings 데이터를 계정 정보로 변환
 * - 변화 감지 및 ARMORIES 큐 연동
 * - 캐시 관리
 */
import { AccountInfo, CharacterChangeDetection } from '@lostark/shared/types/domain';
import { CharacterSiblingsResponseV9 } from '@lostark/shared/types/V9';
/**
 * CHARACTERS API ETL 모듈
 */
export declare class CharactersNormalizer {
    private readonly defaultTTL;
    /**
     * siblings 데이터를 계정 정보로 변환
     */
    normalizeSiblings(characterName: string, siblingsData: CharacterSiblingsResponseV9): Promise<AccountInfo>;
    /**
     * 계정 정보 변화 감지
     */
    detectChanges(currentAccount: AccountInfo, newSiblingsData: CharacterSiblingsResponseV9): Promise<CharacterChangeDetection>;
    /**
     * 계정 정보 업데이트
     */
    updateAccountInfo(currentAccount: AccountInfo, newSiblingsData: CharacterSiblingsResponseV9): Promise<AccountInfo>;
    /**
     * ARMORIES 큐 항목 생성
     */
    generateArmoriesQueueItems(detection: CharacterChangeDetection): Array<{
        characterName: string;
        reason: string;
        priority: number;
    }>;
    /**
     * 요청 ID 생성
     */
    private generateRequestId;
}
/**
 * CHARACTERS API ETL 모듈 인스턴스
 */
export declare const charactersNormalizer: CharactersNormalizer;
