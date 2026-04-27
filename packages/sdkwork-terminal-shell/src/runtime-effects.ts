import {
  extractErrorMessage,
  isIgnorableTerminalLifecycleErrorMessage,
} from "@sdkwork/terminal-commons";
import type { TerminalViewport } from "@sdkwork/terminal-core";
import {
  applyTerminalShellExecutionFailure,
  bindTerminalShellSessionRuntime,
  consumeTerminalShellPendingRuntimeInput,
  markTerminalShellSessionRuntimeBinding,
  queueTerminalShellTabBootstrapCommand,
  queueTerminalShellTabRuntimeBootstrapRetry,
  resolveTerminalShellRuntimeBootstrapRequestFromTab,
  resumeTerminalShellTabRuntimeBootstrap,
  shouldAutoRetryTerminalShellBootstrap,
  shouldUseTerminalShellFallbackMode,
  type TerminalShellPendingRuntimeInput,
  type TerminalShellSnapshot,
} from "./model.ts";
import type { RuntimeDerivedState } from "./runtime-derived-state.ts";
import { shouldFlushTerminalRuntimeInputQueue } from "./runtime.ts";
import {
  createRuntimeBootstrapRequest,
  DESKTOP_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT,
  DESKTOP_RUNTIME_BOOTSTRAP_RETRY_DELAY_MS,
  resolveRuntimeUnavailableMessage,
  resolveTabRuntimeClient,
  writeRuntimeInput,
  type RuntimeClientResolverArgs,
} from "./runtime-orchestration.ts";
import type { UpdateShellState } from "./shell-state-bridge.ts";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
import type { SharedRuntimeClient } from "./terminal-stage-shared.ts";

interface MutableRefObjectLike<T> {
  current: T;
}

interface RuntimeInteractiveSessionSnapshotLike {
  sessionId: string;
  attachmentId?: string | null;
  cursor?: string | null;
  workingDirectory: string;
  invokedProgram: string;
}

function resolveRuntimeInputWriteGeneration(
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>,
  tabId: string,
) {
  return runtimeInputWriteGenerationsRef.current.get(tabId) ?? 0;
}

export function clearRuntimeBootstrapRetryTimer(args: {
  tabId: string;
  runtimeBootstrapRetryTimersRef: MutableRefObjectLike<Map<string, number>>;
}) {
  const timer = args.runtimeBootstrapRetryTimersRef.current.get(args.tabId);
  if (timer == null) {
    return;
  }

  window.clearTimeout(timer);
  args.runtimeBootstrapRetryTimersRef.current.delete(args.tabId);
}

export function dispatchLiveRuntimeInput(args: {
  tabId: string;
  sessionId: string;
  client: SharedRuntimeClient;
  input: TerminalShellPendingRuntimeInput;
  mountedRef: MutableRefObjectLike<boolean>;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  updateShellStateDeferred: UpdateShellState;
}) {
  const inputWriteGeneration =
    resolveRuntimeInputWriteGeneration(
      args.runtimeInputWriteGenerationsRef,
      args.tabId,
    );
  const previousWrite =
    args.runtimeInputWriteChainsRef.current.get(args.tabId) ?? Promise.resolve();
  let nextWrite: Promise<void>;
  nextWrite = previousWrite
    .catch(() => {})
    .then(() => {
      if (
        !args.mountedRef.current ||
        resolveRuntimeInputWriteGeneration(
          args.runtimeInputWriteGenerationsRef,
          args.tabId,
        ) !==
          inputWriteGeneration
      ) {
        return;
      }

      return writeRuntimeInput(args.client, args.sessionId, args.input);
    })
    .catch((cause) => {
      if (
        !args.mountedRef.current ||
        resolveRuntimeInputWriteGeneration(
          args.runtimeInputWriteGenerationsRef,
          args.tabId,
        ) !==
          inputWriteGeneration
      ) {
        return;
      }

      const message = cause instanceof Error ? cause.message : String(cause);
      args.updateShellStateDeferred((current) =>
        applyTerminalShellExecutionFailure(current, args.tabId, message),
      );
    })
    .finally(() => {
      if (args.runtimeInputWriteChainsRef.current.get(args.tabId) === nextWrite) {
        args.runtimeInputWriteChainsRef.current.delete(args.tabId);
      }
    });

  args.runtimeInputWriteChainsRef.current.set(args.tabId, nextWrite);
}

