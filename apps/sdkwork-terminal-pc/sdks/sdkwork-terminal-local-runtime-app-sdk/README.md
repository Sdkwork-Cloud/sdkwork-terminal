# sdkwork-terminal-local-runtime-app-sdk

Generated TypeScript SDK for the product-local terminal runtime HTTP API (`/terminal/api/v1`, `/terminal/stream/v1`).

## Authority chain

1. `apis/local-runtime/openapi.yaml` — authored contract
2. `openapi/sdkwork-terminal-local-runtime-app-api.openapi.yaml` — synced SDK generation input
3. `sdkwork-terminal-local-runtime-app-sdk-typescript/generated/server-openapi/` — `sdkgen` output (do not hand-edit)

## Commands

From `apps/sdkwork-terminal-pc/`:

```bash
node sdks/sync-local-runtime-openapi.mjs
pnpm --filter @sdkwork/terminal-local-runtime-app-sdk generate
pnpm --filter @sdkwork/terminal-local-runtime-app-sdk typecheck
```
