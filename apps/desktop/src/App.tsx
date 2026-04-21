import { getBundleType } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import {
  extractErrorMessage,
  isIgnorableTauriCallbackLifecycleErrorMessage,
} from "@sdkwork/terminal-commons";
import { createDesktopRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";
import { DesktopShellApp } from "@sdkwork/terminal-shell/integration";
import type {
  DesktopTerminalLaunchPlan,
  TerminalLaunchProjectCollection,
  TerminalLaunchProjectActivationEvent,
  TerminalLaunchProject,
  TerminalLaunchProjectResolutionRequest,
} from "@sdkwork/terminal-shell";
import {
  createDesktopConnectorMenuEntries,
  createDesktopConnectorSessionIntent,
  findDesktopConnectorTargetById,
} from "./connector-shell";
import {
  clearRecentLaunchProjects,
  createRecentLaunchProjectFromActivationEvent,
  mergeRecentLaunchProject,
  readRecentLaunchProjects,
  removeRecentLaunchProject,
  resolveDesktopLaunchProjectCollection,
  writeRecentLaunchProjects,
} from "./launch-projects";
import { DesktopSessionCenterOverlay } from "./DesktopSessionCenterOverlay";
import {
  createEmptyDesktopResourceCenterSnapshot,
  loadDesktopResourceCenterSnapshot,
} from "./resource-center";
import {
  applyDesktopResourceCatalogRefreshFailure,
  applyDesktopResourceCatalogRefreshSuccess,
  createDesktopResourceCatalogState,
  type DesktopResourceCatalogState,
  type DesktopResourceCatalogStatus,
} from "./resource-catalog-state";
import {
  DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT,
  resolveSessionReplayPreloadLimit,
  type SessionReplayPreloadAction,
} from "./session-replay-preload-policy";
import { resolveQueuedSessionCenterRefreshAction } from "./session-center-refresh-policy";
import { loadDesktopSessionCenterSnapshot } from "./session-center";
import { createDesktopSessionReattachIntent } from "./session-center-shell";

type DesktopSessionCenterSnapshot = Awaited<ReturnType<typeof loadDesktopSessionCenterSnapshot>>;
const DESKTOP_VIEWPORT_METRICS_EVENT = "sdkwork-terminal:viewport-metrics-changed";
const DESKTOP_RESOURCE_CATALOG_REFRESH_TTL_MS = 30_000;
const PACKAGED_DESKTOP_BUNDLE_TYPES = new Set([
  "nsis",
  "msi",
  "deb",
  "rpm",
  "appimage",
  "app",
]);

function hasTauriRuntime() {
  return Boolean(
    typeof window !== "undefined" &&
      (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}

function runDesktopLifecycleCleanup(callback: () => void | Promise<void>) {
  void Promise.resolve()
    .then(callback)
    .catch((error) => {
      const message = extractErrorMessage(error);
      if (isIgnorableTauriCallbackLifecycleErrorMessage(message)) {
        return;
      }

      console.error("[sdkwork-terminal] desktop cleanup callback failed", error);
    });
}

function resolveCurrentWindow() {
  return getCurrentWindow();
}

function resolveCurrentWebview() {
  return getCurrentWebview();
}

function dispatchDesktopViewportMetricsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(DESKTOP_VIEWPORT_METRICS_EVENT));
}

interface DesktopWorkingDirectoryPickerRequest {
  defaultPath?: string | null;
  title?: string;
}

export interface DesktopTerminalAppProps<TLaunchRequest = never> {
  launchRequest?: TLaunchRequest | null;
  launchRequestKey?: string | number | null;
  launchProjects?: readonly TerminalLaunchProject[];
  resolveLaunchProjects?: (
    request: TerminalLaunchProjectResolutionRequest,
  ) =>
    | Promise<TerminalLaunchProjectCollection | readonly TerminalLaunchProject[] | null | undefined>
    | TerminalLaunchProjectCollection
    | readonly TerminalLaunchProject[]
    | null
    | undefined;
  resolveLaunchPlan?: (
    launchRequest: TLaunchRequest,
  ) =>
    | Promise<DesktopTerminalLaunchPlan | null | undefined>
    | DesktopTerminalLaunchPlan
    | null
    | undefined;
  onLaunchProjectActivated?: (event: TerminalLaunchProjectActivationEvent) => void;
  onLaunchError?: (message: string) => void;
  onRuntimeUnavailable?: () => void;
  showWindowControls?: boolean;
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
      runDesktopLifecycleCleanup(unlistenResize);
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

export function DesktopTerminalApp<TLaunchRequest = never>(
  props: DesktopTerminalAppProps<TLaunchRequest> = {},
) {
  const initialResourceCatalogState = createDesktopResourceCatalogState();
  const desktopRuntimeAvailable = hasTauriRuntime();
  const [client] = useState(() =>
    createDesktopRuntimeBridgeClient((command, args) => invoke(command, args), listen),
  );
  const [resourceCenterSnapshot, setResourceCenterSnapshot] = useState(() =>
    initialResourceCatalogState.snapshot,
  );
  const [recentLaunchProjects, setRecentLaunchProjects] = useState<TerminalLaunchProject[]>(
    () => readRecentLaunchProjects(),
  );
  const [resourceCatalogStatus, setResourceCatalogStatus] = useState<DesktopResourceCatalogStatus>(
    initialResourceCatalogState.status,
  );
  const [resourceCatalogError, setResourceCatalogError] = useState<string | null>(
    initialResourceCatalogState.error,
  );
  const [sessionCenterOpen, setSessionCenterOpen] = useState(false);
  const [sessionCenterLoading, setSessionCenterLoading] = useState(false);
  const [sessionCenterError, setSessionCenterError] = useState<string | null>(null);
  const [sessionCenterSnapshot, setSessionCenterSnapshot] = useState<DesktopSessionCenterSnapshot | null>(null);
  const [reattachingSessionIds, setReattachingSessionIds] = useState<string[]>([]);
  const [desktopSessionReattachIntent, setDesktopSessionReattachIntent] = useState<
    ReturnType<typeof createDesktopSessionReattachIntent> | null
  >(null);
  const [desktopConnectorSessionIntent, setDesktopConnectorSessionIntent] = useState<
    ReturnType<typeof createDesktopConnectorSessionIntent> | null
  >(null);
  const resourceCatalogStateRef = useRef<DesktopResourceCatalogState>(initialResourceCatalogState);
  const resourceCatalogRefreshRequestIdRef = useRef(0);
  const resourceCatalogRefreshInFlightRef = useRef(false);
  const resourceCatalogRefreshPendingRef = useRef(false);
  const resourceCatalogLastSuccessAtRef = useRef(0);
  const sessionCenterRefreshRequestIdRef = useRef(0);
  const sessionCenterRefreshInFlightRef = useRef(false);
  const sessionCenterRefreshActiveActionRef = useRef<SessionReplayPreloadAction | null>(null);
  const sessionCenterRefreshPendingActionRef = useRef<SessionReplayPreloadAction | null>(null);
  const sessionCenterOpenRef = useRef(sessionCenterOpen);
  const sessionCenterSnapshotRef = useRef<DesktopSessionCenterSnapshot | null>(null);
  const sessionReplayPreloadLimitRef = useRef(DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT);
  const sessionCenterLoadingRef = useRef(false);
  const handledLaunchRequestKeyRef = useRef<string | number | null>(null);
  const runtimeUnavailableLaunchRequestKeyRef = useRef<string | number | null>(null);
  const requestSequenceRef = useRef(0);
  const desktopClipboardProvider = useRef({
    readText: () => client.readClipboardText(),
    writeText: (text: string) => client.writeClipboardText(text),
  }).current;
  const desktopWorkingDirectoryPicker = useRef(
    (options: DesktopWorkingDirectoryPickerRequest) =>
      invoke<string | null>("desktop_pick_working_directory", {
        request: {
          defaultPath: options.defaultPath ?? null,
          title: options.title,
        },
      }),
  ).current;
  const desktopConnectorEntries = createDesktopConnectorMenuEntries(resourceCenterSnapshot);
  const sessionReplayStatusCounts = sessionCenterSnapshot
    ? {
      totalSessions: sessionCenterSnapshot.counts.totalSessions,
      loadedReplayCount: sessionCenterSnapshot.counts.loadedReplayCount,
      deferredReplayCount: sessionCenterSnapshot.counts.deferredReplayCount,
      unavailableReplayCount: sessionCenterSnapshot.counts.unavailableReplayCount,
    }
    : undefined;

  function getResourceCatalogState(): DesktopResourceCatalogState {
    return resourceCatalogStateRef.current;
  }

  function applyResourceCatalogState(nextState: DesktopResourceCatalogState) {
    resourceCatalogStateRef.current = nextState;
    setResourceCenterSnapshot(nextState.snapshot);
    setResourceCatalogStatus(nextState.status);
    setResourceCatalogError(nextState.error);
  }

  async function refreshResourceCenterSnapshot(force = false) {
    if (
      !force &&
      resourceCatalogLastSuccessAtRef.current > 0 &&
      Date.now() - resourceCatalogLastSuccessAtRef.current < DESKTOP_RESOURCE_CATALOG_REFRESH_TTL_MS
    ) {
      return;
    }

    if (resourceCatalogRefreshInFlightRef.current) {
      resourceCatalogRefreshPendingRef.current = true;
      return;
    }

    resourceCatalogRefreshInFlightRef.current = true;
    const refreshRequestId = resourceCatalogRefreshRequestIdRef.current + 1;
    resourceCatalogRefreshRequestIdRef.current = refreshRequestId;
    let resourceCatalogRefreshSucceeded = false;

    try {
      const snapshot = await loadDesktopResourceCenterSnapshot(client);
      if (refreshRequestId !== resourceCatalogRefreshRequestIdRef.current) {
        return;
      }

      const nextState = applyDesktopResourceCatalogRefreshSuccess(
        getResourceCatalogState(),
        snapshot,
      );
      applyResourceCatalogState(nextState);
      resourceCatalogRefreshSucceeded = true;
    } catch (cause) {
      if (refreshRequestId !== resourceCatalogRefreshRequestIdRef.current) {
        return;
      }

      const nextState = applyDesktopResourceCatalogRefreshFailure(
        getResourceCatalogState(),
        cause,
      );
      applyResourceCatalogState({
        ...nextState,
        snapshot: nextState.snapshot.targets.length
          ? nextState.snapshot
          : createEmptyDesktopResourceCenterSnapshot(),
      });
    } finally {
      if (resourceCatalogRefreshSucceeded) {
        resourceCatalogLastSuccessAtRef.current = Date.now();
      }
      resourceCatalogRefreshInFlightRef.current = false;
      if (resourceCatalogRefreshPendingRef.current) {
        resourceCatalogRefreshPendingRef.current = false;
        void refreshResourceCenterSnapshot(true);
      }
    }
  }

  async function refreshSessionCenterSnapshot(
    action: SessionReplayPreloadAction = "refresh",
  ) {
    if (sessionCenterRefreshInFlightRef.current) {
      sessionCenterRefreshPendingActionRef.current = resolveQueuedSessionCenterRefreshAction({
        current: sessionCenterRefreshPendingActionRef.current,
        next: action,
        active: sessionCenterRefreshActiveActionRef.current,
      });
      return;
    }

    if (action === "load-more" && sessionCenterLoadingRef.current) {
      return;
    }

    const snapshot = sessionCenterSnapshotRef.current;
    const deferredReplayCount = snapshot?.counts.deferredReplayCount ?? 0;
    const totalSessions = snapshot?.counts.totalSessions ?? 0;
    if (action === "load-more" && deferredReplayCount <= 0) {
      return;
    }

    const hasDeferredReplay = deferredReplayCount > 0;
    const loading = sessionCenterLoadingRef.current;
    sessionReplayPreloadLimitRef.current = resolveSessionReplayPreloadLimit({
      action,
      currentLimit: sessionReplayPreloadLimitRef.current,
      totalSessions,
      deferredReplayCount: hasDeferredReplay ? deferredReplayCount : 0,
      loading,
    });

    sessionCenterRefreshInFlightRef.current = true;
    sessionCenterRefreshActiveActionRef.current = action;
    const refreshRequestId = sessionCenterRefreshRequestIdRef.current + 1;
    sessionCenterRefreshRequestIdRef.current = refreshRequestId;
    setSessionCenterLoading(true);
    sessionCenterLoadingRef.current = true;
    setSessionCenterError(null);

    try {
      const nextSnapshot = await loadDesktopSessionCenterSnapshot(client, {
        replayPreloadLimit: sessionReplayPreloadLimitRef.current,
      });
      if (refreshRequestId !== sessionCenterRefreshRequestIdRef.current) {
        return;
      }

      sessionCenterSnapshotRef.current = nextSnapshot;
      setSessionCenterSnapshot(nextSnapshot);
    } catch (error) {
      if (refreshRequestId !== sessionCenterRefreshRequestIdRef.current) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      setSessionCenterError(message);
    } finally {
      if (refreshRequestId === sessionCenterRefreshRequestIdRef.current) {
        setSessionCenterLoading(false);
        sessionCenterLoadingRef.current = false;
      }
      sessionCenterRefreshInFlightRef.current = false;
      sessionCenterRefreshActiveActionRef.current = null;
      const pendingAction = sessionCenterRefreshPendingActionRef.current;
      if (!sessionCenterOpenRef.current) {
        sessionCenterRefreshPendingActionRef.current = null;
      } else if (pendingAction) {
        sessionCenterRefreshPendingActionRef.current = null;
        void refreshSessionCenterSnapshot(pendingAction);
      }
    }
  }

  function closeSessionCenter() {
    sessionCenterOpenRef.current = false;
    sessionCenterRefreshPendingActionRef.current = null;
    setSessionCenterOpen(false);
  }

  useEffect(() => {
    sessionCenterOpenRef.current = sessionCenterOpen;
    if (!sessionCenterOpen) {
      sessionCenterRefreshPendingActionRef.current = null;
      return;
    }

    void refreshSessionCenterSnapshot("open");
  }, [sessionCenterOpen]);

  useEffect(() => {
    const launchRequest = props.launchRequest;
    const launchRequestKey = props.launchRequestKey ?? null;
    if (!launchRequest || launchRequestKey === null || !props.resolveLaunchPlan) {
      return;
    }

    if (handledLaunchRequestKeyRef.current === launchRequestKey) {
      return;
    }

    if (!desktopRuntimeAvailable) {
      if (runtimeUnavailableLaunchRequestKeyRef.current !== launchRequestKey) {
        runtimeUnavailableLaunchRequestKeyRef.current = launchRequestKey;
        props.onRuntimeUnavailable?.();
      }
      return;
    }

    runtimeUnavailableLaunchRequestKeyRef.current = null;
    handledLaunchRequestKeyRef.current = launchRequestKey;

    let cancelled = false;

    void (async () => {
      try {
        const launchPlan = await props.resolveLaunchPlan?.(launchRequest);
        if (!launchPlan) {
          return;
        }

        const session =
          launchPlan.kind === "local-process"
            ? await client.createLocalProcessSession(launchPlan.localProcessRequest!)
            : await client.createLocalShellSession(launchPlan.localShellRequest!);

        if (cancelled) {
          return;
        }

        requestSequenceRef.current += 1;
        setDesktopSessionReattachIntent({
          requestId: `terminal-request:${String(launchRequestKey)}:${requestSequenceRef.current}`,
          sessionId: session.sessionId,
          attachmentId: session.attachmentId ?? "",
          cursor: session.cursor ?? "0",
          profile: launchPlan.profile,
          title: launchPlan.title,
          targetLabel: launchPlan.targetLabel,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        props.onLaunchError?.(message || "Failed to launch terminal session.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    client,
    desktopRuntimeAvailable,
    props.launchRequest,
    props.launchRequestKey,
    props.onLaunchError,
    props.onRuntimeUnavailable,
    props.resolveLaunchPlan,
  ]);

  useEffect(() => {
    if (!hasTauriRuntime()) {
      return;
    }

    let cancelled = false;
    let animationFrameHandle: number | null = null;
    const unlistenCallbacks: Array<() => void> = [];

    const cancelScheduledViewportMetricsDispatch = () => {
      if (typeof window === "undefined" || animationFrameHandle === null) {
        return;
      }

      window.cancelAnimationFrame(animationFrameHandle);
      animationFrameHandle = null;
    };

    const scheduleViewportMetricsDispatch = () => {
      if (cancelled || typeof window === "undefined") {
        return;
      }

      cancelScheduledViewportMetricsDispatch();
      animationFrameHandle = window.requestAnimationFrame(() => {
        animationFrameHandle = null;
        dispatchDesktopViewportMetricsChanged();
      });
    };

    const registerUnlisten = (unlisten: () => void | Promise<void>) => {
      if (cancelled) {
        runDesktopLifecycleCleanup(unlisten);
        return;
      }

      unlistenCallbacks.push(() => {
        runDesktopLifecycleCleanup(unlisten);
      });
    };

    void (async () => {
      let packagedBuild = false;
      try {
        packagedBuild = PACKAGED_DESKTOP_BUNDLE_TYPES.has(await getBundleType());
      } catch {
        packagedBuild = false;
      }

      if (cancelled || !packagedBuild) {
        return;
      }

      const currentWindow = resolveCurrentWindow();
      const normalizePackagedDesktopViewport = async () => {
        try {
          await resolveCurrentWebview().setZoom(1);
        } catch (error) {
          console.warn("[sdkwork-terminal] failed to normalize packaged webview zoom", error);
        } finally {
          scheduleViewportMetricsDispatch();
        }
      };

      await normalizePackagedDesktopViewport();

      registerUnlisten(
        await currentWindow.onResized(() => {
          scheduleViewportMetricsDispatch();
        }),
      );

      registerUnlisten(
        await currentWindow.onScaleChanged(() => {
          void normalizePackagedDesktopViewport();
        }),
      );

      registerUnlisten(
        await currentWindow.onFocusChanged(({ payload: focused }) => {
          if (focused) {
            scheduleViewportMetricsDispatch();
          }
        }),
      );
    })();

    return () => {
      cancelled = true;
      cancelScheduledViewportMetricsDispatch();
      for (const unlisten of unlistenCallbacks) {
        unlisten();
      }
    };
  }, []);

  async function handleReattachSession(sessionId: string) {
    setSessionCenterError(null);
    setReattachingSessionIds((current) =>
      current.includes(sessionId) ? current : [...current, sessionId],
    );

    try {
      const attachment = await client.reattachSession({ sessionId });
      setDesktopSessionReattachIntent(createDesktopSessionReattachIntent(attachment));
      closeSessionCenter();
      await refreshSessionCenterSnapshot();
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

  async function resolveDesktopLaunchProjects(
    request: TerminalLaunchProjectResolutionRequest,
  ) {
    return resolveDesktopLaunchProjectCollection({
      request,
      resolveLaunchProjects: props.resolveLaunchProjects,
      launchProjects: props.launchProjects,
      recentLaunchProjects,
    });
  }

  function handleLaunchProjectActivated(event: TerminalLaunchProjectActivationEvent) {
    const nextProject = createRecentLaunchProjectFromActivationEvent(event);
    if (!nextProject) {
      return;
    }

    setRecentLaunchProjects((current) => {
      const nextProjects = mergeRecentLaunchProject(current, nextProject);
      writeRecentLaunchProjects(nextProjects);
      return nextProjects;
    });
    props.onLaunchProjectActivated?.(event);
  }

  return (
    <div style={appRootStyle}>
      <DesktopShellApp
        clipboardProvider={desktopClipboardProvider}
        desktopWindowController={props.showWindowControls === false ? undefined : desktopWindowController}
        desktopRuntimeClient={client}
        resolveLaunchProjects={resolveDesktopLaunchProjects}
        onLaunchProjectActivated={handleLaunchProjectActivated}
        onRemoveLaunchProject={(event) => {
          if (event.source !== "recent") {
            return;
          }

          setRecentLaunchProjects((current) => {
            const nextProjects = removeRecentLaunchProject(current, event.project);
            writeRecentLaunchProjects(nextProjects);
            return nextProjects;
          });
        }}
        onClearLaunchProjects={(event) => {
          if (event.source !== "recent") {
            return;
          }

          setRecentLaunchProjects(() => {
            const nextProjects = clearRecentLaunchProjects();
            writeRecentLaunchProjects(nextProjects);
            return nextProjects;
          });
        }}
        desktopConnectorEntries={desktopConnectorEntries}
        desktopConnectorCatalogStatus={{
          state: resourceCatalogStatus,
          message: resourceCatalogError,
        }}
        sessionCenterEnabled
        sessionCenterOpen={sessionCenterOpen}
        sessionCenterReplayDiagnostics={sessionReplayStatusCounts}
        onToggleSessionCenter={() => {
          setSessionCenterError(null);
          setSessionCenterOpen((current) => {
            const next = !current;
            sessionCenterOpenRef.current = next;
            if (!next) {
              sessionCenterRefreshPendingActionRef.current = null;
            }
            return next;
          });
        }}
        desktopSessionReattachIntent={desktopSessionReattachIntent}
        desktopConnectorSessionIntent={desktopConnectorSessionIntent}
        onLaunchDesktopConnectorEntry={(entryId) => {
          handleLaunchDesktopConnectorEntry(entryId);
        }}
        onPickWorkingDirectory={desktopWorkingDirectoryPicker}
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
        onClose={closeSessionCenter}
        onRefresh={() => {
          void refreshSessionCenterSnapshot("refresh");
        }}
        onLoadMoreReplay={() => {
          void refreshSessionCenterSnapshot("load-more");
        }}
        onReattach={(sessionId) => {
          void handleReattachSession(sessionId);
        }}
      />
    </div>
  );
}

export function App() {
  return <DesktopTerminalApp />;
}

const appRootStyle = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
} as const;
