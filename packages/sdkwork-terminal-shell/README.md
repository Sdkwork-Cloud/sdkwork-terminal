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
import type {
  TerminalLaunchProjectCollection,
  TerminalLaunchProjectActivationEvent,
  TerminalLaunchProject,
  TerminalLaunchProjectResolutionRequest,
} from "@sdkwork/terminal-shell";

export function DesktopTerminalSurface() {
  const client = createDesktopRuntimeBridgeClient(invoke, listen);
  const launchProjects: TerminalLaunchProject[] = [
    {
      name: "sdkwork-terminal",
      path: "D:\\javasource\\spring-ai-plus\\spring-ai-plus-business\\apps\\sdkwork-terminal",
    },
    {
      name: "spring-ai-plus-business",
      path: "D:\\javasource\\spring-ai-plus\\spring-ai-plus-business",
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
