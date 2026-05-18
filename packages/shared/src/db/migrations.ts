import { logger } from '../config/logger.js';
import { pgClient, PgExecuteResult } from './postgres.js';

export interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
  createdAt: Date;
}

export interface MigrationRecord {
  version: string;
  name: string;
  executedAt: Date;
  executionTime: number;
}

const MIGRATIONS: Migration[] = [
  {
    version: '2025-01-27-001',
    name: 'Create migrations table',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        version VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        execution_time INT NOT NULL
      );
    `,
    down: `
      DROP TABLE IF EXISTS migrations;
    `,
    createdAt: new Date('2025-01-27'),
  },
  {
    version: '2025-01-27-002',
    name: 'Create character_cache table',
    up: `
      CREATE TABLE IF NOT EXISTS character_cache (
        id BIGSERIAL PRIMARY KEY,
        character_name VARCHAR(50) NOT NULL,
        server_name VARCHAR(50) NOT NULL,
        item_level NUMERIC(6,2) NOT NULL,
        character_data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        UNIQUE (character_name, server_name)
      );
      CREATE INDEX IF NOT EXISTS idx_character_cache_character_name ON character_cache (character_name);
      CREATE INDEX IF NOT EXISTS idx_character_cache_server_name ON character_cache (server_name);
      CREATE INDEX IF NOT EXISTS idx_character_cache_item_level ON character_cache (item_level);
      CREATE INDEX IF NOT EXISTS idx_character_cache_expires_at ON character_cache (expires_at);
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;
      CREATE OR REPLACE TRIGGER trg_character_cache_updated_at
        BEFORE UPDATE ON character_cache
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `,
    down: `
      DROP TRIGGER IF EXISTS trg_character_cache_updated_at ON character_cache;
      DROP TABLE IF EXISTS character_cache;
    `,
    createdAt: new Date('2025-01-27'),
  },
  {
    version: '2025-01-27-003',
    name: 'Create cache_metadata table',
    up: `
      DO $$ BEGIN
        CREATE TYPE cache_type_enum AS ENUM ('character', 'account', 'system');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      CREATE TABLE IF NOT EXISTS cache_metadata (
        id BIGSERIAL PRIMARY KEY,
        cache_key VARCHAR(255) NOT NULL,
        cache_type cache_type_enum NOT NULL,
        data_size BIGINT NOT NULL,
        hit_count INT NOT NULL DEFAULT 0,
        miss_count INT NOT NULL DEFAULT 0,
        last_accessed TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cache_metadata_cache_key ON cache_metadata (cache_key);
      CREATE INDEX IF NOT EXISTS idx_cache_metadata_cache_type ON cache_metadata (cache_type);
      CREATE INDEX IF NOT EXISTS idx_cache_metadata_last_accessed ON cache_metadata (last_accessed);
      CREATE OR REPLACE TRIGGER trg_cache_metadata_updated_at
        BEFORE UPDATE ON cache_metadata
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `,
    down: `
      DROP TRIGGER IF EXISTS trg_cache_metadata_updated_at ON cache_metadata;
      DROP TABLE IF EXISTS cache_metadata;
      DROP TYPE IF EXISTS cache_type_enum;
    `,
    createdAt: new Date('2025-01-27'),
  },
  {
    version: '2026-05-16-004',
    name: 'Make cache_metadata.cache_key unique for ON CONFLICT upsert',
    up: `
      -- ON CONFLICT (cache_key) upsert 가 작동하려면 cache_key 단독에 UNIQUE
      -- 제약/인덱스가 있어야 한다. 003 에서는 non-unique index 만 있어서
      -- DatabaseCache.updateCacheMetadata 가 'no unique or exclusion constraint
      -- matching the ON CONFLICT specification' 으로 매번 실패하던 버그를 수정.
      DELETE FROM cache_metadata a USING cache_metadata b
        WHERE a.id < b.id AND a.cache_key = b.cache_key;
      DROP INDEX IF EXISTS idx_cache_metadata_cache_key;
      CREATE UNIQUE INDEX idx_cache_metadata_cache_key ON cache_metadata (cache_key);
    `,
    down: `
      DROP INDEX IF EXISTS idx_cache_metadata_cache_key;
      CREATE INDEX idx_cache_metadata_cache_key ON cache_metadata (cache_key);
    `,
    createdAt: new Date('2026-05-16'),
  },
];

export class MigrationManager {
  private async initializeMigrationsTable(): Promise<void> {
    try {
      await pgClient.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          version VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          execution_time INT NOT NULL
        );
      `);
      logger.info('Migrations table initialized');
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to initialize migrations table',
      );
      throw error;
    }
  }

  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      const rows = await pgClient.query<{
        version: string;
        name: string;
        executed_at: Date;
        execution_time: number;
      }>('SELECT version, name, executed_at, execution_time FROM migrations ORDER BY version');
      return rows.map((r) => ({
        version: r.version,
        name: r.name,
        executedAt: r.executed_at,
        executionTime: r.execution_time,
      }));
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to get executed migrations',
      );
      return [];
    }
  }

  private async recordMigration(migration: Migration, executionTime: number): Promise<void> {
    try {
      await pgClient.execute(
        'INSERT INTO migrations (version, name, execution_time) VALUES ($1, $2, $3)',
        [migration.version, migration.name, executionTime],
      );
      logger.info(
        {
          version: migration.version,
          name: migration.name,
          executionTime,
        },
        'Migration recorded',
      );
    } catch (error) {
      logger.error(
        {
          version: migration.version,
          name: migration.name,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to record migration',
      );
      throw error;
    }
  }

  private async removeMigrationRecord(version: string): Promise<void> {
    try {
      await pgClient.execute('DELETE FROM migrations WHERE version = $1', [version]);
      logger.info({ version }, 'Migration record removed');
    } catch (error) {
      logger.error(
        {
          version,
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to remove migration record',
      );
      throw error;
    }
  }

  private async executeMigration(migration: Migration, direction: 'up' | 'down'): Promise<void> {
    const startTime = Date.now();
    const sql = direction === 'up' ? migration.up : migration.down;

    try {
      logger.info(
        {
          version: migration.version,
          name: migration.name,
        },
        `Executing migration ${direction}`,
      );

      await pgClient.execute(sql);

      const executionTime = Date.now() - startTime;

      if (direction === 'up') {
        await this.recordMigration(migration, executionTime);
      } else {
        await this.removeMigrationRecord(migration.version);
      }

      logger.info(
        {
          version: migration.version,
          name: migration.name,
          executionTime,
        },
        `Migration ${direction} completed`,
      );
    } catch (error) {
      logger.error(
        {
          version: migration.version,
          name: migration.name,
          error: error instanceof Error ? error.message : String(error),
        },
        `Migration ${direction} failed`,
      );
      throw error;
    }
  }

  async getMigrationStatus(): Promise<{
    totalMigrations: number;
    executedMigrations: number;
    pendingMigrations: number;
    lastMigration?: MigrationRecord;
  }> {
    try {
      await this.initializeMigrationsTable();
      const executedMigrations = await this.getExecutedMigrations();
      const totalMigrations = MIGRATIONS.length;
      const pendingMigrations = totalMigrations - executedMigrations.length;
      const lastMigration =
        executedMigrations.length > 0
          ? executedMigrations[executedMigrations.length - 1]
          : undefined;
      return {
        totalMigrations,
        executedMigrations: executedMigrations.length,
        pendingMigrations,
        ...(lastMigration && { lastMigration }),
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to get migration status',
      );
      return {
        totalMigrations: MIGRATIONS.length,
        executedMigrations: 0,
        pendingMigrations: MIGRATIONS.length,
      };
    }
  }

  async migrate(): Promise<void> {
    try {
      await this.initializeMigrationsTable();
      const executedMigrations = await this.getExecutedMigrations();
      const executedVersions = new Set(executedMigrations.map((m) => m.version));
      const pendingMigrations = MIGRATIONS.filter((m) => !executedVersions.has(m.version));

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info({ pendingCount: pendingMigrations.length }, 'Starting migrations');
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration, 'up');
      }
      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Migration failed',
      );
      throw error;
    }
  }

  async rollback(steps: number = 1): Promise<void> {
    try {
      await this.initializeMigrationsTable();
      const executedMigrations = await this.getExecutedMigrations();

      if (executedMigrations.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const migrationsToRollback = executedMigrations.slice(-steps).reverse();
      logger.info({ rollbackCount: migrationsToRollback.length }, 'Starting rollback');

      for (const migrationRecord of migrationsToRollback) {
        const migration = MIGRATIONS.find((m) => m.version === migrationRecord.version);
        if (!migration) {
          logger.warn({ version: migrationRecord.version }, 'Migration not found for rollback');
          continue;
        }
        await this.executeMigration(migration, 'down');
      }
      logger.info('Rollback completed successfully');
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Rollback failed',
      );
      throw error;
    }
  }

  getMigrations(): Migration[] {
    return [...MIGRATIONS];
  }

  getMigration(version: string): Migration | undefined {
    return MIGRATIONS.find((m) => m.version === version);
  }
}

export const migrationManager = new MigrationManager();
