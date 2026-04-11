import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { createDesktopRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";
import { ShellApp } from "@sdkwork/terminal-shell";
import {
  createDesktopConnectorMenuEntries,
  createDesktopConnectorSessionIntent,
  findDesktopConnectorTargetById,
} from "./connector-shell";
import { DesktopSessionCenterOverlay } from "./DesktopSessionCenterOverlay";
import {
  createFallbackDesktopResourceCenterSnapshot,
  loadDesktopResourceCenterSnapshot,
} from "./resource-center";
import { loadDesktopSessionCenterSnapshot } from "./session-center";
import { createDesktopSessionReattachIntent } from "./session-center-shell";

function hasTauriRuntime() {
  return Boolean(
    typeof window !== "undefined" &&
      (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}

function resolveCurrentWindow() {
  return getCurrentWindow();
}

const desktopWindowController = {
  isAvailable: async () => hasTauriRuntime(),
  isMaximized: async () => resolveCurrentWindow().isMaximized(),
  subscribeMaximized: async (listener: (maximized: boolean) => void) => {
    const emitWindowState = async () => {
      listener(await resolveCurrentWindow().isMaximized());
    };

    await emitWindowState();
    const unlistenResize = await resolveCurrentWindow().onResized(() => {
      void emitWindowState();
    });

    return () => {
      void unlistenResize();
    };
  },
  minimize: async () => resolveCurrentWindow().minimize(),
  toggleMaximize: async () => {
    const currentWindow = resolveCurrentWindow();
    if (await currentWindow.isMaximized()) {
      await currentWindow.unmaximize();
      return;
    }

    await currentWindow.maximize();
  },
  close: async () => resolveCurrentWindow().close(),
};

export function App() {
  const [client] = useState(() =>
    createDesktopRuntimeBridgeClient((command, args) => invoke(command, args), listen),
  );
  const [resourceCenterSnapshot, setResourceCenterSnapshot] = useState(() =>
    createFallbackDesktopResourceCenterSnapshot(),
  );
  const [sessionCenterOpen, setSessionCenterOpen] = useState(false);
  const [sessionCenterLoading, setSessionCenterLoading] = useState(false);
  const [sessionCenterError, setSessionCenterError] = useState<string | null>(null);
  const [sessionCenterSnapshot, setSessionCenterSnapshot] = useState<Awaited<
    ReturnType<typeof loadDesktopSessionCenterSnapshot>
  > | null>(null);
  const [reattachingSessionIds, setReattachingSessionIds] = useState<string[]>([]);
  const [desktopSessionReattachIntent, setDesktopSessionReattachIntent] = useState<
    ReturnType<typeof createDesktopSessionReattachIntent> | null
  >(null);
  const [desktopConnectorSessionIntent, setDesktopConnectorSessionIntent] = useState<
    ReturnType<typeof createDesktopConnectorSessionIntent> | null
  >(null);
  const desktopConnectorEntries = createDesktopConnectorMenuEntries(resourceCenterSnapshot);

  async function refreshResourceCenterSnapshot() {
    try {
      const snapshot = await loadDesktopResourceCenterSnapshot(client);
      setResourceCenterSnapshot(snapshot);
    } catch {
      setResourceCenterSnapshot(createFallbackDesktopResourceCenterSnapshot());
    }
  }

  async function refreshSessionCenterSnapshot() {
    setSessionCenterLoading(true);
    setSessionCenterError(null);

    try {
      const snapshot = await loadDesktopSessionCenterSnapshot(client);
      setSessionCenterSnapshot(snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSessionCenterError(message);
    } finally {
      setSessionCenterLoading(false);
    }
  }

  useEffect(() => {
    void refreshResourceCenterSnapshot();
  }, []);

  useEffect(() => {
    if (!sessionCenterOpen) {
      return;
    }

    void refreshSessionCenterSnapshot();
  }, [sessionCenterOpen]);

  async function handleReattachSession(sessionId: string) {
    setSessionCenterError(null);
    setReattachingSessionIds((current) =>
      current.includes(sessionId) ? current : [...current, sessionId],
    );

    try {
      const attachment = await client.reattachSession({ sessionId });
      setDesktopSessionReattachIntent(createDesktopSessionReattachIntent(attachment));
      setSessionCenterOpen(false);
      const snapshot = await loadDesktopSessionCenterSnapshot(client);
      setSessionCenterSnapshot(snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSessionCenterError(message);
    } finally {
      setReattachingSessionIds((current) => current.filter((entry) => entry !== sessionId));
    }
  }

  function handleLaunchDesktopConnectorEntry(entryId: string) {
    const target = findDesktopConnectorTargetById(entryId, resourceCenterSnapshot);
    if (!target) {
      return;
    }

    setDesktopConnectorSessionIntent(createDesktopConnectorSessionIntent(target));
  }

  return (
    <div style={appRootStyle}>
      <ShellApp
        mode="desktop"
        desktopWindowController={desktopWindowController}
        desktopRuntimeClient={client}
        desktopConnectorEntries={desktopConnectorEntries}
        sessionCenterEnabled
        sessionCenterOpen={sessionCenterOpen}
        onToggleSessionCenter={() => {
          setSessionCenterError(null);
          setSessionCenterOpen((current) => !current);
        }}
        desktopSessionReattachIntent={desktopSessionReattachIntent}
        desktopConnectorSessionIntent={desktopConnectorSessionIntent}
        onLaunchDesktopConnectorEntry={(entryId) => {
          handleLaunchDesktopConnectorEntry(entryId);
        }}
        onBeforeProfileMenuOpen={() => {
          void refreshResourceCenterSnapshot();
        }}
      />
      <DesktopSessionCenterOverlay
        open={sessionCenterOpen}
        loading={sessionCenterLoading}
        error={sessionCenterError}
        snapshot={sessionCenterSnapshot}
        reattachingSessionIds={reattachingSessionIds}
        onClose={() => setSessionCenterOpen(false)}
        onRefresh={() => {
          void refreshSessionCenterSnapshot();
        }}
        onReattach={(sessionId) => {
          void handleReattachSession(sessionId);
        }}
      />
    </div>
  );
}

const appRootStyle = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
} as const;
