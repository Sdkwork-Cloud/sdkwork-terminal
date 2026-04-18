import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal host surface hook centralizes host lifecycle wiring and host status projection", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-host-surface.ts",
    ),
    "utf8",
  );

  assert.match(source, /export interface UseTerminalHostSurfaceArgs/);
  assert.match(source, /readyDetail: string;/);
  assert.match(source, /export function useTerminalHostSurface/);
  assert.match(source, /const \{\s*hostLifecycleError,\s*hostLifecycleState,\s*hostViewportMeasured,\s*retryAttachViewport,\s*triggerViewportMeasurement,\s*\} = useTerminalHostLifecycle\(\{/);
  assert.match(source, /const hostStatusDescriptor = createTerminalHostStatusDescriptor\(\{/);
  assert.match(source, /const hostStatus = createTerminalHostStatusViewModel\(\{/);
  assert.match(source, /onRetry: \(\) => \{/);
  assert.match(source, /retryAttachViewport\(\);/);
  assert.match(source, /return \{/);
  assert.match(source, /hostStatus,/);
  assert.match(source, /triggerViewportMeasurement,/);
});
