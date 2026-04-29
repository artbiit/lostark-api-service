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
      logger.error('Failed to initialize migrations table', {
        error: error instanceof Error ? error.message : String(error),
      });
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
      }>(
        'SELECT version, name, executed_at, execution_time FROM migrations ORDER BY version',
      );
      return rows.map((r) => ({
        version: r.version,
        name: r.name,
        executedAt: r.executed_at,
        executionTime: r.execution_time,
      }));
    } catch (error) {
      logger.error('Failed to get executed migrations', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private async recordMigration(migration: Migration, executionTime: number): Promise<void> {
    try {
      await pgClient.execute(
        'INSERT INTO migrations (version, name, execution_time) VALUES ($1, $2, $3)',
        [migration.version, migration.name, executionTime],
      );
      logger.info('Migration recorded', { version: migration.version, name: migration.name, executionTime });
    } catch (error) {
      logger.error('Failed to record migration', {
        version: migration.version,
        name: migration.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async removeMigrationRecord(version: string): Promise<void> {
    try {
      await pgClient.execute('DELETE FROM migrations WHERE version = $1', [version]);
      logger.info('Migration record removed', { version });
    } catch (error) {
      logger.error('Failed to remove migration record', {
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async executeMigration(migration: Migration, direction: 'up' | 'down'): Promise<void> {
    const startTime = Date.now();
    const sql = direction === 'up' ? migration.up : migration.down;

    try {
      logger.info(`Executing migration ${direction}`, {
        version: migration.version,
        name: migration.name,
      });

      await pgClient.execute(sql);

      const executionTime = Date.now() - startTime;

      if (direction === 'up') {
        await this.recordMigration(migration, executionTime);
      } else {
        await this.removeMigrationRecord(migration.version);
      }

      logger.info(`Migration ${direction} completed`, {
        version: migration.version,
        name: migration.name,
        executionTime,
      });
    } catch (error) {
      logger.error(`Migration ${direction} failed`, {
        version: migration.version,
        name: migration.name,
        error: error instanceof Error ? error.message : String(error),
      });
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
      logger.error('Failed to get migration status', {
        error: error instanceof Error ? error.message : String(error),
      });
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

      logger.info('Starting migrations', { pendingCount: pendingMigrations.length });
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration, 'up');
      }
      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', {
        error: error instanceof Error ? error.message : String(error),
      });
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
      logger.info('Starting rollback', { rollbackCount: migrationsToRollback.length });

      for (const migrationRecord of migrationsToRollback) {
        const migration = MIGRATIONS.find((m) => m.version === migrationRecord.version);
        if (!migration) {
          logger.warn('Migration not found for rollback', { version: migrationRecord.version });
          continue;
        }
        await this.executeMigration(migration, 'down');
      }
      logger.info('Rollback completed successfully');
    } catch (error) {
      logger.error('Rollback failed', {
        error: error instanceof Error ? error.message : String(error),
      });
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
