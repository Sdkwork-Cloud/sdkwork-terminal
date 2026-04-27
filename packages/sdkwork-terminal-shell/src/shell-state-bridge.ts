import type { TerminalViewport } from "@sdkwork/terminal-core";
import { startTransition, type Dispatch, type SetStateAction } from "react";
import {
  activateTerminalShellTab,
  applyTerminalShellExecutionFailure,
  resizeTerminalShellTab,
  selectTerminalShellMatch,
  setTerminalShellSearchQuery,
  setTerminalShellTabTitle,
  type TerminalShellSnapshot,
  type TerminalShellState,
} from "./model.ts";

type TerminalShellTabSnapshot = TerminalShellSnapshot["tabs"][number];

export type UpdateShellState = (
  update: (current: TerminalShellState) => TerminalShellState,
) => void;

export type ResolveTabSnapshotById = (tabId: string) => TerminalShellTabSnapshot | null;

export interface ShellStateBridge {
  updateShellState: UpdateShellState;
  updateShellStateDeferred: UpdateShellState;
  resolveTabSnapshotById: ResolveTabSnapshotById;
  activateTab: (tabId: string) => void;
  handleViewportTitleChange: (tabId: string, title: string) => void;
  handleRuntimeError: (tabId: string, message: string) => void;
  handleSearchQueryChange: (tabId: string, query: string) => void;
  handleSearchSelectMatch: (tabId: string) => void;
  handleViewportResize: (tabId: string, viewport: TerminalViewport) => void;
}

function applyShellStateUpdate(
  current: TerminalShellState,
  update: (current: TerminalShellState) => TerminalShellState,
) {
  try {
    return update(current);
  } catch (cause) {
    console.error("[sdkwork-terminal] shell state update failed", cause);
    return current;
  }
}

export function createShellStateBridge(args: {
  setShellState: Dispatch<SetStateAction<TerminalShellState>>;
  snapshotTabById: ReadonlyMap<string, TerminalShellTabSnapshot>;
}): ShellStateBridge {
  function updateShellState(
    update: (current: TerminalShellState) => TerminalShellState,
  ) {
    args.setShellState((current) => applyShellStateUpdate(current, update));
  }

  function updateShellStateDeferred(
    update: (current: TerminalShellState) => TerminalShellState,
  ) {
    startTransition(() => {
      args.setShellState((current) => applyShellStateUpdate(current, update));
    });
  }

  function resolveTabSnapshotById(tabId: string) {
    return args.snapshotTabById.get(tabId) ?? null;
  }

  function activateTab(tabId: string) {
    updateShellState((current) => activateTerminalShellTab(current, tabId));
  }

  function handleViewportTitleChange(tabId: string, title: string) {
    updateShellState((current) => setTerminalShellTabTitle(current, tabId, title));
  }

  function handleRuntimeError(tabId: string, message: string) {
    updateShellStateDeferred((current) =>
      applyTerminalShellExecutionFailure(current, tabId, message),
    );
  }

  function handleSearchQueryChange(tabId: string, query: string) {
    updateShellState((current) => setTerminalShellSearchQuery(current, tabId, query));
  }

  function handleSearchSelectMatch(tabId: string) {
    updateShellState((current) => selectTerminalShellMatch(current, tabId));
  }

  function handleViewportResize(tabId: string, viewport: TerminalViewport) {
    updateShellState((current) => resizeTerminalShellTab(current, tabId, viewport));
  }

  return {
    updateShellState,
    updateShellStateDeferred,
    resolveTabSnapshotById,
    activateTab,
    handleViewportTitleChange,
    handleRuntimeError,
    handleSearchQueryChange,
    handleSearchSelectMatch,
    handleViewportResize,
  };
}
