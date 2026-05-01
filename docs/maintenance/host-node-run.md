# 호스트 Node 실행 가이드 (macOS)

- Status: Active
- Date: 2026-05-02

lostark-remote-kakao (`@lostark/rest-api`) 를 **Docker 컨테이너가 아닌 macOS 호스트에서 직접** 실행할 때의 표준 절차와 재발 빈도가 높은 장애의 원인 분리 방법.

## 1. 핵심 제약: TLS CA prefix

로스트아크 공식 API (`https://developer-lostark.game.onstove.com/*`) 는 macOS 시스템 keychain 의 루트 인증서 체인으로 서명돼 있다. 호스트 Node 의 `undici`(내장 fetch) 는 Node 자체 CA 번들만 신뢰하므로 **추가 주입이 없으면 전수 요청이 `TypeError: fetch failed` 로 실패** 한다. `curl`·`dig` 는 macOS Security framework 를 쓰므로 성공 — 즉 **curl 정상인데 Node 만 실패** 하면 100% CA 누락이다.

### 재기동 표준 명령

```bash
NODE_EXTRA_CA_CERTS=/Users/wemadeplay/workspace/stz/loa/LoA-Bot/certs/host-ca.pem \
  nohup yarn workspace @lostark/rest-api start \
  >> /tmp/lostark-remote.log 2>&1 &
disown
```

- `host-ca.pem` 은 LoA-Bot 레포에 커밋 제외로 보관 (호스트 고유 루트). lostark-remote-kakao 자체에는 두지 않고 **절대경로 참조**.
- `.env` 에 `NODE_EXTRA_CA_CERTS=...` 를 넣어도 **효과 없음** — `dotenv` 가 Node 부팅 후 로드라 TLS 초기화 시점에 이미 늦는다. 반드시 **쉘 env 로 prefix**.

### push / test 시에도 동일 prefix

`git push` 의 pre-push hook 가 통합 테스트(실 upstream 호출 포함) 를 돌리기 때문에 CA 없으면 3 테스트가 `fetch failed` 로 fail 한다. 명령도 동일하게 prefix:

```bash
NODE_EXTRA_CA_CERTS=/Users/wemadeplay/workspace/stz/loa/LoA-Bot/certs/host-ca.pem git push
```

## 2. 사전 조건

1. **kord 인프라 기동** — `kord-postgres:5432`, `kord-redis:6379` 가 호스트로 포워딩되어 있어야 한다.

   ```bash
   lsof -nP -iTCP:5432 -sTCP:LISTEN
   lsof -nP -iTCP:6379 -sTCP:LISTEN
   ```

2. **`.env` 에 localhost 경로** — docker-compose 기본값(`DB_HOST=kord-postgres`, `CACHE_REDIS_URL=redis://redis:6379`) 은 호스트 실행 시 resolve 불가. 반드시 `DB_HOST=localhost`, `CACHE_REDIS_URL=redis://localhost:6379` 로 설정.

3. **포트 3000 비어있음** — 기존 프로세스가 살아있으면 같은 포트 충돌. 재기동 전 종료:

   ```bash
   pkill -f "yarn workspace @lostark/rest-api" 2>/dev/null
   pkill -f "rest-service/dist/index.js" 2>/dev/null
   sleep 2
   lsof -nP -iTCP:3000 -sTCP:LISTEN  # 비어있어야 함
   ```

## 3. 기동 성공 시그널

`/tmp/lostark-remote.log` tail 에서 다음이 순서대로 보여야 한다:

```
INFO Redis connected successfully
INFO PostgreSQL connected successfully
Server listening at http://0.0.0.0:3000
INFO Cache system initialization completed
INFO REST server started successfully
```

하나라도 빠지거나 `WARN Redis not connected` / `WARN Database not connected` 가 보이면 §5 의 해당 섹션으로.

## 4. 스모크 테스트

