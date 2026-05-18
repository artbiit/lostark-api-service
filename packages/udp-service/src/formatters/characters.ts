/**
 * characters 그룹 명령(!부캐) 의 카카오톡 텍스트 포맷.
 *
 * CharactersService.processCharacterSiblings 는 AccountInfo 도메인 모델을
 * 반환한다. 본 포맷터는 같은 서버 캐릭터를 아이템레벨 내림차순으로 정렬해
 * legacy 컨벤션(`<이름님과 같은 서버명 캐릭터들>`) 으로 출력한다.
 */

import { joinLines, sectionHeader } from './kakao.js';

interface CharacterInfoLike {
  characterName: string;
  serverName: string;
  characterClassName: string;
  characterLevel: number;
  itemLevel: number;
}

interface SiblingsLike {
  accountInfo?: {
    characters?: CharacterInfoLike[];
  };
}

export function formatSiblings(name: string, data: SiblingsLike): string {
  const characters = data.accountInfo?.characters ?? [];
  if (characters.length === 0) {
    return `${name} 캐릭터는 없는 것 같숨미당`;
  }

  // 입력 캐릭터가 속한 서버를 찾는다.
  const upper = name.toUpperCase();
  const targetEntry = characters.find((c) => c.characterName.toUpperCase() === upper);
  const targetServer = targetEntry?.serverName ?? characters[0]?.serverName ?? '';

  const sameServer = characters
    .filter((c) => c.serverName === targetServer)
    .sort((a, b) => {
      if (a.itemLevel !== b.itemLevel) return b.itemLevel - a.itemLevel;
      if (a.characterLevel !== b.characterLevel) return b.characterLevel - a.characterLevel;
      return (
        a.characterClassName.localeCompare(b.characterClassName) ||
        a.characterName.localeCompare(b.characterName)
      );
    });

  const lines: string[] = [sectionHeader(`${name}님과 같은 ${targetServer} 서버 캐릭터들`)];
  for (const c of sameServer) {
    lines.push(
      `[${c.characterClassName}] Lv.${c.characterLevel} (${c.itemLevel})\n\t${c.characterName}`,
    );
  }
  return joinLines(...lines);
}
