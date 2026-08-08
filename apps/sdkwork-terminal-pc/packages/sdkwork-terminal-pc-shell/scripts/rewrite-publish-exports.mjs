#!/usr/bin/env node

// Rewrites the package `exports` map between the workspace development shape
// (source entrypoints) and the publish shape (compiled `dist/` entrypoints).
//
// - `prepack` rewrites exports to `dist/` so the packed tarball is directly
//   consumable by third-party consumers without a build step.
// - `postpack --restore` restores the source-based exports so workspace
//   development and typechecking keep resolving `src/` entrypoints.
//
// The rewrite is applied in memory and persisted back to package.json; the
// original shape is recreated deterministically from the source map below.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packageJsonPath = path.join(packageDir, "package.json");

const SOURCE_EXPORTS = {
  ".": {
    types: "./src/index.tsx",
    import: "./src/index.tsx",
    default: "./src/index.tsx",
  },
  "./integration": {
    types: "./src/integration.tsx",
    import: "./src/integration.tsx",
    default: "./src/integration.tsx",
  },
  "./web-integration": {
    types: "./src/web-integration.tsx",
    import: "./src/web-integration.tsx",
    default: "./src/web-integration.tsx",
  },
  "./styles.css": {
    types: "./src/styles.css",
    import: "./src/styles.css",
    default: "./src/styles.css",
  },
};

const DIST_EXPORTS = {
  ".": {
    types: "./dist/index.d.ts",
    import: "./dist/index.js",
    default: "./dist/index.js",
  },
  "./integration": {
    types: "./dist/integration.d.ts",
    import: "./dist/integration.js",
    default: "./dist/integration.js",
  },
  "./web-integration": {
    types: "./dist/web-integration.d.ts",
    import: "./dist/web-integration.js",
    default: "./dist/web-integration.js",
  },
  "./styles.css": "./dist/styles.css",
};

function loadPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

function savePackageJson(packageJson) {
  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );
}

function rewrite(targetExports, label) {
  const packageJson = loadPackageJson();
  if (JSON.stringify(packageJson.exports) === JSON.stringify(targetExports)) {
    return;
  }
  packageJson.exports = structuredClone(targetExports);
  savePackageJson(packageJson);
  process.stderr.write(`sdkwork-terminal-pc-shell: exports rewritten to ${label} shape\n`);
}

const restore = process.argv.includes("--restore");
if (restore) {
  rewrite(SOURCE_EXPORTS, "source");
} else {
  rewrite(DIST_EXPORTS, "dist");
}
