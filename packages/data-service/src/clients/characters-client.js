/**
 * @cursor-change: 2025-01-27, v1.0.0, CHARACTERS API 클라이언트 생성
 *
 * CHARACTERS API 클라이언트
 * - siblings API 호출 및 에러 처리
 * - Rate Limit 관리
 * - 재시도 로직
 *
 * @deprecated CHARACTERS API는 ARMORIES API와 중복됩니다.
 * 캐릭터 정보는 ArmoriesClient를 사용하세요.
 */
import { logger } from '@lostark/shared';
import { CHARACTERS_ENDPOINTS } from '@lostark/shared/types/V9';
import { config } from '../config.js';
// === API 클라이언트 ===
/**
 * CHARACTERS API 클라이언트
 * @deprecated ARMORIES API 클라이언트를 사용하세요
 */
export class CharactersClient {
    baseUrl;
    apiKey;
    maxRetries;
    retryDelay;
    constructor() {
        this.baseUrl = config.lostark.api.baseUrl;
        this.apiKey = config.lostark.api.key;
        this.maxRetries = config.retryAttempts;
        this.retryDelay = config.retryDelayMs;
    }
    /**
     * 캐릭터 siblings 정보 조회
     */
    async getSiblings(characterName) {
        const endpoint = CHARACTERS_ENDPOINTS.SIBLINGS(characterName);
        const url = `${this.baseUrl}${endpoint}`;
        logger.info('Fetching character siblings', {
            characterName,
            endpoint,
            requestId: this.generateRequestId(),
        });
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await this.makeRequest(url, attempt);
                logger.info('Successfully fetched character siblings', {
                    characterName,
                    characterCount: response.length,
                    attempt,
                    requestId: this.generateRequestId(),
                });
                return response;
            }
            catch (error) {
                if (attempt === this.maxRetries) {
                    logger.error('Failed to fetch character siblings after all retries', {
                        characterName,
                        endpoint,
                        error: error instanceof Error ? error.message : String(error),
                        requestId: this.generateRequestId(),
                    });
                    throw error;
                }
                logger.warn('Retrying character siblings fetch', {
                    characterName,
                    attempt,
                    nextAttempt: attempt + 1,
                    error: error instanceof Error ? error.message : String(error),
                    requestId: this.generateRequestId(),
                });
                await this.delay(this.retryDelay * attempt);
            }
        }
        throw new Error(`Failed to fetch siblings for character: ${characterName}`);
    }
    /**
     * API 요청 실행
     */
    async makeRequest(url, attempt) {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'LostArk-Remote-Kakao/1.0.0',
            },
            signal: AbortSignal.timeout(10000), // 10초 타임아웃
        });
        // Rate Limit 체크
        this.checkRateLimit(response, attempt);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        // 응답 데이터 검증
        if (!Array.isArray(data)) {
            throw new Error('Invalid response format: expected array');
        }
        return data;
    }
    /**
     * Rate Limit 체크
     */
    checkRateLimit(response, attempt) {
        const limit = response.headers.get('X-RateLimit-Limit');
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');
        if (limit && remaining && reset) {
            logger.debug('Rate limit info', {
                limit: parseInt(limit),
                remaining: parseInt(remaining),
                reset: new Date(parseInt(reset) * 1000),
                attempt,
                requestId: this.generateRequestId(),
            });
            // Rate Limit 초과 시 대기
            if (parseInt(remaining) === 0) {
                const resetTime = parseInt(reset) * 1000;
                const now = Date.now();
                const waitTime = Math.max(0, resetTime - now) + 1000; // 1초 여유
                logger.warn('Rate limit exceeded, waiting for reset', {
                    waitTimeMs: waitTime,
                    resetTime: new Date(resetTime),
                    requestId: this.generateRequestId(),
                });
                // 실제로는 큐 시스템에서 처리해야 하지만, 여기서는 간단히 대기
                if (waitTime > 0) {
                    throw new Error(`Rate limit exceeded, reset in ${Math.ceil(waitTime / 1000)}s`);
                }
            }
        }
    }
    /**
     * 지연 함수
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * 요청 ID 생성
     */
    generateRequestId() {
        return `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
// === 싱글톤 인스턴스 ===
/**
 * CHARACTERS API 클라이언트 인스턴스
 */
export const charactersClient = new CharactersClient();
