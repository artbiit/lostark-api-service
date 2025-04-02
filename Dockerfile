FROM node:22.8.0-slim
# 앱 디렉터리 생성
WORKDIR /usr/src/app

# 타임존 설정 및 관련 패키지 설치
RUN apt-get update && apt-get install -y tzdata && \
    ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata


# 앱 의존성 설치
# 가능한 경우(npm@5+) package.json과 package-lock.json을 모두 복사하기 위해
# 와일드카드를 사용
COPY package*.json ./

RUN npm install
# 프로덕션을 위한 코드를 빌드하는 경우
# RUN npm ci --omit=dev
# 앱 소스 추가
COPY . .
EXPOSE 3000
CMD [ "node", "index.js" ]