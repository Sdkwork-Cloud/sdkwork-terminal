import { useMemo } from "react";
import { createWebRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";
import { ShellApp, type WebRuntimeTarget } from "@sdkwork/terminal-shell";

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
      webRuntimeClient={webRuntimeClient}
      webRuntimeTarget={webRuntimeTarget}
    />
  );
}
