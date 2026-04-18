# @sdkwork/terminal-shell

Public React terminal shell surface for desktop and web hosts.

## Public entrypoints

- Root module: `@sdkwork/terminal-shell`
  - Exposes `ShellApp`
  - Exposes stable prop and host-contract types such as `ShellAppProps`
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
5. Runtime bridges come from `@sdkwork/terminal-infrastructure`.

## Distribution contract

- The published package surface is limited to `README.md` and `src/`.
- `@sdkwork/terminal-shell/styles.css` and `./src/shell-app.css` are marked as side effects so external bundlers keep terminal styling intact.
- `pnpm pack` rewrites workspace dependencies to concrete package versions, so release artifacts keep a versioned dependency graph instead of leaking `workspace:*`.
- Third-party hosts should keep `@sdkwork/terminal-shell` and sibling `@sdkwork/terminal-*` packages on the same released version line.

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
