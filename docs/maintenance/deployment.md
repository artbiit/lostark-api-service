# Lost Ark API Service - 배포 가이드

> **@cursor-change**: 2025-01-27, v1.1.0, REST Service 완성 상태 반영

## 📋 개요

Lost Ark API Service의 배포 가이드입니다. 3계층 아키텍처(Data Service, REST
Service, UDP Service)를 포함한 전체 시스템의 배포 방법을 설명합니다.

## 🏗️ 아키텍처 개요

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   REST Service  │    │  UDP Service    │    │  Data Service   │
│   (Port: 3000)  │    │  (Port: 3001)   │    │   (Internal)    │
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

## 🚀 배포 방법

### 1. 환경 설정

#### 1.1 환경변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정합니다:

```bash
# API 설정
LOSTARK_API_KEY=your_api_key_here
LOSTARK_API_VERSION=V9.0.0

# 서버 설정
REST_SERVER_PORT=3000
REST_SERVER_HOST=0.0.0.0
UDP_SERVER_PORT=3001
UDP_SERVER_HOST=0.0.0.0

# CORS 설정
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# 로깅
LOG_LEVEL=info

# 캐시 설정
CACHE_MEMORY_TTL=300
CACHE_REDIS_TTL=3600
CACHE_DATABASE_TTL=86400

# Redis 설정 (선택사항)
CACHE_REDIS_URL=redis://localhost:6379
CACHE_REDIS_PASSWORD=

# PostgreSQL 설정 (kord-postgres 재사용)
# 사전 준비: docker exec -it kord-postgres psql -U kord -c "CREATE DATABASE lostark_cache;"
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kord
DB_PASSWORD=password
DB_DATABASE=lostark_cache
```

#### 1.2 의존성 설치

```bash
# Node.js 18+ 설치 확인
node --version

# Yarn 설치 (권장)
npm install -g yarn

# 의존성 설치
yarn install
```

### 2. 개발 환경 배포

#### 2.1 빌드

```bash
# 전체 프로젝트 빌드
yarn build

# 또는 개별 패키지 빌드
yarn workspace @lostark/data-service build
yarn workspace @lostark/rest-service build
yarn workspace @lostark/udp-service build
yarn workspace @lostark/shared build
```

#### 2.2 테스트 실행

```bash
# 전체 테스트 실행
yarn test

# 특정 테스트 실행
yarn test tests/integration/api/rest-service-simple.test.mjs
```

#### 2.3 개발 서버 실행

```bash
# REST Service만 실행
yarn workspace @lostark/rest-service dev

# UDP Service만 실행
yarn workspace @lostark/udp-service dev

# 모든 서비스 실행 (새 터미널에서)
yarn dev
```

### 3. 프로덕션 환경 배포

#### 3.1 Docker 배포 (권장)

##### Dockerfile 생성

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사
COPY package.json yarn.lock ./
COPY packages/*/package.json ./packages/*/

# 의존성 설치
RUN yarn install --frozen-lockfile

# 소스 코드 복사
COPY . .

# 빌드
RUN yarn build

# 포트 노출
EXPOSE 3000 3001

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 실행
CMD ["yarn", "start"]
```

##### Docker Compose 설정

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  lostark-api:
    build: .
    ports:
      - '3000:3000' # REST Service
      - '3001:3001' # UDP Service
    environment:
      - NODE_ENV=production
      - CACHE_REDIS_URL=redis://redis:6379
      - DB_HOST=kord-postgres
      - DB_PORT=5432
      - DB_USERNAME=kord
      - DB_PASSWORD=${DB_PASSWORD:-password}
      - DB_DATABASE=lostark_cache
    networks:
      - default
      - kord_default
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis_data:

networks:
  kord_default:
    external: true
```

##### 배포 명령

```bash
# Docker Compose로 배포
docker-compose up -d

# 로그 확인
docker-compose logs -f lostark-api

# 서비스 상태 확인
docker-compose ps
```

#### 3.2 직접 배포

```bash
# 프로덕션 빌드
NODE_ENV=production yarn build

# 프로덕션 실행
NODE_ENV=production yarn start

# 또는 개별 서비스 실행
NODE_ENV=production yarn workspace @lostark/rest-service start
NODE_ENV=production yarn workspace @lostark/udp-service start
```

#### 3.3 PM2 배포

```bash
# PM2 설치
npm install -g pm2

# PM2 설정 파일 생성
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'lostark-rest',
      script: 'packages/rest-service/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        REST_SERVER_PORT: 3000
      }
    },
    {
      name: 'lostark-udp',
      script: 'packages/udp-service/dist/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        UDP_SERVER_PORT: 3001
      }
    }
  ]
};
EOF

# PM2로 배포
pm2 start ecosystem.config.js

# 상태 확인
pm2 status
pm2 logs
```

