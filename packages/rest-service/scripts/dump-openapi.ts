/**
 * OpenAPI 스펙을 파일로 덤프한다 (서버 listen 없이).
 *
 * 사용:
 *   yarn workspace @lostark/rest-api dump:openapi [output-path]
 *
 * output-path 를 생략하면 기본값은 ../../../../loa-platform/contracts/lostark-api.openapi.yaml
 * (인자로 '-' 를 주면 stdout 으로 출력)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// 리포 루트로 cwd 전환 — parseEnv 가 process.cwd()/.env 를 읽기 때문에
// workspace 스크립트에서 실행하더라도 루트 .env 를 찾을 수 있도록 한다.
const REPO_ROOT = resolve(import.meta.dirname ?? '.', '../../..');
process.chdir(REPO_ROOT);

// RestServer 는 생성자에서 parseEnv 를 호출하므로 import 이후 바로 생성해도 동기적으로 .env 를 로드한다.
const { RestServer } = await import('../src/server.js');

const DEFAULT_OUT = resolve(REPO_ROOT, '../loa-platform/contracts/lostark-api.openapi.yaml');

async function main(): Promise<void> {
  const outPath = process.argv[2] ?? DEFAULT_OUT;

  const server = new RestServer();
  // initialize() 는 플러그인/라우트 등록 후 캐시 시스템 초기화를 호출하지만,
  // 캐시 시스템은 현재 조기 return 으로 비활성화돼 있어 DB/Redis 연결 없이도 동작한다.
  await server.initialize();

  const yaml = await server.dumpOpenApi('yaml');

  if (outPath === '-') {
    process.stdout.write(yaml);
  } else {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, yaml, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`OpenAPI spec written to ${outPath}`);
  }

  await server.close();
  process.exit(0);
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('dump-openapi failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
