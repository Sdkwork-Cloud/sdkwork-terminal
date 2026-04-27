#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { runCommandStepsSync } from "./run-script-steps.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultRootDir = path.resolve(__dirname, "../..");

export const workspaceNodeTestFileExclusions = [
  "tests/shell-third-party-consumer-smoke.test.mjs",
];

function normalizeRelativeTestPath(entry, rootDir) {
  const normalizedEntry = String(entry).replace(/\\/g, "/");
  if (path.isAbsolute(entry)) {
    return path.relative(rootDir, entry).replace(/\\/g, "/");
  }

  return normalizedEntry;
}

function discoverTopLevelNodeTests(rootDir) {
  const testsDir = path.join(rootDir, "tests");
  return fs.readdirSync(testsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `tests/${entry.name}`);
}

export function createWorkspaceNodeTestFiles(options = {}) {
  const rootDir = options.rootDir ?? defaultRootDir;
  const testEntries = options.testEntries ?? discoverTopLevelNodeTests(rootDir);
  const excludedTestFiles = new Set(
    (options.excludedTestFiles ?? workspaceNodeTestFileExclusions)
      .map((entry) => normalizeRelativeTestPath(entry, rootDir)),
  );
  const testFiles = testEntries
    .map((entry) => normalizeRelativeTestPath(entry, rootDir))
    .filter((entry) => /^tests\/[^/]+\.test\.mjs$/.test(entry))
    .filter((entry) => !excludedTestFiles.has(entry))
    .sort((left, right) => left.localeCompare(right, "en"));

  if (testFiles.length === 0) {
    throw new Error("No workspace Node tests found under tests/*.test.mjs.");
  }

  return testFiles;
}

export function createWorkspaceNodeTestStep(options = {}) {
  const rootDir = options.rootDir ?? defaultRootDir;

  return {
    label: options.label ?? "workspace-node-tests",
    command: process.execPath,
    args: [
      "--experimental-test-isolation=none",
      "--test",
      ...createWorkspaceNodeTestFiles({
        ...options,
        rootDir,
      }),
    ],
    cwd: rootDir,
    shell: false,
  };
}

export function createRuntimeEventNameContractStep(options = {}) {
  return {
    label: options.label ?? "runtime-event-name-contract",
    command: process.execPath,
    args: [
      "--experimental-strip-types",
      "tests/runtime-event-name-contract.test.ts",
    ],
    cwd: options.rootDir ?? defaultRootDir,
    shell: false,
  };
}

export function createWorkspaceTestSteps(options = {}) {
  return [
    createWorkspaceNodeTestStep(options),
    createRuntimeEventNameContractStep(options),
  ];
}

export function runWorkspaceTestsCli() {
  const status = runCommandStepsSync(createWorkspaceTestSteps(), {
    env: process.env,
    failurePrefix: "run-workspace-tests",
  });

  if (status !== 0) {
    process.exit(status);
  }
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  try {
    runWorkspaceTestsCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
