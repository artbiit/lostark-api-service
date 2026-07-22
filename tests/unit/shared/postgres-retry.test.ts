/**
 * PgClient 연결 재시도·자동 회복 회귀 테스트.
 *
 * - connectWithRetry() 지수백오프 bounded 재시도
 * - ensureConnected() lazy single-flight 재연결
 *
 * env 대입이 parseEnv() 최초 호출보다 먼저 실행돼야 하므로 postgres.ts 는 정적
 * import 하지 않는다. ESM 은 의존 모듈(postgres.ts → logger.ts) 을 이 파일 자신의
 * 최상단 코드보다 먼저 평가하므로, 정적 import 라면 logger.ts 최상단 `createLogger()`
 * 가 이 파일의 process.env 대입보다 먼저 parseEnv() 를 호출해 캐싱해 버린다(무의미해짐).
 * 동적 import 로 평가 시점을 env 대입 뒤로 늦춰 backoff 지연을 실제로 낮춘다.
 */

process.env.LOSTARK_API_KEY ||= 'postgres-retry-test-key';
process.env.DB_CONNECT_RETRY_MAX_ATTEMPTS = '5';
process.env.DB_CONNECT_RETRY_INITIAL_DELAY_MS = '5';
process.env.DB_CONNECT_RETRY_MAX_DELAY_MS = '20';
process.env.DB_HEALTH_CHECK_ENABLED = 'false';

import assert from 'node:assert/strict';
import test from 'node:test';

const { PgClient } = await import('../../../packages/shared/src/db/postgres.js');

// pg 타입을 tests 로 직접 끌어오지 않고 PgClient 생성자 시그니처에서 Pool 타입을 유도한다
// (tests/ 는 pg 를 직접 의존하지 않으므로 `import { Pool } from 'pg'` 는 해석 불가).
type PgClientPool = ConstructorParameters<typeof PgClient>[0];

interface FakePoolClient {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
}

function makeFakePoolClient(): FakePoolClient {
  return {
    query: async () => ({ rows: [], rowCount: 0 }),
    release: () => {},
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** `pg.Pool` 을 구조적으로 흉내내는 최소 fake. connect() 동작만 케이스별로 주입한다. */
class FakePool {
  connectCalls = 0;

  constructor(private readonly connectBehavior: () => Promise<FakePoolClient>) {}

  on(_event: string, _listener: (...args: unknown[]) => void): void {
    // PgClient 생성자가 pool.on('error', ...) 을 호출하므로 no-op 으로만 존재하면 된다.
  }

  async connect(): Promise<FakePoolClient> {
    this.connectCalls += 1;
    return this.connectBehavior();
  }

  async query(_sql: string, _params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }> {
    return { rows: [{ ok: 1 }], rowCount: 1 };
  }
}

test('PgClient 연결 재시도·자동 회복', async (t) => {
  await t.test(
    '부팅 레이스 래치 회복 — 2회 실패 후 3회째 성공 시 connectWithRetry() 가 정상 완료된다',
    async () => {
      let attempts = 0;
      const fakePool = new FakePool(async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('ECONNREFUSED');
        }
        return makeFakePoolClient();
      });
      const client = new PgClient(fakePool as unknown as PgClientPool);

      await client.connectWithRetry();

      assert.equal(client.isConnectedToPostgres(), true);
      assert.equal(fakePool.connectCalls, 3);

      const rows = await client.query('SELECT 1');
      assert.ok(Array.isArray(rows));
    },
  );

  await t.test(
    'lazy single-flight — 동시 query() 5회 호출에도 connect() 는 1회만 발생한다',
    async () => {
      const fakePool = new FakePool(async () => {
        await sleep(20);
        return makeFakePoolClient();
      });
      const client = new PgClient(fakePool as unknown as PgClientPool);

      assert.equal(client.isConnectedToPostgres(), false);

      const results = await Promise.all(Array.from({ length: 5 }, () => client.query('SELECT 1')));

      assert.equal(results.length, 5);
      assert.equal(fakePool.connectCalls, 1);
      assert.equal(client.isConnectedToPostgres(), true);
    },
  );
});
