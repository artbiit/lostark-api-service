/**
 * Calendar API CategoryName 실측 스크립트.
 *
 * 목적: Lost Ark `GET /gamecontents/calendar` 실 응답의 CategoryName 고유 값을
 *      stdout 으로 출력하고, ABYSS('도비스 던전') / GUARDIAN('도가토') 후보가
 *      실제로 등장하는지 확인.
 *
 * 실행: `tsx scripts/check-calendar-categories.ts`
 * 의존: `.env` 의 `LOSTARK_API_KEY` (필수)
 *
 * 출력 결과를 받아 `packages/udp-service/src/commands/gamecontents/category-map.ts`
 * 의 ABYSS/GUARDIAN 상수를 보정한다 (Task C Phase-3).
 *
 * 본 스크립트는 data-service 의 GameContentsService 를 거치지 않고
 * 직접 fetch 한다 — normalizer 적용 전 raw CategoryName 을 보기 위함.
 */

import 'dotenv/config';

interface CalendarRawItem {
  CategoryName?: string;
  ContentsName?: string;
  Location?: string;
  StartTimes?: string[];
  [k: string]: unknown;
}

const CANDIDATE_ABYSS = ['도비스 던전', '도전 어비스', '도비스', '어비스 던전'];
const CANDIDATE_GUARDIAN = ['도가토', '도전 가디언 토벌', '가디언 토벌'];

async function main(): Promise<void> {
  const key = process.env.LOSTARK_API_KEY;
  if (!key || key.trim().length === 0) {
    console.error('❌ LOSTARK_API_KEY 환경변수가 설정되지 않았습니다.');
    console.error('   `.env` 파일에 LOSTARK_API_KEY 를 추가하거나 환경변수로 주입하세요.');
    process.exit(1);
  }

  const url = 'https://developer-lostark.game.onstove.com/gamecontents/calendar';
  console.log(`→ GET ${url}`);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `bearer ${key}`,
        accept: 'application/json',
      },
    });
  } catch (err) {
    console.error('❌ fetch 실패:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`❌ API 응답 비-2xx: ${response.status} ${response.statusText}`);
    const text = await response.text().catch(() => '');
    if (text) console.error(`   body: ${text.slice(0, 500)}`);
    process.exit(1);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    console.error('❌ JSON 파싱 실패:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  if (!Array.isArray(payload)) {
    console.error('❌ 응답이 배열이 아닙니다.');
    console.error('   타입:', typeof payload);
    console.error('   샘플:', JSON.stringify(payload).slice(0, 300));
    process.exit(1);
  }

  const items = payload as CalendarRawItem[];
  console.log(`✅ 응답 항목 수: ${items.length}`);

  // 고유 CategoryName 집계
  const counts = new Map<string, number>();
  for (const item of items) {
    const cat = typeof item.CategoryName === 'string' ? item.CategoryName : '<missing>';
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });

  console.log('\n=== CategoryName 고유 값 (등장 횟수 내림차순) ===');
  for (const [cat, n] of sorted) {
    console.log(`  ${String(n).padStart(4, ' ')}  ${cat}`);
  }

  // 후보 매칭
  console.log('\n=== ABYSS 후보 매칭 ===');
  for (const cand of CANDIDATE_ABYSS) {
    const hit = counts.has(cand);
    console.log(`  ${hit ? '✓ HIT ' : '  miss'}  '${cand}'`);
  }
  console.log('\n=== GUARDIAN 후보 매칭 ===');
  for (const cand of CANDIDATE_GUARDIAN) {
    const hit = counts.has(cand);
    console.log(`  ${hit ? '✓ HIT ' : '  miss'}  '${cand}'`);
  }

  // ContentsName 샘플도 함께 출력 (구분에 도움)
  console.log('\n=== CategoryName 별 ContentsName 샘플 (최대 3개씩) ===');
  const byCategory = new Map<string, string[]>();
  for (const item of items) {
    const cat = typeof item.CategoryName === 'string' ? item.CategoryName : '<missing>';
    const name = typeof item.ContentsName === 'string' ? item.ContentsName : '<no name>';
    const list = byCategory.get(cat) ?? [];
    if (list.length < 3) list.push(name);
    byCategory.set(cat, list);
  }
  for (const [cat, names] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  [${cat}]`);
    for (const n of names) console.log(`     · ${n}`);
  }

  console.log('\n[end]');
}

main().catch((err) => {
  console.error(
    '❌ 예기치 못한 오류:',
    err instanceof Error ? (err.stack ?? err.message) : String(err),
  );
  process.exit(1);
});
