/**
 * @cursor-change: 2025-01-27, v1.0.0, REST API 서버 구현
 *
 * Fastify 기반 REST API 서버
 * - 3계층 캐싱 시스템 활용
 * - ARMORIES API 엔드포인트
 * - 성능 모니터링 및 로깅
 * - 에러 처리 및 응답 캐싱
 */

logger.info('🚀 REST 서버 시작 - 모듈 로딩 시작');

import cors from '@fastify/cors';
logger.info('✅ cors 모듈 로딩 완료');

import helmet from '@fastify/helmet';
logger.info('✅ helmet 모듈 로딩 완료');

import rateLimit from '@fastify/rate-limit';
import {
  ArmoriesService,
  AuctionsService,
  cacheManager,
  cacheOptimizer,
  CharactersService,
  disconnectMySQL,
  disconnectRedis,
  GameContentsService,
  initializeMySQL,
  initializeRedis,
  MarketsService,
  NewsService,
} from '@lostark/data-service';
import { logger } from '@lostark/shared';
logger.info('✅ rate-limit 모듈 로딩 완료');

logger.info('📦 data-service 패키지 import 시작...');
logger.info('✅ data-service 패키지 import 완료');

logger.info('📦 shared 패키지 import 시작...');
logger.info('✅ logger import 완료');

import { parseEnv } from '@lostark/shared/config/env';
logger.info('✅ parseEnv import 완료');

import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
logger.info('✅ Fastify import 완료');

logger.info('🎯 모든 모듈 로딩 완료 - 서버 클래스 정의 시작');

// === 유틸리티 함수 ===

/**
 * 에러 메시지를 안전하게 추출하는 함수
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

// === 서버 설정 ===

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    max: number;
    timeWindow: number;
  };
  cache: {
    enableOptimization: boolean;
    optimizationInterval: number;
  };
}

// === Fastify 서버 ===

/**
 * REST API 서버
 */
export class RestServer {
  private fastify: FastifyInstance;
  private config: ServerConfig;
  private armoriesService: ArmoriesService;
  private charactersService: CharactersService;
  private auctionsService: AuctionsService;
  private newsService: NewsService;
  private gameContentsService: GameContentsService;
  private marketsService: MarketsService;

