import test from "node:test";
import assert from "node:assert/strict";

import {
  bindTerminalShellSessionRuntime,
  createTerminalShellState,
  getTerminalShellSnapshot,
  resolveTerminalStageBehavior,
} from "../packages/sdkwork-terminal-shell/src/model.ts";
import {
  cancelRuntimeInputWritesForTab,
  cleanupRuntimeEffects,
  dispatchLiveRuntimeInput,
  processRuntimeBootstrapCandidates,
  resizeActiveRuntimeSession,
} from "../packages/sdkwork-terminal-shell/src/runtime-effects.ts";
import {
  createTerminalRuntimeInputPreview,
  isTerminalRuntimeProtocolResponseText,
  resolveTerminalRuntimePollInterval,
  shouldBypassTerminalRuntimeInputQueue,
  shouldFlushTerminalRuntimeInputQueue,
  shouldShowTerminalBootstrapOverlay,
  TERMINAL_RUNTIME_POLL_INTERVAL_RECOVERY_MS,
  TERMINAL_RUNTIME_POLL_INTERVAL_STEADY_MS,
} from "../packages/sdkwork-terminal-shell/src/runtime.ts";

function createRuntimeCleanupTestRefs() {
  return {
    runtimeBootstrapRetryTimersRef: { current: new Map<string, number>() },
    viewportCopyHandlersRef: { current: new Map<string, () => Promise<void>>() },
    viewportPasteHandlersRef: {
      current: new Map<string, (text: string) => Promise<void>>(),
    },
    runtimeInputWriteChainsRef: { current: new Map<string, Promise<void>>() },
    runtimeInputWriteGenerationsRef: { current: new Map<string, number>() },
  };
}

test("runtime polling stays aggressive until every bound session has a live subscription", () => {
  assert.equal(
    resolveTerminalRuntimePollInterval({
      supportsSubscription: false,
      boundSessionCount: 1,
      subscribedSessionCount: 0,
      failedSubscriptionCount: 0,
    }),
    TERMINAL_RUNTIME_POLL_INTERVAL_RECOVERY_MS,
  );

  assert.equal(
    resolveTerminalRuntimePollInterval({
      supportsSubscription: true,
      boundSessionCount: 2,
      subscribedSessionCount: 1,
      failedSubscriptionCount: 0,
    }),
    TERMINAL_RUNTIME_POLL_INTERVAL_RECOVERY_MS,
  );

  assert.equal(
    resolveTerminalRuntimePollInterval({
      supportsSubscription: true,
      boundSessionCount: 1,
      subscribedSessionCount: 1,
      failedSubscriptionCount: 1,
    }),
    TERMINAL_RUNTIME_POLL_INTERVAL_RECOVERY_MS,
  );

  assert.equal(
    resolveTerminalRuntimePollInterval({
      supportsSubscription: true,
      boundSessionCount: 2,
      subscribedSessionCount: 2,
      failedSubscriptionCount: 0,
    }),
    TERMINAL_RUNTIME_POLL_INTERVAL_STEADY_MS,
  );
});

test("runtime polling backs off after every bound session is subscribed", () => {
  assert.equal(TERMINAL_RUNTIME_POLL_INTERVAL_STEADY_MS, 1500);
  assert.ok(
    TERMINAL_RUNTIME_POLL_INTERVAL_STEADY_MS > TERMINAL_RUNTIME_POLL_INTERVAL_RECOVERY_MS,
  );
});

test("desktop shell shows bootstrap overlay only before the first PTY stream frame arrives", () => {
  assert.equal(
    shouldShowTerminalBootstrapOverlay({
      mode: "desktop",
      runtimeState: "binding",
      runtimeStreamStarted: false,
    }),
    true,
  );

  assert.equal(
    shouldShowTerminalBootstrapOverlay({
      mode: "desktop",
      runtimeState: "running",
      runtimeStreamStarted: false,
    }),
    true,
  );

  assert.equal(
    shouldShowTerminalBootstrapOverlay({
      mode: "desktop",
      runtimeState: "running",
      runtimeStreamStarted: true,
    }),
    false,
  );

  assert.equal(
    shouldShowTerminalBootstrapOverlay({
      mode: "desktop",
      runtimeState: "failed",
      runtimeStreamStarted: false,
    }),
    false,
  );

  assert.equal(
    shouldShowTerminalBootstrapOverlay({
      mode: "web",
      runtimeState: "binding",
      runtimeStreamStarted: false,
    }),
    false,
  );
});

