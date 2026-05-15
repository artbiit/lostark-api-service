/**
 * 카카오톡 메시지 내용에서 명령을 추출한다.
 *
 * 입력: 사용자가 채팅창에 입력한 raw 문자열.
 * 출력: prefix 시작이면 ParsedCommand, 아니면 null.
 *
 * 토크나이저는 legacy `args.split(/\s+/)` 컨벤션을 그대로 유지한다.
 */

export interface ParsedCommand {
  /** 명령명 (prefix 제외, 첫 토큰). 예: '정보' */
  name: string;
  /** 공백으로 분리한 나머지 토큰. */
  args: string[];
  /** 원본 content (디버깅/로깅용). */
  raw: string;
}

/**
 * prefix 로 시작하지 않거나 명령명이 비면 null 반환.
 *
 * @param content 원본 메시지 본문
 * @param prefix  명령 접두사 (env COMMAND_PREFIX, 기본 '!')
 */
export function parseCommand(content: string, prefix: string): ParsedCommand | null {
  if (typeof content !== 'string') return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith(prefix)) return null;

  const body = trimmed.slice(prefix.length).trim();
  if (body.length === 0) return null;

  const tokens = body.split(/\s+/).filter((t) => t.length > 0);
  const [name, ...args] = tokens;
  if (!name) return null;

  return { name, args, raw: content };
}
