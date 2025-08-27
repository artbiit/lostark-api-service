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
import { CharacterSiblingsResponseV9 } from '@lostark/shared/types/V9';
/**
 * CHARACTERS API 클라이언트
 * @deprecated ARMORIES API 클라이언트를 사용하세요
 */
export declare class CharactersClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly maxRetries;
    private readonly retryDelay;
    constructor();
    /**
     * 캐릭터 siblings 정보 조회
     */
    getSiblings(characterName: string): Promise<CharacterSiblingsResponseV9>;
    /**
     * API 요청 실행
     */
    private makeRequest;
    /**
     * Rate Limit 체크
     */
    private checkRateLimit;
    /**
     * 지연 함수
     */
    private delay;
    /**
     * 요청 ID 생성
     */
    private generateRequestId;
}
/**
 * CHARACTERS API 클라이언트 인스턴스
 */
export declare const charactersClient: CharactersClient;
