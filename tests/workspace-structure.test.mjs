import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const reviewFiles = [
  "docs/review/README.md",
  "docs/review/2026-04-09-step01-审计基线.md",
  "docs/review/2026-04-09-step01-差距矩阵.md",
  "docs/review/2026-04-09-step01-风险清单.md",
];

const workspaceFiles = [
  "package.json",
  ".npmrc",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  "Cargo.toml",
  ".gitignore",
];

const rootPackageName = "@sdkwork/terminal-workspace";

const packageNames = {
  "apps/desktop/package.json": "@sdkwork/terminal-desktop",
  "apps/web/package.json": "@sdkwork/terminal-web",
  "packages/sdkwork-terminal-shell/package.json": "@sdkwork/terminal-shell",
  "packages/sdkwork-terminal-workbench/package.json": "@sdkwork/terminal-workbench",
  "packages/sdkwork-terminal-sessions/package.json": "@sdkwork/terminal-sessions",
  "packages/sdkwork-terminal-resources/package.json": "@sdkwork/terminal-resources",
  "packages/sdkwork-terminal-ai-cli/package.json": "@sdkwork/terminal-ai-cli",
  "packages/sdkwork-terminal-settings/package.json": "@sdkwork/terminal-settings",
  "packages/sdkwork-terminal-diagnostics/package.json": "@sdkwork/terminal-diagnostics",
  "packages/sdkwork-terminal-core/package.json": "@sdkwork/terminal-core",
  "packages/sdkwork-terminal-infrastructure/package.json": "@sdkwork/terminal-infrastructure",
  "packages/sdkwork-terminal-contracts/package.json": "@sdkwork/terminal-contracts",
  "packages/sdkwork-terminal-types/package.json": "@sdkwork/terminal-types",
  "packages/sdkwork-terminal-ui/package.json": "@sdkwork/terminal-ui",
  "packages/sdkwork-terminal-i18n/package.json": "@sdkwork/terminal-i18n",
  "packages/sdkwork-terminal-commons/package.json": "@sdkwork/terminal-commons",
};

const crateNames = [
  "crates/sdkwork-terminal-terminal-core/Cargo.toml",
  "crates/sdkwork-terminal-pty-runtime/Cargo.toml",
  "crates/sdkwork-terminal-session-runtime/Cargo.toml",
  "crates/sdkwork-terminal-shell-integration/Cargo.toml",
  "crates/sdkwork-terminal-resource-connectors/Cargo.toml",
  "crates/sdkwork-terminal-ai-cli-host/Cargo.toml",
  "crates/sdkwork-terminal-replay-store/Cargo.toml",
  "crates/sdkwork-terminal-protocol/Cargo.toml",
  "crates/sdkwork-terminal-control-plane/Cargo.toml",
  "crates/sdkwork-terminal-runtime-node/Cargo.toml",
  "crates/sdkwork-terminal-observability/Cargo.toml",
  "crates/sdkwork-terminal-config/Cargo.toml",
];

const thinHostFiles = [
  "src-tauri/Cargo.toml",
  "src-tauri/build.rs",
  "src-tauri/src/main.rs",
  "src-tauri/src/lib.rs",
  "src-tauri/tauri.conf.json",
  "src-tauri/capabilities/default.json",
];

const deliveryDirs = [
  "deployments/docker",
  "deployments/k8s",
  "tools/scripts",
  "tools/smoke",
];

function expectPath(relPath) {
  const fullPath = path.join(rootDir, relPath);
  assert.equal(
    fs.existsSync(fullPath),
    true,
    `Expected ${relPath} to exist`,
  );
  return fullPath;
}

test("step01 review evidence exists", () => {
  for (const relPath of reviewFiles) {
    expectPath(relPath);
  }
});

test("step02 workspace root files exist", () => {
  for (const relPath of workspaceFiles) {
    expectPath(relPath);
  }

  const rootPackage = JSON.parse(
    fs.readFileSync(expectPath("package.json"), "utf8"),
  );
  assert.equal(rootPackage.name, rootPackageName);
});

test("workspace enables pnpm shell emulation for Windows-safe node scripts", () => {
  const npmrc = fs.readFileSync(expectPath(".npmrc"), "utf8");

  assert.match(npmrc, /(^|\r?\n)shell-emulator=true(\r?\n|$)/);
});

test("workspace exposes a desktop-first dev entry", () => {
  const rootPackage = JSON.parse(
    fs.readFileSync(expectPath("package.json"), "utf8"),
  );

  assert.equal(
    rootPackage.scripts?.lint,
    "node tools/scripts/run-quality-check.mjs",
  );
  assert.equal(
    rootPackage.scripts?.test,
    "node --test tests/workspace-structure.test.mjs tests/run-workspace-package-script.test.mjs tests/verify-terminal-runtime-script.test.mjs tests/verify-windows-release-script.test.mjs",
  );
  assert.equal(
    rootPackage.scripts?.dev,
    "node tools/scripts/run-tauri-dev.mjs",
  );
  assert.equal(
    rootPackage.scripts?.["tauri:dev"],
    "node tools/scripts/run-tauri-dev.mjs",
  );
  assert.equal(
    rootPackage.scripts?.["dev:web"],
    "node tools/scripts/run-workspace-package-script.mjs apps/web dev",
  );
  assert.equal(
    rootPackage.scripts?.build,
    "node tools/scripts/run-workspace-package-script.mjs apps/web build && node tools/scripts/run-workspace-package-script.mjs apps/desktop build",
  );
  assert.equal(
    rootPackage.scripts?.typecheck,
    "node tools/scripts/run-local-typescript.mjs -p apps/web/tsconfig.json --noEmit && node tools/scripts/run-local-typescript.mjs -p apps/desktop/tsconfig.json --noEmit",
  );
  assert.equal(
    rootPackage.scripts?.["smoke:windows-release-launch"],
    "node tools/smoke/windows-release-launch-probe.mjs --inspect-launch --assert-passed --startup-delay-ms 6000",
  );
  assert.equal(
    rootPackage.scripts?.["verify:terminal-runtime"],
    "node tools/scripts/verify-terminal-runtime.mjs",
  );
  assert.equal(
    rootPackage.scripts?.["verify:windows-release"],
    "node tools/scripts/verify-windows-release.mjs",
  );
});

