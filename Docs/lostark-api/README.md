# Lost Ark API Documentation

> **참조**:
> [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/getting-started)
>
> **최신 버전**: V9.0.0 (2025년 1월 기준)

## 📋 개요

이 디렉토리에는 로스트아크 공식 API의 버전별 문서와 타입 정의가 포함되어
있습니다.

## 📁 버전별 문서

### V9.0.0 (현재 최신)

- **상태**: 최신 버전
- **조사 날짜**: 2025-01-15
- **문서**: [V9.0.0/README.md](./V9.0.0/README.md)
- **API 엔드포인트**: [V9.0.0/api-endpoints.md](./V9.0.0/api-endpoints.md)
- **세팅 데이터 지침**:
  [V9.0.0/build-data-guidelines.md](./V9.0.0/build-data-guidelines.md)
- **샘플 데이터**: [V9.0.0/sample-data/](./V9.0.0/sample-data/)
- **타입 정의**:
  [packages/shared/src/types/V9/](../../packages/shared/src/types/V9/)

## 🔄 버전 관리 정책

### 새 버전 출시 시

1. 기존 최신 버전 디렉토리를 복사하여 새 버전 디렉토리 생성
2. 타입 정의 업데이트 (`packages/shared/src/types/V{버전}/`에서 새 필드 추가,
   제거된 필드 삭제 등)
3. 샘플 데이터 재수집
4. 변경사항 문서화
5. 이 README.md 파일 업데이트

### 예시 (V10.0.0 출시 시)

```bash
# 1. 새 버전 디렉토리 생성
cp -r V9.0.0 V10.0.0

# 2. 타입 정의 업데이트
# packages/shared/src/types/V10/ 디렉토리에서 타입 수정

# 3. 샘플 데이터 재수집
# tests/api/lostark-api/V10.0.0/api.test.mjs 실행하여 새 데이터 수집

# 4. 문서 업데이트
# V10.0.0/README.md 수정
```

## 📊 API 카테고리

로스트아크 API는 다음과 같은 카테고리로 구성됩니다:

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
