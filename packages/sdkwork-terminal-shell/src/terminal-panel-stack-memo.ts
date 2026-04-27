import {
  resolveTerminalStageBehavior,
  type TerminalShellSnapshot,
} from "./model.ts";
import type { RuntimeTabController } from "./runtime-tab-controller.ts";
import type { SharedRuntimeClient } from "./terminal-stage-shared";
import type { TerminalClipboardProvider } from "./terminal-clipboard.ts";

type TerminalStageTab = TerminalShellSnapshot["activeTab"];
type TerminalStageRuntimeBootstrap = TerminalStageTab["runtimeBootstrap"];
type TerminalStagePendingInput = TerminalStageTab["runtimePendingInputQueue"][number];

export interface TerminalStageMemoProps {
  mode: "desktop" | "web";
  tabId: string;
  tab: TerminalStageTab;
  active: boolean;
  clipboardProvider?: TerminalClipboardProvider;
  runtimeController: RuntimeTabController;
  runtimeClient: SharedRuntimeClient | null;
}

function getTerminalStageBehavior(tab: TerminalStageTab, mode: "desktop" | "web") {
  return resolveTerminalStageBehavior({
    mode,
    runtimeBootstrap: tab.runtimeBootstrap,
    runtimeSessionId: tab.runtimeSessionId,
    runtimeState: tab.runtimeState,
    runtimeStreamStarted: tab.runtimeStreamStarted,
  });
}

function hasSameViewport(previousTab: TerminalStageTab, nextTab: TerminalStageTab) {
  return (
    previousTab.snapshot.viewport.cols === nextTab.snapshot.viewport.cols &&
    previousTab.snapshot.viewport.rows === nextTab.snapshot.viewport.rows
  );
}

function areStringArraysEqual(
  previousValues: readonly string[],
  nextValues: readonly string[],
) {
  if (previousValues === nextValues) {
    return true;
  }
  if (previousValues.length !== nextValues.length) {
    return false;
  }

  return previousValues.every(
    (previousValue, index) => previousValue === nextValues[index],
  );
}

function areNumberArraysEqual(
  previousValues: readonly number[],
  nextValues: readonly number[],
) {
  if (previousValues === nextValues) {
    return true;
  }
  if (previousValues.length !== nextValues.length) {
    return false;
  }

  return previousValues.every(
    (previousValue, index) => previousValue === nextValues[index],
  );
}

function areTerminalPendingInputsEqual(
  previousInput: TerminalStagePendingInput,
  nextInput: TerminalStagePendingInput,
) {
  if (previousInput === nextInput) {
    return true;
  }
  if (previousInput.kind !== nextInput.kind) {
    return false;
  }

  if (previousInput.kind === "text") {
    return nextInput.kind === "text" && previousInput.data === nextInput.data;
  }

  return (
    nextInput.kind === "binary" &&
    areNumberArraysEqual(previousInput.inputBytes, nextInput.inputBytes)
  );
}

function areTerminalPendingInputQueuesEqual(
  previousQueue: readonly TerminalStagePendingInput[],
  nextQueue: readonly TerminalStagePendingInput[],
) {
  if (previousQueue === nextQueue) {
    return true;
  }
  if (previousQueue.length !== nextQueue.length) {
    return false;
  }

  return previousQueue.every((previousInput, index) =>
    areTerminalPendingInputsEqual(previousInput, nextQueue[index]!),
  );
}

