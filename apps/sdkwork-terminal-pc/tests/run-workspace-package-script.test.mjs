import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createWorkspacePackageScriptPlan } from "../tools/scripts/run-workspace-package-script.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function createTempWorkspace(script) {
  const workspaceRootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "sdkwork-terminal-runner-"),
  );
  const packageDir = path.join(workspaceRootDir, "apps", "web");

  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, "package.json"),
    JSON.stringify(
      {
        name: "@sdkwork/terminal-web-fixture",
        private: true,
        scripts: {
          build: script,
        },
      },
      null,
      2,
    ),
  );

  return {
    workspaceRootDir,
    packageDir,
    cleanup() {
      fs.rmSync(workspaceRootDir, { recursive: true, force: true });
    },
  };
}

test("run-workspace-package-script executes node-based package scripts directly on windows", () => {
  const fixture = createTempWorkspace("node ./scripts/build.mjs --mode production");

  try {
    const plan = createWorkspacePackageScriptPlan({
      packageDir: "apps/web",
      scriptName: "build",
      workspaceRootDir: fixture.workspaceRootDir,
      platform: "win32",
      env: {
        ComSpec: "C:\\Windows\\System32\\cmd.exe",
        PATH: "C:\\Windows\\System32",
      },
    });

    assert.equal(plan.command, process.execPath);
    assert.deepEqual(plan.args, [
      "./scripts/build.mjs",
      "--mode",
      "production",
    ]);
    assert.equal(plan.cwd, fixture.packageDir);
    assert.equal(plan.shell, false);
  } finally {
    fixture.cleanup();
  }
});

test("run-workspace-package-script resolves the workspace web build through the current node executable", () => {
  const plan = createWorkspacePackageScriptPlan({
    packageDir: "apps/web",
    scriptName: "build",
    workspaceRootDir: rootDir,
    platform: "win32",
  });

  assert.equal(plan.command, process.execPath);
  assert.equal(path.basename(plan.cwd), "web");
  assert.deepEqual(plan.args, [
    "../../tools/scripts/run-web-vite.mjs",
    "build",
  ]);
});

test("run-workspace-package-script rejects non-node package scripts on windows", () => {
  const fixture = createTempWorkspace("vite build");

  try {
    assert.throws(
      () =>
        createWorkspacePackageScriptPlan({
          packageDir: "apps/web",
          scriptName: "build",
          workspaceRootDir: fixture.workspaceRootDir,
          platform: "win32",
        }),
      /Only node-based package scripts are supported/,
    );
  } finally {
    fixture.cleanup();
  }
});
