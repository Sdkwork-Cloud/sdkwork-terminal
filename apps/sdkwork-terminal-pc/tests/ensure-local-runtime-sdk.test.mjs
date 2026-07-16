import test from "node:test";
import assert from "node:assert/strict";

import {
  createLocalRuntimeSdkGeneratePlan,
} from "../tools/scripts/ensure-local-runtime-sdk.mjs";

test("local runtime SDK generation uses the declared SDK package workflow", () => {
  const plan = createLocalRuntimeSdkGeneratePlan({
    env: {},
  });

  assert.equal(plan.label, "local-runtime-sdk-generate");
  assert.deepEqual(plan.args, ["run", "generate"]);
  assert.match(
    plan.cwd.replace(/\\/g, "/"),
    /sdks\/sdkwork-terminal-app-sdk\/sdkwork-terminal-app-sdk-typescript$/,
  );
  assert.equal(plan.shell, false);
});
