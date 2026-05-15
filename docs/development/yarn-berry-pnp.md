# Yarn Berry (PnP) 운용

본 레포는 **Yarn Berry (PnP, strict mode)** 를 사용한다. 이는 일반적인 npm/yarn
classic 워크플로우와 다른 동작을 강제하므로, 시작 전에 본 문서의 전제를 알고
있어야 한다.

## 전제

- `nodeLinker: pnp` (`.yarnrc.yml`).
- `node_modules/` 는 만들어지지 않는다. 의존 해석은 `.pnp.cjs` 가 담당.
- 의존 추가/갱신 시 `.pnp.cjs` 가 변한다 — `yarn install` 후 diff 를 같이
  커밋한다.

## 에디터/툴 셋업

- VS Code: `yarn dlx @yarnpkg/sdks vscode` 로 `.yarn/sdks/` 생성.
  TypeScript/Prettier/ESLint 모두 PnP 모드로 인식해야 한다.
- 터미널 실행: `yarn <cmd>` 또는 `yarn workspace @lostark/<name> <cmd>` 만 사용.
  `npx`/`pnpx` 사용 금지 (PnP 의존 해석을 우회).

## 알려진 함정

### `declare module 'fastify'` 모듈 증강이 타입체크에 반영되지 않음

`@fastify/swagger` 등 Fastify 플러그인이 `declare module 'fastify'` 로 인스턴스
메서드를 추가하는 패턴이 PnP + tsc 조합에서 인식되지 않는다 (2026-04-23 확인).

**해결책 (권장 순서)**:

1. **국소 캐스트** — 해당 호출만 우회.

   ```typescript
   (fastify as unknown as { swagger: () => unknown }).swagger();
   ```

2. **로컬 증강 파일** — `packages/rest-service/src/types/fastify-augment.d.ts`
   등에 직접 `declare module 'fastify'` 작성.

해결책 1 이 변경 표면이 작아 우선. 증상을 만나면 패키지 버전 추적 전에 본
함정부터 가설로 체크한다.

### 그 외 일반 주의

- ESLint / Prettier / tsx 전부 PnP 모드로 동작해야 한다. 충돌이 의심되면
  `.yarnrc.yml` 의 `nodeLinker` 부터 확인.
- 의존성을 새로 추가할 때 `yarn add <pkg>` 후 반드시 `yarn validate:monorepo` 로
  순환 참조·project references 정합 확인.

## 관련

- [coding-standards](./coding-standards.md) — 코딩 규칙 풀.
- [monorepo-workflow](./monorepo-workflow.md) — 모노레포 작업 단위 규약.
- [verification-strategies](./verification-strategies.md) — 의존 변경 시 적용할
  L 레벨.
