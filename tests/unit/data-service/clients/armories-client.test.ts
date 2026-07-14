/**
 * ArmoriesClient.getCharacterPartial — ArkPassive 번들 조회 회귀.
 *
 * 배경: V9 에서 ArkPassive 가 profiles 응답에서 분리돼 전용 /arkpassive 엔드포인트로
 * 이동(upstream changelog). partial fetch 가 profile 만 요청해도 ArkPassive 를
 * 함께 채워야 !정보 의 진/깨/도(랭크) 라인이 뜬다.
 *
 * mock 전략: ArmoriesClient 인스턴스의 개별 get 메서드를 직접 stub (실제 HTTP 미발생).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ArmoriesClient } from '../../../../packages/data-service/src/clients/armories-client.js';

test('getCharacterPartial: profile 섹션이 ArkPassive 를 동반 조회', async () => {
  const client = new ArmoriesClient();
  (client as unknown as Record<string, unknown>).getProfile = async () => ({
    CharacterName: '테스트캐릭',
  });
  (client as unknown as Record<string, unknown>).getArkPassive = async () => ({
    IsArkPassive: true,
    Title: '수라의 길',
    Points: [
      { Name: '진화', Value: 120, Tooltip: '', Description: '6랭크 30레벨' },
      { Name: '깨달음', Value: 101, Tooltip: '', Description: '6랭크 30레벨' },
      { Name: '도약', Value: 70, Tooltip: '', Description: '6랭크 30레벨' },
    ],
    Effects: [],
  });

  const result = await client.getCharacterPartial('테스트캐릭', ['profile']);

  assert.ok(result.ArmoryProfile, 'ArmoryProfile should be fetched');
  assert.ok(result.ArkPassive, 'ArkPassive should be bundled with profile fetch');
  assert.equal(result.ArkPassive!.Points[0]!.Name, '진화');
  assert.equal(result.ArkPassive!.Points[0]!.Description, '6랭크 30레벨');
});

test('getCharacterPartial: arkpassive 부재(null)여도 profile 은 유지', async () => {
  const client = new ArmoriesClient();
  (client as unknown as Record<string, unknown>).getProfile = async () => ({
    CharacterName: '저티어캐릭',
  });
  // getArkPassive 는 실패/미개방 시 null 로 강등된다 (client 내부 try/catch).
  (client as unknown as Record<string, unknown>).getArkPassive = async () => null;

  const result = await client.getCharacterPartial('저티어캐릭', ['profile']);

  assert.ok(result.ArmoryProfile, 'ArmoryProfile should still be fetched');
  assert.equal(result.ArkPassive, null, 'ArkPassive null should not break profile fetch');
});
