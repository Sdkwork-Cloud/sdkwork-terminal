# @sdkwork/terminal-pc-shell

Public React terminal shell surface for desktop and web hosts.

## Public entrypoints

- Root module: `@sdkwork/terminal-pc-shell`
  - Exposes `ShellApp`
  - Exposes stable public contract types such as `ShellAppProps`
  - Exposes typed clipboard feedback message catalogs for host-provided localization
  - Exposes typed terminal interaction message catalogs for search, paste review, close confirmation, tab-strip chrome, and viewport context menus
- Integration module: `@sdkwork/terminal-pc-shell/integration`
  - Exposes `DesktopShellApp`
- Browser integration module: `@sdkwork/terminal-pc-shell/web-integration`
  - Exposes the Browser-safe `WebShellApp`
  - Exposes `createBrowserClipboardProvider`
  - Exposes `resolveWebRuntimeTargetFromEnvironment` and the compatibility helper `createWebRuntimeTargetFromEnvironment`
- Stylesheet entrypoint: `@sdkwork/terminal-pc-shell/styles.css`

## Integration rules

1. Import styles through `@sdkwork/terminal-pc-shell/styles.css`.
2. Do not import from package-internal `src/` paths.
3. Desktop hosts should mount `DesktopShellApp`.
4. Web hosts should mount `WebShellApp` from `@sdkwork/terminal-pc-shell/web-integration`.
5. Desktop runtime bridge clients may come from `@sdkwork/terminal-pc-infrastructure` or any host implementation compatible with the public shell client interfaces.
6. Browser hosts must inject a Terminal App SDK-backed runtime client from bootstrap, share the application global TokenManager, and use the protected `/app/v3/api/device/terminal/**` surface. They must not call the product-local runtime-node protocol or accept `VITE_*TERMINAL_RUNTIME*` endpoint configuration.
7. Hosts may pass `clipboardFeedbackMessages` to localize the shell's non-sensitive clipboard status feedback. The message map must include every exported clipboard feedback key; do not derive copy from clipboard content, raw host errors, or paths.
8. Hosts may pass `terminalInteractionMessages` to localize terminal search, paste review, running-session close confirmation, tab-strip chrome, and viewport context menus. The package-local complete catalogs include all five workflow fragments; the two chrome fragments remain optional on the host input contract for compatibility with earlier integrations. Formatter callbacks receive only safe local counts, never clipboard text, host errors, or paths.

## Distribution contract

- The published package surface is limited to `README.md` and `dist/`.
- `@sdkwork/terminal-pc-shell` ships prebuilt ESM entrypoints and declaration files instead of exposing workspace source files.
- `@sdkwork/terminal-pc-shell/styles.css` is a stable side-effect entrypoint and pulls in the bundled terminal skin assets required for correct rendering.
- The packaged bundle embeds the terminal shell implementation so third-party hosts do not need the internal `@sdkwork/terminal-pc-*` workspace packages at runtime.
- `react` remains a peer dependency and must be provided by the host application.

## Desktop host example

```tsx
import "@sdkwork/terminal-pc-shell/styles.css";

import { DesktopShellApp } from "@sdkwork/terminal-pc-shell/integration";
import { createDesktopRuntimeBridgeClient } from "@sdkwork/terminal-pc-infrastructure";
import type {
  TerminalLaunchProjectCollection,
  TerminalLaunchProjectActivationEvent,
  TerminalLaunchProject,
  TerminalLaunchProjectResolutionRequest,
} from "@sdkwork/terminal-pc-shell";
import {
  terminalClipboardFeedbackMessagesZhCN,
  terminalInteractionMessagesZhCN,
} from "@sdkwork/terminal-pc-shell";

export function DesktopTerminalSurface() {
  const client = createDesktopRuntimeBridgeClient(invoke, listen);
  const launchProjects: TerminalLaunchProject[] = [
    {
      name: "sdkwork-terminal",
      path: "../sdkwork-terminal",
    },
    {
      name: "sdkwork-cloudrouter",
      path: "../sdkwork-cloudrouter",
    },
  ];

  return (
    <DesktopShellApp
      desktopRuntimeClient={client}
      launchProjects={launchProjects}
      resolveLaunchProjects={async (
        request: TerminalLaunchProjectResolutionRequest,
      ): Promise<TerminalLaunchProjectCollection | null> => {
        if (request.entryId !== "codex") {
          return null;
        }

        return {
          source: "resolver",
          sourceLabel: "Workspace projects",
          projects: launchProjects,
        };
      }}
      onLaunchProjectActivated={(event: TerminalLaunchProjectActivationEvent) => {
        console.log("Project activated", event.project.path);
      }}
      clipboardProvider={{
        readText: () => client.readClipboardText(),
        writeText: (text) => client.writeClipboardText(text),
      }}
      clipboardFeedbackMessages={terminalClipboardFeedbackMessagesZhCN}
      terminalInteractionMessages={terminalInteractionMessagesZhCN}
    />
  );
}
```

