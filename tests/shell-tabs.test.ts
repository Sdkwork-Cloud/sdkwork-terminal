import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as terminalShellModel from "../packages/sdkwork-terminal-shell/src/model.ts";

import {
  applyTerminalShellReplayBatches,
  applyTerminalShellReplayEntries,
  applyTerminalShellExecutionFailure,
  applyTerminalShellExecutionResult,
  applyTerminalShellPromptInput,
  appendTerminalShellCommandText,
  appendTerminalShellPendingRuntimeInput,
  activateTerminalShellTab,
  backspaceTerminalShellCommandText,
  bindTerminalShellSessionRuntime,
  canQueueTerminalShellRuntimeInput,
  consumeTerminalShellPendingRuntimeInput,
  closeTerminalShellTab,
  closeTerminalShellTabsToRight,
  closeTerminalShellTabsExcept,
  createTerminalShellState,
  duplicateTerminalShellTab,
  getTerminalShellSnapshot,
  getTerminalShellLayoutContract,
  markTerminalShellSessionRuntimeBinding,
  measureTerminalTabStripContentWidth,
  openTerminalShellTab,
  queueTerminalShellTabBootstrapCommand,
  queueTerminalShellTabRuntimeBootstrapRetry,
  recallNextTerminalShellCommand,
  recallPreviousTerminalShellCommand,
  resolveTerminalShellTabRuntimeBootstrapRequest,
  resolveTerminalShellRuntimeClientKind,
  resumeTerminalShellTabRuntimeBootstrap,
  restartTerminalShellTabRuntime,
  resizeTerminalShellTab,
  resolveTerminalTabActionInlineWidth,
  shouldAutoRetryTerminalShellBootstrap,
  shouldDockTerminalTabActions,
  submitTerminalShellCommand,
  runTerminalShellCommand,
  setTerminalShellCommandText,
  setTerminalShellTabTitle,
  shouldUseTerminalShellFallbackMode,
  shouldUseTerminalShellRuntimeStream,
} from "../packages/sdkwork-terminal-shell/src/model.ts";

test("terminal shell workspace keeps top tabs and independent transcript per tab", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const firstTabId = getTerminalShellSnapshot(state).activeTab.id;

  state = setTerminalShellCommandText(state, firstTabId, "status");
  state = runTerminalShellCommand(state, firstTabId);
  state = openTerminalShellTab(state, {
    profile: "bash",
    title: "ubuntu",
  });

  const secondTabId = getTerminalShellSnapshot(state).activeTab.id;
  state = setTerminalShellCommandText(state, secondTabId, "pwd");
  state = runTerminalShellCommand(state, secondTabId);
  state = activateTerminalShellTab(state, firstTabId);

  const snapshot = getTerminalShellSnapshot(state);
  const firstTab = snapshot.tabs.find((tab) => tab.id === firstTabId);
  const secondTab = snapshot.tabs.find((tab) => tab.id === secondTabId);

  assert.equal(snapshot.tabs.length, 2);
  assert.equal(snapshot.activeTab.id, firstTabId);
  assert.match(firstTab?.snapshot.visibleLines.at(-1)?.text ?? "", /viewport stable/);
  assert.equal(secondTab?.snapshot.visibleLines.at(-1)?.text ?? "", process.cwd());

  state = closeTerminalShellTab(state, secondTabId);
  assert.equal(getTerminalShellSnapshot(state).tabs.length, 1);
});

test("real runtime tabs start without fallback transcript chrome", () => {
  const desktopState = createTerminalShellState({ mode: "desktop" });
  const desktopSnapshot = getTerminalShellSnapshot(desktopState).activeTab;

  assert.deepEqual(desktopSnapshot.snapshot.visibleLines, []);

  const webRuntimeState = createTerminalShellState({
    mode: "web",
    initialTabOptions: {
      profile: "bash",
      runtimeBootstrap: {
        kind: "remote-runtime",
        request: {
          workspaceId: "workspace-demo",
          target: "runtime-node",
          authority: "local",
          command: ["/bin/bash", "-l"],
          workingDirectory: "/workspace",
          modeTags: ["cli-native"],
          tags: ["runtime:web"],
        },
      },
    },
  });
  const webRuntimeSnapshot = getTerminalShellSnapshot(webRuntimeState).activeTab;

  assert.equal(webRuntimeSnapshot.runtimeBootstrap.kind, "remote-runtime");
  assert.deepEqual(webRuntimeSnapshot.snapshot.visibleLines, []);

  const webFallbackState = createTerminalShellState({
    mode: "web",
    initialTabOptions: {
      profile: "bash",
    },
  });
  const webFallbackSnapshot = getTerminalShellSnapshot(webFallbackState).activeTab;

  assert.match(
    webFallbackSnapshot.snapshot.visibleLines.map((line) => line.text).join("\n"),
    /remote bash environment ready/,
  );
});

test("terminal shell fallback mode is reserved for web local-shell tabs without a runtime session", () => {
  assert.equal(
    shouldUseTerminalShellFallbackMode({
      mode: "desktop",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: null,
    }),
    false,
  );
  assert.equal(
    shouldUseTerminalShellFallbackMode({
      mode: "web",
      runtimeBootstrap: { kind: "remote-runtime" },
      runtimeSessionId: null,
    }),
    false,
  );
  assert.equal(
    shouldUseTerminalShellFallbackMode({
      mode: "web",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: "session-0001",
    }),
    false,
  );
  assert.equal(
    shouldUseTerminalShellFallbackMode({
      mode: "web",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: null,
    }),
    true,
  );
});

