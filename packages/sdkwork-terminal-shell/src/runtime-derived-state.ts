import type {
  TerminalShellPendingRuntimeInput,
  TerminalShellSnapshot,
} from "./model";

export type RuntimeDerivedState = {
  snapshotTabById: Map<string, TerminalShellSnapshot["tabs"][number]>;
  runtimeBootstrapCandidateTabs: TerminalShellSnapshot["tabs"];
  runtimePendingInputTabs: TerminalShellSnapshot["tabs"];
  retryingTabsEffectKey: string;
  runtimeBootstrapEffectKey: string;
  runtimePendingInputEffectKey: string;
};

const runtimeDerivedStateCache = new WeakMap<
  TerminalShellSnapshot["tabs"],
  RuntimeDerivedState
>();

function joinTerminalEffectKey(parts: Array<string | number | boolean | null | undefined>) {
  return parts.map((part) => String(part ?? "")).join("\u001f");
}

function describeTerminalRuntimeBootstrapDependency(
  runtimeBootstrap: TerminalShellSnapshot["tabs"][number]["runtimeBootstrap"],
) {
  if (runtimeBootstrap.kind === "local-shell") {
    return "local-shell";
  }

  if (runtimeBootstrap.kind === "connector") {
    return joinTerminalEffectKey([
      "connector",
      runtimeBootstrap.request.workspaceId,
      runtimeBootstrap.request.target,
      runtimeBootstrap.request.authority,
      runtimeBootstrap.request.command.join("\u001e"),
      runtimeBootstrap.request.modeTags.join("\u001e"),
      runtimeBootstrap.request.tags.join("\u001e"),
    ]);
  }

  if (runtimeBootstrap.kind === "local-process") {
    return joinTerminalEffectKey([
      "local-process",
      runtimeBootstrap.request.workingDirectory,
      runtimeBootstrap.request.command.join("\u001e"),
    ]);
  }

  return joinTerminalEffectKey([
    "remote-runtime",
    runtimeBootstrap.request.workspaceId,
    runtimeBootstrap.request.target,
    runtimeBootstrap.request.authority,
    runtimeBootstrap.request.workingDirectory,
    runtimeBootstrap.request.command.join("\u001e"),
    runtimeBootstrap.request.modeTags.join("\u001e"),
    runtimeBootstrap.request.tags.join("\u001e"),
  ]);
}

function describeTerminalPendingRuntimeInputHead(
  queue: TerminalShellPendingRuntimeInput[],
) {
  const head = queue[0];
  if (!head) {
    return "";
  }

  if (head.kind === "text") {
    return joinTerminalEffectKey(["text", head.data]);
  }

  return joinTerminalEffectKey(["binary", head.inputBytes.join(",")]);
}

export function createRuntimeDerivedState(
  tabs: TerminalShellSnapshot["tabs"],
) {
  const cachedDerivedState = runtimeDerivedStateCache.get(tabs);
  if (cachedDerivedState) {
    return cachedDerivedState;
  }

  const retryingTabIds: string[] = [];
  const runtimeBootstrapParts: string[] = [];
  const runtimePendingInputParts: string[] = [];
  const snapshotTabById = new Map<string, TerminalShellSnapshot["tabs"][number]>();
  const runtimeBootstrapCandidateTabs: TerminalShellSnapshot["tabs"] = [];
  const runtimePendingInputTabs: TerminalShellSnapshot["tabs"] = [];

  for (const tab of tabs) {
    snapshotTabById.set(tab.id, tab);
    if (tab.runtimeState === "retrying") {
      retryingTabIds.push(tab.id);
    }
    runtimeBootstrapParts.push(
      joinTerminalEffectKey([
        tab.id,
        tab.runtimeSessionId,
        tab.runtimeState,
        tab.runtimeBootstrapAttempts,
        tab.viewportMeasured,
        tab.profile,
        tab.workingDirectory,
        tab.snapshot.viewport.cols,
        tab.snapshot.viewport.rows,
        describeTerminalRuntimeBootstrapDependency(tab.runtimeBootstrap),
      ]),
    );
    runtimePendingInputParts.push(
      joinTerminalEffectKey([
        tab.id,
        tab.runtimeSessionId,
        tab.runtimeState,
        tab.runtimeStreamStarted,
        tab.runtimePendingInputQueue.length,
        describeTerminalPendingRuntimeInputHead(tab.runtimePendingInputQueue),
      ]),
    );
    if (
      tab.viewportMeasured
      && (tab.runtimeState === "retrying"
        || (!tab.runtimeSessionId && tab.runtimeState === "idle"))
    ) {
      runtimeBootstrapCandidateTabs.push(tab);
    }
    if (
      tab.runtimeSessionId &&
      tab.runtimeState === "running" &&
      tab.runtimePendingInputQueue.length > 0
    ) {
      runtimePendingInputTabs.push(tab);
    }
  }

  const nextDerivedState: RuntimeDerivedState = {
    snapshotTabById,
    runtimeBootstrapCandidateTabs,
    runtimePendingInputTabs,
    retryingTabsEffectKey: retryingTabIds.join("\u001d"),
    runtimeBootstrapEffectKey: runtimeBootstrapParts.join("\u001d"),
    runtimePendingInputEffectKey: runtimePendingInputParts.join("\u001d"),
  };

  runtimeDerivedStateCache.set(tabs, nextDerivedState);
  return nextDerivedState;
}
