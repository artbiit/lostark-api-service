# Lost Ark API V9.0.0 - REST Service API 참조

> **@cursor-change**: 2025-01-27, v1.1.0, REST Service 완성 상태 반영

## 📋 개요

Lost Ark API V9.0.0을 기반으로 한 REST Service의 모든 엔드포인트 문서입니다.

### 기본 정보
- **Base URL**: `http://localhost:3000` (기본값)
- **Content-Type**: `application/json`
- **인증**: API Key (헤더에 `Authorization: Bearer {API_KEY}`)

### 응답 형식
모든 API 응답은 다음과 같은 기본 형식을 따릅니다:

```json
{
  "success": true,
  "data": { /* 실제 데이터 */ },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 150
}
```

### 에러 응답
```json
{
  "error": "Error Type",
  "message": "에러 메시지",
  "responseTime": 50
}
```

---

## 🔍 헬스 체크

### GET /health
서버 상태 및 캐시 레이어 상태를 확인합니다.

**응답 예시:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "cache": {
    "memory": "connected",
    "redis": "connected",
    "database": "connected"
  }
}
```

---

## 📊 캐시 관리

### GET /cache/status
캐시 통계 및 최적화 정보를 조회합니다.

**응답 예시:**
```json
{
  "cache": {
    "memory": {
      "hitCount": 150,
      "missCount": 25,
      "hitRate": 0.857
    },
    "redis": {
      "hitCount": 80,
      "missCount": 15,
      "hitRate": 0.842
    },
    "database": {
      "hitCount": 30,
      "missCount": 5,
      "hitRate": 0.857
    }
  },
  "optimization": {
    "lastRun": "2025-01-27T10:25:00.000Z",
    "itemsOptimized": 15
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### POST /cache/optimize
캐시 최적화를 실행합니다.

**응답 예시:**
```json
{
  "success": true,
  "optimization": {
    "timestamp": "2025-01-27T10:30:00.000Z",
    "itemsOptimized": 12,
    "memoryFreed": "2.5MB"
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### DELETE /cache/characters/{characterName}
특정 캐릭터의 캐시를 삭제합니다.

**응답 예시:**
```json
{
  "success": true,
  "message": "Cache for character '테스트캐릭터1' deleted successfully",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

---

## 👤 캐릭터 API

### GET /characters/{characterName}
캐릭터 상세 정보를 조회합니다.

**경로 파라미터:**
- `characterName` (string): 캐릭터 이름

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "character": {
      "name": "테스트캐릭터1",
      "level": 60,
      "class": "버서커",
      "itemLevel": 1620.5,
      "server": "카마인"
    },
    "equipment": [/* 장비 정보 */],
    "engravings": [/* 각인 정보 */],
    "skills": [/* 스킬 정보 */]
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 150
}
```

### POST /characters/{characterName}/refresh
캐릭터 정보를 강제로 새로고침합니다.

**응답 예시:**
```json
{
  "success": true,
  "data": { /* 캐릭터 정보 */ },
  "cache": {
    "hit": false,
    "source": "api"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 1200
}
```

---

## 🛒 경매장 API

### GET /auctions/search
경매장 아이템을 검색합니다.

**쿼리 파라미터:**
- `itemName` (string, optional): 아이템 이름
- `categoryCode` (number, optional): 카테고리 코드
- `itemTier` (string, optional): 아이템 티어
- `itemGrade` (string, optional): 아이템 등급
- `itemLevel` (string, optional): 아이템 레벨
- `skillOption` (string, optional): 스킬 옵션
- `engravingName` (string, optional): 각인 이름
- `pageNo` (string, optional): 페이지 번호 (기본값: 1)
- `sort` (string, optional): 정렬 기준
- `refresh` (string, optional): 강제 새로고침 ("true")

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 12345,
        "name": "파괴석",
        "icon": "icon_url",
        "grade": "고급",
        "tier": 3,
        "level": 1,
        "auctionInfo": {
          "startPrice": 1000,
          "buyPrice": 1200,
          "bidPrice": 1100,
          "endDate": "2025-01-28T10:30:00.000Z",
          "bidCount": 5,
          "bidStartPrice": 1000,
          "isCompetitive": true,
          "tradeAllowCount": 1
        },
        "options": [/* 옵션 정보 */],
        "normalizedAt": "2025-01-27T10:30:00.000Z"
      }
    ],
    "totalCount": 150,
    "pageNo": 1,
    "pageSize": 20,
    "normalizedAt": "2025-01-27T10:30:00.000Z"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 300
}
```

### POST /auctions/search/refresh
경매장 검색 결과를 강제로 새로고침합니다.

**요청 본문:**
```json
{
  "itemName": "파괴석",
  "categoryCode": 0,
  "itemTier": "3",
  "itemGrade": "고급",
  "pageNo": 1,
  "sort": "BUY_PRICE"
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": { /* 검색 결과 */ },
  "cache": {
    "hit": false,
    "source": "api"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 400
}
```

---

## 📰 공지사항 API

### GET /news
공지사항 또는 이벤트 목록을 조회합니다.

**쿼리 파라미터:**
- `type` (string, optional): "notices" 또는 "events" (기본값: "notices")
- `pageNo` (string, optional): 페이지 번호
- `refresh` (string, optional): 강제 새로고침 ("true")

**응답 예시 (공지사항):**
```json
{
  "success": true,
  "data": {
    "notices": [
      {
        "title": "서버 점검 안내",
        "date": "2025-01-27T10:30:00.000Z",
        "link": "https://lostark.com/notice/123",
        "type": "점검"
      }
    ],
    "totalCount": 50,
    "pageNo": 1,
    "pageSize": 20,
    "normalizedAt": "2025-01-27T10:30:00.000Z"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 200
}
```

**응답 예시 (이벤트):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "title": "신규 이벤트",
        "thumbnail": "thumbnail_url",
        "link": "https://lostark.com/event/456",
        "startDate": "2025-01-27T10:30:00.000Z",
        "endDate": "2025-02-27T10:30:00.000Z",
        "rewardDate": "2025-02-28T10:30:00.000Z",
        "rewardItems": [
          {
            "name": "보상 아이템",
            "icon": "icon_url",
            "grade": "고급"
          }
        ]
      }
    ],
    "totalCount": 10,
    "normalizedAt": "2025-01-27T10:30:00.000Z"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 180
}
```

### POST /news/refresh
공지사항을 강제로 새로고침합니다.

**쿼리 파라미터:**
- `type` (string, optional): "notices" 또는 "events"

**응답 예시:**
```json
{
  "success": true,
  "data": { /* 공지사항/이벤트 데이터 */ },
  "cache": {
    "hit": false,
    "source": "api"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 250
}
```

---

## 🎮 게임 콘텐츠 API

### GET /game-contents
주간 콘텐츠 달력을 조회합니다.

**쿼리 파라미터:**
- `refresh` (string, optional): 강제 새로고침 ("true")

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "name": "카오스 던전",
      "categoryName": "일일 콘텐츠",
      "startTimes": ["2025-01-27T10:00:00.000Z", "2025-01-27T18:00:00.000Z"],
      "endTimes": ["2025-01-27T11:00:00.000Z", "2025-01-27T19:00:00.000Z"],
      "minItemLevel": 1302,
      "maxItemLevel": 9999,
      "rewards": [/* 보상 정보 */]
    }
  ],
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 150
}
```

### POST /game-contents/refresh
게임 콘텐츠 정보를 강제로 새로고침합니다.

**응답 예시:**
```json
{
  "success": true,
  "data": [/* 게임 콘텐츠 데이터 */],
  "cache": {
    "hit": false,
    "source": "api"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 200
}
```

---

## 🏪 시장 API

### GET /markets
아이템 ID로 시장 정보를 조회합니다.

**쿼리 파라미터:**
- `itemIds` (string, required): 콤마로 구분된 아이템 ID 목록
- `refresh` (string, optional): 강제 새로고침 ("true")

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "item": {
        "id": 66110223,
        "name": "파괴석",
        "icon": "icon_url",
        "grade": "고급",
        "tier": 3,
        "level": 1,
        "marketInfo": {
          "currentMinPrice": 1200,
          "currentMaxPrice": 1500,
          "avgPrice": 1350,
          "tradeCount": 150,
          "lastUpdateTime": "2025-01-27T10:30:00.000Z"
        },
        "options": [/* 옵션 정보 */],
        "normalizedAt": "2025-01-27T10:30:00.000Z"
      }
    }
  ],
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 250
}
```

### POST /markets/refresh
시장 정보를 강제로 새로고침합니다.

**요청 본문:**
```json
{
  "itemIds": [66110223, 66110224]
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": [/* 시장 데이터 */],
  "cache": {
    "hit": false,
    "source": "api"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "responseTime": 300
}
```

---

## 📈 성능 지표

### 응답 시간 목표
- **헬스 체크**: ≤ 50ms
- **캐시 상태**: ≤ 100ms
- **캐릭터 정보 (캐시 히트)**: ≤ 200ms
- **공지사항**: ≤ 300ms
- **시장 정보**: ≤ 400ms
- **경매장 검색**: ≤ 500ms
- **캐릭터 정보 (API 호출)**: ≤ 2000ms

### 캐시 성능
- **Memory Cache**: 초기 응답
- **Redis Cache**: 중간 지속성
- **Database Cache**: 장기 지속성

### 동시 요청 처리
- **헬스 체크**: 10개 동시 요청 ≤ 1초
- **일반 API**: 5개 동시 요청 ≤ 2초
- **부하 테스트**: 20개 버스트 요청 ≤ 2초

---

## 🔧 에러 코드

| HTTP 상태 코드 | 에러 타입 | 설명 |
|---------------|-----------|------|
| 400 | Bad Request | 잘못된 요청 파라미터 |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 429 | Too Many Requests | 요청 한도 초과 |
| 500 | Internal Server Error | 서버 내부 오류 |
| 503 | Service Unavailable | 서비스 일시적 사용 불가 |

---

## 📝 변경 이력

- **v1.1.0** (2025-01-27): REST Service 완성, 모든 API 엔드포인트 구현
- **v1.0.0** (2025-01-27): 초기 API 참조 문서 생성

**@cursor-change**: 2025-01-27, v1.1.0, REST Service 완성 상태 반영
