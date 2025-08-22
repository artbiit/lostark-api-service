# Lost Ark API Caching Strategies

> **참조**:
> [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/getting-started)
>
> **버전**: V9.0.0
>
> **@cursor-change**: 2025-01-27, v1.0.0, 캐싱 전략 통합 문서 생성

## 📋 개요

이 문서는 Lost Ark API V9.0.0의 모든 캐싱 전략을 통합하여 제공합니다. 각 API의
특성에 맞는 최적화된 캐싱 전략과 공통 패턴을 정의합니다.

## 🎯 공통 캐싱 원칙

### **1. 계층별 캐싱 구조**

```
📊 Memory Cache (L1)
├── 자주 조회되는 데이터
├── TTL: 5-10분 (동적)
└── 빠른 응답

 Redis Cache (L2)
├── 중간 조회 데이터
├── TTL: 10-30분 (동적)
└── 중간 속도

📊 Database (L3)
├── 드물게 조회되는 데이터
├── TTL: 30일 (영속 저장)
└── 느린 속도, 영속성 보장
```

### **2. 변경 감지 기반 갱신**

- 해시 기반 변경 감지로 불필요한 갱신 방지
- 실제 변화가 있을 때만 캐시 갱신
- 정규화 후 비교로 정확성 보장

### **3. Rate Limit 최적화**

- 100 requests/minute 제한 내에서 효율적 사용
- 캐시 히트율 최대화로 API 호출 최소화
- 우선순위 기반 큐 관리

---

## ⚔️ ARMORIES API 캐싱 전략

### **핵심 전략**

#### 1. **캐릭터 단위 조회 빈도 기반 TTL**

- **자주 조회되는 캐릭터**: 짧은 TTL (5분) + 미리 갱신
- **중간 조회 캐릭터**: 중간 TTL (7.5분)
- **드물게 조회되는 캐릭터**: 긴 TTL (10분) + 응답 속도 우선

#### 2. **단순한 전체 호출 전략**

- **캐시 만료 시**: 전체 API 호출 (`/armories/characters/{name}`)
- **캐시 유효 시**: 캐시에서 조회
- **현대 네트워크 기준**: 411KB는 가벼운 데이터로 단순 처리

#### 3. **분리된 관심사**

- **TTL 전략**: 언제 API 호출할지 결정
- **데이터 처리 전략**: API 응답을 어떻게 저장할지

### **구현 세부사항**

#### **캐릭터별 동적 TTL 계산**

```typescript
interface CharacterUsage {
  characterName: string;
  accessCount: number; // 총 조회 횟수
  lastAccessed: Date; // 마지막 조회 시점
  accessFrequency: 'high' | 'medium' | 'low';
  averageInterval: number; // 평균 조회 간격 (분)
  ttl: number; // 동적 계산된 TTL (초)
}

async function calculateCharacterTTL(characterName: string): Promise<number> {
  const usage = await getCharacterUsage(characterName);

  // 기본 TTL (분)
  const baseTTL = {
    high: 5, // 자주 조회: 5분
    medium: 7.5, // 중간 조회: 7.5분
    low: 10, // 드물게 조회: 10분
  };

  let ttl = baseTTL[usage.accessFrequency];

  // 조정 요인들
  const adjustments = {
    // 최근 조회 간격이 짧으면 TTL 단축
    recentInterval: usage.averageInterval < 10 ? 0.8 : 1,

    // 총 조회 횟수가 많으면 TTL 단축 (신뢰도 높음)
    totalAccesses: usage.accessCount > 1000 ? 0.8 : 1,

    // 마지막 조회가 오래되면 TTL 연장 (관심도 하락)
    lastAccess: getDaysSinceLastAccess(usage.lastAccessed) > 7 ? 1.2 : 1,
  };

  // 최종 TTL 계산 (초 단위)
  const finalTTL = Math.floor(
    ttl *
      60 *
      adjustments.recentInterval *
      adjustments.totalAccesses *
      adjustments.lastAccess,
  );

  // 최소/최대 제한 (5분 ~ 10분)
  return Math.max(300, Math.min(600, finalTTL));
}
```

#### **미리 갱신 전략**

```typescript
async function predictiveRefresh(characterName: string) {
  const usage = await getCharacterUsage(characterName);

  if (usage.accessFrequency === 'high') {
    // 평균 조회 간격의 80% 지점에서 미리 갱신
    const refreshThreshold = usage.averageInterval * 0.8;
    const timeSinceLastAccess = Date.now() - usage.lastAccessed.getTime();

    if (timeSinceLastAccess > refreshThreshold) {
      // 백그라운드에서 미리 갱신
      setImmediate(async () => {
        await refreshCharacterData(characterName);
      });
    }
  }
}
```

