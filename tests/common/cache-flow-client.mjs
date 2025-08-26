/**
 * @cursor-change: 2025-01-27, v1.0.0, 캐시 플로우 테스트용 API 클라이언트 생성
 *
 * 캐시 플로우 테스트를 위한 확장된 API 클라이언트
 * - in-memory → Redis → MySQL 데이터 이동 확인
 * - 각 API별 캐시 상태 모니터링
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// 환경변수 로드
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../');

// .env 파일 직접 읽기
function loadEnv() {
  try {
    const envPath = join(projectRoot, '.env');
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      }
    });

    // 환경변수 설정
    Object.entries(envVars).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn('Warning: Could not load .env file:', error.message);
  }
}

loadEnv();

import { makeApiRequest } from './api-client.mjs';

// === 캐시 시뮬레이션 ===

/**
 * 메모리 캐시 시뮬레이션
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  set(key, value, ttlMs = 300000) {
    // 기본 5분
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return { ...this.stats, size: this.cache.size };
  }
}

/**
 * Redis 캐시 시뮬레이션
 */
class RedisCache {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };
  }

  async set(key, value, ttlSeconds = 1800) {
    // 기본 30분
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
    return 'OK';
  }

  async get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  async del(key) {
    return this.cache.delete(key) ? 1 : 0;
  }

  async flushdb() {
    this.cache.clear();
    return 'OK';
  }

  getStats() {
    return { ...this.stats, size: this.cache.size };
  }
}

/**
 * MySQL 시뮬레이션
 */
class DatabaseCache {
  constructor() {
    this.storage = new Map();
    this.stats = { reads: 0, writes: 0 };
  }

  async save(key, value) {
    this.storage.set(key, {
      value,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.stats.writes++;
    return true;
  }

  async load(key) {
    const item = this.storage.get(key);
    if (!item) {
      return null;
    }
    this.stats.reads++;
    return item.value;
  }

  async delete(key) {
    return this.storage.delete(key);
  }

  getStats() {
    return { ...this.stats, size: this.storage.size };
  }
}

// === API 서비스 클래스들 ===

/**
 * CHARACTERS API 서비스
 */
class CharactersService {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.database = new DatabaseCache();
  }

  async getCharacter(characterName) {
    // 1. Memory Cache 확인
    let result = this.memoryCache.get(characterName);
    if (result) {
      return result;
    }

    // 2. Redis Cache 확인
    result = await this.redisCache.get(characterName);
    if (result) {
      // Memory Cache에 복사
      this.memoryCache.set(characterName, result, 300000); // 5분
      return result;
    }

    // 3. Database 확인
    result = await this.database.load(characterName);
    if (result) {
      // Redis와 Memory Cache에 복사
      await this.redisCache.set(characterName, result, 1800); // 30분
      this.memoryCache.set(characterName, result, 300000); // 5분
      return result;
    }

    // 4. API 호출
    const apiResult = await makeApiRequest(`/characters/${encodeURIComponent(characterName)}`);
    if (apiResult.status === 200 && apiResult.data) {
      // 모든 캐시에 저장
      this.memoryCache.set(characterName, apiResult.data, 300000); // 5분
      await this.redisCache.set(characterName, apiResult.data, 1800); // 30분
      await this.database.save(characterName, apiResult.data);
      return apiResult.data;
    }

    return null;
  }

  async getFromMemory(characterName) {
    return this.memoryCache.get(characterName);
  }

  async getFromRedis(characterName) {
    return await this.redisCache.get(characterName);
  }

  async getFromDatabase(characterName) {
    return await this.database.load(characterName);
  }

  async saveToDatabase(characterName) {
    const data = this.memoryCache.get(characterName) || (await this.redisCache.get(characterName));
    if (data) {
      await this.database.save(characterName, data);
      return true;
    }
    return false;
  }
}

/**
 * ARMORIES API 서비스 (가장 큰 단위)
 */
class ArmoriesService {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.database = new DatabaseCache();
  }

