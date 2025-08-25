/**
 * @cursor-change: 2025-01-27, v1.0.0, Redis 클라이언트 구현
 *
 * Redis 클라이언트 모듈
 * - Redis 연결 관리
 * - 기본 캐시 작업 (get, set, del)
 * - 캐시 통계 및 모니터링
 * - 에러 처리 및 재연결 로직
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../config/logger.js';
import { parseEnv } from '../config/env.js';

// === Redis 통계 타입 ===

export interface RedisStats {
  connected: boolean;
  totalKeys: number;
  memoryUsage: number; // 바이트 단위
  lastError?: string;
  lastErrorTime?: Date;
}

// === Redis 클라이언트 ===

export class RedisClient {
  private client: RedisClientType;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1초

  constructor() {
    const env = parseEnv();
    
    this.client = createClient({
      url: env.CACHE_REDIS_URL || 'redis://localhost:6379',
      ...(env.CACHE_REDIS_PASSWORD && { password: env.CACHE_REDIS_PASSWORD }),
      database: env.CACHE_REDIS_DB,
      socket: {
        connectTimeout: 5000, // 5초
      },
    });

    this.setupEventHandlers();
  }

  /**
   * Redis 연결
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info('Redis connected successfully', {
        url: this.client.options?.url?.replace(/\/\/.*@/, '//***:***@'), // 비밀번호 마스킹
        database: this.client.options?.database,
      });
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : String(error),
        reconnectAttempts: this.reconnectAttempts,
      });
      throw error;
    }
  }

  /**
   * Redis 연결 해제
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from Redis', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 키 값 조회
   */
  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      const value = await this.client.get(key);
      
      logger.debug('Redis get operation', {
        key,
        found: value !== null,
        valueLength: value?.length || 0,
      });

      return value;
    } catch (error) {
      logger.error('Redis get operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 키 값 설정
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }

      logger.debug('Redis set operation', {
        key,
        valueLength: value.length,
        ttl,
      });
    } catch (error) {
      logger.error('Redis set operation failed', {
        key,
        valueLength: value.length,
        ttl,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 키 삭제
   */
  async del(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      const deleted = await this.client.del(key);
      
      logger.debug('Redis del operation', {
        key,
        deleted: deleted > 0,
      });
    } catch (error) {
      logger.error('Redis del operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 여러 키 삭제
   */
  async delMultiple(keys: string[]): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      const deleted = await this.client.del(keys);
      
      logger.debug('Redis delMultiple operation', {
        keysCount: keys.length,
        deletedCount: deleted,
      });

      return deleted;
    } catch (error) {
      logger.error('Redis delMultiple operation failed', {
        keysCount: keys.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 키 존재 여부 확인
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 키 TTL 조회
   */
  async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis ttl operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Redis 통계 조회
   */
  async getStats(): Promise<RedisStats> {
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          totalKeys: 0,
          memoryUsage: 0,
        };
      }

      const info = await this.client.info('memory');
      const dbsize = await this.client.dbSize();

      // 메모리 사용량 파싱
      let memoryUsage = 0;
      const memoryMatch = info.match(/used_memory_human:(\d+\.?\d*)([KMGT]?)/);
      if (memoryMatch) {
        const value = parseFloat(memoryMatch[1]!);
        const unit = memoryMatch[2];
        switch (unit) {
          case 'K':
            memoryUsage = value * 1024;
            break;
          case 'M':
            memoryUsage = value * 1024 * 1024;
            break;
          case 'G':
            memoryUsage = value * 1024 * 1024 * 1024;
            break;
          default:
            memoryUsage = value;
        }
      }

      return {
        connected: this.isConnected,
        totalKeys: dbsize,
        memoryUsage: Math.round(memoryUsage),
      };
    } catch (error) {
      logger.error('Failed to get Redis stats', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        connected: this.isConnected,
        totalKeys: 0,
        memoryUsage: 0,
        lastError: error instanceof Error ? error.message : String(error),
        lastErrorTime: new Date(),
      };
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnectedToRedis(): boolean {
    return this.isConnected;
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Redis ready');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis error', {
        error: error.message,
        reconnectAttempts: this.reconnectAttempts,
      });
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis connection ended');
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info('Redis reconnecting', {
        attempt: this.reconnectAttempts,
      });
    });
  }
}

// === 싱글톤 인스턴스 ===

/**
 * Redis 클라이언트 인스턴스
 */
export const redisClient = new RedisClient();
