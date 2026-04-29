import { logger } from '@lostark/shared';
import { pgClient } from '@lostark/shared/db/postgres';
import { NormalizedCharacterDetail } from '../normalizers/armories-normalizer.js';

export interface DatabaseCacheStats {
  totalEntries: number;
  expiredEntries: number;
  totalDataSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  lastCleanup: Date | null;
}

export class DatabaseCache {
  private stats = {
    totalHits: 0,
    totalMisses: 0,
  };

  async setCharacterDetail(
    characterName: string,
    characterDetail: NormalizedCharacterDetail,
    ttlDays: number = 30,
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ttlDays);

      const serializedData = JSON.stringify({
        data: characterDetail,
        createdAt: new Date().toISOString(),
        version: 'v1',
      });

      const dataSize = Buffer.byteLength(serializedData, 'utf8');

      await pgClient.execute(
        `
        INSERT INTO character_cache
          (character_name, server_name, item_level, character_data, expires_at)
        VALUES ($1, $2, $3, $4::jsonb, $5)
        ON CONFLICT (character_name, server_name) DO UPDATE SET
          item_level = EXCLUDED.item_level,
          character_data = EXCLUDED.character_data,
          expires_at = EXCLUDED.expires_at
        `,
        [
          characterName,
          characterDetail.serverName,
          characterDetail.itemLevel,
          serializedData,
          expiresAt,
        ],
      );

      await this.updateCacheMetadata(characterName, 'character', dataSize);

