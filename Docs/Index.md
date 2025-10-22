# LostArk API Service Documentation

## 📚 문서 목록

### 🚀 시작하기
- [README](../README.md) - 프로젝트 개요 및 빠른 시작
- [개발 가이드](./development-guide.md) - 개발 환경 설정 및 워크플로우
- [설정 가이드](./configuration.md) - 환경변수 및 설정 상세 가이드

### 🏗️ 아키텍처
- [아키텍처 개요](./architecture.md) - 시스템 아키텍처 및 설계 원칙

### 🔧 개발 도구
- [Docker 설정](./docker-setup.md) - Docker를 통한 개발 환경 구성
- [클라이언트 샘플](./client/client-sample.md) - API 사용 예제

### 📖 API 문서
- [LostArk API 참조](./lostark-api/README.md) - LostArk API 통합 가이드
  - [V9.0.0 API 참조](./lostark-api/V9.0.0/README.md) - 최신 API 버전 문서

### 🧪 테스트
- [테스트 가이드](./testing/README.md) - 테스트 전략 및 실행 방법
- [최종 테스트 결과](./testing/final-test-results.md) - 호스트/Docker 테스트 결과 보고서

### 🔍 문제 해결
- [문제 해결 가이드](./troubleshooting/Index.md) - 자주 발생하는 문제 해결
- [프로젝트 완성도 현황](./project-completion-status.md) - 전체 프로젝트 완성도 및 상태

### 📋 워크플로우
- [개발 워크플로우](./workflows/README.md) - 개발 프로세스 및 모범 사례
- [코드 리뷰 체크리스트](./workflows/code-review-checklist.md) - 코드 품질 검증
- [모범 사례](./workflows/best-practices.md) - 코딩 표준 및 가이드라인

### 🔒 보안 및 개인정보
- [스트리머 연구](./streamer-research/README.md) - 스트리머 데이터 수집 정책
- [개인정보 처리방침](./streamer-research/privacy-notice.md) - 개인정보 보호 정책

## 🆕 최근 업데이트

### 2025-01-27 - 프로젝트 완성 및 최종 테스트
- **프로젝트 완성**: 모든 기능 구현 완료 및 배포 준비
- **최종 테스트**: 호스트/Docker 환경 테스트 완료
- **성능 검증**: 모든 성능 목표 달성 확인
- **문서화 완료**: 전체 프로젝트 문서화 완료

### 주요 완성사항
- ✅ **모든 API 엔드포인트 구현 완료**
- ✅ **3-Tier 캐시 시스템 완성**
- ✅ **36개 테스트 모두 통과**
- ✅ **성능 목표 초과 달성**
- ✅ **Docker 배포 환경 준비 완료**
- ✅ **완전한 문서화 완료**

## 📝 문서 작성 가이드

### 문서 구조
- 각 문서는 명확한 목적과 범위를 가져야 합니다
- 코드 예제는 실제 작동하는 코드여야 합니다
- 환경변수 정보는 [.env.example](../.env.example)에만 상세히 기술합니다

### 문서 업데이트 규칙
- 새로운 기능 추가 시 관련 문서를 즉시 업데이트합니다
- API 변경 시 버전별 문서를 관리합니다
- 문제 해결 후 관련 문서를 업데이트합니다

## 🔗 관련 링크

- [LostArk Developer Portal](https://developer-lostark.game.onstove.com/)
- [LostArk API Changelog](https://developer-lostark.game.onstove.com/changelog)
- [프로젝트 GitHub](https://github.com/artbiit/lostark-api-service)
> 참고: 이 프로젝트는 Cursor Project Rules(.mdc) 기반으로 운영됩니다. 규칙은 `.cursor/rules/` 및 각 패키지의 `.cursor/rules/`에 존재하며, 모델 라우팅 규칙은 제거되었고 모델은 수동 지정합니다.
