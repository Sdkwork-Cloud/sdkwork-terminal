import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("runtime status overlay centralizes warning title styling, queued preview, and restart action", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-runtime-status-overlay.tsx",
    ),
    "utf8",
  );

  assert.match(source, /export interface TerminalRuntimeStatusOverlayProps/);
  assert.match(source, /status: TerminalRuntimeOverlayStatusDescriptor;/);
  assert.match(source, /onRestart\?: \(\) => void;/);
  assert.match(source, /export function TerminalRuntimeStatusOverlay/);
  assert.match(source, /data-slot="terminal-runtime-status"/);
  assert.match(source, /props\.status\.warning/);
  assert.match(source, /terminalRuntimeStatusTitleWarningStyle/);
  assert.match(source, /terminalRuntimeStatusTitleStyle/);
  assert.match(source, /Input queued:/);
  assert.match(source, /props\.status\.pendingPreview/);
  assert.match(source, /props\.status\.canRestart && props\.onRestart/);
  assert.match(source, /data-slot="terminal-runtime-restart"/);
  assert.match(source, /Restart shell/);
});
