import { Pool, PoolClient, QueryResult } from 'pg';

import { parseEnv } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface PgExecuteResult {
  rowCount: number;
  rows: Record<string, unknown>[];
}

export interface PgStats {
  connected: boolean;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  lastError?: string;
  lastErrorTime?: Date;
}

export class PgClient {
  private pool: Pool;
  private isConnected = false;

  constructor() {
    const env = parseEnv();

    this.pool = new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE,
      max: env.DB_CONNECTION_LIMIT,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected PostgreSQL pool error', { error: err.message });
    });
  }

  async connect(): Promise<void> {
    try {
      const env = parseEnv();
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.isConnected = true;
      logger.info('PostgreSQL connected successfully', {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_DATABASE,
      });
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('PostgreSQL disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    try {
      if (!this.isConnected) {
        throw new Error('PostgreSQL not connected');
      }
      const result: QueryResult<T> = await this.pool.query(sql, params);
      logger.debug('PostgreSQL query executed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        paramsCount: params?.length ?? 0,
        resultCount: result.rowCount ?? 0,
      });
      return result.rows;
    } catch (error) {
      logger.error('PostgreSQL query failed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<PgExecuteResult> {
    try {
      if (!this.isConnected) {
        throw new Error('PostgreSQL not connected');
      }
      const result = await this.pool.query(sql, params);
      logger.debug('PostgreSQL execute completed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        paramsCount: params?.length ?? 0,
        rowCount: result.rowCount ?? 0,
      });
      return { rowCount: result.rowCount ?? 0, rows: result.rows };
    } catch (error) {
      logger.error('PostgreSQL execute failed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    let client: PoolClient | null = null;
    try {
      if (!this.isConnected) {
        throw new Error('PostgreSQL not connected');
      }
      client = await this.pool.connect();
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      logger.debug('PostgreSQL transaction committed successfully');
      return result;
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
          logger.debug('PostgreSQL transaction rolled back');
        } catch (rollbackError) {
          logger.error('Failed to rollback PostgreSQL transaction', {
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          });
        }
      }
      logger.error('PostgreSQL transaction failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getConnection(): Promise<PoolClient> {
    if (!this.isConnected) {
      throw new Error('PostgreSQL not connected');
    }
    return this.pool.connect();
  }

  async getStats(): Promise<PgStats> {
    return {
      connected: this.isConnected,
      totalConnections: this.pool.totalCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      idleConnections: this.pool.idleCount,
    };
  }

  isConnectedToPostgres(): boolean {
    return this.isConnected;
  }

  getPoolStatus(): { totalConnections: number; activeConnections: number; idleConnections: number } {
    return {
      totalConnections: this.pool.totalCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      idleConnections: this.pool.idleCount,
    };
  }
}

export const pgClient = new PgClient();
