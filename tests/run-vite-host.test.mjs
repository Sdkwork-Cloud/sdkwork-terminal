import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  createViteHostPlan,
  resolveViteCliEntrypoint,
} from "../tools/scripts/run-vite-host.mjs";

test("run-vite-host resolves the installed vite cli entrypoint", () => {
  const entrypoint = resolveViteCliEntrypoint();

  assert.match(entrypoint, /vite/i);
  assert.equal(path.isAbsolute(entrypoint), true);
});

test("run-vite-host launches vite from the desktop workspace", () => {
  const plan = createViteHostPlan(["serve", "--host", "127.0.0.1", "--port", "1421"]);

  assert.equal(path.basename(plan.cwd), "desktop");
  assert.equal(plan.command, process.execPath);
  assert.deepEqual(plan.args.slice(1), [
    "serve",
    "--host",
    "127.0.0.1",
    "--port",
    "1421",
  ]);
});
