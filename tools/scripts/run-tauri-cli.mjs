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
const APPLE_CODESIGN_ENV_KEYS = [
  "APPLE_CERTIFICATE",
  "APPLE_CERTIFICATE_PASSWORD",
  "APPLE_SIGNING_IDENTITY",
];
const APPLE_NOTARIZATION_ENV_KEYS = [
  "APPLE_ID",
  "APPLE_PASSWORD",
  "APPLE_TEAM_ID",
];

function hasNonEmptyEnvValue(env, key) {
  return String(env[key] ?? "").trim().length > 0;
}

function deleteEnvKeys(env, keys) {
  for (const key of keys) {
    delete env[key];
  }
}

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

export function normalizeTauriCliEnv(
  env = process.env,
  platform = process.platform,
) {
  const nextEnv = { ...env };

  const appleCodesignEnabled =
    platform === "darwin" &&
    /^(?:1|true|yes|on)$/i.test(
      String(nextEnv.SDKWORK_TERMINAL_ENABLE_APPLE_CODESIGN ?? "").trim(),
    );
  const hasAppleCodesignConfig = APPLE_CODESIGN_ENV_KEYS.every((key) =>
    hasNonEmptyEnvValue(nextEnv, key),
  );

  if (!appleCodesignEnabled || !hasAppleCodesignConfig) {
    deleteEnvKeys(nextEnv, [
      ...APPLE_CODESIGN_ENV_KEYS,
      ...APPLE_NOTARIZATION_ENV_KEYS,
    ]);
    return nextEnv;
  }

  const hasAppleNotarizationConfig = APPLE_NOTARIZATION_ENV_KEYS.every((key) =>
    hasNonEmptyEnvValue(nextEnv, key),
  );
  if (!hasAppleNotarizationConfig) {
    deleteEnvKeys(nextEnv, APPLE_NOTARIZATION_ENV_KEYS);
  }

  return nextEnv;
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

function resolveMergedTauriConfig(args, workspaceRoot) {
  const baseConfigPath = path.join(workspaceRoot, "src-tauri", "tauri.conf.json");
  const configArg = resolveConfigArg(args);
  const configPaths = configArg
    ? configArg.value
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => path.resolve(workspaceRoot, value))
    : [baseConfigPath];

  const mergedConfig = readJsonConfig(baseConfigPath);
  for (const configPath of configPaths) {
    if (path.resolve(configPath) === path.resolve(baseConfigPath)) {
      continue;
    }

    Object.assign(
      mergedConfig,
      deepMergeConfig(mergedConfig, readJsonConfig(configPath)),
    );
  }

  return {
    configArg,
    mergedConfig,
  };
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
      beforeDevCommand: devCommand,
    },
  };
}

export function materializePortableTauriConfig(
  args,
  commandName,
  workspaceRoot = rootDir,
  nodePath = process.execPath,
  commandShell = process.env.ComSpec ?? "cmd.exe",
) {
  if (commandName !== "build" && commandName !== "dev") {
    return {
      args,
      cleanup: null,
      generatedConfigPath: null,
    };
  }

  const { configArg, mergedConfig } = resolveMergedTauriConfig(args, workspaceRoot);
  const portableConfig = createPortableTauriConfig(
    mergedConfig,
    commandName,
    nodePath,
    commandShell,
  );
  const cacheDir = path.join(workspaceRoot, "node_modules", ".cache", "sdkwork-terminal");
  fs.mkdirSync(cacheDir, { recursive: true });
  const generatedConfigPath = path.join(
    cacheDir,
    `tauri.${commandName}.${Date.now()}.${process.pid}.json`,
  );
  fs.writeFileSync(generatedConfigPath, JSON.stringify(portableConfig, null, 2));

  const nextArgs = [...args];
  if (!configArg) {
    nextArgs.push("--config", generatedConfigPath);
  } else if (configArg.mode === "split") {
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
    command: process.execPath,
    args: [cliEntrypoint, ...args],
    cwd: commandName === "info" ? desktopDir : rootDir,
    env: normalizeTauriCliEnv(process.env),
    shell: false,
    cleanup: runtimeConfig.cleanup,
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

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run();
}
