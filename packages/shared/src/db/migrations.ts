/**
 * @cursor-change: 2025-01-27, v1.0.0, 데이터베이스 마이그레이션 시스템 구현
 *
 * 데이터베이스 마이그레이션 시스템
 * - up/down 마이그레이션 지원
 * - 버전 관리 및 추적
 * - 자동 마이그레이션 실행
 * - 롤백 지원
 */

import { RowDataPacket } from 'mysql2/promise';
import { logger } from '../config/logger.js';
import { mysqlClient } from './mysql.js';

// === 마이그레이션 타입 ===

export interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
  createdAt: Date;
}

export interface MigrationRecord extends RowDataPacket {
  version: string;
  name: string;
  executedAt: Date;
  executionTime: number; // 밀리초
}

// === 마이그레이션 정의 ===

const MIGRATIONS: Migration[] = [
  {
    version: '2025-01-27-001',
    name: 'Create migrations table',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        version VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        character_name VARCHAR(50) NOT NULL,
        server_name VARCHAR(50) NOT NULL,
        item_level DECIMAL(6,2) NOT NULL,
        character_data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        INDEX idx_character_name (character_name),
        INDEX idx_server_name (server_name),
        INDEX idx_item_level (item_level),
        INDEX idx_expires_at (expires_at),
        UNIQUE KEY uk_character_server (character_name, server_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    down: `
      DROP TABLE IF EXISTS character_cache;
    `,
    createdAt: new Date('2025-01-27'),
  },
  {
    version: '2025-01-27-003',
    name: 'Create cache_metadata table',
    up: `
      CREATE TABLE IF NOT EXISTS cache_metadata (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        cache_key VARCHAR(255) NOT NULL,
        cache_type ENUM('character', 'account', 'system') NOT NULL,
        data_size BIGINT NOT NULL,
        hit_count INT DEFAULT 0,
        miss_count INT DEFAULT 0,
        last_accessed TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cache_key (cache_key),
        INDEX idx_cache_type (cache_type),
        INDEX idx_last_accessed (last_accessed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    down: `
      DROP TABLE IF EXISTS cache_metadata;
    `,
    createdAt: new Date('2025-01-27'),
  },
];

// === 마이그레이션 관리자 ===

/**
 * 마이그레이션 관리자
 */
export class MigrationManager {
  /**
   * 마이그레이션 테이블 초기화
   */
  private async initializeMigrationsTable(): Promise<void> {
    try {
      await mysqlClient.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          version VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          execution_time INT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      logger.info('Migrations table initialized');
    } catch (error) {
      logger.error('Failed to initialize migrations table', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 실행된 마이그레이션 목록 조회
   */
  private async getExecutedMigrations(): Promise<MigrationRecord[]> {
    try {
      const rows = await mysqlClient.query<MigrationRecord>(
        'SELECT version, name, executed_at as executedAt, execution_time as executionTime FROM migrations ORDER BY version',
      );
      return rows;
    } catch (error) {
      logger.error('Failed to get executed migrations', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * 마이그레이션 실행 기록
   */
  private async recordMigration(migration: Migration, executionTime: number): Promise<void> {
    try {
      await mysqlClient.execute(
        'INSERT INTO migrations (version, name, execution_time) VALUES (?, ?, ?)',
        [migration.version, migration.name, executionTime],
      );

      logger.info('Migration recorded', {
        version: migration.version,
        name: migration.name,
        executionTime,
      });
    } catch (error) {
      logger.error('Failed to record migration', {
        version: migration.version,
        name: migration.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 마이그레이션 실행 기록 삭제
   */
  private async removeMigrationRecord(version: string): Promise<void> {
    try {
      await mysqlClient.execute('DELETE FROM migrations WHERE version = ?', [version]);

      logger.info('Migration record removed', { version });
    } catch (error) {
      logger.error('Failed to remove migration record', {
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 마이그레이션 실행
   */
  private async executeMigration(migration: Migration, direction: 'up' | 'down'): Promise<void> {
    const startTime = Date.now();
    const sql = direction === 'up' ? migration.up : migration.down;

    try {
      logger.info(`Executing migration ${direction}`, {
        version: migration.version,
        name: migration.name,
      });

      // SQL 문을 세미콜론으로 분리하여 여러 문장 실행
      const statements = sql
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      for (const statement of statements) {
        await mysqlClient.execute(statement);
      }

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

  /**
   * 마이그레이션 상태 확인
   */
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

  /**
   * 마이그레이션 실행 (up)
   */
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

      logger.info('Starting migrations', {
        pendingCount: pendingMigrations.length,
      });

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

  /**
   * 마이그레이션 롤백 (down)
   */
  async rollback(steps: number = 1): Promise<void> {
    try {
      await this.initializeMigrationsTable();

      const executedMigrations = await this.getExecutedMigrations();

      if (executedMigrations.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const migrationsToRollback = executedMigrations.slice(-steps).reverse();

      logger.info('Starting rollback', {
        rollbackCount: migrationsToRollback.length,
      });

      for (const migrationRecord of migrationsToRollback) {
        const migration = MIGRATIONS.find((m) => m.version === migrationRecord.version);

        if (!migration) {
          logger.warn('Migration not found for rollback', {
            version: migrationRecord.version,
          });
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

  /**
   * 마이그레이션 목록 조회
   */
  getMigrations(): Migration[] {
    return [...MIGRATIONS];
  }

  /**
   * 특정 버전의 마이그레이션 조회
   */
  getMigration(version: string): Migration | undefined {
    return MIGRATIONS.find((m) => m.version === version);
  }
}

// === 싱글톤 인스턴스 ===

/**
 * 마이그레이션 관리자 인스턴스
 */
export const migrationManager = new MigrationManager();
