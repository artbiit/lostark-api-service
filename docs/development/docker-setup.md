# Docker Setup Guide

<!-- @cursor-change: 2025-01-27, v1.0.1, 문서 최신화 규칙 적용 -->

## 개요

Lost Ark API Service는 Docker Compose를 통해 선택적으로 서비스를 실행할 수
있습니다. 5개의 서비스 중 필요한 것만 선택하여 실행할 수 있습니다.

## 빌드 전제

- 컨테이너 빌드는 Corepack 활성화 후 Yarn 4.9.2(berry) `--immutable` 플래그를
  사용합니다.
- 로컬에서 `docker build` 시 Yarn 버전 충돌이 나면
  `corepack prepare yarn@4.9.2 --activate` 후 재시도하세요.

## 서비스 구성

### 1. 데이터 서비스 (data-service)

- **역할**: Lost Ark API 데이터 수집 및 정규화
- **포트**: 내부 전용
- **프로필**: `data`

### 2. REST API 서비스 (rest-service)

- **역할**: HTTP REST API 제공
- **포트**: 3000 (환경변수 `REST_API_PORT`로 변경 가능)
- **프로필**: `rest`

### 3. UDP Gateway 서비스 (udp-service)

- **역할**: UDP 메시지 처리
- **포트**: 3001 (환경변수 `UDP_GATEWAY_PORT`로 변경 가능)
- **프로필**: `udp`

### 4. Redis 캐시 (redis)

- **역할**: 캐시 저장소
- **포트**: 6379
- **프로필**: `redis`

### 5. PostgreSQL 데이터베이스 (kord-postgres 재사용)

- **역할**: 데이터 저장소
- **포트**: 5432 (환경변수 `DB_PORT`로 변경 가능)
- **인스턴스**: Kord 프로젝트의 `kord-postgres` 컨테이너를 외부 네트워크(`kord_default`)로 조인하여 재사용
- **사전 준비**: `docker exec -it kord-postgres psql -U kord -c "CREATE DATABASE lostark_cache;"`

## 실행 방법

### 1. 환경 설정

```bash
# .env 파일 생성
cp .env.example .env

# 필요한 환경변수 설정
# 특히 LOSTARK_API_KEY와 DB_PASSWORD는 필수
```

### 2. 선택적 서비스 실행

#### 모든 서비스 실행

```bash
docker-compose --profile all up -d
```

#### 특정 서비스만 실행

```bash
# REST API만 실행 (Redis 포함)
docker-compose --profile rest --profile redis up -d

# UDP Gateway만 실행 (Redis 포함)
docker-compose --profile udp --profile redis up -d

# 데이터 서비스만 실행 (Redis 포함)
docker-compose --profile data --profile redis up -d
```

#### 인프라만 실행

```bash
# Redis만 실행
docker-compose --profile redis up -d
```

### 3. 개발 모드 실행

```bash
# 개발 모드로 REST API 실행 (핫 리로드)
docker-compose --profile rest --profile redis up

# 개발 모드로 UDP Gateway 실행
docker-compose --profile udp --profile redis up
```

## 환경변수 설정

### 필수 환경변수

- `LOSTARK_API_KEY`: Lost Ark Developer Portal에서 발급받은 API 키
- `DB_PASSWORD`: kord-postgres 계정 비밀번호

### 선택적 환경변수

- `REST_API_PORT`: REST API 포트 (기본값: 3000)
- `UDP_GATEWAY_PORT`: UDP Gateway 포트 (기본값: 3001)
- `DB_PORT`: PostgreSQL 포트 (기본값: 5432)
- `CACHE_REDIS_PASSWORD`: Redis 비밀번호 (선택사항)

## 네트워크 연결

### 컨테이너 간 통신

- 서비스들은 Docker 네트워크를 통해 자동으로 연결됩니다
- `redis://redis:6379` - Redis 연결
- `kord-postgres:5432` - PostgreSQL 연결 (kord_default 네트워크 경유)

### 외부 연결

- REST API: `http://localhost:3000`
- UDP Gateway: `localhost:3001`
- Redis: `localhost:6379`
- PostgreSQL: `localhost:5432` (kord-postgres)

## 데이터 영속성

### Redis 데이터

- `redis_data` 볼륨에 저장
- 컨테이너 재시작 시에도 데이터 유지

### PostgreSQL 데이터

- `kord-postgres` 컨테이너의 `postgres_data` 볼륨에 저장 (Kord 프로젝트 관리)
- 마이그레이션은 기동 시 `MigrationManager` 가 자동 실행

## 로그 확인

```bash
# 특정 서비스 로그 확인
docker-compose logs -f rest-service
docker-compose logs -f udp-service
docker-compose logs -f data-service

# 모든 로그 확인
docker-compose logs -f
```

## 서비스 중지

```bash
# 특정 프로필 서비스 중지
docker-compose --profile rest down

# 모든 서비스 중지
docker-compose down

# 볼륨까지 삭제 (데이터 손실 주의)
docker-compose down -v
```

## 문제 해결

### 포트 충돌

환경변수로 포트를 변경하세요:

```bash
export REST_API_PORT=3001
export UDP_GATEWAY_PORT=3002
export DB_PORT=3307
docker-compose --profile all up -d
```

### 권한 문제

```bash
# 볼륨 권한 수정
sudo chown -R $USER:$USER ./cache
```

### 메모리 부족

```bash
# Docker 메모리 제한 확인
docker system df
docker system prune
```