  async getCharacterDetail(characterName) {
    // 1. Memory Cache 확인
    let result = this.memoryCache.get(characterName);
    if (result) {
      return result;
    }

    // 2. Redis Cache 확인
    result = await this.redisCache.get(characterName);
    if (result) {
      // Memory Cache에 복사
      this.memoryCache.set(characterName, result, 600000); // 10분 (큰 데이터)
      return result;
    }

    // 3. Database 확인
    result = await this.database.load(characterName);
    if (result) {
      // Redis와 Memory Cache에 복사
      await this.redisCache.set(characterName, result, 3600); // 1시간
      this.memoryCache.set(characterName, result, 600000); // 10분
      return result;
    }

    // 4. API 호출
    const apiResult = await makeApiRequest(
      `/armories/characters/${encodeURIComponent(characterName)}`,
    );
    if (apiResult.status === 200 && apiResult.data) {
      // 모든 캐시에 저장
      this.memoryCache.set(characterName, apiResult.data, 600000); // 10분
      await this.redisCache.set(characterName, apiResult.data, 3600); // 1시간
      await this.database.save(characterName, apiResult.data);
      return apiResult.data;
    }

    return null;
  }

  async getFromMemory(characterName) {
    return this.memoryCache.get(characterName);
  }

  async getFromRedis(characterName) {
    return await this.redisCache.get(characterName);
  }

  async getFromDatabase(characterName) {
    return await this.database.load(characterName);
  }

  async saveToDatabase(characterName) {
    const data = this.memoryCache.get(characterName) || (await this.redisCache.get(characterName));
    if (data) {
      await this.database.save(characterName, data);
      return true;
    }
    return false;
  }
}

/**
 * AUCTIONS API 서비스
 */
class AuctionsService {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.database = new DatabaseCache();
  }

  async searchItems(params) {
    const key = JSON.stringify(params);

    // 1. Memory Cache 확인
    let result = this.memoryCache.get(key);
    if (result) {
      return result;
    }

    // 2. Redis Cache 확인
    result = await this.redisCache.get(key);
    if (result) {
      this.memoryCache.set(key, result, 300000); // 5분
      return result;
    }

    // 3. Database 확인
    result = await this.database.load(key);
    if (result) {
      await this.redisCache.set(key, result, 1800); // 30분
      this.memoryCache.set(key, result, 300000); // 5분
      return result;
    }

    // 4. API 호출
    const searchParams = new URLSearchParams(params);
    const apiResult = await makeApiRequest(`/auctions/items?${searchParams.toString()}`);
    if (apiResult.status === 200 && apiResult.data) {
      this.memoryCache.set(key, apiResult.data, 300000); // 5분
      await this.redisCache.set(key, apiResult.data, 1800); // 30분
      await this.database.save(key, apiResult.data);
      return apiResult.data;
    }

    return null;
  }

  async getFromMemory(key) {
    return this.memoryCache.get(key);
  }

  async getFromRedis(key) {
    return await this.redisCache.get(key);
  }

  async getFromDatabase(key) {
    return await this.database.load(key);
  }

  async saveToDatabase(key) {
    const data = this.memoryCache.get(key) || (await this.redisCache.get(key));
    if (data) {
      await this.database.save(key, data);
      return true;
    }
    return false;
  }
}

/**
 * NEWS API 서비스
 */
class NewsService {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.database = new DatabaseCache();
  }

  async getNotices() {
    const key = 'notices';

    // 1. Memory Cache 확인
    let result = this.memoryCache.get(key);
    if (result) {
      return result;
    }

    // 2. Redis Cache 확인
    result = await this.redisCache.get(key);
    if (result) {
      this.memoryCache.set(key, result, 300000); // 5분
      return result;
    }

    // 3. Database 확인
    result = await this.database.load(key);
    if (result) {
      await this.redisCache.set(key, result, 1800); // 30분
      this.memoryCache.set(key, result, 300000); // 5분
      return result;
    }

    // 4. API 호출
    const apiResult = await makeApiRequest('/news/notices');
    if (apiResult.status === 200 && apiResult.data) {
      this.memoryCache.set(key, apiResult.data, 300000); // 5분
      await this.redisCache.set(key, apiResult.data, 1800); // 30분
      await this.database.save(key, apiResult.data);
      return apiResult.data;
    }

    return null;
  }

  async getFromMemory(key) {
    return this.memoryCache.get(key);
  }

  async getFromRedis(key) {
    return await this.redisCache.get(key);
  }

  async getFromDatabase(key) {
    return await this.database.load(key);
  }

  async saveToDatabase(key) {
    const data = this.memoryCache.get(key) || (await this.redisCache.get(key));
    if (data) {
      await this.database.save(key, data);
      return true;
    }
    return false;
  }
}

