import { useMemo } from "react";
import { createWebRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";
import {
  WebShellApp,
  createBrowserClipboardProvider,
  createWebRuntimeTargetFromEnvironment,
} from "@sdkwork/terminal-shell/integration";

export function App() {
  const runtimeBaseUrl = import.meta.env.VITE_TERMINAL_RUNTIME_BASE_URL?.trim();

  const webRuntimeClient = useMemo(
    () =>
      createWebRuntimeBridgeClient({
        baseUrl: runtimeBaseUrl || undefined,
      }),
    [runtimeBaseUrl],
  );
  const webClipboardProvider = useMemo(() => createBrowserClipboardProvider(), []);
  const webRuntimeTarget = useMemo(
    () => createWebRuntimeTargetFromEnvironment(import.meta.env),
    [
      import.meta.env.VITE_TERMINAL_RUNTIME_AUTHORITY,
      import.meta.env.VITE_TERMINAL_RUNTIME_TARGET,
      import.meta.env.VITE_TERMINAL_RUNTIME_WORKING_DIRECTORY,
      import.meta.env.VITE_TERMINAL_RUNTIME_WORKSPACE_ID,
    ],
  );

  return (
    <WebShellApp
      clipboardProvider={webClipboardProvider}
      webRuntimeClient={webRuntimeClient}
      webRuntimeTarget={webRuntimeTarget}
    />
  );
}
