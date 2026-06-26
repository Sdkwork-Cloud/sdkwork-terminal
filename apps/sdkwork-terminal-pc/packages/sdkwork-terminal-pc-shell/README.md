# @sdkwork/terminal-pc-shell

Public React terminal shell surface for desktop and web hosts.

## Public entrypoints

- Root module: `@sdkwork/terminal-pc-shell`
  - Exposes `ShellApp`
  - Exposes stable public contract types such as `ShellAppProps`
- Integration module: `@sdkwork/terminal-pc-shell/integration`
  - Exposes `DesktopShellApp`
  - Exposes `WebShellApp`
  - Exposes `createBrowserClipboardProvider`
  - Exposes `createWebRuntimeTargetFromEnvironment`
- Stylesheet entrypoint: `@sdkwork/terminal-pc-shell/styles.css`

## Integration rules

1. Import styles through `@sdkwork/terminal-pc-shell/styles.css`.
2. Do not import from package-internal `src/` paths.
3. Desktop hosts should mount `DesktopShellApp`.
4. Web hosts should mount `WebShellApp`.
5. Runtime bridge clients may come from `@sdkwork/terminal-pc-infrastructure` or any host implementation compatible with the public shell client interfaces.

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

export function DesktopTerminalSurface() {
  const client = createDesktopRuntimeBridgeClient(invoke, listen);
  const launchProjects: TerminalLaunchProject[] = [
    {
      name: "sdkwork-terminal",
      path: "../sdkwork-terminal",
    },
    {
      name: "sdkwork-clawrouter",
      path: "../sdkwork-clawrouter",
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

import { createWebRuntimeBridgeClient } from "@sdkwork/terminal-pc-infrastructure";
import {
  WebShellApp,
  createBrowserClipboardProvider,
  createWebRuntimeTargetFromEnvironment,
} from "@sdkwork/terminal-pc-shell/integration";

export function WebTerminalSurface() {
  const runtimeClient = useMemo(
    () =>
      createWebRuntimeBridgeClient({
        baseUrl: import.meta.env.VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL,
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
