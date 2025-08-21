# Lost Ark API V9.0.0 Documentation

> **참조**:
> [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/getting-started)
>
> **조사 날짜**: 2025-01-15
>
> **현재 상태**: 최신 버전 (2025년 1월 기준)

## 📋 개요

로스트아크 공식 API V9.0.0은 다음과 같은 카테고리로 구성됩니다:

- **NEWS**: 공지사항, 이벤트 정보
- **CHARACTERS**: 캐릭터 기본 정보
- **ARMORIES**: 캐릭터 상세 정보 (장비, 각인, 보석 등)
- **AUCTIONS**: 경매장 검색
- **MARKETS**: 시장 정보
- **GAMECONTENTS**: 게임 콘텐츠 정보

## 🔧 공통 설정

### 인증

```
Authorization: bearer {JWT_TOKEN}
```

### Rate Limiting

- **제한**: 100 requests/minute
- **헤더**:
  - `X-RateLimit-Limit`: 분당 최대 요청 수
  - `X-RateLimit-Remaining`: 남은 요청 수
  - `X-RateLimit-Reset`: 다음 할당량 갱신 시간 (epoch)

### 에러 코드

- `401`: API 키 오류
- `403`: 권한 문제
- `429`: Rate Limit 초과
- `500`: 서버 오류
- `503`: 점검 중

## 📊 테스트 데이터 구조 및 크기 분석

### API 테스트 데이터 구조 규칙

**🔑 Key-Value 구조**:

- **siblings API**: `{ "캐릭터명": [siblings_array] }` 객체 형태
- **각 스트리머별 실제 계정 캐릭터 목록 포함**
- **예시**:
  ```json
  {
    "이다": [
      {
        "ServerName": "루페온",
        "CharacterName": "이다",
        "CharacterLevel": 70,
        "CharacterClassName": "브레이커",
        "ItemAvgLevel": "1,760.00"
      }
      // ... 해당 계정의 다른 캐릭터들
    ],
    "쫀지": [
      // 쫀지 계정의 캐릭터들
    ]
  }
  ```

**📁 저장 위치**:

- 실제 API 응답: `cache/api-test-results/`
- 샘플 데이터: `Docs/lostark-api/V9.0.0/sample-data/`

실제 API 호출 결과를 바탕으로 한 데이터 크기 분석:

### 작은 데이터 (<10KB)

- 캐릭터 기본 정보
- 공지사항 목록 (11.73KB)
- 이벤트 목록 (5.11KB)
- 캐릭터 형제 정보 (1.38KB)
- 경매장 아이템 검색 (5.51KB)

### 중간 데이터 (10-100KB)

- 경매장 검색 옵션 (147.69KB)

### 큰 데이터 (>100KB)

- 주간 콘텐츠 달력 (419.75KB)

## 📁 문서 구조

```
V9.0.0/
├── README.md                    # 이 파일
├── api-endpoints.md             # 전체 API 엔드포인트 목록
├── build-data-guidelines.md     # 세팅 데이터 수집/저장 지침
└── sample-data/                 # 실제 API 응답 샘플
    ├── news/                    # 공지사항, 이벤트
    ├── characters/              # 캐릭터 정보
    ├── armories/                # 캐릭터 상세 정보
    ├── auctions/                # 경매장
    └── gamecontents/            # 게임 콘텐츠
```

**타입 정의**: `packages/shared/src/types/V9/` 디렉토리에 위치

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

## 📝 참고사항

- 모든 API는 JWT 토큰 인증이 필요합니다
- Rate Limit은 100 requests/minute입니다
- 응답 데이터는 JSON 형식입니다
- 일부 API는 null 값을 반환할 수 있습니다
- API 버전 변경 시 하위 호환성을 고려해야 합니다
