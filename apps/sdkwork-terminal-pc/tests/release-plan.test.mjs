import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DESKTOP_RELEASE_MATRIX,
  createDesktopReleasePlan,
  extractVersionFromReleaseTag,
} from "../tools/release/resolve-desktop-release-plan.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const workspacePackage = JSON.parse(
  fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
);
const tauriConfig = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src-tauri", "tauri.conf.json"), "utf8"),
);
const currentVersion = String(workspacePackage.version);

test("desktop release plan exposes the full documented desktop target matrix", () => {
  assert.equal(DESKTOP_RELEASE_MATRIX.length, 6);
  assert.deepEqual(
    DESKTOP_RELEASE_MATRIX.map((entry) => entry.target),
    [
      "x86_64-pc-windows-msvc",
      "aarch64-pc-windows-msvc",
      "aarch64-apple-darwin",
      "x86_64-apple-darwin",
      "x86_64-unknown-linux-gnu",
      "aarch64-unknown-linux-gnu",
    ],
  );
  assert.equal(
    DESKTOP_RELEASE_MATRIX.some(
      (entry) => entry.runner === "windows-11-arm" && entry.arch === "arm64",
    ),
    true,
  );
  assert.equal(
    DESKTOP_RELEASE_MATRIX.some(
      (entry) => entry.runner === "ubuntu-24.04-arm" && entry.arch === "arm64",
    ),
    true,
  );
  assert.equal(
    DESKTOP_RELEASE_MATRIX.some(
      (entry) => entry.runner === "macos-15-intel" && entry.arch === "x64",
    ),
    true,
  );
});

test("desktop release plan defaults git ref from the release tag and reads workspace metadata", () => {
  const releaseTag = `v${currentVersion}`;
  const plan = createDesktopReleasePlan({ releaseTag });

  assert.equal(plan.productName, tauriConfig.productName);
  assert.equal(plan.appVersion, currentVersion);
  assert.equal(plan.releaseTag, releaseTag);
  assert.equal(plan.gitRef, `refs/tags/${releaseTag}`);
  assert.equal(plan.releaseName, `${tauriConfig.productName} ${releaseTag}`);
  assert.equal(Array.isArray(plan.desktopMatrix), true);
  assert.equal(plan.desktopMatrix.length, 6);
});

test("desktop release plan extracts version from release-* tags and rejects mismatched versions", () => {
  assert.equal(
    extractVersionFromReleaseTag(`release-v${currentVersion}`),
    currentVersion,
  );
  assert.throws(
    () => createDesktopReleasePlan({ releaseTag: "v9.9.9" }),
    /does not match workspace version/,
  );
});
