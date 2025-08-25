/**
 * @cursor-change: 2025-01-27, v1.0.0, UDP 게이트웨이 서버 구현
 *
 * UDP 게이트웨이 서버
 * - lock-free 큐 시스템
 * - 워커 풀 기반 메시지 처리
 * - 초저지연 응답
 * - 과부하 시 메시지 드롭
 */

import { createSocket, Socket, RemoteInfo } from 'dgram';
import { EventEmitter } from 'events';
import { logger } from '@lostark/shared';
import { parseEnv } from '@lostark/shared/config/env.js';
import { 
  initializeRedis, 
  disconnectRedis, 
  initializeMySQL, 
  disconnectMySQL,
  cacheManager,
  ArmoriesService,
} from '@lostark/data-service';

// === UDP 서버 설정 ===

export interface UdpServerConfig {
  port: number;
  host: string;
  maxMessageSize: number;
  workerPoolSize: number;
  queueSize: number;
  timeout: number;
}

// === 메시지 타입 ===

export interface UdpMessage {
  id: string;
  type: 'character_detail' | 'character_refresh' | 'cache_status' | 'ping';
  payload: {
    characterName?: string;
    sections?: string[];
    [key: string]: unknown;
  };
  timestamp: number;
}

export interface UdpResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
  responseTime: number;
}

// === Lock-free 큐 ===

/**
 * Lock-free 큐 구현
 */
export class LockFreeQueue<T> {
  private queue: T[] = [];
  private maxSize: number;
  private droppedCount = 0;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * 메시지 추가 (큐가 가득 찬 경우 드롭)
   */
  enqueue(item: T): boolean {
    if (this.queue.length >= this.maxSize) {
      this.droppedCount++;
      return false;
    }
    this.queue.push(item);
    return true;
  }

  /**
   * 메시지 제거
   */
  dequeue(): T | undefined {
    return this.queue.shift();
  }

  /**
   * 큐 크기
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * 큐가 비어있는지 확인
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 드롭된 메시지 수
   */
  get droppedMessages(): number {
    return this.droppedCount;
  }

  /**
   * 큐 통계
   */
  getStats() {
    return {
      size: this.size,
      maxSize: this.maxSize,
      droppedCount: this.droppedCount,
      utilization: (this.size / this.maxSize) * 100,
    };
  }
}

// === 워커 풀 ===

/**
 * UDP 메시지 워커
 */
export class UdpWorker {
  private id: number;
  private isRunning = false;
  private armoriesService: ArmoriesService;

  constructor(id: number) {
    this.id = id;
    this.armoriesService = new ArmoriesService();
  }

  /**
   * 워커 시작
   */
  start(): void {
    this.isRunning = true;
    logger.info(`UDP worker ${this.id} started`);
  }

  /**
   * 워커 중지
   */
  stop(): void {
    this.isRunning = false;
    logger.info(`UDP worker ${this.id} stopped`);
  }

  /**
   * 메시지 처리
   */
  async processMessage(message: UdpMessage): Promise<UdpResponse> {
    const startTime = Date.now();
    
    try {
      if (!this.isRunning) {
        throw new Error('Worker is not running');
      }

      logger.debug(`Worker ${this.id} processing message`, { messageId: message.id, type: message.type });

      let data: unknown;
      
      switch (message.type) {
        case 'character_detail':
          data = await this.handleCharacterDetail(message);
          break;
        case 'character_refresh':
          data = await this.handleCharacterRefresh(message);
          break;
        case 'cache_status':
          data = await this.handleCacheStatus();
          break;
        case 'ping':
          data = { pong: true };
          break;
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }

      const responseTime = Date.now() - startTime;

      return {
        id: message.id,
        success: true,
        data,
        timestamp: Date.now(),
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error(`Worker ${this.id} failed to process message`, {
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error),
        responseTime,
      });

      return {
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        responseTime,
      };
    }
  }

  /**
   * 캐릭터 상세 정보 처리
   */
  private async handleCharacterDetail(message: UdpMessage): Promise<unknown> {
    const { characterName, sections } = message.payload;
    
    if (!characterName) {
      throw new Error('Character name is required');
    }

    if (sections && sections.length > 0) {
      return await this.armoriesService.getCharacterDetailPartial(characterName, sections as Array<'profile' | 'equipment' | 'avatars' | 'combat-skills' | 'engravings' | 'cards' | 'gems' | 'colosseums' | 'collectibles'>);
    } else {
      return await this.armoriesService.getCharacterDetail(characterName);
    }
  }

