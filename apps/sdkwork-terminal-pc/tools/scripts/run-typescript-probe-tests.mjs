#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRootDir = path.resolve(__dirname, "../..");

function normalizeRelativeTestPath(entry, rootDir) {
  const normalizedEntry = String(entry).replace(/\\/g, "/");
  if (path.isAbsolute(entry)) {
    return path.relative(rootDir, entry).replace(/\\/g, "/");
  }

  return normalizedEntry;
}

function discoverTopLevelTypeScriptTests(rootDir) {
  const testsDir = path.join(rootDir, "tests");
  return fs.readdirSync(testsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `tests/${entry.name}`);
}

export function createTypeScriptProbeTestPlan(options = {}) {
  const rootDir = options.rootDir ?? defaultRootDir;
  const testEntries = options.testEntries ?? discoverTopLevelTypeScriptTests(rootDir);
  const testFiles = testEntries
    .map((entry) => normalizeRelativeTestPath(entry, rootDir))
    .filter((entry) => /^tests\/[^/]+\.test\.ts$/.test(entry))
    .sort((left, right) => left.localeCompare(right, "en"));

  if (testFiles.length === 0) {
    throw new Error("No TypeScript probe tests found under tests/*.test.ts.");
  }

  return {
    command: process.execPath,
    args: [
      "--experimental-strip-types",
      "--experimental-test-isolation=none",
      "--test",
      ...testFiles,
    ],
    cwd: rootDir,
    shell: false,
  };
}

export function runTypeScriptProbeTestsCli() {
  const plan = createTypeScriptProbeTestPlan();
  const result = spawnSync(plan.command, plan.args, {
    cwd: plan.cwd,
    env: process.env,
    stdio: "inherit",
    shell: plan.shell,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    console.error(`[run-typescript-probe-tests] exited with signal ${result.signal}`);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  try {
    runTypeScriptProbeTestsCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
