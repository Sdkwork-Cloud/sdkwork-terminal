import type { TerminalViewport } from "@sdkwork/terminal-pc-core";
import type { TerminalViewportInput } from "@sdkwork/terminal-pc-infrastructure";
import { resolveTabOpenOptions, type LaunchWebRuntimeTarget } from "./launch-flow.ts";
import { detectDefaultDesktopProfile } from "./launch-profiles.ts";
import {
  applyTerminalShellPromptInput,
  appendTerminalShellPendingRuntimeInput,
  canQueueTerminalShellRuntimeInput,
  closeTerminalShellTabs,
  duplicateTerminalShellTab,
  openTerminalShellTab,
  restartTerminalShellTabRuntime,
  type TerminalShellPendingRuntimeInput,
  type TerminalShellSnapshot,
} from "./model.ts";
import { shouldBypassTerminalRuntimeInputQueue } from "./runtime.ts";
import {
  cancelRuntimeInputWritesForTab,
  terminateRuntimeSessionBestEffort,
} from "./runtime-effects.ts";
import {
  isRuntimeCapableTab,
  resolveTabRuntimeClient,
  type RuntimeClientResolverArgs,
} from "./runtime-orchestration.ts";
import type { UpdateShellState } from "./shell-state-bridge.ts";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
import type { SharedRuntimeClient } from "./terminal-stage-shared.ts";
import {
  readTerminalClipboardTextOutcome,
  writeTerminalClipboardTextOutcome,
  type TerminalClipboardProvider,
} from "./terminal-clipboard.ts";
import {
  resolveTerminalClipboardFeedbackKind,
  type TerminalClipboardFeedbackReporter,
} from "./terminal-clipboard-feedback.ts";
import type { TerminalTabContextMenuState } from "./terminal-overlays.tsx";

interface MutableRefObjectLike<T> {
  current: T;
}

type RuntimeTabSnapshot = TerminalShellSnapshot["tabs"][number];

interface RuntimeClientArgs {
  mode: RuntimeClientResolverArgs["mode"];
  desktopRuntimeClient?: RuntimeClientResolverArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientResolverArgs["webRuntimeClient"];
}

const TERMINAL_TAB_CONTEXT_MENU_ESTIMATED_HEIGHT = 224;

function resolveTabId(args: {
  contextMenu: TerminalTabContextMenuState | null;
  activeTabId: string;
}) {
  return args.contextMenu?.tabId ?? args.activeTabId;
}

function terminateTabRuntimeIfNeeded(args: {
  tab: RuntimeTabSnapshot | null | undefined;
  mode: RuntimeClientArgs["mode"];
  desktopRuntimeClient?: RuntimeClientArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientArgs["webRuntimeClient"];
}) {
  const tab = args.tab;
  if (!tab) {
    return;
  }

  const runtimeClient = resolveTabRuntimeClient({
    mode: args.mode,
    runtimeBootstrap: tab.runtimeBootstrap,
    desktopRuntimeClient: args.desktopRuntimeClient,
    webRuntimeClient: args.webRuntimeClient,
  });
  if (!runtimeClient || !tab.runtimeSessionId || tab.runtimeState === "exited") {
    return;
  }

  terminateRuntimeSessionBestEffort({
    runtimeClient,
    sessionId: tab.runtimeSessionId,
  });
}

export function resolveTerminalTabContextMenu(args: {
  tabId: string;
  clientX: number;
  clientY: number;
  innerWidth: number;
  innerHeight: number;
  menuWidth?: number;
  menuHeight?: number;
  inset?: number;
}): TerminalTabContextMenuState {
  const menuWidth = args.menuWidth ?? 196;
  const menuHeight = args.menuHeight ?? TERMINAL_TAB_CONTEXT_MENU_ESTIMATED_HEIGHT;
  const inset = args.inset ?? 8;
  const maxX = Math.max(inset, args.innerWidth - menuWidth - inset);
  const maxY = Math.max(inset, args.innerHeight - menuHeight - inset);

  return {
    tabId: args.tabId,
    x: Math.min(args.clientX, maxX),
    y: Math.min(args.clientY, maxY),
  };
}

