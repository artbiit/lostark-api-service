# ============================
# Lost Ark API Service - Multi-stage Dockerfile
# ============================
# @cursor-change: 2025-01-27, 1.0.0, 온보딩용 Docker 설정 추가

FROM node:22-alpine AS base

# 기본 설정
WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/data-service/package.json ./packages/data-service/
COPY packages/rest-service/package.json ./packages/rest-service/
COPY packages/udp-service/package.json ./packages/udp-service/

# 의존성 설치
RUN yarn install --frozen-lockfile

# 공통 파일 복사
COPY tsconfig*.json ./
COPY packages/shared ./packages/shared

# ============================
# 데이터 서비스 빌드
# ============================
FROM base AS data-service
COPY packages/data-service ./packages/data-service
RUN yarn workspace @lostark/fetch build

# ============================
# REST API 서비스 빌드
# ============================
FROM base AS rest-service
COPY packages/data-service ./packages/data-service
COPY packages/rest-service ./packages/rest-service
RUN yarn workspace @lostark/fetch build
RUN yarn workspace @lostark/rest-api build

# ============================
# UDP Gateway 서비스 빌드
# ============================
FROM base AS udp-service
COPY packages/data-service ./packages/data-service
COPY packages/udp-service ./packages/udp-service
RUN yarn workspace @lostark/fetch build
RUN yarn workspace @lostark/udp-gateway build

# ============================
# 프로덕션 이미지
# ============================
FROM node:22-alpine AS production

WORKDIR /app

# 필요한 파일만 복사
COPY --from=data-service /app/packages/data-service/dist ./packages/data-service/dist
COPY --from=data-service /app/packages/data-service/package.json ./packages/data-service/
COPY --from=rest-service /app/packages/rest-service/dist ./packages/rest-service/dist
COPY --from=rest-service /app/packages/rest-service/package.json ./packages/rest-service/
COPY --from=udp-service /app/packages/udp-service/dist ./packages/udp-service/dist
COPY --from=udp-service /app/packages/udp-service/package.json ./packages/udp-service/
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/shared/package.json ./packages/shared/
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')"

# 기본 명령어 (각 서비스에서 오버라이드)
CMD ["node", "--version"]