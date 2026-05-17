/**
 * UDP 카카오톡 명령 봇 게이트웨이.
 *
 * 클라이언트(메신저봇R Android)는 `{event:'message', data:KakaoMessage, session}`
 * envelope 을 UDP 로 보낸다. 본 서버는 message envelope 만 처리하고,
 * data.content 가 명령 prefix(`!`)로 시작할 때만 라우터로 디스패치한다.
 * 응답은 `{event:'reply:<session>', data:'<text>'}` envelope 으로 송신한다.
 *
 * - WorkerPool 의 각 worker 는 ServiceContext (모듈 싱글톤) 를 공유한다.
 * - 모르는 명령 / 비-message event / parse 실패 → silent drop.
 */

import { createSocket, Socket, RemoteInfo } from 'dgram';
import { EventEmitter } from 'events';

import { logger } from '@lostark/shared';
import { parseEnv } from '@lostark/shared/config/env';
import {
  cacheManager,
  disconnectPostgres,
  disconnectRedis,
  initializePostgres,
  initializeRedis,
} from '@lostark/data-service';

import {
  ClientEnvelope,
  ClientEnvelopeSchema,
  KakaoMessage,
  ReplyEnvelope,
} from './contracts/envelope.js';
import { parseCommand } from './routing/parser.js';
import { createRouter, Router } from './routing/router.js';
import { commandRegistry } from './commands/registry.js';
import {
  ServiceContext,
  createServiceContext,
} from './services/service-context.js';

// === UDP 서버 설정 ===

export interface UdpServerConfig {
  port: number;
  host: string;
  maxMessageSize: number;
  workerPoolSize: number;
  queueSize: number;
  timeout: number;
  commandPrefix: string;
}

// === Lock-free 큐 ===

export class LockFreeQueue<T> {
  private queue: T[] = [];
  private maxSize: number;
  private droppedCount = 0;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  enqueue(item: T): boolean {
    if (this.queue.length >= this.maxSize) {
      this.droppedCount++;
      return false;
    }
    this.queue.push(item);
    return true;
  }

  dequeue(): T | undefined {
    return this.queue.shift();
  }

  get size(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  get droppedMessages(): number {
    return this.droppedCount;
  }

  getStats() {
    return {
      size: this.size,
      maxSize: this.maxSize,
      droppedCount: this.droppedCount,
      utilization: (this.size / this.maxSize) * 100,
    };
  }
}

// === 워커 ===

interface QueueItem {
  envelope: ClientEnvelope;
  remoteInfo: RemoteInfo;
}

export class UdpWorker {
  private id: number;
  private isRunning = false;
  private router: Router;
  private ctx: ServiceContext;
  private prefix: string;

  constructor(id: number, router: Router, ctx: ServiceContext, prefix: string) {
    this.id = id;
    this.router = router;
    this.ctx = ctx;
    this.prefix = prefix;
  }

  start(): void {
    this.isRunning = true;
    logger.info(`UDP worker ${this.id} started`);
  }

  stop(): void {
    this.isRunning = false;
    logger.info(`UDP worker ${this.id} stopped`);
  }

  /**
   * envelope 처리.
   * @returns reply 문자열 또는 silent drop (null).
   */
  async processEnvelope(envelope: ClientEnvelope): Promise<string | null> {
    if (!this.isRunning) return null;

    const { content } = envelope.data;
    const parsed = parseCommand(content, this.prefix);
    if (!parsed) return null;

    return this.router.dispatch(parsed, envelope.data, this.ctx);
  }
}

export class WorkerPool {
  private workers: UdpWorker[] = [];
  private currentWorkerIndex = 0;

  constructor(size: number, router: Router, ctx: ServiceContext, prefix: string) {
    for (let i = 0; i < size; i++) {
      this.workers.push(new UdpWorker(i, router, ctx, prefix));
    }
  }

  start(): void {
    this.workers.forEach((worker) => worker.start());
    logger.info(`Worker pool started with ${this.workers.length} workers`);
  }

