# Lost Ark Remote Kakao

Lost Ark API 통합을 위한 3계층 아키텍처 시스템

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UDP Gateway   │    │   REST API      │    │  Fetch &        │
│   (초저지연)     │◄───┤   (정규화 데이터) │◄───┤  Normalize      │
│                 │    │                 │    │  (Lost Ark API) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      Shared Cache         │
                    │   (Redis + In-memory)     │
                    └───────────────────────────┘
```

### 계층별 역할

1. **Fetch & Normalize** (`@lostark/fetch`) - **중앙 데이터 수집기**
   - Lost Ark 공식 API 호출
   - 대형 JSON 데이터 정규화
   - 공유 캐시에 정규화된 데이터 저장
   - REST API와 UDP Gateway가 사용할 데이터 제공

2. **REST API** (`@lostark/api`)
   - Fetcher에서 정규화된 데이터 조회
   - HTTP REST 엔드포인트 제공
   - ETag/Cache-Control 헤더 관리

3. **UDP Gateway** (`@lostark/udp`)
   - Fetcher에서 정규화된 데이터 조회
   - 기존 메시지 규격 유지
   - 초저지연 전송 (p95 ≤ 10ms)

### 데이터 흐름

1. **Fetcher**가 Lost Ark API에서 데이터 수집 및 정규화
2. 정규화된 데이터를 **공유 캐시**에 저장
3. **REST API**와 **UDP Gateway**가 필요시 캐시에서 데이터 조회
4. 각각의 프로토콜에 맞게 응답 제공

## 🚀 시작하기

### 요구사항

- Node.js 22.0.0+
- Yarn 1.22+

### 설치

```bash
# 의존성 설치
yarn install

# 개발 모드 실행
yarn dev

# 프로덕션 빌드
yarn build

# 프로덕션 실행
yarn start
```

### 환경변수

```bash
# .env.example 참조
cp .env.example .env
```

주요 환경변수:
- `LOSTARK_API_KEY`: Lost Ark 공식 API 키
- `REDIS_URL`: Redis 연결 URL
- `UDP_PORT`: UDP Gateway 포트 (기본: 3000)
- `API_PORT`: REST API 포트 (기본: 3001)

## 📦 패키지 구조

```
packages/
├── shared/           # 공통 유틸리티, 설정
├── shared-types/     # 공통 타입 정의
├── fetch/           # Fetch & Normalize 계층
├── api/             # REST API 계층
└── udp/             # UDP Gateway 계층
```

## 🔧 개발

### 스크립트

```bash
# 타입 체크
yarn typecheck

# 린팅
yarn lint
yarn lint:fix

# 포맷팅
yarn format
yarn format:fix

# 전체 검사
yarn check
```

### 모노레포 명령어

```bash
# 특정 패키지 실행
yarn workspace @lostark/fetch dev
yarn workspace @lostark/api dev
yarn workspace @lostark/udp dev

# 특정 패키지 빌드
yarn workspace @lostark/shared build
```

## 📊 성능 목표

- **REST API**: p95 ≤ 50ms (캐시 히트 기준)
- **UDP Gateway**: p95 ≤ 10ms (캐시 히트 기준)
- **Fetch**: 싱글플라이트, 서킷브레이커 적용

## 🔄 캐시 전략

1. **In-memory**: 짧은 TTL (1-5분)
2. **Redis**: 중간 TTL (10-30분)
3. **DB**: 장기 저장 (선택적)

캐시 키 형식: `char:<name>:v<schemaVersion>`

## 📝 API 문서

- REST API: `http://localhost:3001/docs`
- UDP 프로토콜: `packages/udp/docs/protocol.md`

## 🤝 기여

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 라이선스

ISC License - see [LICENSE](LICENSE) file for details

## 🔗 참조

- [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/)
- [Fastify Documentation](https://www.fastify.io/docs/)
- [Redis Documentation](https://redis.io/documentation)
