import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  createTauriCliPlan,
  normalizeTauriCliArgs,
  normalizeTauriCliEnv,
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

  assert.equal(path.basename(plan.cwd).startsWith("sdkwork-terminal"), true);
  assert.equal(plan.args[1], "dev");
  assert.equal(plan.args.includes("--config"), true);
});

test("run-tauri-cli strips Apple signing env unless macOS signing is explicitly enabled", () => {
  const env = normalizeTauriCliEnv(
    {
      SDKWORK_TERMINAL_ENABLE_APPLE_CODESIGN: "false",
      APPLE_CERTIFICATE: "certificate",
      APPLE_CERTIFICATE_PASSWORD: "password",
      APPLE_SIGNING_IDENTITY: "Developer ID Application: Example",
      APPLE_ID: "apple-id",
      APPLE_PASSWORD: "app-password",
      APPLE_TEAM_ID: "team-id",
    },
    "darwin",
  );

  assert.equal("APPLE_CERTIFICATE" in env, false);
  assert.equal("APPLE_CERTIFICATE_PASSWORD" in env, false);
  assert.equal("APPLE_SIGNING_IDENTITY" in env, false);
  assert.equal("APPLE_ID" in env, false);
  assert.equal("APPLE_PASSWORD" in env, false);
  assert.equal("APPLE_TEAM_ID" in env, false);
});

test("run-tauri-cli preserves Apple signing env when macOS signing is explicitly enabled and complete", () => {
  const env = normalizeTauriCliEnv(
    {
      SDKWORK_TERMINAL_ENABLE_APPLE_CODESIGN: "true",
      APPLE_CERTIFICATE: "certificate",
      APPLE_CERTIFICATE_PASSWORD: "password",
      APPLE_SIGNING_IDENTITY: "Developer ID Application: Example",
      APPLE_ID: "apple-id",
      APPLE_PASSWORD: "app-password",
      APPLE_TEAM_ID: "team-id",
    },
    "darwin",
  );

  assert.equal(env.APPLE_CERTIFICATE, "certificate");
  assert.equal(env.APPLE_CERTIFICATE_PASSWORD, "password");
  assert.equal(env.APPLE_SIGNING_IDENTITY, "Developer ID Application: Example");
  assert.equal(env.APPLE_ID, "apple-id");
  assert.equal(env.APPLE_PASSWORD, "app-password");
  assert.equal(env.APPLE_TEAM_ID, "team-id");
});
