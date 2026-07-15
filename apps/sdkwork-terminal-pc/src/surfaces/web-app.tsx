import { useMemo } from "react";
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

export function App() {
  const webClipboardProvider = useMemo(() => createBrowserClipboardProvider(), []);
  const webRuntimeUnavailableMessages = useMemo(
    () => resolveWebRuntimeUnavailableMessages(),
    [],
  );
  const webRuntimeConfiguration = resolveWebRuntimeTargetFromEnvironment(
    import.meta.env,
  );

  return (
    <WebShellApp
      clipboardProvider={webClipboardProvider}
      webRuntimeTarget={webRuntimeConfiguration.target}
      webRuntimeUnavailableMessages={webRuntimeUnavailableMessages}
    />
  );
}
