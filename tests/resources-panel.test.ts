import test from "node:test";
import assert from "node:assert/strict";
import {
  createPendingResourceLaunchStatus,
  createResourceTargetActions,
  createResourceCenterSnapshot,
} from "../packages/sdkwork-terminal-resources/src/model.ts";

test("resource target actions expose launch and exec probe controls for connector-backed targets", () => {
  const snapshot = createResourceCenterSnapshot();
  const sshTarget = snapshot.targets[1];
  const actions = createResourceTargetActions(sshTarget, null);

  assert.deepEqual(
    actions.map((action) => action.label),
    ["Launch connector", "Exec probe"],
  );
  assert.equal(actions.every((action) => action.disabled === false), true);
});

test("resource target actions reflect pending exec probe state without masking launch action", () => {
  const snapshot = createResourceCenterSnapshot();
  const sshTarget = snapshot.targets[1];
  const actions = createResourceTargetActions(
    sshTarget,
    createPendingResourceLaunchStatus(sshTarget, "exec-probe"),
  );

  assert.deepEqual(
    actions.map((action) => action.label),
    ["Launch connector", "Probing..."],
  );
  assert.equal(actions.every((action) => action.disabled), true);
});
