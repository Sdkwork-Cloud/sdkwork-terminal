import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isDesktopEnvironment } from "../packages/sdkwork-terminal-pc-desktop/src/host/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function withWindowRuntime(windowValue: unknown, run: () => void) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: windowValue,
  });

  try {
    run();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "window", originalDescriptor);
      return;
    }

    Reflect.deleteProperty(globalThis, "window");
  }
}

test("desktop host recognizes Tauri v2 while a browser runtime stays unavailable", () => {
  withWindowRuntime({}, () => {
    assert.equal(isDesktopEnvironment(), false);
  });

  withWindowRuntime({ __TAURI_INTERNALS__: {} }, () => {
    assert.equal(isDesktopEnvironment(), true);
  });
});

test("desktop surface delegates Tauri runtime detection to the host check", () => {
  const bridgeSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-desktop",
      "src",
      "surface",
      "desktop-tauri-host-bridge.ts",
    ),
    "utf8",
  );

  assert.match(
    bridgeSource,
    /import \{ isDesktopEnvironment \} from "\.\.\/host\/index\.js";/,
  );
  assert.match(
    bridgeSource,
    /export function hasTauriRuntime\(\): boolean \{\s*return isDesktopEnvironment\(\);\s*\}/,
  );
});

test("Tauri v2 auth chrome uses draggable regions and desktop-only window control binding", () => {
  const authShellSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-core",
      "src",
      "bootstrap",
      "components",
      "TerminalAuthShell.tsx",
    ),
    "utf8",
  );
  const desktopMainSource = fs.readFileSync(
    path.join(rootDir, "src", "entries", "desktop-main.tsx"),
    "utf8",
  );
  const bridgeSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-desktop",
      "src",
      "surface",
      "desktop-tauri-host-bridge.ts",
    ),
    "utf8",
  );

  assert.match(authShellSource, /__TAURI_INTERNALS__/);
  assert.match(authShellSource, /data-tauri-drag-region/);
  assert.match(authShellSource, /data-tauri-drag-region="false"/);
  assert.match(
    desktopMainSource,
    /registerDesktopWindowControlListener/,
  );
  assert.match(
    bridgeSource,
    /window\.addEventListener\(DESKTOP_WINDOW_CONTROL_EVENT, listener\)/,
  );
  assert.match(bridgeSource, /await currentWindow\.minimize\(\)/);
  assert.match(bridgeSource, /await currentWindow\.maximize\(\)/);
  assert.match(bridgeSource, /await currentWindow\.unmaximize\(\)/);
  assert.match(bridgeSource, /await currentWindow\.close\(\)/);
});
