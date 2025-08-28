/**
 * @cursor-change: 2025-01-27, v1.0.0, ARMORIES 서비스 생성
 *
 * ARMORIES API 서비스
 * - 캐릭터 상세 정보 조회 및 캐싱
 * - 데이터 정규화 및 검증
 * - 에러 처리 및 로깅
 */

import { logger } from '@lostark/shared';
import { ArmoryCharacterV9 } from '@lostark/shared/types/V9/armories.js';

import { armoriesCache } from '../cache/armories-cache.js';
import { cacheManager, startCacheManagerCleanupScheduler } from '../cache/cache-manager.js';
import { armoriesClient } from '../clients/armories-client.js';
import {
  armoriesNormalizer,
  NormalizedCharacterDetail,
} from '../normalizers/armories-normalizer.js';
import type { ClassSpecificNodes } from '@lostark/shared/types/domain/character.js';

// === 큐 항목 타입 ===

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
  changes?:
    | {
        itemLevelChanged?: boolean;
        equipmentChanged?: boolean;
        engravingsChanged?: boolean;
        gemsChanged?: boolean;
      }
    | undefined;
  processingTime: number;
  cacheHit: boolean;
}

// === ARMORIES API 서비스 ===

/**
 * ARMORIES API 메인 서비스
 */
export class ArmoriesService {
  private cleanupScheduler?: NodeJS.Timeout | undefined;
  private processingQueue: ArmoriesQueueItem[] = [];
  private isProcessing = false;

  constructor() {
    // 캐시 정리 스케줄러 시작
    this.cleanupScheduler = startCacheManagerCleanupScheduler();
  }

  /**
   * 큐에 항목 추가
   */
  async addToQueue(items: ArmoriesQueueItem[]): Promise<void> {
    // 중복 제거 (같은 캐릭터명이 있으면 최신 것으로 교체)
    const existingMap = new Map<string, ArmoriesQueueItem>();

    // 기존 큐 항목들을 맵에 추가
    for (const item of this.processingQueue) {
      existingMap.set(item.characterName, item);
    }

    // 새 항목들을 맵에 추가 (중복 시 덮어쓰기)
    for (const item of items) {
      existingMap.set(item.characterName, item);
    }

    // 맵을 다시 배열로 변환하고 우선순위별 정렬
    this.processingQueue = Array.from(existingMap.values()).sort((a, b) => b.priority - a.priority);

    logger.info('Added items to ARMORIES queue', {
      addedCount: items.length,
      totalQueueSize: this.processingQueue.length,
    });

    // 큐 처리 시작 (비동기)
    this.processQueue();
  }

