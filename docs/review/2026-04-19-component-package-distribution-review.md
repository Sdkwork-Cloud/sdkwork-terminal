# Component Package Distribution Review

## Scope

This review covers the public distribution contract for `@sdkwork/terminal-shell`.

## Findings

1. The package previously exported `src/*.ts(x)` files directly.
2. The public type surface leaked workspace-internal package contracts.
3. `pnpm pack` on Windows was not stable because the `prepack` lifecycle depended on an inherited `node` command in `PATH`.
4. The package still lacked proof that a packed tarball could be consumed by an external React/Vite host without workspace aliases.

## Decisions

1. Publish only `dist/` and `README.md`.
2. Keep workspace source aliases for local development, but ship prebuilt ESM and explicit declaration files for third-party consumers.
3. Make the public shell client contracts infrastructure-agnostic so hosts can provide compatible runtime bridge implementations without importing internal workspace source.
4. Use dedicated `prepack` launchers so `pnpm pack` succeeds on Windows even when lifecycle `PATH` resolution is restricted.
5. Add a packed-tarball consumer smoke fixture that type-checks and builds a minimal external host against the published package surface.

## Verification

- `corepack pnpm --filter @sdkwork/terminal-shell run build`
- `node --test tests/shell-integration-surface.test.ts tests/shell-app-render.test.ts tests/desktop-package-boundary.test.ts tests/workspace-structure.test.mjs`
- `node --test tests/shell-third-party-consumer-smoke.test.mjs`
- `corepack pnpm pack` in `packages/sdkwork-terminal-shell`

## Result

`@sdkwork/terminal-shell` now behaves as a real component package:

- public exports point at `dist/`
- tarballs include runtime bundles, CSS assets, and declaration files
- workspace source paths are no longer the published integration contract
- Windows pack verification is part of the package contract, not an afterthought
- a minimal third-party consumer fixture now proves the packed tarball can type-check and build outside the workspace package boundary