/**
 * GAMECONTENTS API 서비스
 */
class GameContentsService {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.database = new DatabaseCache();
  }

  async getCalendar() {
    const key = 'calendar';

    // 1. Memory Cache 확인
    let result = this.memoryCache.get(key);
    if (result) {
      return result;
    }

    // 2. Redis Cache 확인
    result = await this.redisCache.get(key);
    if (result) {
      this.memoryCache.set(key, result, 300000); // 5분
      return result;
    }

    // 3. Database 확인
    result = await this.database.load(key);
    if (result) {
      await this.redisCache.set(key, result, 1800); // 30분
      this.memoryCache.set(key, result, 300000); // 5분
      return result;
    }

    // 4. API 호출
    const apiResult = await makeApiRequest('/gamecontents/challenge-abyss-dungeons');
    if (apiResult.status === 200 && apiResult.data) {
      this.memoryCache.set(key, apiResult.data, 300000); // 5분
      await this.redisCache.set(key, apiResult.data, 1800); // 30분
      await this.database.save(key, apiResult.data);
      return apiResult.data;
    }

    return null;
  }

  async getFromMemory(key) {
    return this.memoryCache.get(key);
  }

  async getFromRedis(key) {
    return await this.redisCache.get(key);
  }

  async getFromDatabase(key) {
    return await this.database.load(key);
  }

  async saveToDatabase(key) {
    const data = this.memoryCache.get(key) || (await this.redisCache.get(key));
    if (data) {
      await this.database.save(key, data);
      return true;
    }
    return false;
  }
}

/**
 * MARKETS API 서비스
 */
class MarketsService {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.database = new DatabaseCache();
  }

  async getItems() {
    const key = 'items';

    // 1. Memory Cache 확인
    let result = this.memoryCache.get(key);
    if (result) {
      return result;
    }

    // 2. Redis Cache 확인
    result = await this.redisCache.get(key);
    if (result) {
      this.memoryCache.set(key, result, 300000); // 5분
      return result;
    }

    // 3. Database 확인
    result = await this.database.load(key);
    if (result) {
      await this.redisCache.set(key, result, 1800); // 30분
      this.memoryCache.set(key, result, 300000); // 5분
      return result;
    }

    // 4. API 호출
    const apiResult = await makeApiRequest('/markets/items');
    if (apiResult.status === 200 && apiResult.data) {
      this.memoryCache.set(key, apiResult.data, 300000); // 5분
      await this.redisCache.set(key, apiResult.data, 1800); // 30분
      await this.database.save(key, apiResult.data);
      return apiResult.data;
    }

    return null;
  }

  async getFromMemory(key) {
    return this.memoryCache.get(key);
  }

  async getFromRedis(key) {
    return await this.redisCache.get(key);
  }

  async getFromDatabase(key) {
    return await this.database.load(key);
  }

  async saveToDatabase(key) {
    const data = this.memoryCache.get(key) || (await this.redisCache.get(key));
    if (data) {
      await this.database.save(key, data);
      return true;
    }
    return false;
  }
}

// === API 클라이언트 팩토리 ===

/**
 * 캐시 플로우 테스트용 API 클라이언트 생성
 */
export function createCacheFlowClient() {
  return {
    characters: new CharactersService(),
    armories: new ArmoriesService(),
    auctions: new AuctionsService(),
    news: new NewsService(),
    gamecontents: new GameContentsService(),
    markets: new MarketsService(),
  };
}
