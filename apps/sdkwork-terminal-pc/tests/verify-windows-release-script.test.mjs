import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleUrl = pathToFileURL(
  path.join(rootDir, "tools", "scripts", "verify-windows-release.mjs"),
).href;

test("verify-windows-release script verifies runtime regressions before building and smoking the packaged app", async () => {
  const { createWindowsReleaseVerificationPlan } = await import(moduleUrl);
  const plan = createWindowsReleaseVerificationPlan();

  assert.equal(plan.kind, "windows-release-verification-plan");
  assert.equal(plan.cwd, rootDir);
  assert.deepEqual(
    plan.steps.map((step) => step.id),
    ["verify-terminal-runtime", "build-release", "smoke-release-launch"],
  );
  assert.equal(plan.steps[0]?.command, process.execPath);
  assert.equal(plan.steps[1]?.command, process.execPath);
  assert.equal(plan.steps[2]?.command, process.execPath);
  assert.deepEqual(plan.steps[0]?.args, [
    path.join(rootDir, "tools", "scripts", "verify-terminal-runtime.mjs"),
  ]);
  assert.deepEqual(plan.steps[1]?.args.slice(0, 4), [
    path.join(rootDir, "tools", "scripts", "run-tauri-cli.mjs"),
    "build",
    "--config",
    "src-tauri/tauri.release.conf.json",
  ]);
  assert.deepEqual(plan.steps[2]?.args.slice(0, 5), [
    path.join(rootDir, "tools", "smoke", "windows-release-launch-probe.mjs"),
    "--inspect-launch",
    "--assert-passed",
    "--startup-delay-ms",
    "6000",
  ]);
});

test("verify-windows-release script forwards target and startup delay overrides into both steps", async () => {
  const { createWindowsReleaseVerificationPlan } = await import(moduleUrl);
  const plan = createWindowsReleaseVerificationPlan({
    target: "x86_64-pc-windows-msvc",
    startupDelayMs: "9000",
  });

  assert.deepEqual(plan.steps[1]?.args.slice(-2), [
    "--target",
    "x86_64-pc-windows-msvc",
  ]);
  assert.deepEqual(plan.steps[2]?.args.slice(-4), [
    "--startup-delay-ms",
    "9000",
    "--target",
    "x86_64-pc-windows-msvc",
  ]);
});
