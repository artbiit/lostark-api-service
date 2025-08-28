# 개발자 워크플로우

## 📋 파일 수정 전 사전 파악 단계

### 1. 경로 및 구조 분석 체크리스트

작업 전 반드시 다음 항목들을 확인하세요:

- [ ] **관련 파일들의 현재 위치 파악**
  - 수정할 파일의 정확한 경로
  - 의존성 관계가 있는 파일들
  - import/export 관계 분석

- [ ] **기존 문서와의 중복 여부 검토**
  - 전체 프로젝트에서 관련 키워드 검색
  - 동일/유사 내용이 다른 문서에 있는지 확인
  - 참조 관계 분석

- [ ] **패키지별 영향 범위 확인**
  - 수정이 다른 패키지에 미치는 영향
  - 공유 모듈 변경 시 영향도 분석

### 2. 중복 내용 검증 프로세스

```bash
# 1. 키워드 검색
grep -r "관련_키워드" . --exclude-dir=node_modules --exclude-dir=dist

# 2. 문서 매핑
# - 어떤 문서가 어떤 내용을 담당하는지 파악
# - 중복 내용 식별

# 3. 참조 관계 분석
# - 문서 간 의존성 확인
# - 단일 진실 원칙 준수 여부 검토
```

## 🔧 작업 완료 후 문서화 지침

### 1. 단일 진실 원칙 적용

각 주제는 하나의 문서에서만 관리하고, 다른 문서에서는 참조 링크로 연결합니다:

```markdown
# 잘못된 예시 (중복)

## 환경변수 설정

NODE_ENV=development LOSTARK_API_KEY=your_key_here

# 올바른 예시 (참조)

## 환경변수 설정

환경변수 설정은 [.env.example](../.env.example) 파일을 참조하세요. 상세 설정
가이드는 [설정 가이드](../configuration.md#environment-variables)를 참조하세요.
```

### 2. 참조 링크 표준

```markdown
# 파일 참조

[.env.example](../.env.example)

# 문서 참조

[환경변수 설정](../configuration.md#environment-variables)

# 섹션 참조

[개발 가이드](../development-guide.md#setup)
```

### 3. 문서 업데이트 워크플로우

1. **수정 전**: 전체 프로젝트에서 관련 키워드 검색
2. **수정 중**: 기존 문서와의 중복 최소화
3. **수정 후**: 참조 링크로 연결, 중복 내용 제거
4. **검증**: 문서 간 일관성 확인

## 🏗️ 모노레포 의존성 관리

### 1. 패키지 간 의존성 방향

```
rest-service → data-service → shared
udp-service → data-service → shared
```

### 2. 허용된 참조 관계

- **shared**: 모든 패키지에서 참조 가능
- **data-service**: rest-service, udp-service에서만 참조 가능
- **rest-service**: 다른 패키지에서 참조 불가
- **udp-service**: 다른 패키지에서 참조 불가

### 3. TypeScript Project References 설정

```json
{
  "references": [
    { "path": "../shared" },
    { "path": "../data-service" } // 필요한 경우만
  ]
}
```

### 4. 새 패키지 추가 시

```bash
# 1. 패키지 생성
mkdir packages/new-package
cd packages/new-package

# 2. package.json 설정
# 3. tsconfig.json 설정 (references 포함)
# 4. 의존성 검증
yarn validate:monorepo
```

### 5. 의존성 변경 시

```bash
# 1. package.json 수정
# 2. tsconfig.json references 수정
# 3. 검증 실행
yarn validate:deps
yarn validate:refs
```

## 🚀 개발 워크플로우 단계

### 1. 코드 작성 단계

```bash
# 1. 실시간 검증 (Cursor 내장)
# - TypeScript 타입 체크
# - ESLint 린트 검사
# - Prettier 포맷팅
```

### 2. 수동 검증 단계

```bash
# 2. 수동 검증 (Cursor 터미널)
yarn validate:monorepo
yarn test:unit
```

### 3. 자동 검증 단계

```bash
# 3. 커밋 시 자동 검증 (pre-commit)
git commit -m "feat: 새로운 기능 추가"
# → yarn validate:monorepo && yarn test:unit && yarn lint

# 4. 푸시 시 전체 검증 (pre-push)
git push
# → yarn validate:monorepo && yarn test && yarn build
```

### 4. 원격 검증 단계

```bash
# 5. PR 생성 시 원격 검증 (GitHub Actions)
# - CI/CD 파이프라인 자동 실행
# - 팀 전체 품질 보장
```

## 🔍 검증 명령어

### 1. 자동화된 검증 시스템

**Git Hooks (자동 실행)**:

- **pre-commit**: `yarn validate:monorepo && yarn test:unit && yarn lint`
- **pre-push**: `yarn validate:monorepo && yarn test && yarn build`

**CI/CD Pipeline**:

- GitHub Actions에서 자동 검증
- main/develop 브랜치 푸시 시 실행
- Pull Request 시 실행

### 2. 수동 검증 명령어

```bash
# 커밋 전 검증 (자동 실행됨)
yarn precommit

# 푸시 전 검증 (자동 실행됨)
yarn prepush

# 전체 검증
yarn validate:full
```

### 3. 세부 검증 명령어

```bash
# 전체 모노레포 검증
yarn validate:monorepo

# 의존성만 검증
yarn validate:deps

# TypeScript 참조만 검증
yarn validate:refs

# 빌드 검증
yarn validate:build

# 전체 검증 (모든 테스트 + 빌드 + 린트)
yarn validate:full
```

## 🚨 자주 발생하는 문제들

### 1. "File is not under 'rootDir'" 오류

**원인**: 다른 패키지의 내부 파일을 직접 import **해결**:

- 패키지의 공개 API만 사용
- tsconfig.json의 references 설정 확인

### 2. "File is not listed within the file list" 오류

**원인**: Project References 설정 누락 **해결**:

```json
{
  "references": [{ "path": "../shared" }, { "path": "../data-service" }]
}
```

### 3. 순환 참조 오류

**원인**: 패키지 간 순환 의존성 **해결**: 의존성 방향 재설계

## 📝 체크리스트 템플릿

### 작업 전 체크리스트

- [ ] 관련 파일 경로 파악 완료
- [ ] 기존 문서 중복 검토 완료
- [ ] 참조 관계 분석 완료
- [ ] 패키지별 영향 범위 확인 완료

### 작업 후 체크리스트

- [ ] 중복 내용 제거 완료
- [ ] 참조 링크 추가 완료
- [ ] 문서 일관성 확인 완료
- [ ] Index.md 업데이트 완료
- [ ] 검증 스크립트 실행 완료

### 의존성 관리 체크리스트

- [ ] package.json의 dependencies 확인
- [ ] tsconfig.json의 references 확인
- [ ] import 경로가 올바른지 확인
- [ ] 순환 참조가 없는지 확인
- [ ] 검증 스크립트 실행
- [ ] 빌드 테스트

## 📚 추가 리소스

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Yarn Workspaces](https://yarnpkg.com/features/workspaces)
- [모노레포 모범 사례](https://monorepo.tools/)

## 🔗 관련 문서

- [코드 리뷰 체크리스트](./code-review-checklist.md)
- [문제 해결 가이드](./troubleshooting-guide.md)
- [모범 사례](./best-practices.md)
