import React from "react";
import { ShellApp, type ShellAppProps } from "./index.tsx";
export {
  createBrowserClipboardProvider,
  type BrowserClipboardProviderOptions,
} from "./browser-clipboard-provider.ts";
export {
  createWebRuntimeTargetFromEnvironment,
  resolveWebRuntimeTargetFromEnvironment,
  type WebRuntimeEnvironment,
  type WebRuntimeTargetResolution,
} from "./web-runtime-config.ts";
export { WebShellApp, type WebShellAppProps } from "./web-integration.tsx";

export type { ShellAppProps } from "./index.tsx";

export type DesktopShellAppProps = Omit<
  ShellAppProps,
  | "mode"
  | "webRuntimeClient"
  | "webRuntimeTarget"
  | "webRuntimeUnavailableMessage"
  | "webRuntimeUnavailableMessages"
>;

export function DesktopShellApp(props: DesktopShellAppProps) {
  return <ShellApp mode="desktop" {...props} />;
}

