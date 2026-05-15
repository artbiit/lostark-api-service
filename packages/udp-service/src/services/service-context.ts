/**
 * 명령 핸들러에 주입할 공유 의존성 묶음 (ServiceContext).
 *
 * - data-service 의 싱글톤(armoriesService, charactersService) 을 우선 사용한다.
 * - 그 외 서비스(gameContentsService 등) 는 data-service 가 모듈-레벨 싱글톤을
 *   제공하지 않으므로 본 빌더에서 단일 인스턴스를 생성·재사용한다.
 * - WorkerPool 의 각 worker 가 자체 인스턴스를 만들면 캐시 일관성이 깨지므로
 *   `createServiceContext()` 는 모듈 단위 lazy 싱글톤으로 운영한다.
 */

import { logger } from '@lostark/shared';
import { redisClient } from '@lostark/shared/db/redis';
import {
  ArmoriesService,
  AuctionsService,
  CharactersService,
  GameContentsService,
  MarketsService,
  NewsService,
  armoriesService,
  charactersService,
} from '@lostark/data-service';

export interface ServiceContext {
  armoriesService: ArmoriesService;
  charactersService: CharactersService;
  auctionsService: AuctionsService;
  marketsService: MarketsService;
  gameContentsService: GameContentsService;
  newsService: NewsService;
  redis: typeof redisClient;
  logger: typeof logger;
}

let cached: ServiceContext | null = null;

/**
 * 모듈 단일 인스턴스 ServiceContext 를 반환한다.
 * 모든 UdpWorker 가 같은 객체를 공유하도록 보장.
 */
export function createServiceContext(): ServiceContext {
  if (cached) return cached;

  cached = {
    armoriesService,
    charactersService,
    auctionsService: new AuctionsService(),
    marketsService: new MarketsService(),
    gameContentsService: new GameContentsService(),
    newsService: new NewsService(),
    redis: redisClient,
    logger,
  };

  return cached;
}

/**
 * 테스트 전용: 캐시된 ServiceContext 를 비운다.
 */
export function resetServiceContextForTests(): void {
  cached = null;
}
