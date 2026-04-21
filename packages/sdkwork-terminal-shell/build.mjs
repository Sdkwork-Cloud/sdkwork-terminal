#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(packageDir, "dist");
const requireFromPackage = createRequire(path.join(packageDir, "package.json"));
const requireFromWorkspace = createRequire(path.join(packageDir, "..", "..", "package.json"));

function resolvePackageJsonPath(packageName) {
  for (const requireRuntime of [requireFromPackage, requireFromWorkspace]) {
    try {
      return requireRuntime.resolve(`${packageName}/package.json`);
    } catch {
      // Fall through to the next resolution root.
    }
  }

  throw new Error(`Unable to resolve ${packageName}/package.json from terminal-shell build roots.`);
}

function resolvePackageBin(packageName, binName) {
  const packageJsonPath = resolvePackageJsonPath(packageName);
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const relativeBin =
    typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.[binName];

  if (!relativeBin) {
    throw new Error(`Unable to resolve ${binName} from ${packageJsonPath}`);
  }

  return path.resolve(path.dirname(packageJsonPath), relativeBin);
}

function runNodeCommand(label, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: packageDir,
      env: process.env,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", (error) => {
      reject(new Error(`${label} failed to start: ${error instanceof Error ? error.message : String(error)}`));
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${label} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${label} exited with code ${code ?? -1}`));
        return;
      }

      resolve();
    });
  });
}

async function copyStylesheetAssets() {
  const xtermPackageJsonPath = resolvePackageJsonPath("@xterm/xterm");
  const xtermCssPath = path.resolve(path.dirname(xtermPackageJsonPath), "css/xterm.css");

  await fs.copyFile(
    path.join(packageDir, "src", "shell-app.css"),
    path.join(distDir, "shell-app.css"),
  );
  await fs.copyFile(xtermCssPath, path.join(distDir, "xterm.css"));
  await fs.writeFile(
    path.join(distDir, "styles.css"),
    "@import \"./xterm.css\";\n@import \"./shell-app.css\";\n",
    "utf8",
  );
}

async function buildPackage() {
  await fs.rm(distDir, {
    recursive: true,
    force: true,
  });

  const viteCli = resolvePackageBin("vite", "vite");
  const tscCli = resolvePackageBin("typescript", "tsc");

  await runNodeCommand("vite build", [
    viteCli,
    "build",
    "--config",
    path.join(packageDir, "vite.config.ts"),
  ]);
  await runNodeCommand("tsc declaration build", [
    tscCli,
    "--project",
    path.join(packageDir, "tsconfig.build.json"),
  ]);
  await copyStylesheetAssets();
}

async function main() {
  if (process.argv.includes("--clean-only")) {
    await fs.rm(distDir, {
      recursive: true,
      force: true,
    });
    return;
  }

  await buildPackage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
