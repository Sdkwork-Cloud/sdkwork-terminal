import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  createTauriCliPlan,
  normalizeTauriCliArgs,
  resolveTauriCliEntrypoint,
} from "../tools/scripts/run-tauri-cli.mjs";

test("run-tauri-cli resolves the installed tauri cli entrypoint", () => {
  const entrypoint = resolveTauriCliEntrypoint();

  assert.match(entrypoint, /tauri\.js$/i);
  assert.equal(path.isAbsolute(entrypoint), true);
});

test("run-tauri-cli strips unsupported config flags from tauri info", () => {
  assert.deepEqual(
    normalizeTauriCliArgs(["info", "--config", "src-tauri/tauri.conf.json"]),
    ["info"],
  );
  assert.deepEqual(
    normalizeTauriCliArgs(["info", "--config=src-tauri/tauri.conf.json"]),
    ["info"],
  );
});

test("run-tauri-cli keeps config flags for tauri dev and build", () => {
  assert.deepEqual(
    normalizeTauriCliArgs(["dev", "--config", "src-tauri/tauri.conf.json"]),
    ["dev", "--config", "src-tauri/tauri.conf.json"],
  );
  assert.deepEqual(
    normalizeTauriCliArgs(["build", "--config=src-tauri/tauri.conf.json"]),
    ["build", "--config=src-tauri/tauri.conf.json"],
  );
});

test("run-tauri-cli launches tauri info from the desktop workspace", () => {
  const plan = createTauriCliPlan(["info", "--config", "src-tauri/tauri.conf.json"]);

  assert.equal(path.basename(plan.cwd), "desktop");
  assert.equal(plan.command, process.execPath);
  assert.equal(plan.args[1], "info");
  assert.equal(plan.args.includes("--config"), false);
});

test("run-tauri-cli keeps tauri dev rooted at the workspace", () => {
  const plan = createTauriCliPlan(["dev", "--config", "src-tauri/tauri.conf.json"]);

  assert.equal(path.basename(plan.cwd), "sdkwork-terminal");
  assert.equal(plan.args[1], "dev");
  assert.equal(plan.args.includes("--config"), true);
});
