/**
 * @cursor-change: 2024-12-19, 1.0.0, 스트리머 목록 공통 모듈
 *
 * 테스트에서 사용하는 스트리머 목록 정의
 */

/**
 * 스트리머 목록
 * 각 스트리머의 대표 캐릭터명을 포함
 */
export const STREAMERS = [
  { name: '이다', character: '이다' },
  { name: '쫀지', character: '쫀지' },
  { name: '노돌리', character: '노돌리' },
  { name: '박서림', character: '박서림' },
  { name: '로마러', character: '로마러' },
  { name: '성대', character: '성대' },
  { name: '짱여니', character: '짱여니' },
  { name: '선짱', character: '선짱' },
  { name: '도읍지', character: '도읍지' },
  { name: '게임하는인기', character: '게임하는인기' },
  { name: '신선한망치', character: '신선한망치' },
  { name: '새미네집', character: '디아스페로' },
  { name: '숫여우', character: '수채화여우' },
  { name: '리연', character: '특치달소' },
];

/**
 * 스트리머 이름으로 캐릭터명 찾기
 */
export function getCharacterByStreamer(streamerName) {
  const streamer = STREAMERS.find((s) => s.name === streamerName);
  return streamer ? streamer.character : null;
}

/**
 * 캐릭터명으로 스트리머 찾기
 */
export function getStreamerByCharacter(characterName) {
  const streamer = STREAMERS.find((s) => s.character === characterName);
  return streamer ? streamer.name : null;
}

/**
 * 모든 스트리머 이름 목록
 */
export function getAllStreamerNames() {
  return STREAMERS.map((s) => s.name);
}

/**
 * 모든 캐릭터명 목록
 */
export function getAllCharacterNames() {
  return STREAMERS.map((s) => s.character);
}
