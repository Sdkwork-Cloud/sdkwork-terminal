# SDKWork Terminal PC — SDK workspace

Terminal PC owns one generated SDK family for the product-local runtime HTTP API. Platform SDK families (appbase IAM, etc.) remain in sibling repositories and are linked through `pnpm-workspace.yaml`.

## SDK families

| Family | Package | Authority |
| --- | --- | --- |
| Local runtime | `@sdkwork/terminal-local-runtime-app-sdk` | `apis/local-runtime/openapi.yaml` |

## Consumption model

- Generated transport: `sdks/sdkwork-terminal-local-runtime-app-sdk/.../generated/server-openapi/`
- Primary consumer: `@sdkwork/terminal-pc-infrastructure` (`createWebRuntimeBridgeClient`)
- Do not hand-edit generated output or replace generated SDK calls with raw HTTP for JSON runtime API methods.

## Regeneration

From `apps/sdkwork-terminal-pc/`:

```bash
node sdks/sync-local-runtime-openapi.mjs
pnpm --filter @sdkwork/terminal-local-runtime-app-sdk-workspace generate
```

After regeneration, run `node --test tests/local-runtime-openapi-route-parity.test.mjs` and `node --test tests/web-runtime-bridge.test.ts`.
