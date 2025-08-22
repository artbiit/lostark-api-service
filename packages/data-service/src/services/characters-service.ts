/**
 * @cursor-change: 2025-01-27, v1.0.0, CHARACTERS API 메인 서비스 생성
 *
 * CHARACTERS API 메인 서비스
 * - siblings API 호출부터 캐시 저장까지 완전한 파이프라인
 * - 변화 감지 및 ARMORIES 큐 연동
 * - 에러 처리 및 로깅
 */

import { logger } from '@lostark/shared';
import { AccountInfo, CharacterChangeDetection } from '@lostark/shared/types/domain';
import { CharacterSiblingsResponseV9 } from '@lostark/shared/types/V9';

import { charactersCache, startCacheCleanupScheduler } from '../cache/characters-cache.js';
import { charactersClient } from '../clients/characters-client.js';
import { charactersNormalizer } from '../normalizers/characters-normalizer.js';

import { armoriesService } from './armories-service.js';

// === ARMORIES 큐 인터페이스 ===

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

// === CHARACTERS API 서비스 ===

/**
 * CHARACTERS API 메인 서비스
 */
export class CharactersService {
  private armoriesQueueManager?: ArmoriesQueueManager;
  private cleanupScheduler?: NodeJS.Timeout | undefined;

  constructor() {
    // 캐시 정리 스케줄러 시작
    this.cleanupScheduler = startCacheCleanupScheduler();

    // ARMORIES 큐 관리자 자동 설정
    this.setArmoriesQueueManager(armoriesService);
  }

  /**
   * ARMORIES 큐 관리자 설정
   */
  setArmoriesQueueManager(queueManager: ArmoriesQueueManager): void {
    this.armoriesQueueManager = queueManager;
  }

  /**
   * 캐릭터 siblings 정보 처리 (메인 엔트리 포인트)
   */
  async processCharacterSiblings(characterName: string): Promise<{
    accountInfo: AccountInfo;
    changes: CharacterChangeDetection | null;
    queueItems: ArmoriesQueueItem[];
  }> {
    const requestId = this.generateRequestId();

    logger.info('Starting character siblings processing', {
      characterName,
      requestId,
    });

    try {
      // 1. 캐시에서 기존 계정 정보 확인
      const existingAccount = await charactersCache.getAccountByCharacter(characterName);

      // 2. API에서 최신 siblings 데이터 조회
      const siblingsData = await charactersClient.getSiblings(characterName);

      // 3. 데이터 처리
      if (existingAccount) {
        // 기존 계정이 있는 경우: 변화 감지 및 업데이트
        return await this.handleExistingAccount(existingAccount, siblingsData, requestId);
      } else {
        // 새 계정인 경우: 새로 생성
        return await this.handleNewAccount(characterName, siblingsData, requestId);
      }
    } catch (error) {
      logger.error('Failed to process character siblings', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });
      throw error;
    }
  }

  /**
   * 기존 계정 처리
   */
  private async handleExistingAccount(
    existingAccount: AccountInfo,
    siblingsData: CharacterSiblingsResponseV9,
    requestId: string,
  ): Promise<{
    accountInfo: AccountInfo;
    changes: CharacterChangeDetection | null;
    queueItems: ArmoriesQueueItem[];
  }> {
    logger.info('Processing existing account', {
      accountId: existingAccount.accountId,
      characterCount: existingAccount.characters.length,
      requestId,
    });

    // 1. 변화 감지
    const changes = await charactersNormalizer.detectChanges(existingAccount, siblingsData);

    // 2. 계정 정보 업데이트
    const updatedAccount = await charactersNormalizer.updateAccountInfo(
      existingAccount,
      siblingsData,
    );

    // 3. 캐시에 저장
    await charactersCache.setAccountInfo(updatedAccount);

    // 4. ARMORIES 큐 항목 생성
    const queueItems = charactersNormalizer.generateArmoriesQueueItems(changes);

    // 5. 큐에 추가 (변화가 있는 경우만)
    if (queueItems.length > 0 && this.armoriesQueueManager) {
      const armoriesItems: ArmoriesQueueItem[] = queueItems.map((item) => ({
        characterName: item.characterName,
        reason: item.reason,
        priority: item.priority,
        accountId: existingAccount.accountId,
        queuedAt: new Date(),
      }));

      await this.armoriesQueueManager.addToQueue(armoriesItems);

      logger.info('Added items to ARMORIES queue', {
        accountId: existingAccount.accountId,
        queueItemCount: armoriesItems.length,
        requestId,
      });
    }

    return {
      accountInfo: updatedAccount,
      changes: changes.changes.length > 0 ? changes : null,
      queueItems: queueItems.map((item) => ({
        ...item,
        accountId: existingAccount.accountId,
        queuedAt: new Date(),
      })),
    };
  }

  /**
   * 새 계정 처리
   */
  private async handleNewAccount(
    characterName: string,
    siblingsData: CharacterSiblingsResponseV9,
    requestId: string,
  ): Promise<{
    accountInfo: AccountInfo;
    changes: CharacterChangeDetection | null;
    queueItems: ArmoriesQueueItem[];
  }> {
    logger.info('Processing new account', {
      characterName,
      characterCount: siblingsData.length,
      requestId,
    });

    // 1. 계정 정보 생성
    const accountInfo = await charactersNormalizer.normalizeSiblings(characterName, siblingsData);

    // 2. 캐시에 저장
    await charactersCache.setAccountInfo(accountInfo);

    // 3. 모든 캐릭터를 ARMORIES 큐에 추가 (새 계정이므로)
    const queueItems: ArmoriesQueueItem[] = accountInfo.characters.map(
      (character: { characterName: string }) => ({
        characterName: character.characterName,
        reason: 'new_account',
        priority: 2,
        accountId: accountInfo.accountId,
        queuedAt: new Date(),
      }),
    );

    // 4. 큐에 추가
    if (this.armoriesQueueManager) {
      await this.armoriesQueueManager.addToQueue(queueItems);

      logger.info('Added new account characters to ARMORIES queue', {
        accountId: accountInfo.accountId,
        queueItemCount: queueItems.length,
        requestId,
      });
    }

    return {
      accountInfo,
      changes: null, // 새 계정이므로 변화 없음
      queueItems,
    };
  }

  /**
   * 계정 정보 조회
   */
  async getAccountInfo(characterName: string): Promise<AccountInfo | null> {
    return await charactersCache.getAccountByCharacter(characterName);
  }

  /**
   * 계정 정보 강제 갱신
   */
  async refreshAccountInfo(characterName: string): Promise<AccountInfo> {
    logger.info('Force refreshing account info', {
      characterName,
      requestId: this.generateRequestId(),
    });

    // 캐시에서 기존 정보 삭제
    const existingAccount = await charactersCache.getAccountByCharacter(characterName);
    if (existingAccount) {
      await charactersCache.deleteAccountInfo(existingAccount.accountId);
    }

    // 새로 처리
    const result = await this.processCharacterSiblings(characterName);
    return result.accountInfo;
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats(): ReturnType<typeof charactersCache.getCacheStats> {
    return charactersCache.getCacheStats();
  }

  /**
   * 서비스 정리
   */
  async cleanup(): Promise<void> {
    if (this.cleanupScheduler) {
      clearInterval(this.cleanupScheduler);
      this.cleanupScheduler = undefined;
    }

    logger.info('Characters service cleanup completed');
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `char-service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === 싱글톤 인스턴스 ===

/**
 * CHARACTERS API 서비스 인스턴스
 */
export const charactersService = new CharactersService();
