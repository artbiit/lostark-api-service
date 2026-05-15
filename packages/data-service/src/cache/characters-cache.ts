/**
 * @cursor-change: 2025-01-27, v1.0.0, CHARACTERS API 캐시 관리 모듈 생성
 *
 * CHARACTERS API 캐시 관리 모듈
 * - 계정 정보 캐싱
 * - TTL 관리
 * - 캐시 키 설계
 */

import { logger } from '@lostark/shared';
import { AccountCacheMetadata, AccountInfo } from '@lostark/shared/types/domain';

// === 캐시 키 설계 ===

/**
 * 캐시 키 생성 함수들
 */
export const cacheKeys = {
  // 계정 정보
  account: (accountId: string) => `account:${accountId}`,

  // 캐릭터별 계정 매핑
  characterAccount: (characterName: string) => `char:${characterName}:account`,

  // 계정별 캐릭터 목록
  accountCharacters: (accountId: string) => `account:${accountId}:characters`,

  // 캐시 메타데이터
  accountMetadata: (accountId: string) => `account:${accountId}:metadata`,

  // 사용 패턴 추적
  usage: (characterName: string) => `usage:${characterName}`,

  // Rate Limit 추적
  rateLimit: () => `ratelimit:characters`,
} as const;

// === 캐시 관리자 ===

/**
 * CHARACTERS API 캐시 관리자
 */
export class CharactersCache {
  private readonly memoryCache = new Map<string, { data: any; expires: number }>();
  private readonly defaultTTL = 300; // 5분

  /**
   * 계정 정보 저장
   */
  async setAccountInfo(accountInfo: AccountInfo, ttl?: number): Promise<void> {
    const key = cacheKeys.account(accountInfo.accountId);
    const metadataKey = cacheKeys.accountMetadata(accountInfo.accountId);
    const expires = Date.now() + (ttl || this.defaultTTL) * 1000;

    try {
      // 메모리 캐시에 저장
      this.memoryCache.set(key, {
        data: accountInfo,
        expires,
      });

      // 캐릭터별 계정 매핑 저장
      for (const character of accountInfo.characters) {
        const charKey = cacheKeys.characterAccount(character.characterName);
        this.memoryCache.set(charKey, {
          data: accountInfo.accountId,
          expires,
        });
      }

      // 메타데이터 저장
      const metadata: AccountCacheMetadata = {
        contentHash: this.generateContentHash(accountInfo),
        lastFetched: new Date(),
        ttl: ttl || this.defaultTTL,
        version: '1.0.0',
      };

      this.memoryCache.set(metadataKey, {
        data: metadata,
        expires,
      });

      logger.info('Account info cached successfully', {
        accountId: accountInfo.accountId,
        characterCount: accountInfo.characters.length,
        ttl: ttl || this.defaultTTL,
        requestId: this.generateRequestId(),
      });
    } catch (error) {
      logger.error('Failed to cache account info', {
        accountId: accountInfo.accountId,
        error: error instanceof Error ? error.message : String(error),
        requestId: this.generateRequestId(),
      });
      throw error;
    }
  }

  /**
   * 계정 정보 조회
   */
  async getAccountInfo(accountId: string): Promise<AccountInfo | null> {
    const key = cacheKeys.account(accountId);

    try {
      const cached = this.memoryCache.get(key);

      if (!cached) {
        logger.debug('Account info not found in cache', {
          accountId,
          requestId: this.generateRequestId(),
        });
        return null;
      }

      if (Date.now() > cached.expires) {
        logger.debug('Account info cache expired', {
          accountId,
          expires: new Date(cached.expires),
          requestId: this.generateRequestId(),
        });
        this.memoryCache.delete(key);
        return null;
      }

      logger.debug('Account info retrieved from cache', {
        accountId,
        requestId: this.generateRequestId(),
      });

      return cached.data as AccountInfo;
    } catch (error) {
      logger.error('Failed to retrieve account info from cache', {
        accountId,
        error: error instanceof Error ? error.message : String(error),
        requestId: this.generateRequestId(),
      });
      return null;
    }
  }

