import type { TerminalShellSnapshot } from "./model.ts";

export type TerminalCloseOperation = "tab" | "others" | "right";

export interface TerminalCloseRequest {
  operation: TerminalCloseOperation;
  anchorTabId: string;
  tabIds: string[];
  runningTabIds: string[];
}

function isTerminalSessionPotentiallyRunning(
  tab: TerminalShellSnapshot["tabs"][number],
) {
  return tab.runtimeSessionId !== null && tab.runtimeState !== "exited";
}

export function resolveTerminalCloseRequest(args: {
  operation: TerminalCloseOperation;
  tabId: string;
  tabs: TerminalShellSnapshot["tabs"];
}): TerminalCloseRequest | null {
  const anchorIndex = args.tabs.findIndex((tab) => tab.id === args.tabId);
  if (anchorIndex < 0) {
    return null;
  }

  const tabIds =
    args.operation === "tab"
      ? args.tabs[anchorIndex]?.closable
        ? [args.tabId]
        : []
      : args.operation === "others"
        ? args.tabs.filter((tab) => tab.id !== args.tabId).map((tab) => tab.id)
        : args.tabs.slice(anchorIndex + 1).map((tab) => tab.id);

  if (tabIds.length === 0) {
    return null;
  }

  const tabIdsToClose = new Set(tabIds);
  return {
    operation: args.operation,
    anchorTabId: args.tabId,
    tabIds,
    runningTabIds: args.tabs
      .filter(
        (tab) =>
          tabIdsToClose.has(tab.id) && isTerminalSessionPotentiallyRunning(tab),
      )
      .map((tab) => tab.id),
  };
}

export function requiresTerminalCloseConfirmation(request: TerminalCloseRequest) {
  return request.runningTabIds.length > 0;
}