  /**
   * 큐 처리
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const requestId = this.generateRequestId();

    logger.info('Starting ARMORIES queue processing', {
      queueSize: this.processingQueue.length,
      requestId,
    });

    try {
      const batchSize = 5; // 한 번에 처리할 항목 수
      const batch = this.processingQueue.splice(0, batchSize);

      // 배치 병렬 처리
      const promises = batch.map((item) => this.processQueueItem(item, requestId));
      await Promise.allSettled(promises);

      logger.info('ARMORIES queue batch processed', {
        processedCount: batch.length,
        remainingQueueSize: this.processingQueue.length,
        requestId,
      });

      // 큐에 남은 항목이 있으면 계속 처리
      if (this.processingQueue.length > 0) {
        // 약간의 지연 후 다음 배치 처리
        setTimeout(() => this.processQueue(), 1000);
      }
    } catch (error) {
      logger.error('Failed to process ARMORIES queue', {
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 큐 항목 처리
   */
  private async processQueueItem(item: ArmoriesQueueItem, requestId: string): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Processing ARMORIES queue item', {
        characterName: item.characterName,
        reason: item.reason,
        priority: item.priority,
        requestId,
      });

      // 캐릭터 상세 정보 처리
      const result = await this.processCharacterDetail(item.characterName);

      logger.info('ARMORIES queue item processed successfully', {
        characterName: item.characterName,
        processingTime: result.processingTime,
        cacheHit: result.cacheHit,
        changes: result.changes
          ? Object.keys(result.changes).filter(
              (key) => result.changes![key as keyof typeof result.changes],
            )
          : undefined,
        requestId,
      });
    } catch (error) {
      logger.error('Failed to process ARMORIES queue item', {
        characterName: item.characterName,
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });

      // 실패한 항목을 다시 큐에 추가 (우선순위 낮춤)
      if (item.priority > 1) {
        const retryItem: ArmoriesQueueItem = {
          ...item,
          priority: item.priority - 1,
          queuedAt: new Date(),
        };
        this.processingQueue.push(retryItem);
      }
    }
  }

  /**
   * 캐릭터 상세 정보 처리 (메인 엔트리 포인트)
   */
  async processCharacterDetail(characterName: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    logger.info('Starting character detail processing', {
      characterName,
      requestId,
    });

    try {
      // 1. 캐시에서 기존 정보 확인
      const existingDetail = await cacheManager.getCharacterDetail(characterName);
      let cacheHit = false;

      if (existingDetail) {
        cacheHit = true;
        logger.debug('Character detail found in cache', {
          characterName,
          requestId,
        });

        return {
          characterDetail: existingDetail,
          processingTime: Date.now() - startTime,
          cacheHit: true,
        };
      }

      // 2. API에서 최신 데이터 조회
      const armoryData = await armoriesClient.getCharacterFull(characterName);

      // 3. 데이터 정규화
      const normalizationResult = await armoriesNormalizer.normalizeCharacterDetail(
        characterName,
        armoryData,
        existingDetail || undefined,
      );

      // 4. 캐시에 저장
      await cacheManager.setCharacterDetail(characterName, normalizationResult.characterDetail);

      const processingTime = Date.now() - startTime;

      logger.info('Character detail processed successfully', {
        characterName,
        itemLevel: normalizationResult.characterDetail.itemLevel,
        processingTime,
        cacheHit: false,
        changes: normalizationResult.changes
          ? Object.keys(normalizationResult.changes).filter(
              (key) =>
                normalizationResult.changes![key as keyof typeof normalizationResult.changes],
            )
          : undefined,
        requestId,
      });

      return {
        characterDetail: normalizationResult.characterDetail,
        changes: normalizationResult.changes || undefined,
        processingTime,
        cacheHit: false,
      };
    } catch (error) {
      logger.error('Failed to process character detail', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });
      throw error;
    }
  }

  /**
   * 캐릭터 상세 정보 조회
   */
  async getCharacterDetail(characterName: string): Promise<NormalizedCharacterDetail | null> {
    return await cacheManager.getCharacterDetail(characterName);
  }

  /**
   * 캐릭터 상세 정보 강제 갱신
   */
  async refreshCharacterDetail(characterName: string): Promise<NormalizedCharacterDetail> {
    logger.info('Force refreshing character detail', {
      characterName,
      requestId: this.generateRequestId(),
    });

    // 캐시에서 기존 정보 삭제
    await cacheManager.deleteCharacterDetail(characterName);

    // 새로 처리
    const result = await this.processCharacterDetail(characterName);
    return result.characterDetail;
  }

  /**
   * 캐릭터 상세 정보 부분 조회
   */
  async getCharacterDetailPartial(
    characterName: string,
    sections: Array<
      | 'profile'
      | 'equipment'
      | 'avatars'
      | 'combat-skills'
      | 'engravings'
      | 'cards'
      | 'gems'
      | 'colosseums'
      | 'collectibles'
    >,
  ): Promise<Partial<NormalizedCharacterDetail> | null> {
    // 먼저 캐시에서 확인
    const cachedDetail = await cacheManager.getCharacterDetail(characterName);

    if (cachedDetail) {
      // 캐시된 데이터에서 요청된 섹션만 반환
      const result: Partial<NormalizedCharacterDetail> = {};

      for (const section of sections) {
        switch (section) {
          case 'profile':
            result.profile = cachedDetail.profile;
            break;
          case 'equipment':
            result.equipment = cachedDetail.equipment;
            break;
          case 'avatars':
            result.avatars = cachedDetail.avatars;
            break;
          case 'combat-skills':
            result.combatSkills = cachedDetail.combatSkills;
            break;
          case 'engravings':
            result.engravings = cachedDetail.engravings;
            break;
          case 'cards':
            result.cards = cachedDetail.cards;
            break;
          case 'gems':
            result.gems = cachedDetail.gems;
            break;
          case 'colosseums':
            result.colosseums = cachedDetail.colosseums;
            break;
          case 'collectibles':
            result.collectibles = cachedDetail.collectibles;
            break;
        }
      }

      return result;
    }

    // 캐시에 없으면 API에서 부분 조회
    const partialData = await armoriesClient.getCharacterPartial(characterName, sections);

    // 부분 데이터를 정규화 (기본 정보는 필수)
    if (partialData.ArmoryProfile) {
      const normalizedDetail = await armoriesNormalizer.normalizeCharacterDetail(
        characterName,
        partialData as ArmoryCharacterV9,
      );

      // 캐시에 저장
      await cacheManager.setCharacterDetail(characterName, normalizedDetail.characterDetail);

      // 요청된 섹션만 반환
      const result: Partial<NormalizedCharacterDetail> = {};

      for (const section of sections) {
        switch (section) {
          case 'profile':
            result.profile = normalizedDetail.characterDetail.profile;
            break;
          case 'equipment':
            result.equipment = normalizedDetail.characterDetail.equipment;
            break;
          case 'avatars':
            result.avatars = normalizedDetail.characterDetail.avatars;
            break;
          case 'combat-skills':
            result.combatSkills = normalizedDetail.characterDetail.combatSkills;
            break;
          case 'engravings':
            result.engravings = normalizedDetail.characterDetail.engravings;
            break;
          case 'cards':
            result.cards = normalizedDetail.characterDetail.cards;
            break;
          case 'gems':
            result.gems = normalizedDetail.characterDetail.gems;
            break;
          case 'colosseums':
            result.colosseums = normalizedDetail.characterDetail.colosseums;
            break;
          case 'collectibles':
            result.collectibles = normalizedDetail.characterDetail.collectibles;
            break;
        }
      }

      return result;
    }

    return null;
  }

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(): Promise<ReturnType<typeof cacheManager.getCacheStats>> {
    return await cacheManager.getCacheStats();
  }

  /**
   * 큐 상태 조회
   */
  getQueueStatus(): {
    queueSize: number;
    isProcessing: boolean;
    nextItems: Array<{ characterName: string; reason: string; priority: number }>;
  } {
    return {
      queueSize: this.processingQueue.length,
      isProcessing: this.isProcessing,
      nextItems: this.processingQueue.slice(0, 5).map((item) => ({
        characterName: item.characterName,
        reason: item.reason,
        priority: item.priority,
      })),
    };
  }

  /**
   * 자주 조회되는 캐릭터 목록
   */
  getFrequentlyAccessedCharacters(
    limit: number = 10,
  ): ReturnType<typeof armoriesCache.getFrequentlyAccessedCharacters> {
    return armoriesCache.getFrequentlyAccessedCharacters(limit);
  }

  /**
   * 직업전용 노드 정보 조회
   */
  async getClassSpecificNodes(characterName: string): Promise<ClassSpecificNodes> {
    const characterDetail = await this.getCharacterDetail(characterName);
    
    if (!characterDetail) {
      throw new Error(`Character not found: ${characterName}`);
    }

    const className = characterDetail.className;
    const itemLevel = characterDetail.itemLevel;

    // 직업별 특화 노드 정보
    const classNodes: Record<string, ClassSpecificNodes> = {
      '버서커': {
        class: '버서커',
        nodes: [
          { name: '광전사의 비기', type: '각인', description: '광전사의 비기 각인 효과' },
          { name: '광기', type: '각인', description: '광기 각인 효과' },
          { name: '광전사의 비기', type: '스킬', description: '광전사의 비기 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '디스트로이어': {
        class: '디스트로이어',
        nodes: [
          { name: '분노의 망치', type: '각인', description: '분노의 망치 각인 효과' },
          { name: '고독한 기사', type: '각인', description: '고독한 기사 각인 효과' },
          { name: '분노의 망치', type: '스킬', description: '분노의 망치 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '건너': {
        class: '건너',
        nodes: [
          { name: '피스메이커', type: '각인', description: '피스메이커 각인 효과' },
          { name: '타임 헌터', type: '각인', description: '타임 헌터 각인 효과' },
          { name: '피스메이커', type: '스킬', description: '피스메이커 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '데빌헌터': {
        class: '데빌헌터',
        nodes: [
          { name: '완벽한 억제', type: '각인', description: '완벽한 억제 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '완벽한 억제', type: '스킬', description: '완벽한 억제 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '호크아이': {
        class: '호크아이',
        nodes: [
          { name: '사시', type: '각인', description: '사시 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '사시', type: '스킬', description: '사시 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '블레이드': {
        class: '블레이드',
        nodes: [
          { name: '버스트', type: '각인', description: '버스트 각인 효과' },
          { name: '잔재된 기운', type: '각인', description: '잔재된 기운 각인 효과' },
          { name: '버스트', type: '스킬', description: '버스트 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '데몬슬레이어': {
        class: '데몬슬레이어',
        nodes: [
          { name: '완벽한 억제', type: '각인', description: '완벽한 억제 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '완벽한 억제', type: '스킬', description: '완벽한 억제 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '리퍼': {
        class: '리퍼',
        nodes: [
          { name: '갈증', type: '각인', description: '갈증 각인 효과' },
          { name: '만월', type: '각인', description: '만월 각인 효과' },
          { name: '갈증', type: '스킬', description: '갈증 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '소울이터': {
        class: '소울이터',
        nodes: [
          { name: '구슬동자', type: '각인', description: '구슬동자 각인 효과' },
          { name: '만월', type: '각인', description: '만월 각인 효과' },
          { name: '구슬동자', type: '스킬', description: '구슬동자 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '기공사': {
        class: '기공사',
        nodes: [
          { name: '역천지체', type: '각인', description: '역천지체 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '역천지체', type: '스킬', description: '역천지체 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '창술사': {
        class: '창술사',
        nodes: [
          { name: '절제', type: '각인', description: '절제 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '절제', type: '스킬', description: '절제 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '스트라이커': {
        class: '스트라이커',
        nodes: [
          { name: '오의난무', type: '각인', description: '오의난무 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '오의난무', type: '스킬', description: '오의난무 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '브레이커': {
        class: '브레이커',
        nodes: [
          { name: '광전사의 비기', type: '각인', description: '광전사의 비기 각인 효과' },
          { name: '광기', type: '각인', description: '광기 각인 효과' },
          { name: '광전사의 비기', type: '스킬', description: '광전사의 비기 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '아르티스트': {
        class: '아르티스트',
        nodes: [
          { name: '진실된 용맹', type: '각인', description: '진실된 용맹 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '진실된 용맹', type: '스킬', description: '진실된 용맹 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '도화가': {
        class: '도화가',
        nodes: [
          { name: '진실된 용맹', type: '각인', description: '진실된 용맹 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '진실된 용맹', type: '스킬', description: '진실된 용맹 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '바드': {
        class: '바드',
        nodes: [
          { name: '진실된 용맹', type: '각인', description: '진실된 용맹 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '진실된 용맹', type: '스킬', description: '진실된 용맹 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '소서리스': {
        class: '소서리스',
        nodes: [
          { name: '점화', type: '각인', description: '점화 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '점화', type: '스킬', description: '점화 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '블래스터': {
        class: '블래스터',
        nodes: [
          { name: '화력 강화', type: '각인', description: '화력 강화 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '화력 강화', type: '스킬', description: '화력 강화 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '스카우터': {
        class: '스카우터',
        nodes: [
          { name: '피스메이커', type: '각인', description: '피스메이커 각인 효과' },
          { name: '타임 헌터', type: '각인', description: '타임 헌터 각인 효과' },
          { name: '피스메이커', type: '스킬', description: '피스메이커 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '건틀릿': {
        class: '건틀릿',
        nodes: [
          { name: '화력 강화', type: '각인', description: '화력 강화 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '화력 강화', type: '스킬', description: '화력 강화 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '팔라딘': {
        class: '팔라딘',
        nodes: [
          { name: '진실된 용맹', type: '각인', description: '진실된 용맹 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '진실된 용맹', type: '스킬', description: '진실된 용맹 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '워프리스트': {
        class: '워프리스트',
        nodes: [
          { name: '진실된 용맹', type: '각인', description: '진실된 용맹 각인 효과' },
          { name: '충동', type: '각인', description: '충동 각인 효과' },
          { name: '진실된 용맹', type: '스킬', description: '진실된 용맹 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      },
      '슬레이어': {
        class: '슬레이어',
        nodes: [
          { name: '광전사의 비기', type: '각인', description: '광전사의 비기 각인 효과' },
          { name: '광기', type: '각인', description: '광기 각인 효과' },
          { name: '광전사의 비기', type: '스킬', description: '광전사의 비기 스킬 강화' }
        ],
        requirements: { minItemLevel: 1302 }
      }
    };

    const classNode = classNodes[className];
    if (!classNode) {
      throw new Error(`Unsupported class: ${className}`);
    }

    // 아이템 레벨 요구사항 확인
    if (itemLevel < classNode.requirements.minItemLevel) {
      throw new Error(`Item level too low. Required: ${classNode.requirements.minItemLevel}, Current: ${itemLevel}`);
    }

    return classNode;
  }

  /**
   * 서비스 정리
   */
  async cleanup(): Promise<void> {
    if (this.cleanupScheduler) {
      clearInterval(this.cleanupScheduler);
      this.cleanupScheduler = undefined;
    }

    // 큐 처리 완료 대기
    while (this.isProcessing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info('Armories service cleanup completed');
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `armory-service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === 싱글톤 인스턴스 ===

/**
 * ARMORIES API 서비스 인스턴스
 */
export const armoriesService = new ArmoriesService();