### Project-aware CLI launch behavior

- CLI profiles that require a working directory, such as `Codex CLI`, can consume `launchProjects`.
- When `launchProjects` contains one project, the CLI opens directly in that project path.
- When `launchProjects` contains multiple projects, the shell opens a built-in project picker dialog.
- When `launchProjects` is omitted or empty, the shell falls back to the host `onPickWorkingDirectory` callback.
- Each project accepts `name` and `path`, with optional `workspaceId` and `projectId` metadata for runtime launch requests.
- `resolveLaunchProjects` is the preferred standard hook for dynamic project sources such as recent projects, workspaces, or remote catalogs.
- If `resolveLaunchProjects` returns `null` or `undefined`, the shell falls back to the static `launchProjects` list.
- `resolveLaunchProjects` may return either a plain project array or a `TerminalLaunchProjectCollection` with explicit `source` and `sourceLabel` metadata.
- `onLaunchProjectActivated` fires after a CLI launch resolves its working directory, so hosts can persist recent projects or synchronize external project centers.
- `onRemoveLaunchProject` and `onClearLaunchProjects` let hosts manage mutable project sources such as recent-project lists while reusing the built-in picker UI.

## Web host example

```tsx
import { useMemo } from "react";

import "@sdkwork/terminal-pc-shell/styles.css";

import {
  WebShellApp,
  createBrowserClipboardProvider,
  resolveWebRuntimeTargetFromEnvironment,
  type WebShellAppProps,
  webRuntimeUnavailableMessagesZhCN,
} from "@sdkwork/terminal-pc-shell/web-integration";

export function WebTerminalSurface(props: {
  webRuntimeClient: WebShellAppProps["webRuntimeClient"];
}) {
  const runtimeConfiguration = resolveWebRuntimeTargetFromEnvironment(import.meta.env);
  const clipboardProvider = useMemo(() => createBrowserClipboardProvider(), []);

  return (
    <WebShellApp
      clipboardProvider={clipboardProvider}
      webRuntimeClient={props.webRuntimeClient}
      webRuntimeTarget={runtimeConfiguration.target}
      webRuntimeUnavailableMessages={webRuntimeUnavailableMessagesZhCN}
    />
  );
}
```

The resolver returns the canonical server-runtime-node target for the public
Terminal App API. The host bootstrap must also inject `webRuntimeClient`, created
from `@sdkwork/terminal-app-sdk` and the application global TokenManager. Do not
use product-local `/terminal/api/v1` or `/terminal/stream/v1` routes as Browser
fallbacks; those remain private runtime-node protocols.

`webRuntimeUnavailableMessages` localizes the safe login/API-unavailable state.
Hosts may still pass `webRuntimeUnavailableMessage` for a localized, host-owned
safe explanation, but must never expose raw endpoint, credential, path, bridge,
or exception details.

## Clipboard Feedback Localization

`ShellApp`, `DesktopShellApp`, and a future approved Browser runtime surface accept an
optional `clipboardFeedbackMessages` prop. The shell uses the built-in English catalog
when it is omitted. Hosts can pass `terminalClipboardFeedbackMessagesZhCN` or a complete
catalog with the same typed keys. Clipboard notices are deliberately limited to safe
operation states: success, empty, unavailable, denied, and failed. They never render
clipboard text, raw host errors, paths, permission internals, or stack traces.

## Terminal Interaction Localization

`ShellApp`, `DesktopShellApp`, and a future approved Browser runtime surface accept an
optional `terminalInteractionMessages` prop. The shell uses package-local English defaults
when it is omitted. Hosts can pass `terminalInteractionMessagesZhCN` or a complete typed
catalog that provides the `search`, `pasteConfirmation`, `closeConfirmation`, `tabStrip`, and
`viewportContextMenu` workflow fragments. The latter two are optional for backward-compatible
host-defined catalogs. Paste and close formatter callbacks receive only locally-derived numeric counts;
the shell never supplies clipboard content, raw host errors, paths, permission internals, or
stack traces to localized text.

## Package verification

```bash
corepack pnpm --filter @sdkwork/terminal-pc-shell run build
node --test tests/shell-third-party-consumer-smoke.test.mjs
cd packages/sdkwork-terminal-pc-shell
corepack pnpm pack
```

## SDKWork Documentation Contract

Domain: device
Capability: shell
Package type: react-package
Status: standardizing

### Public API

Public exports are declared in `specs/component.spec.json` under `contracts.publicExports`.

### Required SDK Surface

- None declared in `specs/component.spec.json`.

### Configuration

Configuration keys and runtime entrypoints are declared in `specs/component.spec.json`.

### SaaS/Private/Local Behavior

This module follows the canonical standards linked from `specs/component.spec.json`, including deployment and runtime configuration rules where applicable.

### Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module.

### Extension Points

Extension points are limited to declared public exports, runtime entrypoints, SDK clients, events, and config keys.

### Verification

- `pnpm --filter @sdkwork/terminal-pc-shell build`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