  /**
   * 캐릭터명으로 계정 정보 조회
   */
  async getAccountByCharacter(characterName: string): Promise<AccountInfo | null> {
    const charKey = cacheKeys.characterAccount(characterName);

    try {
      const cached = this.memoryCache.get(charKey);

      if (!cached || Date.now() > cached.expires) {
        if (cached) {
          this.memoryCache.delete(charKey);
        }
        return null;
      }

      const accountId = cached.data as string;
      return await this.getAccountInfo(accountId);
    } catch (error) {
      logger.error('Failed to retrieve account by character', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        requestId: this.generateRequestId(),
      });
      return null;
    }
  }

  /**
   * 계정 정보 삭제
   */
  async deleteAccountInfo(accountId: string): Promise<void> {
    try {
      // 계정 정보 조회하여 캐릭터 목록 확인
      const accountInfo = await this.getAccountInfo(accountId);

      if (accountInfo) {
        // 캐릭터별 매핑 삭제
        for (const character of accountInfo.characters) {
          const charKey = cacheKeys.characterAccount(character.characterName);
          this.memoryCache.delete(charKey);
        }
      }

      // 계정 관련 키들 삭제
      const keys = [
        cacheKeys.account(accountId),
        cacheKeys.accountMetadata(accountId),
        cacheKeys.accountCharacters(accountId),
      ];

      for (const key of keys) {
        this.memoryCache.delete(key);
      }

      logger.info('Account info deleted from cache', {
        accountId,
        requestId: this.generateRequestId(),
      });
    } catch (error) {
      logger.error('Failed to delete account info from cache', {
        accountId,
        error: error instanceof Error ? error.message : String(error),
        requestId: this.generateRequestId(),
      });
      throw error;
    }
  }

  /**
   * 캐시 만료 시간 확인
   */
  async isExpired(accountId: string): Promise<boolean> {
    const key = cacheKeys.account(accountId);
    const cached = this.memoryCache.get(key);

    if (!cached) {
      return true;
    }

    return Date.now() > cached.expires;
  }

  /**
   * 캐시 메타데이터 조회
   */
  async getCacheMetadata(accountId: string): Promise<AccountCacheMetadata | null> {
    const key = cacheKeys.accountMetadata(accountId);
    const cached = this.memoryCache.get(key);

    if (!cached || Date.now() > cached.expires) {
      return null;
    }

    return cached.data as AccountCacheMetadata;
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats(): {
    totalEntries: number;
    expiredEntries: number;
    memoryUsage: number;
  } {
    const now = Date.now();
    let expiredCount = 0;
    let totalCount = 0;

    for (const [key, value] of this.memoryCache.entries()) {
      totalCount++;
      if (now > value.expires) {
        expiredCount++;
        this.memoryCache.delete(key);
      }
    }

    return {
      totalEntries: totalCount,
      expiredEntries: expiredCount,
      memoryUsage: this.memoryCache.size,
    };
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.memoryCache.entries()) {
      if (now > value.expires) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cache cleanup completed', {
        cleanedCount,
        remainingCount: this.memoryCache.size,
        requestId: this.generateRequestId(),
      });
    }
  }

  /**
   * 내용 해시 생성
   */
  private generateContentHash(data: any): string {
    const normalized = JSON.stringify(data, Object.keys(data).sort());
    return Buffer.from(normalized).toString('base64').substring(0, 16);
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `char-cache-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === 싱글톤 인스턴스 ===

/**
 * CHARACTERS API 캐시 관리자 인스턴스
 */
export const charactersCache = new CharactersCache();

// === 정기 정리 스케줄러 ===

/**
 * 캐시 정리 스케줄러
 */
export function startCacheCleanupScheduler(): NodeJS.Timeout {
  return setInterval(() => {
    charactersCache.cleanup();
  }, 60000); // 1분마다 정리
}
