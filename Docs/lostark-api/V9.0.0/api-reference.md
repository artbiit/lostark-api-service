# Lost Ark API Reference

> **참조**:
> [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/getting-started)
>
> **버전**: V9.0.0
>
> **@cursor-change**: 2025-01-27, v1.0.0, API 참조 문서 생성

## 📋 개요

로스트아크 공식 API V9.0.0의 모든 엔드포인트에 대한 기술적 참조 문서입니다.

**Rate Limit**: 100 requests/minute

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

#### 1. 캐릭터 전체 정보

```
GET /armories/characters/{characterName}
```

**파라미터**:

- `characterName`: 캐릭터명

**응답**: 캐릭터의 모든 상세 정보 (프로필, 장비, 각인, 카드, 보석, 전투 스킬,
아바타, 증명의 전장, 수집품)

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

#### 1. 주간 콘텐츠 달력

```
GET /gamecontents/calendar
```

**응답**: 이번 주 콘텐츠 달력 (프로키온의 나침반 등)

> **⚠️ 주의**: 도비스 던전과 도가토 API는 더 이상 사용되지 않습니다.

---

## 🏆 GUILDS API

### 길드 정보

> **⚠️ 주의**: 길드 API는 더 이상 사용되지 않습니다.

#### 1. 길드 순위 (사용 불가)

```
GET /guilds/rankings
```

**파라미터**:

- `serverName`: 서버명 (예: "루페온", "실리안", "아만" 등)

**응답**: 해당 서버의 길드 순위

> **상태**: 302 리다이렉트로 `/notfound`로 이동하여 사용 불가

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

## 📊 데이터 크기 분석

### 작은 데이터 (1-10KB)

- 캐릭터 기본 정보
- 공지사항 목록 (11.73KB)
- 이벤트 목록 (5.11KB)
- 캐릭터 형제 정보 (1.38KB)
- 경매장 아이템 검색 (5.51KB)

### 중간 데이터 (10-100KB)

- 캐릭터 장비 정보 (76.63KB)
- 캐릭터 보석 정보 (81.18KB)
- 경매장 검색 옵션 (147.69KB)

### 큰 데이터 (100KB-1MB+)

- 캐릭터 수집품 정보 (28.12KB)
- 캐릭터 전투 스킬 (150.22KB)
- 주간 콘텐츠 달력 (419.75KB)
- 전체 ARMORIES 응답 (411.40KB)

---

## 📝 참고사항

- 모든 API는 JWT 토큰 인증이 필요합니다
- Rate Limit은 100 requests/minute입니다
- 응답 데이터는 JSON 형식입니다
- 일부 API는 null 값을 반환할 수 있습니다
- API 버전 변경 시 하위 호환성을 고려해야 합니다

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2025-01-27  
**@cursor-change**: 2025-01-27, v1.0.0, API 참조 문서 생성
