import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  createViteHostPlan,
  resolveViteCliEntrypoint,
} from "../tools/scripts/run-vite-host.mjs";
import { createWebVitePlan } from "../tools/scripts/run-web-vite.mjs";
import {
  createSdkworkViteCompatibilityConfig,
  SDKWORK_VITE_NO_PIPE_CHILDREN_ENV,
} from "../tools/vite/sdkwork-vite-compat.mjs";

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

test("vite runners enable the pipe-safe fallback when piped child processes are blocked", () => {
  const env = {
    Path: "C:\\Windows\\System32",
  };

  const desktopPlan = createViteHostPlan(["build"], {
    env,
    pipeChildProcessSupported: false,
  });
  const webPlan = createWebVitePlan(["build"], {
    env,
    pipeChildProcessSupported: false,
  });

  assert.equal(desktopPlan.env[SDKWORK_VITE_NO_PIPE_CHILDREN_ENV], "1");
  assert.equal(webPlan.env[SDKWORK_VITE_NO_PIPE_CHILDREN_ENV], "1");
  assert.equal(desktopPlan.useDirectViteApi, true);
  assert.equal(webPlan.useDirectViteApi, true);
});

test("pipe-safe vite compatibility disables esbuild process paths for builds", () => {
  const config = createSdkworkViteCompatibilityConfig({
    command: "build",
    mode: "production",
    env: {
      [SDKWORK_VITE_NO_PIPE_CHILDREN_ENV]: "1",
    },
  });

  assert.equal(config.resolve?.preserveSymlinks, true);
  assert.equal(config.build?.minify, false);
  assert.equal(config.esbuild, false);
  assert.ok(config.plugins.some((plugin) => plugin.name === "sdkwork:disable-esbuild"));
  assert.ok(config.plugins.some((plugin) => plugin.name === "sdkwork:vite-define-bypass"));
  assert.ok(config.plugins.some((plugin) => plugin.name === "sdkwork:typescript-transpile"));
  assert.ok(config.plugins.some((plugin) => plugin.name === "sdkwork:react-dom-scheduler-resolve"));
});
