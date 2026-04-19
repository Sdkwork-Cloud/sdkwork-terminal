#!/usr/bin/env node

import fs from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  createDesktopHostBinaryPath,
  releaseWindowsDesktopHostLock,
} from "./windows-desktop-host-locks.mjs";
export { buildWindowsDesktopHostUnlockCommand } from "./windows-desktop-host-locks.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const desktopDir = path.join(rootDir, "apps", "desktop");

function createWorkspaceRequire(relPath) {
  return createRequire(path.join(rootDir, relPath));
}

export function buildNodeCommand(args, nodePath = process.execPath) {
  return [`"${nodePath}"`, ...args].join(" ");
}

export function buildWindowsNodeCommand(
  args,
  nodePath = process.execPath,
  commandShell = process.env.ComSpec ?? "cmd.exe",
) {
  if (!/\s/.test(nodePath) && !/\s/.test(commandShell)) {
    return `${nodePath} ${args.join(" ")}`;
  }

  return `${commandShell} /d /s /c ""${nodePath}" ${args.join(" ")}"`;
}

export function resolveTauriCliEntrypoint() {
  const candidates = [
    createWorkspaceRequire("apps/desktop/package.json"),
    createWorkspaceRequire("package.json"),
  ];

  for (const requireFromPath of candidates) {
    try {
      return requireFromPath.resolve("@tauri-apps/cli/tauri.js");
    } catch {
      continue;
    }
  }

  throw new Error("Unable to resolve @tauri-apps/cli/tauri.js from the workspace.");
}

export function createReleaseDesktopHostBinaryPath(root = rootDir) {
  return createDesktopHostBinaryPath(root, "release");
}

export function releaseWindowsDesktopBuildLock(
  binaryPath = createReleaseDesktopHostBinaryPath(),
  runner = spawnSync,
) {
  return releaseWindowsDesktopHostLock(binaryPath, runner, rootDir, {
    removeBinary: false,
  });
}

export function normalizeTauriCliArgs(argv = process.argv.slice(2)) {
  const [command = "help", ...rest] = argv;
  if (command !== "info") {
    return [command, ...rest];
  }

  const normalized = [command];
  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index];
    if (current === "--config") {
      index += 1;
      continue;
    }

    if (typeof current === "string" && current.startsWith("--config=")) {
      continue;
    }

    normalized.push(current);
  }

  return normalized;
}

function resolveConfigArg(args) {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === "--config") {
      const value = args[index + 1];
      if (typeof value !== "string" || value.length === 0) {
        return null;
      }

      return {
        index,
        mode: "split",
        value,
      };
    }

    if (typeof current === "string" && current.startsWith("--config=")) {
      return {
        index,
        mode: "inline",
        value: current.slice("--config=".length),
      };
    }
  }

  return null;
}

function resolveTauriDevPort(config) {
  const rawDevUrl = config?.build?.devUrl;
  if (typeof rawDevUrl !== "string" || rawDevUrl.trim().length === 0) {
    return 1420;
  }

  try {
    const url = new URL(rawDevUrl);
    const parsedPort = Number.parseInt(url.port, 10);
    return Number.isFinite(parsedPort) ? parsedPort : 1420;
  } catch {
    return 1420;
  }
}

export function createPortableTauriConfig(
  config,
  commandName,
  nodePath = process.execPath,
  commandShell = process.env.ComSpec ?? "cmd.exe",
) {
  if (commandName !== "build" && commandName !== "dev") {
    return config;
  }

  const beforeBuildArgs = ["tools/scripts/run-vite-host.mjs", "build"];
  const beforeDevArgs = [
    "tools/scripts/run-vite-host.mjs",
    "serve",
    "--host",
    "127.0.0.1",
    "--port",
    String(resolveTauriDevPort(config)),
    "--strictPort",
  ];
  const buildCommand =
    process.platform === "win32"
      ? buildWindowsNodeCommand(beforeBuildArgs, nodePath, commandShell)
      : buildNodeCommand(beforeBuildArgs, nodePath);
  const devCommand =
    process.platform === "win32"
      ? buildWindowsNodeCommand(beforeDevArgs, nodePath, commandShell)
      : buildNodeCommand(beforeDevArgs, nodePath);

  return {
    ...config,
    build: {
      ...(config.build ?? {}),
      beforeBuildCommand: buildCommand,
      ...(commandName === "dev" ? { beforeDevCommand: devCommand } : {}),
    },
  };
}

export function materializePortableTauriConfig(
  args,
  commandName,
  workspaceRoot = rootDir,
) {
  const configArg = resolveConfigArg(args);
  if (!configArg || (commandName !== "build" && commandName !== "dev")) {
    return {
      args,
      cleanup: null,
      generatedConfigPath: null,
    };
  }

  const sourceConfigPath = path.resolve(workspaceRoot, configArg.value);
  const sourceConfig = JSON.parse(fs.readFileSync(sourceConfigPath, "utf8"));
  const portableConfig = createPortableTauriConfig(sourceConfig, commandName);
  const cacheDir = path.join(workspaceRoot, "node_modules", ".cache", "sdkwork-terminal");
  fs.mkdirSync(cacheDir, { recursive: true });
  const generatedConfigPath = path.join(
    cacheDir,
    `tauri.${commandName}.${Date.now()}.${process.pid}.json`,
  );
  fs.writeFileSync(generatedConfigPath, JSON.stringify(portableConfig, null, 2));

  const nextArgs = [...args];
  if (configArg.mode === "split") {
    nextArgs[configArg.index + 1] = generatedConfigPath;
  } else {
    nextArgs[configArg.index] = `--config=${generatedConfigPath}`;
  }

  return {
    args: nextArgs,
    generatedConfigPath,
    cleanup: () => {
      fs.rmSync(generatedConfigPath, { force: true });
    },
  };
}

export function createTauriCliPlan(argv = process.argv.slice(2)) {
  const cliEntrypoint = resolveTauriCliEntrypoint();
  const normalizedArgs = normalizeTauriCliArgs(argv);
  const commandName = normalizedArgs[0] ?? "help";
  const runtimeConfig = materializePortableTauriConfig(normalizedArgs, commandName);
  const args = runtimeConfig.args;

  return {
    cliEntrypoint,
    commandName,
    command: process.execPath,
    args: [cliEntrypoint, ...args],
    cwd: commandName === "info" ? desktopDir : rootDir,
    env: process.env,
    shell: false,
    cleanup: runtimeConfig.cleanup,
  };
}

function run() {
  const plan = createTauriCliPlan();
  if (plan.commandName === "build") {
    releaseWindowsDesktopBuildLockSafely();
  }
  const cliArgs = plan.args.slice(1).join(" ");
  console.log(`[sdkwork-terminal] tauri ${cliArgs}`);
  const child = spawn(plan.command, plan.args, {
    cwd: plan.cwd,
    env: plan.env,
    stdio: "inherit",
    shell: plan.shell,
  });

  child.on("error", (error) => {
    plan.cleanup?.();
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    plan.cleanup?.();
    if (signal) {
      console.error(`run-tauri-cli exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

function releaseWindowsDesktopBuildLockSafely() {
  try {
    releaseWindowsDesktopBuildLock();
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run();
}
