# Lost Ark API V9.0.0 Documentation

> **참조**:
> [Lost Ark API Documentation](https://developer-lostark.game.onstove.com/getting-started)
>
> **현재 버전**: V9.0.0 (최신)
>
> **@cursor-change**: 2025-01-27, v2.0.0, 문서 구조 통합 및 정리

## 📋 개요

로스트아크 공식 API V9.0.0은 다음과 같은 카테고리로 구성됩니다:

- **NEWS**: 공지사항, 이벤트 정보
- **CHARACTERS**: 캐릭터 기본 정보 (siblings)
- **ARMORIES**: 캐릭터 상세 정보 (장비, 각인, 보석 등)
- **AUCTIONS**: 경매장 검색
- **MARKETS**: 시장 정보
- **GAMECONTENTS**: 게임 콘텐츠 정보

## 📚 문서 구조

### **📖 [API Reference](./api-reference.md)**

- 모든 API 엔드포인트 목록
- 파라미터, 응답 형식
- Rate Limit 및 에러 코드
- 데이터 크기 분석

### **🛠️ [Implementation Guide](./implementation-guide.md)**

- 구현 우선순위 및 작업 현황
- 아키텍처 설계 및 ETL 파이프라인
- 데이터 모델 및 스코프 분리
- 성능 요구사항 및 수용 기준

### **⚡ [Caching Strategies](./caching-strategies.md)**

- ARMORIES API 캐싱 전략
- CHARACTERS API 캐싱 전략
- 공통 캐싱 패턴 및 최적화
- 성능 모니터링 및 메트릭

### **📊 [Sample Data](./sample-data/)**

- 실제 API 응답 샘플 데이터
- 테스트용 캐릭터 정보
- 데이터 크기 분석 결과

## 🚀 빠른 시작

### **1. API 인증 설정**

```bash
# .env 파일에 API 키 설정
LOSTARK_API_KEY=your_jwt_token_here
```

### **2. 기본 API 호출**

```typescript
// 캐릭터 siblings 조회
GET / characters / { characterName } / siblings;

// 캐릭터 전체 정보 조회
GET / armories / characters / { characterName };
```

### **3. Rate Limit 관리**

- **제한**: 100 requests/minute
- **모니터링**: `X-RateLimit-*` 헤더 확인

## 🔧 공통 설정

### **인증**

```
Authorization: bearer {JWT_TOKEN}
```

### **Rate Limiting 헤더**

- `X-RateLimit-Limit`: 분당 최대 요청 수
- `X-RateLimit-Remaining`: 남은 요청 수
- `X-RateLimit-Reset`: 다음 할당량 갱신 시간 (epoch)

### **에러 코드**

- `401`: API 키 오류
- `403`: 권한 문제
- `429`: Rate Limit 초과
- `500`: 서버 오류
- `503`: 점검 중

## 📊 구현 현황

### **문서화**: ✅ 완료 (100%)

- API 엔드포인트 문서화 완료
- 캐싱 전략 문서화 완료
- 구현 가이드 문서화 완료

### **캐싱 전략**: 🟡 부분 완료 (33%)

- ✅ ARMORIES API 캐싱 전략
- ✅ CHARACTERS API 캐싱 전략
- ⏳ AUCTIONS API 캐싱 전략 (대기)
- ⏳ MARKETS API 캐싱 전략 (대기)
- ⏳ NEWS API 캐싱 전략 (대기)
- ⏳ GAMECONTENTS API 캐싱 전략 (대기)

### **구현**: ⏳ 대기 (0%)

- ⏳ ARMORIES API 구현 (Phase 1)
- ⏳ CHARACTERS API 구현 (Phase 1)
- ⏳ AUCTIONS API 구현 (Phase 1)
- ⏳ NEWS API 구현 (Phase 2)
- ⏳ GAMECONTENTS API 구현 (Phase 2)
- ⏳ MARKETS API 구현 (Phase 2)

### **테스트**: ⏳ 대기 (0%)

- 모든 API 구현 후 진행 예정

## 🎯 구현 우선순위

### **Phase 1: 핵심 API (2-3주)**

1. **ARMORIES** - 캐릭터 상세 정보 (가장 많이 사용)
2. **CHARACTERS** - 캐릭터 기본 정보
3. **AUCTIONS** - 경매장 검색

### **Phase 2: 보조 API (2-3주)**

4. **NEWS** - 공지사항, 이벤트
5. **GAMECONTENTS** - 게임 콘텐츠
6. **MARKETS** - 시장 정보

## 📁 프로젝트 구조

```
packages/
├── shared/                    # 공통 타입 및 설정
│   └── src/types/V9/         # API 응답 타입 정의
├── data-service/             # 데이터 수집 및 정규화
├── rest-service/             # REST API 서비스
└── udp-service/              # UDP Gateway 서비스

tests/
├── api/lostark-api/V9.0.0/   # API 테스트
└── common/                   # 공통 테스트 유틸

Docs/lostark-api/V9.0.0/      # API 문서
├── README.md                 # 이 파일
├── api-reference.md          # API 참조
├── implementation-guide.md   # 구현 가이드
├── caching-strategies.md     # 캐싱 전략
└── sample-data/              # 샘플 데이터
```

## 📝 참고사항

- 모든 API는 JWT 토큰 인증이 필요합니다
- Rate Limit은 100 requests/minute입니다
- 응답 데이터는 JSON 형식입니다
- 일부 API는 null 값을 반환할 수 있습니다
- API 버전 변경 시 하위 호환성을 고려해야 합니다

---

**문서 버전**: 2.0.0  
**최종 업데이트**: 2025-01-27  
**@cursor-change**: 2025-01-27, v2.0.0, 문서 구조 통합 및 정리
