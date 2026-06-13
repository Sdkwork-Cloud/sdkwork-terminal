import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal viewport surface centralizes search overlay, host surface, host status, and context menu chrome", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-viewport-surface.tsx",
    ),
    "utf8",
  );

  assert.match(source, /export interface TerminalViewportSurfaceProps/);
  assert.match(source, /hostRef\?: Ref<HTMLDivElement>;/);
  assert.match(source, /hostDataSlot\?: string;/);
  assert.match(source, /contextMenuRef\?: Ref<HTMLDivElement>;/);
  assert.match(source, /searchOverlayOpen: boolean;/);
  assert.match(source, /searchInputRef\?: Ref<HTMLInputElement>;/);
  assert.match(source, /searchQuery: string;/);
  assert.match(source, /onSearchQueryChange: \(query: string\) => void;/);
  assert.match(source, /onSearchClose: \(\) => void;/);
  assert.match(source, /onSearchSubmit: \(\) => void;/);
  assert.match(source, /onOpenViewportContextMenu: \(menu: \{ x: number; y: number \}\) => void;/);
  assert.match(source, /viewportContextMenu: \{ x: number; y: number \} \| null;/);
  assert.match(source, /onDismissViewportContextMenu: \(\) => void;/);
  assert.match(source, /viewportActions: Pick</);
  assert.match(source, /hostStatus: \{/);
  assert.match(source, /\} \| null;/);
  assert.match(source, /onClearTerminal\?: \(\) => void;/);
  assert.match(source, /export function TerminalViewportSurface/);
  assert.match(source, /<TerminalSearchOverlay/);
  assert.match(source, /<TerminalHostStatusOverlay/);
  assert.match(source, /<TerminalViewportContextMenu/);
  assert.match(source, /data-slot=\{props\.hostDataSlot\}/);
  assert.match(source, /style=\{terminalViewportStyle\}/);
  assert.match(source, /props\.onOpenViewportContextMenu\(\{ x: event\.clientX, y: event\.clientY \}\);/);
  assert.match(source, /onRequestClose=\{props\.onDismissViewportContextMenu\}/);
  assert.match(source, /menuRef=\{props\.contextMenuRef\}/);
  assert.match(source, /import \{ runTerminalTaskBestEffort \} from "\.\/terminal-async-boundary\.ts";/);
  assert.match(
    source,
    /onCopy=\{\(\) => \{\s*runTerminalTaskBestEffort\(\s*props\.viewportActions\.copySelectionToClipboard,\s*\);\s*\}\}/,
  );
  assert.match(
    source,
    /onPaste=\{\(\) => \{\s*runTerminalTaskBestEffort\(\s*props\.viewportActions\.pasteClipboardIntoTerminal,\s*\);\s*\}\}/,
  );
  assert.match(
    source,
    /onSelectAll=\{\(\) => \{\s*runTerminalTaskBestEffort\(\s*props\.viewportActions\.selectAllTerminalViewport,\s*\);\s*\}\}/,
  );
  assert.match(source, /onFind=\{\(\) => \{\s*props\.viewportActions\.openTerminalSearch\(\);\s*\}\}/);
});