  stop(): void {
    this.workers.forEach((worker) => worker.stop());
    logger.info('Worker pool stopped');
  }

  getNextWorker(): UdpWorker {
    const worker = this.workers[this.currentWorkerIndex];
    if (!worker) {
      throw new Error('No workers available');
    }
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  getStats() {
    return {
      workerCount: this.workers.length,
      currentWorkerIndex: this.currentWorkerIndex,
    };
  }
}

// === UDP 서버 ===

export class UdpServer extends EventEmitter {
  private socket: Socket;
  private config: UdpServerConfig;
  private messageQueue: LockFreeQueue<QueueItem>;
  private workerPool: WorkerPool;
  private router: Router;
  private ctx: ServiceContext;
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<UdpServerConfig> = {}) {
    super();

    const env = parseEnv();

    this.config = {
      port: env.UDP_GATEWAY_PORT || 5022,
      host: env.UDP_GATEWAY_HOST || '0.0.0.0',
      maxMessageSize: env.UDP_GATEWAY_MAX_MESSAGE_SIZE || 8192,
      workerPoolSize: env.UDP_GATEWAY_WORKER_POOL_SIZE || 4,
      queueSize: 1000,
      timeout: 5000,
      commandPrefix: env.COMMAND_PREFIX || '!',
      ...config,
    };

    this.socket = createSocket('udp4');
    this.messageQueue = new LockFreeQueue(this.config.queueSize);
    this.ctx = createServiceContext();
    this.router = createRouter(commandRegistry);
    this.workerPool = new WorkerPool(
      this.config.workerPoolSize,
      this.router,
      this.ctx,
      this.config.commandPrefix,
    );
  }

  /**
   * 서버 초기화 (DB/캐시 연결, 워커 풀 시작).
   *
   * Redis/Postgres 연결 실패는 무한 reconnect 사이클로 hang 될 수 있으므로
   * timeout 으로 감싸고 실패해도 UDP listen 은 진행한다 (graceful degradation).
   * REST 서비스와 동일한 패턴.
   */
  async initialize(): Promise<void> {
    const timeout = 5000;
    await this.connectWithTimeout(initializeRedis(), timeout, 'Redis');
    await this.connectWithTimeout(initializePostgres(), timeout, 'PostgreSQL');

    this.workerPool.start();
    this.setupSocketEventHandlers();

    logger.info({
      registeredCommands: this.router.listing.length,
    }, 'UDP server initialized successfully');
  }

