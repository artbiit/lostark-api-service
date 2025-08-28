/**
 * @cursor-change: 2024-12-19, 1.0.0, Fetch Layer 전용 설정
 *
 * Fetch Layer에 특화된 설정값들
 * - API 클라이언트 설정
 * - 레이트리밋 설정
 * - 재시도 설정
 */
import { parseEnv } from '@lostark/shared/config';
// === Lost Ark API 상수 ===
export const LOSTARK_API_BASE_URL = 'https://developer-lostark.game.onstove.com';
// === 설정 생성 함수 ===
export function createFetchConfig() {
    const env = parseEnv();
    return {
        // Lost Ark API 설정
        lostark: {
            api: {
                baseUrl: LOSTARK_API_BASE_URL,
                key: env.LOSTARK_API_KEY,
            },
        },
        // 레이트리밋 설정
        rateLimitPerMinute: env.FETCH_RATE_LIMIT_PER_MINUTE,
        // 재시도 설정
        retryAttempts: env.FETCH_RETRY_ATTEMPTS,
        retryDelayMs: env.FETCH_RETRY_DELAY_MS,
        // 서킷브레이커 설정
        circuitBreakerThreshold: env.FETCH_CIRCUIT_BREAKER_THRESHOLD,
        circuitBreakerTimeoutMs: env.FETCH_CIRCUIT_BREAKER_TIMEOUT_MS,
        // 캐시 설정
        memoryTtlSeconds: env.CACHE_MEMORY_TTL_SECONDS,
        redisTtlSeconds: env.CACHE_REDIS_TTL_SECONDS,
        // 로깅 설정
        logLevel: env.LOG_LEVEL,
        prettyPrint: env.LOG_PRETTY_PRINT,
    };
}
// === 설정 검증 ===
export function validateFetchConfig(config) {
    if (!config.lostark.api.key) {
        throw new Error('Lost Ark API 키가 설정되지 않았습니다');
    }
    if (config.rateLimitPerMinute > 100) {
        console.warn('⚠️  Lost Ark API는 분당 100회로 제한됩니다. 현재 설정:', config.rateLimitPerMinute);
    }
    if (config.retryAttempts > 5) {
        console.warn('⚠️  재시도 횟수가 너무 많습니다. 현재 설정:', config.retryAttempts);
    }
}
// === 기본 설정값 ===
export const defaultFetchConfig = {
    lostark: {
        api: {
            baseUrl: LOSTARK_API_BASE_URL,
            key: '',
        },
    },
    rateLimitPerMinute: 100,
    retryAttempts: 3,
    retryDelayMs: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 30000,
    memoryTtlSeconds: 300,
    redisTtlSeconds: 1800,
    logLevel: 'info',
    prettyPrint: false,
};
// === 설정 인스턴스 ===
export const config = createFetchConfig();
