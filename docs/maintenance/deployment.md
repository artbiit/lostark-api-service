# Lost Ark API Service - 배포 가이드

> **@cursor-change**: 2026-07-22, 배포 토폴로지 드리프트 정정 — REST·UDP 동일
> 이미지 공유 + watchtower 자동 배포 반영 (loa-platform ADR-0011)

## 📋 개요

Lost Ark API Service의 배포 가이드입니다. 3계층 아키텍처(Data Service, REST
Service, UDP Service)를 포함한 전체 시스템의 배포 방법을 설명합니다.

## 🏗️ 아키텍처 개요

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   REST Service  │    │  UDP Service    │    │  Data Service   │
│   (Port: 3000)  │    │  (Port: 5022)   │    │   (Internal)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Shared        │
                    │   Package       │
                    └─────────────────┘
```

## 📦 패키지 구조

- **data-service**: Lost Ark API 호출 및 데이터 정규화
- **rest-service**: REST API 엔드포인트 제공
- **udp-service**: UDP 게이트웨이 (초저지연)
- **shared**: 공통 모듈 (타입, 설정, DB 연결)

## 운영 게이트 (작업 단위 종료 직전)

`/task` 세션 또는 의미 있는 변경 단위가 끝날 때 통과해야 하는 운영 게이트. 본
절은 [agent-team-protocol §9](../development/agent-team-protocol.md) 의 세션
종료 조건과 정합한다.

### 1. 빌드 / 검증

- `yarn verify` (= `yarn validate:full`) 통과 — L1 (`validate:monorepo` + 전체
  `test` + `build` + `lint`).
- L2/L3 의 의무 적용 여부는
  [verification-strategies](../development/verification-strategies.md) 의 변경
  범주 → 의무 L 레벨 표 참조.

### 2. REST 계약 변경 시 OpenAPI dump 갱신

```bash
yarn workspace @lostark/rest-api dump:openapi
```

- 산출물 위치: `docs/contracts/` 아래 (스크립트가 직접 쓰는 경로 확인).
- diff 가 발생하면 같은 커밋에 포함.
- LoA-Bot 등 다운스트림 컨슈머가 본 산출물을 `openapi-typescript` 로 직접 타입
  생성하므로, 컨슈머 측 generated.ts 재생성 필요 여부를 **커밋 메시지에
  명시**한다 (특히 `../LoA-Bot/src/infra/lostark/generated.ts`).
- OpenAPI dump 의 외부 공개 게시 (gist, pastebin 등) 는
  [agent-team-protocol §6](../development/agent-team-protocol.md) 파괴적 조작
  게이트 대상.

### 3. loa-platform compose 의존 서비스

본 서비스 운영 기동 전제:

- PostgreSQL / Redis 가 외부에서 이미 구동 중이라고 가정 (loa-platform 의
  `docker-compose.yml`).
- 의존 서비스가 **사전 기동되었는지 확인** 후에만 본 서비스 컨테이너를 기동한다.
  실패 시 회로가 빨라야 알람이 의미 있음.
- 본 레포 내부 `docker-compose.yml` 의 자체 db/redis 는 **개발 전용** — 운영에서
  사용하지 않는다.

운영 기동 흐름:

```bash
# 1. loa-platform 측에서 공유 인프라 기동 (별도 레포)
#    PostgreSQL/Redis 는 shared-db external 네트워크에 별도 기동되어 있어야 한다.
#    loa-platform/docker-compose.yml 자체에는 postgres/redis 서비스가 정의돼 있지 않으므로
#    환경(개발/운영) 에 맞는 인프라 stack 을 사전에 기동.