### **성능 요구사항**

- 캐릭터 조회 p95 ≤ 50ms (캐시 히트 기준)
- 캐시 히트율 ≥ 85%
- 메모리 사용량 ≤ 1GB (기본 설정 기준)

---

## 👤 CHARACTERS API 캐싱 전략

### **핵심 전략**

#### 1. **계정 기반 캐릭터 추적**

- **계정 등록**: 처음 조회된 캐릭터의 siblings 데이터로 계정 정보 등록
- **변화 감지**: 캐릭터 생성/삭제 및 아이템 레벨 변화 추적
- **서버 분포**: 계정별 서버 분포 정보 관리

#### 2. **ARMORIES 큐 연동**

- **자동 큐잉**: 아이템 레벨 증가 시 ARMORIES 호출 큐에 자동 추가
- **우선순위 관리**: 레벨 증가량에 따른 동적 우선순위 조정
- **리소스 최적화**: 기존 ARMORIES 호출과 중복 방지

#### 3. **지능형 캐싱**

- **목록 조회 특성**: 상세 정보가 아닌 목록 조회에 최적화
- **변화 기반 갱신**: 실제 변화가 있을 때만 ARMORIES 호출
- **계정 단위 관리**: 동일 계정 캐릭터들의 연관성 활용

### **구현 세부사항**

#### **계정 등록 및 추적**

```typescript
interface AccountInfo {
  accountId: string; // 계정 식별자
  characters: CharacterInfo[];
  lastUpdated: Date;
  serverDistribution: Record<string, number>; // 서버별 캐릭터 수
  totalCharacters: number;
}

interface CharacterInfo {
  characterName: string;
  serverName: string;
  itemLevel: number;
  lastItemLevelUpdate: Date;
  isActive: boolean; // 삭제된 캐릭터는 false
  lastSeen: Date;
}

async function extractAndStoreAccountInfo(
  characterName: string,
  siblingsData: any[],
): Promise<AccountInfo> {
  // 기존 계정 정보 확인
  const existingAccount = await findAccountByCharacter(characterName);

  if (existingAccount) {
    return await updateAccountInfo(existingAccount, siblingsData);
  }

  // 새 계정 등록
  const accountInfo: AccountInfo = {
    accountId: generateAccountId(characterName, siblingsData),
    characters: siblingsData.map((char) => ({
      characterName: char.characterName,
      serverName: char.serverName,
      itemLevel: char.itemLevel,
      lastItemLevelUpdate: new Date(),
      isActive: true,
      lastSeen: new Date(),
    })),
    lastUpdated: new Date(),
    serverDistribution: calculateServerDistribution(siblingsData),
    totalCharacters: siblingsData.length,
  };

  await saveAccountInfo(accountInfo);
  return accountInfo;
}
```

#### **변화 감지 시스템**

```typescript
interface ItemLevelChange {
  characterName: string;
  oldLevel: number;
  newLevel: number;
  levelDiff: number;
  detectedAt: Date;
}

async function detectItemLevelChanges(
  accountInfo: AccountInfo,
  newSiblingsData: any[],
): Promise<{ changes: ItemLevelChange[]; deleted: CharacterInfo[] }> {
  const changes: ItemLevelChange[] = [];
  const deleted: CharacterInfo[] = [];

  // 새 캐릭터 및 레벨 변화 감지
  for (const newChar of newSiblingsData) {
    const existingChar = accountInfo.characters.find(
      (c) => c.characterName === newChar.characterName,
    );

    if (!existingChar) {
      // 새 캐릭터 생성
      changes.push({
        characterName: newChar.characterName,
        oldLevel: 0,
        newLevel: newChar.itemLevel,
        levelDiff: newChar.itemLevel,
        detectedAt: new Date(),
      });
    } else if (newChar.itemLevel > existingChar.itemLevel) {
      // 아이템 레벨 증가
      const levelDiff = newChar.itemLevel - existingChar.itemLevel;
      changes.push({
        characterName: newChar.characterName,
        oldLevel: existingChar.itemLevel,
        newLevel: newChar.itemLevel,
        levelDiff,
        detectedAt: new Date(),
      });
    }
  }

  // 삭제된 캐릭터 감지
  const deletedChars = accountInfo.characters.filter(
    (existing) =>
      !newSiblingsData.find(
        (newChar) => newChar.characterName === existing.characterName,
      ),
  );

  return { changes, deleted: deletedChars };
}
```

#### **ARMORIES 큐 연동**

