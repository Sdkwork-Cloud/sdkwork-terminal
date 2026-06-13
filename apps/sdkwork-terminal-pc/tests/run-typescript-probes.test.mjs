import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { createTypeScriptProbeTestPlan } from "../tools/scripts/run-typescript-probe-tests.mjs";

test("typescript probe runner discovers all top-level TypeScript tests in a stable order", () => {
  const plan = createTypeScriptProbeTestPlan({
    rootDir: "D:\\workspace\\sdkwork-terminal",
    testEntries: [
      "tests\\zeta.test.ts",
      "tests\\alpha.test.ts",
      "tests\\nested\\ignored.test.ts",
      "tests\\beta.test.mjs",
      "tests\\runtime-event-name-contract.test.ts",
    ],
  });

  assert.equal(plan.command, process.execPath);
  assert.equal(plan.cwd, "D:\\workspace\\sdkwork-terminal");
  assert.deepEqual(plan.args.slice(0, 3), [
    "--experimental-strip-types",
    "--experimental-test-isolation=none",
    "--test",
  ]);
  assert.deepEqual(plan.args.slice(3), [
    "tests/alpha.test.ts",
    "tests/runtime-event-name-contract.test.ts",
    "tests/zeta.test.ts",
  ]);
  assert.equal(plan.shell, false);
});

test("typescript probe runner rejects an empty TypeScript probe set", () => {
  assert.throws(
    () =>
      createTypeScriptProbeTestPlan({
        rootDir: path.resolve("fixture"),
        testEntries: ["tests/workspace-structure.test.mjs"],
      }),
    /No TypeScript probe tests found/,
  );
});
