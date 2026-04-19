# @sdkwork/terminal-shell

Public React terminal shell surface for desktop and web hosts.

## Public entrypoints

- Root module: `@sdkwork/terminal-shell`
  - Exposes `ShellApp`
  - Exposes stable public contract types such as `ShellAppProps`
- Integration module: `@sdkwork/terminal-shell/integration`
  - Exposes `DesktopShellApp`
  - Exposes `WebShellApp`
  - Exposes `createBrowserClipboardProvider`
  - Exposes `createWebRuntimeTargetFromEnvironment`
- Stylesheet entrypoint: `@sdkwork/terminal-shell/styles.css`

## Integration rules

1. Import styles through `@sdkwork/terminal-shell/styles.css`.
2. Do not import from package-internal `src/` paths.
3. Desktop hosts should mount `DesktopShellApp`.
4. Web hosts should mount `WebShellApp`.
5. Runtime bridge clients may come from `@sdkwork/terminal-infrastructure` or any host implementation compatible with the public shell client interfaces.

## Distribution contract

- The published package surface is limited to `README.md` and `dist/`.
- `@sdkwork/terminal-shell` ships prebuilt ESM entrypoints and declaration files instead of exposing workspace source files.
- `@sdkwork/terminal-shell/styles.css` is a stable side-effect entrypoint and pulls in the bundled terminal skin assets required for correct rendering.
- The packaged bundle embeds the terminal shell implementation so third-party hosts do not need the internal `@sdkwork/terminal-*` workspace packages at runtime.
- `react` remains a peer dependency and must be provided by the host application.

## Desktop host example

```tsx
import "@sdkwork/terminal-shell/styles.css";

import { DesktopShellApp } from "@sdkwork/terminal-shell/integration";
import { createDesktopRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";

export function DesktopTerminalSurface() {
  const client = createDesktopRuntimeBridgeClient(invoke, listen);

  return (
    <DesktopShellApp
      desktopRuntimeClient={client}
      clipboardProvider={{
        readText: () => client.readClipboardText(),
        writeText: (text) => client.writeClipboardText(text),
      }}
    />
  );
}
```

## Web host example

```tsx
import { useMemo } from "react";

import "@sdkwork/terminal-shell/styles.css";

import { createWebRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";
import {
  WebShellApp,
  createBrowserClipboardProvider,
  createWebRuntimeTargetFromEnvironment,
} from "@sdkwork/terminal-shell/integration";

export function WebTerminalSurface() {
  const runtimeClient = useMemo(
    () =>
      createWebRuntimeBridgeClient({
        baseUrl: import.meta.env.VITE_TERMINAL_RUNTIME_BASE_URL,
      }),
    [],
  );

  return (
    <WebShellApp
      clipboardProvider={createBrowserClipboardProvider()}
      webRuntimeClient={runtimeClient}
      webRuntimeTarget={createWebRuntimeTargetFromEnvironment(import.meta.env)}
    />
  );
}
```

## Package verification

```bash
corepack pnpm --filter @sdkwork/terminal-shell run build
node --test tests/shell-third-party-consumer-smoke.test.mjs
cd packages/sdkwork-terminal-shell
corepack pnpm pack
```
