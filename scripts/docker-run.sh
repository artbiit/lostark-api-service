#!/bin/bash

# ============================
# Lost Ark API Service - Docker 실행 스크립트
# ============================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 도움말 출력
show_help() {
    echo "Lost Ark API Service - Docker 실행 스크립트"
    echo ""
    echo "사용법:"
    echo "  $0 [옵션] [서비스...]"
    echo "  $0 [명령어]"
    echo ""
    echo "옵션:"
    echo "  -h, --help     이 도움말을 출력"
    echo "  -d, --detach   백그라운드에서 실행 (기본값)"
    echo "  -f, --foreground 포그라운드에서 실행 (로그 표시)"
    echo "  -b, --build    이미지 재빌드"
    echo "  -c, --clean    컨테이너와 볼륨 정리"
    echo "  -r, --restart  서비스 재시작"
    echo "  -R, --recreate down 후 up 자동 실행"
    echo ""
    echo "서비스:"
    echo "  all            모든 서비스 실행"
    echo "  rest           REST API 서비스"
    echo "  udp            UDP Gateway 서비스"
    echo "  data           데이터 서비스"
    echo "  redis          Redis 캐시"
    echo "  mysql          MySQL 데이터베이스"
    echo ""
    echo "명령어:"
    echo "  restart        모든 실행 중인 서비스 재시작"
    echo "  recreate       모든 서비스 down 후 up"
    echo "  status         서비스 상태 확인"
    echo ""
    echo "예제:"
    echo "  $0 all                # 모든 서비스 실행 (백그라운드)"
    echo "  $0 rest redis mysql   # REST API + Redis + MySQL 실행 (백그라운드)"
    echo "  $0 -f all             # 모든 서비스를 포그라운드에서 실행 (로그 표시)"
    echo "  $0 -b rest            # REST API 이미지 재빌드 후 실행"
    echo "  $0 -r rest            # REST API 재시작"
    echo "  $0 -R all             # 모든 서비스 down 후 up"
    echo "  $0 restart            # 모든 실행 중인 서비스 재시작"
    echo "  $0 recreate           # 모든 서비스 재생성"
    echo "  $0 status             # 서비스 상태 확인"
    echo "  $0 -c                 # 모든 컨테이너와 볼륨 정리"
}

# 환경 체크
check_environment() {
    if [ ! -f ".env" ]; then
        log_warning ".env 파일이 없습니다. .env.example을 복사하여 생성하세요."
        log_info "cp .env.example .env"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되지 않았습니다."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose가 설치되지 않았습니다."
        exit 1
    fi
}

# 서비스 실행
run_services() {
    local services=("$@")
    local profiles=""

    for service in "${services[@]}"; do
        if [ -n "$profiles" ]; then
            profiles="$profiles --profile $service"
        else
            profiles="--profile $service"
        fi
    done

    log_info "서비스 실행: ${services[*]}"

    if [ "$BUILD" = true ]; then
        log_info "이미지 빌드 중..."
        docker-compose $profiles build
    fi

    if [ "$DETACH" = true ]; then
        docker-compose $profiles up -d
        log_success "서비스가 백그라운드에서 실행되었습니다."
        log_info "로그 확인: docker-compose $profiles logs -f"
    else
        docker-compose $profiles up
    fi
}

# 서비스 재시작
restart_services() {
    local services=("$@")
    local profiles=""

    for service in "${services[@]}"; do
        if [ -n "$profiles" ]; then
            profiles="$profiles --profile $service"
        else
            profiles="--profile $service"
        fi
    done

    log_info "서비스 재시작: ${services[*]}"
    docker-compose $profiles restart
    log_success "서비스가 재시작되었습니다."
}

# 서비스 재생성 (down 후 up)
recreate_services() {
    local services=("$@")
    local profiles=""

    for service in "${services[@]}"; do
        if [ -n "$profiles" ]; then
            profiles="$profiles --profile $service"
        else
            profiles="--profile $service"
        fi
    done

    log_info "서비스 재생성: ${services[*]}"
    docker-compose $profiles down
    docker-compose $profiles up -d
    log_success "서비스가 재생성되었습니다."
}

# 서비스 상태 확인
check_status() {
    log_info "서비스 상태 확인 중..."
    docker-compose ps
}

# 모든 실행 중인 서비스 재시작
restart_all() {
    log_info "모든 실행 중인 서비스 재시작 중..."
    docker-compose restart
    log_success "모든 서비스가 재시작되었습니다."
}

# 모든 서비스 재생성
recreate_all() {
    log_info "모든 서비스 재생성 중..."
    docker-compose down
    docker-compose up -d
    log_success "모든 서비스가 재생성되었습니다."
}

# 정리
cleanup() {
    log_info "컨테이너와 볼륨 정리 중..."
    docker-compose down -v
    docker system prune -f
    log_success "정리가 완료되었습니다."
}

# 메인 로직
main() {
    DETACH=true  # 기본적으로 백그라운드에서 실행
    BUILD=false
    CLEAN=false
    RESTART=false
    RECREATE=false
    SERVICES=()

    # 인수 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -d|--detach)
                DETACH=true
                shift
                ;;
            -f|--foreground)
                DETACH=false
                shift
                ;;
            -b|--build)
                BUILD=true
                shift
                ;;
            -c|--clean)
                CLEAN=true
                shift
                ;;
            -r|--restart)
                RESTART=true
                shift
                ;;
            -R|--recreate)
                RECREATE=true
                shift
                ;;
            -*)
                log_error "알 수 없는 옵션: $1"
                show_help
                exit 1
                ;;
            *)
                SERVICES+=("$1")
                shift
                ;;
        esac
    done

    # 정리 모드
    if [ "$CLEAN" = true ]; then
        cleanup
        exit 0
    fi

    # 명령어 처리
    if [ ${#SERVICES[@]} -eq 1 ]; then
        case "${SERVICES[0]}" in
            restart)
                restart_all
                exit 0
                ;;
            recreate)
                recreate_all
                exit 0
                ;;
            status)
                check_status
                exit 0
                ;;
        esac
    fi

    # 서비스가 지정되지 않은 경우 도움말 출력
    if [ ${#SERVICES[@]} -eq 0 ]; then
        show_help
        exit 0
    fi

    # 환경 체크
    check_environment

    # 서비스 실행
    if [ "$RESTART" = true ]; then
        restart_services "${SERVICES[@]}"
    elif [ "$RECREATE" = true ]; then
        recreate_services "${SERVICES[@]}"
    else
        run_services "${SERVICES[@]}"
    fi
}

# 스크립트 실행
main "$@"
