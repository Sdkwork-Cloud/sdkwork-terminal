import test from "node:test";
import assert from "node:assert/strict";

import {
  bindTerminalShellSessionRuntime,
  createTerminalShellState,
  getTerminalShellSnapshot,
  openTerminalShellTab,
} from "../packages/sdkwork-terminal-pc-shell/src/model.ts";
import {
  requiresTerminalCloseConfirmation,
  resolveTerminalCloseRequest,
} from "../packages/sdkwork-terminal-pc-shell/src/terminal-close-guard.ts";
import { closeTerminalShellTabsWithRuntime } from "../packages/sdkwork-terminal-pc-shell/src/terminal-tab-actions.ts";

test("terminal close guard asks before stopping a running session", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const firstTabId = getTerminalShellSnapshot(state).activeTab.id;
  state = openTerminalShellTab(state, { profile: "bash", title: "bash" });
  state = bindTerminalShellSessionRuntime(state, firstTabId, {
    sessionId: "session-close-guard-0001",
    attachmentId: "attachment-close-guard-0001",
    cursor: "0",
  });

  const request = resolveTerminalCloseRequest({
    operation: "tab",
    tabId: firstTabId,
    tabs: getTerminalShellSnapshot(state).tabs,
  });

  assert.deepEqual(request, {
    operation: "tab",
    anchorTabId: firstTabId,
    tabIds: [firstTabId],
    runningTabIds: [firstTabId],
  });
  assert.equal(requiresTerminalCloseConfirmation(request!), true);
});

test("terminal close guard keeps exited sessions out of the confirmation requirement", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const firstTabId = getTerminalShellSnapshot(state).activeTab.id;
  state = openTerminalShellTab(state, { profile: "bash", title: "bash" });
  const snapshot = getTerminalShellSnapshot(state);
  const request = resolveTerminalCloseRequest({
    operation: "tab",
    tabId: firstTabId,
    tabs: snapshot.tabs,
  });

  assert.deepEqual(request?.runningTabIds, []);
  assert.equal(requiresTerminalCloseConfirmation(request!), false);
});

test("bulk close requests retain an exact target set and count only live sessions", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const firstTabId = getTerminalShellSnapshot(state).activeTab.id;
  state = openTerminalShellTab(state, { profile: "bash", title: "bash" });
  const secondTabId = getTerminalShellSnapshot(state).activeTab.id;
  state = openTerminalShellTab(state, { profile: "shell", title: "shell" });
  const thirdTabId = getTerminalShellSnapshot(state).activeTab.id;
  state = bindTerminalShellSessionRuntime(state, secondTabId, {
    sessionId: "session-close-guard-0002",
    attachmentId: "attachment-close-guard-0002",
    cursor: "0",
  });

  const request = resolveTerminalCloseRequest({
    operation: "others",
    tabId: firstTabId,
    tabs: getTerminalShellSnapshot(state).tabs,
  });

  assert.deepEqual(request?.tabIds, [secondTabId, thirdTabId]);
  assert.deepEqual(request?.runningTabIds, [secondTabId]);
  assert.equal(requiresTerminalCloseConfirmation(request!), true);
});

test("confirmed terminal close terminates only the captured target sessions", () => {
  let state = createTerminalShellState({ mode: "desktop" });
  const firstTabId = getTerminalShellSnapshot(state).activeTab.id;
  state = openTerminalShellTab(state, { profile: "bash", title: "bash" });
  const secondTabId = getTerminalShellSnapshot(state).activeTab.id;
  state = bindTerminalShellSessionRuntime(state, firstTabId, {
    sessionId: "session-close-guard-0003",
    attachmentId: "attachment-close-guard-0003",
    cursor: "0",
  });
  state = bindTerminalShellSessionRuntime(state, secondTabId, {
    sessionId: "session-close-guard-0004",
    attachmentId: "attachment-close-guard-0004",
    cursor: "0",
  });
  const terminatedSessionIds: string[] = [];

  closeTerminalShellTabsWithRuntime({
    tabIds: [firstTabId],
    snapshotTabs: getTerminalShellSnapshot(state).tabs,
    setContextMenu() {},
    updateShellState(update) {
      state = update(state);
    },
    runtimeInputWriteChainsRef: { current: new Map() },
    runtimeInputWriteGenerationsRef: { current: new Map() },
    mode: "desktop",
    desktopRuntimeClient: {
      async terminateSession(sessionId: string) {
        terminatedSessionIds.push(sessionId);
        return {
          sessionId,
          state: "terminated",
        };
      },
    } as never,
  });

  assert.deepEqual(terminatedSessionIds, ["session-close-guard-0003"]);
  assert.deepEqual(
    getTerminalShellSnapshot(state).tabs.map((tab) => tab.id),
    [secondTabId],
  );
});