test("terminal shell runtime stream mode covers desktop, attached local-shell tabs, and non-local bootstrap kinds", () => {
  assert.equal(
    shouldUseTerminalShellRuntimeStream({
      mode: "desktop",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: null,
    }),
    true,
  );
  assert.equal(
    shouldUseTerminalShellRuntimeStream({
      mode: "web",
      runtimeBootstrap: { kind: "remote-runtime" },
      runtimeSessionId: null,
    }),
    true,
  );
  assert.equal(
    shouldUseTerminalShellRuntimeStream({
      mode: "web",
      runtimeBootstrap: { kind: "connector" },
      runtimeSessionId: null,
    }),
    true,
  );
  assert.equal(
    shouldUseTerminalShellRuntimeStream({
      mode: "desktop",
      runtimeBootstrap: {
        kind: "local-process",
        request: {
          command: ["codex"],
        },
      },
      runtimeSessionId: null,
    }),
    true,
  );
  assert.equal(
    shouldUseTerminalShellRuntimeStream({
      mode: "web",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: "session-0001",
    }),
    true,
  );
  assert.equal(
    shouldUseTerminalShellRuntimeStream({
      mode: "web",
      runtimeBootstrap: { kind: "local-shell" },
      runtimeSessionId: null,
    }),
    false,
  );
});

test("terminal shell runtime client kind keeps remote-runtime web-only and desktop sessions desktop-bound", () => {
  assert.equal(
    resolveTerminalShellRuntimeClientKind({
      mode: "desktop",
      runtimeBootstrap: { kind: "local-shell" },
    }),
    "desktop",
  );
  assert.equal(
    resolveTerminalShellRuntimeClientKind({
      mode: "desktop",
      runtimeBootstrap: { kind: "connector" },
    }),
    "desktop",
  );
  assert.equal(
    resolveTerminalShellRuntimeClientKind({
      mode: "desktop",
      runtimeBootstrap: {
        kind: "local-process",
        request: {
          command: ["codex"],
        },
      },
    }),
    "desktop",
  );
  assert.equal(
    resolveTerminalShellRuntimeClientKind({
      mode: "desktop",
      runtimeBootstrap: { kind: "remote-runtime" },
    }),
    null,
  );
  assert.equal(
    resolveTerminalShellRuntimeClientKind({
      mode: "web",
      runtimeBootstrap: { kind: "remote-runtime" },
    }),
    "web",
  );
  assert.equal(
    resolveTerminalShellRuntimeClientKind({
      mode: "web",
      runtimeBootstrap: { kind: "local-shell" },
    }),
    null,
  );
  assert.equal(
    resolveTerminalShellRuntimeClientKind({
      mode: "web",
      runtimeBootstrap: { kind: "connector" },
    }),
    null,
  );
});

test("terminal shell workspace supports duplicate and bulk-close tab operations", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  let snapshot = getTerminalShellSnapshot(state);
  const firstTabId = snapshot.activeTab.id;
  const firstTabTitle = snapshot.activeTab.title;

  state = openTerminalShellTab(state, {
    profile: "bash",
    title: "bash",
  });
  const secondTabId = getTerminalShellSnapshot(state).activeTab.id;

  state = duplicateTerminalShellTab(state, firstTabId);
  snapshot = getTerminalShellSnapshot(state);

  assert.equal(snapshot.tabs.length, 3);
  assert.equal(snapshot.activeTab.title, firstTabTitle);
  assert.notEqual(snapshot.activeTab.id, firstTabId);

  state = closeTerminalShellTabsToRight(state, firstTabId);
  snapshot = getTerminalShellSnapshot(state);
  assert.equal(snapshot.tabs.length, 1);
  assert.equal(snapshot.activeTab.id, firstTabId);

  state = openTerminalShellTab(state, {
    profile: "bash",
    title: "bash",
  });
  state = openTerminalShellTab(state, {
    profile: "shell",
    title: "shell",
  });
  state = closeTerminalShellTabsExcept(state, secondTabId);
  snapshot = getTerminalShellSnapshot(state);

  assert.equal(snapshot.tabs.length, 1);
  assert.equal(snapshot.activeTab.id, secondTabId);
});

test("terminal shell layout contract stays aligned with windows terminal semantics", () => {
  const contract = getTerminalShellLayoutContract();

  assert.equal(contract.kind, "windows-terminal");
  assert.equal(contract.primarySurface, "terminal-tab-stage");
  assert.deepEqual(contract.tabRoles, ["tablist", "tab", "tabpanel"]);
  assert.deepEqual(contract.headerChrome, [
    "tablist",
    "new-tab-button",
    "profile-menu",
  ]);
  assert.deepEqual(contract.secondaryPanels, []);
});

test("terminal shell workspace recalls submitted commands like a real shell", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = setTerminalShellCommandText(state, tabId, "status");
  state = submitTerminalShellCommand(state, tabId);
  state = setTerminalShellCommandText(state, tabId, "pwd");
  state = submitTerminalShellCommand(state, tabId);
  state = setTerminalShellCommandText(state, tabId, "");

  state = recallPreviousTerminalShellCommand(state, tabId);
  assert.equal(getTerminalShellSnapshot(state).activeTab.commandText, "pwd");

  state = recallPreviousTerminalShellCommand(state, tabId);
  assert.equal(getTerminalShellSnapshot(state).activeTab.commandText, "status");

  state = recallNextTerminalShellCommand(state, tabId);
  assert.equal(getTerminalShellSnapshot(state).activeTab.commandText, "pwd");

  state = recallNextTerminalShellCommand(state, tabId);
  assert.equal(getTerminalShellSnapshot(state).activeTab.commandText, "");
});

