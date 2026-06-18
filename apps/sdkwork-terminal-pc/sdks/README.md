# SDKWork Terminal SDK workspace

SDKWork Terminal is a **consumer application** for platform SDK families (appbase IAM, drive, and related generated clients). It does not own a first-party HTTP API surface that requires an application-root `sdks/` generation workspace.

Per `SDK_WORKSPACE_GENERATION_SPEC.md`, consumer-only applications document SDK posture here instead of maintaining empty generated SDK families.

## Consumption model

- Platform SDKs are linked through sibling repositories in `apps/sdkwork-terminal-pc/pnpm-workspace.yaml`.
- Application bootstrap wires generated clients through `src/bootstrap/sdkClients.ts` once appbase IAM integration is complete.
- Do not hand-edit generated SDK output or replace generated SDK calls with raw HTTP.

## When to add `sdks/` here

Add an application-root SDK family only when Terminal owns a published HTTP or RPC contract that other SDKWork apps must consume through generated clients.