```bash
curl -sS -o /dev/null -w "http=%{http_code} time=%{time_total}\n" --max-time 10 \
  "http://localhost:3000/api/v1/news?type=notices"
# 첫 호출: http=200, time≈0.15 (upstream 1회)
# 두 번째 호출: http=200, time≈0.002 (Redis 캐시 HIT)
```

두 번째 호출 시간이 100ms 이상이면 캐시가 안 붙었다는 뜻 (§5.2).

## 5. 원인 분리 가이드 (장애 발생 시)

### 5.1 증상: `TypeError: fetch failed` + `error: "fetch failed"` 로그

**원인**: CA prefix 누락. `ps -ef | grep rest-api` 결과에 `NODE_EXTRA_CA_CERTS` env 가 안 보이면 확정.

**조치**: §1 재기동 표준 명령으로 재실행.

### 5.2 증상: `Redis not connected, skipping Redis cache` / `Database not connected`

**원인 후보 (우선순위 순)**:

1. `initializeCacheSystem` 내부에 `return;` 이 들어가 초기화 분기를 건너뜀 (과거 "임시 디버깅" 이유로 삽입된 적 있음 — 복구 커밋 `82125b7`). `packages/rest-service/src/server.ts` 의 해당 함수 본문에 early return 이 있는지 재확인.
2. `.env` 가 `DB_HOST=kord-postgres` (compose 기본값) 로 남음 → 호스트에서 resolve 실패. `DB_HOST=localhost`, `CACHE_REDIS_URL=redis://localhost:6379` 로 교정.
3. kord 인프라 자체 미기동 — §2.1 포트 체크.

### 5.3 증상: `API request failed` 로그는 뜨는데 **url/status 가 안 보임**

**원인**: pino API 오용. `logger.warn('msg', { obj })` 순서는 pino 가 두 번째 인자를 drop 한다 (두 번째는 sprintf interpolation values 로 해석). 올바른 순서는:

```ts
// 틀림 — obj 가 로그에 기록되지 않음
logger.warn('API request failed', { url, attempt, error });

// 맞음
logger.warn({ url, attempt, error, errName }, 'API request failed');
```

전 레포에 이 오용 패턴이 50+ 건 잔존 (api-client/characters-client 만 선수정됨, 커밋 `82125b7`). 재발 시 해당 모듈을 같은 순서로 교체.

### 5.4 증상: `PostgreSQL execute failed` + `Failed to update cache metadata`

**원인 후보**: `cache_metadata` 테이블 미존재 또는 migration 미적용. 기능 체감은 없음 (metadata 업데이트만 실패, 캐시 본체는 동작). 별건 이슈로 처리하되, 다음 순서로 점검:

```bash
psql -h localhost -U kord -d lostark_cache -c "\dt cache_metadata"
# 없으면 migration 실행
```

### 5.5 증상: `Failed to disconnect from Redis` (재기동 시)

이전 프로세스가 Redis 에 연결되지 않은 상태로 종료되면서 나는 무해한 경고. 재기동 자체는 정상. 무시.

## 6. 관련 커밋 / 문서

- 복구 커밋 `82125b7` — pino 순서 교체 (api-client/characters-client) + server.ts early return 제거 + errName 메타 추가.
- 해결 세션 로그: LoA-Bot 측 `.claude/work-session/20260502-014524/report.md` (gitignore, 로컬에만).
- LoA-Bot 측 트러블슈팅 진입점: `docs/maintenance/upstream-kakao-troubleshooting.md`.

## 7. Open Items (별건 세션 후보)

- **CA prefix 영구화** — 현재 매 재기동마다 수동 prefix. wrapper 스크립트 (`bin/start.sh`) 또는 `direnv` `.envrc` 도입 검토. Node 부팅 전에 env 가 export 되면 되므로 shell-level 주입이면 충분.
- **pino API 오용 전면 교체** — 50+ 건 일괄 `{obj}, 'msg'` 순서로 전환. codemod 가능한 단순 치환.
- **로그 메시지 오타** — `server.ts` 에서 Postgres 초기화 후 `MySQL connected successfully` 로 잘못 로깅. 역사적 잔재.