test("terminal shell docks new-tab actions only when desktop tabs actually overflow", () => {
  assert.equal(
    shouldDockTerminalTabActions({
      mode: "desktop",
      canScrollLeft: false,
      canScrollRight: false,
      leadingWidth: 0,
      tabListWidth: 0,
      actionWidth: 60,
      reserveWidth: 40,
    }),
    false,
  );
  assert.equal(
    shouldDockTerminalTabActions({
      mode: "desktop",
      canScrollLeft: false,
      canScrollRight: false,
      leadingWidth: 720,
      tabListWidth: 520,
      actionWidth: 60,
      reserveWidth: 40,
    }),
    false,
  );
  assert.equal(
    shouldDockTerminalTabActions({
      mode: "desktop",
      canScrollLeft: false,
      canScrollRight: true,
    }),
    true,
  );
  assert.equal(
    shouldDockTerminalTabActions({
      mode: "desktop",
      canScrollLeft: false,
      canScrollRight: false,
      leadingWidth: 560,
      tabListWidth: 520,
      actionWidth: 60,
      reserveWidth: 40,
    }),
    true,
  );
  assert.equal(
    shouldDockTerminalTabActions({
      mode: "web",
      canScrollLeft: true,
      canScrollRight: true,
    }),
    false,
  );
});

test("terminal shell restores inline tab actions when docked chrome would otherwise undercount free width", () => {
  const availableInlineWidth = resolveTerminalTabActionInlineWidth({
    leadingWidth: 802,
    actionWidth: 60,
    docked: true,
  });

  assert.equal(availableInlineWidth, 862);
  assert.equal(
    shouldDockTerminalTabActions({
      mode: "desktop",
      canScrollLeft: false,
      canScrollRight: false,
      leadingWidth: availableInlineWidth,
      tabListWidth: 720,
      actionWidth: 60,
      reserveWidth: 40,
    }),
    false,
  );
});

test("terminal shell measures tab-strip content width from actual tabs instead of container width", () => {
  assert.equal(measureTerminalTabStripContentWidth([]), 0);
  assert.equal(
    measureTerminalTabStripContentWidth([
      { offsetLeft: 0, width: 140 },
      { offsetLeft: 142, width: 180 },
      { offsetLeft: 324, width: 160 },
    ]),
    484,
  );
});

test("terminal shell workspace appends desktop execution output to the current tab", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = setTerminalShellCommandText(state, tabId, "echo sdkwork-terminal");
  state = submitTerminalShellCommand(state, tabId);
  state = applyTerminalShellExecutionResult(state, tabId, {
    profile: "powershell",
    commandText: "echo sdkwork-terminal",
    workingDirectory:
      "D:\\javasource\\spring-ai-plus\\spring-ai-plus-business\\apps\\sdkwork-terminal",
    invokedProgram: "powershell",
    exitCode: 0,
    stdout: "sdkwork-terminal",
    stderr: "",
  });

  const snapshot = getTerminalShellSnapshot(state);

  assert.match(
    snapshot.activeTab.snapshot.visibleLines.map((line) => line.text).join("\n"),
    /sdkwork-terminal/,
  );
});

test("terminal shell workspace appends execution failures to the current tab", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = setTerminalShellCommandText(state, tabId, "bad-command");
  state = submitTerminalShellCommand(state, tabId);
  state = applyTerminalShellExecutionFailure(
    state,
    tabId,
    "spawn failed: program not found",
  );

  const snapshot = getTerminalShellSnapshot(state);

  assert.match(
    snapshot.activeTab.snapshot.visibleLines.map((line) => line.text).join("\n"),
    /program not found/,
  );
});

test("desktop terminal shell binds a runtime session and tracks replay as metadata only", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-0001",
    attachmentId: "attachment-0001",
    cursor: "0",
  });
  state = applyTerminalShellReplayEntries(state, tabId, {
    nextCursor: "3",
    entries: [
      {
        sequence: 1,
        kind: "output",
        payload: "Windows PowerShell ready",
        occurredAt: "2026-04-09T10:00:01.000Z",
      },
      {
        sequence: 2,
        kind: "output",
        payload: "sdkwork-terminal",
        occurredAt: "2026-04-09T10:00:02.000Z",
      },
      {
        sequence: 3,
        kind: "exit",
        payload: "{\"exitCode\":0}",
        occurredAt: "2026-04-09T10:00:03.000Z",
      },
    ],
  });

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.runtimeSessionId, "session-0001");
  assert.equal(snapshot.runtimeAttachmentId, "attachment-0001");
  assert.equal(snapshot.runtimeCursor, "3");
  assert.equal(snapshot.runtimeState, "exited");
  assert.equal(snapshot.runtimeStreamStarted, true);
  assert.equal(snapshot.lastExitCode, 0);
  assert.deepEqual(snapshot.snapshot.visibleLines, []);
});

