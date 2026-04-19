import type { ReactElement } from "react";
import type {
  ShellAppProps,
  TerminalClipboardProvider,
  WebRuntimeTarget,
} from "./index.js";

export type { ShellAppProps } from "./index.js";

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

export function createBrowserClipboardProvider(
  options?: BrowserClipboardProviderOptions,
): TerminalClipboardProvider;

export function createWebRuntimeTargetFromEnvironment(
  environment: WebRuntimeEnvironment,
): WebRuntimeTarget | undefined;

export function DesktopShellApp(props: DesktopShellAppProps): ReactElement;

export function WebShellApp(props: WebShellAppProps): ReactElement;
