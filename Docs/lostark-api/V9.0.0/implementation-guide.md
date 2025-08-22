# Lost Ark API Implementation Guide

> **참조**:
> [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/getting-started)
>
> **버전**: V9.0.0
>
> **@cursor-change**: 2025-01-27, v1.0.0, 구현 가이드 문서 생성

## 📋 개요

이 문서는 Lost Ark API V9.0.0의 구현 전략, 아키텍처 설계, 작업 현황을 통합하여
제공합니다.

## 📊 전체 작업 현황 요약

### 🎯 **작업 완성도**

- **문서화**: 6/6 API (100% 완료)
- **캐싱 전략**: 2/6 API (33% 완료)
- **구현**: 0/6 API (0% 완료)
- **테스트**: 0/6 API (0% 완료)

### 🚀 **구현 우선순위**

1. **ARMORIES API** (Phase 1) - 캐릭터 상세 정보
2. **CHARACTERS API** (Phase 1) - 캐릭터 기본 정보
3. **AUCTIONS API** (Phase 1) - 경매장 검색
4. **NEWS API** (Phase 2) - 공지사항, 이벤트
5. **GAMECONTENTS API** (Phase 2) - 게임 콘텐츠
6. **MARKETS API** (Phase 2) - 시장 정보

---

## 🏗️ 아키텍처 설계

### **핵심 원칙**

#### 1. **스코프 기반 데이터 분리**

- **ROSTER**: 계정 내 서버별 공유 자산 (카드, 각인 지식, 스킬 룬 등)
- **CHARACTER**: 캐릭터 개별 자산 (장비, 보석, 아바타 등)
- **PRESET**: 진화 노드 선택 기반 빌드 구성 (스킬 트리, 각인 선택 등)
- **SNAPSHOT**: 시점 고정 기록 (전투력, 지표 등)

#### 2. **참조 우선 설계**

- 프리셋은 실제 값을 저장하지 않고 참조로 구성
- 필요 시에만 스냅샷으로 고정
- 중복 데이터 최소화

#### 3. **변경 감지 기반 저장**

- 정규화 후 해시 비교로 불필요한 저장 방지
- 변경된 부분만 선택적 갱신

#### 4. **내부 UID 체계**

- 이름/서버 변경에 견고한 식별자 사용
- `hash(server, class, name, firstSeen)` 형태

### **데이터 모델**

#### **스코프별 자산 분류**

##### **로스터 공유 자산** (ROSTER 스코프)

- **카드 보유/각성**: 계정 내 모든 캐릭터가 공유
- **카드 덱 템플릿**: 계정별 카드 구성 패턴
- **각인 지식**: 해금된 각인 정보 (진화 노드 제외)
- **스킬 룬 인벤토리**: 보유한 룬 목록
- **수집형 성장**: 스킬 포인트 총량, 성향 등
- **코어·젬 인벤토리**: 보유한 코어/젬 목록

##### **캐릭터 개별 자산** (CHARACTER 스코프)

- **착용 장비/장신구**: 현재 착용 중인 장비
- **장비 품질/재련/연마**: 장비의 세부 상태
- **팔찌/어빌리티 스톤**: 세공 결과 포함
- **착용 보석**: 현재 착용 중인 보석과 스킬 매핑
- **아바타**: 착용 중인 아바타 정보

##### **프리셋 구성 요소** (PRESET 스코프)

- **진화 노드 선택**: 메인 전투 스타일 결정 (가장 핵심)
- **스킬 트리**: 진화 노드에 따른 스킬 구성 + 트라이포드 선택
- **각인 선택**: 아크 패시브 (진화 노드 제외)
- **카드 덱**: 장착된 카드 배치
- **보석 배치**: 착용 보석과 스킬 매핑
- **장비 세트**: 착용 장비 구성

##### **스냅샷 데이터** (SNAPSHOT 스코프)

- **증명의 전장 기록**: 시점별 전투력 기록
- **전투력/지표**: 특정 시점의 성능 지표
- **성장 이력**: 레벨업, 장비 강화 등

---

## 🔄 ETL 파이프라인 설계

### **1. 전체 호출 기반 ETL**

```typescript
// 기본 ETL 파이프라인
async function etlCharacterData(characterName: string) {
  // 전체 호출로 모든 데이터 획득
  const fullData = await fetchArmoriesCharacter(characterName);

  // 파트별 모듈화된 ETL 처리
  const results = await Promise.all([
    etlProfile(fullData.ArmoryProfile),
    etlEquipment(fullData.ArmoryEquipment),
    etlEngravings(fullData.Engravings),
    etlCards(fullData.Cards),
    etlGems(fullData.Gems),
    etlCombatSkills(fullData.CombatSkills),
  ]);

  return results;
}
```

### **2. 모듈화된 파트별 ETL**

