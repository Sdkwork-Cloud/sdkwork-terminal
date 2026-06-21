import { useMemo, useSyncExternalStore } from "react";
import {
  createAuthorizedFetchEventSourceFactory,
  createWebRuntimeBridgeClient,
  resolveWebRuntimeBridgeAuthToken,
} from "@sdkwork/terminal-pc-infrastructure";
import {
  WebShellApp,
  createBrowserClipboardProvider,
  createWebRuntimeTargetFromEnvironment,
} from "@sdkwork/terminal-pc-shell/integration";

import { getApplicationPublicHttpUrl, terminalSessionStore } from "@sdkwork/terminal-pc-core/bootstrap";

export function App() {
  const session = useSyncExternalStore(
    terminalSessionStore.subscribe,
    terminalSessionStore.getSnapshot,
    terminalSessionStore.getSnapshot,
  );
  const runtimeBaseUrl = getApplicationPublicHttpUrl();
  const runtimeAuthToken = resolveWebRuntimeBridgeAuthToken(session.authToken);
  const createEventSource = useMemo(
    () =>
      runtimeAuthToken
        ? createAuthorizedFetchEventSourceFactory(runtimeAuthToken)
        : undefined,
    [runtimeAuthToken],
  );

  const webRuntimeClient = useMemo(
    () =>
      createWebRuntimeBridgeClient({
        baseUrl: runtimeBaseUrl,
        authToken: runtimeAuthToken,
        createEventSource,
      }),
    [createEventSource, runtimeAuthToken, runtimeBaseUrl],
  );
  const webClipboardProvider = useMemo(() => createBrowserClipboardProvider(), []);
  const webRuntimeTarget = useMemo(
    () => createWebRuntimeTargetFromEnvironment(import.meta.env),
    [
      import.meta.env.VITE_SDKWORK_TERMINAL_RUNTIME_WORKSPACE_ID,
      import.meta.env.VITE_SDKWORK_TERMINAL_RUNTIME_AUTHORITY,
      import.meta.env.VITE_SDKWORK_TERMINAL_RUNTIME_TARGET,
      import.meta.env.VITE_SDKWORK_TERMINAL_RUNTIME_WORKING_DIRECTORY,
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