  /**
   * 캐릭터 새로고침 처리
   */
  private async handleCharacterRefresh(message: UdpMessage): Promise<unknown> {
    const { characterName } = message.payload;
    
    if (!characterName) {
      throw new Error('Character name is required');
    }

    return await this.armoriesService.refreshCharacterDetail(characterName);
  }

  /**
   * 캐시 상태 처리
   */
  private async handleCacheStatus(): Promise<unknown> {
    const cacheStats = await cacheManager.getCacheStats();
    const cacheStatus = cacheManager.getCacheLayerStatus();
    
    return {
      stats: cacheStats,
      status: cacheStatus,
    };
  }
}

/**
 * 워커 풀
 */
export class WorkerPool {
  private workers: UdpWorker[] = [];
  private currentWorkerIndex = 0;

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      this.workers.push(new UdpWorker(i));
    }
  }

  /**
   * 워커 풀 시작
   */
  start(): void {
    this.workers.forEach(worker => worker.start());
    logger.info(`Worker pool started with ${this.workers.length} workers`);
  }

  /**
   * 워커 풀 중지
   */
  stop(): void {
    this.workers.forEach(worker => worker.stop());
    logger.info('Worker pool stopped');
  }

  /**
   * 다음 워커 선택 (라운드 로빈)
   */
  getNextWorker(): UdpWorker {
    const worker = this.workers[this.currentWorkerIndex];
    if (!worker) {
      throw new Error('No workers available');
    }
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  /**
   * 워커 풀 통계
   */
  getStats() {
    return {
      workerCount: this.workers.length,
      currentWorkerIndex: this.currentWorkerIndex,
    };
  }
}

// === UDP 서버 ===

/**
 * UDP 게이트웨이 서버
 */
