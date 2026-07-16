import { useMemo } from "react";
import {
  getApplicationPublicHttpUrl,
  getIamRuntime,
} from "@sdkwork/terminal-pc-core/bootstrap";
import {
  createAuthorizedFetchEventSourceFactory,
  createWebRuntimeBridgeClient,
} from "@sdkwork/terminal-pc-infrastructure";
import {
  WebShellApp,
  createBrowserClipboardProvider,
  resolveWebRuntimeTargetFromEnvironment,
  webRuntimeUnavailableMessagesEnUS,
  webRuntimeUnavailableMessagesZhCN,
} from "@sdkwork/terminal-pc-shell/web-integration";

function resolveWebRuntimeUnavailableMessages() {
  const preferredLocale =
    typeof navigator === "undefined"
      ? ""
      : navigator.languages.find((locale) => locale.trim().length > 0) ?? navigator.language;

  return preferredLocale.toLowerCase().startsWith("zh")
    ? webRuntimeUnavailableMessagesZhCN
    : webRuntimeUnavailableMessagesEnUS;
}

function createAuthenticatedWebRuntimeClient() {
  const { tokenManager } = getIamRuntime();
  const tokens = tokenManager.getTokens();
  const authToken = tokens?.authToken?.trim();
  const accessToken = tokens?.accessToken?.trim();
  if (!authToken || !accessToken) {
    return undefined;
  }

  const baseUrl = getApplicationPublicHttpUrl() ?? "";
  return createWebRuntimeBridgeClient({
    baseUrl,
    authToken,
    accessToken,
    tokenManager,
    createEventSource: createAuthorizedFetchEventSourceFactory(authToken, {
      accessToken,
      tokenManager,
    }),
  });
}

export function App() {
  const webClipboardProvider = useMemo(() => createBrowserClipboardProvider(), []);
  const webRuntimeUnavailableMessages = useMemo(
    () => resolveWebRuntimeUnavailableMessages(),
    [],
  );
  const webRuntimeConfiguration = resolveWebRuntimeTargetFromEnvironment(
    import.meta.env,
  );
  const webRuntimeClient = useMemo(() => createAuthenticatedWebRuntimeClient(), []);

  return (
    <WebShellApp
      clipboardProvider={webClipboardProvider}
      webRuntimeClient={webRuntimeClient}
      webRuntimeTarget={webRuntimeConfiguration.target}
      webRuntimeUnavailableMessages={webRuntimeUnavailableMessages}
    />
  );
}