```typescript
// 각 파트별 독립적인 ETL 모듈
export const etlModules = {
  profile: {
    extract: (fullData: ArmoriesCharacterV9) => fullData.ArmoryProfile,
    transform: (data: ArmoryProfileV9) => normalizeProfile(data),
    load: (data: ProfileDomain) => saveProfile(data),
    detectChanges: (current: ArmoryProfileV9, previous: ArmoryProfileV9) =>
      compareProfile(current, previous),
  },
  equipment: {
    extract: (fullData: ArmoriesCharacterV9) => fullData.ArmoryEquipment,
    transform: (data: ArmoryEquipmentV9[]) => normalizeEquipment(data),
    load: (data: EquipmentDomain[]) => saveEquipment(data),
    detectChanges: (
      current: ArmoryEquipmentV9[],
      previous: ArmoryEquipmentV9[],
    ) => compareEquipment(current, previous),
  },
  // ... 다른 파트들
};
```

### **3. 성능 최적화 전략**

#### **병렬 처리**

- 모든 파트를 동시에 처리하여 전체 처리 시간 단축
- 각 파트는 독립적이므로 병렬 처리 가능

#### **스트림 기반 처리**

- 대용량 데이터의 경우 스트림 처리로 메모리 사용량 최적화
- JSON 스트림을 통해 파트별 변경 감지

#### **캐시 계층**

- 파트별 개별 캐시 관리
- 파트별 다른 TTL 적용 가능

---

## 📋 API별 상세 작업 현황

### 1. 📰 NEWS API

**상태**: 🟡 문서화 완료, 캐싱 전략 대기

#### 엔드포인트

- `GET /news/notices` - 공지사항 목록
- `GET /news/events` - 이벤트 목록

#### 작업 현황

- [x] **문서화**: API 엔드포인트 문서화 완료
- [ ] **캐싱 전략**: 작성 대기
- [ ] **구현**: Phase 2 예정
- [ ] **테스트**: 구현 후 진행

#### 특이사항

- **데이터 크기**: 작음 (1-10KB)
- **변화 빈도**: 낮음 (공지사항은 자주 변경되지 않음)
- **캐싱 전략**: 단순한 TTL 기반 캐싱 예상

---

### 2. 👤 CHARACTERS API

**상태**: 🟢 캐싱 전략 완료, 구현 대기

#### 엔드포인트

- `GET /characters/{characterName}/siblings` - 캐릭터 형제 정보

#### 작업 현황

- [x] **문서화**: API 엔드포인트 문서화 완료
- [x] **캐싱 전략**: 완성
- [ ] **구현**: Phase 1 예정
- [ ] **테스트**: 구현 후 진행

#### 핵심 전략

- **계정 기반 캐릭터 추적**: 동일 계정의 모든 서버 캐릭터 추적
- **ARMORIES 큐 연동**: 변화 감지 시 자동 ARMORIES 호출 큐 추가
- **변화 감지**: 아이템 레벨 변화, 캐릭터 생성/삭제 감지
- **단순한 캐싱**: 5-10KB 데이터에 적합한 단일 계층 구조

#### 성능 요구사항

- Siblings 조회 p95 ≤ 30ms (캐시 히트 기준)
- 변화 감지 정확도 ≥ 95%
- 계정 정보 캐시 히트율 ≥ 90%

---

### 3. ⚔️ ARMORIES API

**상태**: 🟢 캐싱 전략 완료, 구현 대기

#### 엔드포인트

- `GET /armories/characters/{characterName}` - 캐릭터 전체 정보
- `GET /armories/characters/{characterName}/profiles` - 기본 능력치
- `GET /armories/characters/{characterName}/equipment` - 장비 정보
- `GET /armories/characters/{characterName}/avatars` - 아바타 정보
- `GET /armories/characters/{characterName}/combat-skills` - 전투 스킬
- `GET /armories/characters/{characterName}/engravings` - 각인 정보
- `GET /armories/characters/{characterName}/cards` - 카드 정보
- `GET /armories/characters/{characterName}/gems` - 보석 정보
- `GET /armories/characters/{characterName}/colosseums` - 증명의 전장
- `GET /armories/characters/{characterName}/collectibles` - 수집품 정보

#### 작업 현황

- [x] **문서화**: API 엔드포인트 문서화 완료
- [x] **캐싱 전략**: 완성
- [ ] **구현**: Phase 1 예정 (최우선)
- [ ] **테스트**: 구현 후 진행

#### 핵심 전략

- **캐릭터 단위 조회 빈도 기반 TTL**: 자주/중간/드물게 조회되는 캐릭터별 동적
  TTL
- **단순한 전체 호출 전략**: 캐시 만료 시 전체 API 호출
- **3계층 캐시**: Memory Cache → Redis Cache → Database
- **분리된 관심사**: TTL 전략과 데이터 처리 전략 분리

