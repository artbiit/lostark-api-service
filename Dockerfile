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
EXPOSE 3000 3001

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 실행
CMD ["yarn", "workspace", "@lostark/rest-api", "start"]
