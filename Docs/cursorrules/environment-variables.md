# 환경변수 관련 커서룰

## 📋 개요

이 문서는 `.cursorrules`의 환경변수 관련 영어 지침을 한국어로 번역한 것입니다. 환경변수의 보안, 관리, 문서화에 관한 모든 규칙을 포함합니다.

## 🔐 보안/환경변수 규칙

### [ENV_PROTECTION] 환경변수 보호
- `.env` 파일 생성/수정/덮어쓰기 금지
- 환경변수 생성/수정/덮어쓰기 금지 (API 키, 비밀번호, 데이터베이스 설정 등)

### [SENSITIVE_APPROVAL] 민감 정보 승인
- 민감 정보 변경 시 반드시 사용자 명시적 승인 필요
- 보안 관련 설정 변경 시 변경 사항과 영향 범위 명시 후 승인 요청

### [ENV_GUIDANCE] 환경변수 가이드
- 환경변수 관련 문제 해결 시 수정 방안만 제시, 직접 수정 금지
- 하드코딩된 비밀값 발견 시 즉시 사용자에게 보고

## 📝 환경변수 문서화 규칙

### [SINGLE_SOURCE_OF_TRUTH] 단일 진실 원칙
- 환경변수 정보는 `.env.example` 파일에만 상세 문서화
- 다른 모든 문서에서는 참조 링크만 사용

### [NO_DUPLICATION] 중복 금지
- `Docs/` 문서에서 환경변수 상세 설명 작성 금지
- `configuration.md` 등에서 환경변수 목록 복사 금지

### [REFERENCE_ONLY] 참조 우선
- 문서에서는 `[.env.example](../.env.example)` 참조만 허용
- 실제 환경변수 값이나 설명은 `.env.example`에만 작성

### [MAINTENANCE_FIRST] 유지보수 우선
- 환경변수 추가/변경 시 `.env.example`만 수정
- `.env.example` 변경 후 관련 문서 참조 링크 업데이트

### [COMMENT_CENTRAL] 주석 중심
- 환경변수 설명은 주석 형태로 `.env.example` 내에 집중
- 문서 간 환경변수 정보 동기화 금지

## 🔧 환경변수 문서 편집 프로토콜

### [ENV_ADDITION] 환경변수 추가 시
- `.env.example`만 수정
- `Docs/` 문서 중복 작성 금지

### [ENV_CHANGE] 환경변수 변경 시
- `.env.example` 수정 후 관련 문서 참조 링크 확인
- 동기화 방지: `.env.example`과 문서 간 환경변수 정보 동기화 금지

### [DOC_WRITING] 문서 작성 시
- 환경변수 설명 발견 시 `.env.example` 참조로 변경
- 유지보수 효율성: 환경변수 변경 시 한 곳만 수정하도록 설계

### [DUPLICATION_DETECTION] 중복 감지 시
- 즉시 원본(`.env.example`)으로 통합
- 중복 제거

### [VERIFICATION_REQUIRED] 검증 필수
- 환경변수 정보가 단일 소스(`.env.example`)에만 존재하는지 확인

## 📋 검증 체크리스트

### [ENV_DUPLICATION_CHECK] 환경변수 중복 검사
- 환경변수 정보가 `.env.example` 외 다른 문서에 중복되지 않았는지 확인
- 단일 진실 원칙이 환경변수 문서화에 적용되었는지 확인

### [ENV_REFERENCE_CHECK] 환경변수 참조 검사
- 환경변수 관련 문서가 참조 링크로만 연결되어 있는지 확인
- 새 환경변수 추가 시 `Docs/` 문서에 상세 설명을 작성하지 않았는지 확인

## 🎯 적용 예시

### ✅ 올바른 예시

```markdown
## 환경변수 설정
환경변수 설정은 [.env.example](../.env.example) 파일을 참조하세요.
상세 설정 가이드는 [설정 가이드](../configuration.md#environment-variables)를 참조하세요.
```

### ❌ 잘못된 예시

```markdown
## 환경변수 설정
LOSTARK_API_KEY=your_api_key_here
REST_API_PORT=3000
UDP_GATEWAY_PORT=3001
```

## 🔗 관련 문서

- [.env.example](../../.env.example) - 환경변수 템플릿 (단일 진실 원본)
- [설정 가이드](../configuration.md) - 환경변수 설정 방법
- [개발 가이드](../development-guide.md) - 환경변수 로딩 방식

## 📝 변경 이력

- **2025-01-27**: 초기 문서 생성
- **v1.0.4**: 환경변수 문서화 중복 방지 규칙 추가

---

**참고**: 이 문서는 `.cursorrules`의 `ENVIRONMENT VARIABLE DOCUMENTATION RULES` 섹션과 동기화되어야 합니다.