test("terminal stage behavior keeps desktop PTY and web fallback paths mutually exclusive", () => {
  assert.deepEqual(
    resolveTerminalStageBehavior({
      mode: "desktop",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: null,
      runtimeState: "binding",
      runtimeStreamStarted: false,
    }),
    {
      usesRuntimeTerminalStream: true,
      showLivePrompt: false,
      showBootstrapOverlay: true,
    },
  );

  assert.deepEqual(
    resolveTerminalStageBehavior({
      mode: "desktop",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: "session-0001",
      runtimeState: "running",
      runtimeStreamStarted: false,
    }),
    {
      usesRuntimeTerminalStream: true,
      showLivePrompt: false,
      showBootstrapOverlay: true,
    },
  );

  assert.deepEqual(
    resolveTerminalStageBehavior({
      mode: "desktop",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: "session-0001",
      runtimeState: "running",
      runtimeStreamStarted: true,
    }),
    {
      usesRuntimeTerminalStream: true,
      showLivePrompt: false,
      showBootstrapOverlay: false,
    },
  );

  assert.deepEqual(
    resolveTerminalStageBehavior({
      mode: "web",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: null,
      runtimeState: "idle",
      runtimeStreamStarted: false,
    }),
    {
      usesRuntimeTerminalStream: false,
      showLivePrompt: true,
      showBootstrapOverlay: false,
    },
  );

  assert.deepEqual(
    resolveTerminalStageBehavior({
      mode: "web",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: "session-0007",
      runtimeState: "binding",
      runtimeStreamStarted: false,
    }),
    {
      usesRuntimeTerminalStream: true,
      showLivePrompt: false,
      showBootstrapOverlay: false,
    },
  );

  assert.deepEqual(
    resolveTerminalStageBehavior({
      mode: "web",
      runtimeBootstrap: { kind: "remote-runtime" },
      runtimeSessionId: null,
      runtimeState: "binding",
      runtimeStreamStarted: false,
    }),
    {
      usesRuntimeTerminalStream: true,
      showLivePrompt: false,
      showBootstrapOverlay: false,
    },
  );
});

test("runtime input preview tracks cursor movement and destructive keys before PTY output starts", () => {
  const preview = createTerminalRuntimeInputPreview({
    queue: [
      {
        kind: "text",
        data: "abc\u001b[D\u001b[D\u007fZ\rnext\u001b[D\u001b[3~!",
      },
    ],
    fallbackInput: "",
  });

  assert.deepEqual(preview.submittedLines, ["Zbc"]);
  assert.equal(preview.currentLine, "nex!");
  assert.equal(preview.cursorColumn, 4);
  assert.equal(preview.hasBinaryInput, false);
});

test("runtime input preview marks binary chunks without corrupting text state", () => {
  const preview = createTerminalRuntimeInputPreview({
    queue: [
      {
        kind: "text",
        data: "sdk",
      },
      {
        kind: "binary",
        inputBytes: [27, 91, 50, 48, 48, 126],
      },
      {
        kind: "text",
        data: "\u001b[D!",
      },
    ],
    fallbackInput: "",
  });

  assert.deepEqual(preview.submittedLines, []);
  assert.equal(preview.currentLine, "sd!k");
  assert.equal(preview.cursorColumn, 3);
  assert.equal(preview.hasBinaryInput, true);
});

test("runtime protocol response detection keeps CPR and DSR replies on the low-latency path", () => {
  assert.equal(isTerminalRuntimeProtocolResponseText("\u001b[0n"), true);
  assert.equal(isTerminalRuntimeProtocolResponseText("\u001b[12;44R"), true);
  assert.equal(isTerminalRuntimeProtocolResponseText("\u001b[?12;44R"), true);
  assert.equal(isTerminalRuntimeProtocolResponseText("\u001b[A"), false);
  assert.equal(isTerminalRuntimeProtocolResponseText("help"), false);
});

