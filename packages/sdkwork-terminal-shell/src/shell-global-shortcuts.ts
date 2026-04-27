import type { TerminalViewport } from "@sdkwork/terminal-core";
import { useEffect, useRef } from "react";
import {
  activateTerminalShellTab,
  closeTerminalShellTab,
  type TerminalShellSnapshot,
} from "./model";
import {
  openDefaultTerminalShellTab,
} from "./terminal-tab-actions.ts";
import {
  cancelRuntimeInputWritesForTab,
  terminateRuntimeSessionBestEffort,
} from "./runtime-effects.ts";
import type {
  LaunchFlowMode,
  LaunchWebRuntimeTarget,
} from "./launch-flow.ts";
import {
  resolveTabRuntimeClient,
  type RuntimeClientResolverArgs,
} from "./runtime-orchestration.ts";
import {
  isTerminalCloseTabShortcut,
  isTerminalNewTabShortcut,
  resolveTerminalTabSwitchShortcutDirection,
  shouldIgnoreTerminalGlobalShortcutTarget,
} from "./terminal-stage-shared.ts";
import type { UpdateShellState } from "./shell-state-bridge.ts";

interface MutableRefObjectLike<T> {
  current: T;
}

export function useShellGlobalKeyboardShortcuts(args: {
  mode: LaunchFlowMode;
  activeTab: TerminalShellSnapshot["activeTab"];
  snapshotTabs: TerminalShellSnapshot["tabs"];
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  desktopRuntimeClient?: RuntimeClientResolverArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientResolverArgs["webRuntimeClient"];
  resolveActiveViewport: () => TerminalViewport;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  updateShellState: UpdateShellState;
}) {
  const latestShortcutArgsRef = useRef(args);
  latestShortcutArgsRef.current = args;

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      const shortcutArgs = latestShortcutArgsRef.current;

      if (event.defaultPrevented || shouldIgnoreTerminalGlobalShortcutTarget(event.target)) {
        return;
      }

      const tabSwitchDirection = resolveTerminalTabSwitchShortcutDirection(event);

      if (isTerminalNewTabShortcut(event)) {
        event.preventDefault();
        openDefaultTerminalShellTab({
          mode: shortcutArgs.mode,
          webRuntimeTarget: shortcutArgs.webRuntimeTarget,
          viewport: shortcutArgs.resolveActiveViewport(),
          updateShellState: shortcutArgs.updateShellState,
        });
        return;
      }

      if (isTerminalCloseTabShortcut(event)) {
        if (shortcutArgs.snapshotTabs.length <= 1) {
          return;
        }

        event.preventDefault();
        const tabId = shortcutArgs.activeTab.id;
        const sessionId = shortcutArgs.activeTab.runtimeSessionId;
        const runtimeClient = resolveTabRuntimeClient({
          mode: shortcutArgs.mode,
          runtimeBootstrap: shortcutArgs.activeTab.runtimeBootstrap,
          desktopRuntimeClient: shortcutArgs.desktopRuntimeClient,
          webRuntimeClient: shortcutArgs.webRuntimeClient,
        });
        terminateRuntimeSessionBestEffort({
          runtimeClient,
          sessionId,
        });
        cancelRuntimeInputWritesForTab({
          tabId,
          runtimeInputWriteChainsRef: shortcutArgs.runtimeInputWriteChainsRef,
          runtimeInputWriteGenerationsRef:
            shortcutArgs.runtimeInputWriteGenerationsRef,
        });
        shortcutArgs.updateShellState((current) => closeTerminalShellTab(current, tabId));
        return;
      }

      if (!tabSwitchDirection) {
        return;
      }

      event.preventDefault();
      const currentIdx = shortcutArgs.snapshotTabs.findIndex(
        (tab) => tab.id === shortcutArgs.activeTab.id,
      );
      if (currentIdx < 0) {
        return;
      }

      const nextIdx =
        tabSwitchDirection === "previous"
          ? (currentIdx - 1 + shortcutArgs.snapshotTabs.length) %
            shortcutArgs.snapshotTabs.length
          : (currentIdx + 1) % shortcutArgs.snapshotTabs.length;
      shortcutArgs.updateShellState((current) =>
        activateTerminalShellTab(current, shortcutArgs.snapshotTabs[nextIdx].id),
      );
    }

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);
}
