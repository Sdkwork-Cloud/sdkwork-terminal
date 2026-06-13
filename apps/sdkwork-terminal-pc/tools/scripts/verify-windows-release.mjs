#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const terminalRuntimeVerificationScriptPath = path.join(
  rootDir,
  "tools",
  "scripts",
  "verify-terminal-runtime.mjs",
);
const tauriCliScriptPath = path.join(rootDir, "tools", "scripts", "run-tauri-cli.mjs");
const releaseLaunchProbePath = path.join(rootDir, "tools", "smoke", "windows-release-launch-probe.mjs");

function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      args._.push(current);
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

export function createWindowsReleaseVerificationPlan(options = {}) {
  const target =
    typeof options.target === "string" && options.target.trim().length > 0
      ? options.target.trim()
      : "";
  const startupDelayMs = Number.parseInt(String(options.startupDelayMs ?? ""), 10);
  const normalizedStartupDelayMs =
    Number.isFinite(startupDelayMs) && startupDelayMs > 0 ? startupDelayMs : 6000;

  const buildArgs = [
    tauriCliScriptPath,
    "build",
    "--config",
    "src-tauri/tauri.release.conf.json",
  ];
  if (target) {
    buildArgs.push("--target", target);
  }

  const smokeArgs = [
    releaseLaunchProbePath,
    "--inspect-launch",
    "--assert-passed",
    "--startup-delay-ms",
    String(normalizedStartupDelayMs),
  ];
  if (target) {
    smokeArgs.push("--target", target);
  }

  return {
    kind: "windows-release-verification-plan",
    cwd: rootDir,
    steps: [
      {
        id: "verify-terminal-runtime",
        label: "Verify terminal runtime regressions",
        command: process.execPath,
        args: [terminalRuntimeVerificationScriptPath],
      },
      {
        id: "build-release",
        label: "Build Windows release bundle",
        command: process.execPath,
        args: buildArgs,
      },
      {
        id: "smoke-release-launch",
        label: "Verify packaged Windows release launch",
        command: process.execPath,
        args: smokeArgs,
      },
    ],
  };
}

function runStep(step) {
  return new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${step.id} exited with signal ${signal}`));
        return;
      }

      if ((code ?? 0) !== 0) {
        reject(new Error(`${step.id} exited with code ${code ?? 0}`));
        return;
      }

      resolve(undefined);
    });
  });
}

async function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const plan = createWindowsReleaseVerificationPlan({
    target: typeof args.target === "string" ? args.target : undefined,
    startupDelayMs:
      typeof args["startup-delay-ms"] === "string" ? args["startup-delay-ms"] : undefined,
  });

  if (args["print-plan"]) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  for (const step of plan.steps) {
    process.stdout.write(`[sdkwork-terminal] ${step.label}\n`);
    await runStep(step);
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