```typescript
interface ArmoriesQueueItem {
  characterName: string;
  reason: 'level_up' | 'new_character' | 'manual' | 'scheduled';
  queuedAt: Date;
  accountId?: string;
}

class ArmoriesQueueManager {
  private queue: ArmoriesQueueItem[] = [];
  private processing: Set<string> = new Set();

  async addToQueue(
    characterName: string,
    reason: string,
    accountId?: string,
  ): Promise<void> {
    // 기존 항목이 있으면 추가하지 않음
    const existing = this.queue.find(
      (item) => item.characterName === characterName,
    );
    if (existing) {
      return;
    }

    // 이미 처리 중인 캐릭터는 스킵
    if (this.processing.has(characterName)) {
      return;
    }

    this.queue.push({
      characterName,
      reason,
      queuedAt: new Date(),
      accountId,
    });

    // Redis에 큐 상태 저장
    await this.saveQueueState();
  }

  async processQueue(): Promise<void> {
    const queue = await this.getQueueState();

    for (const item of queue) {
      // 이미 처리 중인 캐릭터는 스킵
      if (this.processing.has(item.characterName)) continue;

      // Rate Limit 체크
      if (!(await this.checkRateLimit())) break;

      // ARMORIES API 호출
      this.processing.add(item.characterName);
      try {
        await this.fetchArmoriesCharacter(item.characterName);
        await this.removeFromQueue(item.characterName);
      } catch (error) {
        logger.warn(
          `ARMORIES queue processing failed for ${item.characterName}:`,
          error,
        );
        // 에러 시 재시도 큐에 추가
        await this.addToRetryQueue(item.characterName);
      } finally {
        this.processing.delete(item.characterName);
      }
    }
  }
}
```

### **성능 요구사항**

- Siblings 조회 p95 ≤ 30ms (캐시 히트 기준)
- 변화 감지 정확도 ≥ 95%
- 계정 정보 캐시 히트율 ≥ 90%

---

## 🏪 AUCTIONS API 캐싱 전략 (예정)

### **특이사항**

- **데이터 크기**: 중간-큼 (검색 결과에 따라 10KB-1MB+)
- **변화 빈도**: 높음 (경매장 가격 실시간 변동)
- **캐싱 전략**: 검색 결과 캐싱 + 가격 변화 감지 필요

### **예상 전략**

#### 1. **검색 결과 캐싱**

- 검색 조건별 결과 캐싱
- 짧은 TTL (1-2분)로 가격 변화 대응
- 검색 조건 해시 기반 캐시 키

#### 2. **가격 변화 감지**

- 아이템별 가격 변화 추적
- 임계값 기반 알림 시스템
- 변화 감지 시 관련 검색 결과 무효화

---

## 🛒 MARKETS API 캐싱 전략 (예정)

### **특이사항**

- **데이터 크기**: 중간-큼 (검색 결과에 따라 10KB-1MB+)
- **변화 빈도**: 높음 (시장 가격 실시간 변동)
- **캐싱 전략**: 아이템별 가격 캐싱 + 변화 감지 필요

### **예상 전략**

#### 1. **아이템별 가격 캐싱**

- 아이템 ID별 가격 정보 캐싱
- 중간 TTL (3-5분)로 가격 변화 대응
- 가격 이력 추적

#### 2. **시장 변화 감지**

- 시장 전체 변화 패턴 분석
- 급격한 가격 변동 감지
- 관련 아이템 그룹 무효화

---

## 📰 NEWS API 캐싱 전략 (예정)

### **특이사항**

- **데이터 크기**: 작음 (1-10KB)
- **변화 빈도**: 낮음 (공지사항은 자주 변경되지 않음)
- **캐싱 전략**: 단순한 TTL 기반 캐싱 예상

### **예상 전략**

#### 1. **단순 TTL 캐싱**

- 긴 TTL (30분-1시간) 적용
- 공지사항 변경 시 수동 무효화
- 이벤트 정보는 더 짧은 TTL

---

## 🎮 GAMECONTENTS API 캐싱 전략 (예정)

### **특이사항**

- **데이터 크기**: 큼 (100KB-1MB+)
- **변화 빈도**: 낮음 (주간 단위 업데이트)
- **캐싱 전략**: 주간 단위 캐싱 + 업데이트 감지

### **예상 전략**

#### 1. **주간 단위 캐싱**

- 주간 리셋 시점 기반 TTL
- 콘텐츠 업데이트 감지
- 대용량 데이터 스트림 처리

---

## 📈 모니터링 및 메트릭

### **공통 메트릭**

```typescript
interface PerformanceMetrics {
  cacheHitRate: number; // 캐시 히트율
  averageResponseTime: number; // 평균 응답 시간
  apiCallCount: number; // API 호출 횟수
  rateLimitUsage: number; // Rate Limit 사용량
  errorRate: number; // 에러율
}
```

### **API별 메트릭**

#### **ARMORIES API**

