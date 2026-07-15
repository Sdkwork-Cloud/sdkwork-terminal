# Local Runtime API

Contract authority for the terminal local HTTP runtime (`sdkwork-terminal-runtime-node`).

## Canonical sources

| Artifact | Location |
| --- | --- |
| Route prefixes and namespaces | `crates/sdkwork-terminal-protocol/src/lib.rs` |
| HTTP handlers | `crates/sdkwork-terminal-runtime-node/` |
| TypeScript consumer | `packages/sdkwork-terminal-pc-infrastructure/` |
| Generated SDK facade | `sdks/sdkwork-terminal-local-runtime-app-sdk/` |

## Public prefixes

- `/terminal/api/v1` — session, PTY, replay client API
- `/terminal/manage/v1` — operator/manage surface (when enabled)
- `/terminal/stream/v1` — streaming surface
- `/terminal/internal/v1` — internal-only surface

- `/healthz`, `/livez`, `/readyz` - health and readiness probes
- `/metrics` - Prometheus text metrics

## SDK generation

OpenAPI authority: [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1, product-local runtime contract).

The composed `@sdkwork/terminal-local-runtime-app-sdk` facade is generated from
this contract and consumed by terminal infrastructure for JSON runtime API calls.

1. Regenerate with `pnpm --filter @sdkwork/terminal-local-runtime-app-sdk run generate`
2. Keep `sdkwork-web-framework` exception **EX-2026-REPO-002** until promotion to a platform `*-api` surface

Contract parity test: `tests/local-runtime-openapi-route-parity.test.mjs`.
