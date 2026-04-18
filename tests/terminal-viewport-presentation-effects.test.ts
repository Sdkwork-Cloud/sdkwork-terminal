import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal viewport presentation hook centralizes menu dismissal, search focus, and font-load viewport sync", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-viewport-presentation-effects.ts",
    ),
    "utf8",
  );

  assert.match(source, /export interface UseTerminalViewportPresentationEffectsArgs/);
  assert.match(source, /viewportContextMenuOpen: boolean;/);
  assert.match(source, /contextMenuRef: RefObject<HTMLDivElement \| null>;/);
  assert.match(source, /dismissViewportContextMenu: \(\) => void;/);
  assert.match(source, /searchOverlayOpen: boolean;/);
  assert.match(source, /searchInput: HTMLInputElement \| null;/);
  assert.match(source, /fontSize: number;/);
  assert.match(source, /stageKey: string;/);
  assert.match(source, /active: boolean;/);
  assert.match(source, /applyFontSize: \(fontSize: number\) => void;/);
  assert.match(source, /triggerViewportMeasurement: \(\) => Promise<boolean> \| boolean;/);
  assert.match(source, /focusViewport: \(\) => Promise<void> \| void;/);
  assert.match(source, /export function useTerminalViewportPresentationEffects/);
  assert.match(source, /const dismissViewportContextMenu = \(event: MouseEvent\) => \{/);
  assert.match(source, /if \(args\.contextMenuRef\.current\?\.contains\(event\.target as Node\)\) \{\s*return;\s*\}/);
  assert.match(source, /document\.addEventListener\("mousedown", dismissViewportContextMenu\);/);
  assert.match(source, /documentFonts\.addEventListener\?\.\("loadingdone", handleLoadingDone\);/);
  assert.match(source, /window\.addEventListener\("focus", syncViewportToForeground\);/);
  assert.match(source, /document\.addEventListener\("visibilitychange", handleVisibilityChange\);/);
  assert.match(source, /if \(document\.visibilityState === "visible"\) \{\s*syncViewportToForeground\(\);\s*\}/);
  assert.match(source, /const TERMINAL_VIEWPORT_METRICS_EVENT = "sdkwork-terminal:viewport-metrics-changed";/);
  assert.match(source, /let animationFrameHandle: number \| null = null;/);
  assert.match(source, /window\.cancelAnimationFrame\(animationFrameHandle\);/);
  assert.match(source, /animationFrameHandle = window\.requestAnimationFrame\(\(\) => \{/);
  assert.match(source, /window\.addEventListener\("resize", syncViewportMetrics\);/);
  assert.match(source, /window\.addEventListener\(TERMINAL_VIEWPORT_METRICS_EVENT,\s*syncViewportMetrics\);/);
  assert.match(source, /window\.visualViewport\?\.addEventListener\("resize", syncViewportMetrics\);/);
  assert.doesNotMatch(
    source,
    /window\.addEventListener\("resize", syncViewportMetrics\);[\s\S]*window\.visualViewport\?\.addEventListener\("resize", syncViewportMetrics\);[\s\S]*await args\.focusViewport\(\);/,
  );
  assert.match(source, /focusTerminalSearchInput\(args\.searchInput\);/);
  assert.match(
    source,
    /if \(!args\.active\) \{\s*return;\s*\}\s*void \(async \(\) => \{\s*args\.applyFontSize\(args\.fontSize\);/,
  );
  assert.match(source, /await args\.triggerViewportMeasurement\(\);/);
  assert.match(source, /await args\.focusViewport\(\);/);
});