test("running runtime sessions keep desktop PTY input live even before the first frame", () => {
  assert.equal(
    shouldBypassTerminalRuntimeInputQueue({
      runtimeState: "running",
      runtimeSessionId: "session-0001",
      runtimeStreamStarted: false,
      pendingInputCount: 0,
      input: {
        kind: "text",
        data: "ls",
      },
    }),
    true,
  );

  assert.equal(
    shouldBypassTerminalRuntimeInputQueue({
      runtimeState: "running",
      runtimeSessionId: "session-0001",
      runtimeStreamStarted: true,
      pendingInputCount: 0,
      input: {
        kind: "text",
        data: "ls",
      },
    }),
    true,
  );

  assert.equal(
    shouldBypassTerminalRuntimeInputQueue({
      runtimeState: "running",
      runtimeSessionId: "session-0001",
      runtimeStreamStarted: false,
      pendingInputCount: 0,
      input: {
        kind: "text",
        data: "\u001b[12;44R",
      },
    }),
    true,
  );

  assert.equal(
    shouldBypassTerminalRuntimeInputQueue({
      runtimeState: "running",
      runtimeSessionId: "session-0001",
      runtimeStreamStarted: true,
      pendingInputCount: 1,
      input: {
        kind: "text",
        data: "pwd",
      },
    }),
    false,
  );

  assert.equal(
    shouldBypassTerminalRuntimeInputQueue({
      runtimeState: "binding",
      runtimeSessionId: "session-0001",
      runtimeStreamStarted: false,
      pendingInputCount: 0,
      input: {
        kind: "text",
        data: "\u001b[1;1R",
      },
    }),
    false,
  );
});

test("desktop runtime queue flushes interactive input as soon as the PTY session is running", () => {
  assert.equal(
    shouldFlushTerminalRuntimeInputQueue({
      mode: "desktop",
      runtimeState: "running",
      runtimeSessionId: "session-0001",
      runtimeStreamStarted: false,
      input: {
        kind: "text",
        data: "codex\r",
      },
    }),
    true,
  );

  assert.equal(
    shouldFlushTerminalRuntimeInputQueue({
      mode: "desktop",
      runtimeState: "running",
      runtimeSessionId: "session-0001",
      runtimeStreamStarted: false,
      input: {
        kind: "text",
        data: "\u001b[12;44R",
      },
    }),
    true,
  );

  assert.equal(
    shouldFlushTerminalRuntimeInputQueue({
      mode: "desktop",
      runtimeState: "running",
      runtimeSessionId: "session-0001",
      runtimeStreamStarted: true,
      input: {
        kind: "text",
        data: "claude\r",
      },
    }),
    true,
  );

  assert.equal(
    shouldFlushTerminalRuntimeInputQueue({
      mode: "web",
      runtimeState: "running",
      runtimeSessionId: "session-0001",
      runtimeStreamStarted: false,
      input: {
        kind: "text",
        data: "gemini\r",
      },
    }),
    true,
  );
});

test("runtime bootstrap ignores successful session results after unmount", async () => {
  let releaseBootstrap: ((session: {
    sessionId: string;
    attachmentId: string;
    cursor: string;
    workingDirectory: string;
    invokedProgram: string;
  }) => void) | null = null;
  const bootstrapSession = new Promise<{
    sessionId: string;
    attachmentId: string;
    cursor: string;
    workingDirectory: string;
    invokedProgram: string;
  }>((resolve) => {
    releaseBootstrap = resolve;
  });
  const snapshot = getTerminalShellSnapshot(createTerminalShellState({ mode: "desktop" }));
  const updateCalls: Array<unknown> = [];
  const bootstrappingTabIds = new Set<string>();
  const mountedRef = { current: true };

  processRuntimeBootstrapCandidates({
    mode: "desktop",
    desktopRuntimeClient: {
      createLocalShellSession() {
        return bootstrapSession;
      },
    } as never,
    mountedRef,
    bootstrappingRuntimeTabIdsRef: { current: bootstrappingTabIds },
    runtimeBootstrapRetryTimersRef: { current: new Map() },
    runtimeDerivedState: {
      runtimeBootstrapCandidateTabs: [snapshot.activeTab],
    },
    updateShellStateDeferred(update) {
      updateCalls.push(update);
    },
  });

  assert.equal(updateCalls.length, 1);
  assert.equal(bootstrappingTabIds.has(snapshot.activeTab.id), true);

  mountedRef.current = false;
  releaseBootstrap?.({
    sessionId: "session-after-unmount",
    attachmentId: "attachment-after-unmount",
    cursor: "0",
    workingDirectory: "D:\\workspace",
    invokedProgram: "powershell",
  });
  await bootstrapSession;
  await Promise.resolve();

  assert.equal(updateCalls.length, 1);
  assert.equal(bootstrappingTabIds.has(snapshot.activeTab.id), false);
});

