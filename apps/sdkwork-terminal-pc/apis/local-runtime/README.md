# Local Runtime API

Contract authority for the private terminal runtime-node HTTP protocol.

## Canonical sources

| Artifact | Location |
| --- | --- |
| Route prefixes and namespaces | `crates/sdkwork-terminal-protocol/src/lib.rs` |
| HTTP handlers | `crates/sdkwork-terminal-runtime-node/` |
| Private runtime host consumer | Tauri/runtime-node adapters |
| Public Browser App API adapter | `crates/sdkwork-routes-terminal-app-api/` |
| Public generated SDK facade | `sdks/sdkwork-terminal-app-sdk/` |

## Private/local runtime prefixes

- `/terminal/api/v1` - private runtime-node session and replay protocol
- `/terminal/manage/v1` - private operator/manage surface when enabled
- `/terminal/stream/v1` - private runtime-node streaming surface
- `/terminal/internal/v1` - internal-only surface
- `/healthz`, `/livez`, `/readyz` - health and readiness probes
- `/metrics` - Prometheus text metrics

## Browser App API generation

OpenAPI authority: [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1 private runtime
contract).

Browser clients never call these prefixes. `sdks/build-terminal-app-sdkgen.mjs`
derives the protected `/app/v3/api/device/terminal/**` App API authority from
this runtime contract, and the composed `@sdkwork/terminal-app-sdk` facade is
generated from that derived authority.

The public create operation is intentionally not a direct copy of the private
runtime create payload. It requires `projectId` and `runtimeLocationId`; the
authenticated host resolves the target-owned root. Client-provided directories
and public path-bearing session projections are not part of this App API.

1. Regenerate with `pnpm --filter @sdkwork/terminal-app-sdk run generate`.
2. Keep the legacy prefixes private to local/runtime-node delivery.

Private protocol parity test: `tests/local-runtime-openapi-route-parity.test.mjs`.
