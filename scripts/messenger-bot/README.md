---
title: 메신저봇R 클라이언트 스크립트 (remote-kakao)
purpose: 안드로이드 기기에서 동작하는 카카오톡 알림 후킹 UDP 브리지
deploy_target: msgbot (com.xfl.msgbot) 런타임
---

# remote-kakao 클라이언트 스크립트

이 디렉토리는 안드로이드 **메신저봇R** (msgbot, `com.xfl.msgbot`) 런타임에서
동작하는 카카오톡 알림 후킹 + UDP 브리지 스크립트를 관리한다.

서버 측은 `packages/udp-service` (UDP gateway, 기본 port `5022`).
이 스크립트가 카카오톡 알림을 잡아 `{event:'message', data, session}` envelope
으로 UDP 전송 → 서버가 명령 라우팅 후 `{event:'reply:<session>', data}` 로
응답하면, 스크립트가 `bot.send` 로 톡방에 회신한다.

## 파일 구성

| 파일 | git | 용도 |
| --- | --- | --- |
| `remote-kakao.template.js` | 커밋 | placeholder 버전. 원본 코드 + `__SERVER_HOST__`, `__SERVER_PORT__` |
| `remote-kakao.js`          | **.gitignore** | 실값 치환된 로컬 사본. 안드로이드 기기에 복사하는 실제 파일 |
| `README.md`                | 커밋 | 이 문서 |

> public 레포라 내부 LAN IP/포트는 `remote-kakao.js` 에만 들어 있고 커밋되지
> 않는다. 절대 `git add scripts/messenger-bot/remote-kakao.js` 금지.

## Setup (최초 1회)

PowerShell 7+ 기준. cwd 는 레포 루트.

```powershell
# 1. 템플릿 → 로컬 사본 생성 (실값 치환)
$src = Get-Content -Raw -Path "scripts/messenger-bot/remote-kakao.template.js"
$out = $src.Replace('__SERVER_HOST__', '192.168.0.2').Replace('__SERVER_PORT__', '5022').Replace('__SENDER_NAME__', '이정수')
Set-Content -Path "scripts/messenger-bot/remote-kakao.js" -Value $out -NoNewline -Encoding utf8

# 2. gitignore 확인 (있어야 함)
Select-String -Path .gitignore -Pattern "scripts/messenger-bot/remote-kakao.js"
```

`__SERVER_HOST__` 는 본 레포 docker 호스트의 LAN IP. 환경별로 다르다.
`__SERVER_PORT__` 는 `packages/shared/src/config/env.ts` 의 `UDP_GATEWAY_PORT`
기본값 `5022` 와 맞춘다.
`__SENDER_NAME__` 은 카카오톡에서 표시되는 본인 이름 (예: `이정수`). 복수 지정 시 `config.allowedSenders` 배열을 직접 편집.

## 안드로이드 기기 배포

1. 본 레포가 도는 PC 와 안드로이드 기기를 **같은 LAN/WiFi** 에 둔다.
2. PC 에서 서버 기동 (Docker compose 또는 직접 `yarn workspace @lostark/udp-gateway start`).
   - 방화벽이 `5022/udp` 인바운드를 막지 않는지 확인 (Windows Defender 인바운드
     규칙).
3. 안드로이드 기기에 msgbot 설치 후 `remote-kakao.js` 본문을 새 스크립트로
   붙여넣기 (스크립트 이름: `remote-kakao`).
4. 알림 접근 권한 / 배터리 최적화 제외 / WakeLock 권한 부여.
5. 스크립트 컴파일 → ON. 카카오톡 방에서 `!도움말` 등 명령 전송.

## 동작 게이트

두 가지 사용자 화이트리스트가 있다 (실수 트리거 방지):

- `config.allowedSenders` 에 있는 발신자 이름 (카카오톡 표시 이름)
- 또는 방 이름이 `◆+!` 로 시작하는 경우

`allowedSenders` 는 `__SENDER_NAME__` placeholder 를 통해 Setup 시 치환한다.
테스트 톡방 이름을 `◆+!` 로 시작시키면 누구든 명령 가능.

## 연결 확인 (서버 → 클라이언트 왕복)

서버 기동 후 안드로이드에서 `!도움말` 같은 명령을 보내면 서버 로그에:

```
UDP server listening { address: "0.0.0.0:5022" }
```

가 떠 있어야 하고, 톡방에 명령 응답이 도착해야 한다. 응답이 안 오면:

1. PC ↔ 폰 동일 LAN 확인 (`ping 192.168.0.2` 가 폰에서 동작하는지)
2. PC 방화벽 인바운드 `5022/udp` 허용
3. `packages/udp-service/src/server.ts` 로그에서 `Message too large` /
   `Unknown envelope` warn 검색
4. 메신저봇R 로그에서 `java.net.SocketException` 등 확인

## 원본 코드 변경 금지 원칙

`remote-kakao.template.js` 는 가급적 원본을 그대로 유지한다 (메신저봇R 의
타이밍/스레딩 동작 보장). 수정 가능한 부분은 다음만:

- `config.address` / `config.port` (placeholder)
- `onMessage` 의 사용자 화이트리스트 (필요 시)
- 신규 event case (서버 측 envelope 확장 시 동기 변경)
