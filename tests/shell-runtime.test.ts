import test from "node:test";
import assert from "node:assert/strict";

import { resolveTerminalStageBehavior } from "../packages/sdkwork-terminal-shell/src/model.ts";
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
