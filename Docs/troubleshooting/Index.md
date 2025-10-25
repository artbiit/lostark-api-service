# 문제 해결 가이드

## 🔧 개발 환경 문제

### TypeScript 컴파일 에러

#### Redis 클라이언트 설정 에러

**문제**: Redis 클라이언트 설정에서 TypeScript 에러 발생
```
error TS2353: Object literal may only specify known properties, and 'commandTimeout' does not exist in type 'RedisSocketOptions'.
error TS2353: Object literal may only specify known properties, and 'lazyConnect' does not exist in type 'RedisSocketOptions'.
```

**원인**: Redis 클라이언트 타입 정의에서 지원하지 않는 속성 사용

**해결 방법**:
```typescript
// ❌ 지원하지 않는 속성
this.client = createClient({
  socket: {
    connectTimeout: 3000,
    commandTimeout: 2000,  // 지원하지 않음
    lazyConnect: true,     // 지원하지 않음
  },
});

// ✅ 지원되는 속성만 사용
this.client = createClient({
  socket: {
    connectTimeout: 3000,  // 지원됨
  },
});
```

**참고**: Redis 클라이언트 버전에 따라 지원되는 속성이 다를 수 있습니다. 최신 타입 정의를 확인하세요.

### 환경변수 로딩 실패

**문제**: `.env` 파일이 로드되지 않음

**해결 방법**:
```bash
# 1. .env 파일 존재 확인
ls -la .env

# 2. 환경변수 로딩 테스트
yarn workspace @lostark/shared test

# 3. 수동으로 .env 파일 생성 (필요시)
touch .env
```

**주의사항**:
- `.env.example`을 `.env`로 복사하지 마세요
- `.env` 파일은 수동으로 생성하고 실제 값만 입력하세요

### 빌드 실패

**문제**: 패키지 빌드가 실패함

**해결 방법**:
```bash
# 1. 의존성 재설치
yarn install

# 2. 캐시 정리
yarn clean

# 3. 다시 빌드
yarn build

# 4. 특정 패키지만 빌드
yarn workspace @lostark/rest-api build
```

### 테스트 실패

**문제**: 단위 테스트가 실패함

**해결 방법**:
```bash
# 1. 환경변수 설정 확인
grep LOSTARK_API_KEY .env

# 2. 테스트 재실행
yarn test

# 3. 특정 테스트만 실행
yarn test:unit
```

## 🚀 서버 실행 문제

### 포트 충돌

**문제**: 서버 시작 시 포트가 이미 사용 중

**해결 방법**:
```bash
# 1. 사용 중인 포트 확인
lsof -i :3000

# 2. 프로세스 종료
kill -9 <PID>

# 3. 다른 포트로 실행
REST_SERVER_PORT=3001 yarn workspace @lostark/rest-api start
```

### 서버 무한대기

**문제**: Cursor 대화 중 서버 실행으로 인한 무한대기

**해결 방법**:
```bash
# 1. 개발 모드 사용 (권장)
yarn workspace @lostark/rest-api dev

# 2. 백그라운드 실행
nohup yarn workspace @lostark/rest-api start &

# 3. 별도 터미널에서 실행
```

## 📦 모노레포 문제

### 의존성 순환 참조

**문제**: 패키지 간 순환 참조 발생

**해결 방법**:
```bash
# 1. 의존성 검증
yarn validate:deps

# 2. 프로젝트 참조 검증
yarn validate:refs

# 3. 전체 검증
yarn validate:monorepo
```

### 타입 참조 오류

**문제**: 패키지 간 타입 참조 실패

**해결 방법**:
```bash
# 1. TypeScript 프로젝트 참조 확인
yarn typecheck

# 2. 특정 패키지 타입 체크
yarn workspace @lostark/rest-api typecheck

# 3. 빌드 순서 확인
yarn build

### Git push 실패: Husky pre-push 훅 오류 (tsx PnP 해석 실패)

**문제**: `git push` 시 pre-push 훅에서 아래와 같은 오류로 실패

```
husky - DEPRECATED

Please remove the following two lines from .husky/pre-push:

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

They WILL FAIL in v10.0.0

Usage Error: Couldn't find tsx@npm:4.20.5 in the currently installed PnP map - running an install might help

husky - pre-push script failed (code 1)
```

**원인**:
- Yarn PnP(strict)에서 pre-push 훅이 루트 컨텍스트로 `tsx`를 호출하는데, PnP 맵에 선언/락파일 버전 불일치로 `tsx` 해석 실패
- `.husky/pre-push`가 구식 헤더(`husky.sh` 소스) 사용으로 불필요한 경고 발생

**해결 방법**:
```bash
# 1) pre-push 구식 헤더 제거 (husky v9 권고 포맷)
sed -i '' '1,2d' .husky/pre-push
echo 'yarn prepush' > .husky/pre-push
chmod +x .husky/pre-push

# 2) 루트 devDependency의 tsx 버전을 락파일과 정렬
# package.json의 devDependencies.tsx 를 ^4.20.5 로 업데이트

# 3) 의존성 동기화로 PnP 맵 갱신
yarn install --inline-builds --check-cache

# 4) prepush가 호출하는 절차를 수동 점검
yarn validate:monorepo && yarn test && yarn build
```

**검증 결과**:
- `tsx v4.20.5` 정상 출력, unit/integration 테스트 통과, 빌드 정상
- 이후 `git push` 성공

**비고**:
- Husky v10로 업그레이드 시에도 위 포맷 유지 필요(구식 헤더 미사용)
```

## 🔍 로그 및 디버깅

### 로그 레벨 설정

**문제**: 로그가 너무 많거나 적음

**해결 방법**:
```bash
# .env 파일에서 로그 레벨 설정
LOG_LEVEL=debug  # 상세 로그
LOG_LEVEL=info   # 일반 로그
LOG_LEVEL=warn   # 경고만
LOG_LEVEL=error  # 에러만
```

### 캐시 문제

**문제**: 캐시가 제대로 작동하지 않음

**해결 방법**:
```bash
# 1. 캐시 상태 확인
curl http://localhost:3000/cache/status

# 2. 캐시 통계 확인
curl http://localhost:3000/api/v1/cache/stats

# 3. 캐시 최적화 실행
curl -X POST http://localhost:3000/cache/optimize
```

## 📚 추가 도움말

- [개발 가이드](../development-guide.md) - 개발 환경 설정
- [설정 가이드](../configuration.md) - 환경변수 및 설정
- [워크플로우 가이드](../workflows/development-workflow.md) - 개발 프로세스
- [모범 사례](../workflows/best-practices.md) - 코드 품질 가이드
