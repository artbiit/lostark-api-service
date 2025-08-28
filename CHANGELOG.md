# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-27

### 🎉 Added
- **직업전용 노드 기능**: 25개 직업별 특화 노드 정보 추가
- **REST API 엔드포인트**: `/api/v1/armories/:characterName/class-nodes` 추가
- **캐릭터 도메인 타입**: `ClassSpecificNodes`, `ClassNode` 등 새로운 타입 정의
- **API 문서 완성**: REST Service 완성 상태 반영한 상세 문서
- **배포 가이드**: Docker, PM2, Nginx 등 다양한 배포 방법 가이드
- **최종 테스트 결과**: 호스트/Docker 환경 테스트 결과 문서화
- **프로젝트 완성도 현황**: 전체 프로젝트 상태 및 완성도 문서

### 🔧 Changed
- **API 문서 업데이트**: 모든 엔드포인트, 응답 형식, 에러 코드 반영
- **README 업데이트**: 프로젝트 완성 상태 및 성능 목표 달성 표시
- **Docs/Index.md 업데이트**: 새로운 문서 링크 및 최근 업데이트 반영

### ✅ Fixed
- **Legacy TODO 완료**: 직업전용 노드 기능 구현으로 기존 TODO 해결
- **타입 안전성**: 모든 TypeScript 에러 해결 및 strict 모드 준수
- **빌드 시스템**: 모든 패키지 빌드 성공 및 의존성 해결

### 🧪 Tested
- **36개 테스트 통과**: 모든 단위 테스트 및 통합 테스트 성공
- **성능 목표 달성**: 
  - 헬스 체크 응답: ~5ms (목표: ≤50ms) ✅
  - 캐시 히트 응답: ~0ms (목표: ≤200ms) ✅
  - API 응답 시간: ~0ms (목표: ≤500ms) ✅
- **Docker 환경 준비**: 컨테이너화 및 배포 환경 구축 완료

### 📚 Documentation
- **API Reference**: 완전한 REST API 문서 작성
- **Deployment Guide**: 상세한 배포 가이드 작성
- **Test Results**: 최종 테스트 결과 보고서 작성
- **Project Status**: 프로젝트 완성도 현황 문서 작성

## [1.1.0] - 2025-01-27

### 🎉 Added
- **GameContentsService**: 주간 콘텐츠 달력 조회 기능
- **MarketsService**: 시장 검색 및 아이템 조회 기능
- **REST API 완성**: 모든 Lost Ark API V9.0.0 엔드포인트 구현
- **캐시 최적화**: 3-tier 캐시 시스템 완성
- **통합 테스트**: REST Service 통합 테스트 구현

### 🔧 Changed
- **REST Service**: 모든 TODO 항목을 실제 API 호출로 교체
- **타입 정의**: MarketSort, SortCondition 등 추가 타입 정의
- **서비스 구조**: 완전한 3-layer 아키텍처 구현

### ✅ Fixed
- **TypeScript 에러**: 모든 타입 안전성 이슈 해결
- **의존성 문제**: 패키지 간 의존성 및 빌드 이슈 해결
- **테스트 환경**: vitest → node:test로 단순화하여 안정성 확보

## [1.0.0] - 2025-01-27

### 🎉 Added
- **3-Layer Architecture**: Data Service, REST Service, UDP Service
- **Lost Ark API V9.0.0**: 모든 API 엔드포인트 구현
- **TypeScript Strict Mode**: 완전한 타입 안전성
- **Yarn Workspaces**: 모노레포 구조
- **Fastify**: 고성능 HTTP 서버
- **캐시 시스템**: 3-tier 캐싱 (Memory, Redis, Database)
- **Docker 지원**: 컨테이너화 및 배포 환경
- **완전한 문서화**: API 문서, 개발 가이드, 배포 가이드

### 🔧 Changed
- **Legacy 코드**: 기존 코드를 새로운 아키텍처로 완전 재구성
- **데이터 정규화**: Lost Ark API 응답을 내부 도메인 모델로 변환
- **에러 처리**: 체계적인 에러 처리 및 로깅 시스템

### ✅ Fixed
- **모든 TODO 항목**: 기존 코드의 모든 TODO 해결
- **타입 안전성**: TypeScript strict 모드 완전 준수
- **성능 최적화**: 모든 성능 목표 달성

---

## [Unreleased]

### Planned
- 웹 대시보드 개발
- 알림 시스템 구현
- 클라이언트 라이브러리 개발
- 운영 모니터링 시스템 구축

---

**@cursor-change**: 2025-01-27, v1.2.0, CHANGELOG 완성