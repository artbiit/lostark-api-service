# Lost Ark API Endpoints

> **참조**: [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/getting-started)
> 
> **현재 버전**: V9.0.0 (최신)
> 
> **Rate Limit**: 100 requests/minute

## 📋 API 개요

로스트아크 공식 API는 다음과 같은 카테고리로 구분됩니다:

- **NEWS**: 공지사항, 이벤트 정보
- **CHARACTERS**: 캐릭터 기본 정보
- **ARMORIES**: 캐릭터 상세 정보 (장비, 각인, 보석 등)
- **AUCTIONS**: 경매장 검색
- **MARKETS**: 시장 정보
- **GAMECONTENTS**: 게임 콘텐츠 정보

---

## 📰 NEWS API

### 공지사항 및 이벤트 정보

#### 1. 공지사항 목록
```
GET /news/notices
```

**파라미터**:
- `searchText` (optional): 검색어
- `type` (optional): 공지사항 타입

**응답**: 공지사항 목록

#### 2. 이벤트 목록
```
GET /news/events
```

**응답**: 진행 중인 이벤트 목록

---

## 👤 CHARACTERS API

### 캐릭터 기본 정보

#### 1. 캐릭터 형제 정보
```
GET /characters/{characterName}/siblings
```

**파라미터**:
- `characterName`: 캐릭터명

**응답**: 해당 계정의 모든 캐릭터 프로필

---

## ⚔️ ARMORIES API

### 캐릭터 상세 정보 (무기고)

#### 1. 캐릭터 요약 정보
```
GET /armories/characters/{characterName}
```

**파라미터**:
- `characterName`: 캐릭터명

**응답**: 캐릭터의 프로필 정보 요약

#### 2. 캐릭터 기본 능력치
```
GET /armories/characters/{characterName}/profiles
```

**응답**: 캐릭터의 기본 능력치 요약

#### 3. 캐릭터 장비 정보
```
GET /armories/characters/{characterName}/equipment
```

**응답**: 캐릭터의 장착된 아이템 요약

#### 4. 캐릭터 아바타 정보
```
GET /armories/characters/{characterName}/avatars
```

**응답**: 캐릭터의 장착된 아바타 요약

#### 5. 캐릭터 전투 스킬
```
GET /armories/characters/{characterName}/combat-skills
```

**응답**: 캐릭터의 전투 스킬 요약

#### 6. 캐릭터 각인 정보
```
GET /armories/characters/{characterName}/engravings
```

**응답**: 캐릭터의 장착된 각인서

#### 7. 캐릭터 카드 정보
```
GET /armories/characters/{characterName}/cards
```

**응답**: 캐릭터의 장착된 카드

#### 8. 캐릭터 보석 정보
```
GET /armories/characters/{characterName}/gems
```

**응답**: 캐릭터의 장착된 보석

#### 9. 캐릭터 증명의 전장 정보
```
GET /armories/characters/{characterName}/colosseums
```

**응답**: 캐릭터의 증명의 전장 정보

#### 10. 캐릭터 수집품 정보
```
GET /armories/characters/{characterName}/collectibles
```

**응답**: 캐릭터의 수집품 정보

---

## 🏪 AUCTIONS API

### 경매장 검색

#### 1. 경매장 검색 옵션
```
GET /auctions/options
```

**응답**: 경매장 검색에 사용할 수 있는 옵션들

#### 2. 경매장 아이템 검색
```
POST /auctions/items
```

**요청 본문**:
```json
{
  "CategoryCode": 210000,
  "Sort": "BUY_PRICE",
  "SortCondition": "ASC",
  "ItemName": "검색할 아이템명",
  "PageNo": 0
}
```

**응답**: 검색된 경매장 아이템 목록

---

## 🛒 MARKETS API

### 시장 정보

#### 1. 시장 검색 옵션
```
GET /markets/options
```

**응답**: 시장 검색에 사용할 수 있는 옵션들

#### 2. 아이템 ID로 시장 정보 조회
```
GET /markets/items/{itemId}
```

**파라미터**:
- `itemId`: 아이템 ID

**응답**: 해당 아이템의 시장 정보

#### 3. 시장 아이템 검색
```
POST /markets/items
```

**요청 본문**: 검색 조건

**응답**: 검색된 시장 아이템 목록

---

## 🎮 GAMECONTENTS API

### 게임 콘텐츠 정보

#### 1. 도비스 던전 목록
```
GET /gamecontents/challenge-abyss-dungeons
```

**응답**: 이번 주 도비스 던전 목록

#### 2. 도가토 목록
```
GET /gamecontents/challenge-guardian-raids
```

**응답**: 이번 주 도가토 목록

#### 3. 주간 콘텐츠 달력
```
GET /gamecontents/calendar
```

**응답**: 이번 주 콘텐츠 달력 (프로키온의 나침반 등)

---

## 🏆 GUILDS API

### 길드 정보

#### 1. 길드 순위
```
GET /guilds/rankings
```

**파라미터**:
- `serverName`: 서버명 (예: "루페온", "실리안", "아만" 등)

**응답**: 해당 서버의 길드 순위

---

## 🔧 공통 설정

### 인증
```
Authorization: bearer {JWT_TOKEN}
```

### Rate Limiting 헤더
- `X-RateLimit-Limit`: 분당 최대 요청 수
- `X-RateLimit-Remaining`: 남은 요청 수
- `X-RateLimit-Reset`: 다음 할당량 갱신 시간 (epoch)

### 에러 코드
- `401`: API 키 오류
- `403`: 권한 문제
- `429`: Rate Limit 초과
- `500`: 서버 오류
- `503`: 점검 중

---

## 📊 데이터 크기 예상

### 작은 데이터 (1-10KB)
- 캐릭터 기본 정보
- 공지사항 목록
- 이벤트 목록
- 길드 순위

### 중간 데이터 (10-100KB)
- 캐릭터 장비 정보
- 캐릭터 각인 정보
- 캐릭터 보석 정보
- 경매장 검색 결과 (제한된 수)

### 큰 데이터 (100KB-1MB+)
- 캐릭터 수집품 정보
- 경매장 대량 검색 결과
- 시장 대량 검색 결과
- 게임 콘텐츠 달력

---

## 🚀 구현 우선순위

### Phase 1: 핵심 API
1. **ARMORIES** - 캐릭터 상세 정보 (가장 많이 사용)
2. **CHARACTERS** - 캐릭터 기본 정보
3. **AUCTIONS** - 경매장 검색

### Phase 2: 보조 API
4. **NEWS** - 공지사항, 이벤트
5. **GAMECONTENTS** - 게임 콘텐츠
6. **MARKETS** - 시장 정보

### Phase 3: 확장 API
7. **GUILDS** - 길드 정보

---

## 📝 참고사항

- 모든 API는 JWT 토큰 인증이 필요합니다
- Rate Limit은 100 requests/minute입니다
- 응답 데이터는 JSON 형식입니다
- 일부 API는 null 값을 반환할 수 있습니다
- API 버전 변경 시 하위 호환성을 고려해야 합니다