test("desktop terminal shell can restart an exited runtime in place", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const initialTab = getTerminalShellSnapshot(state).activeTab;
  const tabId = initialTab.id;

  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-restart-0001",
    attachmentId: "attachment-restart-0001",
    cursor: "0",
  });
  state = applyTerminalShellReplayEntries(state, tabId, {
    nextCursor: "3",
    entries: [
      {
        sequence: 1,
        kind: "output",
        payload: "PowerShell ready\r\n",
        occurredAt: "2026-04-10T11:00:01.000Z",
      },
      {
        sequence: 2,
        kind: "output",
        payload: "PS D:\\sdkwork-terminal> ",
        occurredAt: "2026-04-10T11:00:02.000Z",
      },
      {
        sequence: 3,
        kind: "exit",
        payload: "{\"exitCode\":1}",
        occurredAt: "2026-04-10T11:00:03.000Z",
      },
    ],
  });

  state = restartTerminalShellTabRuntime(state, tabId);
  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.id, tabId);
  assert.equal(snapshot.profile, initialTab.profile);
  assert.equal(snapshot.runtimeSessionId, null);
  assert.equal(snapshot.runtimeAttachmentId, null);
  assert.equal(snapshot.runtimeCursor, null);
  assert.equal(snapshot.runtimeState, "idle");
  assert.equal(snapshot.runtimePendingInput, "");
  assert.equal(snapshot.runtimeStreamStarted, false);
  assert.equal(snapshot.lastExitCode, null);
  assert.deepEqual(snapshot.snapshot.visibleLines, []);
});

test("desktop terminal shell can queue one bootstrap retry without dropping pending input", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = appendTerminalShellPendingRuntimeInput(state, tabId, "echo sdkwork\r");
  state = markTerminalShellSessionRuntimeBinding(state, tabId);

  let snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimeState, "binding");
  assert.equal(snapshot.runtimeBootstrapAttempts, 1);
  assert.equal(snapshot.runtimeStreamStarted, false);
  assert.equal(
    shouldAutoRetryTerminalShellBootstrap({
      attempt: snapshot.runtimeBootstrapAttempts,
      maxAutoRetries: 1,
    }),
    true,
  );

  state = queueTerminalShellTabRuntimeBootstrapRetry(
    state,
    tabId,
    "spawn failed: shell bootstrap timeout",
  );
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimeState, "retrying");
  assert.equal(snapshot.runtimePendingInput, "echo sdkwork\r");
  assert.equal(snapshot.runtimeBootstrapAttempts, 1);
  assert.equal(
    snapshot.runtimeBootstrapLastError,
    "spawn failed: shell bootstrap timeout",
  );
  assert.deepEqual(snapshot.snapshot.visibleLines, []);

  state = resumeTerminalShellTabRuntimeBootstrap(state, tabId);
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimeState, "idle");
  assert.equal(snapshot.runtimePendingInput, "echo sdkwork\r");

  state = markTerminalShellSessionRuntimeBinding(state, tabId);
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimeState, "binding");
  assert.equal(snapshot.runtimeBootstrapAttempts, 2);
  assert.equal(
    shouldAutoRetryTerminalShellBootstrap({
      attempt: snapshot.runtimeBootstrapAttempts,
      maxAutoRetries: 1,
    }),
    false,
  );
});

test("desktop terminal shell queues bootstrap command text into runtime input instead of writing PTY directly", () => {
  let state = createTerminalShellState({ mode: "desktop" });

  state = openTerminalShellTab(state, {
    profile: "bash",
    title: "Codex",
    commandText: "codex",
  });

  const tabId = getTerminalShellSnapshot(state).activeTab.id;
  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-codex-0001",
    attachmentId: "attachment-codex-0001",
    cursor: "0",
  });
  state = queueTerminalShellTabBootstrapCommand(state, tabId);

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.runtimeState, "running");
  assert.equal(snapshot.commandText, "");
  assert.equal(snapshot.commandCursor, 0);
  assert.equal(snapshot.runtimePendingInput, "codex\r");
  assert.deepEqual(snapshot.runtimePendingInputQueue, [
    {
      kind: "text",
      data: "codex\r",
    },
  ]);
});

test("desktop terminal shell can manually restart a failed bootstrap without dropping queued input", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = appendTerminalShellPendingRuntimeInput(state, tabId, "pwd\r");
  state = markTerminalShellSessionRuntimeBinding(state, tabId);
  state = applyTerminalShellExecutionFailure(
    state,
    tabId,
    "spawn failed: profile unavailable",
  );

  state = restartTerminalShellTabRuntime(state, tabId, {
    preservePendingInput: true,
  });

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.runtimeState, "idle");
  assert.equal(snapshot.runtimePendingInput, "pwd\r");
  assert.equal(snapshot.runtimeStreamStarted, false);
  assert.equal(snapshot.runtimeBootstrapAttempts, 0);
  assert.equal(snapshot.runtimeBootstrapLastError, null);
  assert.equal(snapshot.runtimeSessionId, null);
  assert.deepEqual(snapshot.snapshot.visibleLines, []);
});

test("desktop terminal shell ignores replay entries that were already applied", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-0002",
    cursor: "0",
  });
  state = applyTerminalShellReplayEntries(state, tabId, {
    nextCursor: "2",
    entries: [
      {
        sequence: 1,
        kind: "output",
        payload: "Windows PowerShell ready",
        occurredAt: "2026-04-09T10:00:01.000Z",
      },
      {
        sequence: 2,
        kind: "output",
        payload: "sdkwork-terminal",
        occurredAt: "2026-04-09T10:00:02.000Z",
      },
    ],
  });
  state = applyTerminalShellReplayEntries(state, tabId, {
    nextCursor: "2",
    entries: [
      {
        sequence: 1,
        kind: "output",
        payload: "Windows PowerShell ready",
        occurredAt: "2026-04-09T10:00:01.000Z",
      },
      {
        sequence: 2,
        kind: "output",
        payload: "sdkwork-terminal",
        occurredAt: "2026-04-09T10:00:02.000Z",
      },
    ],
  });

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.runtimeCursor, "2");
  assert.equal(snapshot.runtimeState, "running");
  assert.equal(snapshot.runtimeStreamStarted, true);
  assert.deepEqual(snapshot.snapshot.visibleLines, []);
});

