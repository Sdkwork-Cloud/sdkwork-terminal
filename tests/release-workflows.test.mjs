import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function readWorkspaceFile(relPath) {
  const fullPath = path.join(rootDir, relPath);
  assert.equal(fs.existsSync(fullPath), true, `Expected ${relPath} to exist`);
  return fs.readFileSync(fullPath, "utf8");
}

test("desktop release workflows and release overlay exist", () => {
  readWorkspaceFile(".github/workflows/ci.yml");
  readWorkspaceFile(".github/workflows/release.yml");
  readWorkspaceFile(".github/workflows/release-reusable.yml");

  const releaseConfig = JSON.parse(
    readWorkspaceFile("src-tauri/tauri.release.conf.json"),
  );
  assert.equal(releaseConfig.bundle?.active, true);
  assert.equal(releaseConfig.bundle?.targets, "all");
  assert.deepEqual(
    releaseConfig.bundle?.icon,
    [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico",
    ],
  );
});

test("release reusable workflow keeps a six-target desktop matrix and final GitHub release publish", () => {
  const workflow = readWorkspaceFile(".github/workflows/release-reusable.yml");
  const releaseEntryWorkflow = readWorkspaceFile(".github/workflows/release.yml");
  const releasePlanScript = readWorkspaceFile(
    "tools/release/resolve-desktop-release-plan.mjs",
  );

  assert.match(
    releaseEntryWorkflow,
    /release-from-tag:\s*[\s\S]*if:\s*\$\{\{\s*github\.event_name == 'push'\s*\}\}/,
  );
  assert.match(
    releaseEntryWorkflow,
    /release-dispatch:\s*[\s\S]*if:\s*\$\{\{\s*github\.event_name == 'workflow_dispatch'\s*\}\}/,
  );
  assert.doesNotMatch(releaseEntryWorkflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24/);
  assert.doesNotMatch(
    releaseEntryWorkflow,
    /github\.event_name == 'push' && false \|\| github\.event\.inputs\.(draft|prerelease)/,
  );
  const ciWorkflow = readWorkspaceFile(".github/workflows/ci.yml");
  assert.doesNotMatch(ciWorkflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24/);
  assert.doesNotMatch(workflow, /FORCE_JAVASCRIPT_ACTIONS_TO_NODE24/);
  assert.match(
    workflow,
    /node tools\/release\/resolve-desktop-release-plan\.mjs/,
  );
  assert.match(workflow, /fromJSON\(needs\.prepare\.outputs\.desktop_matrix\)/);
  assert.match(workflow, /softprops\/action-gh-release@v3/);
  assert.match(workflow, /actions\/upload-artifact@v7/);
  assert.match(workflow, /actions\/download-artifact@v8/);
  assert.doesNotMatch(workflow, /softprops\/action-gh-release@v2/);
  assert.doesNotMatch(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /actions\/download-artifact@v4/);
  assert.match(workflow, /actions\/attest-build-provenance@v3/);
  assert.match(workflow, /node tools\/release\/collect-desktop-release-assets\.mjs/);
  assert.match(workflow, /node tools\/release\/finalize-release-assets\.mjs/);
  assert.match(workflow, /node tools\/release\/render-release-notes\.mjs/);
  assert.match(workflow, /SDKWORK_TERMINAL_ENABLE_APPLE_CODESIGN/);
  assert.equal(
    workflow.match(/package-manager-cache:\s*false/g)?.length ?? 0,
    4,
  );

  assert.match(releasePlanScript, /windows-2022/);
  assert.match(releasePlanScript, /windows-11-arm/);
  assert.match(releasePlanScript, /macos-14/);
  assert.match(releasePlanScript, /macos-15-intel/);
  assert.match(releasePlanScript, /ubuntu-24\.04-arm/);
});
