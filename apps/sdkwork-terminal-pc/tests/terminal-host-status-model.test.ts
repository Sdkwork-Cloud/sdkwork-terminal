import test from "node:test";
import assert from "node:assert/strict";

import { createTerminalHostStatusViewModel } from "../packages/sdkwork-terminal-shell/src/terminal-host-status.ts";

test("terminal host status view model exposes retry only for warning states that are visible", () => {
  let retried = 0;
  const hostStatus = createTerminalHostStatusViewModel({
    descriptor: {
      show: true,
      title: "Terminal surface failed",
      detail: "Retry terminal surface to continue.",
      warning: true,
    },
    onRetry() {
      retried += 1;
    },
  });

  assert.equal(hostStatus?.title, "Terminal surface failed");
  assert.equal(hostStatus?.warning, true);
  assert.equal(typeof hostStatus?.onRetry, "function");
  hostStatus?.onRetry?.();
  assert.equal(retried, 1);
});

test("terminal host status view model hides non-visible or non-warning retry actions", () => {
  const readyStatus = createTerminalHostStatusViewModel({
    descriptor: {
      show: true,
      title: "Initializing terminal surface",
      detail: "Attaching host.",
      warning: false,
    },
    onRetry() {
      throw new Error("retry should not be exposed");
    },
  });
  const hiddenStatus = createTerminalHostStatusViewModel({
    descriptor: {
      show: false,
      title: "",
      detail: "",
      warning: false,
    },
    onRetry() {
      throw new Error("retry should not be exposed");
    },
  });

  assert.equal(readyStatus?.onRetry, undefined);
  assert.equal(hiddenStatus, null);
});
