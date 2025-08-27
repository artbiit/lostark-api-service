/**
 * @cursor-change: 2025-01-27, v1.0.0, API 클라이언트 기본 모듈 생성
 *
 * API 클라이언트 기본 모듈
 * - HTTP 요청 처리
 * - Rate Limit 관리
 * - 재시도 로직
 * - 에러 처리
 */
export declare class ApiClient {
    private rateLimiter;
    constructor();
    private makeRequest;
    get<T>(endpoint: string): Promise<T>;
    post<T>(endpoint: string, body: any): Promise<T>;
    getRateLimitInfo(): {
        remaining: number;
        limit: number;
    };
}