test("runtime bootstrap ignores failed session results after unmount", async () => {
  let rejectBootstrap: ((cause: Error) => void) | null = null;
  const bootstrapSession = new Promise<never>((_resolve, reject) => {
    rejectBootstrap = reject;
  });
  const snapshot = getTerminalShellSnapshot(createTerminalShellState({ mode: "desktop" }));
  const updateCalls: Array<unknown> = [];
  const bootstrappingTabIds = new Set<string>();
  const mountedRef = { current: true };
  const consoleErrors: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args);
  };

  try {
    processRuntimeBootstrapCandidates({
      mode: "desktop",
      desktopRuntimeClient: {
        createLocalShellSession() {
          return bootstrapSession;
        },
      } as never,
      mountedRef,
      bootstrappingRuntimeTabIdsRef: { current: bootstrappingTabIds },
      runtimeBootstrapRetryTimersRef: { current: new Map() },
      runtimeDerivedState: {
        runtimeBootstrapCandidateTabs: [snapshot.activeTab],
      },
      updateShellStateDeferred(update) {
        updateCalls.push(update);
      },
    });

    assert.equal(updateCalls.length, 1);
    assert.equal(bootstrappingTabIds.has(snapshot.activeTab.id), true);

    mountedRef.current = false;
    rejectBootstrap?.(new Error("bootstrap failed after unmount"));
    await bootstrapSession.catch(() => undefined);
    await Promise.resolve();

    assert.equal(updateCalls.length, 1);
    assert.equal(bootstrappingTabIds.has(snapshot.activeTab.id), false);
    assert.deepEqual(consoleErrors, []);
  } finally {
    console.error = originalConsoleError;
  }
});

test("runtime cleanup contains rejected controller dispose promises", async () => {
  const unhandledRejections: unknown[] = [];
  const handleUnhandledRejection = (cause: unknown) => {
    unhandledRejections.push(cause);
  };

  process.on("unhandledRejection", handleUnhandledRejection);
  try {
    cleanupRuntimeEffects({
      latestSnapshot: null,
      ...createRuntimeCleanupTestRefs(),
      runtimeControllerStore: {
        async disposeAll() {
          throw new Error("session not found: dispose failed");
        },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(unhandledRejections, []);
  } finally {
    process.off("unhandledRejection", handleUnhandledRejection);
  }
});

test("runtime cleanup contains synchronous controller dispose throws", () => {
  assert.doesNotThrow(() => {
    cleanupRuntimeEffects({
      latestSnapshot: null,
      ...createRuntimeCleanupTestRefs(),
      runtimeControllerStore: {
        disposeAll() {
          throw new Error("session not found: dispose threw");
        },
      } as never,
    });
  });
});

test("runtime cleanup contains synchronous attachment detach throws", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;
  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-cleanup-detach-0001",
    attachmentId: "attachment-cleanup-detach-0001",
    cursor: "0",
  });
  const snapshot = getTerminalShellSnapshot(state);

  assert.doesNotThrow(() => {
    cleanupRuntimeEffects({
      latestSnapshot: snapshot,
      desktopRuntimeClient: {
        detachSessionAttachment() {
          throw new Error("attachment not found: detach threw");
        },
      },
      ...createRuntimeCleanupTestRefs(),
      runtimeControllerStore: {
        async disposeAll() {},
      },
    });
  });
});

