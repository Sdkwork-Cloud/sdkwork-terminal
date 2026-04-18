#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const baseConfigPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
const tauriCliRunnerPath = path.join(rootDir, "tools", "scripts", "run-tauri-cli.mjs");

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

export function createDesktopHostBinaryPath(root = rootDir) {
  return path.join(root, "target", "debug", "sdkwork-terminal-desktop-host.exe");
}

export function buildWindowsDesktopHostUnlockCommand(binaryPath) {
  const escapedBinaryPath = binaryPath.replace(/'/g, "''");

  return [
    `$TargetPath = '${escapedBinaryPath}'`,
    "Get-Process sdkwork-terminal-desktop-host -ErrorAction SilentlyContinue | Where-Object { $_.Path -and [string]::Equals($_.Path, $TargetPath, [System.StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force -ErrorAction SilentlyContinue",
    "if (Test-Path $TargetPath) { Remove-Item -LiteralPath $TargetPath -Force -ErrorAction SilentlyContinue }",
  ].join("; ");
}

export function buildWindowsDesktopViteUnlockCommand(workspaceRootPath, port) {
  const escapedWorkspaceRootPath = workspaceRootPath.replace(/'/g, "''");

  return [
    `$WorkspaceRoot = '${escapedWorkspaceRootPath}'`,
    `$PortToken = '--port ${port}'`,
    "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" |",
    "  Where-Object {",
    "    $_.CommandLine -and",
    "    $_.CommandLine -match [regex]::Escape($WorkspaceRoot) -and",
    "    $_.CommandLine -match [regex]::Escape('vite.js serve') -and",
    "    $_.CommandLine -match [regex]::Escape($PortToken)",
    "  } |",
    "  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
  ].join("\n");
}

export function createWindowsProcessTreeKillPlan(pid) {
  return {
    command: "taskkill.exe",
    args: ["/PID", String(pid), "/T", "/F"],
  };
}

export function releaseWindowsDesktopHostLock(
  binaryPath = createDesktopHostBinaryPath(),
  runner = spawnSync,
) {
  if (process.platform !== "win32") {
    return;
  }

  const result = runner(
    "powershell.exe",
    ["-NoProfile", "-Command", buildWindowsDesktopHostUnlockCommand(binaryPath)],
    {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      shell: false,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        `Failed to unlock desktop host binary ${binaryPath}.`,
    );
  }
}

export function releaseWindowsDesktopViteLock(
  workspaceRootPath = rootDir,
  port = 1420,
  runner = spawnSync,
) {
  if (process.platform !== "win32") {
    return;
  }

  const result = runner(
    "powershell.exe",
    ["-NoProfile", "-Command", buildWindowsDesktopViteUnlockCommand(workspaceRootPath, port)],
    {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      shell: false,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        `Failed to unlock desktop vite process for ${workspaceRootPath} on port ${port}.`,
    );
  }
}

export function killWindowsProcessTree(pid, runner = spawnSync) {
  if (process.platform !== "win32") {
    return;
  }

  const plan = createWindowsProcessTreeKillPlan(pid);
  const result = runner(plan.command, plan.args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  const stderr = result.stderr?.trim() ?? "";
  const stdout = result.stdout?.trim() ?? "";
  const missingProcess =
    /not found|no running instance|process .* could not be found/i.test(stderr) ||
    /not found|no running instance|process .* could not be found/i.test(stdout);

  if (missingProcess) {
    return;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    throw new Error(
      stderr || stdout || `Failed to kill process tree for pid ${pid}.`,
    );
  }
}

export function createTauriDevConfig(baseConfig, port) {
  const beforeDevArgs = [
    "tools/scripts/run-vite-host.mjs",
    "serve",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ];
  const baseApp = baseConfig.app ?? {};
  const baseWindows = Array.isArray(baseApp.windows) ? baseApp.windows : [];
  const normalizedWindows =
    baseWindows.length > 0 ? baseWindows : [{ title: "sdkwork-terminal" }];

  return {
    ...baseConfig,
    productName: "sdkwork-terminal dev",
    identifier: "com.sdkwork.terminal.dev",
    build: {
      ...baseConfig.build,
      beforeDevCommand:
        process.platform === "win32"
          ? buildWindowsNodeCommand(beforeDevArgs)
          : buildNodeCommand(beforeDevArgs),
      devUrl: `http://127.0.0.1:${port}`,
    },
    app: {
      ...baseApp,
      windows: normalizedWindows.map((windowConfig, index) =>
        index === 0
          ? {
            ...windowConfig,
            title: "sdkwork-terminal dev",
          }
          : { ...windowConfig },
      ),
    },
  };
}

export async function findAvailablePort(
  startPort,
  isPortAvailable = (port) => checkPortAvailability(port),
  maxAttempts = 32,
) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    if (await isPortAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to find an available Tauri dev port starting from ${startPort}.`,
  );
}

function checkPortAvailability(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

function readBaseConfig() {
  return JSON.parse(fs.readFileSync(baseConfigPath, "utf8"));
}

function resolveStartPort(baseConfig) {
  const rawDevUrl = baseConfig?.build?.devUrl;
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

function writeGeneratedConfig(config, port) {
  const cacheDir = path.join(rootDir, "node_modules", ".cache", "sdkwork-terminal");
  fs.mkdirSync(cacheDir, { recursive: true });

  const configPath = path.join(cacheDir, `tauri.dev.${port}.${process.pid}.json`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

async function run() {
  const baseConfig = readBaseConfig();
  const startPort = resolveStartPort(baseConfig);
  releaseDesktopHostLockSafely();
  releaseDesktopViteLockSafely(startPort);
  const port = await findAvailablePort(startPort);

  if (port !== startPort) {
    console.log(`[sdkwork-terminal] port ${startPort} is busy, using ${port}`);
  }

  const generatedConfigPath = writeGeneratedConfig(
    createTauriDevConfig(baseConfig, port),
    port,
  );
  console.log(`[sdkwork-terminal] desktop dev url http://127.0.0.1:${port}`);
  console.log(`[sdkwork-terminal] tauri config ${generatedConfigPath}`);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    fs.rmSync(generatedConfigPath, { force: true });
    releaseDesktopHostLockSafely();
    releaseDesktopViteLockSafely(port);
  };

  const child = spawn(
    process.execPath,
    [tauriCliRunnerPath, "dev", "--config", generatedConfigPath],
    {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
      shell: false,
    },
  );

  const terminateChild = (signal) => {
    cleanup();
    if (child.killed) {
      return;
    }

    if (process.platform === "win32" && typeof child.pid === "number") {
      try {
        killWindowsProcessTree(child.pid);
        return;
      } catch (error) {
        console.warn(error instanceof Error ? error.message : String(error));
      }
    }

    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => terminateChild("SIGINT"));
  process.on("SIGTERM", () => terminateChild("SIGTERM"));
  process.on("SIGBREAK", () => terminateChild("SIGTERM"));

  child.on("error", (error) => {
    cleanup();
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    cleanup();

    if (signal) {
      console.error(`run-tauri-dev exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

function releaseDesktopHostLockSafely() {
  try {
    releaseWindowsDesktopHostLock();
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
  }
}

function releaseDesktopViteLockSafely(port) {
  try {
    releaseWindowsDesktopViteLock(rootDir, port);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
  }
}