export function clampTerminalTabContextMenuToViewport(args: {
  menu: TerminalTabContextMenuState | null;
  innerWidth: number;
  innerHeight: number;
  menuWidth?: number;
  menuHeight?: number;
  inset?: number;
}): TerminalTabContextMenuState | null {
  if (!args.menu) {
    return null;
  }

  return resolveTerminalTabContextMenu({
    tabId: args.menu.tabId,
    clientX: args.menu.x,
    clientY: args.menu.y,
    innerWidth: args.innerWidth,
    innerHeight: args.innerHeight,
    menuWidth: args.menuWidth,
    menuHeight: args.menuHeight,
    inset: args.inset,
  });
}

export function openDefaultTerminalShellTab(args: {
  mode: RuntimeClientArgs["mode"];
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  viewport: TerminalViewport;
  updateShellState: UpdateShellState;
}) {
  args.updateShellState((current) =>
    openTerminalShellTab(
      current,
      resolveTabOpenOptions({
        mode: args.mode,
        webRuntimeTarget: args.webRuntimeTarget,
        options: {
          profile: args.mode === "desktop" ? detectDefaultDesktopProfile() : "bash",
          viewport: args.viewport,
        },
      }),
    ),
  );
}

export function copyTerminalTabContextMenuSelection(args: {
  contextMenu: TerminalTabContextMenuState | null;
  activeTab: RuntimeTabSnapshot;
  snapshotTabs: TerminalShellSnapshot["tabs"];
  viewportCopyHandlersRef: MutableRefObjectLike<Map<string, () => Promise<void>>>;
  clipboardProvider?: TerminalClipboardProvider | null;
  onClipboardFeedback?: TerminalClipboardFeedbackReporter;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
}) {
  const targetTabId = resolveTabId({
    contextMenu: args.contextMenu,
    activeTabId: args.activeTab.id,
  });

  args.setContextMenu(null);

  const copyHandler = args.viewportCopyHandlersRef.current.get(targetTabId);
  if (copyHandler) {
    runTerminalTaskBestEffort(copyHandler);
    return;
  }

  const targetTab =
    args.snapshotTabs.find((tab) => tab.id === targetTabId) ?? args.activeTab;
  runTerminalTaskBestEffort(async () => {
    const outcome = await writeTerminalClipboardTextOutcome(
      targetTab.copiedText,
      args.clipboardProvider,
    );
    const feedbackKind = resolveTerminalClipboardFeedbackKind({
      operation: "copy",
      outcome: outcome.kind,
    });
    if (feedbackKind) {
      args.onClipboardFeedback?.(feedbackKind);
    }
  });
}

export function pasteTerminalTabContextMenuSelection(args: {
  contextMenu: TerminalTabContextMenuState | null;
  activeTab: RuntimeTabSnapshot;
  clipboardProvider?: TerminalClipboardProvider | null;
  onClipboardFeedback?: TerminalClipboardFeedbackReporter;
  viewportPasteHandlersRef: MutableRefObjectLike<
    Map<string, (text: string) => Promise<void>>
  >;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
}) {
  const targetTabId = resolveTabId({
    contextMenu: args.contextMenu,
    activeTabId: args.activeTab.id,
  });

  args.setContextMenu(null);

  // Only a mounted viewport owns the paste safety confirmation and xterm path.
  // Never bypass it by routing clipboard text directly into a hidden tab.
  const pasteHandler = args.viewportPasteHandlersRef.current.get(targetTabId);
  if (!pasteHandler) {
    return;
  }

  runTerminalTaskBestEffort(async () => {
    const outcome = await readTerminalClipboardTextOutcome(args.clipboardProvider);
    if (outcome.kind !== "success") {
      const feedbackKind = resolveTerminalClipboardFeedbackKind({
        operation: "paste",
        outcome: outcome.kind,
      });
      if (feedbackKind) {
        args.onClipboardFeedback?.(feedbackKind);
      }
      return;
    }

    await pasteHandler(outcome.text);
  });
}

