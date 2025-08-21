# Sample Data - V9.0.0

이 디렉토리에는 로스트아크 API V9.0.0의 실제 응답 샘플 데이터가 포함되어
있습니다.

## 📁 디렉토리 구조

```
sample-data/
├── README.md                    # 이 파일
├── news/                        # 공지사항 및 이벤트
│   ├── notices.json             # 공지사항 목록 (11.73KB)
│   └── events.json              # 이벤트 목록 (5.11KB)
├── characters/                  # 캐릭터 정보
│   └── siblings.json            # 스트리머별 siblings API 응답 (61.8KB)
├── auctions/                    # 경매장
│   ├── options.json             # 경매장 검색 옵션 (147.69KB)
│   └── items.json               # 경매장 아이템 검색 (5.51KB)
└── gamecontents/                # 게임 콘텐츠
    └── calendar.json            # 주간 콘텐츠 달력 (419.75KB)
```

## 📊 데이터 크기 요약

| API          | 파일          | 크기     | 설명                         |
| ------------ | ------------- | -------- | ---------------------------- |
| NEWS         | notices.json  | 11.73KB  | 공지사항 목록                |
| NEWS         | events.json   | 5.11KB   | 이벤트 목록                  |
| CHARACTERS   | siblings.json | 61.8KB   | 스트리머별 siblings API 응답 |
| AUCTIONS     | options.json  | 147.69KB | 경매장 검색 옵션             |
| AUCTIONS     | items.json    | 5.51KB   | 경매장 아이템 검색           |
| GAMECONTENTS | calendar.json | 419.75KB | 주간 콘텐츠 달력             |

## 🔍 데이터 수집 정보

- **수집 날짜**: 2025-01-15
- **API 버전**: V9.0.0
- **총 API 호출**: 11개
- **총 데이터 크기**: 651.62KB
- **평균 응답 크기**: 59.24KB

## 📝 참고사항

- 모든 데이터는 실제 API 호출 결과입니다
- 캐릭터 관련 API는 스트리머 대표 캐릭터로 siblings API를 호출하여 실제 계정
  정보를 수집했습니다
- 데이터 크기는 UTF-8 인코딩 기준입니다
- Rate Limit 정보도 함께 수집되었습니다
