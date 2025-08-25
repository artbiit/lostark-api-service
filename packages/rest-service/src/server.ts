/**
 * @cursor-change: 2025-01-27, v1.0.0, REST API 서버 구현
 *
 * Fastify 기반 REST API 서버
 * - 3계층 캐싱 시스템 활용
 * - ARMORIES API 엔드포인트
 * - 성능 모니터링 및 로깅
 * - 에러 처리 및 응답 캐싱
 */

import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { logger } from '@lostark/shared';
import { parseEnv } from '@lostark/shared/config/env.js';
import { 
  initializeRedis, 
  disconnectRedis, 
  initializeMySQL, 
  disconnectMySQL,
  cacheManager,
  cacheOptimizer,
  ArmoriesService,
} from '@lostark/data-service';

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

  constructor(config: Partial<ServerConfig> = {}) {
    const env = parseEnv();
    
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

    this.armoriesService = new ArmoriesService();
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
    this.fastify.get('/api/v1/armories/:characterName/refresh', this.refreshCharacterDetail.bind(this));
    this.fastify.get('/api/v1/armories/:characterName/partial', this.getCharacterDetailPartial.bind(this));
    
    // 캐시 관리
    this.fastify.delete('/api/v1/cache/:characterName', this.deleteCharacterCache.bind(this));
    this.fastify.get('/api/v1/cache/stats', this.getCacheStats.bind(this));
  }

  /**
   * 캐시 시스템 초기화
   */
  private async initializeCacheSystem(): Promise<void> {
    try {
      // Redis 연결
      await initializeRedis();
      
      // MySQL 연결
      await initializeMySQL();
      
      // 캐시 최적화 시작
      if (this.config.cache.enableOptimization) {
        cacheOptimizer.startOptimization();
        logger.info('Cache optimization started');
      }
      
      logger.info('Cache system initialized successfully');
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
    } catch (error) {
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
    } catch (error) {
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
      
      const sectionsArray = sections ? sections.split(',') as Array<'profile' | 'equipment' | 'avatars' | 'combat-skills' | 'engravings' | 'cards' | 'gems' | 'colosseums' | 'collectibles'> : [];
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

/**
 * REST 서버 인스턴스
 */
export const restServer = new RestServer();