      logger.debug('Character detail cached in database', {
        characterName,
        serverName: characterDetail.serverName,
        itemLevel: characterDetail.itemLevel,
        ttlDays,
        dataSize,
      });
    } catch (error) {
      logger.error('Failed to cache character detail in database', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getCharacterDetail(characterName: string): Promise<NormalizedCharacterDetail | null> {
    try {
      const rows = await pgClient.query<{ character_data: string; expires_at: Date }>(
        `
        SELECT character_data, expires_at
        FROM character_cache
        WHERE character_name = $1 AND expires_at > NOW()
        `,
        [characterName],
      );

      if (rows.length === 0) {
        this.stats.totalMisses++;
        logger.debug('Character detail database cache miss', { characterName });
        return null;
      }

      const row = rows[0]!;
      const parsed = typeof row.character_data === 'string'
        ? JSON.parse(row.character_data)
        : row.character_data;
      const characterDetail = parsed.data as NormalizedCharacterDetail;

      await this.updateAccessStats(characterName, 'hit');
      this.stats.totalHits++;
      logger.debug('Character detail database cache hit', { characterName });

      return characterDetail;
    } catch (error) {
      this.stats.totalMisses++;
      logger.error('Failed to get character detail from database', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async deleteCharacterDetail(characterName: string): Promise<void> {
    try {
      await pgClient.execute('DELETE FROM character_cache WHERE character_name = $1', [
        characterName,
      ]);
      await this.deleteCacheMetadata(characterName);
      logger.debug('Character detail deleted from database', { characterName });
    } catch (error) {
      logger.error('Failed to delete character detail from database', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getCharacterMeta(characterName: string): Promise<{
    itemLevel: number;
    serverName: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    dataSize: number;
  } | null> {
    try {
      const rows = await pgClient.query<{
        item_level: number;
        server_name: string;
        created_at: Date;
        updated_at: Date;
        expires_at: Date;
        character_data: string;
      }>(
        `
        SELECT item_level, server_name, created_at, updated_at, expires_at, character_data
        FROM character_cache
        WHERE character_name = $1 AND expires_at > NOW()
        `,
        [characterName],
      );

      if (rows.length === 0) return null;

      const row = rows[0]!;
      const dataSize = Buffer.byteLength(JSON.stringify(row.character_data), 'utf8');

      return {
        itemLevel: row.item_level,
        serverName: row.server_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
        dataSize,
      };
    } catch (error) {
      logger.error('Failed to get character meta from database', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getCacheStats(): Promise<DatabaseCacheStats> {
    try {
      const totalRows = await pgClient.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM character_cache WHERE expires_at > NOW()',
      );
      const totalEntries = Number(totalRows[0]?.count ?? 0);

      const expiredRows = await pgClient.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM character_cache WHERE expires_at <= NOW()',
      );
      const expiredEntries = Number(expiredRows[0]?.count ?? 0);

      const sizeRows = await pgClient.query<{ total_size: string | null }>(
        `SELECT SUM(LENGTH(character_data::text)) as total_size
         FROM character_cache WHERE expires_at > NOW()`,
      );
      const totalDataSize = Number(sizeRows[0]?.total_size ?? 0);

      const cleanupRows = await pgClient.query<{ last_cleanup: Date | null }>(
        `SELECT MAX(updated_at) as last_cleanup FROM cache_metadata WHERE cache_type = 'character'`,
      );
      const lastCleanup = cleanupRows[0]?.last_cleanup ?? null;

      const totalRequests = this.stats.totalHits + this.stats.totalMisses;
      const hitRate = totalRequests > 0 ? this.stats.totalHits / totalRequests : 0;

      return {
        totalEntries,
        expiredEntries,
        totalDataSize,
        hitRate,
        totalHits: this.stats.totalHits,
        totalMisses: this.stats.totalMisses,
        lastCleanup,
      };
    } catch (error) {
      logger.error('Failed to get database cache stats', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        totalEntries: 0,
        expiredEntries: 0,
        totalDataSize: 0,
        hitRate: 0,
        totalHits: this.stats.totalHits,
        totalMisses: this.stats.totalMisses,
        lastCleanup: null,
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      const startTime = Date.now();

      const result = await pgClient.execute(
        'DELETE FROM character_cache WHERE expires_at <= NOW()',
      );

      await pgClient.execute(`
        DELETE FROM cache_metadata
        WHERE cache_key NOT IN (SELECT character_name FROM character_cache)
      `);

      const cleanupTime = Date.now() - startTime;
      logger.info('Database cache cleanup completed', {
        deletedEntries: result.rowCount,
        cleanupTime,
      });
    } catch (error) {
      logger.error('Failed to cleanup database cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async clearAll(): Promise<void> {
    try {
      logger.warn('Clearing all database cache data');
      await pgClient.execute('DELETE FROM character_cache');
      await pgClient.execute(`DELETE FROM cache_metadata WHERE cache_type = 'character'`);
      logger.info('Database cache cleared');
    } catch (error) {
      logger.error('Failed to clear database cache', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async hasCharacterDetail(characterName: string): Promise<boolean> {
    try {
      const rows = await pgClient.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM character_cache WHERE character_name = $1 AND expires_at > NOW()',
        [characterName],
      );
      return Number(rows[0]?.count ?? 0) > 0;
    } catch (error) {
      logger.error('Failed to check character detail existence in database', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async getCharacterDetailExpiry(characterName: string): Promise<Date | null> {
    try {
      const rows = await pgClient.query<{ expires_at: Date }>(
        'SELECT expires_at FROM character_cache WHERE character_name = $1',
        [characterName],
      );
      return rows[0]?.expires_at ?? null;
    } catch (error) {
      logger.error('Failed to get character detail expiry from database', {
        characterName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async updateCacheMetadata(
    cacheKey: string,
    cacheType: 'character' | 'account' | 'system',
    dataSize: number,
  ): Promise<void> {
    try {
      await pgClient.execute(
        `
        INSERT INTO cache_metadata
          (cache_key, cache_type, data_size, hit_count, miss_count, last_accessed)
        VALUES ($1, $2::cache_type_enum, $3, 0, 0, NOW())
        ON CONFLICT (cache_key) DO UPDATE SET
          data_size = EXCLUDED.data_size
        `,
        [cacheKey, cacheType, dataSize],
      );
    } catch (error) {
      logger.error('Failed to update cache metadata', {
        cacheKey,
        cacheType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async updateAccessStats(cacheKey: string, accessType: 'hit' | 'miss'): Promise<void> {
    try {
      const field = accessType === 'hit' ? 'hit_count' : 'miss_count';
      await pgClient.execute(
        `UPDATE cache_metadata SET ${field} = ${field} + 1, last_accessed = NOW() WHERE cache_key = $1`,
        [cacheKey],
      );
    } catch (error) {
      logger.error('Failed to update access stats', {
        cacheKey,
        accessType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async deleteCacheMetadata(cacheKey: string): Promise<void> {
    try {
      await pgClient.execute('DELETE FROM cache_metadata WHERE cache_key = $1', [cacheKey]);
    } catch (error) {
      logger.error('Failed to delete cache metadata', {
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  isConnected(): boolean {
    return pgClient.isConnectedToPostgres();
  }
}

export function startDatabaseCacheCleanupScheduler(): NodeJS.Timeout {
  const interval = 60 * 60 * 1000;
  return setInterval(async () => {
    try {
      await databaseCache.cleanup();
    } catch (error) {
      logger.error('Failed to cleanup database cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, interval);
}

export const databaseCache = new DatabaseCache();
