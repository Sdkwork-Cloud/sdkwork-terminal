# SDKWork Terminal PC - SDK workspace

Terminal PC owns one generated SDK family for the authenticated public Terminal
App API. The legacy runtime-node HTTP protocol remains a private/local host
boundary and is not exposed by Browser ingress.

## SDK families

| Family | Package | Authority |
| --- | --- | --- |
| Terminal App API | `@sdkwork/terminal-app-sdk` | `sdks/sdkwork-terminal-app-sdk/openapi/sdkwork-terminal-app-api.openapi.yaml` |

## Consumption model

- Generated transport: `sdks/sdkwork-terminal-app-sdk/.../generated/server-openapi/`
- Primary consumer: `@sdkwork/terminal-pc-infrastructure` (`createWebRuntimeBridgeClient`)
- Browser JSON control calls use the composed SDK and the global TokenManager.
- Browser SSE uses the protected App API event route with the same dual-token context.
- Tauri/local PTY capability remains behind the native bridge.
- Do not hand-edit generated output or replace generated SDK calls with raw HTTP.

## Regeneration

From `apps/sdkwork-terminal-pc/`:

```bash
pnpm --filter @sdkwork/terminal-app-sdk generate
```

After regeneration, run `node --test tests/web-runtime-bridge.test.ts` and the
SDK/API standards checks documented by the repository.
