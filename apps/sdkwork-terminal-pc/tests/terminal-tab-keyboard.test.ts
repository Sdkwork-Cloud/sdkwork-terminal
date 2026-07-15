import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveTerminalTabKeyboardNavigation,
} from "../packages/sdkwork-terminal-pc-shell/src/terminal-tab-keyboard.ts";

const tabIds = ["tab-0001", "tab-0002", "tab-0003"];

test("terminal tab keyboard navigation wraps between the first and last tabs", () => {
  assert.equal(
    resolveTerminalTabKeyboardNavigation({
      key: "ArrowLeft",
      tabIds,
      currentTabId: "tab-0001",
    }),
    "tab-0003",
  );
  assert.equal(
    resolveTerminalTabKeyboardNavigation({
      key: "ArrowRight",
      tabIds,
      currentTabId: "tab-0003",
    }),
    "tab-0001",
  );
});

test("terminal tab keyboard navigation supports Home and End", () => {
  assert.equal(
    resolveTerminalTabKeyboardNavigation({
      key: "Home",
      tabIds,
      currentTabId: "tab-0002",
    }),
    "tab-0001",
  );
  assert.equal(
    resolveTerminalTabKeyboardNavigation({
      key: "End",
      tabIds,
      currentTabId: "tab-0002",
    }),
    "tab-0003",
  );
});

test("terminal tab keyboard navigation ignores unsupported keys and stale tabs", () => {
  assert.equal(
    resolveTerminalTabKeyboardNavigation({
      key: "Enter",
      tabIds,
      currentTabId: "tab-0002",
    }),
    null,
  );
  assert.equal(
    resolveTerminalTabKeyboardNavigation({
      key: "ArrowRight",
      tabIds,
      currentTabId: "tab-missing",
    }),
    null,
  );
});
