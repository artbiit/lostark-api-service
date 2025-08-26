# Lost Ark API Service Documentation

<!-- @cursor-change: 2025-01-27, v1.0.3, Data Service 완성 상태 반영 -->

## 📚 문서 목록

### 🏗️ 아키텍처 & 설계

- [**3-Service Architecture**](./architecture.md) - 전체 아키텍처 설계 및 타입
  시스템
- [**Development Guide**](./development-guide.md) - 개발 가이드 및 워크플로우

### 🔌 API & 인터페이스

- [**Implementation Guide (V9.0.0)**](./lostark-api/V9.0.0/implementation-guide.md) -
  API 구현 가이드 및 작업 현황 (✅ CHARACTERS, ARMORIES API, Data Service 완료)
- [**Lost Ark API Documentation**](./lostark-api/README.md) - 로스트아크 공식
  API 버전별 문서
- [**API Endpoints (V9.0.0)**](./lostark-api/V9.0.0/api-endpoints.md) - V9.0.0
  API 엔드포인트 목록
- [**Build Data Guidelines (V9.0.0)**](./lostark-api/V9.0.0/build-data-guidelines.md) -
  세팅 데이터 수집/저장 지침
- [**Caching Strategy (V9.0.0)**](./lostark-api/V9.0.0/caching-strategy.md) -
  ARMORIES API 캐싱 전략
- [**Characters Caching Strategy (V9.0.0)**](./lostark-api/V9.0.0/caching-strategy-characters.md) -
  CHARACTERS API 캐싱 전략

### 📊 연구 & 데이터

- [**Streamer Research**](./streamer-research/README.md) - 스트리머 연구
  프로젝트 및 개인정보 활용
- [**Streamer List**](./streamer-research/streamer-list.md) - API 테스트용
  스트리머 캐릭터 목록
- [**Privacy Notice**](./streamer-research/privacy-notice.md) - 캐릭터 정보 활용
  공시

### 📖 클라이언트

- [**Client Sample**](./client/client-sample.md) - 클라이언트 사용 예제
- [**Client.js**](./client/client.js) - 클라이언트 구현 예제

### 🧪 테스트

- [**Test Structure**](../tests/README.md) - 테스트 디렉토리 구조 및 가이드
- [**Cache Flow Test Results**](./testing/cache-flow-test-results.md) - 3계층
  캐시 시스템 테스트 결과
- [**Cache Directory**](../cache/README.md) - 캐시된 데이터 구조 및 관리

### 🔧 트러블슈팅

- [**Troubleshooting Guide**](./troubleshooting/Index.md) - 개발 중 발생하는
  문제들과 해결 방법

### 🐳 Docker & 배포

- [**Docker Setup Guide**](./docker-setup.md) - Docker Compose를 통한 선택적
  서비스 실행 가이드

## 🚀 빠른 시작

### 1. 아키텍처 이해

새로운 3-Service 아키텍처와 타입 시스템을 이해하려면
[Architecture Guide](./architecture.md)를 먼저 읽어보세요.

### 2. 개발 시작

개발 환경 설정과 작업 순서는 [Development Guide](./development-guide.md)를
참조하세요.

### 3. API 구현 현황 확인

현재 구현된 API와 작업 현황은
[Implementation Guide](./lostark-api/V9.0.0/implementation-guide.md)에서
확인하세요.

### 4. Docker 환경 실행

Docker를 통한 선택적 서비스 실행은 [Docker Setup Guide](./docker-setup.md)를
참조하세요.

## 📋 주요 변경사항

### ✅ 구현 완료된 API

- **CHARACTERS API**: 계정 기반 캐릭터 추적 및 변화 감지 ✅ 완료
- **ARMORIES API**: 캐릭터 상세 정보 처리 및 큐 기반 처리 ✅ 완료
- **Data Service**: CHARACTERS/ARMORIES API 통합 서비스 ✅ 완료
- **Cache System**: 3계층 캐시 (Memory → Redis → MySQL) ✅ 완료

### 새로운 구조

- **TypeScript + ESM**: 최신 모듈 시스템 적용
- **3-Service Architecture**: Data Service → REST Service → UDP Service
- **버전별 타입 시스템**: Lost Ark API 버전과 1:1 매핑
- **모노레포**: Yarn Workspaces 기반 패키지 관리

### 타입 시스템 특징

- **타입 안전성**: 컴파일 타임 에러 방지
- **버전 추적**: API 변경사항 명확한 추적
- **마이그레이션**: 안전한 버전 간 데이터 변환
- **IDE 지원**: 자동완성 및 리팩토링 지원

### 구현된 서비스 구조

```
packages/data-service/src/
├── services/
│   ├── characters-service.ts     # CHARACTERS API 서비스 ✅ 완료
│   └── armories-service.ts       # ARMORIES API 서비스 ✅ 완료
├── clients/
│   ├── characters-client.ts      # CHARACTERS API 클라이언트 ✅ 완료
│   └── armories-client.ts        # ARMORIES API 클라이언트 ✅ 완료
├── normalizers/
│   ├── characters-normalizer.ts  # CHARACTERS 정규화 ✅ 완료
│   └── armories-normalizer.ts    # ARMORIES 정규화 ✅ 완료
├── cache/
│   ├── characters-cache.ts       # CHARACTERS 캐시 ✅ 완료
│   └── armories-cache.ts         # ARMORIES 캐시 ✅ 완료
└── index.ts                      # 메인 엔트리 포인트 ✅ 완료
```

### Data Service 완성 상태

- **✅ 타입 체크**: 모든 패키지 성공
- **✅ 빌드**: 모든 패키지 성공
- **✅ API 테스트**: CHARACTERS/ARMORIES API 성공
- **✅ 통합 테스트**: Data Service 전체 기능 테스트 성공
- **✅ 문서화**: 구현 가이드 및 상태 문서 완료

## 🔗 관련 링크

- [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/)
- [Lost Ark API Changelog](https://developer-lostark.game.onstove.com/changelog)
- [Project Repository](https://github.com/artbiit/lostark-api-service)

---

_마지막 업데이트: 2025-01-27_