# 2. loa-platform 측에서 앱 컨테이너 기동 (별도 레포)
#    앱 이미지는 pull_policy: always 이므로 up -d 시 레지스트리에서 이미지를 pull.
#    (최초 부트스트랩·arm64 로컬 개발은 build: fallback — 아래 토폴로지 절 참조)
docker compose up -d   # 운영 환경에서는 loa-platform 의 compose 파일을 사용
```

### 4. 다운스트림 영향 안내

- REST 계약 breaking change → ADR 발행 + LoA-Bot 등 다운스트림 사전 공지.
- 캐시 키 prefix / TTL 변경 → maintenance/ 또는 changes/ 에 기록.

## loa-platform 오케스트레이션

본 서비스와 LoA-Bot 은 `loa-platform` 레포
(`/Users/wemadeplay/workspace/stz/loa/loa-platform/docker-compose.yml`) 가 전체
오케스트레이션을 담당한다. 개별 compose 파일(`lostark-api-service/`,
`LoA-Bot/`)로 기동하면 Watchtower 라벨이 없어 자동 갱신이 작동하지 않는다.

### 컨테이너 구성

| 컨테이너명                   | 역할                                | 이미지                                               |
| ---------------------------- | ----------------------------------- | ---------------------------------------------------- |
| `lostark-remote-kakao`       | REST service (port 3000)            | `artbiit/lostark-remote-kakao:latest`                |
| `loa-platform-lostark-udp-1` | UDP gateway / KakaoTalk (port 5022) | `artbiit/lostark-remote-kakao:latest` (REST 와 동일) |
| `loa-platform-loa-bot-1`     | Discord bot                         | `artbiit/loa-bot:latest`                             |
| `loa-platform-watchtower-1`  | 자동 갱신 감시                      | `containrrr/watchtower:latest`                       |

**REST·UDP 는 동일 이미지를 공유한다.** `lostark-remote-kakao`(REST)와
`lostark-udp`(UDP)는 모두 `${DOCKER_ID:-artbiit}/lostark-remote-kakao:latest` 를
쓰고 `command` 만 분기한다 — REST 는 기본 command, UDP 는
`yarn workspace @lostark/udp-gateway start`. 세 앱 컨테이너(REST·UDP·loa-bot)는
전부 `pull_policy: always` + `com.centurylinklabs.watchtower.enable=true` 라벨을
가진다. 상세 토폴로지는 아래 "이미지 배포 토폴로지 & 드리프트 주의" 참조.

DB: `lostark_cache` 데이터베이스 / Redis — loa-platform 의 외부(`external`)
네트워크(`${SHARED_NETWORK_NAME}`)에 조인. 접속 정보는 `.env` (`POSTGRES_*`,
`REDIS_*`) 로 주입된다.

### 표준 배포 명령

코드 변경 후 Docker Hub push → Watchtower 가 60초 내 자동 감지·재기동·Discord
알림.

```bash
# lostark-api-service 변경 시
cd /path/to/lostark-api-service
docker build -t artbiit/lostark-remote-kakao:latest .
docker push artbiit/lostark-remote-kakao:latest
# → lostark-remote-kakao + lostark-udp 둘 다 재기동됨

# LoA-Bot 변경 시
cd /path/to/LoA-Bot
docker build -t artbiit/loa-bot:latest .
docker push artbiit/loa-bot:latest
```

### 배포 후 확인

push 후 다음 3가지를 확인한다.

1. **watchtower 재기동 로그** — 최대 60초(`WATCHTOWER_POLL_INTERVAL`) 내 digest
   감지·자동 재기동. REST 이미지를 push 하면 REST·UDP 가 함께 재기동된다.

   ```bash
   docker logs -f loa-platform-watchtower-1
   # "Found new ...lostark-remote-kakao:latest image" + Stopping/Creating 로그 확인
   ```

2. **health** — REST `/health` 200 응답 (loa-bot 의 `WAIT_FOR_REMOTE_HEALTH`
   기동 게이트가 참조하는 엔드포인트).

   ```bash
   curl -fsS http://localhost:3000/health
   ```

3. **`!프로키온` 스모크** — KakaoTalk/UDP 경로로 `!프로키온` 명령 1회 실행해
   정상 응답 확인. UDP 컨테이너(`lostark-udp`)가 새 이미지로 재기동됐는지 실사용
   검증 (REST 만 확인하면 동일 이미지의 UDP command 분기 회귀를 놓칠 수 있다).

### 수동 강제 재기동 (Watchtower 없이)

```bash
cd /path/to/loa-platform
docker compose build <service>                          # 로컬 arm64 빌드
docker compose up -d --no-deps --force-recreate <service>

