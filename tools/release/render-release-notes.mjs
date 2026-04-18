#!/usr/bin/env node

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

export function extractVersionFromReleaseTag(releaseTag) {
  const normalized = String(releaseTag ?? "").trim().replace(/^refs\/tags\//, "");
  const match = normalized.match(/(?:^release-)?v?(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?)$/);
  return match?.[1] ?? "";
}

export function findVersionedReleaseDoc(version, workspaceRoot = rootDir) {
  if (!version) {
    return null;
  }

  const releaseDir = path.join(workspaceRoot, "docs", "release");
  if (!fs.existsSync(releaseDir)) {
    return null;
  }

  const candidates = fs
    .readdirSync(releaseDir)
    .filter(
      (fileName) =>
        fileName.endsWith(`v${version}.md`) &&
        fileName !== "CHANGELOG.md" &&
        fileName !== "README.md",
    )
    .sort()
    .reverse();

  if (candidates.length === 0) {
    return null;
  }

  return path.join(releaseDir, candidates[0]);
}

export function renderReleaseNotes({
  releaseTag,
  releaseAssetsDir,
  outputPath,
  workspaceRoot = rootDir,
}) {
  if (!releaseTag || !releaseAssetsDir || !outputPath) {
    throw new Error("releaseTag, releaseAssetsDir, and outputPath are required");
  }

  const normalizedAssetsDir = path.resolve(workspaceRoot, releaseAssetsDir);
  const manifestPath = path.join(normalizedAssetsDir, "release-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing release manifest: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const version = extractVersionFromReleaseTag(releaseTag) || manifest.version;
  const sourceDocPath = findVersionedReleaseDoc(version, workspaceRoot);
  const sourceDocContent = sourceDocPath
    ? fs.readFileSync(sourceDocPath, "utf8").trim()
    : "";

  const targetRows = manifest.desktopTargets
    .map(
      (target) =>
        `| ${target.platform} | ${target.arch} | ${target.target} | ${target.bundles.join(", ")} | ${target.files.length} |`,
    )
    .join("\n");

  const notes = [
    `# ${manifest.releaseName}`,
    "",
    "## Release Summary",
    "",
    `- Release tag: \`${manifest.releaseTag}\``,
    `- Version: \`${manifest.version}\``,
    `- Channel: \`${manifest.channel}\``,
    manifest.gitCommit ? `- Commit: \`${manifest.gitCommit}\`` : null,
    manifest.repository ? `- Repository: \`${manifest.repository}\`` : null,
    `- Generated manifest: \`release-manifest.json\``,
    `- Checksums: \`SHA256SUMS.txt\``,
    "",
    "## Desktop Target Matrix",
    "",
    "| Platform | Arch | Target Triple | Bundles | Files |",
    "| --- | --- | --- | --- | --- |",
    targetRows || "| - | - | - | - | 0 |",
    "",
    "## Product Release Notes",
    "",
    sourceDocContent ||
      `No versioned release note matching \`v${version}\` was found under \`docs/release\`.`,
    "",
    "## Release Metadata",
    "",
    "- See `release-manifest.json` for the packaged target matrix and per-file checksums.",
    "- See `SHA256SUMS.txt` to validate downloaded artifacts after publication.",
  ]
    .filter(Boolean)
    .join("\n");

  const resolvedOutputPath = path.resolve(workspaceRoot, outputPath);
  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  fs.writeFileSync(resolvedOutputPath, `${notes}\n`, "utf8");

  return {
    outputPath: resolvedOutputPath,
    sourceDocPath,
    notes,
  };
}

function run() {
  const args = parseArgs();
  const result = renderReleaseNotes({
    releaseTag: args["release-tag"],
    releaseAssetsDir: args["release-assets-dir"],
    outputPath: args.output,
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        outputPath: result.outputPath,
        sourceDocPath: result.sourceDocPath,
      },
      null,
      2,
    )}\n`,
  );
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run();
}
