import test from "node:test";
import assert from "node:assert/strict";

import {
  createTerminalShellState,
  type TerminalShellState,
} from "../packages/sdkwork-terminal-shell/src/model.ts";
import { createShellStateBridge } from "../packages/sdkwork-terminal-shell/src/shell-state-bridge.ts";

function createBridgeHarness() {
  let state = createTerminalShellState({ mode: "desktop" });
  const initialState = state;
  const consoleErrors: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args);
  };

  const bridge = createShellStateBridge({
    snapshotTabById: new Map(),
    setShellState(update) {
      state =
        typeof update === "function"
          ? update(state)
          : update;
    },
  });

  return {
    bridge,
    consoleErrors,
    get state() {
      return state;
    },
    initialState,
    restoreConsole() {
      console.error = originalConsoleError;
    },
  };
}

test("shell state bridge contains synchronous updater failures and preserves current state", () => {
  const harness = createBridgeHarness();
  try {
    assert.doesNotThrow(() => {
      harness.bridge.updateShellState(() => {
        throw new Error("sync state update failed");
      });
    });

    assert.equal(harness.state, harness.initialState);
    assert.equal(harness.consoleErrors.length, 1);
    assert.match(String(harness.consoleErrors[0]?.[0] ?? ""), /shell state update failed/);
  } finally {
    harness.restoreConsole();
  }
});

test("shell state bridge contains deferred updater failures and preserves current state", () => {
  const harness = createBridgeHarness();
  try {
    assert.doesNotThrow(() => {
      harness.bridge.updateShellStateDeferred(() => {
        throw new Error("deferred state update failed");
      });
    });

    assert.equal(harness.state, harness.initialState);
    assert.equal(harness.consoleErrors.length, 1);
    assert.match(String(harness.consoleErrors[0]?.[0] ?? ""), /shell state update failed/);
  } finally {
    harness.restoreConsole();
  }
});