export class UdpServer extends EventEmitter {
  private socket: Socket;
  private config: UdpServerConfig;
  private messageQueue: LockFreeQueue<{
    message: UdpMessage;
    remoteInfo: RemoteInfo;
  }>;
  private workerPool: WorkerPool;
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<UdpServerConfig> = {}) {
    super();
    
    const env = parseEnv();
    
    this.config = {
      port: env.UDP_GATEWAY_PORT || 3001,
      host: env.UDP_GATEWAY_HOST || '0.0.0.0',
      maxMessageSize: env.UDP_GATEWAY_MAX_MESSAGE_SIZE || 8192,
      workerPoolSize: env.UDP_GATEWAY_WORKER_POOL_SIZE || 4,
      queueSize: 1000,
      timeout: 5000, // 5초
      ...config,
    };

    this.socket = createSocket('udp4');
    this.messageQueue = new LockFreeQueue(this.config.queueSize);
    this.workerPool = new WorkerPool(this.config.workerPoolSize);
  }

  /**
   * 서버 초기화
   */
  async initialize(): Promise<void> {
    try {
      // 캐시 시스템 초기화
      await initializeRedis();
      await initializeMySQL();
      
      // 워커 풀 시작
      this.workerPool.start();
      
      // UDP 소켓 이벤트 리스너 등록
      this.setupSocketEventHandlers();
      
      logger.info('UDP server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize UDP server', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 소켓 이벤트 핸들러 설정
   */
  private setupSocketEventHandlers(): void {
    this.socket.on('error', (error) => {
      logger.error('UDP socket error', {
        error: error.message,
      });
    });

    this.socket.on('message', (msg, remoteInfo) => {
      this.handleIncomingMessage(msg, remoteInfo);
    });

    this.socket.on('listening', () => {
      const address = this.socket.address();
      logger.info('UDP server listening', {
        address: `${address.address}:${address.port}`,
      });
    });
  }

  /**
   * 들어오는 메시지 처리
   */
  private handleIncomingMessage(msg: Buffer, remoteInfo: RemoteInfo): void {
    try {
      // 메시지 크기 검증
      if (msg.length > this.config.maxMessageSize) {
        logger.warn('Message too large, dropping', {
          size: msg.length,
          maxSize: this.config.maxMessageSize,
          remote: `${remoteInfo.address}:${remoteInfo.port}`,
        });
        return;
      }

      // JSON 파싱
      const messageStr = msg.toString('utf8');
      const message: UdpMessage = JSON.parse(messageStr);

      // 메시지 유효성 검증
      if (!this.validateMessage(message)) {
        logger.warn('Invalid message format, dropping', {
          message,
          remote: `${remoteInfo.address}:${remoteInfo.port}`,
        });
        return;
      }

      // 큐에 메시지 추가
      const enqueued = this.messageQueue.enqueue({ message, remoteInfo });
      
      if (!enqueued) {
        logger.warn('Message queue full, dropping message', {
          messageId: message.id,
          queueSize: this.messageQueue.size,
          remote: `${remoteInfo.address}:${remoteInfo.port}`,
        });
      }

      logger.debug('Message enqueued', {
        messageId: message.id,
        type: message.type,
        queueSize: this.messageQueue.size,
      });
    } catch (error) {
      logger.error('Failed to handle incoming message', {
        error: error instanceof Error ? error.message : String(error),
        remote: `${remoteInfo.address}:${remoteInfo.port}`,
      });
    }
  }

  /**
   * 메시지 유효성 검증
   */
  private validateMessage(message: UdpMessage): boolean {
    return !!(
      message.id &&
      message.type &&
      message.payload &&
      typeof message.timestamp === 'number'
    );
  }

  /**
   * 메시지 처리 루프 시작
   */
  private startMessageProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      if (this.messageQueue.isEmpty) {
        return;
      }

      const item = this.messageQueue.dequeue();
      if (!item) {
        return;
      }

      const { message, remoteInfo } = item;
      
      try {
        // 워커에게 메시지 전달
        const worker = this.workerPool.getNextWorker();
        const response = await worker.processMessage(message);
        
        // 응답 전송
        await this.sendResponse(response, remoteInfo);
        
        logger.debug('Message processed successfully', {
          messageId: message.id,
          responseTime: response.responseTime,
        });
      } catch (error) {
        logger.error('Failed to process message', {
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
        });
        
        // 에러 응답 전송
        const errorResponse: UdpResponse = {
          id: message.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
          responseTime: 0,
        };
        
        await this.sendResponse(errorResponse, remoteInfo);
      }
    }, 1); // 1ms 간격으로 처리
  }

  /**
   * 응답 전송
   */
  private async sendResponse(response: UdpResponse, remoteInfo: RemoteInfo): Promise<void> {
    try {
      const responseBuffer = Buffer.from(JSON.stringify(response), 'utf8');
      
      this.socket.send(responseBuffer, remoteInfo.port, remoteInfo.address, (error) => {
        if (error) {
          logger.error('Failed to send response', {
            error: error.message,
            remote: `${remoteInfo.address}:${remoteInfo.port}`,
          });
        }
      });
    } catch (error) {
      logger.error('Failed to serialize response', {
        error: error instanceof Error ? error.message : String(error),
        remote: `${remoteInfo.address}:${remoteInfo.port}`,
      });
    }
  }

  /**
   * 서버 시작
   */
  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        logger.warn('UDP server is already running');
        return;
      }

      // 소켓 바인딩
      await new Promise<void>((resolve, reject) => {
        this.socket.bind(this.config.port, this.config.host, () => {
          resolve();
        });
        
        this.socket.once('error', reject);
      });

      this.isRunning = true;
      
      // 메시지 처리 루프 시작
      this.startMessageProcessing();
      
      logger.info('UDP server started successfully', {
        port: this.config.port,
        host: this.config.host,
      });
    } catch (error) {
      logger.error('Failed to start UDP server', {
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
      if (!this.isRunning) {
        logger.warn('UDP server is not running');
        return;
      }

      // 메시지 처리 루프 중지
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }

      // 워커 풀 중지
      this.workerPool.stop();

      // 소켓 닫기
      this.socket.close();

      // 캐시 연결 해제
      await disconnectRedis();
      await disconnectMySQL();

      this.isRunning = false;
      
      logger.info('UDP server stopped successfully');
    } catch (error) {
      logger.error('Failed to stop UDP server', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 서버 상태 조회
   */
  getServerStats() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      queue: this.messageQueue.getStats(),
      workers: this.workerPool.getStats(),
    };
  }
}

// === 서버 인스턴스 ===

/**
 * UDP 서버 인스턴스
 */
export const udpServer = new UdpServer();
