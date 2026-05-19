# macOS + Cloudflare WARP — 컨테이너 TLS 인터셉트 우회

호스트 macOS 에 Cloudflare WARP / Zero Trust 클라이언트가 활성화돼 있으면 모든
HTTPS 트래픽을 WARP 게이트웨이가 가로채고 `Gateway CA - Cloudflare Managed G1`
인증서로 재서명한다. 호스트 keychain 에는 그 CA 가 신뢰돼 있어 `curl` 등 호스트
명령은 정상 동작하지만, `lostark-rest` 컨테이너(Alpine) 의 ca-certificates 에는
그 CA 가 없으므로 외부 LostArk API (`developer-lostark.game.onstove.com`) 호출이
`certificate verify failed` 로 실패한다.

증상은 `/api/v1/news` 같이 외부 LostArk API 를 호출하는 라우트만 timeout 으로
망가지고 `/health` 는 정상이라는 형태로 나타난다.

## 우회 방식 비교

| 옵션                                 | 방식                                                              | 운영 영향                                          | 비고                                            |
| ------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| (a) WARP disconnect                  | 호스트에서 WARP 일시 중단 후 재기동                               | 없음                                               | 가장 깨끗. 사내망/접속 통제와 충돌하면 (b) 선택 |
| (b) Gateway CA mount                 | 호스트 keychain 의 CA 를 컨테이너에 mount + `NODE_EXTRA_CA_CERTS` | 운영 image 에는 새지 않음 (별도 compose 파일 분리) | 본 가이드                                       |
| (c) `NODE_TLS_REJECT_UNAUTHORIZED=0` | TLS 검증 비활성화                                                 | 보안 약화 — MITM 인증서를 무조건 신뢰              | 비추, 임시 조치만                               |

운영 서버에는 WARP 가 없으므로 본 결함이 발생하지 않는다. 본 우회는 **개발 머신
한정**이며 image 에 흔적을 남기지 않는다.

## 절차

### 1. Gateway CA 추출 (호스트 macOS)

```bash
mkdir -p .local-ca
security find-certificate -a -c 'Gateway CA - Cloudflare' -p \
  /Library/Keychains/System.keychain \
  > .local-ca/cloudflare-gateway.pem

# 검증 (1 개 인증서 + BEGIN/END 라인)
grep -c 'BEGIN CERTIFICATE' .local-ca/cloudflare-gateway.pem
```

`.local-ca/` 는 `.gitignore` 대상. 머신마다 추출이 달라질 수 있으므로 추적하지
않는다.

### 2. 명시적 dev-tls compose 로드

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f docker-compose.dev-tls.yml \
  up -d
```

매번 `-f` 세 개를 치기 부담스러우면 `.env` 에 `COMPOSE_FILE` 을 추가:

```env
COMPOSE_FILE=docker-compose.yml:docker-compose.override.yml:docker-compose.dev-tls.yml
```

이후엔 `docker compose up -d` 만으로 동일 효과. `.env` 는 git ignored 이므로
다른 머신에 영향 없음.

### 3. 검증

```bash
docker exec lostark-remote-kakao-lostark-rest-1 sh -c \
  "wget -q -O /dev/null --timeout=10 \
   https://developer-lostark.game.onstove.com/news/notices 2>&1; echo exit=\$?"
# wget 자체는 ca-certificates 만 보므로 여전히 실패 가능. Node fetch 는
# NODE_EXTRA_CA_CERTS 로 통과해야 한다.

curl -s "http://localhost:3000/api/v1/news?type=notices" | head -200
# 200 응답 + items 배열이 보이면 성공.
```

## 운영 image 와의 분리

- `docker-compose.override.yml` 은 자동 로드되므로 머신 한정 mount 를 절대 넣지
  않는다. WARP 가 없는 머신에서 `.local-ca/cloudflare-gateway.pem` 가 없을 때
  docker 가 빈 디렉토리로 만들면서 NODE_EXTRA_CA_CERTS 가 깨진다.
- 본 우회는 항상 별도 compose 파일(`docker-compose.dev-tls.yml`) 로 격리하고,
  사용자가 명시적으로 활성화해야 동작한다.
- 운영 서버는 WARP 가 없으므로 본 가이드의 어느 단계도 수행하지 않는다.

## 관련

- `docker-compose.dev-tls.yml` — 본 우회의 compose override
- `.gitignore` — `.local-ca/` 추적 차단 명시
- 호스트에서 Node 로 직접 실행할 때의 CA prefix 절차는
  [host-node-run](./host-node-run.md) 참조 (다른 결함, 동일 환경 패턴)
