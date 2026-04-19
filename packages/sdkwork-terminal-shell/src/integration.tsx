import {
  ShellApp,
  type ShellAppProps,
  type TerminalClipboardProvider,
  type WebRuntimeTarget,
} from "./index.tsx";

export type { ShellAppProps } from "./index.tsx";

export interface BrowserClipboardProviderOptions {
  clipboard?: Pick<Clipboard, "readText" | "writeText"> | null;
}

export interface WebRuntimeEnvironment {
  readonly [key: string]: unknown;
  VITE_TERMINAL_RUNTIME_WORKSPACE_ID?: string;
  VITE_TERMINAL_RUNTIME_AUTHORITY?: string;
  VITE_TERMINAL_RUNTIME_TARGET?: string;
  VITE_TERMINAL_RUNTIME_WORKING_DIRECTORY?: string;
}

export type DesktopShellAppProps = Omit<
  ShellAppProps,
  "mode" | "webRuntimeClient" | "webRuntimeTarget"
>;

export type WebShellAppProps = Omit<
  ShellAppProps,
  | "mode"
  | "desktopRuntimeClient"
  | "desktopWindowController"
  | "sessionCenterEnabled"
  | "sessionCenterOpen"
  | "onToggleSessionCenter"
  | "sessionCenterReplayDiagnostics"
  | "desktopSessionReattachIntent"
  | "desktopConnectorSessionIntent"
  | "desktopConnectorEntries"
  | "desktopConnectorCatalogStatus"
  | "onLaunchDesktopConnectorEntry"
  | "onPickWorkingDirectory"
  | "onBeforeProfileMenuOpen"
>;

function trimEnvironmentValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveBrowserClipboard(
  options: BrowserClipboardProviderOptions,
): Pick<Clipboard, "readText" | "writeText"> | null {
  if (options.clipboard) {
    return options.clipboard;
  }

  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return null;
  }

  return navigator.clipboard;
}

export function createBrowserClipboardProvider(
  options: BrowserClipboardProviderOptions = {},
): TerminalClipboardProvider {
  return {
    readText: async () => {
      const clipboard = resolveBrowserClipboard(options);
      if (!clipboard) {
        return "";
      }

      return clipboard.readText();
    },
    writeText: async (text: string) => {
      const clipboard = resolveBrowserClipboard(options);
      if (!clipboard) {
        throw new Error("Web clipboard API is unavailable.");
      }

      await clipboard.writeText(text);
    },
  };
}

export function createWebRuntimeTargetFromEnvironment(
  environment: WebRuntimeEnvironment,
): WebRuntimeTarget | undefined {
  const workspaceId = trimEnvironmentValue(
    environment.VITE_TERMINAL_RUNTIME_WORKSPACE_ID,
  );
  const authority = trimEnvironmentValue(
    environment.VITE_TERMINAL_RUNTIME_AUTHORITY,
  );

  if (!workspaceId || !authority) {
    return undefined;
  }

  return {
    workspaceId,
    authority,
    target:
      trimEnvironmentValue(environment.VITE_TERMINAL_RUNTIME_TARGET) ===
      "server-runtime-node"
        ? "server-runtime-node"
        : "remote-runtime",
    workingDirectory: trimEnvironmentValue(
      environment.VITE_TERMINAL_RUNTIME_WORKING_DIRECTORY,
    ),
    tags: ["web-shell"],
  };
}

export function DesktopShellApp(props: DesktopShellAppProps) {
  return <ShellApp mode="desktop" {...props} />;
}

export function WebShellApp(props: WebShellAppProps) {
  return <ShellApp mode="web" {...props} />;
}
