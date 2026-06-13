import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  createViteChildProcessEnv,
  SDKWORK_VITE_TYPESCRIPT_ROOT_ENV,
} from "../tools/vite/sdkwork-vite-compat.mjs";
import { runViteDirectApi } from "../tools/vite/run-vite-direct-api.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureDir = path.join(rootDir, "tests", "fixtures", "third-party-shell-consumer");
const shellPackageDir = path.join(rootDir, "packages", "sdkwork-terminal-shell");
const tempRootDir = path.join(rootDir, ".tmp");
const requireFromWeb = createRequire(path.join(rootDir, "apps", "web", "package.json"));

function run(command, args, cwd) {
  const shouldUseShell =
    process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: shouldUseShell,
  });

  assert.equal(
    result.status,
    0,
    [
      `${command} ${args.join(" ")} failed`,
      result.error ? String(result.error) : "",
    ].filter(Boolean).join("\n"),
  );
}

function resolveTypescriptCli() {
  const packageJsonPath = requireFromWeb.resolve("typescript/package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const binPath =
    typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.tsc;

  assert.ok(binPath, `Unable to resolve typescript bin from ${packageJsonPath}`);
  return path.resolve(path.dirname(packageJsonPath), binPath);
}

function resolveCorepackCommand() {
  return path.join(
    path.dirname(process.execPath),
    process.platform === "win32" ? "corepack.cmd" : "corepack",
  );
}

function packShellTarball(outputDir) {
  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  run(
    resolveCorepackCommand(),
    ["pnpm", "pack", "--pack-destination", outputDir],
    shellPackageDir,
  );

  const tarballs = fs
    .readdirSync(outputDir)
    .filter((entry) => entry.endsWith(".tgz"))
    .map((entry) => path.join(outputDir, entry));

  assert.equal(tarballs.length, 1, `Expected one tarball in ${outputDir}`);
  return tarballs[0];
}

function extractTarballToPackage(tarballPath, installDir) {
  const extractionRoot = path.join(path.dirname(installDir), ".extract");
  fs.rmSync(extractionRoot, {
    recursive: true,
    force: true,
  });
  fs.mkdirSync(extractionRoot, {
    recursive: true,
  });
  run("tar", ["-xf", tarballPath, "-C", extractionRoot], rootDir);

  const extractedPackageDir = path.join(extractionRoot, "package");
  assert.ok(fs.existsSync(extractedPackageDir), "packed tarball must contain a package/ root");

  fs.rmSync(installDir, {
    recursive: true,
    force: true,
  });
  fs.mkdirSync(path.dirname(installDir), {
    recursive: true,
  });
  fs.renameSync(extractedPackageDir, installDir);
  fs.rmSync(extractionRoot, {
    recursive: true,
    force: true,
  });
}

function linkDependencyPackage(consumerDir, packageName) {
  const sourceDir = path.join(
    rootDir,
    "apps",
    "web",
    "node_modules",
    ...packageName.split("/"),
  );
  const targetDir = path.join(consumerDir, "node_modules", ...packageName.split("/"));

  assert.ok(fs.existsSync(sourceDir), `Missing dependency fixture source for ${packageName}`);
  fs.mkdirSync(path.dirname(targetDir), {
    recursive: true,
  });
  fs.rmSync(targetDir, {
    recursive: true,
    force: true,
  });
  fs.symlinkSync(
    sourceDir,
    targetDir,
    process.platform === "win32" ? "junction" : "dir",
  );
}

function writePipeSafeConsumerViteConfig(consumerDir) {
  const compatibilityConfigUrl = new URL(
    "../tools/vite/sdkwork-vite-compat.mjs",
    import.meta.url,
  ).href;
  const configSource = [
    'import { defineConfig, mergeConfig } from "vite";',
    'import react from "@vitejs/plugin-react";',
    `import { createSdkworkViteCompatibilityConfig } from ${JSON.stringify(compatibilityConfigUrl)};`,
    "",
    "export default defineConfig((configEnv) =>",
    "  mergeConfig(createSdkworkViteCompatibilityConfig(configEnv), {",
    "    plugins: [react()],",
    "  }),",
    ");",
    "",
  ].join("\n");

  const configPath = path.join(consumerDir, "vite.config.mjs");
  fs.writeFileSync(configPath, configSource, "utf8");
  return configPath;
}

test("packed terminal shell package builds in an external consumer fixture", { timeout: 300000 }, async () => {
  fs.mkdirSync(tempRootDir, {
    recursive: true,
  });

  const workDir = fs.mkdtempSync(path.join(tempRootDir, "third-party-shell-consumer-"));
  const consumerDir = path.join(workDir, "consumer");
  const packDir = path.join(workDir, "pack");
  const installDir = path.join(
    consumerDir,
    "node_modules",
    "@sdkwork",
    "terminal-shell",
  );

  try {
    fs.cpSync(fixtureDir, consumerDir, {
      recursive: true,
    });

    const tarballPath = packShellTarball(packDir);
    for (const packageName of [
      "react",
      "react-dom",
      "vite",
      "@vitejs/plugin-react",
      "@types/react",
      "@types/react-dom",
    ]) {
      linkDependencyPackage(consumerDir, packageName);
    }
    extractTarballToPackage(tarballPath, installDir);

    const packedPackageJson = JSON.parse(
      fs.readFileSync(path.join(installDir, "package.json"), "utf8"),
    );

    assert.deepEqual(packedPackageJson.files, ["README.md", "dist"]);
    assert.equal(packedPackageJson.exports["."].import, "./dist/index.js");
    assert.equal(
      packedPackageJson.exports["./integration"].import,
      "./dist/integration.js",
    );
    assert.equal(packedPackageJson.exports["./styles.css"], "./dist/styles.css");
    assert.ok(fs.existsSync(path.join(installDir, "dist", "index.d.ts")));
    assert.ok(fs.existsSync(path.join(installDir, "dist", "integration.d.ts")));
    assert.ok(fs.existsSync(path.join(installDir, "dist", "styles.css")));
    assert.ok(fs.existsSync(path.join(installDir, "dist", "xterm.css")));

    run(
      process.execPath,
      [resolveTypescriptCli(), "--project", path.join(consumerDir, "tsconfig.json")],
      consumerDir,
    );
    const consumerViteConfigPath = writePipeSafeConsumerViteConfig(consumerDir);
    await runViteDirectApi({
      cwd: consumerDir,
      configFile: consumerViteConfigPath,
      env: {
        ...createViteChildProcessEnv({
          env: process.env,
          pipeChildProcessSupported: false,
        }),
        [SDKWORK_VITE_TYPESCRIPT_ROOT_ENV]: path.join(rootDir, "apps", "web"),
      },
      viteArgs: [],
      viteCommand: "build",
    });

    assert.ok(fs.existsSync(path.join(consumerDir, "dist", "index.html")));
  } finally {
    fs.rmSync(workDir, {
      recursive: true,
      force: true,
    });
  }
});
