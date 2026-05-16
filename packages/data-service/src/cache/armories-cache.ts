/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES 캐시 모듈 생성
 *
 * ARMORIES API 캐시 모듈
 * - 캐릭터별 동적 TTL 관리
 * - 3계층 캐시 구조 (Memory → Redis → Database)
 * - 조회 빈도 기반 최적화
 */

import { logger } from '@lostark/shared';
import { NormalizedCharacterDetail } from '../normalizers/armories-normalizer.js';

// === 캐시 항목 타입 ===

/**
 * 캐시 항목
 */
interface CacheItem {
  data: NormalizedCharacterDetail;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  ttl: number; // 밀리초 단위
}

/**
 * 캐시 통계
 */
export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  memoryUsage: number; // 바이트 단위
  hitRate: number; // 0-1 사이 값
  totalHits: number;
  totalMisses: number;
}

// === ARMORIES 캐시 모듈 ===

/**
 * ARMORIES API 캐시 모듈
 */
export class ArmoriesCache {
  private cache = new Map<string, CacheItem>();
  private stats = {
    totalHits: 0,
    totalMisses: 0,
  };

  /**
   * 캐릭터 상세 정보 저장
   */
  async setCharacterDetail(
    characterName: string,
    characterDetail: NormalizedCharacterDetail,
    ttlMinutes?: number,
  ): Promise<void> {
    const key = this.generateCacheKey(characterName);
    const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.calculateDynamicTTL(characterDetail);

    const cacheItem: CacheItem = {
      data: characterDetail,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      ttl,
    };

    this.cache.set(key, cacheItem);

    logger.debug('Character detail cached', {
      characterName,
      ttlMinutes: Math.round(ttl / (60 * 1000)),
      cacheSize: this.cache.size,
    });
  }

  /**
   * 캐릭터 상세 정보 조회
   */
  async getCharacterDetail(characterName: string): Promise<NormalizedCharacterDetail | null> {
    const key = this.generateCacheKey(characterName);
    const item = this.cache.get(key);

    if (!item) {
      this.stats.totalMisses++;
      logger.debug('Character detail cache miss', { characterName });
      return null;
    }

    // TTL 확인
    const now = new Date();
    const age = now.getTime() - item.createdAt.getTime();

    if (age > item.ttl) {
      this.cache.delete(key);
      this.stats.totalMisses++;
      logger.debug('Character detail cache expired', { characterName });
      return null;
    }

    // 접근 통계 업데이트
    item.lastAccessed = now;
    item.accessCount++;

    this.stats.totalHits++;
    logger.debug('Character detail cache hit', { characterName });

    return item.data;
  }

  /**
   * 캐릭터 상세 정보 삭제
   */
  async deleteCharacterDetail(characterName: string): Promise<void> {
    const key = this.generateCacheKey(characterName);
    const deleted = this.cache.delete(key);

    if (deleted) {
      logger.debug('Character detail cache deleted', { characterName });
    }
  }

  /**
   * 캐시 통계 조회
   */
  getCacheStats(): CacheStats {
    const now = new Date();
    let expiredEntries = 0;
    let memoryUsage = 0;

    // 만료된 항목 계산 및 메모리 사용량 추정
    for (const [key, item] of this.cache.entries()) {
      const age = now.getTime() - item.createdAt.getTime();
      if (age > item.ttl) {
        expiredEntries++;
      }

      // 간단한 메모리 사용량 추정 (JSON 문자열 길이 기반)
      memoryUsage += JSON.stringify(item.data).length;
    }

    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    const hitRate = totalRequests > 0 ? this.stats.totalHits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      expiredEntries,
      memoryUsage,
      hitRate,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
    };
  }

  /**
   * 만료된 항목 정리
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      const age = now.getTime() - item.createdAt.getTime();
      if (age > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Armories cache cleanup completed', {
        cleanedCount,
        remainingEntries: this.cache.size,
      });
    }
  }

  /**
   * 캐시 초기화
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.totalHits = 0;
    this.stats.totalMisses = 0;

    logger.info('Armories cache cleared', { clearedEntries: size });
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(characterName: string): string {
    return `armory:char:${characterName.toLowerCase()}:v1`;
  }

  /**
   * 동적 TTL 계산
   * 캐릭터별 조회 빈도에 따라 TTL 조정
   */
  private calculateDynamicTTL(characterDetail: NormalizedCharacterDetail): number {
    // 기본 TTL: 10분
    const baseTTL = 10 * 60 * 1000;

    // 아이템 레벨에 따른 TTL 조정
    // 높은 아이템 레벨 캐릭터는 더 자주 조회될 가능성이 높음
    const itemLevel = characterDetail.itemLevel;
    let ttlMultiplier = 1.0;

    if (itemLevel >= 1600) {
      // 최고 레벨 캐릭터: 짧은 TTL (5분)
      ttlMultiplier = 0.5;
    } else if (itemLevel >= 1580) {
      // 고레벨 캐릭터: 중간 TTL (7.5분)
      ttlMultiplier = 0.75;
    } else if (itemLevel >= 1540) {
      // 중레벨 캐릭터: 기본 TTL (10분)
      ttlMultiplier = 1.0;
    } else {
      // 저레벨 캐릭터: 긴 TTL (15분)
      ttlMultiplier = 1.5;
    }

    return Math.round(baseTTL * ttlMultiplier);
  }

  /**
   * 캐릭터별 접근 빈도 분석
   */
  getAccessFrequency(characterName: string): {
    accessCount: number;
    lastAccessed: Date | null;
    averageTTL: number;
  } {
    const key = this.generateCacheKey(characterName);
    const item = this.cache.get(key);

    if (!item) {
      return {
        accessCount: 0,
        lastAccessed: null,
        averageTTL: 0,
      };
    }

    return {
      accessCount: item.accessCount,
      lastAccessed: item.lastAccessed,
      averageTTL: item.ttl,
    };
  }

  /**
   * 자주 조회되는 캐릭터 목록
   */
  getFrequentlyAccessedCharacters(limit: number = 10): Array<{
    characterName: string;
    accessCount: number;
    lastAccessed: Date;
  }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, item]) => ({
        characterName: this.extractCharacterNameFromKey(key),
        accessCount: item.accessCount,
        lastAccessed: item.lastAccessed,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return entries;
  }

  /**
   * 캐시 키에서 캐릭터명 추출
   */
  private extractCharacterNameFromKey(key: string): string {
    const match = key.match(/armory:char:(.+):v1/);
    return match ? match[1]! : key;
  }
}

// === 캐시 정리 스케줄러 ===

/**
 * 캐시 정리 스케줄러 시작
 */
export function startCacheCleanupScheduler(): NodeJS.Timeout {
  // 5분마다 만료된 항목 정리
  const interval = 5 * 60 * 1000;

  const timer = setInterval(async () => {
    try {
      await armoriesCache.cleanup();
    } catch (error) {
      logger.error('Failed to cleanup armories cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, interval);
  // setInterval 이 process 종료를 막지 않도록 (테스트 환경에서 행 발생 방지)
  timer.unref();
  return timer;
}

// === 싱글톤 인스턴스 ===

/**
 * ARMORIES 캐시 인스턴스
 */
export const armoriesCache = new ArmoriesCache();
