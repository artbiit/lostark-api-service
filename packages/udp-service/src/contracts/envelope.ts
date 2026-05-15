/**
 * 메신저봇R(Android) 클라이언트와 udp-service 사이의 UDP envelope 계약.
 *
 * 입력 envelope:
 *   { event: 'message', data: KakaoMessage, session: '<uuid>' }
 *
 * 응답 envelope (output):
 *   { event: `reply:${session}`, data: <kakaoText: string> }
 *
 * 본 모듈은 zod 스키마와 추론 타입만 export 한다.
 */

import { z } from 'zod';

// === 카카오톡 메시지 본문 ===

export const KakaoMessageSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  room: z
    .object({
      name: z.string(),
      id: z.string(),
      isGroupChat: z.boolean().optional(),
    })
    .optional(),
  sender: z.object({
    name: z.string(),
    hash: z.string(),
  }),
  content: z.string(),
  containsMention: z.boolean().optional(),
  time: z.number().optional(),
  app: z
    .object({
      packageName: z.string().optional(),
      userId: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
});

export type KakaoMessage = z.infer<typeof KakaoMessageSchema>;

// === 클라이언트 → 서버 envelope ===

export const ClientEnvelopeSchema = z.object({
  event: z.literal('message'),
  data: KakaoMessageSchema,
  session: z.string().min(1),
});

export type ClientEnvelope = z.infer<typeof ClientEnvelopeSchema>;

// === 서버 → 클라이언트 envelope (응답) ===

/**
 * 응답 envelope. 별도 zod 검증 없이 송신측에서 직렬화만 한다.
 */
export interface ReplyEnvelope {
  event: `reply:${string}`;
  data: string;
}
