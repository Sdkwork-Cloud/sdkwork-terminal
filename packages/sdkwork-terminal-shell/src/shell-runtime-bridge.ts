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
  syncRetryingRuntimeTabs as syncRetryingRuntimeTabsController,
} from "./runtime-effects.ts";
import {
  resolveTabRuntimeClient,
  type RuntimeClientResolverArgs,
} from "./runtime-orchestration.ts";
import type { UpdateShellState } from "./shell-state-bridge.ts";
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

  useEffect(() => {
    args.desktopRuntimeClientRef.current = args.desktopRuntimeClient;
  }, [args.desktopRuntimeClient]);

  useEffect(() => {
    args.webRuntimeClientRef.current = args.webRuntimeClient;
  }, [args.webRuntimeClient]);

  useEffect(() => {
    args.latestSnapshotRef.current = args.snapshot;
  }, [args.snapshot]);

  useEffect(() => {
    applyDesktopSessionReattachIntentController({
      mode: args.mode,
      intent: args.desktopSessionReattachIntent,
      activeViewport: args.activeTab.snapshot.viewport,
      handledIntentIdRef: args.handledDesktopSessionReattachIntentIdRef,
      setProfileMenuOpen: args.setProfileMenuOpen,
      setContextMenu: args.setContextMenu,
      updateShellState: args.updateShellState,
    });
  }, [args.activeTab.snapshot.viewport, args.desktopSessionReattachIntent, args.mode]);

  useEffect(() => {
    applyDesktopConnectorIntentController({
      mode: args.mode,
      intent: args.desktopConnectorSessionIntent,
      activeViewport: args.activeTab.snapshot.viewport,
      handledIntentIdRef: args.handledDesktopConnectorSessionIntentIdRef,
      setProfileMenuOpen: args.setProfileMenuOpen,
      setContextMenu: args.setContextMenu,
      updateShellState: args.updateShellState,
    });
  }, [args.activeTab.snapshot.viewport, args.desktopConnectorSessionIntent, args.mode]);

  useEffect(() => {
    void args.runtimeControllerStoreRef.current.syncTabs(
      args.snapshot.tabs.map((tab) => tab.id),
    );
  }, [args.snapshot.tabs]);

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
    if (
      !runtimeClient ||
      !args.activeTab.runtimeSessionId ||
      args.activeTab.runtimeState === "exited"
    ) {
      return;
    }

    void runtimeClient.resizeSession({
      sessionId: args.activeTab.runtimeSessionId,
      cols: args.activeTab.snapshot.viewport.cols,
      rows: args.activeTab.snapshot.viewport.rows,
    });
  }, [
    args.activeTab.id,
    args.activeTab.runtimeSessionId,
    args.activeTab.runtimeState,
    args.activeTab.snapshot.viewport.cols,
    args.activeTab.snapshot.viewport.rows,
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
