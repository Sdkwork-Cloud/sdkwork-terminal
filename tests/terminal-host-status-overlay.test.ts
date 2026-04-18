import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal host status overlay centralizes status messaging and retry action chrome", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-host-status-overlay.tsx",
    ),
    "utf8",
  );

  assert.match(source, /export function TerminalHostStatusOverlay/);
  assert.match(source, /title: string;/);
  assert.match(source, /detail: string;/);
  assert.match(source, /warning\?: boolean;/);
  assert.match(source, /onRetry\?: \(\) => void;/);
  assert.match(source, /data-slot="terminal-host-status"/);
  assert.match(source, /Retry terminal surface/);
  assert.match(source, /aria-label="Retry terminal surface"/);
  assert.match(source, /terminalRuntimeStatusActionButtonStyle/);
  assert.match(source, /terminalRuntimeStatusDetailStyle/);
});