export interface CloseTerminalShellTabsWithRuntimeArgs {
  tabIds: readonly string[];
  snapshotTabs: TerminalShellSnapshot["tabs"];
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  updateShellState: UpdateShellState;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  mode: RuntimeClientArgs["mode"];
  desktopRuntimeClient?: RuntimeClientArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientArgs["webRuntimeClient"];
}

export function closeTerminalShellTabsWithRuntime(
  args: CloseTerminalShellTabsWithRuntimeArgs,
) {
  const tabIdsToClose = new Set(args.tabIds);
  const tabsToClose = args.snapshotTabs.filter((tab) => tabIdsToClose.has(tab.id));
  if (tabsToClose.length === 0 || tabsToClose.length >= args.snapshotTabs.length) {
    return;
  }

  args.setContextMenu(null);
  for (const tab of tabsToClose) {
    terminateTabRuntimeIfNeeded({
      tab,
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
    cancelRuntimeInputWritesForTab({
      tabId: tab.id,
      runtimeInputWriteChainsRef: args.runtimeInputWriteChainsRef,
      runtimeInputWriteGenerationsRef: args.runtimeInputWriteGenerationsRef,
    });
  }
  args.updateShellState((current) =>
    closeTerminalShellTabs(current, tabsToClose.map((tab) => tab.id)),
  );
}

export function closeTerminalShellTabWithRuntime(args: {
  tabId: string;
  snapshotTabs: TerminalShellSnapshot["tabs"];
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  updateShellState: UpdateShellState;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  mode: RuntimeClientArgs["mode"];
  desktopRuntimeClient?: RuntimeClientArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientArgs["webRuntimeClient"];
}) {
  closeTerminalShellTabsWithRuntime({
    ...args,
    tabIds: [args.tabId],
  });
}

export function closeOtherTerminalShellTabsWithRuntime(args: {
  tabId: string;
  snapshotTabs: TerminalShellSnapshot["tabs"];
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  updateShellState: UpdateShellState;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  mode: RuntimeClientArgs["mode"];
  desktopRuntimeClient?: RuntimeClientArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientArgs["webRuntimeClient"];
}) {
  if (!args.snapshotTabs.some((tab) => tab.id === args.tabId)) {
    return;
  }

  closeTerminalShellTabsWithRuntime({
    ...args,
    tabIds: args.snapshotTabs
      .filter((tab) => tab.id !== args.tabId)
      .map((tab) => tab.id),
  });
}

export function closeTerminalShellTabsToRightWithRuntime(args: {
  tabId: string;
  snapshotTabs: TerminalShellSnapshot["tabs"];
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  updateShellState: UpdateShellState;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  mode: RuntimeClientArgs["mode"];
  desktopRuntimeClient?: RuntimeClientArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientArgs["webRuntimeClient"];
}) {
  const tabIndex = args.snapshotTabs.findIndex((entry) => entry.id === args.tabId);
  if (tabIndex < 0) {
    return;
  }

  closeTerminalShellTabsWithRuntime({
    ...args,
    tabIds: args.snapshotTabs.slice(tabIndex + 1).map((tab) => tab.id),
  });
}

export function duplicateTerminalShellTabEntry(args: {
  tabId: string;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  updateShellState: UpdateShellState;
}) {
  args.setContextMenu(null);
  args.updateShellState((current) => duplicateTerminalShellTab(current, args.tabId));
}

export function restartTerminalShellTabRuntimeWithCleanup(args: {
  tab: RuntimeTabSnapshot | null;
  clearRuntimeBootstrapRetryTimer: (tabId: string) => void;
  bootstrappingRuntimeTabIdsRef: MutableRefObjectLike<Set<string>>;
  flushingRuntimeInputTabIdsRef: MutableRefObjectLike<Set<string>>;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  updateShellState: UpdateShellState;
  mode: RuntimeClientArgs["mode"];
  desktopRuntimeClient?: RuntimeClientArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientArgs["webRuntimeClient"];
}) {
  const tab = args.tab;
  if (!tab) {
    return;
  }

  args.bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
  args.clearRuntimeBootstrapRetryTimer(tab.id);
  args.flushingRuntimeInputTabIdsRef.current.delete(tab.id);
  cancelRuntimeInputWritesForTab({
    tabId: tab.id,
    runtimeInputWriteChainsRef: args.runtimeInputWriteChainsRef,
    runtimeInputWriteGenerationsRef: args.runtimeInputWriteGenerationsRef,
  });

  const runtimeClient = resolveTabRuntimeClient({
    mode: args.mode,
    runtimeBootstrap: tab.runtimeBootstrap,
    desktopRuntimeClient: args.desktopRuntimeClient,
    webRuntimeClient: args.webRuntimeClient,
  });
  if (runtimeClient && tab.runtimeSessionId && tab.runtimeState !== "exited") {
    terminateRuntimeSessionBestEffort({
      runtimeClient,
      sessionId: tab.runtimeSessionId,
    });
  }

  args.updateShellState((current) =>
    restartTerminalShellTabRuntime(current, tab.id, {
      preservePendingInput: tab.runtimeState === "failed",
    }),
  );
}

export function routeTerminalViewportInputByTabId(args: {
  tabId: string;
  inputEvent: TerminalViewportInput;
  tab: RuntimeTabSnapshot | null;
  updateShellState: UpdateShellState;
  dispatchLiveRuntimeInput: (args: {
    tabId: string;
    sessionId: string;
    client: SharedRuntimeClient;
    input: TerminalShellPendingRuntimeInput;
  }) => void;
  flushingRuntimeInputTabIdsRef: MutableRefObjectLike<Set<string>>;
  mode: RuntimeClientArgs["mode"];
  desktopRuntimeClient?: RuntimeClientArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientArgs["webRuntimeClient"];
}) {
  const tab = args.tab;
  if (!tab) {
    return;
  }

  const runtimeClient = resolveTabRuntimeClient({
    mode: args.mode,
    runtimeBootstrap: tab.runtimeBootstrap,
    desktopRuntimeClient: args.desktopRuntimeClient,
    webRuntimeClient: args.webRuntimeClient,
  });
  if (
    runtimeClient &&
    isRuntimeCapableTab({
      mode: args.mode,
      runtimeBootstrap: tab.runtimeBootstrap,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    })
  ) {
    if (tab.runtimeState === "exited" || tab.runtimeState === "failed") {
      return;
    }

    const pendingInput: TerminalShellPendingRuntimeInput =
      args.inputEvent.kind === "binary"
        ? {
            kind: "binary",
            inputBytes: [...args.inputEvent.inputBytes],
          }
        : {
            kind: "text",
            data: args.inputEvent.data,
          };

    if (
      !args.flushingRuntimeInputTabIdsRef.current.has(tab.id) &&
      shouldBypassTerminalRuntimeInputQueue({
        runtimeState: tab.runtimeState,
        runtimeSessionId: tab.runtimeSessionId,
        pendingInputCount: tab.runtimePendingInputQueue.length,
        input:
          pendingInput.kind === "text"
            ? {
                kind: "text",
                data: pendingInput.data,
              }
            : {
                kind: "binary",
                inputBytes: [...pendingInput.inputBytes],
              },
      })
    ) {
      args.dispatchLiveRuntimeInput({
        tabId: tab.id,
        sessionId: tab.runtimeSessionId!,
        client: runtimeClient,
        input: pendingInput,
      });
      return;
    }

    if (canQueueTerminalShellRuntimeInput(tab)) {
      args.updateShellState((current) =>
        appendTerminalShellPendingRuntimeInput(current, tab.id, pendingInput),
      );
    }
    return;
  }

  if (args.inputEvent.kind === "binary") {
    return;
  }

  args.updateShellState((current) =>
    applyTerminalShellPromptInput(current, args.tabId, args.inputEvent.data),
  );
}

