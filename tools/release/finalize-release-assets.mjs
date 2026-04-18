#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      args._.push(current);
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

export function inferReleaseChannel(releaseTag) {
  const normalized = String(releaseTag ?? "").toLowerCase();
  if (normalized.includes("nightly")) {
    return "nightly";
  }

  if (normalized.includes("beta")) {
    return "beta";
  }

  return "stable";
}

export function loadWorkspaceReleaseMetadata(workspaceRoot = rootDir) {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(workspaceRoot, "package.json"), "utf8"),
  );
  const tauriConfig = JSON.parse(
    fs.readFileSync(
      path.join(workspaceRoot, "src-tauri", "tauri.conf.json"),
      "utf8",
    ),
  );

  return {
    productName: String(tauriConfig.productName ?? "sdkwork-terminal").trim(),
    version: String(packageJson.version ?? tauriConfig.version ?? "").trim(),
  };
}

export function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function finalizeReleaseAssets(
  { releaseTag, repository = "", releaseAssetsDir, workspaceRoot = rootDir },
) {
  if (!releaseTag || !releaseAssetsDir) {
    throw new Error("releaseTag and releaseAssetsDir are required");
  }

  const normalizedAssetsDir = path.resolve(workspaceRoot, releaseAssetsDir);
  const metadataDir = path.join(normalizedAssetsDir, "metadata");
  if (!fs.existsSync(metadataDir)) {
    throw new Error(`Missing release metadata directory: ${metadataDir}`);
  }

  const metadataFiles = fs
    .readdirSync(metadataDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();
  if (metadataFiles.length === 0) {
    throw new Error(`No release metadata files found in ${metadataDir}`);
  }

  const { productName, version } = loadWorkspaceReleaseMetadata(workspaceRoot);
  const desktopTargets = [];
  const checksumLines = [];
  const allAssets = [];

  for (const fileName of metadataFiles) {
    const metadataPath = path.join(metadataDir, fileName);
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    const files = metadata.assets
      .map((asset) => {
        const assetPath = path.join(normalizedAssetsDir, asset.relativePath);
        if (!fs.existsSync(assetPath)) {
          throw new Error(`Missing packaged asset ${asset.relativePath}`);
        }

        const sha256 = sha256File(assetPath);
        checksumLines.push(
          `${sha256}  ${asset.relativePath.split(path.sep).join("/")}`,
        );

        return {
          ...asset,
          sha256,
        };
      })
      .sort((left, right) => left.fileName.localeCompare(right.fileName));

    desktopTargets.push({
      platform: metadata.platform,
      arch: metadata.arch,
      target: metadata.target,
      bundles: Array.from(
        new Set(files.map((asset) => asset.bundleKind)),
      ).sort(),
      files,
    });
    allAssets.push(...files);
  }

  desktopTargets.sort((left, right) => {
    const leftKey = `${left.platform}:${left.arch}:${left.target}`;
    const rightKey = `${right.platform}:${right.arch}:${right.target}`;
    return leftKey.localeCompare(rightKey);
  });

  allAssets.sort((left, right) => {
    const leftKey = `${left.bundleKind}:${left.fileName}`;
    const rightKey = `${right.bundleKind}:${right.fileName}`;
    return leftKey.localeCompare(rightKey);
  });

  const manifest = {
    schemaVersion: 1,
    productName,
    version,
    releaseTag,
    releaseName: `${productName} ${releaseTag}`,
    repository,
    gitCommit: process.env.GITHUB_SHA ?? "",
    channel: inferReleaseChannel(releaseTag),
    generatedAt: new Date().toISOString(),
    desktopTargets,
    assets: allAssets,
  };

  const manifestPath = path.join(normalizedAssetsDir, "release-manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const checksumsPath = path.join(normalizedAssetsDir, "SHA256SUMS.txt");
  fs.writeFileSync(
    checksumsPath,
    `${checksumLines.sort().join("\n")}\n`,
    "utf8",
  );

  return {
    manifest,
    manifestPath,
    checksumsPath,
  };
}

function run() {
  const args = parseArgs();
  const result = finalizeReleaseAssets({
    releaseTag: args["release-tag"],
    repository: args.repository ?? "",
    releaseAssetsDir: args["release-assets-dir"],
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        manifestPath: result.manifestPath,
        checksumsPath: result.checksumsPath,
        assetCount: result.manifest.assets.length,
      },
      null,
      2,
    )}\n`,
  );
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run();
}
