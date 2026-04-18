import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal viewport interaction handlers centralize search close, key shortcuts, and click focus", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-viewport-interaction-handlers.ts",
    ),
    "utf8",
  );

  assert.match(source, /export interface CreateTerminalViewportInteractionHandlersArgs/);
  assert.match(source, /active: boolean;/);
  assert.match(source, /viewportActions: Pick</);
  assert.match(source, /setSearchOverlayOpen: \(open: boolean\) => void;/);
  assert.match(source, /setFontSize: Dispatch<SetStateAction<number>>;/);
  assert.match(source, /triggerViewportMeasurement: \(\) => Promise<boolean> \| boolean;/);
  assert.match(source, /focusViewport: \(\) => Promise<void> \| void;/);
  assert.match(source, /export function createTerminalViewportInteractionHandlers/);
  assert.match(source, /function closeTerminalSearch\(\)/);
  assert.match(source, /await args\.triggerViewportMeasurement\(\);/);
  assert.match(source, /await args\.focusViewport\(\);/);
  assert.match(source, /function handleTerminalStageKeyDownCapture/);
  assert.match(source, /function handleTerminalStageCopyCapture/);
  assert.match(source, /function handleTerminalStageCutCapture/);
  assert.match(source, /function handleTerminalStagePasteCapture/);
  assert.match(source, /if \(!args\.active\) \{\s*return;\s*\}/);
  assert.match(source, /if \(isTerminalSearchShortcut\(event\)\) \{/);
  assert.match(source, /if \(shouldIgnoreTerminalViewportInteractionTarget\(target\)\) \{\s*return;\s*\}/);
  assert.match(source, /if \(isTerminalCopyShortcut\(event\) \|\| isTerminalInsertCopyShortcut\(event\)\) \{/);
  assert.match(source, /if \(isTerminalPasteShortcut\(event\) \|\| isTerminalInsertPasteShortcut\(event\)\) \{/);
  assert.match(source, /if \(isTerminalSelectAllShortcut\(event\)\) \{/);
  assert.match(source, /const fontSizeAction = resolveTerminalViewportFontSizeShortcutAction\(event\);/);
  assert.match(source, /args\.setFontSize\(\(previous\) => resolveNextTerminalViewportFontSize\(previous,\s*fontSizeAction\)\);/);
  assert.match(source, /void args\.viewportActions\.copySelectionToClipboard\(\);/);
  assert.match(source, /handleTerminalStageCutCapture/);
  assert.match(source, /const pastedText = event\.clipboardData\.getData\("text"\);/);
  assert.match(source, /void args\.viewportActions\.pasteTextIntoTerminal\(pastedText\);/);
  assert.match(source, /void args\.viewportActions\.pasteClipboardIntoTerminal\(\);/);
  assert.match(source, /function handleTerminalStageClick/);
  assert.match(source, /if \(shouldIgnoreTerminalViewportInteractionTarget\(event\.target\)\) \{\s*return;\s*\}/);
});
