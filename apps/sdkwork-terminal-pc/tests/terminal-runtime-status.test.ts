import test from "node:test";
import assert from "node:assert/strict";

import {
  createTerminalRuntimeStatusViewModel,
  type TerminalRuntimeStatusTab,
} from "../packages/sdkwork-terminal-shell/src/terminal-runtime-status.ts";

function createRuntimeStatusTab(
  overrides: Partial<TerminalRuntimeStatusTab> = {},
): TerminalRuntimeStatusTab {
  return {
    title: "PowerShell",
    targetLabel: "local pwsh / desktop host",
    runtimeState: "idle",
    runtimeBootstrapAttempts: 1,
    runtimeBootstrapLastError: null,
    runtimePendingInput: "",
    runtimePendingInputQueue: [],
    lastExitCode: null,
    ...overrides,
  };
}

test("runtime status view model keeps retry messaging aligned across bootstrap and runtime startup", () => {
  const viewModel = createTerminalRuntimeStatusViewModel({
    tab: createRuntimeStatusTab({
      runtimeState: "binding",
      runtimeBootstrapAttempts: 2,
      runtimeBootstrapLastError: "spawn failed",
    }),
    showBootstrapOverlay: true,
  });

  assert.equal(viewModel.bootstrap.title, "Retrying shell");
  assert.match(viewModel.bootstrap.detail, /Previous launch failed: spawn failed/);
  assert.equal(viewModel.runtime, null);
});

test("runtime status view model surfaces queued input once the bootstrap overlay is gone", () => {
  const viewModel = createTerminalRuntimeStatusViewModel({
    tab: createRuntimeStatusTab({
      runtimeState: "running",
      runtimePendingInput: "pwd",
    }),
    showBootstrapOverlay: false,
  });

  assert.equal(viewModel.runtime?.title, "Input queued");
  assert.equal(viewModel.runtime?.detail, "3 chars waiting for PTY write");
  assert.equal(viewModel.runtime?.pendingPreview, "pwd");
  assert.equal(viewModel.runtime?.warning, false);
  assert.equal(viewModel.runtime?.canRestart, false);
});

test("runtime status view model marks exhausted bootstrap failures as restartable warnings", () => {
  const viewModel = createTerminalRuntimeStatusViewModel({
    tab: createRuntimeStatusTab({
      runtimeState: "failed",
      runtimeBootstrapAttempts: 2,
      runtimeBootstrapLastError: "local shell profile 'bash' is unavailable because 'bash' was not found in PATH",
    }),
    showBootstrapOverlay: false,
    autoRetryLimit: 1,
  });

  assert.equal(viewModel.runtime?.title, "Shell failed");
  assert.equal(viewModel.runtime?.warning, true);
  assert.equal(viewModel.runtime?.canRestart, true);
  assert.match(
    viewModel.runtime?.detail ?? "",
    /Automatic retry was exhausted: local shell profile 'bash' is unavailable because 'bash' was not found in PATH\. Restart shell to try again\./,
  );
});

test("runtime status view model surfaces the last bootstrap error when startup fails", () => {
  const viewModel = createTerminalRuntimeStatusViewModel({
    tab: createRuntimeStatusTab({
      runtimeState: "failed",
      runtimeBootstrapAttempts: 1,
      runtimeBootstrapLastError: "local shell profile 'bash' is unavailable because 'bash' was not found in PATH",
    }),
    showBootstrapOverlay: false,
    autoRetryLimit: 1,
  });

  assert.equal(viewModel.runtime?.title, "Shell failed");
  assert.equal(viewModel.runtime?.warning, true);
  assert.equal(viewModel.runtime?.canRestart, true);
  assert.match(
    viewModel.runtime?.detail ?? "",
    /local shell profile 'bash' is unavailable because 'bash' was not found in PATH\. Restart shell to try again\./,
  );
});

test("runtime status view model reports exit codes as restartable shell exits", () => {
  const viewModel = createTerminalRuntimeStatusViewModel({
    tab: createRuntimeStatusTab({
      runtimeState: "exited",
      lastExitCode: 137,
    }),
    showBootstrapOverlay: false,
  });

  assert.equal(viewModel.runtime?.title, "Shell exited");
  assert.equal(viewModel.runtime?.warning, true);
  assert.equal(viewModel.runtime?.canRestart, true);
  assert.match(
    viewModel.runtime?.detail ?? "",
    /Process exited with code 137\. Close this tab or open a new one\./,
  );
});
