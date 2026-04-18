#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

function resolveWorkspacePnpmPlan(argv = process.argv.slice(2)) {
  const npmExecPath = process.env.npm_execpath;
  if (typeof npmExecPath === "string" && /(^|[\\/])pnpm(\.cjs)?$/i.test(npmExecPath)) {
    return {
      command: process.execPath,
      args: [npmExecPath, ...argv],
      cwd: rootDir,
      env: process.env,
      shell: false,
    };
  }

  return {
    command: process.platform === "win32" ? "corepack.cmd" : "corepack",
    args: ["pnpm", ...argv],
    cwd: rootDir,
    env: process.env,
    shell: false,
  };
}

function run() {
  const plan = resolveWorkspacePnpmPlan();
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
      console.error(`run-workspace-pnpm exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run();
}

export { resolveWorkspacePnpmPlan };
