#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

export function createDesktopHostBinaryPath(
  root = rootDir,
  profile = "debug",
) {
  return path.join(root, "target", profile, "sdkwork-terminal-desktop-host.exe");
}

export function buildWindowsDesktopHostUnlockCommand(binaryPath) {
  return buildWindowsDesktopHostUnlockCommandWithOptions(binaryPath);
}

function buildWindowsDesktopHostUnlockCommandWithOptions(
  binaryPath,
  { removeBinary = true } = {},
) {
  const escapedBinaryPath = binaryPath.replace(/'/g, "''");

  const commands = [
    `$TargetPath = '${escapedBinaryPath}'`,
    "Get-Process sdkwork-terminal-desktop-host -ErrorAction SilentlyContinue | Where-Object { $_.Path -and [string]::Equals($_.Path, $TargetPath, [System.StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force -ErrorAction SilentlyContinue",
  ];

  if (removeBinary) {
    commands.push(
      "if (Test-Path $TargetPath) { Remove-Item -LiteralPath $TargetPath -Force -ErrorAction SilentlyContinue }",
    );
  }

  return commands.join("; ");
}

export function releaseWindowsDesktopHostLock(
  binaryPath = createDesktopHostBinaryPath(),
  runner = spawnSync,
  cwd = rootDir,
  options = {},
) {
  if (process.platform !== "win32") {
    return;
  }

  const result = runner(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      buildWindowsDesktopHostUnlockCommandWithOptions(binaryPath, options),
    ],
    {
      cwd,
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
