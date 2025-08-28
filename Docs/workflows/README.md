# 개발 워크플로우 가이드

## 📋 개요

이 문서는 Lost Ark API Service 프로젝트의 개발 워크플로우를 정의합니다. 모든 개발자는 이 가이드를 따라 일관된 방식으로 작업해야 합니다.

## 🎯 핵심 원칙

### 1. 단일 진실 원칙 (Single Source of Truth)
- 각 주제는 하나의 문서에서만 관리
- 다른 문서에서는 참조 링크로 연결
- 중복 내용 발견 시 원본으로 통합

### 2. 로컬 우선 검증 (Local-First Validation)
- Cursor 터미널에서 먼저 검증 실행
- 문제 발견 시 즉시 수정 후 커밋

### 3. 단계별 검증 파이프라인
1. **실시간 검증** (Cursor 내장): TypeScript, ESLint, Prettier
2. **수동 검증** (Cursor 터미널): `yarn validate:monorepo`, `yarn test:unit`
3. **자동 검증** (Git Hooks): pre-commit, pre-push
4. **원격 검증** (GitHub Actions): CI/CD 파이프라인

## 📚 관련 문서

- [개발자 워크플로우](./development-workflow.md)
- [코드 리뷰 체크리스트](./code-review-checklist.md)
- [문제 해결 가이드](./troubleshooting-guide.md)
- [모범 사례](./best-practices.md)

## 🔗 참조 문서

- [환경변수 설정](../.env.example) - 실제 환경변수 템플릿
- [개발 가이드](../development-guide.md) - 전체 개발 가이드
- [설정 가이드](../configuration.md) - 상세 설정 설명