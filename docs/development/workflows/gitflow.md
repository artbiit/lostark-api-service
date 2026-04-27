# GitFlow 브랜치 컨벤션

## 📋 개요

이 문서는 Lost Ark API Service 프로젝트의 GitFlow 브랜치 전략을 정의합니다.
GitFlow는 안정적인 릴리즈 관리와 빠른 기능 개발을 동시에 지원하는 브랜치
전략입니다.

## 🏗️ 브랜치 구조

```
main ← develop ← feature/기능명
     ↑         ↑
  hotfix/   release/
```

## 🌿 브랜치 역할

### 메인 브랜치 (Main Branches)

#### `main`

- **목적**: 프로덕션 배포용 (안정 버전)
- **특징**:
  - 항상 배포 가능한 상태 유지
  - 태그를 통한 버전 관리
  - 직접 커밋 금지
- **생명주기**: 프로젝트 전체 기간

#### `develop`

- **목적**: 개발 통합용 (다음 릴리즈 준비)
- **특징**:
  - 기능 브랜치들의 통합 지점
  - 자동화된 테스트 통과 필수
  - CI/CD 파이프라인 대상
- **생명주기**: 프로젝트 전체 기간

### 보조 브랜치 (Supporting Branches)

#### `feature/기능명`

- **목적**: 새로운 기능 개발
- **브랜치 출처**: `develop`
- **머지 대상**: `develop`
- **네이밍**: `feature/기능명` (예: `feature/cache-optimization`)
- **생명주기**: 기능 완료 시 삭제

#### `release/버전명`

- **목적**: 릴리즈 준비 (버그 수정, 문서 업데이트)
- **브랜치 출처**: `develop`
- **머지 대상**: `main` + `develop`
- **네이밍**: `release/v버전명` (예: `release/v2.1.0`)
- **생명주기**: 릴리즈 완료 시 삭제

#### `hotfix/긴급수정`

- **목적**: 프로덕션 긴급 수정
- **브랜치 출처**: `main`
- **머지 대상**: `main` + `develop`
- **네이밍**: `hotfix/수정내용` (예: `hotfix/critical-api-error`)
- **생명주기**: 수정 완료 시 삭제

## 🔄 워크플로우

### 1. 기능 개발 워크플로우

```bash
# 1. develop 브랜치에서 시작
git checkout develop
git pull origin develop

# 2. 기능 브랜치 생성
git checkout -b feature/cache-optimization

# 3. 개발 및 커밋
git add .
git commit -m "feat: 캐시 최적화 구현"

# 4. develop에 머지 (Pull Request)
git push origin feature/cache-optimization
# → GitHub에서 Pull Request 생성
# → 코드 리뷰 및 테스트
# → develop에 머지

# 5. 브랜치 정리
git checkout develop
git pull origin develop
git branch -d feature/cache-optimization
```

### 2. 릴리즈 워크플로우

```bash
# 1. develop에서 릴리즈 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b release/v2.1.0

# 2. 릴리즈 준비 (버그 수정, 문서 업데이트)
git commit -m "docs: 릴리즈 노트 업데이트"
git commit -m "fix: 마이너 버그 수정"

# 3. main에 머지 (릴리즈)
git checkout main
git merge release/v2.1.0
git tag -a v2.1.0 -m "Release version 2.1.0"
git push origin main --tags

# 4. develop에 머지 (릴리즈 변경사항 반영)
git checkout develop
git merge release/v2.1.0
git push origin develop

# 5. 브랜치 정리
git branch -d release/v2.1.0
```

### 3. 긴급 수정 워크플로우

```bash
# 1. main에서 긴급 수정 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/critical-api-error

# 2. 긴급 수정
git commit -m "fix: API 응답 오류 수정"

# 3. main에 머지 (즉시 배포)
git checkout main
git merge hotfix/critical-api-error
git tag -a v2.1.1 -m "Hotfix: API 응답 오류 수정"
git push origin main --tags

# 4. develop에 머지 (수정사항 반영)
git checkout develop
git merge hotfix/critical-api-error
git push origin develop

# 5. 브랜치 정리
git branch -d hotfix/critical-api-error
```

## 📝 브랜치 네이밍 컨벤션

### 기능 브랜치

```bash
feature/cache-optimization
feature/lostark-api-v9
feature/udp-performance
feature/rate-limiting
feature/error-handling
```

### 릴리즈 브랜치

```bash
release/v2.1.0
release/v2.2.0
release/v3.0.0
```

### 긴급 수정 브랜치

```bash
hotfix/critical-api-error
hotfix/memory-leak
hotfix/security-vulnerability
hotfix/database-connection
```

## 🚀 CI/CD 연동

### 브랜치별 자동화

#### `develop` 브랜치

- 자동 테스트 실행
- 빌드 검증
- 코드 품질 검사

#### `main` 브랜치

- 자동 배포
- 보안 스캔
- 성능 테스트

#### `feature/*` 브랜치

- 기본 테스트 실행
- 코드 리뷰 요구

#### `release/*` 브랜치

- 전체 테스트 스위트
- 스테이징 환경 배포

#### `hotfix/*` 브랜치

- 긴급 테스트
- 즉시 배포 준비

## 📋 체크리스트

### 기능 개발 완료 시

- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 문서 업데이트
- [ ] develop에 머지
- [ ] 브랜치 삭제

### 릴리즈 준비 시

- [ ] 버전 번호 업데이트
- [ ] 릴리즈 노트 작성
- [ ] 문서 최종 검토
- [ ] main에 머지 및 태그
- [ ] develop에 머지
- [ ] 브랜치 삭제

### 긴급 수정 시

- [ ] 수정 범위 최소화
- [ ] 테스트 실행
- [ ] main에 머지 및 태그
- [ ] develop에 머지
- [ ] 브랜치 삭제

## 🔗 관련 문서

- **[개발자 워크플로우](./development-workflow.md)** - 상세한 개발 프로세스
- **[모범 사례](./best-practices.md)** - 코드 품질 가이드라인
- **[코드 리뷰 체크리스트](./code-review-checklist.md)** - 코드 리뷰 기준
- **[워크플로우 개요](./README.md)** - 전체 워크플로우 가이드
