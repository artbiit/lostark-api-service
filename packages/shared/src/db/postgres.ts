import { Pool, PoolClient, QueryResult } from 'pg';

import { parseEnv } from '../config/env.js';
import { logger } from '../config/logger.js';

/** connectWithRetry() 재시도 간 대기. 부팅 경로 1회성 bounded 루프이므로 취소 불필요. */
function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref();
  });
}

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
  private reconnecting: Promise<void> | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(pool?: Pool) {
    if (pool) {
      this.pool = pool;
    } else {
      const env = parseEnv();

      this.pool = new Pool({
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USERNAME,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
        max: env.DB_CONNECTION_LIMIT,
      });
    }

    this.pool.on('error', (err) => {
      logger.error({ error: err.message }, 'Unexpected PostgreSQL pool error');
    });
  }

  async connect(): Promise<void> {
    try {
      const env = parseEnv();
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.isConnected = true;
      logger.info(
        {
          host: env.DB_HOST,
          port: env.DB_PORT,
          database: env.DB_DATABASE,
        },
        'PostgreSQL connected successfully',
      );
    } catch (error) {
      this.isConnected = false;
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to connect to PostgreSQL',
      );
      throw error;
    }
  }

  /**
   * connect() 를 지수백오프로 감싼 부팅 시 재시도 래퍼.
   * maxAttempts 소진 시 마지막 connect() 의 원본 에러를 그대로 throw.
   */
  async connectWithRetry(): Promise<void> {
    const env = parseEnv();
    const maxAttempts = Math.max(1, env.DB_CONNECT_RETRY_MAX_ATTEMPTS);
    let delay = env.DB_CONNECT_RETRY_INITIAL_DELAY_MS;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.connect();
        return;
      } catch (error) {
        if (attempt >= maxAttempts) {
          throw error;
        }
        logger.debug(
          { attempt, maxAttempts, delayMs: delay },
          'PostgreSQL connect retry scheduled',
        );
        await sleep(delay);
        delay = Math.min(delay * 2, env.DB_CONNECT_RETRY_MAX_DELAY_MS);
      }
    }
  }

  /**
   * query/execute/transaction/getConnection 및 헬스체크 tick 의 공용 가드.
   * 연결이 끊긴 경우 single-flight 로 재연결을 시도한다.
   */
  private async ensureConnected(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (!this.reconnecting) {
      this.reconnecting = this.connect()
        .catch(() => {})
        .finally(() => {
          this.reconnecting = null;
        });
    }
    await this.reconnecting;

    if (!this.isConnected) {
      throw new Error('PostgreSQL not connected');
    }
  }

  /** 백그라운드 헬스체크 self-heal 타이머 시작. idempotent — 이미 실행 중이면 무시. */
  startHealthCheck(): void {
    const env = parseEnv();

    if (!env.DB_HEALTH_CHECK_ENABLED) {
      logger.info('PgClient healthcheck: disabled by config, skipping');
      return;
    }

    if (this.healthCheckTimer) {
      return;
    }

    this.healthCheckTimer = setInterval(() => {
      void this.ensureConnected().catch((error) => {
        logger.warn(
          {
            error: error instanceof Error ? error.message : String(error),
          },
          'PgClient healthcheck: reconnect attempt failed',
        );
      });
    }, env.DB_HEALTH_CHECK_INTERVAL_MS);
    this.healthCheckTimer.unref();

    logger.info({ intervalMs: env.DB_HEALTH_CHECK_INTERVAL_MS }, 'PgClient healthcheck: started');
  }

  /** 헬스체크 타이머 정지. 실행 중이 아니면 no-op. */
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('PostgreSQL disconnected successfully');
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to disconnect from PostgreSQL',
      );
      throw error;
    }
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    try {
      await this.ensureConnected();
      const result: QueryResult<T> = await this.pool.query(sql, params);
      logger.debug(
        {
          sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
          paramsCount: params?.length ?? 0,
          resultCount: result.rowCount ?? 0,
        },
        'PostgreSQL query executed',
      );
      return result.rows;
    } catch (error) {
      logger.error(
        {
          sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
          error: error instanceof Error ? error.message : String(error),
        },
        'PostgreSQL query failed',
      );
      throw error;
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<PgExecuteResult> {
    try {
      await this.ensureConnected();
      const result = await this.pool.query(sql, params);
      logger.debug(
        {
          sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
          paramsCount: params?.length ?? 0,
          rowCount: result.rowCount ?? 0,
        },
        'PostgreSQL execute completed',
      );
      return { rowCount: result.rowCount ?? 0, rows: result.rows };
    } catch (error) {
      logger.error(
        {
          sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
          error: error instanceof Error ? error.message : String(error),
        },
        'PostgreSQL execute failed',
      );
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    let client: PoolClient | null = null;
    try {
      await this.ensureConnected();
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
          logger.error(
            {
              error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
            },
            'Failed to rollback PostgreSQL transaction',
          );
        }
      }
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'PostgreSQL transaction failed',
      );
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getConnection(): Promise<PoolClient> {
    await this.ensureConnected();
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

  getPoolStatus(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  } {
    return {
      totalConnections: this.pool.totalCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      idleConnections: this.pool.idleCount,
    };
  }
}

export const pgClient = new PgClient();
