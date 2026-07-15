import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveTerminalMenuFocusIndex,
  resolveTerminalMenuKeyboardAction,
} from "../packages/sdkwork-terminal-pc-shell/src/terminal-menu-keyboard.ts";

test("terminal menu keyboard maps standard navigation keys", () => {
  assert.equal(resolveTerminalMenuKeyboardAction("ArrowUp"), "previous");
  assert.equal(resolveTerminalMenuKeyboardAction("ArrowDown"), "next");
  assert.equal(resolveTerminalMenuKeyboardAction("Home"), "first");
  assert.equal(resolveTerminalMenuKeyboardAction("End"), "last");
  assert.equal(resolveTerminalMenuKeyboardAction("Escape"), "close");
  assert.equal(resolveTerminalMenuKeyboardAction("Tab"), null);
});

test("terminal menu keyboard wraps focus between available actions", () => {
  assert.equal(
    resolveTerminalMenuFocusIndex({ action: "previous", currentIndex: 0, itemCount: 3 }),
    2,
  );
  assert.equal(
    resolveTerminalMenuFocusIndex({ action: "next", currentIndex: 2, itemCount: 3 }),
    0,
  );
  assert.equal(
    resolveTerminalMenuFocusIndex({ action: "first", currentIndex: 1, itemCount: 3 }),
    0,
  );
  assert.equal(
    resolveTerminalMenuFocusIndex({ action: "last", currentIndex: 1, itemCount: 3 }),
    2,
  );
});

test("terminal menu keyboard selects the appropriate edge when focus enters a menu", () => {
  assert.equal(
    resolveTerminalMenuFocusIndex({ action: "next", currentIndex: -1, itemCount: 3 }),
    0,
  );
  assert.equal(
    resolveTerminalMenuFocusIndex({ action: "previous", currentIndex: -1, itemCount: 3 }),
    2,
  );
  assert.equal(
    resolveTerminalMenuFocusIndex({ action: "next", currentIndex: -1, itemCount: 0 }),
    null,
  );
});
