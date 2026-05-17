# Lost Ark API Service Dockerfile
FROM node:22-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package.json yarn.lock .yarnrc.yml ./
COPY tsconfig.json tsconfig.base.json ./
COPY packages/ ./packages/

# Yarn 4 고정 및 의존성 설치 (node_modules linker)
ENV YARN_NODE_LINKER=node-modules
RUN corepack enable \
  && corepack prepare yarn@4.9.2 --activate \
  && yarn install --immutable

# 빌드
RUN yarn build

# 포트 노출
EXPOSE 3000 5022

# 헬스 체크
# alpine 기본 BusyBox wget 사용 (curl 미설치). UDP 워크스페이스로 기동된 컨테이너는
# 3000 포트가 없어 healthcheck 가 실패하므로 compose 측에서 `disable: true` 로 끈다.
# 127.0.0.1 명시: BusyBox wget 의 localhost 가 IPv6(::1) 우선이라 fastify(IPv4 0.0.0.0) 와 어긋남.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health > /dev/null 2>&1 || exit 1

# 실행
CMD ["yarn", "workspace", "@lostark/rest-api", "start"]
