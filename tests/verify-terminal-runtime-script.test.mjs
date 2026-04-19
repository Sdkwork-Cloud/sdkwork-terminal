import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleUrl = pathToFileURL(
  path.join(rootDir, "tools", "scripts", "verify-terminal-runtime.mjs"),
).href;

test("verify-terminal-runtime script runs critical runtime tests in a stable order", async () => {
  const { createTerminalRuntimeVerificationPlan } = await import(moduleUrl);
  const plan = createTerminalRuntimeVerificationPlan();

  assert.equal(plan.kind, "terminal-runtime-verification-plan");
  assert.equal(plan.cwd, rootDir);
  assert.deepEqual(
    plan.steps.map((step) => step.id),
    ["runtime-behavior-tests", "runtime-driver-tests"],
  );
  assert.equal(plan.steps[0]?.command, process.execPath);
  assert.equal(plan.steps[1]?.command, process.execPath);
  assert.deepEqual(plan.steps[0]?.args, [
    "--experimental-strip-types",
    "--test",
    "tests/terminal-wheel.test.ts",
    "tests/runtime-tab-controller.test.ts",
    "tests/shell-app-render.test.ts",
  ]);
  assert.deepEqual(plan.steps[1]?.args, [
    "--test",
    "tests/terminal-view-driver.test.ts",
  ]);
});