export function cancelRuntimeInputWritesForTab(args: {
  tabId: string;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
}) {
  const currentGeneration =
    resolveRuntimeInputWriteGeneration(
      args.runtimeInputWriteGenerationsRef,
      args.tabId,
    );
  args.runtimeInputWriteGenerationsRef.current.set(
    args.tabId,
    currentGeneration + 1,
  );
  args.runtimeInputWriteChainsRef.current.delete(args.tabId);
}

function reportRuntimeTerminationError(
  cause: unknown,
  onTerminationError?: (cause: unknown) => void,
) {
  const message = extractErrorMessage(cause);
  if (isIgnorableTerminalLifecycleErrorMessage(message)) {
    return;
  }

  onTerminationError?.(cause);
}

function reportRuntimeBackgroundTaskError(label: string, cause: unknown) {
  const message = extractErrorMessage(cause);
  if (isIgnorableTerminalLifecycleErrorMessage(message)) {
    return;
  }

  console.error(`[sdkwork-terminal] ${label}`, cause);
}

export function terminateRuntimeSessionBestEffort(args: {
  sessionId: string | null | undefined;
  runtimeClient?: Pick<SharedRuntimeClient, "terminateSession"> | null;
  onTerminationError?: (cause: unknown) => void;
}) {
  if (!args.runtimeClient || !args.sessionId) {
    return;
  }

  runTerminalTaskBestEffort(
    () => args.runtimeClient!.terminateSession(args.sessionId!),
    (cause) => {
      reportRuntimeTerminationError(cause, args.onTerminationError);
    },
  );
}

export function cleanupRuntimeEffects(args: {
  latestSnapshot: TerminalShellSnapshot | null;
  desktopRuntimeClient?: {
    detachSessionAttachment?: (request: {
      attachmentId: string;
    }) => Promise<unknown>;
  } | null;
  runtimeBootstrapRetryTimersRef: MutableRefObjectLike<Map<string, number>>;
  viewportCopyHandlersRef: MutableRefObjectLike<Map<string, () => Promise<void>>>;
  viewportPasteHandlersRef: MutableRefObjectLike<
    Map<string, (text: string) => Promise<void>>
  >;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  runtimeControllerStore: {
    disposeAll: () => Promise<void>;
  };
}) {
  for (const tab of args.latestSnapshot?.tabs ?? []) {
    if (!tab.runtimeAttachmentId) {
      continue;
    }

    const attachmentId = tab.runtimeAttachmentId;
    runTerminalTaskBestEffort(
      () =>
        args.desktopRuntimeClient?.detachSessionAttachment?.({
          attachmentId,
        }),
      (error) => {
        reportRuntimeBackgroundTaskError("failed to detach runtime attachment", error);
      },
    );
  }

  for (const timer of args.runtimeBootstrapRetryTimersRef.current.values()) {
    window.clearTimeout(timer);
  }

  args.runtimeBootstrapRetryTimersRef.current.clear();
  args.viewportCopyHandlersRef.current.clear();
  args.viewportPasteHandlersRef.current.clear();
  args.runtimeInputWriteChainsRef.current.clear();
  args.runtimeInputWriteGenerationsRef.current.clear();
  runTerminalTaskBestEffort(
    () => args.runtimeControllerStore.disposeAll(),
    (error) => {
      reportRuntimeBackgroundTaskError("failed to dispose runtime controllers", error);
    },
  );
}

export function syncRetryingRuntimeTabs(args: {
  snapshotTabs: TerminalShellSnapshot["tabs"];
  runtimeBootstrapRetryTimersRef: MutableRefObjectLike<Map<string, number>>;
}) {
  const retryingTabIds = new Set(
    args.snapshotTabs
      .filter((tab) => tab.runtimeState === "retrying")
      .map((tab) => tab.id),
  );

  for (const [tabId, timer] of args.runtimeBootstrapRetryTimersRef.current.entries()) {
    if (retryingTabIds.has(tabId)) {
      continue;
    }

    window.clearTimeout(timer);
    args.runtimeBootstrapRetryTimersRef.current.delete(tabId);
  }
}

export async function resizeActiveRuntimeSession(args: {
  tabId: string;
  sessionId: string | null;
  runtimeState: TerminalShellSnapshot["tabs"][number]["runtimeState"];
  viewport: TerminalViewport;
  runtimeClient?: Pick<SharedRuntimeClient, "resizeSession"> | null;
  mountedRef: MutableRefObjectLike<boolean>;
  updateShellStateDeferred: UpdateShellState;
}) {
  if (
    !args.runtimeClient ||
    !args.sessionId ||
    args.runtimeState === "exited" ||
    args.runtimeState === "failed"
  ) {
    return;
  }

  try {
    await args.runtimeClient.resizeSession({
      sessionId: args.sessionId,
      cols: args.viewport.cols,
      rows: args.viewport.rows,
    });
  } catch (cause) {
    if (!args.mountedRef.current) {
      return;
    }

    const message = extractErrorMessage(cause);
    if (isIgnorableTerminalLifecycleErrorMessage(message)) {
      return;
    }

    args.updateShellStateDeferred((current) =>
      applyTerminalShellExecutionFailure(current, args.tabId, message),
    );
  }
}

