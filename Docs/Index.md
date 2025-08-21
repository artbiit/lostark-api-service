# Lost Ark API Service Documentation

## 📚 문서 목록

### 🏗️ 아키텍처 & 설계

- [**3-Tier Architecture**](./architecture.md) - 전체 아키텍처 설계 및 타입
  시스템
- [**Development Guide**](./development-guide.md) - 개발 가이드 및 워크플로우

### 📖 기존 문서

- [**Client Sample**](./client/client-sample.md) - 클라이언트 사용 예제
- [**Client.js**](./client/client.js) - 클라이언트 구현 예제

### 🔧 트러블슈팅

- [**Troubleshooting Guide**](./troubleshooting/Index.md) - 개발 중 발생하는
  문제들과 해결 방법

## 🚀 빠른 시작

### 1. 아키텍처 이해

새로운 3-Tier 아키텍처와 타입 시스템을 이해하려면
[Architecture Guide](./architecture.md)를 먼저 읽어보세요.

### 2. 개발 시작

개발 환경 설정과 작업 순서는 [Development Guide](./development-guide.md)를
참조하세요.

### 3. 레거시 코드 참조

기존 CommonJS 코드는 `legacy/` 디렉토리에서 확인할 수 있습니다.

## 📋 주요 변경사항

### 새로운 구조

- **TypeScript + ESM**: 최신 모듈 시스템 적용
- **3-Tier Architecture**: Fetch → REST API → UDP Gateway
- **버전별 타입 시스템**: Lost Ark API 버전과 1:1 매핑
- **모노레포**: Yarn Workspaces 기반 패키지 관리

### 타입 시스템 특징

- **타입 안전성**: 컴파일 타임 에러 방지
- **버전 추적**: API 변경사항 명확한 추적
- **마이그레이션**: 안전한 버전 간 데이터 변환
- **IDE 지원**: 자동완성 및 리팩토링 지원

## 🔗 관련 링크

- [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/)
- [Lost Ark API Changelog](https://developer-lostark.game.onstove.com/changelog)
- [Project Repository](https://github.com/artbiit/lostark-api-service)

---

_마지막 업데이트: 2025-01-15_