```typescript
interface CharacterMetrics {
  characterName: string;
  accessCount: number; // 조회 횟수
  averageTTL: number; // 평균 TTL
  cacheHitRate: number; // 캐시 히트율
  lastAccessed: Date; // 마지막 조회
}
```

#### **CHARACTERS API**

```typescript
interface AccountMetrics {
  accountId: string;
  totalCharacters: number;
  activeCharacters: number;
  serverDistribution: Record<string, number>;
  lastActivity: Date;
  levelUpCount: number; // 일일 레벨업 횟수
  newCharacterCount: number; // 일일 새 캐릭터 수
  averageItemLevel: number; // 계정 평균 아이템 레벨
  mostActiveServer: string; // 가장 활발한 서버
  lastLevelUpDate?: Date; // 마지막 레벨업 날짜
}

interface ChangeDetectionMetrics {
  totalChanges: number;
  levelUps: number;
  newCharacters: number;
  deletedCharacters: number;
  queueEfficiency: number; // 큐 처리 효율성
  falsePositiveRate: number; // 오탐률
  detectionLatency: number; // 변화 감지 지연시간 (ms)
  queueProcessingTime: number; // 큐 처리 시간 (ms)
}
```

---

## 🔧 캐시 키 설계

### **공통 패턴**

```typescript
const cacheKeys = {
  // 캐릭터 전체 데이터
  character: (name: string) => `char:${name}:full`,

  // 캐릭터 사용 패턴
  usage: (name: string) => `usage:${name}`,

  // Rate Limit 추적
  rateLimit: () => `ratelimit:armories`,

  // 캐릭터별 siblings 데이터
  siblings: (characterName: string) => `siblings:${characterName}`,

  // 계정 정보
  account: (accountId: string) => `account:${accountId}`,

  // 캐릭터별 계정 매핑
  characterAccount: (characterName: string) => `char:${characterName}:account`,

  // ARMORIES 호출 큐
  armoriesQueue: () => `queue:armories`,

  // 계정별 캐릭터 목록
  accountCharacters: (accountId: string) => `account:${accountId}:characters`,
};
```

---

## 🚀 구현 우선순위

### **Phase 1: 기본 구조 (1주)**

1. 캐릭터별 조회 빈도 추적 시스템
2. 동적 TTL 계산 로직
3. 기본 캐시 계층 구현

### **Phase 2: 호출 전략 (1주)**

1. 단순한 전체 호출 전략 구현
2. 캐시 저장 및 조회 로직
3. 미리 갱신 시스템

### **Phase 3: 최적화 (1주)**

1. Rate Limit 관리 시스템
2. 성능 모니터링 추가
3. 에러 처리 및 폴백

### **Phase 4: 고급 기능 (1주)**

1. 동적 TTL 조정 최적화
2. 성능 튜닝 및 검증
3. 모니터링 대시보드

---

## 📋 수용 기준

### **성능 요구사항**

- [ ] REST p95 ≤ 50ms (캐시 히트 기준)
- [ ] UDP p95 ≤ 10ms (캐시 히트 기준)
- [ ] 캐시 히트율 ≥ 80%
- [ ] Rate Limit 효율적 사용 (100 requests/minute)

### **기능 요구사항**

- [ ] 캐릭터별 동적 TTL 관리
- [ ] 단순한 전체 호출 전략
- [ ] 미리 갱신 기능
- [ ] 점검 시간 대응
- [ ] 에러 처리 및 폴백

### **품질 요구사항**

- [ ] 타입 안전성 보장
- [ ] 로깅 품질 (레벨·requestId·민감정보 배제)
- [ ] 테스트 커버리지 80% 이상
- [ ] 모니터링 및 알림 시스템

---

## 📝 참고사항

### **API 제한**

- Rate Limit: 100 requests/minute
- 인증: JWT 토큰 필수
- 응답 형식: JSON

### **데이터 크기**

- 전체 ARMORIES 응답: ~411KB (현대 네트워크 기준 가벼움)
- 단순한 전체 호출로 처리

### **TTL 범위**

- 최소 TTL: 5분 (자주 조회)
- 최대 TTL: 10분 (드물게 조회)
- DB 보관: 30일

### **CHARACTERS API 연동**

- **자동 큐잉**: CHARACTERS API에서 감지된 아이템 레벨 변화로 ARMORIES 큐 자동
  추가
- **우선순위 조정**: 레벨 증가량에 따른 동적 우선순위 적용
- **계정 기반 관리**: 동일 계정 캐릭터들의 연관성 활용
- **변화 감지**: 캐릭터 생성/삭제 및 레벨 변화 자동 감지

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025-01-27  
**@cursor-change**: 2025-01-27, v1.0.0, 캐싱 전략 통합 문서 생성