test("desktop terminal shell keeps runtime replay out of the adapter transcript even with ANSI payloads", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-ansi-0001",
    cursor: "0",
  });
  state = applyTerminalShellReplayEntries(state, tabId, {
    nextCursor: "2",
    entries: [
      {
        sequence: 1,
        kind: "output",
        payload: "\u001b[32mPowerShell ready\u001b[0m\r\n",
        occurredAt: "2026-04-10T10:00:01.000Z",
      },
      {
        sequence: 2,
        kind: "output",
        payload: "PS D:\\sdkwork-terminal> ",
        occurredAt: "2026-04-10T10:00:02.000Z",
      },
    ],
  });

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.runtimeCursor, "2");
  assert.equal(snapshot.runtimeState, "running");
  assert.equal(snapshot.runtimeStreamStarted, true);
  assert.deepEqual(snapshot.snapshot.visibleLines, []);
});

test("desktop terminal shell can adopt OSC title changes without accepting blank titles", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = setTerminalShellTabTitle(state, tabId, "pwsh · workspace");
  let snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.title, "pwsh · workspace");

  state = setTerminalShellTabTitle(state, tabId, "   ");
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.title, "pwsh · workspace");
});

test("desktop terminal shell preserves useful titles when a later shell executable title arrives", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = setTerminalShellTabTitle(state, tabId, "api workspace");
  state = setTerminalShellTabTitle(
    state,
    tabId,
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
  );

  const snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.title, "api workspace");
});

test("desktop terminal shell ignores default PowerShell executable path titles", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = setTerminalShellTabTitle(
    state,
    tabId,
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.EXE",
  );

  let snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.title, "PowerShell");

  state = setTerminalShellTabTitle(state, tabId, "pwsh.exe");
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.title, "PowerShell");
});

test("desktop terminal shell preserves an adopted title when submitting a command", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = setTerminalShellTabTitle(state, tabId, "api workspace");
  state = setTerminalShellCommandText(state, tabId, "pwd");
  state = submitTerminalShellCommand(state, tabId);

  const snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.title, "api workspace");
  assert.equal(snapshot.commandText, "");
});

test("desktop terminal shell accepts very large replay payloads without polluting the adapter transcript", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;
  const largePayload =
    "A".repeat(4 * 1024 * 1024 + 128) +
    "\u001b[?1049h" +
    "\u001b[2J" +
    "\u001b[H" +
    "vim";

  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-truncate-0001",
    cursor: "0",
  });
  state = applyTerminalShellReplayEntries(state, tabId, {
    nextCursor: "1",
    entries: [
      {
        sequence: 1,
        kind: "output",
        payload: largePayload,
        occurredAt: "2026-04-10T10:00:03.000Z",
      },
    ],
  });

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.runtimeCursor, "1");
  assert.equal(snapshot.runtimeState, "running");
  assert.equal(snapshot.runtimeStreamStarted, true);
  assert.deepEqual(snapshot.snapshot.visibleLines, []);
});

test("desktop terminal shell keeps blank enter as a shell newline instead of synthetic help", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = submitTerminalShellCommand(state, tabId);

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.commandText, "");
  assert.equal(snapshot.runtimeState, "idle");
  assert.deepEqual(
    snapshot.snapshot.visibleLines.map((line) => line.text).filter((line) => line.includes("help")),
    [],
  );
});

test("desktop terminal shell buffers raw input during runtime binding and consumes it after flush", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = openTerminalShellTab(state, {
    profile: "powershell",
    title: "PowerShell 2",
  });
  const runtimeTabId = getTerminalShellSnapshot(state).activeTab.id;
  state = appendTerminalShellPendingRuntimeInput(state, runtimeTabId, "echo sdkwork\r");

  let snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimeState, "idle");
  assert.equal(snapshot.runtimePendingInput, "echo sdkwork\r");

  state = bindTerminalShellSessionRuntime(state, runtimeTabId, {
    sessionId: "session-buffer-0001",
    attachmentId: "attachment-buffer-0001",
    cursor: "0",
  });
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimeState, "running");
  assert.equal(snapshot.runtimeAttachmentId, "attachment-buffer-0001");
  assert.equal(snapshot.runtimePendingInput, "echo sdkwork\r");

  state = consumeTerminalShellPendingRuntimeInput(state, runtimeTabId, "echo ");
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimePendingInput, "sdkwork\r");

  state = consumeTerminalShellPendingRuntimeInput(state, runtimeTabId, "sdkwork\r");
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimePendingInput, "");
  assert.equal(snapshot.runtimeSessionId, "session-buffer-0001");
});

test("desktop terminal shell preserves pending binary input chunks in write order", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = appendTerminalShellPendingRuntimeInput(state, tabId, "vim");
  state = appendTerminalShellPendingRuntimeInput(state, tabId, {
    kind: "binary",
    inputBytes: [0x1b, 0x5b, 0x4d, 0x20, 0x24, 0x2a],
  });
  state = appendTerminalShellPendingRuntimeInput(state, tabId, "\r");

  let snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.runtimePendingInput, "vim\r");
  assert.deepEqual(snapshot.runtimePendingInputQueue, [
    {
      kind: "text",
      data: "vim",
    },
    {
      kind: "binary",
      inputBytes: [0x1b, 0x5b, 0x4d, 0x20, 0x24, 0x2a],
    },
    {
      kind: "text",
      data: "\r",
    },
  ]);

  state = consumeTerminalShellPendingRuntimeInput(state, tabId, "vim");
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimePendingInput, "\r");
  assert.deepEqual(snapshot.runtimePendingInputQueue, [
    {
      kind: "binary",
      inputBytes: [0x1b, 0x5b, 0x4d, 0x20, 0x24, 0x2a],
    },
    {
      kind: "text",
      data: "\r",
    },
  ]);

  state = consumeTerminalShellPendingRuntimeInput(state, tabId, {
    kind: "binary",
    inputBytes: [0x1b, 0x5b, 0x4d, 0x20, 0x24, 0x2a],
  });
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.runtimePendingInput, "\r");
  assert.deepEqual(snapshot.runtimePendingInputQueue, [
    {
      kind: "text",
      data: "\r",
    },
  ]);
});

