# 모범 사례

## 📋 개발 워크플로우 모범 사례

### 1. 파일 수정 전 사전 파악

#### ✅ 좋은 예시

```bash
# 1. 관련 파일 경로 파악
find . -name "*.ts" -exec grep -l "관련_키워드" {} \;

# 2. 기존 문서 중복 검토
grep -r "관련_키워드" . --exclude-dir=node_modules

# 3. 참조 관계 분석
# - 어떤 파일이 어떤 파일을 참조하는지 확인
# - 중복 내용이 있는지 확인
```

#### ❌ 나쁜 예시

```bash
# 바로 파일 수정 시작
# → 중복 내용 생성 가능성
# → 참조 관계 파악 부족
```

### 2. 문서화 모범 사례

#### ✅ 좋은 예시

```markdown
# 환경변수 설정

환경변수 설정은 [.env.example](../.env.example) 파일을 참조하세요. 상세 설정
가이드는 [설정 가이드](../configuration.md#environment-variables)를 참조하세요.
```

#### ❌ 나쁜 예시

```markdown
# 환경변수 설정

NODE_ENV=development LOSTARK_API_KEY=your_key_here

# → 중복 내용 생성
```

### 3. 커밋 메시지 모범 사례

#### ✅ 좋은 예시

```bash
# 기능 추가
feat: 자동화된 검증 시스템 구축

# 버그 수정
fix: 의존성 순환 참조 문제 해결

# 문서 업데이트
docs: 개발 워크플로우 가이드 추가

# 리팩토링
refactor: 환경변수 관리 로직 개선
```

#### ❌ 나쁜 예시

```bash
# 너무 간단한 메시지
update

# 변경사항이 명확하지 않은 메시지
fix bug

# 너무 긴 메시지
feat: 자동화된 검증 시스템을 구축하여 개발자가 실수로 잘못된 코드를 커밋하는 것을 방지하고 팀 전체의 코드 품질을 향상시키는 시스템을 추가
```

## 🔧 코드 품질 모범 사례

### 1. 타입 안전성

#### ✅ 좋은 예시

```typescript
// 명시적 타입 지정
interface ApiResponse {
  data: CharacterData;
  timestamp: number;
}

function processApiResponse(response: ApiResponse): void {
  // 타입 안전한 처리
}
```

#### ❌ 나쁜 예시

```typescript
// 암시적 any 타입
function processApiResponse(response) {
  // 타입 안전성 없음
}
```

### 2. 에러 처리

#### ✅ 좋은 예시

```typescript
try {
  const result = await apiCall();
  return result;
} catch (error) {
  logger.error('API 호출 실패', { error: error.message });
  throw new ApiError('API 호출 중 오류가 발생했습니다', error);
}
```

#### ❌ 나쁜 예시

```typescript
// 에러 무시
const result = await apiCall();
return result;
```

### 3. 환경변수 관리

#### ✅ 좋은 예시

```typescript
// Zod 스키마로 검증
const envSchema = z.object({
  LOSTARK_API_KEY: z.string().min(1),
  API_PORT: z.coerce.number().min(1).max(65535).default(3000),
});

const env = envSchema.parse(process.env);
```

#### ❌ 나쁜 예시

```typescript
// 직접 process.env 사용
const apiKey = process.env.LOSTARK_API_KEY;
const port = process.env.API_PORT;
```

## 🧪 테스트 모범 사례

### 1. 테스트 구조

#### ✅ 좋은 예시

```typescript
describe('CharacterService', () => {
  describe('fetchCharacter', () => {
    it('should fetch character data successfully', async () => {
      // 테스트 구현
    });

    it('should handle API errors gracefully', async () => {
      // 에러 케이스 테스트
    });
  });
});
```

#### ❌ 나쁜 예시

```typescript
// 테스트 구조가 불분명
it('should work', async () => {
  // 모든 테스트를 하나에 작성
});
```

### 2. 테스트 격리

#### ✅ 좋은 예시

```typescript
beforeEach(() => {
  // 각 테스트마다 새로운 상태로 초기화
  resetTestEnvironment();
});

afterEach(() => {
  // 테스트 후 정리
  cleanup();
});
```

#### ❌ 나쁜 예시

```typescript
// 테스트 간 상태 공유
let sharedState = {};

it('test 1', () => {
  sharedState.value = 'test';
});

it('test 2', () => {
  // test 1의 상태에 의존
  expect(sharedState.value).toBe('test');
});
```

## 📝 문서화 모범 사례

### 1. 주석 작성

#### ✅ 좋은 예시

```typescript
/**
 * 캐릭터 데이터를 정규화합니다.
 *
 * @param rawData - Lost Ark API에서 받은 원본 데이터
 * @returns 정규화된 캐릭터 데이터
 *
 * @example
 * const normalized = normalizeCharacterData(rawApiResponse);
 */
function normalizeCharacterData(rawData: any): CharacterData {
  // 구현
}
```

#### ❌ 나쁜 예시

```typescript
// 정규화 함수
function normalizeCharacterData(rawData) {
  // 구현
}
```

### 2. README 작성

#### ✅ 좋은 예시

````markdown
# 프로젝트명

## 개요

프로젝트의 목적과 주요 기능을 간결하게 설명

## 빠른 시작

```bash
# 설치
yarn install

# 환경변수 설정
cp .env.example .env

# 실행
yarn dev
```
````

## 문서

- [개발 가이드](./Docs/development-guide.md)
- [API 문서](./Docs/api.md)

````

#### ❌ 나쁜 예시

```markdown
# 프로젝트명

이 프로젝트는 Lost Ark API를 사용해서...
(너무 긴 설명)
````

## 🔗 관련 문서

- [개발자 워크플로우](./development-workflow.md)
- [코드 리뷰 체크리스트](./code-review-checklist.md)
- [문제 해결 가이드](./troubleshooting-guide.md)
