import { useEffect } from "react";
import {
  activateTerminalShellTab,
  closeTerminalShellTab,
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
  resolveTabRuntimeClient,
  type RuntimeClientResolverArgs,
} from "./runtime-orchestration.ts";
import {
  isTerminalCloseTabShortcut,
  isTerminalNewTabShortcut,
  resolveTerminalTabSwitchShortcutDirection,
  shouldIgnoreTerminalAppShortcutTarget,
} from "./terminal-stage-shared.ts";
import type { UpdateShellState } from "./shell-state-bridge.ts";

export function useShellGlobalKeyboardShortcuts(args: {
  mode: LaunchFlowMode;
  activeTab: TerminalShellSnapshot["activeTab"];
  snapshotTabs: TerminalShellSnapshot["tabs"];
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  desktopRuntimeClient?: RuntimeClientResolverArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientResolverArgs["webRuntimeClient"];
  updateShellState: UpdateShellState;
}) {
  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || shouldIgnoreTerminalAppShortcutTarget(event.target)) {
        return;
      }

      const tabSwitchDirection = resolveTerminalTabSwitchShortcutDirection(event);

      if (isTerminalNewTabShortcut(event)) {
        event.preventDefault();
        openDefaultTerminalShellTab({
          mode: args.mode,
          webRuntimeTarget: args.webRuntimeTarget,
          viewport: args.activeTab.snapshot.viewport,
          updateShellState: args.updateShellState,
        });
        return;
      }

      if (isTerminalCloseTabShortcut(event)) {
        if (args.snapshotTabs.length <= 1) {
          return;
        }

        event.preventDefault();
        const tabId = args.activeTab.id;
        const sessionId = args.activeTab.runtimeSessionId;
        const runtimeClient = resolveTabRuntimeClient({
          mode: args.mode,
          runtimeBootstrap: args.activeTab.runtimeBootstrap,
          desktopRuntimeClient: args.desktopRuntimeClient,
          webRuntimeClient: args.webRuntimeClient,
        });
        if (sessionId && runtimeClient) {
          void runtimeClient.terminateSession(sessionId);
        }
        args.updateShellState((current) => closeTerminalShellTab(current, tabId));
        return;
      }

      if (!tabSwitchDirection) {
        return;
      }

      event.preventDefault();
      const currentIdx = args.snapshotTabs.findIndex((tab) => tab.id === args.activeTab.id);
      if (currentIdx < 0) {
        return;
      }

      const nextIdx =
        tabSwitchDirection === "previous"
          ? (currentIdx - 1 + args.snapshotTabs.length) % args.snapshotTabs.length
          : (currentIdx + 1) % args.snapshotTabs.length;
      args.updateShellState((current) =>
        activateTerminalShellTab(current, args.snapshotTabs[nextIdx].id),
      );
    }

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [
    args.activeTab.id,
    args.activeTab.runtimeSessionId,
    args.activeTab.snapshot.viewport,
    args.desktopRuntimeClient,
    args.mode,
    args.snapshotTabs,
    args.webRuntimeClient,
    args.webRuntimeTarget,
  ]);
}
