import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { collectDesktopReleaseAssets } from "../tools/release/collect-desktop-release-assets.mjs";
import { finalizeReleaseAssets } from "../tools/release/finalize-release-assets.mjs";
import { renderReleaseNotes } from "../tools/release/render-release-notes.mjs";

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

test("desktop release asset tools collect bundles, finalize checksums, and render notes", () => {
  const workspaceRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "sdkwork-terminal-release-assets-"),
  );

  writeJson(path.join(workspaceRoot, "package.json"), {
    name: "@sdkwork/terminal-workspace",
    version: "1.2.3",
  });
  writeJson(path.join(workspaceRoot, "src-tauri", "tauri.conf.json"), {
    productName: "sdkwork-terminal",
    version: "1.2.3",
  });
  writeText(
    path.join(workspaceRoot, "docs", "release", "2026-01-01-v1.2.3.md"),
    "# 2026-01-01 v1.2.3\n\n## Changed\n\n- Added release workflow coverage.\n",
  );
  writeText(
    path.join(
      workspaceRoot,
      "target",
      "x86_64-pc-windows-msvc",
      "release",
      "bundle",
      "nsis",
      "sdkwork-terminal_1.2.3_x64-setup.exe",
    ),
    "nsis-bundle",
  );
  writeText(
    path.join(
      workspaceRoot,
      "target",
      "x86_64-pc-windows-msvc",
      "release",
      "bundle",
      "msi",
      "sdkwork-terminal_1.2.3_x64_en-US.msi",
    ),
    "msi-bundle",
  );

  const outputDir = path.join(workspaceRoot, "artifacts", "release");
  const metadata = collectDesktopReleaseAssets({
    workspaceRoot,
    releaseTag: "v1.2.3",
    platform: "windows",
    arch: "x64",
    target: "x86_64-pc-windows-msvc",
    outputDir,
  });

  assert.equal(metadata.assets.length, 2);
  assert.equal(
    metadata.assets.some((asset) => asset.bundleKind === "msi"),
    true,
  );
  assert.equal(
    metadata.assets.some((asset) => asset.bundleKind === "nsis"),
    true,
  );

  const finalized = finalizeReleaseAssets({
    workspaceRoot,
    releaseTag: "v1.2.3",
    repository: "Sdkwork-Cloud/sdkwork-terminal",
    releaseAssetsDir: outputDir,
  });

  assert.equal(finalized.manifest.desktopTargets.length, 1);
  assert.equal(finalized.manifest.assets.length, 2);
  assert.equal(finalized.manifest.channel, "stable");
  assert.match(
    fs.readFileSync(finalized.checksumsPath, "utf8"),
    /files\/sdkwork-terminal-v1\.2\.3-windows-x64-/,
  );

  const notes = renderReleaseNotes({
    workspaceRoot,
    releaseTag: "v1.2.3",
    releaseAssetsDir: outputDir,
    outputPath: path.join(outputDir, "release-notes.md"),
  });

  assert.match(notes.notes, /Desktop Target Matrix/);
  assert.match(notes.notes, /2026-01-01 v1.2.3/);
  assert.match(notes.notes, /release-manifest\.json/);
  assert.match(
    fs.readFileSync(path.join(outputDir, "release-notes.md"), "utf8"),
    /sdkwork-terminal v1\.2\.3/,
  );
});