  private async connectWithTimeout(
    connectPromise: Promise<unknown>,
    timeoutMs: number,
    label: string,
  ): Promise<void> {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} connection timeout`)), timeoutMs),
    );
    try {
      await Promise.race([connectPromise, timeout]);
      logger.info(`${label} connected for UDP service`);
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : String(error),
      }, `${label} unavailable, continuing without it`);
    }
  }

  private setupSocketEventHandlers(): void {
    this.socket.on('error', (error) => {
      logger.error({ error: error.message }, 'UDP socket error');
    });

    this.socket.on('message', (msg, remoteInfo) => {
      this.handleIncomingMessage(msg, remoteInfo);
    });

    this.socket.on('listening', () => {
      const address = this.socket.address();
      logger.info({
        address: `${address.address}:${address.port}`,
      }, 'UDP server listening');
    });
  }

  /**
   * 들어오는 UDP datagram → ClientEnvelope 파싱 후 큐 적재.
   * 파싱 실패는 모두 silent drop + warn 로그.
   */
  private handleIncomingMessage(msg: Buffer, remoteInfo: RemoteInfo): void {
    try {
      if (msg.length > this.config.maxMessageSize) {
        logger.warn({
          size: msg.length,
          maxSize: this.config.maxMessageSize,
          remote: `${remoteInfo.address}:${remoteInfo.port}`,
        }, 'Message too large, dropping');
        return;
      }

      const text = msg.toString('utf8');
      logger.info({
        remote: `${remoteInfo.address}:${remoteInfo.port}`,
        rawPayload: text.slice(0, 300),
      }, 'UDP packet received');
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch (err) {
        logger.warn({
          error: err instanceof Error ? err.message : String(err),
          remote: `${remoteInfo.address}:${remoteInfo.port}`,
          rawPayload: text.slice(0, 300),
        }, 'UDP payload is not JSON, dropping');
        return;
      }

      const parsed = ClientEnvelopeSchema.safeParse(raw);
      if (!parsed.success) {
        logger.warn({
          remote: `${remoteInfo.address}:${remoteInfo.port}`,
          zodError: parsed.error.issues,
          rawPayload: text.slice(0, 300),
        }, 'Unknown envelope, dropping');
        return;
      }

      const enqueued = this.messageQueue.enqueue({
        envelope: parsed.data,
        remoteInfo,
      });

      if (!enqueued) {
        logger.warn({
          session: parsed.data.session,
          queueSize: this.messageQueue.size,
          remote: `${remoteInfo.address}:${remoteInfo.port}`,
        }, 'Message queue full, dropping message');
      }
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        remote: `${remoteInfo.address}:${remoteInfo.port}`,
      }, 'Failed to handle incoming message');
    }
  }

  private startMessageProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      if (this.messageQueue.isEmpty) return;

      const item = this.messageQueue.dequeue();
      if (!item) return;

      const { envelope, remoteInfo } = item;
      try {
        const worker = this.workerPool.getNextWorker();
        const reply = await worker.processEnvelope(envelope);
        if (reply !== null) {
          this.sendReply(envelope.session, reply, remoteInfo);
        }
      } catch (error) {
        logger.error({
          session: envelope.session,
          error: error instanceof Error ? error.message : String(error),
        }, 'Failed to process envelope');
      }
    }, 1);
  }

  /**
   * reply envelope 송신.
   * 클라이언트(메신저봇R)가 data 를 decodeURIComponent 로 처리하므로
   * bare % 는 %25 로 이스케이프해야 URIError 를 피할 수 있다.
   */
  private sendReply(session: string, text: string, remoteInfo: RemoteInfo): void {
    const reply: ReplyEnvelope = {
      event: `reply:${session}`,
      data: text.replace(/%(?![0-9A-Fa-f]{2})/g, '%25'),
    };
    try {
      const buffer = Buffer.from(JSON.stringify(reply), 'utf8');
      this.socket.send(buffer, remoteInfo.port, remoteInfo.address, (error) => {
        if (error) {
          logger.error({
            error: error.message,
            session,
            remote: `${remoteInfo.address}:${remoteInfo.port}`,
          }, 'Failed to send reply');
        }
      });
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        session,
      }, 'Failed to serialize reply');
    }
  }

  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        logger.warn('UDP server is already running');
        return;
      }

      await new Promise<void>((resolve, reject) => {
        this.socket.bind(this.config.port, this.config.host, () => resolve());
        this.socket.once('error', reject);
      });

      this.isRunning = true;
      this.startMessageProcessing();

      logger.info({
        port: this.config.port,
        host: this.config.host,
      }, 'UDP server started successfully');
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to start UDP server');
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (!this.isRunning) {
        logger.warn('UDP server is not running');
        return;
      }

      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }

      this.workerPool.stop();
      this.socket.close();

      await disconnectRedis();
      await disconnectPostgres();

      this.isRunning = false;
      logger.info('UDP server stopped successfully');
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to stop UDP server');
      throw error;
    }
  }

  getServerStats() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      queue: this.messageQueue.getStats(),
      workers: this.workerPool.getStats(),
      registeredCommands: this.router.listing.length,
    };
  }
}

// === 모듈 export ===

/** UDP 서버 싱글톤. */
export const udpServer = new UdpServer();

/** cacheManager 는 index.ts 에서 직접 사용 가능하도록 re-export. */
export { cacheManager };

/** UDP envelope/Kakao 타입을 외부(테스트)에서 import 할 수 있도록 re-export. */
export type { ClientEnvelope, KakaoMessage, ReplyEnvelope };
