/**
 * @cursor-change: 2025-01-27, v1.0.0, MySQL 클라이언트 구현
 *
 * MySQL 클라이언트 모듈
 * - MySQL 연결 관리
 * - 기본 데이터베이스 작업 (query, execute)
 * - 트랜잭션 지원
 * - 에러 처리 및 재연결 로직
 */

import mysql, {
  Connection,
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

import { parseEnv } from '../config/env.js';
import { logger } from '../config/logger.js';

// === MySQL 통계 타입 ===

export interface MySQLStats {
  connected: boolean;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  lastError?: string;
  lastErrorTime?: Date;
}

// === MySQL 클라이언트 ===

/**
 * MySQL 클라이언트
 */
export class MySQLClient {
  private pool: Pool;
  private isConnected = false;

  constructor() {
    const env = parseEnv();

    this.pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE,
      connectionLimit: env.DB_CONNECTION_LIMIT,
      charset: 'utf8mb4',
      timezone: '+00:00', // UTC
    });

    this.setupEventHandlers();
  }

  /**
   * MySQL 연결 테스트
   */
  async connect(): Promise<void> {
    try {
      const env = parseEnv();
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.isConnected = true;

      logger.info('MySQL connected successfully', {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_DATABASE,
      });
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to MySQL', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * MySQL 연결 해제
   */
  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;

      logger.info('MySQL disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from MySQL', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 쿼리 실행 (SELECT)
   */
  async query<T extends RowDataPacket = RowDataPacket>(sql: string, params?: any[]): Promise<T[]> {
    try {
      if (!this.isConnected) {
        throw new Error('MySQL not connected');
      }

      const [rows] = await this.pool.execute<T[]>(sql, params);

      logger.debug('MySQL query executed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        paramsCount: params?.length || 0,
        resultCount: Array.isArray(rows) ? rows.length : 0,
      });

      return rows;
    } catch (error) {
      logger.error('MySQL query failed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        paramsCount: params?.length || 0,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 쿼리 실행 (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
    try {
      if (!this.isConnected) {
        throw new Error('MySQL not connected');
      }

      const [result] = await this.pool.execute<ResultSetHeader>(sql, params);

      logger.debug('MySQL execute completed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        paramsCount: params?.length || 0,
        affectedRows: result.affectedRows,
        insertId: result.insertId,
      });

      return result;
    } catch (error) {
      logger.error('MySQL execute failed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        paramsCount: params?.length || 0,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 트랜잭션 실행
   */
  async transaction<T>(callback: (connection: Connection) => Promise<T>): Promise<T> {
    let connection: PoolConnection | null = null;

    try {
      if (!this.isConnected) {
        throw new Error('MySQL not connected');
      }

      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      const result = await callback(connection);

      await connection.commit();

      logger.debug('MySQL transaction committed successfully');

      return result;
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
          logger.debug('MySQL transaction rolled back');
        } catch (rollbackError) {
          logger.error('Failed to rollback MySQL transaction', {
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
          });
        }
      }

      logger.error('MySQL transaction failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * 연결 풀에서 직접 연결 가져오기
   */
  async getConnection(): Promise<PoolConnection> {
    try {
      if (!this.isConnected) {
        throw new Error('MySQL not connected');
      }

      return await this.pool.getConnection();
    } catch (error) {
      logger.error('Failed to get MySQL connection', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * MySQL 통계 조회
   */
  async getStats(): Promise<MySQLStats> {
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          totalConnections: 0,
          activeConnections: 0,
          idleConnections: 0,
        };
      }

      // 연결 풀 상태 조회
      const poolStatus = this.pool.pool as any;

      return {
        connected: this.isConnected,
        totalConnections: poolStatus?.config?.connectionLimit || 0,
        activeConnections: poolStatus?.allConnections?.length || 0,
        idleConnections: poolStatus?.freeConnections?.length || 0,
      };
    } catch (error) {
      logger.error('Failed to get MySQL stats', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        connected: this.isConnected,
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        lastError: error instanceof Error ? error.message : String(error),
        lastErrorTime: new Date(),
      };
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnectedToMySQL(): boolean {
    return this.isConnected;
  }

  /**
   * 연결 풀 상태 확인
   */
  getPoolStatus(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  } {
    try {
      const poolStatus = this.pool.pool as any;

      return {
        totalConnections: poolStatus?.config?.connectionLimit || 0,
        activeConnections: poolStatus?.allConnections?.length || 0,
        idleConnections: poolStatus?.freeConnections?.length || 0,
      };
    } catch (error) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
      };
    }
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    this.pool.on('connection', () => {
      logger.debug('New MySQL connection established');
    });

    this.pool.on('acquire', () => {
      logger.debug('MySQL connection acquired from pool');
    });

    this.pool.on('release', () => {
      logger.debug('MySQL connection released to pool');
    });
  }
}

// === 싱글톤 인스턴스 ===

/**
 * MySQL 클라이언트 인스턴스
 */
export const mysqlClient = new MySQLClient();