export function processRuntimeBootstrapCandidates(args: {
  mode: RuntimeClientResolverArgs["mode"];
  desktopRuntimeClient?: RuntimeClientResolverArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientResolverArgs["webRuntimeClient"];
  mountedRef: MutableRefObjectLike<boolean>;
  bootstrappingRuntimeTabIdsRef: MutableRefObjectLike<Set<string>>;
  runtimeBootstrapRetryTimersRef: MutableRefObjectLike<Map<string, number>>;
  runtimeDerivedState: Pick<RuntimeDerivedState, "runtimeBootstrapCandidateTabs">;
  updateShellStateDeferred: UpdateShellState;
}) {
  for (const tab of args.runtimeDerivedState.runtimeBootstrapCandidateTabs) {
    if (
      shouldUseTerminalShellFallbackMode({
        mode: args.mode,
        runtimeBootstrap: tab.runtimeBootstrap,
        runtimeSessionId: tab.runtimeSessionId,
      })
    ) {
      continue;
    }

    const runtimeClient = resolveTabRuntimeClient({
      mode: args.mode,
      runtimeBootstrap: tab.runtimeBootstrap,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });

    if (tab.runtimeState === "retrying") {
      if (args.runtimeBootstrapRetryTimersRef.current.has(tab.id)) {
        continue;
      }

      const retryTimer = window.setTimeout(() => {
        args.runtimeBootstrapRetryTimersRef.current.delete(tab.id);
        if (!args.mountedRef.current) {
          return;
        }

        args.updateShellStateDeferred((current) =>
          resumeTerminalShellTabRuntimeBootstrap(current, tab.id),
        );
      }, DESKTOP_RUNTIME_BOOTSTRAP_RETRY_DELAY_MS);

      args.runtimeBootstrapRetryTimersRef.current.set(tab.id, retryTimer);
      continue;
    }

    if (
      tab.runtimeSessionId ||
      tab.runtimeState !== "idle" ||
      args.bootstrappingRuntimeTabIdsRef.current.has(tab.id)
    ) {
      continue;
    }

    if (!runtimeClient) {
      args.updateShellStateDeferred((current) =>
        applyTerminalShellExecutionFailure(
          current,
          tab.id,
          resolveRuntimeUnavailableMessage({
            mode: args.mode,
            kind: tab.runtimeBootstrap.kind,
          }),
        ),
      );
      continue;
    }

    const nextBootstrapAttempt = tab.runtimeBootstrapAttempts + 1;
    const tabRuntimeBootstrapRequest = resolveTerminalShellRuntimeBootstrapRequestFromTab(
      tab,
      tab.snapshot.viewport,
    );
    args.bootstrappingRuntimeTabIdsRef.current.add(tab.id);
    clearRuntimeBootstrapRetryTimer({
      tabId: tab.id,
      runtimeBootstrapRetryTimersRef: args.runtimeBootstrapRetryTimersRef,
    });
    args.updateShellStateDeferred((current) =>
      markTerminalShellSessionRuntimeBinding(current, tab.id),
    );
    const bootstrapRequestResolution = createRuntimeBootstrapRequest({
      mode: args.mode,
      request: tabRuntimeBootstrapRequest,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
    if (bootstrapRequestResolution.kind === "error") {
      args.bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
      args.updateShellStateDeferred((current) =>
        applyTerminalShellExecutionFailure(
          current,
          tab.id,
          bootstrapRequestResolution.message,
        ),
      );
      continue;
    }

    const bootstrapRequest = bootstrapRequestResolution.request;
    runTerminalTaskBestEffort(
      async () => {
        try {
          const session = await bootstrapRequest;
          const runtimeSession: RuntimeInteractiveSessionSnapshotLike = session;
          args.bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
          clearRuntimeBootstrapRetryTimer({
            tabId: tab.id,
            runtimeBootstrapRetryTimersRef: args.runtimeBootstrapRetryTimersRef,
          });
          if (!args.mountedRef.current) {
            return;
          }

          args.updateShellStateDeferred((current) => {
            const next = bindTerminalShellSessionRuntime(current, tab.id, {
              sessionId: runtimeSession.sessionId,
              attachmentId: runtimeSession.attachmentId,
              cursor: runtimeSession.cursor,
              workingDirectory: runtimeSession.workingDirectory,
              invokedProgram: runtimeSession.invokedProgram,
            });
            return queueTerminalShellTabBootstrapCommand(next, tab.id);
          });
        } catch (cause) {
          args.bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
          if (!args.mountedRef.current) {
            return;
          }

          console.error("[sdkwork-terminal] bootstrap session failed", cause);
          const message = cause instanceof Error ? cause.message : String(cause);

          if (
            shouldAutoRetryTerminalShellBootstrap({
              attempt: nextBootstrapAttempt,
              maxAutoRetries: DESKTOP_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT,
            })
          ) {
            args.updateShellStateDeferred((current) =>
              queueTerminalShellTabRuntimeBootstrapRetry(current, tab.id, message),
            );
            return;
          }

          args.updateShellStateDeferred((current) =>
            applyTerminalShellExecutionFailure(current, tab.id, message),
          );
        }
      },
      (error) => {
        reportRuntimeBackgroundTaskError("runtime bootstrap task failed", error);
      },
    );
  }
}

export function flushPendingRuntimeInputs(args: {
  mode: RuntimeClientResolverArgs["mode"];
  desktopRuntimeClient?: RuntimeClientResolverArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientResolverArgs["webRuntimeClient"];
  mountedRef: MutableRefObjectLike<boolean>;
  runtimeDerivedState: Pick<RuntimeDerivedState, "runtimePendingInputTabs">;
  flushingRuntimeInputTabIdsRef: MutableRefObjectLike<Set<string>>;
  updateShellStateDeferred: UpdateShellState;
}) {
  for (const tab of args.runtimeDerivedState.runtimePendingInputTabs) {
    const runtimeClient = resolveTabRuntimeClient({
      mode: args.mode,
      runtimeBootstrap: tab.runtimeBootstrap,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
    if (
      !runtimeClient ||
      !tab.runtimeSessionId ||
      tab.runtimeState !== "running" ||
      tab.runtimePendingInputQueue.length === 0
    ) {
      args.flushingRuntimeInputTabIdsRef.current.delete(tab.id);
      continue;
    }

    if (args.flushingRuntimeInputTabIdsRef.current.has(tab.id)) {
      continue;
    }

    const nextPendingInput = tab.runtimePendingInputQueue[0];
    if (!nextPendingInput) {
      continue;
    }

    const flushInput =
      nextPendingInput.kind === "text" && tab.runtimePendingInputQueue.length === 1
        ? {
            kind: "text" as const,
            data: tab.runtimePendingInput,
          }
        : nextPendingInput;

    if (
      !shouldFlushTerminalRuntimeInputQueue({
        mode: args.mode,
        runtimeState: tab.runtimeState,
        runtimeSessionId: tab.runtimeSessionId,
        runtimeStreamStarted: tab.runtimeStreamStarted,
        input:
          flushInput.kind === "text"
            ? {
                kind: "text",
                data: flushInput.data,
              }
            : {
                kind: "binary",
                inputBytes: [...flushInput.inputBytes],
              },
      })
    ) {
      continue;
    }

    args.flushingRuntimeInputTabIdsRef.current.add(tab.id);
    const flushRequest = writeRuntimeInput(
      runtimeClient,
      tab.runtimeSessionId,
      flushInput,
    );

    runTerminalTaskBestEffort(
      async () => {
        try {
          await flushRequest;
          if (!args.mountedRef.current) {
            return;
          }

          args.updateShellStateDeferred((current) =>
            consumeTerminalShellPendingRuntimeInput(
              current,
              tab.id,
              nextPendingInput.kind === "text" &&
                tab.runtimePendingInputQueue.length === 1
                ? tab.runtimePendingInput
                : nextPendingInput,
            ),
          );
        } catch (cause) {
          if (!args.mountedRef.current) {
            return;
          }

          const message = cause instanceof Error ? cause.message : String(cause);
          args.updateShellStateDeferred((current) =>
            applyTerminalShellExecutionFailure(current, tab.id, message),
          );
        } finally {
          args.flushingRuntimeInputTabIdsRef.current.delete(tab.id);
        }
      },
      (error) => {
        reportRuntimeBackgroundTaskError("runtime input flush task failed", error);
      },
    );
  }
}
