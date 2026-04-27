import { useRef, useState, type MutableRefObject } from "react";
import { createWebRuntimeBootstrapFromTarget } from "./launch-flow.ts";
import {
  createTerminalShellState,
  getTerminalShellSnapshot,
  type TerminalShellSnapshot,
  type TerminalShellState,
} from "./model";
import { createRuntimeDerivedState } from "./runtime-derived-state.ts";
import type { ShellAppMode, WebRuntimeTarget } from "./shell-contract.ts";
import {
  createShellStateBridge,
  type ShellStateBridge,
} from "./shell-state-bridge.ts";

export interface UseShellAppStateArgs {
  mode: ShellAppMode;
  webRuntimeTarget?: WebRuntimeTarget;
}

export interface ShellAppState {
  snapshot: ReturnType<typeof getTerminalShellSnapshot>;
  activeTab: ReturnType<typeof getTerminalShellSnapshot>["activeTab"];
  latestSnapshotRef: MutableRefObject<TerminalShellSnapshot | null>;
  runtimeDerivedState: ReturnType<typeof createRuntimeDerivedState>;
  retryingTabsEffectKey: string;
  runtimeBootstrapEffectKey: string;
  runtimePendingInputEffectKey: string;
  launchProjectResolutionRequestIdRef: MutableRefObject<number>;
  shellStateBridge: ShellStateBridge;
}

export function useShellAppState(args: UseShellAppStateArgs): ShellAppState {
  const [shellState, setShellState] = useState<TerminalShellState>(() =>
    createTerminalShellState({
      mode: args.mode,
      initialTabOptions:
        args.mode === "web"
          ? {
              profile: "bash",
              runtimeBootstrap: createWebRuntimeBootstrapFromTarget(
                args.webRuntimeTarget,
                "bash",
              ),
            }
          : undefined,
    }),
  );
  const launchProjectResolutionRequestIdRef = useRef(0);
  const snapshot = getTerminalShellSnapshot(shellState);
  const latestSnapshotRef = useRef<TerminalShellSnapshot | null>(snapshot);
  latestSnapshotRef.current = snapshot;
  const activeTab = snapshot.activeTab;
  const runtimeDerivedState = createRuntimeDerivedState(snapshot.tabs);
  const retryingTabsEffectKey = runtimeDerivedState.retryingTabsEffectKey;
  const runtimeBootstrapEffectKey = runtimeDerivedState.runtimeBootstrapEffectKey;
  const runtimePendingInputEffectKey = runtimeDerivedState.runtimePendingInputEffectKey;
  const snapshotTabById = runtimeDerivedState.snapshotTabById;
  const shellStateBridge = createShellStateBridge({
    setShellState,
    snapshotTabById,
  });

  return {
    snapshot,
    activeTab,
    latestSnapshotRef,
    runtimeDerivedState,
    retryingTabsEffectKey,
    runtimeBootstrapEffectKey,
    runtimePendingInputEffectKey,
    launchProjectResolutionRequestIdRef,
    shellStateBridge,
  };
}