function areTerminalRuntimeBootstrapsEqual(
  previousBootstrap: TerminalStageRuntimeBootstrap,
  nextBootstrap: TerminalStageRuntimeBootstrap,
) {
  if (previousBootstrap === nextBootstrap) {
    return true;
  }
  if (previousBootstrap.kind !== nextBootstrap.kind) {
    return false;
  }

  if (previousBootstrap.kind === "local-shell") {
    return true;
  }

  if (previousBootstrap.kind === "local-process") {
    if (nextBootstrap.kind !== "local-process") {
      return false;
    }

    return (
      areStringArraysEqual(
        previousBootstrap.request.command,
        nextBootstrap.request.command,
      ) &&
      previousBootstrap.request.workingDirectory ===
        nextBootstrap.request.workingDirectory &&
      previousBootstrap.request.cols === nextBootstrap.request.cols &&
      previousBootstrap.request.rows === nextBootstrap.request.rows &&
      previousBootstrap.request.title === nextBootstrap.request.title &&
      previousBootstrap.request.profileId === nextBootstrap.request.profileId &&
      previousBootstrap.request.workspaceId === nextBootstrap.request.workspaceId &&
      previousBootstrap.request.projectId === nextBootstrap.request.projectId
    );
  }

  if (previousBootstrap.kind === "connector") {
    if (nextBootstrap.kind !== "connector") {
      return false;
    }

    return (
      previousBootstrap.request.workspaceId === nextBootstrap.request.workspaceId &&
      previousBootstrap.request.target === nextBootstrap.request.target &&
      previousBootstrap.request.authority === nextBootstrap.request.authority &&
      areStringArraysEqual(
        previousBootstrap.request.command,
        nextBootstrap.request.command,
      ) &&
      areStringArraysEqual(
        previousBootstrap.request.modeTags,
        nextBootstrap.request.modeTags,
      ) &&
      areStringArraysEqual(
        previousBootstrap.request.tags,
        nextBootstrap.request.tags,
      )
    );
  }

  if (nextBootstrap.kind !== "remote-runtime") {
    return false;
  }

  return (
    previousBootstrap.request.workspaceId === nextBootstrap.request.workspaceId &&
    previousBootstrap.request.target === nextBootstrap.request.target &&
    previousBootstrap.request.authority === nextBootstrap.request.authority &&
    previousBootstrap.request.workingDirectory ===
      nextBootstrap.request.workingDirectory &&
    previousBootstrap.request.cols === nextBootstrap.request.cols &&
    previousBootstrap.request.rows === nextBootstrap.request.rows &&
    areStringArraysEqual(
      previousBootstrap.request.command,
      nextBootstrap.request.command,
    ) &&
    areStringArraysEqual(
      previousBootstrap.request.modeTags,
      nextBootstrap.request.modeTags,
    ) &&
    areStringArraysEqual(
      previousBootstrap.request.tags,
      nextBootstrap.request.tags,
    )
  );
}

function areRuntimeTerminalStageInputsEqual(
  previousTab: TerminalStageTab,
  nextTab: TerminalStageTab,
) {
  return (
    previousTab.id === nextTab.id &&
    previousTab.title === nextTab.title &&
    previousTab.targetLabel === nextTab.targetLabel &&
    previousTab.searchQuery === nextTab.searchQuery &&
    areTerminalRuntimeBootstrapsEqual(
      previousTab.runtimeBootstrap,
      nextTab.runtimeBootstrap,
    ) &&
    previousTab.runtimeSessionId === nextTab.runtimeSessionId &&
    previousTab.runtimeAttachmentId === nextTab.runtimeAttachmentId &&
    previousTab.runtimeState === nextTab.runtimeState &&
    previousTab.runtimeStreamStarted === nextTab.runtimeStreamStarted &&
    previousTab.runtimeBootstrapAttempts === nextTab.runtimeBootstrapAttempts &&
    previousTab.runtimeBootstrapLastError === nextTab.runtimeBootstrapLastError &&
    previousTab.runtimePendingInput === nextTab.runtimePendingInput &&
    areTerminalPendingInputQueuesEqual(
      previousTab.runtimePendingInputQueue,
      nextTab.runtimePendingInputQueue,
    ) &&
    previousTab.lastExitCode === nextTab.lastExitCode &&
    hasSameViewport(previousTab, nextTab)
  );
}

export function shouldReuseTerminalStageRender(
  previousProps: TerminalStageMemoProps,
  nextProps: TerminalStageMemoProps,
) {
  if (
    previousProps.mode !== nextProps.mode ||
    previousProps.tabId !== nextProps.tabId ||
    previousProps.active !== nextProps.active ||
    previousProps.clipboardProvider !== nextProps.clipboardProvider ||
    previousProps.runtimeController !== nextProps.runtimeController ||
    previousProps.runtimeClient !== nextProps.runtimeClient
  ) {
    return false;
  }

  const previousBehavior = getTerminalStageBehavior(
    previousProps.tab,
    previousProps.mode,
  );
  const nextBehavior = getTerminalStageBehavior(nextProps.tab, nextProps.mode);
  if (
    previousBehavior.showLivePrompt !== nextBehavior.showLivePrompt ||
    previousBehavior.showBootstrapOverlay !== nextBehavior.showBootstrapOverlay
  ) {
    return false;
  }

  if (previousBehavior.showLivePrompt || nextBehavior.showLivePrompt) {
    return previousProps.tab === nextProps.tab;
  }

  return areRuntimeTerminalStageInputsEqual(previousProps.tab, nextProps.tab);
}