#### 성능 요구사항

- 캐릭터 조회 p95 ≤ 50ms (캐시 히트 기준)
- 캐시 히트율 ≥ 85%
- 메모리 사용량 ≤ 1GB (기본 설정 기준)

---

### 4. 🏪 AUCTIONS API

**상태**: 🟡 문서화 완료, 캐싱 전략 대기

#### 엔드포인트

- `GET /auctions/options` - 검색 옵션
- `POST /auctions/items` - 아이템 검색

#### 작업 현황

- [x] **문서화**: API 엔드포인트 문서화 완료
- [ ] **캐싱 전략**: 작성 대기 (다음 우선순위)
- [ ] **구현**: Phase 1 예정
- [ ] **테스트**: 구현 후 진행

#### 특이사항

- **데이터 크기**: 중간-큼 (검색 결과에 따라 10KB-1MB+)
- **변화 빈도**: 높음 (경매장 가격 실시간 변동)
- **캐싱 전략**: 검색 결과 캐싱 + 가격 변화 감지 필요

---

### 5. 🛒 MARKETS API

**상태**: 🟡 문서화 완료, 캐싱 전략 대기

#### 엔드포인트

- `GET /markets/options` - 검색 옵션
- `GET /markets/items/{itemId}` - 아이템 ID로 조회
- `POST /markets/items` - 아이템 검색

#### 작업 현황

- [x] **문서화**: API 엔드포인트 문서화 완료
- [ ] **캐싱 전략**: 작성 대기
- [ ] **구현**: Phase 2 예정
- [ ] **테스트**: 구현 후 진행

#### 특이사항

- **데이터 크기**: 중간-큼 (검색 결과에 따라 10KB-1MB+)
- **변화 빈도**: 높음 (시장 가격 실시간 변동)
- **캐싱 전략**: 아이템별 가격 캐싱 + 변화 감지 필요

---

### 6. 🎮 GAMECONTENTS API

**상태**: 🟡 문서화 완료, 캐싱 전략 대기

#### 엔드포인트

- `GET /gamecontents/calendar` - 주간 콘텐츠 달력

#### 작업 현황

- [x] **문서화**: API 엔드포인트 문서화 완료
- [ ] **캐싱 전략**: 작성 대기
- [ ] **구현**: Phase 2 예정
- [ ] **테스트**: 구현 후 진행

#### 특이사항

- **데이터 크기**: 큼 (100KB-1MB+)
- **변화 빈도**: 낮음 (주간 단위 업데이트)
- **캐싱 전략**: 주간 단위 캐싱 + 업데이트 감지

---

## 🏷️ 식별자 체계

### **캐릭터 UID**

```typescript
function generateCharacterUID(profile: ArmoryProfileV9): string {
  const data = `${profile.ServerName}:${profile.CharacterClassName}:${profile.CharacterName}:${profile.firstSeen}`;
  return hash(data);
}
```

### **로스터 UID**

```typescript
function generateRosterUID(accountHint: string, server: string): string {
  const data = `${accountHint}:${server}`;
  return hash(data);
}
```

### **이름 변경 정책**

- `nameHistory` 배열로 이름 변경 이력 추적
- UID는 변경되지 않음
- 병합 정책: 동일 계정/서버 병합 도구로 관리

---

## 🔍 변경 감지 및 저장

### **해시 기반 변경 감지**

```typescript
function detectChanges(current: any, previous: any): boolean {
  const currentHash = generateContentHash(normalizeData(current));
  const previousHash = generateContentHash(normalizeData(previous));
  return currentHash !== previousHash;
}

function generateContentHash(data: any): string {
  // 정렬, 수치 포맷 통일 후 해시 생성
  const normalized = normalizeForHash(data);
  return hash(JSON.stringify(normalized));
}
```

### **저장 메타데이터**

```typescript
interface StorageMetadata {
  contentHash: string;
  source: {
    apiVersion: 'V9.0.0';
    fetchedAt: string;
  };
  updatedAt: string;
  effectiveAt: string;
}
```

---

## 📁 파일 구조

### **타입 정의**

```
packages/shared/src/types/
├── V9/
│   ├── armories.ts          # ARMORIES API 응답 타입
│   ├── characters.ts        # CHARACTERS API 응답 타입
│   └── index.ts
├── domain/
│   ├── account.ts           # 계정 도메인 모델
│   ├── roster.ts            # 로스터 도메인 모델
│   ├── character.ts         # 캐릭터 도메인 모델
│   ├── item.ts              # 아이템 도메인 모델
│   ├── preset.ts            # 프리셋 도메인 모델
│   └── snapshot.ts          # 스냅샷 도메인 모델
└── latest/
    └── index.ts             # 현재 버전 별칭
```

