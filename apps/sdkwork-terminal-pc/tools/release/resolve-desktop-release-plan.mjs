#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

export const DESKTOP_RELEASE_MATRIX = [
  {
    platform: "windows",
    arch: "x64",
    runner: "windows-2022",
    target: "x86_64-pc-windows-msvc",
    bundles: "msi,nsis",
  },
  {
    platform: "windows",
    arch: "arm64",
    runner: "windows-11-arm",
    target: "aarch64-pc-windows-msvc",
    bundles: "msi,nsis",
  },
  {
    platform: "macos",
    arch: "arm64",
    runner: "macos-14",
    target: "aarch64-apple-darwin",
    bundles: "app,dmg",
  },
  {
    platform: "macos",
    arch: "x64",
    runner: "macos-15-intel",
    target: "x86_64-apple-darwin",
    bundles: "app,dmg",
  },
  {
    platform: "linux",
    arch: "x64",
    runner: "ubuntu-24.04",
    target: "x86_64-unknown-linux-gnu",
    bundles: "deb,appimage",
  },
  {
    platform: "linux",
    arch: "arm64",
    runner: "ubuntu-24.04-arm",
    target: "aarch64-unknown-linux-gnu",
    bundles: "deb,appimage",
  },
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

export function sanitizeReleaseTag(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error("release tag is required");
  }

  return normalized.replace(/^refs\/tags\//, "");
}

export function extractVersionFromReleaseTag(releaseTag) {
  const normalized = sanitizeReleaseTag(releaseTag);
  const match = normalized.match(
    /(?:^release-)?v?(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?)$/,
  );
  return match?.[1] ?? "";
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
    appVersion: String(packageJson.version ?? tauriConfig.version ?? "").trim(),
    productName: String(tauriConfig.productName ?? "sdkwork-terminal").trim(),
  };
}

export function createDesktopReleasePlan(
  { releaseTag, gitRef = "" },
  workspaceRoot = rootDir,
) {
  const { appVersion, productName } =
    loadWorkspaceReleaseMetadata(workspaceRoot);
  const normalizedReleaseTag = sanitizeReleaseTag(
    releaseTag || `v${appVersion}`,
  );
  const taggedVersion = extractVersionFromReleaseTag(normalizedReleaseTag);
  if (taggedVersion && taggedVersion !== appVersion) {
    throw new Error(
      `release tag version ${taggedVersion} does not match workspace version ${appVersion}`,
    );
  }
  const normalizedGitRef =
    String(gitRef ?? "").trim() || `refs/tags/${normalizedReleaseTag}`;

  return {
    productName,
    appVersion,
    releaseTag: normalizedReleaseTag,
    gitRef: normalizedGitRef,
    releaseName: `${productName} ${normalizedReleaseTag}`,
    desktopMatrix: DESKTOP_RELEASE_MATRIX,
  };
}

export function writeGithubOutput(plan, outputPath) {
  const lines = [
    `product_name=${plan.productName}`,
    `app_version=${plan.appVersion}`,
    `release_tag=${plan.releaseTag}`,
    `git_ref=${plan.gitRef}`,
    `release_name=${plan.releaseName}`,
    `desktop_matrix=${JSON.stringify(plan.desktopMatrix)}`,
  ];

  fs.appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function run() {
  const args = parseArgs();
  const plan = createDesktopReleasePlan({
    releaseTag: args["release-tag"],
    gitRef: args["git-ref"] ?? "",
  });

  if (args["github-output"]) {
    const outputPath = process.env.GITHUB_OUTPUT;
    if (!outputPath) {
      throw new Error("GITHUB_OUTPUT is required when --github-output is used");
    }

    writeGithubOutput(plan, outputPath);
    return;
  }

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run();
}
