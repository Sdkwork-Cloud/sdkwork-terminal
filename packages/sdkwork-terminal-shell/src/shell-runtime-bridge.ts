import { useEffect } from "react";
import {
  applyTerminalShellReplayEntries,
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
} from "./launch-controller.ts";
import {
  cleanupRuntimeEffects as cleanupRuntimeEffectsController,
  clearRuntimeBootstrapRetryTimer as clearRuntimeBootstrapRetryTimerController,
  dispatchLiveRuntimeInput as dispatchLiveRuntimeInputController,
  flushPendingRuntimeInputs as flushPendingRuntimeInputsController,
  processRuntimeBootstrapCandidates as processRuntimeBootstrapCandidatesController,
  resizeActiveRuntimeSession as resizeActiveRuntimeSessionController,
  syncRetryingRuntimeTabs as syncRetryingRuntimeTabsController,
} from "./runtime-effects.ts";
import {
  resolveTabRuntimeClient,
  type RuntimeClientResolverArgs,
} from "./runtime-orchestration.ts";
import type { UpdateShellState } from "./shell-state-bridge.ts";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
import type { SharedRuntimeClient } from "./terminal-stage-shared.ts";

interface MutableRefObjectLike<T> {
  current: T;
}

interface RuntimeControllerStoreLike {
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
  runtimeBootstrapRetryTimersRef: MutableRefObjectLike<Map<string, number>>;
  viewportCopyHandlersRef: MutableRefObjectLike<Map<string, () => Promise<void>>>;
  viewportPasteHandlersRef: MutableRefObjectLike<
    Map<string, (text: string) => Promise<void>>
  >;
  bootstrappingRuntimeTabIdsRef: MutableRefObjectLike<Set<string>>;
  flushingRuntimeInputTabIdsRef: MutableRefObjectLike<Set<string>>;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
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
  setProfileMenuOpen: (open: boolean) => void;
  setContextMenu: (state: import("./terminal-overlays.tsx").TerminalTabContextMenuState | null) => void;
  updateShellState: UpdateShellState;
  updateShellStateDeferred: UpdateShellState;
}

export function useShellRuntimeBridge(args: UseShellRuntimeBridgeArgs) {
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
    });
  }

  function handleRuntimeReplayByTabId(
    tabId: string,
    replay: {
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
    const runtimeClient = resolveTabRuntimeClient({
      mode: args.mode,
      runtimeBootstrap: args.activeTab.runtimeBootstrap,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
    runTerminalTaskBestEffort(
      () =>
        resizeActiveRuntimeSessionController({
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
        }),
      (error) => {
        console.error("[sdkwork-terminal] failed to resize active runtime session", error);
      },
    );
  }, [
    args.activeTab.id,
    args.activeTab.runtimeSessionId,
    args.activeTab.runtimeState,
    activeViewportCols,
    activeViewportRows,
    args.desktopRuntimeClient,
    args.mode,
    args.webRuntimeClient,
  ]);

  useEffect(() => {
    flushPendingRuntimeInputsController({
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
      mountedRef: args.mountedRef,
      runtimeDerivedState: args.runtimeDerivedState,
      flushingRuntimeInputTabIdsRef: args.flushingRuntimeInputTabIdsRef,
      updateShellStateDeferred: args.updateShellStateDeferred,
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
  };
}
