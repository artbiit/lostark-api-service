# Lost Ark API Service - 배포 가이드

> **@cursor-change**: 2025-01-27, v1.1.0, REST Service 완성 상태 반영

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

# 2. 본 레포 빌드 + 컨테이너 기동
yarn build
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

| 컨테이너명                   | 역할                                | 이미지                                             |
| ---------------------------- | ----------------------------------- | -------------------------------------------------- |
| `lostark-remote-kakao`       | REST service (port 3000)            | `artbiit/lostark-remote-kakao:latest` (로컬 빌드)  |
| `loa-platform-lostark-udp-1` | UDP gateway / KakaoTalk (port 5022) | `artbiit/lostark-remote-kakao:latest` (Docker Hub) |
| `loa-platform-loa-bot-1`     | Discord bot                         | `artbiit/loa-bot:latest` (Docker Hub)              |
| `loa-platform-watchtower-1`  | 자동 갱신 감시                      | `containrrr/watchtower:latest`                     |

DB: `kord-postgres` (`lostark_cache` 데이터베이스) / Redis: `kord-redis`
(네트워크: `kord_default`)

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

### 수동 강제 재기동 (Watchtower 없이)

```bash
cd /path/to/loa-platform
docker compose build <service>                          # 로컬 arm64 빌드
docker compose up -d --no-deps --force-recreate <service>

# 전체 재기동
docker compose up -d
```

## 이미지 드리프트 주의

REST service 는 `loa-platform compose build` 로 로컬 빌드된다. UDP service 와
loa-bot 은 Docker Hub 에서 pull 한다. 코드를 수정하고 Docker Hub 에 push 하지
않으면 이 두 컨테이너는 구버전 코드를 계속 실행한다.

**실제 사례 (2026-06)**: 3-tier 캐시가 2026-05-20 에 추가됐지만 UDP 컨테이너
이미지가 갱신되지 않아 15일간 `domain_cache` 미갱신 → 점검 시 stale fallback
없이 에러 발생.

코드 변경 단위를 닫을 때 push 가 완료됐는지 반드시 확인한다.

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
