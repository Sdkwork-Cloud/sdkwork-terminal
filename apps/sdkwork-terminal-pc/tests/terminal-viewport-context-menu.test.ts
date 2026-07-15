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
      "sdkwork-terminal-pc-shell",
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
  assert.match(source, /onRestoreFocus: \(\) => Promise<void> \| void;/);
  assert.match(source, /createViewportContextMenuStyle/);
  assert.match(source, /viewportContextMenuItemStyle/);
  assert.match(source, /shortcutHintStyle/);
  assert.match(source, /resolveTerminalViewportShortcutHint\(args\.shortcut\)/);
  assert.match(source, /ref=\{props\.menuRef\}/);
  assert.match(source, /focusFirstTerminalMenuItem\(menu\);/);
  assert.match(source, /resolveTerminalMenuKeyboardAction\(event\.key\)/);
  assert.match(source, /moveTerminalMenuFocus\(\{\s*container: event\.currentTarget,\s*action,\s*\}\);/);
  assert.match(source, /if \(action === "close"\) \{\s*closeMenuAndRestoreFocus\(\);/);
  assert.match(source, /onKeyDown=\{handleMenuKeyDown\}/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /runTerminalTaskBestEffort\(args\.onRestoreFocus\);/);
  assert.doesNotMatch(
    source,
    /JSX\.Element/u,
    "shared terminal shell source must not depend on the legacy global JSX namespace because React 19 consumers compile shared source without that namespace.",
  );
  assert.match(source, /if \(props\.onClearTerminal\) \{/);
  assert.match(
    source,
    /props\.messages \?\? terminalViewportContextMenuMessagesEnUS/,
  );
  assert.match(source, /aria-label=\{messages\.menuAriaLabel\}/);
  assert.match(source, /label: messages\.copyActionLabel/);
  assert.match(source, /label: messages\.pasteActionLabel/);
  assert.match(source, /label: messages\.selectAllActionLabel/);
  assert.match(source, /label: messages\.clearTerminalActionLabel/);
  assert.match(source, /label: messages\.findActionLabel/);
});


