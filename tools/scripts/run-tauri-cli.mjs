#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const desktopDir = path.join(rootDir, "apps", "desktop");
const baseConfigPath = path.join(rootDir, "src-tauri", "tauri.conf.json");

function createWorkspaceRequire(relPath) {
  return createRequire(path.join(rootDir, relPath));
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

function deepMergeConfig(baseValue, overrideValue) {
  if (Array.isArray(baseValue) || Array.isArray(overrideValue)) {
    return overrideValue;
  }

  if (
    baseValue &&
    overrideValue &&
    typeof baseValue === "object" &&
    typeof overrideValue === "object"
  ) {
    const result = { ...baseValue };
    for (const [key, value] of Object.entries(overrideValue)) {
      result[key] =
        key in result ? deepMergeConfig(result[key], value) : value;
    }
    return result;
  }

  return overrideValue;
}

function readJsonConfig(configPath) {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function resolveConfigFlagValue(args) {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === "--config") {
      return args[index + 1] ?? "";
    }

    if (typeof current === "string" && current.startsWith("--config=")) {
      return current.slice("--config=".length);
    }
  }

  return "";
}

function withConfigFlag(args, configPath) {
  const normalizedPath = path.relative(rootDir, configPath).replace(/\\/g, "/");
  const nextArgs = [...args];

  for (let index = 0; index < nextArgs.length; index += 1) {
    const current = nextArgs[index];
    if (current === "--config") {
      nextArgs[index + 1] = normalizedPath;
      return nextArgs;
    }

    if (typeof current === "string" && current.startsWith("--config=")) {
      nextArgs[index] = `--config=${normalizedPath}`;
      return nextArgs;
    }
  }

  nextArgs.push("--config", normalizedPath);
  return nextArgs;
}

function createTauriNodeCommand(args) {
  return process.platform === "win32"
    ? buildWindowsNodeCommand(args)
    : buildNodeCommand(args);
}

function createExplicitNodeTauriConfig(commandName, args) {
  if (commandName !== "build" && commandName !== "dev") {
    return null;
  }

  const mergedConfig = readJsonConfig(baseConfigPath);
  const rawConfigFlag = resolveConfigFlagValue(args);
  const configPaths = rawConfigFlag
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => path.resolve(rootDir, value));

  for (const configPath of configPaths) {
    if (path.resolve(configPath) === path.resolve(baseConfigPath)) {
      continue;
    }

    Object.assign(mergedConfig, deepMergeConfig(mergedConfig, readJsonConfig(configPath)));
  }

  const buildPort = (() => {
    try {
      return new URL(String(mergedConfig.build?.devUrl ?? "http://127.0.0.1:1420")).port || "1420";
    } catch {
      return "1420";
    }
  })();

  mergedConfig.build = {
    ...mergedConfig.build,
    beforeDevCommand: createTauriNodeCommand([
      "tools/scripts/run-vite-host.mjs",
      "serve",
      "--host",
      "127.0.0.1",
      "--port",
      buildPort,
      "--strictPort",
    ]),
    beforeBuildCommand: createTauriNodeCommand([
      "tools/scripts/run-vite-host.mjs",
      "build",
    ]),
  };

  const cacheDir = path.join(rootDir, "node_modules", ".cache", "sdkwork-terminal");
  fs.mkdirSync(cacheDir, { recursive: true });
  const configPath = path.join(
    cacheDir,
    `tauri.${commandName}.${process.pid}.json`,
  );
  fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2));
  return configPath;
}

export function createTauriCliPlan(argv = process.argv.slice(2)) {
  const cliEntrypoint = resolveTauriCliEntrypoint();
  let args = normalizeTauriCliArgs(argv);
  const commandName = args[0] ?? "help";
  const generatedConfigPath = createExplicitNodeTauriConfig(commandName, args);
  if (generatedConfigPath) {
    args = withConfigFlag(args, generatedConfigPath);
  }

  return {
    cliEntrypoint,
    command: process.execPath,
    args: [cliEntrypoint, ...args],
    cwd: commandName === "info" ? desktopDir : rootDir,
    env: process.env,
    shell: false,
    generatedConfigPath,
  };
}

function run() {
  const plan = createTauriCliPlan();
  const cliArgs = plan.args.slice(1).join(" ");
  console.log(`[sdkwork-terminal] tauri ${cliArgs}`);
  const child = spawn(plan.command, plan.args, {
    cwd: plan.cwd,
    env: plan.env,
    stdio: "inherit",
    shell: plan.shell,
  });

  const cleanup = () => {
    if (!plan.generatedConfigPath) {
      return;
    }
    fs.rmSync(plan.generatedConfigPath, { force: true });
  };

  child.on("error", (error) => {
    cleanup();
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    cleanup();
    if (signal) {
      console.error(`run-tauri-cli exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run();
}
