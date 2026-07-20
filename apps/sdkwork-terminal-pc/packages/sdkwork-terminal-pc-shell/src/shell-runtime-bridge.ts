import { useEffect } from "react";
import {
  applyTerminalShellReplayEntries,
  setTerminalShellRuntimeConnectionState,
  type TerminalShellPendingRuntimeInput,
  type TerminalShellSnapshot,
} from "./model";
import {
  createRuntimeDerivedState,
  type RuntimeDerivedState,
} from "./runtime-derived-state.ts";
import {
  applyDesktopConnectorIntent as applyDesktopConnectorIntentController,
  applyDesktopSessionReattachIntent as applyDesktopSessionReattachIntentController,
  applyWebRuntimeSessionIntent as applyWebRuntimeSessionIntentController,
} from "./launch-controller.ts";
import {
  cleanupRuntimeEffects as cleanupRuntimeEffectsController,
  clearRuntimeBootstrapRetryTimer as clearRuntimeBootstrapRetryTimerController,
  dispatchLiveRuntimeInput as dispatchLiveRuntimeInputController,
  flushPendingRuntimeInputs as flushPendingRuntimeInputsController,
  processRuntimeBootstrapCandidates as processRuntimeBootstrapCandidatesController,
  syncRetryingRuntimeTabs as syncRetryingRuntimeTabsController,
} from "./runtime-effects.ts";
import {
  resolveTabRuntimeClient,
  type RuntimeClientResolverArgs,
} from "./runtime-orchestration.ts";
import type { RuntimeResizeScheduler } from "./runtime-resize-scheduler.ts";
import type {
  RuntimeTabController,
  RuntimeTabControllerConnectionState,
} from "./runtime-tab-controller.ts";
import type { UpdateShellState } from "./shell-state-bridge.ts";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
import type { SharedRuntimeClient } from "./terminal-stage-shared.ts";

interface MutableRefObjectLike<T> {
  current: T;
}

interface RuntimeControllerStoreLike {
  getOrCreate?: (tabId: string) => Pick<RuntimeTabController, "requestTransportRecovery">;
  syncTabs: (tabIds: string[]) => Promise<void>;
  disposeAll: () => Promise<void>;
}

type DesktopRuntimeClientLike = NonNullable<
  RuntimeClientResolverArgs["desktopRuntimeClient"]
> & {
  detachSessionAttachment?: (request: {
    attachmentId: string;
  }) => Promise<unknown>;
};

export interface UseShellRuntimeBridgeArgs {
  mode: RuntimeClientResolverArgs["mode"];
  snapshot: TerminalShellSnapshot;
  activeTab: TerminalShellSnapshot["activeTab"];
  runtimeDerivedState: RuntimeDerivedState;
  retryingTabsEffectKey: string;
  runtimeBootstrapEffectKey: string;
  runtimePendingInputEffectKey: string;
  desktopRuntimeClient?: DesktopRuntimeClientLike;
  webRuntimeClient?: RuntimeClientResolverArgs["webRuntimeClient"];
  desktopRuntimeClientRef: MutableRefObjectLike<DesktopRuntimeClientLike | undefined>;
  webRuntimeClientRef: MutableRefObjectLike<RuntimeClientResolverArgs["webRuntimeClient"]>;
  mountedRef: MutableRefObjectLike<boolean>;
  latestSnapshotRef: MutableRefObjectLike<TerminalShellSnapshot | null>;
  handledDesktopSessionReattachIntentIdRef: MutableRefObjectLike<string | null>;
  handledDesktopConnectorSessionIntentIdRef: MutableRefObjectLike<string | null>;
  handledWebRuntimeSessionIntentIdRef: MutableRefObjectLike<string | null>;
  runtimeBootstrapRetryTimersRef: MutableRefObjectLike<Map<string, number>>;
  viewportCopyHandlersRef: MutableRefObjectLike<Map<string, () => Promise<void>>>;
  viewportPasteHandlersRef: MutableRefObjectLike<
    Map<string, (text: string) => Promise<void>>
  >;
  bootstrappingRuntimeTabIdsRef: MutableRefObjectLike<Set<string>>;
  flushingRuntimeInputTabIdsRef: MutableRefObjectLike<Set<string>>;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  runtimeResizeSchedulerRef: MutableRefObjectLike<RuntimeResizeScheduler>;
  runtimeControllerStoreRef: MutableRefObjectLike<RuntimeControllerStoreLike>;
  desktopSessionReattachIntent?: {
    requestId: string;
    sessionId: string;
    attachmentId: string;
    cursor: string;
    profile: "powershell" | "bash" | "shell";
    title: string;
    targetLabel: string;
  } | null;
  desktopConnectorSessionIntent?: {
    requestId: string;
    profile: "powershell" | "bash" | "shell";
    title: string;
    targetLabel: string;
    request: {
      workspaceId: string;
      target: "ssh" | "docker-exec" | "kubernetes-exec";
      authority: string;
      command: string[];
      modeTags: ("cli-native")[];
      tags: string[];
    };
  } | null;
  webRuntimeSessionIntent?: {
    requestId: string;
    profile: "powershell" | "bash" | "shell";
    title: string;
    targetLabel: string;
    request: {
      projectId: string;
      runtimeLocationId: string;
      command: string[];
      cols?: number;
      rows?: number;
      modeTags: ("cli-native")[];
      tags: string[];
    };
  } | null;
  setProfileMenuOpen: (open: boolean) => void;
  setContextMenu: (state: import("./terminal-overlays.tsx").TerminalTabContextMenuState | null) => void;
  updateShellState: UpdateShellState;
  updateShellStateDeferred: UpdateShellState;
}

