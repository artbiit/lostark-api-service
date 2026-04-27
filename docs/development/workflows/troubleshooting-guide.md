# 워크플로우 문제 해결 가이드

## 🚨 자주 발생하는 문제들

### 1. Git Hooks 실행 실패

#### 문제: pre-commit hook이 실행되지 않음

**증상**:
```bash
# 커밋 시 검증이 실행되지 않음
git commit -m "feat: 새로운 기능"
# → 검증 없이 바로 커밋됨
```

**원인**:
- Husky가 제대로 설치되지 않음
- .husky 디렉토리 권한 문제
- .cursorignore에서 .husky/ 제외됨

**해결방법**:
```bash
# 1. Husky 재설치
yarn add -D husky
npx husky init

# 2. 권한 설정
chmod +x .husky/pre-commit
chmod +x .husky/pre-push

# 3. .cursorignore에서 .husky/ 제거 확인
# .cursorignore 파일에서 .husky/ 라인이 제거되었는지 확인
```

#### 문제: pre-commit hook에서 검증 실패

**증상**:
```bash
git commit -m "feat: 새로운 기능"
# → 검증 실패로 커밋이 차단됨
```

**해결방법**:
```bash
# 1. 수동으로 검증 실행
yarn validate:monorepo
yarn test:unit
yarn lint

# 2. 문제 수정 후 재검증
# 3. 다시 커밋 시도
```

### 2. 의존성 검증 실패

#### 문제: 순환 참조 오류

**증상**:
```bash
yarn validate:deps
# → 순환 참조 발견
```

**원인**:
- 패키지 간 순환 의존성
- 잘못된 import/export 관계

**해결방법**:
```bash
# 1. 의존성 관계 분석
# shared → data-service → rest-service → udp-service 방향 확인

# 2. 순환 참조 제거
# - 공통 로직을 shared로 이동
# - 의존성 방향 재설계

# 3. 재검증
yarn validate:deps
```

#### 문제: TypeScript 참조 오류

**증상**:
```bash
yarn validate:refs
# → TypeScript 참조 오류
```

**원인**:
- tsconfig.json의 references 설정 누락
- 잘못된 경로 참조

**해결방법**:
```bash
# 1. tsconfig.json 확인
# references 배열에 필요한 패키지 경로 추가

# 2. 경로 확인
# 상대 경로가 올바른지 확인

# 3. 재검증
yarn validate:refs
```

### 3. 문서 중복 문제

#### 문제: 동일한 내용이 여러 문서에 중복

**증상**:
- .env 관련 내용이 development-guide.md와 .env.example에 중복
- 설정 가이드가 여러 문서에 분산

**해결방법**:
```bash
# 1. 중복 내용 식별
grep -r "관련_키워드" . --exclude-dir=node_modules

# 2. 단일 진실 원칙 적용
# - 원본 문서에서만 내용 관리
# - 다른 문서에서는 참조 링크 사용

# 3. 참조 링크 추가
# [원본 문서](./path/to/original.md) 형태로 연결
```

### 4. 빌드 실패

#### 문제: TypeScript 컴파일 오류

**증상**:
```bash
yarn build
# → TypeScript 컴파일 오류
```

**해결방법**:
```bash
# 1. 타입 오류 확인
yarn typecheck

# 2. 타입 오류 수정
# - 암시적 any 타입 제거
# - 타입 정의 추가

# 3. 재빌드
yarn build
```

#### 문제: 의존성 오류

**증상**:
```bash
yarn build
# → 모듈을 찾을 수 없음
```

**해결방법**:
```bash
# 1. 의존성 재설치
yarn install

# 2. 캐시 정리
yarn clean

# 3. 재빌드
yarn build
```

### 5. 테스트 실패

#### 문제: 환경변수 관련 테스트 실패

**증상**:
```bash
yarn test
# → 환경변수 로딩 실패
```

**해결방법**:
```bash
# 1. .env 파일 확인
ls -la .env

# 2. .env 파일 생성 (없는 경우)
cp .env.example .env

# 3. 필수 환경변수 설정
# LOSTARK_API_KEY 등 필수 값 설정

# 4. 재테스트
yarn test
```

#### 문제: API 테스트 타임아웃

**증상**:
```bash
yarn test
# → API 호출 타임아웃
```

**해결방법**:
```bash
# 1. 네트워크 연결 확인
# 2. API 키 유효성 확인
# 3. 테스트 타임아웃 설정 조정
# 4. Mock 데이터 사용 고려
```

## 🔧 디버깅 도구

### 1. 로그 분석

```bash
# 상세 로그 활성화
LOG_LEVEL=debug yarn test

# 특정 패키지 로그 확인
yarn workspace @lostark/shared test --verbose
```

### 2. 의존성 분석

```bash
# 의존성 트리 확인
yarn why package-name

# 순환 참조 확인
yarn validate:deps
```

### 3. 타입 체크

```bash
# 전체 타입 체크
yarn typecheck

# 특정 패키지 타입 체크
yarn workspace @lostark/shared typecheck
```

## 📋 문제 해결 체크리스트

### Git Hooks 문제
- [ ] Husky 설치 확인
- [ ] .husky 디렉토리 권한 확인
- [ ] .cursorignore에서 .husky/ 제거 확인
- [ ] pre-commit/pre-push 파일 실행 권한 확인

### 의존성 문제
- [ ] 순환 참조 확인
- [ ] TypeScript 참조 설정 확인
- [ ] 패키지 경로 확인
- [ ] 의존성 재설치

### 빌드 문제
- [ ] TypeScript 오류 확인
- [ ] 의존성 설치 확인
- [ ] 캐시 정리
- [ ] 환경변수 설정 확인

### 테스트 문제
- [ ] .env 파일 존재 확인
- [ ] 필수 환경변수 설정 확인
- [ ] 네트워크 연결 확인
- [ ] API 키 유효성 확인

## 🔗 관련 문서

- [개발자 워크플로우](./development-workflow.md)
- [코드 리뷰 체크리스트](./code-review-checklist.md)
- [모범 사례](./best-practices.md)
- [설정 가이드](../configuration.md)