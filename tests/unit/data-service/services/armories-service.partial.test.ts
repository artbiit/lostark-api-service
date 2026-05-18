/**
 * ArmoriesService.getCharacterDetailPartial — fetchedSections 메타 기반 partial cache merge.
 *
 * 시나리오:
 *   (a) 첫 호출 — cache miss, !보석
 *   (b) 시퀀스 — !스킬 → !보석 (cache hit + missSections 추가 fetch)
 *   (c) 진짜 빈 데이터 — 보석 미장착 캐릭터
 *   (d) backward-compat — fetchedSections 없는 old entry
 *
 * mock 전략: armoriesClient / cacheManager singleton 메서드를 직접 교체.
 *   NodeNext ESM 에서 module mock 이 불안정하므로 prototype 직접 stub.
 */

import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';

import { armoriesClient } from '../../../../packages/data-service/src/clients/armories-client.js';
import { cacheManager } from '../../../../packages/data-service/src/cache/cache-manager.js';
import { ArmoriesService } from '../../../../packages/data-service/src/services/armories-service.js';
import type { NormalizedCharacterDetail } from '../../../../packages/data-service/src/normalizers/armories-normalizer.js';

// === fixture helpers ===

function makeProfile() {
  return {
    CharacterName: '테스트캐릭',
    ServerName: '루페온',
    CharacterClassName: '버서커',
    ItemAvgLevel: '1,620.00',
    CharacterLevel: 60,
    ExpeditionLevel: 100,
    CombatPower: '4,000.00',
    CharacterImage: '',
    PvpGradeName: '',
    TownLevel: 1,
    TownName: '',
    UsingSkillPoint: 0,
    TotalSkillPoint: 0,
    Stats: [],
    Tendencies: [],
  };
}

function makeCachedDetail(
  overrides: Partial<NormalizedCharacterDetail> = {},
): NormalizedCharacterDetail {
  return {
    characterName: '테스트캐릭',
    serverName: '루페온',
    className: '버서커',
    itemLevel: 1620,
    characterLevel: 60,
    combatPower: 4000,
    expeditionLevel: 100,
    arkPassive: null,
    profile: {
      characterImage: '',
      pvpGrade: '',
      townLevel: 1,
      townName: '',
      skillPoints: { used: 0, total: 0 },
      stats: [],
      tendencies: [],
    },
    equipment: [],
    abilityStone: null,
    engravings: [],
    cards: { cards: [], effects: [] },
    gems: [],
    combatSkills: [],
    avatars: [],
    colosseums: [],
    collectibles: [],
    metadata: {
      normalizedAt: new Date(),
      apiVersion: 'V9.0.0',
      dataHash: 'hash-test',
      fetchedSections: ['profile', 'combat-skills'],
    },
    ...overrides,
  } as NormalizedCharacterDetail;
}

// === stub infrastructure ===

type Stub = { restore: () => void };

function stubMethod<T extends object, K extends keyof T>(obj: T, method: K, impl: T[K]): Stub {
  const original = obj[method];
  obj[method] = impl;
  return {
    restore: () => {
      obj[method] = original;
    },
  };
}

// === tests ===

