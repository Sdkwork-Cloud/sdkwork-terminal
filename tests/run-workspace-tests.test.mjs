import test from "node:test";
import assert from "node:assert/strict";

import {
  createWorkspaceNodeTestStep,
  createWorkspaceTestSteps,
} from "../tools/scripts/run-workspace-tests.mjs";

const expectedWorkspaceNodeTestFiles = [
  "tests/desktop-bootstrap-contract.test.mjs",
  "tests/release-assets.test.mjs",
  "tests/release-plan.test.mjs",
  "tests/release-workflows.test.mjs",
  "tests/run-full-verification.test.mjs",
  "tests/run-script-steps.test.mjs",
  "tests/run-tauri-cli.test.mjs",
  "tests/run-typescript-probes.test.mjs",
  "tests/run-vite-host.test.mjs",
  "tests/run-workspace-package-script.test.mjs",
  "tests/run-workspace-tests.test.mjs",
  "tests/tauri-dev-script.test.mjs",
  "tests/verify-terminal-runtime-script.test.mjs",
  "tests/verify-windows-release-script.test.mjs",
  "tests/workspace-structure.test.mjs",
];

test("workspace test runner discovers all top-level Node tests in a stable order", () => {
  const step = createWorkspaceNodeTestStep({
    rootDir: "D:\\workspace\\sdkwork-terminal",
    testEntries: [
      "tests\\zeta.test.mjs",
      "tests\\alpha.test.mjs",
      "tests\\nested\\ignored.test.mjs",
      "tests\\beta.test.ts",
      "tests\\shell-third-party-consumer-smoke.test.mjs",
    ],
  });

  assert.equal(step.label, "workspace-node-tests");
  assert.equal(step.command, process.execPath);
  assert.equal(step.cwd, "D:\\workspace\\sdkwork-terminal");
  assert.equal(step.shell, false);
  assert.deepEqual(step.args.slice(0, 2), [
    "--experimental-test-isolation=none",
    "--test",
  ]);
  assert.deepEqual(step.args.slice(2), [
    "tests/alpha.test.mjs",
    "tests/zeta.test.mjs",
  ]);
});

test("workspace test runner keeps the real Node matrix complete", () => {
  const step = createWorkspaceNodeTestStep();

  assert.deepEqual(step.args.slice(2), expectedWorkspaceNodeTestFiles);
});

test("workspace test runner follows node tests with the runtime event contract", () => {
  const steps = createWorkspaceTestSteps({
    rootDir: "D:\\workspace\\sdkwork-terminal",
    testEntries: ["tests\\alpha.test.mjs"],
  });

  assert.deepEqual(
    steps.map((step) => step.label),
    ["workspace-node-tests", "runtime-event-name-contract"],
  );
  assert.deepEqual(steps[1]?.args, [
    "--experimental-strip-types",
    "tests/runtime-event-name-contract.test.ts",
  ]);
  assert.equal(steps[1]?.cwd, "D:\\workspace\\sdkwork-terminal");
  assert.equal(steps[1]?.shell, false);
});
