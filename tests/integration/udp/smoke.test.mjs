/**
 * UDP envelope 송수신 스모크 통합 테스트.
 *
 * - 실 UDP 소켓(dgram) 으로 ClientEnvelope 를 보내고 ReplyEnvelope 수신.
 * - LOSTARK_API_KEY 없으면 skip + exit 0 (CI 환경에서 안전).
 * - TEST_CHARACTER_NAME 미지정 시 캐릭터 의존 명령(!정보, !각인) 만 skip.
 *
 * 대표 5종:
 *   - !정보 <캐릭명>    (armories)
 *   - !각인 <캐릭명>    (armories)
 *   - !주사위           (minigame, no API)
 *   - !도움말           (registry, no API)
 *   - !보석값 멸화 10레벨 (auctions)
 *
 * 2026-05-16: !도비스 / !도가토 케이스 제거 (ADR-0003 — 게임 내 콘텐츠 종료)
 *
 * 포트 충돌 회피: UDP_GATEWAY_PORT=13001 로 덮어쓰기. 운영 3001 과 격리.
 */

import assert from 'node:assert';
import { createSocket } from 'node:dgram';
import { randomUUID } from 'node:crypto';
import { test, before, after } from 'node:test';

// === skip 분기 (LOSTARK_API_KEY 없으면 즉시 종료) ===

const apiKey = process.env.LOSTARK_API_KEY;
if (!apiKey || apiKey.trim().length === 0) {
  console.log('⚠️  LOSTARK_API_KEY not set — skipping UDP smoke test');
  process.exit(0);
}

// === 포트 덮어쓰기 (import 전 필수) ===

const PORT = 13001;
process.env.UDP_GATEWAY_PORT = String(PORT);
// host 명시: 클라이언트가 같은 머신에서 접속하므로 loopback 으로 한정해
// 외부 노출 방지. dgram bind 는 0.0.0.0 도 허용하지만 격리 차원에서 127.0.0.1.
process.env.UDP_GATEWAY_HOST = '127.0.0.1';

// === 서버 dynamic import (env 설정 이후) ===

const serverModule = await import('../../../packages/udp-service/src/server.ts');
const { udpServer } = serverModule;

// === 헬퍼 ===

const SERVER_HOST = '127.0.0.1';
const TIMEOUT_MS = 10_000;

/**
 * UDP envelope 1회 송신 후 reply 수신.
 */
function sendAndReceive(client, envelope, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(JSON.stringify(envelope), 'utf8');

    const onMessage = (msg) => {
      try {
        const text = msg.toString('utf8');
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.event === 'string' && parsed.event === `reply:${envelope.session}`) {
          client.removeListener('message', onMessage);
          clearTimeout(timer);
          resolve(parsed);
        }
        // 다른 session 의 reply 는 무시 (테스트가 직렬 실행이라 거의 없음)
      } catch (err) {
        client.removeListener('message', onMessage);
        clearTimeout(timer);
        reject(err);
      }
    };

    const timer = setTimeout(() => {
      client.removeListener('message', onMessage);
      reject(new Error(`reply timeout after ${timeoutMs}ms (session=${envelope.session})`));
    }, timeoutMs);

    client.on('message', onMessage);
    client.send(buf, PORT, SERVER_HOST, (err) => {
      if (err) {
        client.removeListener('message', onMessage);
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}

function makeEnvelope(content, senderName = 'smoke-tester') {
  return {
    event: 'message',
    data: {
      sender: { name: senderName, hash: 'smoke-hash' },
      content,
    },
    session: randomUUID(),
  };
}

/** 한 번 사용 후 close 하는 dgram client. */
function createClient() {
  const client = createSocket('udp4');
  return new Promise((resolve, reject) => {
    client.once('error', reject);
    client.bind(0, '127.0.0.1', () => resolve(client));
  });
}

// === 라이프사이클 훅 ===

before(async () => {
  await udpServer.initialize();
  await udpServer.start();
});

after(async () => {
  await udpServer.stop();
});

// === 테스트 ===

test('!주사위 → reply:session, data starts with 주사위 결과', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!주사위');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(typeof reply.data === 'string' && reply.data.length > 0);
    assert.ok(reply.data.startsWith('주사위 결과 : '), `data='${reply.data}'`);
  } finally {
    client.close();
  }
});

test('!도움말 → reply:session, data starts with [접두사]', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!도움말');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(typeof reply.data === 'string' && reply.data.length > 0);
    assert.ok(reply.data.startsWith('[접두사]'), `data starts with: ${reply.data.slice(0, 40)}`);
  } finally {
    client.close();
  }
});

test('!보석값 멸화 10레벨 → reply:session 수신, data 비어있지 않음', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!보석값 멸화 10레벨');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(typeof reply.data === 'string' && reply.data.length > 0);
  } finally {
    client.close();
  }
});

// === 캐릭터 의존 명령 (TEST_CHARACTER_NAME 필요) ===

const charName = process.env.TEST_CHARACTER_NAME;

test('!정보 <캐릭명> → reply:session 수신, data 비어있지 않음', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!정보 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(typeof reply.data === 'string' && reply.data.length > 0);
  } finally {
    client.close();
  }
});

test('!각인 <캐릭명> → reply:session 수신, data 비어있지 않음', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!각인 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(typeof reply.data === 'string' && reply.data.length > 0);
  } finally {
    client.close();
  }
});