### **ETL 모듈**

```
packages/data-service/src/etl/
├── base/
│   ├── etl-module.ts        # 기본 ETL 모듈 인터페이스
│   ├── change-detector.ts   # 변경 감지 로직
│   └── stream-processor.ts  # 스트림 처리기
├── modules/
│   ├── profile.ts
│   ├── equipment.ts
│   ├── engravings.ts
│   ├── cards.ts
│   ├── gems.ts
│   └── combat-skills.ts
└── orchestrator.ts          # ETL 오케스트레이터
```

---

## 🔄 파이프라인 단계

### **Phase 1: 탐색 (Discover)**

- **목표**: 대상 계정/로스터/캐릭터 탐색
- **출력**: roster candidates, character list
- **API**: `/characters/{characterName}/siblings`

### **Phase 2: 공유 자산 수집 (Collect Shared)**

- **목표**: 로스터 공유 자산 수집
- **출력**: cards/runes/gems/cores, collectibles
- **API**: `/armories/characters/{characterName}` (Cards, Collectibles 섹션)

### **Phase 3: 캐릭터 자산 수집 (Collect Character)**

- **목표**: 캐릭터 착용/스탯/아이템 수집
- **출력**: character state, item list
- **API**: `/armories/characters/{characterName}` (Equipment, Gems, Avatars
  섹션)

### **Phase 4: 정규화 및 연결 (Normalize & Link)**

- **목표**: 정규화 및 참조 연결
- **출력**: \*\_Doc 초안
- **처리**: API 응답 → 도메인 모델 변환

### **Phase 5: 변경 감지 및 업서트 (Diff & Upsert)**

- **목표**: 정규화+해시 비교 후 변경분 upsert
- **출력**: upserted docs
- **처리**: 해시 비교 → 변경된 부분만 저장

### **Phase 6: 유효 세팅 계산 (Derive Effective)**

- **목표**: 유효 세팅 계산 (공유 ⊕ 프리셋 ⊕ 착용)
- **출력**: effective view
- **처리**: 참조 기반 실제 세팅 계산

### **Phase 7: 스냅샷 생성 (Snapshot Optional)**

- **목표**: 필요 시 전투력/지표 스냅샷
- **출력**: SnapshotDoc
- **API**: `/armories/characters/{characterName}/colosseums`

### **Phase 8: 인덱스 발행 (Publish Index)**

- **목표**: 질의용 인덱스/뷰 갱신
- **출력**: query index
- **처리**: 검색 최적화 인덱스 생성

---

## 🚀 구현 우선순위

### **Phase 1: 기본 구조 (1-2주)**

1. 타입 정의 완성
2. 기본 ETL 모듈 구현
3. 변경 감지 로직 구현

### **Phase 2: 파이프라인 구현 (2-3주)**

1. 전체 호출 기반 ETL 구현
2. 파트별 모듈화 완성
3. 성능 최적화 적용

### **Phase 3: 테스트 및 검증 (1주)**

1. 기존 스트리머 데이터로 테스트
2. 스코프 경계 검증
3. 변경 감지 정확성 확인

### **Phase 4: 최적화 및 확장 (1-2주)**

1. 스트림 처리 최적화
2. 캐시 계층 구현
3. 모니터링 및 로깅 추가

---

## 📋 수용 기준

### **기능적 요구사항**

- [ ] 스코프 경계 준수 (공유 vs 캐릭터)
- [ ] 프리셋이 참조를 우선 사용
- [ ] 스냅샷이 시점 고정값을 보존
- [ ] 이름/서버 변경에도 UID 일관성 유지
- [ ] 동일 빌드의 재수집 시 업서트 없음 (해시 동일)

### **성능 요구사항**

- [ ] REST p95 ≤ 50ms (캐시 히트 기준)
- [ ] UDP p95 ≤ 10ms (캐시 히트 기준)
- [ ] Rate Limit 효율적 사용 (100 requests/minute)
- [ ] 메모리 사용량 최적화

### **품질 요구사항**

- [ ] 타입 안전성 보장
- [ ] 에러 처리 완비
- [ ] 로깅 품질 (레벨·requestId·민감정보 배제)
- [ ] 테스트 커버리지 80% 이상

---

## 📝 참고사항

### **API 제한**

- Rate Limit: 100 requests/minute
- 인증: JWT 토큰 필수
- 응답 형식: JSON

### **데이터 크기**

- 전체 ARMORIES 응답: ~411KB
- 개별 파트: 1.5KB ~ 150KB
- 스트림 처리 권장

### **버전 관리**

- API 버전과 도메인 모델 버전 분리
- 하위 호환성 유지
- 마이그레이션 도구 제공

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025-01-27  
**@cursor-change**: 2025-01-27, v1.0.0, 구현 가이드 문서 생성
