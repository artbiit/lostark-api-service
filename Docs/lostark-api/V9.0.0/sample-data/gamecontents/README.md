# GAMECONTENTS API Sample Data

이 디렉토리에는 로스트아크 GAMECONTENTS API V9.0.0의 실제 응답 샘플 데이터가 포함되어 있습니다.

## 📁 파일 목록

| 파일명 | 크기 | 설명 | API 엔드포인트 |
|--------|------|------|----------------|
| calendar.json | 419.75KB | 주간 콘텐츠 달력 | `GET /gamecontents/calendar` |

## 📊 데이터 크기 분류

### 큰 데이터 (>100KB)
- **calendar.json** (419.75KB) - 주간 콘텐츠 달력

## 🔍 테스트 정보

- **테스트 날짜**: 2025-01-15
- **API 버전**: V9.0.0
- **총 데이터 크기**: 419.75KB

## ⚠️ 주의사항

### 더 이상 사용되지 않는 API
다음 API들은 더 이상 사용되지 않습니다:
- `GET /gamecontents/challenge-abyss-dungeons` - 도비스 던전 목록
- `GET /gamecontents/challenge-guardian-raids` - 도가토 목록

이유:
- API 엔드포인트가 변경되었거나 제거됨
- 302 리다이렉트로 `/notfound`로 이동
- 공식 API 문서에서 확인 필요

### 현재 사용 가능한 API
- `GET /gamecontents/calendar` - 주간 콘텐츠 달력 (정상 작동)

## 📝 참고사항

- 모든 데이터는 실제 API 호출 결과입니다
- 주간 콘텐츠 달력은 프로키온의 나침반 등 이번 주 콘텐츠 정보를 포함합니다
- 데이터 크기는 UTF-8 인코딩 기준입니다
- 실패한 API들은 추후 API 문서 확인 후 재테스트가 필요합니다
