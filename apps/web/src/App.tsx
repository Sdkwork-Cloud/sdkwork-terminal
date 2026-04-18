import { useMemo } from "react";
import { createWebRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";
import {
  ShellApp,
  type TerminalClipboardProvider,
  type WebRuntimeTarget,
} from "@sdkwork/terminal-shell";

export function App() {
  const runtimeBaseUrl = import.meta.env.VITE_TERMINAL_RUNTIME_BASE_URL?.trim();
  const runtimeWorkspaceId = import.meta.env.VITE_TERMINAL_RUNTIME_WORKSPACE_ID?.trim();
  const runtimeAuthority = import.meta.env.VITE_TERMINAL_RUNTIME_AUTHORITY?.trim();
  const runtimeTarget =
    import.meta.env.VITE_TERMINAL_RUNTIME_TARGET?.trim() === "server-runtime-node"
      ? "server-runtime-node"
      : "remote-runtime";
  const runtimeWorkingDirectory =
    import.meta.env.VITE_TERMINAL_RUNTIME_WORKING_DIRECTORY?.trim();

  const webRuntimeClient = useMemo(
    () =>
      createWebRuntimeBridgeClient({
        baseUrl: runtimeBaseUrl || undefined,
      }),
    [runtimeBaseUrl],
  );
  const webClipboardProvider = useMemo<TerminalClipboardProvider>(
    () => ({
      readText: async () => {
        if (typeof navigator === "undefined" || !navigator.clipboard) {
          return "";
        }

        return navigator.clipboard.readText();
      },
      writeText: async (text: string) => {
        if (typeof navigator === "undefined" || !navigator.clipboard) {
          throw new Error("Web clipboard API is unavailable.");
        }

        await navigator.clipboard.writeText(text);
      },
    }),
    [],
  );
  const webRuntimeTarget = useMemo<WebRuntimeTarget | undefined>(() => {
    if (!runtimeWorkspaceId || !runtimeAuthority) {
      return undefined;
    }

    return {
      workspaceId: runtimeWorkspaceId,
      authority: runtimeAuthority,
      target: runtimeTarget,
      workingDirectory: runtimeWorkingDirectory || undefined,
      tags: ["web-shell"],
    };
  }, [runtimeAuthority, runtimeTarget, runtimeWorkingDirectory, runtimeWorkspaceId]);

  return (
    <ShellApp
      mode="web"
      clipboardProvider={webClipboardProvider}
      webRuntimeClient={webRuntimeClient}
      webRuntimeTarget={webRuntimeTarget}
    />
  );
}
