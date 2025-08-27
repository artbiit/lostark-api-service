/**
 * @cursor-change: 2024-12-19, 1.0.0, Fetch Layer 전용 설정
 *
 * Fetch Layer에 특화된 설정값들
 * - API 클라이언트 설정
 * - 레이트리밋 설정
 * - 재시도 설정
 */
export declare const LOSTARK_API_BASE_URL = "https://developer-lostark.game.onstove.com";
export interface FetchConfig {
    lostark: {
        api: {
            baseUrl: string;
            key: string;
        };
    };
    rateLimitPerMinute: number;
    retryAttempts: number;
    retryDelayMs: number;
    circuitBreakerThreshold: number;
    circuitBreakerTimeoutMs: number;
    memoryTtlSeconds: number;
    redisTtlSeconds: number;
    logLevel: string;
    prettyPrint: boolean;
}
export declare function createFetchConfig(): FetchConfig;
export declare function validateFetchConfig(config: FetchConfig): void;
export declare const defaultFetchConfig: FetchConfig;
export declare const config: FetchConfig;
