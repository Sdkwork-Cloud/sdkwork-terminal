import test from "node:test";
import assert from "node:assert/strict";

import {
  createWindowsProcessTreeKillPlan,
  buildWindowsDesktopViteUnlockCommand,
  buildWindowsDesktopHostUnlockCommand,
  createDesktopHostBinaryPath,
  createTauriDevConfig,
  findAvailablePort,
} from "../tools/scripts/run-tauri-dev.mjs";

test("tauri dev script rewrites beforeDevCommand and devUrl for the selected port", () => {
  const config = createTauriDevConfig(
    {
      build: {
        beforeDevCommand: "pnpm --dir apps/desktop dev",
        beforeBuildCommand: "pnpm --dir apps/desktop build",
        devUrl: "http://127.0.0.1:1420",
      },
    },
    1421,
  );

  assert.equal(
    config.build.beforeDevCommand,
    "node tools/scripts/run-vite-host.mjs serve --host 127.0.0.1 --port 1421 --strictPort",
  );
  assert.equal(config.build.devUrl, "http://127.0.0.1:1421");
  assert.equal(config.build.beforeBuildCommand, "pnpm --dir apps/desktop build");
});

test("tauri dev script skips occupied ports", async () => {
  const availablePort = await findAvailablePort(1420, async (port) => port !== 1420);

  assert.equal(availablePort, 1421);
});

test("tauri dev script targets the desktop host binary for stale process cleanup", () => {
  const binaryPath = createDesktopHostBinaryPath("D:\\workspace\\sdkwork-terminal");
  const command = buildWindowsDesktopHostUnlockCommand(binaryPath);

  assert.equal(
    binaryPath,
    "D:\\workspace\\sdkwork-terminal\\target\\debug\\sdkwork-terminal-desktop-host.exe",
  );
  assert.match(command, /sdkwork-terminal-desktop-host/);
  assert.match(command, /Stop-Process -Force/);
  assert.match(command, /Remove-Item/);
  assert.match(command, /target\\debug\\sdkwork-terminal-desktop-host\.exe/);
});

test("tauri dev script targets stale desktop vite servers from the same workspace and port", () => {
  const command = buildWindowsDesktopViteUnlockCommand(
    "D:\\workspace\\sdkwork-terminal",
    1420,
  );

  assert.match(command, /Get-CimInstance Win32_Process/);
  assert.match(command, /vite\.js serve/);
  assert.match(command, /--port 1420/);
  assert.match(command, /sdkwork-terminal/);
  assert.match(command, /Stop-Process -Id/);
});

test("tauri dev script uses taskkill to stop the full Windows child process tree", () => {
  const plan = createWindowsProcessTreeKillPlan(12345);

  assert.equal(plan.command, "taskkill.exe");
  assert.deepEqual(plan.args, ["/PID", "12345", "/T", "/F"]);
});
