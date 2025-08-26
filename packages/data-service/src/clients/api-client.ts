/**
 * @cursor-change: 2025-01-27, v1.0.0, API 클라이언트 기본 모듈 생성
 *
 * API 클라이언트 기본 모듈
 * - HTTP 요청 처리
 * - Rate Limit 관리
 * - 재시도 로직
 * - 에러 처리
 */

import { logger } from '@lostark/shared';

// === API 클라이언트 설정 ===

const API_BASE_URL = 'https://developer-lostark.game.onstove.com';
const RATE_LIMIT_PER_MINUTE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1초

// === Rate Limit 관리 ===

class RateLimiter {
  private requests: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // 만료된 요청 제거
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    // 제한에 도달한 경우 대기
    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0]!;
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        logger.debug('Rate limit reached, waiting', { waitTime });
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // 새 요청 추가
    this.requests.push(now);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);
    return Math.max(0, this.limit - this.requests.length);
  }
}

// === API 클라이언트 ===

export class ApiClient {
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter(RATE_LIMIT_PER_MINUTE);
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const apiKey = process.env.LOSTARK_API_KEY;

    if (!apiKey) {
      throw new Error('LOSTARK_API_KEY environment variable is required');
    }

    // Rate Limit 대기
    await this.rateLimiter.waitForSlot();

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        Authorization: `bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.debug('Making API request', {
          url,
          attempt,
          remainingRequests: this.rateLimiter.getRemainingRequests(),
        });

        const response = await fetch(url, requestOptions);

        // Rate Limit 헤더 확인
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        if (rateLimitRemaining) {
          logger.debug('Rate limit info', {
            remaining: rateLimitRemaining,
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        logger.debug('API request successful', {
          url,
          attempt,
          dataSize: JSON.stringify(data).length,
        });

        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.warn('API request failed', {
          url,
          attempt,
          error: lastError.message,
        });

        // 마지막 시도가 아니면 재시도
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // 지수 백오프
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 모든 재시도 실패
    logger.error('API request failed after all retries', {
      url,
      attempts: MAX_RETRIES,
      error: lastError?.message,
    });

    throw lastError || new Error('Unknown error occurred');
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  getRateLimitInfo() {
    return {
      remaining: this.rateLimiter.getRemainingRequests(),
      limit: RATE_LIMIT_PER_MINUTE,
    };
  }
}