test("runtime resize failures are contained and reported through shell state", async () => {
  const state = createTerminalShellState({ mode: "desktop" });
  const snapshot = getTerminalShellSnapshot(state);
  const updateCalls: Array<(current: typeof state) => typeof state> = [];
  const mountedRef = { current: true };

  await resizeActiveRuntimeSession({
    tabId: snapshot.activeTab.id,
    sessionId: "session-resize-failure-0001",
    runtimeState: "running",
    viewport: {
      cols: 132,
      rows: 40,
    },
    runtimeClient: {
      async resizeSession() {
        throw new Error("resize failed");
      },
    },
    mountedRef,
    updateShellStateDeferred(update) {
      updateCalls.push(update);
    },
  });

  assert.equal(updateCalls.length, 1);
  const nextSnapshot = getTerminalShellSnapshot(updateCalls[0](state));
  assert.equal(nextSnapshot.activeTab.runtimeState, "failed");
  assert.equal(nextSnapshot.activeTab.runtimeBootstrapLastError, "resize failed");
});

test("runtime resize skips failed sessions instead of calling the runtime client", async () => {
  let resizeCalls = 0;
  const updateCalls: unknown[] = [];

  await resizeActiveRuntimeSession({
    tabId: "tab-failed-resize-0001",
    sessionId: "session-failed-resize-0001",
    runtimeState: "failed",
    viewport: {
      cols: 132,
      rows: 40,
    },
    runtimeClient: {
      async resizeSession() {
        resizeCalls += 1;
        return {
          sessionId: "session-failed-resize-0001",
          cols: 132,
          rows: 40,
        };
      },
    },
    mountedRef: { current: true },
    updateShellStateDeferred(update) {
      updateCalls.push(update);
    },
  });

  assert.equal(resizeCalls, 0);
  assert.deepEqual(updateCalls, []);
});

test("live runtime input drops queued writes after the tab input generation is cancelled", async () => {
  const writes: string[] = [];
  const runtimeInputWriteChainsRef = { current: new Map<string, Promise<void>>() };
  const runtimeInputWriteGenerationsRef = { current: new Map<string, number>() };
  const mountedRef = { current: true };
  let markFirstWriteStarted: (() => void) | null = null;
  let releaseFirstWrite: (() => void) | null = null;
  const firstWriteStarted = new Promise<void>((resolve) => {
    markFirstWriteStarted = resolve;
  });
  const firstWriteGate = new Promise<void>((resolve) => {
    releaseFirstWrite = resolve;
  });
  const client = {
    async writeSessionInput(request: { sessionId: string; input: string }) {
      writes.push(request.input);
      if (request.input === "slow-input") {
        markFirstWriteStarted?.();
        await firstWriteGate;
      }
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request: {
      sessionId: string;
      inputBytes: number[];
    }) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  dispatchLiveRuntimeInput({
    tabId: "tab-live-input-cancel-0001",
    sessionId: "session-live-input-cancel-0001",
    client: client as never,
    input: {
      kind: "text",
      data: "slow-input",
    },
    mountedRef,
    runtimeInputWriteChainsRef,
    runtimeInputWriteGenerationsRef,
    updateShellStateDeferred() {},
  });

  await firstWriteStarted;

  dispatchLiveRuntimeInput({
    tabId: "tab-live-input-cancel-0001",
    sessionId: "session-live-input-cancel-0001",
    client: client as never,
    input: {
      kind: "text",
      data: "queued-after-cancel",
    },
    mountedRef,
    runtimeInputWriteChainsRef,
    runtimeInputWriteGenerationsRef,
    updateShellStateDeferred() {},
  });

  const staleChain = runtimeInputWriteChainsRef.current.get("tab-live-input-cancel-0001");
  assert.ok(staleChain);

  cancelRuntimeInputWritesForTab({
    tabId: "tab-live-input-cancel-0001",
    runtimeInputWriteChainsRef,
    runtimeInputWriteGenerationsRef,
  });

  releaseFirstWrite?.();
  await staleChain;

  assert.deepEqual(writes, ["slow-input"]);
  assert.equal(runtimeInputWriteChainsRef.current.has("tab-live-input-cancel-0001"), false);
});
