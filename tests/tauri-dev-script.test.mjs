import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNodeCommand,
  buildWindowsNodeCommand,
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
        beforeDevCommand:
          "node tools/scripts/run-vite-host.mjs serve --host 127.0.0.1 --port 1420 --strictPort",
        beforeBuildCommand: "node tools/scripts/run-vite-host.mjs build",
        devUrl: "http://127.0.0.1:1420",
      },
    },
    1421,
  );

  const beforeDevArgs = [
    "tools/scripts/run-vite-host.mjs",
    "serve",
    "--host",
    "127.0.0.1",
    "--port",
    "1421",
    "--strictPort",
  ];

  assert.equal(
    config.build.beforeDevCommand,
    process.platform === "win32"
      ? buildWindowsNodeCommand(beforeDevArgs)
      : buildNodeCommand(beforeDevArgs),
  );
  assert.equal(config.build.devUrl, "http://127.0.0.1:1421");
  assert.equal(config.build.beforeBuildCommand, "node tools/scripts/run-vite-host.mjs build");
});

test("tauri dev script can build an explicit node command without relying on PATH lookup", () => {
  assert.equal(
    buildNodeCommand(["tools/scripts/run-vite-host.mjs", "build"], "C:\\node\\node.exe"),
    "\"C:\\node\\node.exe\" tools/scripts/run-vite-host.mjs build",
  );
});

test("tauri dev script can build a Windows cmd wrapper for an explicit node path", () => {
  assert.equal(
    buildWindowsNodeCommand(
      ["tools/scripts/run-vite-host.mjs", "build"],
      "C:\\node\\node.exe",
      "C:\\Windows\\System32\\cmd.exe",
    ),
    "C:\\node\\node.exe tools/scripts/run-vite-host.mjs build",
  );
});

test("tauri dev script falls back to cmd wrapping when the node path contains spaces", () => {
  assert.equal(
    buildWindowsNodeCommand(
      ["tools/scripts/run-vite-host.mjs", "build"],
      "C:\\Program Files\\nodejs\\node.exe",
      "C:\\Windows\\System32\\cmd.exe",
    ),
    "C:\\Windows\\System32\\cmd.exe /d /s /c \"\"C:\\Program Files\\nodejs\\node.exe\" tools/scripts/run-vite-host.mjs build\"",
  );
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
