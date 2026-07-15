import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  terminalInteractionMessagesEnUS,
  terminalInteractionMessagesZhCN,
} from "../packages/sdkwork-terminal-pc-shell/src/i18n/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("terminal interaction catalogs provide complete English and Chinese workflow copy", () => {
  const catalogs = [
    terminalInteractionMessagesEnUS,
    terminalInteractionMessagesZhCN,
  ] as const;

  for (const catalog of catalogs) {
    for (const value of Object.values(catalog.search)) {
      assert.equal(typeof value, "string");
      assert.equal(value.trim().length > 0, true);
    }

    assert.equal(catalog.pasteConfirmation.title.trim().length > 0, true);
    assert.equal(
      catalog.pasteConfirmation.description({
        lineCount: 2,
        controlCharacterCount: 3,
      }).trim().length > 0,
      true,
    );
    assert.equal(catalog.pasteConfirmation.privacyHint.trim().length > 0, true);
    assert.equal(catalog.pasteConfirmation.cancelActionLabel.trim().length > 0, true);
    assert.equal(catalog.pasteConfirmation.confirmActionLabel.trim().length > 0, true);

    assert.equal(catalog.closeConfirmation.title(2).trim().length > 0, true);
    assert.equal(
      catalog.closeConfirmation.description({
        runningSessionCount: 2,
        otherTabCount: 1,
      }).trim().length > 0,
      true,
    );
    assert.equal(catalog.closeConfirmation.confirmActionLabel(2).trim().length > 0, true);
    assert.equal(catalog.closeConfirmation.cancelActionLabel.trim().length > 0, true);

    assert.equal(catalog.tabStrip.tabListAriaLabel.trim().length > 0, true);
    assert.equal(catalog.tabStrip.scrollTabsLeft.trim().length > 0, true);
    assert.equal(catalog.tabStrip.scrollTabsRight.trim().length > 0, true);
    assert.equal(catalog.tabStrip.closeTabAriaLabel.trim().length > 0, true);

    for (const value of Object.values(catalog.viewportContextMenu)) {
      assert.equal(typeof value, "string");
      assert.equal(value.trim().length > 0, true);
    }
  }
});

test("terminal interaction components consume injected messages and retain safe defaults", () => {
  const shellRoot = path.join(
    rootDir,
    "packages",
    "sdkwork-terminal-pc-shell",
    "src",
  );
  const searchSource = fs.readFileSync(
    path.join(shellRoot, "terminal-search-overlay.tsx"),
    "utf8",
  );
  const pasteSource = fs.readFileSync(
    path.join(shellRoot, "terminal-paste-confirmation-dialog.tsx"),
    "utf8",
  );
  const closeSource = fs.readFileSync(
    path.join(shellRoot, "terminal-close-confirmation.tsx"),
    "utf8",
  );
  const shellContractSource = fs.readFileSync(
    path.join(shellRoot, "shell-contract.ts"),
    "utf8",
  );
  const panelStackSource = fs.readFileSync(
    path.join(shellRoot, "terminal-panel-stack.tsx"),
    "utf8",
  );
  const panelStackMemoSource = fs.readFileSync(
    path.join(shellRoot, "terminal-panel-stack-memo.ts"),
    "utf8",
  );
  const overlayStackSource = fs.readFileSync(
    path.join(shellRoot, "terminal-overlay-stack.tsx"),
    "utf8",
  );
  const tabStripSource = fs.readFileSync(
    path.join(shellRoot, "terminal-tab-strip.tsx"),
    "utf8",
  );
  const viewportContextMenuSource = fs.readFileSync(
    path.join(shellRoot, "terminal-viewport-context-menu.tsx"),
    "utf8",
  );
  const viewportChromeSource = fs.readFileSync(
    path.join(shellRoot, "terminal-viewport-chrome.ts"),
    "utf8",
  );
  const viewportSurfaceSource = fs.readFileSync(
    path.join(shellRoot, "terminal-viewport-surface.tsx"),
    "utf8",
  );
  const shellSource = fs.readFileSync(
    path.join(shellRoot, "index.tsx"),
    "utf8",
  );

  assert.match(searchSource, /props\.messages \?\? terminalSearchOverlayMessagesEnUS/);
  assert.match(pasteSource, /props\.messages \?\? terminalPasteConfirmationMessagesEnUS/);
  assert.match(closeSource, /props\.messages \?\? terminalCloseConfirmationMessagesEnUS/);
  assert.match(shellContractSource, /terminalInteractionMessages\?: TerminalInteractionMessages;/);
  assert.match(panelStackSource, /terminalInteractionMessages=\{props\.terminalInteractionMessages\}/);
  assert.match(
    panelStackMemoSource,
    /previousProps\.terminalInteractionMessages !== nextProps\.terminalInteractionMessages/,
  );
  assert.match(
    overlayStackSource,
    /messages=\{props\.closeConfirmationMessages\}/,
  );
  assert.match(tabStripSource, /props\.messages \?\? terminalTabStripMessagesEnUS/);
  assert.match(tabStripSource, /aria-label=\{messages\.scrollTabsLeft\}/);
  assert.match(tabStripSource, /title=\{messages\.scrollTabsLeft\}/);
  assert.match(tabStripSource, /aria-label=\{messages\.scrollTabsRight\}/);
  assert.match(tabStripSource, /title=\{messages\.scrollTabsRight\}/);
  assert.match(tabStripSource, /aria-label=\{props\.messages\.tabListAriaLabel\}/);
  assert.match(
    tabStripSource,
    /aria-label=\{props\.messages\.closeTabAriaLabel\}/,
  );
  assert.match(
    viewportContextMenuSource,
    /props\.messages \?\? terminalViewportContextMenuMessagesEnUS/,
  );
  assert.match(
    viewportContextMenuSource,
    /aria-label=\{messages\.menuAriaLabel\}/,
  );
  assert.match(
    viewportChromeSource,
    /viewportContextMenuMessages:\s*args\.terminalInteractionMessages\?\.viewportContextMenu/,
  );
  assert.match(
    viewportSurfaceSource,
    /messages=\{props\.viewportContextMenuMessages\}/,
  );
  assert.match(
    shellSource,
    /messages=\{props\.terminalInteractionMessages\?\.tabStrip\}/,
  );
  assert.doesNotMatch(pasteSource, /props\.text/);
  assert.doesNotMatch(pasteSource, /decision\.text/);
  assert.doesNotMatch(pasteSource, /clipboard contents are not shown here/i);
});
