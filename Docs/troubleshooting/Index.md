# Troubleshooting Guide

<!-- @cursor-change: 2025-01-27, v1.0.1, 타입 에러 트러블슈팅 추가 -->

## 🚨 **타입 에러 문제**

### **빠른 해결 체크리스트**

새 작업 시작 전 반드시 다음 순서로 체크하세요:

```bash
# 1. 타입 체크
yarn typecheck

# 2. Shared 패키지 빌드 확인
yarn workspace @lostark/shared build

# 3. 전체 빌드
yarn build
```

### **자주 발생하는 타입 에러**

#### **1. 타입 Export 문제**

```
Module '"@lostark/shared/types/V9"' has no exported member 'ARMORIES_ENDPOINTS'.
```

**원인**: ESM 모듈 시스템에서 TypeScript가 export를 제대로 인식하지 못함

**해결 방법**:

1. Shared 패키지에 TypeScript 의존성 추가:

   ```bash
   yarn workspace @lostark/shared add -D typescript
   ```

2. Import 경로를 직접 파일 경로로 변경:

   ```typescript
   // ❌ 잘못된 방법
   import { ARMORIES_ENDPOINTS } from '@lostark/shared/types/V9';

   // ✅ 올바른 방법
   import { ARMORIES_ENDPOINTS } from '@lostark/shared/types/V9/armories.js';
   ```

3. Shared 패키지 빌드:
   ```bash
   yarn workspace @lostark/shared build
   ```

#### **2. 빌드 의존성 문제**

```
Output file '/.../armories.d.ts' has not been built from source file
```

**원인**: Shared 패키지가 빌드되지 않아서 타입 정의 파일이 없음

**해결 방법**:

```bash
yarn workspace @lostark/shared build
```

#### **3. Optional 타입 호환성 문제**

```
Type 'string | undefined' is not assignable to type 'string'.
Type '{ ... }' is not assignable to type 'NormalizedCharacterDetail' with 'exactOptionalPropertyTypes: true'.
```

**원인**: TypeScript strict 모드에서 optional 속성 처리 문제

**해결 방법**: 조건부 할당 사용

```typescript
// ❌ 잘못된 방법
guildName: profile.GuildName || undefined,

// ✅ 올바른 방법
...(profile.GuildName && { guildName: profile.GuildName }),
```

#### **4. Export 충돌 문제**

```
Module has already exported a member named 'ArmoriesQueueItem'.
Module has already exported a member named 'startCacheCleanupScheduler'.
```

**원인**: 여러 모듈에서 동일한 이름의 export 충돌

**해결 방법**: 명시적 export 사용

```typescript
// ❌ export * 사용 (충돌 위험)
export * from './services/characters-service.js';

// ✅ 명시적 export 사용
export { CharactersService } from './services/characters-service.js';
```

### **Import 경로 규칙**

- **권장**: `@lostark/shared/types/V9/armories.js` (직접 파일 경로)
- **피해야 할**: `@lostark/shared/types/V9` (index.ts 경유)

### **예방 방법**

1. **새 작업 시작 전 항상 체크리스트 실행**
2. **Import 경로는 직접 파일 경로 사용**
3. **Optional 타입은 조건부 할당 사용**
4. **Export는 명시적으로 지정**
5. **Shared 패키지 변경 후 반드시 빌드**

---

## 개요

### 개발 환경 문제

- [**ESLint Import 해석 문제 (Yarn Berry PnP)**](./eslint-pnp-issue.md) -
  IDE에서 발생하는 import 경로 해석 오류 해결

---

_마지막 업데이트: 2025-01-15_