test("terminal shell command buffer can be edited from viewport keystrokes", () => {
  let state = createTerminalShellState({ mode: "web" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = appendTerminalShellCommandText(state, tabId, "echo");
  state = appendTerminalShellCommandText(state, tabId, " sdkwork");
  state = backspaceTerminalShellCommandText(state, tabId);

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.commandText, "echo sdkwor");
});

test("terminal shell prompt input supports readline-style home, end, delete, and kill shortcuts", () => {
  let state = createTerminalShellState({ mode: "web" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = setTerminalShellCommandText(state, tabId, "abcdef");
  state = applyTerminalShellPromptInput(state, tabId, "\u0001");
  state = applyTerminalShellPromptInput(state, tabId, "X");
  state = applyTerminalShellPromptInput(state, tabId, "\u0005");
  state = applyTerminalShellPromptInput(state, tabId, "!");

  let snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.commandText, "Xabcdef!");
  assert.equal(snapshot.commandCursor, "Xabcdef!".length);

  state = applyTerminalShellPromptInput(state, tabId, "\u0001");
  state = applyTerminalShellPromptInput(state, tabId, "\u001b[C");
  state = applyTerminalShellPromptInput(state, tabId, "\u001b[C");
  state = applyTerminalShellPromptInput(state, tabId, "\u0004");
  state = applyTerminalShellPromptInput(state, tabId, "\u000b");

  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.commandText, "Xa");
  assert.equal(snapshot.commandCursor, 2);
});

test("new terminal tabs can inherit the active viewport before session bootstrap", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const firstTabId = getTerminalShellSnapshot(state).activeTab.id;

  state = resizeTerminalShellTab(state, firstTabId, { cols: 148, rows: 40 });
  state = openTerminalShellTab(state, {
    profile: "powershell",
    viewport: { cols: 148, rows: 40 },
  });

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.snapshot.viewport.cols, 148);
  assert.equal(snapshot.snapshot.viewport.rows, 40);
});

test("desktop connector tabs resolve interactive bootstrap requests and preserve them across restart", () => {
  let state = createTerminalShellState({ mode: "desktop" });

  state = openTerminalShellTab(state, {
    profile: "bash",
    title: "SSH",
    targetLabel: "ssh / ops@prod-bastion",
    runtimeBootstrap: {
      kind: "connector",
      request: {
        workspaceId: "workspace-demo",
        target: "ssh",
        authority: "ops@prod-bastion",
        command: ["bash", "-l"],
        modeTags: ["cli-native"],
        tags: ["resource:ssh", "connector:system-ssh"],
      },
    },
  });

  const connectorTabId = getTerminalShellSnapshot(state).activeTab.id;

  assert.deepEqual(
    resolveTerminalShellTabRuntimeBootstrapRequest(state, connectorTabId, {
      cols: 142,
      rows: 38,
    }),
    {
      kind: "connector",
      request: {
        workspaceId: "workspace-demo",
        target: "ssh",
        authority: "ops@prod-bastion",
        command: ["bash", "-l"],
        modeTags: ["cli-native"],
        tags: ["resource:ssh", "connector:system-ssh"],
        cols: 142,
        rows: 38,
      },
    },
  );

  state = bindTerminalShellSessionRuntime(state, connectorTabId, {
    sessionId: "session-ssh-0001",
    attachmentId: "attachment-ssh-0001",
    cursor: "0",
    workingDirectory: "/workspace",
    invokedProgram: "ssh",
  });

  let snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.workingDirectory, "/workspace");
  assert.equal(snapshot.invokedProgram, "ssh");

  state = restartTerminalShellTabRuntime(state, connectorTabId);
  assert.deepEqual(
    resolveTerminalShellTabRuntimeBootstrapRequest(state, connectorTabId, {
      cols: 120,
      rows: 32,
    }),
    {
      kind: "connector",
      request: {
        workspaceId: "workspace-demo",
        target: "ssh",
        authority: "ops@prod-bastion",
        command: ["bash", "-l"],
        modeTags: ["cli-native"],
        tags: ["resource:ssh", "connector:system-ssh"],
        cols: 120,
        rows: 32,
      },
    },
  );

  state = duplicateTerminalShellTab(state, connectorTabId);
  snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.deepEqual(
    resolveTerminalShellTabRuntimeBootstrapRequest(state, snapshot.id, {
      cols: 120,
      rows: 32,
    }),
    {
      kind: "connector",
      request: {
        workspaceId: "workspace-demo",
        target: "ssh",
        authority: "ops@prod-bastion",
        command: ["bash", "-l"],
        modeTags: ["cli-native"],
        tags: ["resource:ssh", "connector:system-ssh"],
        cols: 120,
        rows: 32,
      },
    },
  );
});