### 4. 모니터링 및 로깅

#### 4.1 헬스 체크

```bash
# REST Service 헬스 체크
curl http://localhost:3000/health

# 캐시 상태 확인
curl http://localhost:3000/cache/status
```

#### 4.2 로그 모니터링

```bash
# 실시간 로그 확인
tail -f logs/application.log

# 에러 로그만 확인
grep "ERROR" logs/application.log

# 성능 로그 확인
grep "responseTime" logs/application.log
```

#### 4.3 메트릭 수집

```bash
# 캐시 히트율 확인
curl http://localhost:3000/cache/status | jq '.cache.memory.hitRate'

# API 응답 시간 확인
curl -w "@curl-format.txt" http://localhost:3000/health
```

### 5. 스케일링

#### 5.1 수평 스케일링

```bash
# PM2로 인스턴스 추가
pm2 scale lostark-rest 4

# Docker Compose로 스케일링
docker-compose up -d --scale lostark-api=3
```

#### 5.2 로드 밸런서 설정

```nginx
# nginx.conf
upstream lostark_api {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://lostark_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. 보안 설정

#### 6.1 방화벽 설정

```bash
# 필요한 포트만 열기
sudo ufw allow 3000/tcp  # REST Service
sudo ufw allow 3001/udp  # UDP Service
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

#### 6.2 SSL/TLS 설정

```bash
# Let's Encrypt로 SSL 인증서 발급
sudo certbot --nginx -d api.yourdomain.com

# 자동 갱신 설정
sudo crontab -e
# 0 12 * * * /usr/bin/certbot renew --quiet
```

#### 6.3 API 키 보안

```bash
# 환경변수 암호화
echo $LOSTARK_API_KEY | base64

# Docker Secrets 사용 (Docker Swarm)
echo "your_api_key" | docker secret create lostark_api_key -
```

### 7. 백업 및 복구

#### 7.1 데이터 백업

```bash
# Redis 백업
redis-cli BGSAVE

# PostgreSQL 백업
pg_dump -U kord lostark_cache > backup_$(date +%Y%m%d).sql

# 설정 파일 백업
tar -czf config_backup_$(date +%Y%m%d).tar.gz .env docker-compose.yml
```

#### 7.2 복구 절차

```bash
# PostgreSQL 복구
psql -U kord lostark_cache < backup_20250127.sql

# Redis 복구
redis-cli FLUSHALL
redis-cli RESTORE key 0 value

# 서비스 재시작
docker-compose restart
```

### 8. 트러블슈팅

#### 8.1 일반적인 문제

**문제**: API 응답이 느림

```bash
# 캐시 상태 확인
curl http://localhost:3000/cache/status

# 캐시 최적화 실행
curl -X POST http://localhost:3000/cache/optimize
```

**문제**: 메모리 사용량 높음

```bash
# 메모리 사용량 확인
pm2 monit

# 가비지 컬렉션 강제 실행
curl -X POST http://localhost:3000/cache/optimize
```

**문제**: Redis 연결 실패

```bash
# Redis 상태 확인
redis-cli ping

# 연결 설정 확인
echo $CACHE_REDIS_URL
```

#### 8.2 로그 분석

```bash
# 에러 패턴 분석
grep "ERROR" logs/application.log | awk '{print $4}' | sort | uniq -c

# 응답 시간 분석
grep "responseTime" logs/application.log | awk '{print $NF}' | sort -n
```

## 📊 성능 최적화

### 캐시 최적화

- Memory Cache: 자주 접근하는 데이터
- Redis Cache: 중간 빈도 데이터
- Database Cache: 장기 보관 데이터

### 네트워크 최적화

- HTTP/2 활성화
- Gzip 압축
- CDN 사용

### 데이터베이스 최적화

- 인덱스 최적화
- 쿼리 최적화
- 연결 풀 설정

## 🔄 업데이트 절차

```bash
# 1. 백업 생성
./scripts/backup.sh

# 2. 새 버전 배포
git pull origin main
yarn install
yarn build

# 3. 서비스 재시작
docker-compose restart

# 4. 헬스 체크
curl http://localhost:3000/health

# 5. 롤백 (필요시)
git checkout previous-version
docker-compose restart
```

## 📝 체크리스트

- [ ] 환경변수 설정 완료
- [ ] 의존성 설치 완료
- [ ] 빌드 성공
- [ ] 테스트 통과
- [ ] 서비스 시작 확인
- [ ] 헬스 체크 통과
- [ ] 로그 확인
- [ ] 보안 설정 완료
- [ ] 모니터링 설정 완료
- [ ] 백업 설정 완료

---

**문서 버전**: 1.1.0  
**최종 업데이트**: 2025-01-27  
**@cursor-change**: 2025-01-27, v1.1.0, REST Service 완성 상태 반영
