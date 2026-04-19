#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

const COLLECTABLE_FILE_PATTERNS = [
  /\.msi$/i,
  /\.exe$/i,
  /\.dmg$/i,
  /\.appimage$/i,
  /\.deb$/i,
  /\.rpm$/i,
  /\.app\.tar\.gz$/i,
  /\.tar\.gz$/i,
  /\.sig$/i,
  /^latest\.json$/i,
];

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

export function sanitizeNameSegment(value) {
  return String(value ?? "")
    .trim()
    .replace(/^refs\/tags\//, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function detectBundleKind(fileName, relativeSourcePath) {
  const normalizedName = fileName.toLowerCase();
  const sourceLower = relativeSourcePath.toLowerCase();

  if (normalizedName.endsWith(".msi")) {
    return "msi";
  }

  if (normalizedName.endsWith(".exe")) {
    return "nsis";
  }

  if (normalizedName.endsWith(".dmg")) {
    return "dmg";
  }

  if (normalizedName.endsWith(".appimage")) {
    return "appimage";
  }

  if (normalizedName.endsWith(".deb")) {
    return "deb";
  }

  if (normalizedName.endsWith(".rpm")) {
    return "rpm";
  }

  if (normalizedName.endsWith(".app.tar.gz")) {
    return "app";
  }

  if (normalizedName === "latest.json") {
    return "updater-json";
  }

  if (normalizedName.endsWith(".sig")) {
    return detectBundleKind(
      fileName.slice(0, -4),
      relativeSourcePath.slice(0, -4),
    );
  }

  if (sourceLower.includes(`${path.sep}nsis${path.sep}`)) {
    return "nsis";
  }

  if (sourceLower.includes(`${path.sep}msi${path.sep}`)) {
    return "msi";
  }

  if (sourceLower.includes(`${path.sep}dmg${path.sep}`)) {
    return "dmg";
  }

  if (sourceLower.includes(`${path.sep}appimage${path.sep}`)) {
    return "appimage";
  }

  if (sourceLower.includes(`${path.sep}deb${path.sep}`)) {
    return "deb";
  }

  if (sourceLower.includes(`${path.sep}rpm${path.sep}`)) {
    return "rpm";
  }

  return "bundle";
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

export function resolveBundleRoot(target, workspaceRoot = rootDir) {
  const candidates = [
    path.join(workspaceRoot, "target", target, "release", "bundle"),
    path.join(workspaceRoot, "target", "release", "bundle"),
    path.join(workspaceRoot, "src-tauri", "target", target, "release", "bundle"),
    path.join(workspaceRoot, "src-tauri", "target", "release", "bundle"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to resolve bundle output for target ${target}. Checked: ${candidates.join(", ")}`,
  );
}

export function walkFiles(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files.sort();
}

export function isCollectableAsset(filePath) {
  const fileName = path.basename(filePath);
  return COLLECTABLE_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

export function normalizeCollectedAssetName({
  productName,
  releaseTag,
  platform,
  arch,
  originalName,
}) {
  const safeProduct = sanitizeNameSegment(productName);
  const safeReleaseTag = sanitizeNameSegment(releaseTag);
  const safePlatform = sanitizeNameSegment(platform);
  const safeArch = sanitizeNameSegment(arch);
  const safeOriginalName = originalName.replace(/[^\w.-]+/g, "-");

  return `${safeProduct}-${safeReleaseTag}-${safePlatform}-${safeArch}-${safeOriginalName}`;
}

export function collectDesktopReleaseAssets(
  {
    releaseTag,
    platform,
    arch,
    target,
    outputDir,
    workspaceRoot = rootDir,
  },
) {
  if (!releaseTag || !platform || !arch || !target || !outputDir) {
    throw new Error(
      "releaseTag, platform, arch, target, and outputDir are required",
    );
  }

  const bundleRoot = resolveBundleRoot(target, workspaceRoot);
  const releaseAssetsDir = path.resolve(workspaceRoot, outputDir);
  const filesDir = path.join(releaseAssetsDir, "files");
  const metadataDir = path.join(releaseAssetsDir, "metadata");
  fs.mkdirSync(filesDir, { recursive: true });
  fs.mkdirSync(metadataDir, { recursive: true });

  const { productName, version } = loadWorkspaceReleaseMetadata(workspaceRoot);
  const usedNames = new Set();
  const assets = [];

  for (const sourcePath of walkFiles(bundleRoot)) {
    if (!isCollectableAsset(sourcePath)) {
      continue;
    }

    const relativeSourcePath = path.relative(bundleRoot, sourcePath);
    const originalName = path.basename(sourcePath);
    let collectedName = normalizeCollectedAssetName({
      productName,
      releaseTag,
      platform,
      arch,
      originalName,
    });

    let dedupeIndex = 2;
    while (usedNames.has(collectedName)) {
      const extension = path.extname(collectedName);
      const baseName = extension
        ? collectedName.slice(0, -extension.length)
        : collectedName;
      collectedName = `${baseName}-${dedupeIndex}${extension}`;
      dedupeIndex += 1;
    }

    usedNames.add(collectedName);

    const destinationPath = path.join(filesDir, collectedName);
    fs.copyFileSync(sourcePath, destinationPath);

    assets.push({
      bundleKind: detectBundleKind(originalName, relativeSourcePath),
      fileName: collectedName,
      originalFileName: originalName,
      relativePath: path.relative(releaseAssetsDir, destinationPath).split(path.sep).join("/"),
      size: fs.statSync(destinationPath).size,
      sourcePath: relativeSourcePath.split(path.sep).join("/"),
    });
  }

  if (assets.length === 0) {
    throw new Error(`No release assets found under ${bundleRoot}`);
  }

  const metadata = {
    schemaVersion: 1,
    productName,
    version,
    releaseTag: sanitizeNameSegment(releaseTag),
    platform,
    arch,
    target,
    collectedAt: new Date().toISOString(),
    assets,
  };

  const metadataPath = path.join(
    metadataDir,
    `${sanitizeNameSegment(platform)}-${sanitizeNameSegment(arch)}.json`,
  );
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

  return metadata;
}

function run() {
  const args = parseArgs();
  const metadata = collectDesktopReleaseAssets({
    releaseTag: args["release-tag"],
    platform: args.platform,
    arch: args.arch,
    target: args.target,
    outputDir: args["output-dir"],
  });

  process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`);
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run();
}
