# Local Runtime API

Contract authority for the terminal local HTTP runtime (`sdkwork-terminal-runtime-node`).

## Canonical sources

| Artifact | Location |
| --- | --- |
| Route prefixes and namespaces | `crates/sdkwork-terminal-protocol/src/lib.rs` |
| HTTP handlers | `crates/sdkwork-terminal-runtime-node/` |
| TypeScript consumer | `packages/sdkwork-terminal-pc-infrastructure/` |

## Public prefixes

- `/terminal/api/v1` — session, PTY, replay client API
- `/terminal/manage/v1` — operator/manage surface (when enabled)
- `/terminal/stream/v1` — streaming surface
- `/terminal/internal/v1` — internal-only surface

## SDK generation

OpenAPI authority: [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1, product-local runtime contract).

Generated SDK families remain deferred until cross-app consumption is required. When ready:

1. Materialize `sdks/sdkwork-terminal-local-runtime-app-sdk/` per `SDK_WORKSPACE_GENERATION_SPEC.md`
2. Replace infrastructure `fetch` calls with the generated terminal runtime client
3. Keep `sdkwork-web-framework` exception **EX-2026-REPO-002** until promotion to a platform `*-api` surface

Contract parity test: `tests/local-runtime-openapi-route-parity.test.mjs`.