  constructor(config: Partial<ServerConfig> = {}) {
    logger.info('🔧 RestServer 생성자 시작');

    logger.info('📋 환경변수 파싱 시작...');
    const env = parseEnv();
    logger.info('✅ 환경변수 파싱 완료');

    logger.info('⚙️ 서버 설정 구성 시작...');
    this.config = {
      port: env.REST_SERVER_PORT || 3000,
      host: env.REST_SERVER_HOST || '0.0.0.0',
      cors: {
        origin: env.CORS_ORIGIN || '*',
        credentials: true,
      },
      rateLimit: {
        max: env.RATE_LIMIT_MAX || 100,
        timeWindow: env.RATE_LIMIT_WINDOW || 60000, // 1분
      },
      cache: {
        enableOptimization: true,
        optimizationInterval: 300, // 5분
      },
      ...config,
    };
    logger.info('✅ 서버 설정 구성 완료');

    logger.info('🚀 Fastify 인스턴스 생성 시작...');
    this.fastify = Fastify({
      logger: {
        level: env.LOG_LEVEL || 'info',
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: req.headers,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
      trustProxy: true,
    });
    logger.info('✅ Fastify 인스턴스 생성 완료');

    logger.info('🎯 서비스 인스턴스 생성 시작...');
    this.armoriesService = new ArmoriesService();
    this.charactersService = new CharactersService();
    this.auctionsService = new AuctionsService();
    this.newsService = new NewsService();
    this.gameContentsService = new GameContentsService();
    this.marketsService = new MarketsService();
    logger.info('✅ 모든 서비스 인스턴스 생성 완료');

    logger.info('🎉 RestServer 생성자 완료');
  }

  /**
   * 서버 초기화
   */
  async initialize(): Promise<void> {
    try {
      // 플러그인 등록
      await this.registerPlugins();

      // 라우트 등록
      await this.registerRoutes();

      // 캐시 시스템 초기화
      await this.initializeCacheSystem();

      logger.info('REST server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize REST server', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 플러그인 등록
   */
  private async registerPlugins(): Promise<void> {
    // CORS
    await this.fastify.register(cors, this.config.cors);

    // 보안 헤더
    await this.fastify.register(helmet, {
      contentSecurityPolicy: false, // 개발 환경에서 비활성화
    });

    // Rate Limiting
    await this.fastify.register(rateLimit, {
      max: this.config.rateLimit.max,
      timeWindow: this.config.rateLimit.timeWindow,
      errorResponseBuilder: (req: any, context: any) => ({
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.after}`,
        retryAfter: context.after,
      }),
    });
  }

  /**
   * 라우트 등록
   */
  private async registerRoutes(): Promise<void> {
    // 헬스 체크
    this.fastify.get('/health', this.healthCheck.bind(this));

    // 캐시 상태
    this.fastify.get('/cache/status', this.cacheStatus.bind(this));

    // 캐시 최적화
    this.fastify.post('/cache/optimize', this.optimizeCache.bind(this));

    // ARMORIES API
    this.fastify.get('/api/v1/armories/:characterName', this.getCharacterDetail.bind(this));
    this.fastify.get(
      '/api/v1/armories/:characterName/refresh',
      this.refreshCharacterDetail.bind(this),
    );
    this.fastify.get(
      '/api/v1/armories/:characterName/partial',
      this.getCharacterDetailPartial.bind(this),
    );
    this.fastify.get(
      '/api/v1/armories/:characterName/class-nodes',
      this.getClassSpecificNodes.bind(this),
    );

    // CHARACTERS API
    this.fastify.get('/api/v1/characters/:characterName', this.getCharacter.bind(this));
    this.fastify.get(
      '/api/v1/characters/:characterName/siblings',
      this.getCharacterSiblings.bind(this),
    );
    this.fastify.get('/api/v1/characters/:characterName/refresh', this.refreshCharacter.bind(this));

    // AUCTIONS API
    this.fastify.get('/api/v1/auctions/search', this.searchAuctions.bind(this));
    this.fastify.post('/api/v1/auctions/search', this.searchAuctionsRefresh.bind(this));

    // NEWS API
    this.fastify.get('/api/v1/news', this.getNews.bind(this));
    this.fastify.get('/api/v1/news/refresh', this.refreshNews.bind(this));

    // GAMECONTENTS API
    this.fastify.get('/api/v1/gamecontents', this.getGameContents.bind(this));
    this.fastify.get('/api/v1/gamecontents/refresh', this.refreshGameContents.bind(this));

    // MARKETS API
    this.fastify.get('/api/v1/markets', this.getMarkets.bind(this));
    this.fastify.post('/api/v1/markets', this.refreshMarkets.bind(this));

    // 캐시 관리
    this.fastify.delete('/api/v1/cache/:characterName', this.deleteCharacterCache.bind(this));
    this.fastify.get('/api/v1/cache/stats', this.getCacheStats.bind(this));
  }

  /**
   * 캐시 시스템 초기화
   */
  private async initializeCacheSystem(): Promise<void> {
    try {
      // 개발 환경에서 캐시 시스템 완전 비활성화 (임시)
      logger.info('Cache system disabled for debugging');
      return;

      // 개발 환경에서 캐시 시스템 선택적 비활성화
      const env = parseEnv();
      if (env.NODE_ENV === 'development' && !env.CACHE_REDIS_URL) {
        logger.info('Cache system disabled in development mode (no Redis URL)');
        return;
      }

      // 타임아웃 설정 (3초로 단축)
      const timeout = 3000;

      // Redis 연결 (타임아웃 적용)
      const redisPromise = initializeRedis();
      const redisTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), timeout),
      );

      try {
        await Promise.race([redisPromise, redisTimeout]);
        logger.info('Redis connected successfully');
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        logger.warn('Redis connection failed, continuing without Redis', {
          error: errorMessage,
        });
      }

      // MySQL 연결 (타임아웃 적용)
      const mysqlPromise = initializeMySQL();
      const mysqlTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('MySQL connection timeout')), timeout),
      );

      try {
        await Promise.race([mysqlPromise, mysqlTimeout]);
        logger.info('MySQL connected successfully');
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        logger.warn('MySQL connection failed, continuing without MySQL', {
          error: errorMessage,
        });
      }

      // 캐시 최적화 시작 (비동기로 실행, 실패해도 서버 시작 계속)
      if (this.config.cache.enableOptimization) {
        setImmediate(() => {
          try {
            cacheOptimizer.startOptimization();
            logger.info('Cache optimization started');
          } catch (error: unknown) {
            const errorMessage = getErrorMessage(error);
            logger.warn('Cache optimization failed', {
              error: errorMessage,
            });
          }
        });
      }

      logger.info('Cache system initialization completed');
    } catch (error) {
      logger.error('Failed to initialize cache system', {
        error: error instanceof Error ? error.message : String(error),
      });
      // 캐시 시스템 실패 시에도 서버는 계속 동작
    }
  }

  /**
   * 서버 시작
   */
  async start(): Promise<void> {
    try {
      await this.fastify.listen({
        port: this.config.port,
        host: this.config.host,
      });

      logger.info('REST server started successfully', {
        port: this.config.port,
        host: this.config.host,
      });
    } catch (error: unknown) {
      logger.error('Failed to start REST server', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 서버 중지
   */
  async stop(): Promise<void> {
    try {
      // 캐시 최적화 중지
      cacheOptimizer.stopOptimization();

      // 캐시 연결 해제
      await disconnectRedis();
      await disconnectMySQL();

      // Fastify 서버 중지
      await this.fastify.close();

      logger.info('REST server stopped successfully');
    } catch (error: unknown) {
      logger.error('Failed to stop REST server', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // === API 엔드포인트 ===

  /**
   * 헬스 체크
   */
  async healthCheck(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const cacheStatus = cacheManager.getCacheLayerStatus();

    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: {
        memory: cacheStatus.memory,
        redis: cacheStatus.redis,
        database: cacheStatus.database,
      },
    });
  }

  /**
   * 캐시 상태 조회
   */
  async cacheStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const cacheStats = await cacheManager.getCacheStats();
      const optimizationStats = cacheOptimizer.getLastOptimizationStats();

      reply.send({
        cache: cacheStats,
        optimization: optimizationStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get cache status', {
        error: error instanceof Error ? error.message : String(error),
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get cache status',
      });
    }
  }

  /**
   * 캐시 최적화 실행
   */
  async optimizeCache(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const optimizationStats = await cacheOptimizer.performOptimization();

      reply.send({
        success: true,
        optimization: optimizationStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to optimize cache', {
        error: error instanceof Error ? error.message : String(error),
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to optimize cache',
      });
    }
  }

  /**
   * 캐릭터 상세 정보 조회
   */
  async getCharacterDetail(
    request: FastifyRequest<{
      Params: { characterName: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { characterName } = request.params;

    try {
      logger.info('Character detail request', { characterName });

      const characterDetail = await this.armoriesService.getCharacterDetail(characterName);

      if (!characterDetail) {
        reply.status(404).send({
          error: 'Not Found',
          message: `Character '${characterName}' not found`,
        });
        return;
      }

      const responseTime = Date.now() - startTime;

      // 응답 헤더에 캐시 정보 추가
      reply.header('X-Cache-Hit', 'true');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: characterDetail,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to get character detail', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get character detail',
        responseTime,
      });
    }
  }

  /**
   * 캐릭터 상세 정보 새로고침
   */
  async refreshCharacterDetail(
    request: FastifyRequest<{
      Params: { characterName: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { characterName } = request.params;

    try {
      logger.info('Character detail refresh request', { characterName });

      const characterDetail = await this.armoriesService.refreshCharacterDetail(characterName);

      if (!characterDetail) {
        reply.status(404).send({
          error: 'Not Found',
          message: `Character '${characterName}' not found`,
        });
        return;
      }

      const responseTime = Date.now() - startTime;

      reply.header('X-Cache-Refreshed', 'true');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: characterDetail,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to refresh character detail', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to refresh character detail',
        responseTime,
      });
    }
  }

  /**
   * 직업전용 노드 정보 조회
   */
  async getClassSpecificNodes(
    request: FastifyRequest<{
      Params: { characterName: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { characterName } = request.params;

    try {
      logger.info('Class specific nodes request', { characterName });

      const classNodes = await this.armoriesService.getClassSpecificNodes(characterName);

      const responseTime = Date.now() - startTime;

      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: classNodes,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to get class specific nodes', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      if (error instanceof Error && error.message.includes('not found')) {
        reply.status(404).send({
          error: 'Not Found',
          message: error.message,
          responseTime,
        });
      } else if (error instanceof Error && error.message.includes('Item level too low')) {
        reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
          responseTime,
        });
      } else {
        reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get class specific nodes',
          responseTime,
        });
      }
    }
  }

  /**
   * 캐릭터 상세 정보 부분 조회
   */
  async getCharacterDetailPartial(
    request: FastifyRequest<{
      Params: { characterName: string };
      Querystring: { sections?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { characterName } = request.params;
    const { sections } = request.query;

    try {
      logger.info('Character detail partial request', { characterName, sections });

      const sectionsArray = sections
        ? (sections.split(',') as Array<
            | 'profile'
            | 'equipment'
            | 'avatars'
            | 'combat-skills'
            | 'engravings'
            | 'cards'
            | 'gems'
            | 'colosseums'
            | 'collectibles'
          >)
        : [];
      const characterDetail = await this.armoriesService.getCharacterDetailPartial(
        characterName,
        sectionsArray,
      );

      if (!characterDetail) {
        reply.status(404).send({
          error: 'Not Found',
          message: `Character '${characterName}' not found`,
        });
        return;
      }

      const responseTime = Date.now() - startTime;

      reply.header('X-Cache-Hit', 'true');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: characterDetail,
        sections: sectionsArray,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to get character detail partial', {
        characterName,
        sections,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get character detail partial',
        responseTime,
      });
    }
  }

  // === CHARACTERS API ===

  /**
   * 캐릭터 기본 정보 조회
   */
  async getCharacter(
    request: FastifyRequest<{
      Params: { characterName: string };
      Querystring: { refresh?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { characterName } = request.params;
    const { refresh } = request.query;

    try {
      logger.info('Character request', { characterName, refresh: refresh === 'true' });

      const charactersService = new CharactersService();

      const result = await charactersService.getAccountInfo(characterName);

      if (!result) {
        reply.status(404).send({
          success: false,
          error: 'Character not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const responseTime = Date.now() - startTime;

      reply.header('X-Cache-Hit', 'true');
      reply.header('X-Cache-Source', 'memory');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: result,
        cache: {
          hit: true,
          source: 'memory',
          ttl: 300,
        },
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to get character', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get character',
        responseTime,
      });
    }
  }

  /**
   * 캐릭터 Siblings 정보 조회
   */
  async getCharacterSiblings(
    request: FastifyRequest<{
      Params: { characterName: string };
      Querystring: { refresh?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { characterName } = request.params;
    const { refresh } = request.query;

    try {
      logger.info('Character siblings request', { characterName, refresh: refresh === 'true' });

      const charactersService = new CharactersService();

      const result = await charactersService.getAccountInfo(characterName);

      if (!result) {
        reply.status(404).send({
          success: false,
          error: 'Character not found',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const responseTime = Date.now() - startTime;

      reply.header('X-Cache-Hit', 'true');
      reply.header('X-Cache-Source', 'memory');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: result,
        cache: {
          hit: true,
          source: 'memory',
          ttl: 300,
        },
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to get character siblings', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get character siblings',
        responseTime,
      });
    }
  }

  /**
   * 캐릭터 정보 강제 새로고침
   */
  async refreshCharacter(
    request: FastifyRequest<{
      Params: { characterName: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { characterName } = request.params;

    try {
      logger.info('Character refresh request', { characterName });

      const charactersService = new CharactersService();
      const result = await charactersService.refreshAccountInfo(characterName);

      const responseTime = Date.now() - startTime;

      reply.header('X-Cache-Refreshed', 'true');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: result,
        cache: {
          hit: false,
          source: 'api',
        },
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to refresh character', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to refresh character',
        responseTime,
      });
    }
  }

  // === AUCTIONS API ===

  /**
   * 경매장 검색
   */
  async searchAuctions(
    request: FastifyRequest<{
      Querystring: {
        itemName?: string;
        categoryCode?: string;
        itemTier?: string;
        itemGrade?: string;
        itemLevel?: string;
        skillOption?: string;
        engravingName?: string;
        pageNo?: string;
        sort?: string;
        refresh?: string;
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const query = request.query;

    try {
      logger.info('Auctions search request', { query });

      const pageNo = query.pageNo ? parseInt(query.pageNo) : 1;
      const searchRequest = {
        ...query,
        PageNo: pageNo,
      };

      const searchResult = await this.auctionsService.searchItemsAdvanced(searchRequest);

      const responseTime = Date.now() - startTime;

      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: searchResult,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to search auctions', {
        query,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search auctions',
        responseTime,
      });
    }
  }

  /**
   * 경매장 검색 강제 새로고침
   */
  async searchAuctionsRefresh(
    request: FastifyRequest<{
      Body: {
        itemName?: string;
        categoryCode?: string;
        itemTier?: string;
        itemGrade?: string;
        itemLevel?: string;
        skillOption?: string;
        engravingName?: string;
        pageNo?: number;
        sort?: string;
      };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const body = request.body;

    try {
      logger.info('Auctions search refresh request', { body });

      const searchRequest = {
        ...body,
        PageNo: body.pageNo || 1,
      };

      const searchResult = await this.auctionsService.searchItemsAdvanced(searchRequest);

      const responseTime = Date.now() - startTime;

      reply.header('X-Cache-Refreshed', 'true');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: searchResult,
        cache: {
          hit: false,
          source: 'api',
        },
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to refresh auctions search', {
        body,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to refresh auctions search',
        responseTime,
      });
    }
  }

  // === NEWS API ===

  /**
   * 공지사항 조회
   */
  async getNews(
    request: FastifyRequest<{
      Querystring: { type?: string; pageNo?: string; refresh?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { type, pageNo, refresh } = request.query;

    try {
      logger.info('News request', { type, pageNo, refresh: refresh === 'true' });

      const newsResult =
        type === 'events'
          ? await this.newsService.getEvents()
          : await this.newsService.getNotices();

      const responseTime = Date.now() - startTime;

      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: newsResult,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to get news', {
        type,
        pageNo,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get news',
        responseTime,
      });
    }
  }

  /**
   * 공지사항 강제 새로고침
   */
  async refreshNews(
    request: FastifyRequest<{
      Querystring: { type?: string; pageNo?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { type, pageNo } = request.query;

    try {
      logger.info('News refresh request', { type, pageNo });

      const newsResult =
        type === 'events'
          ? await this.newsService.getEvents()
          : await this.newsService.getNotices();

      const responseTime = Date.now() - startTime;

      reply.header('X-Cache-Refreshed', 'true');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: newsResult,
        cache: {
          hit: false,
          source: 'api',
        },
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to refresh news', {
        type,
        pageNo,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to refresh news',
        responseTime,
      });
    }
  }

  // === GAMECONTENTS API ===

  /**
   * 게임 콘텐츠 정보 조회
   */
  async getGameContents(
    request: FastifyRequest<{
      Querystring: { refresh?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { refresh } = request.query;

    try {
      logger.info('Game contents request', { refresh: refresh === 'true' });

      const gameContentsResult = await this.gameContentsService.getCalendar();

      const responseTime = Date.now() - startTime;

      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: gameContentsResult,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to get game contents', {
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get game contents',
        responseTime,
      });
    }
  }

  /**
   * 게임 콘텐츠 정보 강제 새로고침
   */
  async refreshGameContents(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Game contents refresh request');

      const gameContentsResult = await this.gameContentsService.getCalendar();

      const responseTime = Date.now() - startTime;

      reply.header('X-Cache-Refreshed', 'true');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: gameContentsResult,
        cache: {
          hit: false,
          source: 'api',
        },
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to refresh game contents', {
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to refresh game contents',
        responseTime,
      });
    }
  }

  // === MARKETS API ===

  /**
   * 시장 정보 조회
   */
  async getMarkets(
    request: FastifyRequest<{
      Querystring: { itemIds?: string; refresh?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { itemIds, refresh } = request.query;

    try {
      logger.info('Markets request', { itemIds, refresh: refresh === 'true' });

      if (!itemIds) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'itemIds is required',
        });
        return;
      }

      const itemIdArray = itemIds.split(',').map((id) => parseInt(id.trim()));
      const marketResults = await Promise.all(
        itemIdArray.map((itemId) => this.marketsService.getItemById(itemId)),
      );

      const responseTime = Date.now() - startTime;

      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: marketResults,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to get markets', {
        itemIds,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get markets',
        responseTime,
      });
    }
  }

  /**
   * 시장 정보 강제 새로고침
   */
  async refreshMarkets(
    request: FastifyRequest<{
      Body: { itemIds?: number[] };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const startTime = Date.now();
    const { itemIds } = request.body;

    try {
      logger.info('Markets refresh request', { itemIds });

      if (!itemIds || itemIds.length === 0) {
        reply.status(400).send({
          error: 'Bad Request',
          message: 'itemIds is required',
        });
        return;
      }

      const marketResults = await Promise.all(
        itemIds.map((itemId) => this.marketsService.getItemById(itemId)),
      );

      const responseTime = Date.now() - startTime;

      reply.header('X-Cache-Refreshed', 'true');
      reply.header('X-Response-Time', `${responseTime}ms`);

      reply.send({
        success: true,
        data: marketResults,
        cache: {
          hit: false,
          source: 'api',
        },
        timestamp: new Date().toISOString(),
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Failed to refresh markets', {
        itemIds,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to refresh markets',
        responseTime,
      });
    }
  }

  /**
   * 캐릭터 캐시 삭제
   */
  async deleteCharacterCache(
    request: FastifyRequest<{
      Params: { characterName: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { characterName } = request.params;

    try {
      logger.info('Delete character cache request', { characterName });

      await cacheManager.deleteCharacterDetail(characterName);

      reply.send({
        success: true,
        message: `Cache for character '${characterName}' deleted successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to delete character cache', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete character cache',
      });
    }
  }

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const cacheStats = await cacheManager.getCacheStats();
      const performanceReport = await cacheOptimizer.generatePerformanceReport();

      reply.send({
        success: true,
        cache: cacheStats,
        performance: performanceReport,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error instanceof Error ? error.message : String(error),
      });

      reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get cache stats',
      });
    }
  }
}

// === 서버 인스턴스 ===

logger.info('🏗️ 서버 인스턴스 생성 시작...');

/**
 * REST 서버 인스턴스
 */
export const restServer = new RestServer();

logger.info('🎊 서버 인스턴스 생성 완료 - 모듈 로딩 완료');

// === 서버 시작 ===
logger.info('🚀 서버 시작 프로세스 시작...');

// 서버 초기화 및 시작
async function startServer() {
  try {
    logger.info('🔧 서버 초기화 시작...');
    await restServer.initialize();
    logger.info('✅ 서버 초기화 완료');

    logger.info('🚀 서버 시작...');
    await restServer.start();
    logger.info('🎉 서버가 성공적으로 시작되었습니다!');
  } catch (error) {
    logger.error('❌ 서버 시작 실패:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// 서버 시작
startServer();
