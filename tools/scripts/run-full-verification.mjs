#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { runCommandStepsSync } from "./run-script-steps.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

function createPnpmStep(label, script, {
  env = process.env,
  platform = process.platform,
} = {}) {
  const npmExecPath = env.npm_execpath;
  if (typeof npmExecPath === "string" && /(^|[\\/])pnpm(\.cjs)?$/i.test(npmExecPath)) {
    return {
      label,
      command: process.execPath,
      args: [npmExecPath, script],
      cwd: rootDir,
      env,
      shell: false,
    };
  }

  return {
    label,
    command: platform === "win32" ? "corepack.cmd" : "corepack",
    args: ["pnpm", script],
    cwd: rootDir,
    env,
    shell: platform === "win32",
  };
}

export function createFullVerificationSteps(options = {}) {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const stepOptions = { env, platform };

  return [
    createPnpmStep("workspace-tests", "test", stepOptions),
    createPnpmStep("typescript-probes", "verify:typescript-probes", stepOptions),
    createPnpmStep("quality-check", "lint", stepOptions),
    createPnpmStep("typecheck", "typecheck", stepOptions),
    createPnpmStep("web-and-desktop-build", "build", stepOptions),
    createPnpmStep("terminal-runtime", "verify:terminal-runtime", stepOptions),
    createPnpmStep("terminal-shell-package", "verify:shell-package", stepOptions),
    createPnpmStep("tauri-check", "tauri:check", stepOptions),
    {
      label: "rust-workspace",
      command: "cargo",
      args: ["test", "--workspace"],
      cwd: rootDir,
      env,
      shell: false,
    },
  ];
}

export function runFullVerificationCli() {
  const status = runCommandStepsSync(createFullVerificationSteps(), {
    failurePrefix: "run-full-verification",
    onStepStart(step) {
      console.log(`[run-full-verification] ${step.label}`);
    },
  });

  if (status !== 0) {
    process.exit(status);
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  try {
    runFullVerificationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