# 전체 재기동
docker compose up -d
```

## 이미지 배포 토폴로지 & 드리프트 주의

### 운영 경로: pull_policy:always + watchtower (표준)

REST(`lostark-remote-kakao`)와 UDP(`lostark-udp`)는 **동일 이미지**
`${DOCKER_ID:-artbiit}/lostark-remote-kakao:latest` 를 공유하고 `command` 만
분기한다. 두 컨테이너 모두 `pull_policy: always` +
`com.centurylinklabs.watchtower.enable=true` 라벨을 가지므로, **REST 이미지 push
1회로 REST·UDP 가 함께** watchtower 에 의해 자동 pull·재기동된다. loa-bot 은
별도 이미지(`loa-bot:latest`)지만 동일하게 pull_policy:always + watchtower
자동이며, `watchtower.depends-on` 라벨로 REST 재기동 이후 순서가 보장된다.

watchtower 는 `WATCHTOWER_LABEL_ENABLE=true` 로 라벨된 컨테이너만,
`WATCHTOWER_POLL_INTERVAL=60` 으로 60초마다 레지스트리 digest 를 폴링한다. 운영
갱신에 수동 `docker compose pull && up -d` 는 불필요하다 (watchtower 미동작 시
fallback).

### build: 섹션의 역할 (부트스트랩 / 로컬 개발 fallback)

compose 의 `build:` 섹션(REST=`../lostark-api-service`, loa-bot=`../LoA-Bot`)은
**운영 배포 경로가 아니다.** 운영 갱신은 위의 pull_policy:always + watchtower
digest 폴링으로 이뤄진다. `build:` 는 (1) 이미지가 레지스트리에 아직 없는 최초
부트스트랩, (2) macOS arm64 로컬 개발에서 amd64 manifest pull 실패 시 로컬 빌드
fallback 용도다(→ 아래 "macOS arm64 플랫폼 주의"). UDP(`lostark-udp`)에는 build
섹션이 아예 없다 — REST 이미지를 그대로 공유하기 때문이다.

> watchtower 자동 배포 + health-gate 기동 순서의 설계 결정은 loa-platform 레포의
> **ADR-0011** 에 있다 (본 레포 docs/adr 에는 없음 — loa-platform 소유 ADR).

### 드리프트가 실제로 발생하는 지점

코드를 수정하고 **Docker Hub 에 push 하지 않으면** REST·UDP 둘 다(동일
이미지이므로 함께) 구버전 코드를 계속 실행한다. watchtower 는 레지스트리 digest
만 폴링하므로 로컬 코드 변경은 push 전까지 반영되지 않는다.

**실제 사례 (2026-06)**: 3-tier 캐시가 2026-05-20 에 추가됐지만 이미지가
갱신되지 않아 15일간 `domain_cache` 미갱신 → 점검 시 stale fallback 없이 에러
발생.

코드 변경 단위를 닫을 때 push 가 완료됐는지 반드시 확인한다 (→ 위 "배포 후
확인").

## macOS arm64 플랫폼 주의

`docker-compose.yml` 의 `platform: linux/amd64` 선언은 production x86 서버용
명시다. macOS Apple Silicon(arm64) 에서:

- `docker pull artbiit/...` 직접 호출 시 `no matching manifest for linux/arm64`
  에러 → `docker compose build <service>` 로 대체.
- `docker compose pull` 도 플랫폼 불일치로 실패할 수 있음.
- `docker compose build` 는 `build:` 섹션이 있는 서비스를 로컬 arm64 로 빌드해
  정상 동작.

## 관련

- [macos-warp-tls-mitigation](./macos-warp-tls-mitigation.md) — Cloudflare WARP
  환경에서 컨테이너 HTTPS 실패 시 CA 번들 처리
- `loa-platform/docker-compose.yml` — 실제 운영 compose 파일
