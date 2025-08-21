# Lost Ark KR 세팅 데이터 수집/저장 지침

> **참조**:
> [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/getting-started)
>
> **버전**: V9.0.0
>
> **작성일**: 2025-01-15
>
> **목적**: 캐릭터 단위 조회 + 계정(서버-로스터) 공유 스펙을 구분하여 저장

## 📋 개요

이 문서는 Lost Ark KR의 캐릭터 빌드 데이터를 체계적으로 수집하고 저장하기 위한
상세한 지침입니다. ARMORIES API를 기반으로 하여 캐릭터의 모든 세팅 정보를
효율적으로 관리하는 방법을 정의합니다.

## 🎯 핵심 원칙

### 1. **스코프 기반 데이터 분리**

- **ROSTER**: 계정 내 서버별 공유 자산 (카드, 각인 지식, 스킬 룬 등)
- **CHARACTER**: 캐릭터 개별 자산 (장비, 보석, 아바타 등)
- **PRESET**: 진화 노드 선택 기반 빌드 구성 (스킬 트리, 각인 선택 등)
- **SNAPSHOT**: 시점 고정 기록 (전투력, 지표 등)

### 2. **참조 우선 설계**

- 프리셋은 실제 값을 저장하지 않고 참조로 구성
- 필요 시에만 스냅샷으로 고정
- 중복 데이터 최소화

### 3. **변경 감지 기반 저장**

- 정규화 후 해시 비교로 불필요한 저장 방지
- 변경된 부분만 선택적 갱신

### 4. **내부 UID 체계**

- 이름/서버 변경에 견고한 식별자 사용
- `hash(server, class, name, firstSeen)` 형태

## 🏗️ 데이터 모델

### **스코프별 자산 분류**

#### **로스터 공유 자산** (ROSTER 스코프)

- **카드 보유/각성**: 계정 내 모든 캐릭터가 공유
- **카드 덱 템플릿**: 계정별 카드 구성 패턴
- **각인 지식**: 해금된 각인 정보 (진화 노드 제외)
- **스킬 룬 인벤토리**: 보유한 룬 목록
- **수집형 성장**: 스킬 포인트 총량, 성향 등
- **코어·젬 인벤토리**: 보유한 코어/젬 목록

#### **캐릭터 개별 자산** (CHARACTER 스코프)

- **착용 장비/장신구**: 현재 착용 중인 장비
- **장비 품질/재련/연마**: 장비의 세부 상태
- **팔찌/어빌리티 스톤**: 세공 결과 포함
- **착용 보석**: 현재 착용 중인 보석과 스킬 매핑
- **아바타**: 착용 중인 아바타 정보

#### **프리셋 구성 요소** (PRESET 스코프)

- **진화 노드 선택**: 메인 전투 스타일 결정 (가장 핵심)
- **스킬 트리**: 진화 노드에 따른 스킬 구성 + 트라이포드 선택
- **각인 선택**: 아크 패시브 (진화 노드 제외)
- **카드 덱**: 장착된 카드 배치
- **보석 배치**: 착용 보석과 스킬 매핑
- **장비 세트**: 착용 장비 구성

#### **스냅샷 데이터** (SNAPSHOT 스코프)

- **증명의 전장 기록**: 시점별 전투력 기록
- **전투력/지표**: 특정 시점의 성능 지표
- **성장 이력**: 레벨업, 장비 강화 등

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

## 📊 API 엔드포인트 활용

### **메인 엔드포인트**

```
GET /armories/characters/{characterName}
```

- **용도**: 전체 데이터 수집 (411.40KB)
- **포함 데이터**: ArmoryProfile, ArmoryEquipment, Engravings, Cards, Gems,
  CombatSkills 등
- **장점**: Rate Limit 효율적 사용, 데이터 일관성 보장

### **개별 엔드포인트** (선택적 사용)

```
GET /armories/characters/{characterName}/profiles      # 7.43KB
GET /armories/characters/{characterName}/equipment     # 76.63KB
GET /armories/characters/{characterName}/avatars       # 35.06KB
GET /armories/characters/{characterName}/combat-skills # 150.22KB
GET /armories/characters/{characterName}/engravings    # 1.56KB
GET /armories/characters/{characterName}/cards         # 9.47KB
GET /armories/characters/{characterName}/gems          # 81.18KB
GET /armories/characters/{characterName}/colosseums    # 1.64KB
GET /armories/characters/{characterName}/collectibles  # 28.12KB
```

- **용도**: 부분 갱신 시 선택적 사용
- **장점**: 네트워크 효율성, 빠른 응답

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
packages/fetch/src/etl/
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

## 🔍 쿼리 계약

### **기본 쿼리**

```typescript
// 로스터 공유 자산 조회
getRosterShared(rosterUid: string): Promise<RosterSharedAssets>

// 캐릭터 상태 조회
getCharacterState(characterUid: string): Promise<CharacterState>

// 프리셋 목록 조회
getPresetList(characterUid: string): Promise<Preset[]>

// 유효 빌드 조회
getEffectiveBuild(characterUid: string, presetId: string): Promise<EffectiveBuild>

// 스냅샷 조회
getSnapshots(characterUid: string, presetId: string, range: DateRange): Promise<Snapshot[]>
```

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
**최종 업데이트**: 2025-01-15  
**담당자**: 개발팀  
**검토자**: 아키텍처팀
