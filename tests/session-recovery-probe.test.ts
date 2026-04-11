import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const probePath = path.join(rootDir, "tools", "smoke", "session-recovery-probe.mjs");
const probePs1Path = path.join(rootDir, "tools", "smoke", "session-recovery-probe.ps1");
const smokeReadmePath = path.join(rootDir, "tools", "smoke", "README.md");

test("session recovery probe exposes a cross-platform recovery smoke matrix", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildSessionRecoverySmokePlan, "function");

  const plan = module.buildSessionRecoverySmokePlan();
  assert.equal(plan.kind, "session-recovery-smoke-plan");
  assert.equal(plan.platforms.length, 4);
  assert.equal(plan.platforms.some((item: { id: string }) => item.id === "windows-desktop"), true);
  assert.equal(plan.platforms.some((item: { id: string }) => item.id === "ubuntu-desktop"), true);
  assert.equal(plan.platforms.some((item: { id: string }) => item.id === "macos-desktop"), true);
  assert.equal(plan.platforms.some((item: { id: string }) => item.id === "ubuntu-server"), true);
  assert.equal(
    plan.checkpoints.some((item: { id: string }) => item.id === "cp06-5-platform-recovery-matrix"),
    true,
  );
  assert.equal(
    plan.automatedEvidence.includes(
      "cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture",
    ),
    true,
  );
});

test("session recovery probe can generate a structured smoke report template", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildSessionRecoveryReportTemplate, "function");

  const report = module.buildSessionRecoveryReportTemplate({
    platform: "ubuntu-server",
    hostMode: "server",
    cpuArch: "x64",
  });

  assert.equal(report.kind, "session-recovery-smoke-report");
  assert.equal(report.platform, "ubuntu-server");
  assert.equal(report.hostMode, "server");
  assert.equal(report.cpuArch, "x64");
  assert.match(report.storageSurface, /session-runtime\.sqlite3/i);
  assert.equal(report.checks.length >= 5, true);
  assert.equal(report.checks.some((check: { id: string }) => check.id === "persisted-index"), true);
  assert.equal(report.checks.some((check: { id: string }) => check.id === "replay-recovery"), true);
  assert.equal(report.checks.some((check: { id: string }) => check.id === "reattach-or-recover"), true);
  assert.equal(report.checks.every((check: { status: string }) => check.status === "pending"), true);
  assert.equal(
    report.commands.includes(
      "cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture",
    ),
    true,
  );
});

test("session recovery probe CLI can print a report template", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const result = await execFileAsync(process.execPath, [
    probePath,
    "--report-template",
    "--platform",
    "windows-desktop",
    "--host-mode",
    "desktop",
    "--cpu-arch",
    "x64",
  ], {
    cwd: rootDir,
  });

  const report = JSON.parse(result.stdout);
  assert.equal(report.kind, "session-recovery-smoke-report");
  assert.equal(report.platform, "windows-desktop");
  assert.equal(report.hostMode, "desktop");
  assert.equal(report.commands.includes("cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture"), true);
});

test("session recovery probe can generate a markdown review template", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildSessionRecoveryReviewTemplate, "function");

  const markdown = module.buildSessionRecoveryReviewTemplate({
    platform: "macos-desktop",
    hostMode: "desktop",
    cpuArch: "arm64",
  });

  assert.match(markdown, /# Session Recovery Smoke Review/i);
  assert.match(markdown, /Platform: `macos-desktop`/);
  assert.match(markdown, /Host mode: `desktop`/);
  assert.match(markdown, /CPU arch: `arm64`/);
  assert.match(markdown, /persisted index/i);
  assert.match(markdown, /replay recovery/i);
  assert.match(markdown, /session-runtime\.sqlite3/i);
});

test("session recovery probe CLI can print a markdown review template", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const result = await execFileAsync(process.execPath, [
    probePath,
    "--review-template",
    "--platform",
    "ubuntu-desktop",
    "--host-mode",
    "desktop",
    "--cpu-arch",
    "x64",
  ], {
    cwd: rootDir,
  });

  assert.match(result.stdout, /Platform: `ubuntu-desktop`/);
  assert.match(result.stdout, /Host mode: `desktop`/);
  assert.match(result.stdout, /CPU arch: `x64`/);
  assert.match(result.stdout, /node tools\/smoke\/session-recovery-probe\.mjs/);
});

test("session recovery smoke entrypoints are documented", () => {
  assert.equal(fs.existsSync(probePs1Path), true);
  const source = fs.readFileSync(smokeReadmePath, "utf8");

  assert.match(source, /session-recovery-probe\.mjs/);
  assert.match(source, /session-recovery-probe\.ps1/);
  assert.match(source, /report-template/i);
  assert.match(source, /review-template/i);
  assert.match(source, /ubuntu-server/i);
  assert.match(source, /session-runtime\.sqlite3/i);
});
