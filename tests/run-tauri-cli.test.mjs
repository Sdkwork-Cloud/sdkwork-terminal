import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  buildNodeCommand,
  buildWindowsNodeCommand,
  buildWindowsDesktopHostUnlockCommand,
  createReleaseDesktopHostBinaryPath,
  createPortableTauriConfig,
  createTauriCliPlan,
  materializePortableTauriConfig,
  normalizeTauriCliArgs,
  releaseWindowsDesktopBuildLock,
  resolveTauriCliEntrypoint,
} from "../tools/scripts/run-tauri-cli.mjs";

test("run-tauri-cli resolves the installed tauri cli entrypoint", () => {
  const entrypoint = resolveTauriCliEntrypoint();

  assert.match(entrypoint, /tauri\.js$/i);
  assert.equal(path.isAbsolute(entrypoint), true);
});

test("run-tauri-cli strips unsupported config flags from tauri info", () => {
  assert.deepEqual(
    normalizeTauriCliArgs(["info", "--config", "src-tauri/tauri.conf.json"]),
    ["info"],
  );
  assert.deepEqual(
    normalizeTauriCliArgs(["info", "--config=src-tauri/tauri.conf.json"]),
    ["info"],
  );
});

test("run-tauri-cli keeps config flags for tauri dev and build", () => {
  assert.deepEqual(
    normalizeTauriCliArgs(["dev", "--config", "src-tauri/tauri.conf.json"]),
    ["dev", "--config", "src-tauri/tauri.conf.json"],
  );
  assert.deepEqual(
    normalizeTauriCliArgs(["build", "--config=src-tauri/tauri.conf.json"]),
    ["build", "--config=src-tauri/tauri.conf.json"],
  );
});

test("run-tauri-cli launches tauri info from the desktop workspace", () => {
  const plan = createTauriCliPlan(["info", "--config", "src-tauri/tauri.conf.json"]);

  assert.equal(path.basename(plan.cwd), "desktop");
  assert.equal(plan.command, process.execPath);
  assert.equal(plan.args[1], "info");
  assert.equal(plan.args.includes("--config"), false);
});

test("run-tauri-cli keeps tauri dev rooted at the workspace", () => {
  const plan = createTauriCliPlan(["dev", "--config", "src-tauri/tauri.conf.json"]);

  assert.equal(path.basename(plan.cwd), "sdkwork-terminal");
  assert.equal(plan.commandName, "dev");
  assert.equal(plan.args[1], "dev");
  assert.equal(plan.args.includes("--config"), true);
  plan.cleanup?.();
});

test("run-tauri-cli exposes the Windows release host binary path used for build preflight cleanup", () => {
  const binaryPath = createReleaseDesktopHostBinaryPath("D:\\workspace\\sdkwork-terminal");
  const command = buildWindowsDesktopHostUnlockCommand(binaryPath);

  assert.equal(
    binaryPath,
    "D:\\workspace\\sdkwork-terminal\\target\\release\\sdkwork-terminal-desktop-host.exe",
  );
  assert.match(command, /sdkwork-terminal-desktop-host/);
  assert.match(command, /Stop-Process -Force/);
  assert.match(command, /Remove-Item/);
  assert.match(command, /target\\release\\sdkwork-terminal-desktop-host\.exe/);
});

test("run-tauri-cli can release stale Windows release host locks before build", () => {
  const calls = [];

  const previousPlatformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", {
    value: "win32",
  });

  try {
    releaseWindowsDesktopBuildLock(
      "D:\\workspace\\sdkwork-terminal\\target\\release\\sdkwork-terminal-desktop-host.exe",
      (command, args, options) => {
        calls.push({ command, args, options });
        return {
          status: 0,
          stderr: "",
          stdout: "",
        };
      },
    );
  } finally {
    if (previousPlatformDescriptor) {
      Object.defineProperty(process, "platform", previousPlatformDescriptor);
    }
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "powershell.exe");
  assert.match(calls[0].args[2], /target\\release\\sdkwork-terminal-desktop-host\.exe/);
  assert.doesNotMatch(calls[0].args[2], /Remove-Item/);
});

test("run-tauri-cli can build explicit node launch commands for portable tauri hooks", () => {
  assert.equal(
    buildNodeCommand(["tools/scripts/run-vite-host.mjs", "build"], "C:\\node\\node.exe"),
    "\"C:\\node\\node.exe\" tools/scripts/run-vite-host.mjs build",
  );
  assert.equal(
    buildWindowsNodeCommand(
      ["tools/scripts/run-vite-host.mjs", "build"],
      "C:\\Program Files\\nodejs\\node.exe",
      "C:\\Windows\\System32\\cmd.exe",
    ),
    "C:\\Windows\\System32\\cmd.exe /d /s /c \"\"C:\\Program Files\\nodejs\\node.exe\" tools/scripts/run-vite-host.mjs build\"",
  );
});

test("run-tauri-cli rewrites build hooks to use the current node executable", () => {
  const config = createPortableTauriConfig(
    {
      build: {
        beforeBuildCommand: "node tools/scripts/run-vite-host.mjs build",
        devUrl: "http://127.0.0.1:1420",
      },
    },
    "build",
    "C:\\node\\node.exe",
    "C:\\Windows\\System32\\cmd.exe",
  );

  assert.match(config.build.beforeBuildCommand, /node\.exe/);
  assert.match(config.build.beforeBuildCommand, /run-vite-host\.mjs build/);
});

test("run-tauri-cli materializes a temporary portable config for tauri build", () => {
  const runtimeConfig = materializePortableTauriConfig(
    ["build", "--config", "src-tauri/tauri.release.conf.json"],
    "build",
  );

  assert.equal(runtimeConfig.args.includes("--config"), true);
  assert.equal(path.isAbsolute(runtimeConfig.generatedConfigPath), true);
  assert.equal(runtimeConfig.args[1], "--config");
  assert.equal(runtimeConfig.args[2], runtimeConfig.generatedConfigPath);
  runtimeConfig.cleanup?.();
});
