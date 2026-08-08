import { ShellApp } from "./index.tsx";
import type { ShellAppProps } from "./shell-contract";

export type { WebRuntimeSessionIntent } from "./shell-contract";

export type { WebRuntimeUnavailableMessages } from "./web-runtime-unavailable-stage.tsx";
export {
  webRuntimeUnavailableMessagesEnUS,
  webRuntimeUnavailableMessagesZhCN,
} from "./i18n/index";

export {
  createBrowserClipboardProvider,
  type BrowserClipboardProviderOptions,
} from "./browser-clipboard-provider";
export {
  createWebRuntimeTargetFromEnvironment,
  resolveWebRuntimeTargetFromEnvironment,
  type WebRuntimeEnvironment,
  type WebRuntimeTargetResolution,
} from "./web-runtime-config";

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

export function WebShellApp(props: WebShellAppProps) {
  return <ShellApp mode="web" {...props} />;
}