test("desktop local process tabs resolve bootstrap requests and preserve them across restart", () => {
  let state = createTerminalShellState({ mode: "desktop" });

  state = openTerminalShellTab(state, {
    profile: "shell",
    title: "Codex",
    targetLabel: "codex / local cli",
    runtimeBootstrap: {
      kind: "local-process",
      request: {
        command: ["codex"],
      },
    },
  });

  const processTabId = getTerminalShellSnapshot(state).activeTab.id;

  assert.deepEqual(
    resolveTerminalShellTabRuntimeBootstrapRequest(state, processTabId, {
      cols: 140,
      rows: 38,
    }),
    {
      kind: "local-process",
      request: {
        command: ["codex"],
        workingDirectory: process.cwd(),
        cols: 140,
        rows: 38,
      },
    },
  );

  state = bindTerminalShellSessionRuntime(state, processTabId, {
    sessionId: "session-codex-0001",
    attachmentId: "attachment-codex-0001",
    cursor: "0",
    workingDirectory: process.cwd(),
    invokedProgram: "codex",
  });

  let snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(snapshot.workingDirectory, process.cwd());
  assert.equal(snapshot.invokedProgram, "codex");

  state = restartTerminalShellTabRuntime(state, processTabId);
  assert.deepEqual(
    resolveTerminalShellTabRuntimeBootstrapRequest(state, processTabId, {
      cols: 120,
      rows: 32,
    }),
    {
      kind: "local-process",
      request: {
        command: ["codex"],
        workingDirectory: process.cwd(),
        cols: 120,
        rows: 32,
      },
    },
  );

  state = duplicateTerminalShellTab(state, processTabId);
  snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.deepEqual(
    resolveTerminalShellTabRuntimeBootstrapRequest(state, snapshot.id, {
      cols: 120,
      rows: 32,
    }),
    {
      kind: "local-process",
      request: {
        command: ["codex"],
        workingDirectory: process.cwd(),
        cols: 120,
        rows: 32,
      },
    },
  );
});

test("new desktop local process tabs can seed an explicit working directory before bootstrap", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const workingDirectory = path.resolve(process.cwd(), "workspace-picker");

  state = openTerminalShellTab(state, {
    profile: "shell",
    title: "Codex",
    targetLabel: "codex / local cli",
    workingDirectory,
    runtimeBootstrap: {
      kind: "local-process",
      request: {
        command: ["codex"],
        workingDirectory,
      },
    },
  });

  const snapshot = getTerminalShellSnapshot(state).activeTab;

  assert.equal(snapshot.workingDirectory, workingDirectory);
  assert.deepEqual(
    resolveTerminalShellTabRuntimeBootstrapRequest(state, snapshot.id, {
      cols: 128,
      rows: 34,
    }),
    {
      kind: "local-process",
      request: {
        command: ["codex"],
        workingDirectory,
        cols: 128,
        rows: 34,
      },
    },
  );
});

test("runtime bootstrap requests can be resolved from tab snapshots without the full shell state", () => {
  let state = createTerminalShellState({ mode: "desktop" });

  state = openTerminalShellTab(state, {
    profile: "bash",
    title: "Codex",
    commandText: "codex",
  });

  const snapshot = getTerminalShellSnapshot(state);
  const helper = terminalShellModel.resolveTerminalShellRuntimeBootstrapRequestFromTab;

  assert.equal(typeof helper, "function");
  assert.deepEqual(
    helper(snapshot.activeTab, {
      cols: 132,
      rows: 36,
    }),
    resolveTerminalShellTabRuntimeBootstrapRequest(state, snapshot.activeTab.id, {
      cols: 132,
      rows: 36,
    }),
  );
});

test("shell snapshot reuses unchanged tab snapshot objects across repeated reads and unrelated tab updates", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  state = openTerminalShellTab(state, {
    profile: "bash",
    title: "bash",
  });

  const firstRead = getTerminalShellSnapshot(state);
  const secondRead = getTerminalShellSnapshot(state);
  const firstTabSnapshot = firstRead.tabs.find((tab) => tab.id !== firstRead.activeTab.id);
  const secondTabSnapshot = secondRead.tabs.find((tab) => tab.id !== secondRead.activeTab.id);

  assert.equal(firstRead, secondRead);
  assert.equal(firstRead.tabs, secondRead.tabs);
  assert.equal(firstRead.activeTab, secondRead.activeTab);
  assert.equal(firstTabSnapshot, secondTabSnapshot);

  state = setTerminalShellCommandText(state, firstRead.activeTab.id, "pwd");

  const thirdRead = getTerminalShellSnapshot(state);
  const thirdTabSnapshot = thirdRead.tabs.find((tab) => tab.id !== thirdRead.activeTab.id);

  assert.equal(firstTabSnapshot, thirdTabSnapshot);
  assert.notEqual(secondRead.activeTab, thirdRead.activeTab);
});

test("desktop runtime input stays queueable during idle bootstrap and stops after failure or exit", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  let snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(canQueueTerminalShellRuntimeInput(snapshot), true);

  state = markTerminalShellSessionRuntimeBinding(state, tabId);
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(canQueueTerminalShellRuntimeInput(snapshot), true);

  state = queueTerminalShellTabRuntimeBootstrapRetry(
    state,
    tabId,
    "spawn failed: shell bootstrap timeout",
  );
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(canQueueTerminalShellRuntimeInput(snapshot), true);

  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-runtime-0001",
    attachmentId: "attachment-runtime-0001",
    cursor: "0",
  });
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(canQueueTerminalShellRuntimeInput(snapshot), true);

  state = applyTerminalShellReplayEntries(state, tabId, {
    nextCursor: "1",
    entries: [
      {
        sequence: 1,
        kind: "exit",
        payload: "{\"exitCode\":0}",
        occurredAt: "2026-04-10T12:00:01.000Z",
      },
    ],
  });
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(canQueueTerminalShellRuntimeInput(snapshot), false);

  state = restartTerminalShellTabRuntime(state, tabId);
  state = applyTerminalShellExecutionFailure(state, tabId, "spawn failed: profile unavailable");
  snapshot = getTerminalShellSnapshot(state).activeTab;
  assert.equal(canQueueTerminalShellRuntimeInput(snapshot), false);
});

