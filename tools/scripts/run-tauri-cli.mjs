#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const desktopDir = path.join(rootDir, "apps", "desktop");

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

export function createTauriCliPlan(argv = process.argv.slice(2)) {
  const cliEntrypoint = resolveTauriCliEntrypoint();
  const args = normalizeTauriCliArgs(argv);
  const commandName = args[0] ?? "help";

  return {
    cliEntrypoint,
    command: process.execPath,
    args: [cliEntrypoint, ...args],
    cwd: commandName === "info" ? desktopDir : rootDir,
    env: process.env,
    shell: false,
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
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
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