export function useShellRuntimeBridge(args: UseShellRuntimeBridgeArgs) {
  function requestRuntimeTransportRecovery(argsForFailure: {
    tabId: string;
    sessionId: string;
  }) {
    args.runtimeControllerStoreRef.current
      .getOrCreate?.(argsForFailure.tabId)
      .requestTransportRecovery(argsForFailure.sessionId);
  }

  function clearRuntimeBootstrapRetryTimer(tabId: string) {
    clearRuntimeBootstrapRetryTimerController({
      tabId,
      runtimeBootstrapRetryTimersRef: args.runtimeBootstrapRetryTimersRef,
    });
  }

  function dispatchLiveRuntimeInput(dispatchArgs: {
    tabId: string;
    sessionId: string;
    client: SharedRuntimeClient;
    input: TerminalShellPendingRuntimeInput;
  }) {
    dispatchLiveRuntimeInputController({
      ...dispatchArgs,
      mountedRef: args.mountedRef,
      runtimeInputWriteChainsRef: args.runtimeInputWriteChainsRef,
      runtimeInputWriteGenerationsRef: args.runtimeInputWriteGenerationsRef,
      updateShellStateDeferred: args.updateShellStateDeferred,
      onRuntimeTransportFailure: requestRuntimeTransportRecovery,
    });
  }

  function handleRuntimeReplayByTabId(
    tabId: string,
    replay: {
      sessionId: string;
      nextCursor: string;
      entries: Parameters<typeof applyTerminalShellReplayEntries>[2]["entries"];
    },
  ) {
    if (replay.entries.length === 0) {
      return;
    }

    args.updateShellStateDeferred((current) =>
      applyTerminalShellReplayEntries(current, tabId, replay),
    );
  }

  function handleRuntimeConnectionStateByTabId(
    tabId: string,
    connection: {
      sessionId: string;
      state: RuntimeTabControllerConnectionState;
    },
  ) {
    const currentTab = args.latestSnapshotRef.current?.tabs.find(
      (tab) => tab.id === tabId,
    );
    if (
      connection.state === "connected" &&
      currentTab?.runtimeSessionId === connection.sessionId
    ) {
      args.runtimeResizeSchedulerRef.current.invalidateAppliedResize(tabId);
    }

    args.updateShellStateDeferred((current) =>
      setTerminalShellRuntimeConnectionState(current, tabId, {
        sessionId: connection.sessionId,
        connectionState: connection.state,
      }),
    );
  }

  const activeViewportCols = args.activeTab.snapshot.viewport.cols;
  const activeViewportRows = args.activeTab.snapshot.viewport.rows;

  useEffect(() => {
    applyDesktopSessionReattachIntentController({
      mode: args.mode,
      intent: args.desktopSessionReattachIntent,
      activeViewport: {
        cols: activeViewportCols,
        rows: activeViewportRows,
      },
      handledIntentIdRef: args.handledDesktopSessionReattachIntentIdRef,
      setProfileMenuOpen: args.setProfileMenuOpen,
      setContextMenu: args.setContextMenu,
      updateShellState: args.updateShellState,
    });
  }, [
    activeViewportCols,
    activeViewportRows,
    args.desktopSessionReattachIntent,
    args.mode,
  ]);

  useEffect(() => {
    applyDesktopConnectorIntentController({
      mode: args.mode,
      intent: args.desktopConnectorSessionIntent,
      activeViewport: {
        cols: activeViewportCols,
        rows: activeViewportRows,
      },
      handledIntentIdRef: args.handledDesktopConnectorSessionIntentIdRef,
      setProfileMenuOpen: args.setProfileMenuOpen,
      setContextMenu: args.setContextMenu,
      updateShellState: args.updateShellState,
    });
  }, [
    activeViewportCols,
    activeViewportRows,
    args.desktopConnectorSessionIntent,
    args.mode,
  ]);

  useEffect(() => {
    args.runtimeResizeSchedulerRef.current.syncTabs(args.runtimeDerivedState.tabIds);
    runTerminalTaskBestEffort(
      () =>
        args.runtimeControllerStoreRef.current.syncTabs(
          args.runtimeDerivedState.tabIds,
        ),
      (error) => {
        console.error("[sdkwork-terminal] failed to sync runtime controllers", error);
      },
    );
  }, [args.runtimeDerivedState.tabIdsEffectKey]);

  useEffect(() => {
    return () => {
      args.mountedRef.current = false;
      cleanupRuntimeEffectsController({
        latestSnapshot: args.latestSnapshotRef.current,
        desktopRuntimeClient: args.desktopRuntimeClientRef.current,
        runtimeBootstrapRetryTimersRef: args.runtimeBootstrapRetryTimersRef,
        viewportCopyHandlersRef: args.viewportCopyHandlersRef,
        viewportPasteHandlersRef: args.viewportPasteHandlersRef,
        runtimeInputWriteChainsRef: args.runtimeInputWriteChainsRef,
        runtimeInputWriteGenerationsRef: args.runtimeInputWriteGenerationsRef,
        runtimeResizeScheduler: args.runtimeResizeSchedulerRef.current,
        runtimeControllerStore: args.runtimeControllerStoreRef.current,
      });
    };
  }, []);

  useEffect(() => {
    syncRetryingRuntimeTabsController({
      snapshotTabs: args.snapshot.tabs,
      runtimeBootstrapRetryTimersRef: args.runtimeBootstrapRetryTimersRef,
    });
  }, [args.retryingTabsEffectKey]);

  useEffect(() => {
    processRuntimeBootstrapCandidatesController({
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
      mountedRef: args.mountedRef,
      bootstrappingRuntimeTabIdsRef: args.bootstrappingRuntimeTabIdsRef,
      runtimeBootstrapRetryTimersRef: args.runtimeBootstrapRetryTimersRef,
      runtimeDerivedState: args.runtimeDerivedState,
      updateShellStateDeferred: args.updateShellStateDeferred,
    });
  }, [
    args.desktopRuntimeClient,
    args.mode,
    args.runtimeBootstrapEffectKey,
    args.webRuntimeClient,
  ]);

  useEffect(() => {
    if (
      args.activeTab.runtimeConnectionState === "reconnecting" ||
      args.activeTab.runtimeConnectionState === "degraded"
    ) {
      args.runtimeResizeSchedulerRef.current.cancel(args.activeTab.id);
      return;
    }

    const runtimeClient = resolveTabRuntimeClient({
      mode: args.mode,
      runtimeBootstrap: args.activeTab.runtimeBootstrap,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
    args.runtimeResizeSchedulerRef.current.schedule({
      tabId: args.activeTab.id,
      sessionId: args.activeTab.runtimeSessionId,
      runtimeState: args.activeTab.runtimeState,
      viewport: {
        cols: activeViewportCols,
        rows: activeViewportRows,
      },
      runtimeClient,
      mountedRef: args.mountedRef,
      updateShellStateDeferred: args.updateShellStateDeferred,
      onRuntimeTransportFailure: requestRuntimeTransportRecovery,
    });
  }, [
    args.activeTab.id,
    args.activeTab.runtimeConnectionState,
    args.activeTab.runtimeSessionId,
    args.activeTab.runtimeState,
    activeViewportCols,
    activeViewportRows,
    args.desktopRuntimeClient,
    args.mode,
    args.webRuntimeClient,
    args.runtimeResizeSchedulerRef,
  ]);

  useEffect(() => {
    applyWebRuntimeSessionIntentController({
      mode: args.mode,
      intent: args.webRuntimeSessionIntent,
      activeViewport: { cols: activeViewportCols, rows: activeViewportRows },
      handledIntentIdRef: args.handledWebRuntimeSessionIntentIdRef,
      setProfileMenuOpen: args.setProfileMenuOpen,
      setContextMenu: args.setContextMenu,
      updateShellState: args.updateShellState,
    });
  }, [activeViewportCols, activeViewportRows, args.mode, args.webRuntimeSessionIntent]);

  useEffect(() => {
    flushPendingRuntimeInputsController({
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
      mountedRef: args.mountedRef,
      runtimeDerivedState: args.runtimeDerivedState,
      flushingRuntimeInputTabIdsRef: args.flushingRuntimeInputTabIdsRef,
      updateShellStateDeferred: args.updateShellStateDeferred,
      onRuntimeTransportFailure: requestRuntimeTransportRecovery,
    });
  }, [
    args.desktopRuntimeClient,
    args.mode,
    args.runtimePendingInputEffectKey,
    args.webRuntimeClient,
  ]);

  return {
    clearRuntimeBootstrapRetryTimer,
    dispatchLiveRuntimeInput,
    handleRuntimeReplayByTabId,
    handleRuntimeConnectionStateByTabId,
  };
}