test("frontend package directories and names follow the naming standard", () => {
  for (const [relPath, expectedName] of Object.entries(packageNames)) {
    const fullPath = expectPath(relPath);
    const content = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    assert.equal(content.name, expectedName);
  }
});

test("desktop package exposes vite host and tauri commands", () => {
  const desktopPackage = JSON.parse(
    fs.readFileSync(expectPath("apps/desktop/package.json"), "utf8"),
  );

  assert.equal(
    desktopPackage.scripts?.dev,
    "node ../../tools/scripts/run-vite-host.mjs serve --host 127.0.0.1 --port 1420 --strictPort",
  );
  assert.equal(
    desktopPackage.scripts?.["tauri:dev"],
    "node ../../tools/scripts/run-tauri-cli.mjs dev --config src-tauri/tauri.conf.json",
  );
  assert.equal(
    desktopPackage.scripts?.["tauri:build"],
    "node ../../tools/scripts/run-tauri-cli.mjs build --config src-tauri/tauri.release.conf.json",
  );
  assert.equal(
    desktopPackage.scripts?.["tauri:info"],
    "node ../../tools/scripts/run-tauri-cli.mjs info",
  );
  assert.equal(
    desktopPackage.scripts?.typecheck,
    "node ../../tools/scripts/run-local-typescript.mjs --noEmit",
  );
});

test("web package exposes a workspace-local TypeScript runner", () => {
  const webPackage = JSON.parse(
    fs.readFileSync(expectPath("apps/web/package.json"), "utf8"),
  );

  assert.equal(
    webPackage.scripts?.dev,
    "node ../../tools/scripts/run-vite-host.mjs --cwd apps/web serve --host 0.0.0.0 --port 4173",
  );
  assert.equal(
    webPackage.scripts?.build,
    "node ../../tools/scripts/run-vite-host.mjs --cwd apps/web build",
  );
  assert.equal(
    webPackage.scripts?.typecheck,
    "node ../../tools/scripts/run-local-typescript.mjs --noEmit",
  );
});

test("workspace provides a root-driven tauri cli helper", () => {
  expectPath("tools/scripts/run-quality-check.mjs");
  expectPath("tools/scripts/run-tauri-cli.mjs");
  expectPath("tools/scripts/run-tauri-dev.mjs");
  expectPath("tools/scripts/run-vite-host.mjs");
  expectPath("tools/scripts/run-local-typescript.mjs");
  expectPath("tools/scripts/run-workspace-package-script.mjs");
  expectPath("tools/scripts/verify-terminal-runtime.mjs");
  expectPath("tools/scripts/verify-windows-release.mjs");
  expectPath("tools/scripts/windows-desktop-host-locks.mjs");
});

test("tauri host config boots the desktop package vite host", () => {
  const tauriConfig = JSON.parse(
    fs.readFileSync(expectPath("src-tauri/tauri.conf.json"), "utf8"),
  );

  assert.equal(
    tauriConfig.build?.beforeDevCommand,
    "node tools/scripts/run-vite-host.mjs serve --host 127.0.0.1 --port 1420 --strictPort",
  );
  assert.equal(
    tauriConfig.build?.beforeBuildCommand,
    "node tools/scripts/run-vite-host.mjs build",
  );
  assert.equal(tauriConfig.build?.devUrl, "http://127.0.0.1:1420");
});

test("rust workspace crates are scaffolded", () => {
  for (const relPath of crateNames) {
    expectPath(relPath);
  }
});

test("tauri thin host skeleton exists", () => {
  for (const relPath of thinHostFiles) {
    expectPath(relPath);
  }
});

test("tauri thin host avoids lib and bin filename collisions", () => {
  const cargoToml = fs.readFileSync(expectPath("src-tauri/Cargo.toml"), "utf8");
  const mainSource = fs.readFileSync(expectPath("src-tauri/src/main.rs"), "utf8");

  assert.match(cargoToml, /\[lib\][\s\S]*name = "sdkwork_terminal_desktop_host_lib"/);
  assert.match(mainSource, /sdkwork_terminal_desktop_host_lib::run\(\);/);
});

test("delivery and tooling directories exist", () => {
  for (const relPath of deliveryDirs) {
    const fullPath = expectPath(relPath);
    assert.equal(fs.statSync(fullPath).isDirectory(), true);
  }
});

test("terminal shell package ships an integration README", () => {
  const readmePath = expectPath("packages/sdkwork-terminal-shell/README.md");
  const readme = fs.readFileSync(readmePath, "utf8");

  assert.match(readme, /ShellApp/);
  assert.match(readme, /DesktopRuntimeBridgeClient/);
  assert.match(readme, /terminal-first/i);
});

test("terminal shell package exports a stable barrel entrypoint", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(expectPath("packages/sdkwork-terminal-shell/package.json"), "utf8"),
  );
  const barrelPath = expectPath("packages/sdkwork-terminal-shell/src/index.ts");
  const barrelSource = fs.readFileSync(barrelPath, "utf8");

  assert.equal(packageJson.exports?.["."], "./src/index.ts");
  assert.match(barrelSource, /export \* from "\.\/index\.tsx";/);
});