test('getCharacterDetailPartial', async (t) => {
  // --- (a) 첫 호출 — cache miss ---
  await t.test('(a) cache miss: fetchedSections 에 profile+gems 포함', async () => {
    const stubs: Stub[] = [];
    const setCalls: NormalizedCharacterDetail[] = [];

    stubs.push(stubMethod(cacheManager, 'getCharacterDetail', async (_name: string) => null));
    stubs.push(
      stubMethod(
        cacheManager,
        'setCharacterDetail',
        async (_name: string, detail: NormalizedCharacterDetail) => {
          setCalls.push(detail);
        },
      ),
    );
    stubs.push(
      stubMethod(
        armoriesClient,
        'getCharacterPartial',
        async (_name: string, sections: string[]) => {
          // profile + gems 포함
          assert.ok(sections.includes('profile'), 'profile should be forced-included');
          return {
            ArmoryProfile: makeProfile(),
            ArmoryGem: {
              Gems: [
                {
                  Slot: 0,
                  Name: '1레벨 멸화의 보석',
                  Icon: '',
                  Level: 1,
                  Grade: '일반',
                  Tooltip: '',
                },
              ],
            },
          };
        },
      ) as any,
    );

    const service = new ArmoriesService();
    try {
      const result = await service.getCharacterDetailPartial('테스트캐릭', ['gems']);

      // setCharacterDetail 호출됨
      assert.ok(setCalls.length > 0, 'setCharacterDetail should be called');

      // 저장된 entry 의 fetchedSections 에 profile, gems 포함
      const stored = setCalls[0]!;
      assert.ok(
        stored.metadata.fetchedSections.includes('profile'),
        'fetchedSections should include profile',
      );
      assert.ok(
        stored.metadata.fetchedSections.includes('gems'),
        'fetchedSections should include gems',
      );

      // 반환값 gems 길이 > 0
      assert.ok(result?.gems && result.gems.length > 0, 'result.gems should be non-empty');
    } finally {
      stubs.forEach((s) => s.restore());
      await service.cleanup();
    }
  });

  // --- (b) 시퀀스: !스킬 → !보석 ---
  await t.test('(b) cache hit + missSections: gems 만 추가 fetch', async () => {
    const stubs: Stub[] = [];
    const clientCalls: string[][] = [];
    const setCalls: NormalizedCharacterDetail[] = [];

    // cache에는 profile+combat-skills 만 fetchedSections 에 있음
    const cached = makeCachedDetail({
      combatSkills: [
        {
          name: '블레이드 스톰',
          icon: '',
          level: 1,
          type: 'normal',
          isAwakening: false,
          tripods: [],
        },
      ],
      metadata: {
        normalizedAt: new Date(),
        apiVersion: 'V9.0.0',
        dataHash: 'h',
        fetchedSections: ['profile', 'combat-skills'],
      },
    });

    stubs.push(stubMethod(cacheManager, 'getCharacterDetail', async (_name: string) => cached));
    stubs.push(
      stubMethod(
        cacheManager,
        'setCharacterDetail',
        async (_name: string, detail: NormalizedCharacterDetail) => {
          setCalls.push(detail);
        },
      ),
    );
    stubs.push(
      stubMethod(
        armoriesClient,
        'getCharacterPartial',
        async (_name: string, sections: string[]) => {
          clientCalls.push([...sections]);
          return {
            ArmoryGem: {
              Gems: [
                {
                  Slot: 0,
                  Name: '1레벨 멸화의 보석',
                  Icon: '',
                  Level: 1,
                  Grade: '일반',
                  Tooltip: '',
                },
              ],
            },
          };
        },
      ) as any,
    );

    const service = new ArmoriesService();
    try {
      const result = await service.getCharacterDetailPartial('테스트캐릭', ['gems']);

      // armoriesClient 가 ['gems'] 만으로 1회 호출됨
      assert.strictEqual(clientCalls.length, 1, 'client should be called exactly once');
      assert.deepStrictEqual(clientCalls[0], ['gems'], 'client should be called with [gems] only');

      // 반환 result.gems 길이 > 0
      assert.ok(result?.gems && result.gems.length > 0, 'result.gems should be non-empty');

      // 재저장 entry 의 fetchedSections 에 gems 추가됨
      assert.ok(setCalls.length > 0, 'setCharacterDetail should be called');
      const stored = setCalls[0]!;
      assert.ok(
        stored.metadata.fetchedSections.includes('gems'),
        'fetchedSections should include gems after merge',
      );
      assert.ok(
        stored.metadata.fetchedSections.includes('profile'),
        'fetchedSections should still include profile',
      );
      assert.ok(
        stored.metadata.fetchedSections.includes('combat-skills'),
        'fetchedSections should still include combat-skills',
      );
    } finally {
      stubs.forEach((s) => s.restore());
      await service.cleanup();
    }
  });

  // --- (c) 진짜 빈 데이터 (보석 미장착) ---
  await t.test(
    '(c) empty gems: fetchedSections 에 gems 포함, 재호출 시 추가 fetch 없음',
    async () => {
      const stubs: Stub[] = [];
      const clientCallCount = { n: 0 };
      const setCalls: NormalizedCharacterDetail[] = [];

      // step1: cache miss
      let storedEntry: NormalizedCharacterDetail | null = null;

      stubs.push(
        stubMethod(cacheManager, 'getCharacterDetail', async (_name: string) => storedEntry),
      );
      stubs.push(
        stubMethod(
          cacheManager,
          'setCharacterDetail',
          async (_name: string, detail: NormalizedCharacterDetail) => {
            storedEntry = detail;
            setCalls.push(detail);
          },
        ),
      );
      stubs.push(
        stubMethod(
          armoriesClient,
          'getCharacterPartial',
          async (_name: string, _sections: string[]) => {
            clientCallCount.n++;
            return {
              ArmoryProfile: makeProfile(),
              ArmoryGem: { Gems: [] }, // 빈 배열
            };
          },
        ) as any,
      );

      const service = new ArmoriesService();
      try {
        // 첫 호출: cache miss → fetch
        const result1 = await service.getCharacterDetailPartial('테스트캐릭', ['gems']);

        // gems 는 빈 배열
        assert.deepStrictEqual(result1?.gems, [], 'gems should be empty array');

        // fetchedSections 에 gems 포함 ("조회 완료, 진짜 없음" 상태)
        assert.ok(
          storedEntry?.metadata.fetchedSections.includes('gems'),
          'fetchedSections should include gems',
        );

        const clientCallsAfterFirst = clientCallCount.n;

        // 두 번째 호출: cache hit, missSections=[]
        const result2 = await service.getCharacterDetailPartial('테스트캐릭', ['gems']);

        // 추가 fetch 없음
        assert.strictEqual(
          clientCallCount.n,
          clientCallsAfterFirst,
          'no additional fetch on second call',
        );

        // 빈 배열 그대로 반환
        assert.deepStrictEqual(
          result2?.gems,
          [],
          'gems should still be empty array on second call',
        );
      } finally {
        stubs.forEach((s) => s.restore());
        await service.cleanup();
      }
    },
  );

  // --- (d) backward-compat: fetchedSections 없는 old entry ---
  await t.test('(d) old entry (no fetchedSections): 추가 fetch 없음', async () => {
    const stubs: Stub[] = [];
    const clientCallCount = { n: 0 };

    const oldEntry = makeCachedDetail({
      gems: [{ slot: 0, name: '기존 보석', icon: '', level: 5, grade: '희귀', tooltip: '' }],
    });
    // fetchedSections 제거 (old entry 시뮬레이션)
    delete (oldEntry.metadata as any).fetchedSections;

    stubs.push(stubMethod(cacheManager, 'getCharacterDetail', async (_name: string) => oldEntry));
    stubs.push(
      stubMethod(
        armoriesClient,
        'getCharacterPartial',
        async (_name: string, _sections: string[]) => {
          clientCallCount.n++;
          return {};
        },
      ) as any,
    );

    const service = new ArmoriesService();
    try {
      const result = await service.getCharacterDetailPartial('테스트캐릭', ['gems']);

      // armoriesClient 호출 0회
      assert.strictEqual(
        clientCallCount.n,
        0,
        'no client call for old entry (FULL_SECTIONS fallback)',
      );

      // 반환값은 기존 gems 그대로
      assert.ok(result?.gems && result.gems.length > 0, 'result.gems should be from old entry');
      assert.strictEqual(result?.gems?.[0]?.name, '기존 보석', 'gems should match old cached data');
    } finally {
      stubs.forEach((s) => s.restore());
      await service.cleanup();
    }
  });
});
