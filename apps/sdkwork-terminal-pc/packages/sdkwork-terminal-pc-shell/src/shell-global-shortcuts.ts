import type { TerminalViewport } from "@sdkwork/terminal-pc-core";
import { useEffect, useRef } from "react";
import {
  activateTerminalShellTab,
  type TerminalShellSnapshot,
} from "./model";
import {
  openDefaultTerminalShellTab,
} from "./terminal-tab-actions.ts";
import type {
  LaunchFlowMode,
  LaunchWebRuntimeTarget,
} from "./launch-flow.ts";
import {
  isTerminalCloseTabShortcut,
  isTerminalNewTabShortcut,
  resolveTerminalTabSwitchShortcutDirection,
  shouldIgnoreTerminalGlobalShortcutTarget,
} from "./terminal-stage-shared.ts";
import type { UpdateShellState } from "./shell-state-bridge.ts";

export function useShellGlobalKeyboardShortcuts(args: {
  mode: LaunchFlowMode;
  activeTab: TerminalShellSnapshot["activeTab"];
  snapshotTabs: TerminalShellSnapshot["tabs"];
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  resolveActiveViewport: () => TerminalViewport;
  onRequestCloseActiveTab: (tabId: string) => void;
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
        shortcutArgs.onRequestCloseActiveTab(shortcutArgs.activeTab.id);
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