test("runtime replay model no longer stores raw runtime screen buffers in React state", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "model.ts"),
    "utf8",
  );

  assert.doesNotMatch(source, /runtimeTerminalContent/);
  assert.doesNotMatch(source, /runtimeContentTruncated/);
  assert.doesNotMatch(source, /clearTerminalShellRuntimeContent/);
});

test("runtime replay scans replay entries directly instead of pre-filtering a copied batch", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "model.ts"),
    "utf8",
  );

  assert.match(source, /for \(const entry of replay\.entries\) \{/);
  assert.match(source, /if \(currentCursor !== null && entry\.sequence <= currentCursor\) \{\s*continue;\s*\}/);
  assert.doesNotMatch(source, /replay\.entries\.filter\(/);
});

test("stale runtime replay batches preserve shell state identity", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-identity-0001",
    attachmentId: "attachment-identity-0001",
    cursor: "4",
  });

  const nextState = applyTerminalShellReplayEntries(state, tabId, {
    nextCursor: "4",
    entries: [
      {
        sequence: 4,
        kind: "output",
        payload: "ignored",
        occurredAt: "2026-04-11T00:00:00.000Z",
      },
    ],
  });

  assert.equal(nextState, state);
});

test("replay batch helper applies multiple tab updates while preserving stale tab references", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const firstTabId = getTerminalShellSnapshot(state).activeTab.id;

  state = openTerminalShellTab(state, {
    profile: "bash",
    title: "ubuntu",
  });
  const secondTabId = getTerminalShellSnapshot(state).activeTab.id;

  state = bindTerminalShellSessionRuntime(state, firstTabId, {
    sessionId: "session-batch-0001",
    attachmentId: "attachment-batch-0001",
    cursor: "2",
  });
  state = bindTerminalShellSessionRuntime(state, secondTabId, {
    sessionId: "session-batch-0002",
    attachmentId: "attachment-batch-0002",
    cursor: "0",
  });

  const firstTabBefore = state.tabs.find((tab) => tab.id === firstTabId);
  const secondTabBefore = state.tabs.find((tab) => tab.id === secondTabId);

  const nextState = applyTerminalShellReplayBatches(state, [
    {
      tabId: firstTabId,
      nextCursor: "2",
      entries: [
        {
          sequence: 2,
          kind: "output",
          payload: "stale",
          occurredAt: "2026-04-11T00:00:00.000Z",
        },
      ],
    },
    {
      tabId: secondTabId,
      nextCursor: "1",
      entries: [
        {
          sequence: 1,
          kind: "output",
          payload: "pwd\r\n/workspace\r\n",
          occurredAt: "2026-04-11T00:00:01.000Z",
        },
      ],
    },
  ]);

  const firstTabAfter = nextState.tabs.find((tab) => tab.id === firstTabId);
  const secondTabAfter = nextState.tabs.find((tab) => tab.id === secondTabId);

  assert.equal(firstTabAfter, firstTabBefore);
  assert.notEqual(secondTabAfter, secondTabBefore);
  assert.equal(secondTabAfter?.runtimeCursor, "1");
  assert.equal(secondTabAfter?.runtimeStreamStarted, true);
});

test("stale replay batch helper preserves shell state identity", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const tabId = getTerminalShellSnapshot(state).activeTab.id;

  state = bindTerminalShellSessionRuntime(state, tabId, {
    sessionId: "session-batch-identity-0001",
    attachmentId: "attachment-batch-identity-0001",
    cursor: "7",
  });

  const nextState = applyTerminalShellReplayBatches(state, [
    {
      tabId,
      nextCursor: "7",
      entries: [
        {
          sequence: 7,
          kind: "output",
          payload: "ignored",
          occurredAt: "2026-04-11T00:00:02.000Z",
        },
      ],
    },
  ]);

  assert.equal(nextState, state);
});

test("withTab replaces a single indexed tab instead of mapping the full tab array", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "model.ts"),
    "utf8",
  );

  assert.match(source, /function getTabIndexOrThrow\(state: TerminalShellState, tabId: string\)/);
  assert.match(source, /const tabIndex = getTabIndexOrThrow\(state, tabId\);/);
  assert.match(source, /const tabs = state\.tabs\.slice\(\);/);
  assert.match(source, /tabs\[tabIndex\] = nextTab;/);
  assert.doesNotMatch(source, /tabs: state\.tabs\.map\(/);
});

test("replay batch helper keeps batch application in the model layer instead of state reduce chaining", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "model.ts"),
    "utf8",
  );

  assert.match(source, /export function applyTerminalShellReplayBatches\(/);
  assert.match(source, /let tabs: TerminalShellTabState\[\] \| null = null;/);
  assert.match(source, /const currentTab = \(tabs \?\? state\.tabs\)\[tabIndex\]!;/);
  assert.match(source, /if \(!tabs\) \{\s*tabs = state\.tabs\.slice\(\);\s*\}/);
});
