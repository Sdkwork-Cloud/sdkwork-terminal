#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

export function createTerminalRuntimeVerificationPlan() {
  return {
    kind: "terminal-runtime-verification-plan",
    cwd: rootDir,
    steps: [
      {
        id: "runtime-behavior-tests",
        label: "Verify terminal runtime behavior tests",
        command: process.execPath,
        args: [
          "--experimental-strip-types",
          "--experimental-test-isolation=none",
          "--test",
          "tests/terminal-wheel.test.ts",
          "tests/runtime-tab-controller.test.ts",
          "tests/shell-app-render.test.ts",
        ],
      },
      {
        id: "runtime-driver-tests",
        label: "Verify terminal driver structure tests",
        command: process.execPath,
        args: [
          "--experimental-test-isolation=none",
          "--test",
          "tests/terminal-view-driver.test.ts",
        ],
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

async function runCli() {
  const plan = createTerminalRuntimeVerificationPlan();

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
