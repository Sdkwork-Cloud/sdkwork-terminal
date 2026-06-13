import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { createFullVerificationSteps } from "../tools/scripts/run-full-verification.mjs";

test("full verification gate covers every release-critical lane in a stable order", () => {
  const steps = createFullVerificationSteps({
    env: {
      npm_execpath: "D:\\pnpm\\pnpm.cjs",
    },
  });

  assert.deepEqual(
    steps.map((step) => step.label),
    [
      "workspace-tests",
      "typescript-probes",
      "quality-check",
      "typecheck",
      "web-and-desktop-build",
      "terminal-runtime",
      "terminal-shell-package",
      "tauri-check",
      "rust-workspace",
    ],
  );
  assert.equal(steps[0]?.args.at(-1), "test");
  assert.equal(steps[1]?.args.at(-1), "verify:typescript-probes");
  assert.equal(steps[2]?.args.at(-1), "lint");
  assert.equal(steps[3]?.args.at(-1), "typecheck");
  assert.equal(steps[4]?.args.at(-1), "build");
  assert.equal(steps[5]?.args.at(-1), "verify:terminal-runtime");
  assert.equal(steps[6]?.args.at(-1), "verify:shell-package");
  assert.equal(steps[7]?.args.at(-1), "tauri:check");
  assert.equal(path.basename(steps[8]?.command ?? ""), "cargo");
  assert.deepEqual(steps[8]?.args, ["test", "--workspace"]);
});

test("full verification gate uses the active pnpm runtime when launched from pnpm", () => {
  const steps = createFullVerificationSteps({
    env: {
      npm_execpath: "D:\\pnpm\\pnpm.cjs",
    },
  });

  for (const step of steps.slice(0, 8)) {
    assert.equal(step.command, process.execPath);
    assert.deepEqual(step.args.slice(0, 1), ["D:\\pnpm\\pnpm.cjs"]);
    assert.equal(step.shell, false);
  }
});

test("full verification gate falls back to a Windows-safe Corepack launcher", () => {
  const steps = createFullVerificationSteps({
    platform: "win32",
    env: {},
  });

  for (const step of steps.slice(0, 8)) {
    assert.equal(path.basename(step.command), "corepack.cmd");
    assert.equal(step.args[0], "pnpm");
    assert.equal(step.shell, true);
  }
});
