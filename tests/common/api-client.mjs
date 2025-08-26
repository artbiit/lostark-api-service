/**
 * @cursor-change: 2024-12-19, 1.0.0, API 클라이언트 공통 모듈
 *
 * Lost Ark API 호출을 위한 공통 클라이언트
 */

import { getApiKey } from './env-loader.mjs';

const LOSTARK_API_BASE_URL = 'https://developer-lostark.game.onstove.com';

/**
 * API 요청 헤더 생성
 */
function createHeaders() {
  return {
    accept: 'application/json',
    authorization: `bearer ${getApiKey()}`,
  };
}

/**
 * API 요청 실행
 */
export async function makeApiRequest(endpoint, options = {}) {
  const url = `${LOSTARK_API_BASE_URL}${endpoint}`;
  const headers = createHeaders();

  const requestOptions = {
    method: 'GET',
    headers: { ...headers, ...options.headers },
    ...options,
  };

  try {
    const response = await fetch(url, requestOptions);

    const result = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url,
    };

    if (response.ok) {
      result.data = await response.json();
    } else {
      result.error = await response.text();
    }

    return result;
  } catch (error) {
    return {
      status: 0,
      statusText: 'NETWORK_ERROR',
      error: error.message,
      url,
    };
  }
}

/**
 * 캐릭터 정보 조회
 */
export async function getCharacterInfo(characterName) {
  return makeApiRequest(`/armories/characters/${encodeURIComponent(characterName)}`);
}

/**
 * 캐릭터 형제 목록 조회
 */
export async function getCharacterSiblings(characterName) {
  return makeApiRequest(`/characters/${encodeURIComponent(characterName)}/siblings`);
}

/**
 * 경매장 아이템 검색
 */
export async function searchAuctionItems(params = {}) {
  return makeApiRequest('/auctions/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
}

/**
 * 시장 아이템 검색
 */
export async function searchMarketItems(params = {}) {
  const searchParams = new URLSearchParams(params);
  return makeApiRequest(`/markets/items?${searchParams.toString()}`);
}

/**
 * 게임 콘텐츠 조회 (주간 콘텐츠 달력)
 */
export async function getGameContents() {
  return makeApiRequest('/gamecontents/calendar');
}

/**
 * 뉴스 조회
 */
export async function getNews() {
  return makeApiRequest('/news/events');
}
