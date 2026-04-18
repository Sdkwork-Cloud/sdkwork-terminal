import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal viewport context menu centralizes standard actions and optional clear entry", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-viewport-context-menu.tsx",
    ),
    "utf8",
  );

  assert.match(source, /export function TerminalViewportContextMenu/);
  assert.match(source, /menuRef\?: Ref<HTMLDivElement>;/);
  assert.match(source, /onCopy: \(\) => void;/);
  assert.match(source, /onPaste: \(\) => void;/);
  assert.match(source, /onSelectAll: \(\) => void;/);
  assert.match(source, /onFind: \(\) => void;/);
  assert.match(source, /onClearTerminal\?: \(\) => void;/);
  assert.match(source, /createViewportContextMenuStyle/);
  assert.match(source, /viewportContextMenuItemStyle/);
  assert.match(source, /shortcutHintStyle/);
  assert.match(source, /resolveTerminalViewportShortcutHint\(args\.shortcut\)/);
  assert.match(source, /ref=\{props\.menuRef\}/);
  assert.match(source, /if \(props\.onClearTerminal\) \{/);
  assert.match(source, /Clear Terminal/);
});
