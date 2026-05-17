/**
 * UDP envelope 송수신 스모크 통합 테스트.
 *
 * - 실 UDP 소켓(dgram) 으로 ClientEnvelope 를 보내고 ReplyEnvelope 수신.
 * - LOSTARK_API_KEY 없으면 skip + exit 0 (CI 환경에서 안전).
 * - TEST_CHARACTER_NAME 미지정 시 캐릭터 의존 명령만 skip.
 *
 * 전수조사 대상 26개 커맨드:
 *   [오프라인]  !도움말 !주사위 !시너지 !질문 !vs !분배금 !랜전카
 *   [API 노캐릭] !프로키온 !이벤트 !비싼유각 !전각 !유각 !보석값
 *   [API 캐릭]   !정보 !각인 !장비 !스킬 !보석 !돌 !수집 !착장 !아바타 !카드 !전장 !부캐
 *
 * 2026-05-16: !도비스 / !도가토 케이스 제거 (ADR-0003 — 게임 내 콘텐츠 종료)
 * 2026-05-17: 전수조사로 확장 — 21개 추가
 *
 * 포트 충돌 회피: UDP_GATEWAY_PORT=13001 로 덮어쓰기. 운영 3001 과 격리.
 */

import assert from 'node:assert';
import { createSocket } from 'node:dgram';
import { randomUUID } from 'node:crypto';
import { test, before, after } from 'node:test';
import { config as dotenvConfig } from 'dotenv';

// .env 자동 로딩 (없으면 무시)
dotenvConfig();

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

// catch-block 에러 패턴 (= 비정상 응답)
const API_ERROR_PATTERNS = [
  ' 은(는) 없는 것 같숨미당',  // armory catch-block
  '캐릭터는 없는 것 같숨미당',  // siblings catch-block
  '처리 중 오류가 발생했습니다', // router catch-all
  '정보를 불러올 수 없습니다',   // gamecontents/auctions catch-block
  '검색에 실패했습니다',         // market/auction catch-block
];

/** API 커맨드 정상 응답 검증 — 에러 패턴 포함 시 실패. */
function assertNormalResponse(data, label = '') {
  assert.ok(typeof data === 'string' && data.length > 0, `${label}: empty response`);
  for (const pattern of API_ERROR_PATTERNS) {
    assert.ok(!data.includes(pattern), `${label}: error response — "${data.slice(0, 120)}"`);
  }
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

test('!보석값 멸화 10레벨 → reply:session 수신, 정상 응답', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!보석값 멸화 10레벨');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!보석값');
  } finally {
    client.close();
  }
});

// === 캐릭터 의존 명령 (TEST_CHARACTER_NAME 필요) ===

const charName = process.env.TEST_CHARACTER_NAME;

test('!정보 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!정보 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!정보');
  } finally {
    client.close();
  }
});

test('!각인 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!각인 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!각인');
  } finally {
    client.close();
  }
});

// ============================================================
// 오프라인 커맨드 (API 불필요)
// ============================================================

test('!시너지 → reply:session, data 비어있지 않음', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!시너지');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(typeof reply.data === 'string' && reply.data.length > 0);
  } finally {
    client.close();
  }
});

test('!질문 → reply:session, sender name 포함', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!질문');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(typeof reply.data === 'string' && reply.data.includes('smoke-tester'));
  } finally {
    client.close();
  }
});

test('!vs A B → reply:session, A 또는 B 선택', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!vs A B');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(reply.data === '당연히 A!' || reply.data === '당연히 B!', `data='${reply.data}'`);
  } finally {
    client.close();
  }
});

test('!분배금 100000 → reply:session, data 입력된 금액 포함', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!분배금 100000');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(typeof reply.data === 'string' && reply.data.startsWith('입력된 금액'), `data='${reply.data}'`);
  } finally {
    client.close();
  }
});

test('!랜전카 → reply:session, sender name 포함', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!랜전카');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assert.ok(typeof reply.data === 'string' && reply.data.includes('smoke-tester'), `data='${reply.data}'`);
  } finally {
    client.close();
  }
});

// ============================================================
// API 커맨드 — 캐릭터 불필요 (게임 컨텐츠 / 거래소)
// ============================================================

test('!프로키온 → reply:session 수신, 정상 응답', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!프로키온');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!프로키온');
  } finally {
    client.close();
  }
});

test('!이벤트 → reply:session 수신, 정상 응답', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!이벤트');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!이벤트');
  } finally {
    client.close();
  }
});

test('!비싼유각 → reply:session 수신, 정상 응답', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!비싼유각');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!비싼유각');
  } finally {
    client.close();
  }
});

test('!전각 원한 → reply:session 수신, 정상 응답', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!전각 원한');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!전각');
  } finally {
    client.close();
  }
});

test('!유각 원한 → reply:session 수신, 정상 응답', async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope('!유각 원한');
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!유각');
  } finally {
    client.close();
  }
});

// ============================================================
// API 커맨드 — 캐릭터 의존 (TEST_CHARACTER_NAME 필요)
// ============================================================

test('!장비 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!장비 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!장비');
  } finally {
    client.close();
  }
});

test('!스킬 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!스킬 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!스킬');
  } finally {
    client.close();
  }
});

test('!보석 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!보석 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!보석');
  } finally {
    client.close();
  }
});

test('!돌 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!돌 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!돌');
  } finally {
    client.close();
  }
});

test('!수집 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!수집 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!수집');
  } finally {
    client.close();
  }
});

test('!착장 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!착장 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!착장');
  } finally {
    client.close();
  }
});

test('!아바타 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!아바타 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!아바타');
  } finally {
    client.close();
  }
});

test('!카드 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!카드 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!카드');
  } finally {
    client.close();
  }
});

test('!전장 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!전장 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!전장');
  } finally {
    client.close();
  }
});

test('!부캐 <캐릭명> → reply:session 수신, 정상 응답', { skip: !charName }, async () => {
  const client = await createClient();
  try {
    const envelope = makeEnvelope(`!부캐 ${charName}`);
    const reply = await sendAndReceive(client, envelope);
    assert.strictEqual(reply.event, `reply:${envelope.session}`);
    assertNormalResponse(reply.data, '!부캐');
  } finally {
    client.close();
  }
});
