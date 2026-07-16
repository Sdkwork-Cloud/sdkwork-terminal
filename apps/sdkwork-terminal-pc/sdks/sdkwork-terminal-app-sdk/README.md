# sdkwork-terminal-app-sdk

Generated TypeScript SDK for the authenticated public Terminal App API under
`/app/v3/api/device/terminal`.

## Authority chain

1. `apis/local-runtime/openapi.yaml` - private runtime-node protocol authority reused by the adapter
2. `sdks/build-terminal-app-sdkgen.mjs` - derives the protected `app-api` authority and generator input
3. `openapi/sdkwork-terminal-app-api.openapi.yaml` - public App API authority
4. `openapi/sdkwork-terminal-app-api.sdkgen.yaml` - owner-only `sdkwork-v3` generation input
5. `sdkwork-terminal-app-sdk-typescript/generated/server-openapi/` - `sdkgen` output; do not hand-edit

The Browser control plane uses dual-token authentication. JSON lifecycle calls
use this composed SDK. The protected SSE events route is implemented by the
Terminal infrastructure adapter because it is a streaming transport rather than
a JSON OpenAPI operation.

`device.terminal.sessions.create` is project-bound: its request requires
`projectId` and `runtimeLocationId`. It does not accept a caller-selected
directory, and create/replay projections intentionally omit resolved roots and
execution authorities.

## Commands

From `apps/sdkwork-terminal-pc/`:

```bash
pnpm --filter @sdkwork/terminal-app-sdk generate
pnpm --filter @sdkwork/terminal-app-sdk typecheck
```
