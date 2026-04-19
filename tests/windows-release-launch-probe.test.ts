import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const probePath = path.join(rootDir, "tools", "smoke", "windows-release-launch-probe.mjs");

test("windows release launch probe exposes a Windows release launch smoke plan", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildWindowsReleaseLaunchProbePlan, "function");

  const plan = module.buildWindowsReleaseLaunchProbePlan();
  assert.equal(plan.kind, "windows-release-launch-smoke-plan");
  assert.equal(plan.platform, "windows");
  assert.match(plan.title, /windows release launch probe/i);
  assert.equal(plan.checks.some((check) => check.id === "gui-subsystem"), true);
  assert.equal(plan.checks.some((check) => check.id === "no-external-terminal-window"), true);
  assert.equal(plan.checks.some((check) => check.id === "headless-conhost"), true);
});

test("windows release launch probe can generate a structured report template", async () => {
  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildWindowsReleaseLaunchReportTemplate, "function");

  const report = module.buildWindowsReleaseLaunchReportTemplate({
    target: "x86_64-pc-windows-msvc",
    startupDelayMs: 4500,
  });

  assert.equal(report.kind, "windows-release-launch-smoke-report");
  assert.equal(report.platform, "windows");
  assert.equal(report.startupDelayMs, 4500);
  assert.equal(report.target, "x86_64-pc-windows-msvc");
  assert.equal(Array.isArray(report.commands), true);
  assert.equal(report.commands.includes("pnpm tauri:build"), true);
  assert.equal(
    report.commands.some((command) => command.includes("pnpm smoke:windows-release-launch")),
    true,
  );
  assert.equal(report.checks.every((check) => check.status === "pending"), true);
});

test("windows release launch probe can generate a markdown review template", async () => {
  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildWindowsReleaseLaunchReviewTemplate, "function");

  const markdown = module.buildWindowsReleaseLaunchReviewTemplate({
    target: "x86_64-pc-windows-msvc",
  });

  assert.match(markdown, /# Windows Release Launch Review/i);
  assert.match(markdown, /Target: `x86_64-pc-windows-msvc`/i);
  assert.match(markdown, /gui-subsystem/i);
  assert.match(markdown, /no-external-terminal-window/i);
  assert.match(markdown, /headless-conhost/i);
});

test("windows release launch probe resolves workspace-root target executables", async () => {
  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.resolveWindowsReleaseExecutablePath, "function");

  const workspaceRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "sdkwork-terminal-release-launch-probe-"),
  );
  const executablePath = path.join(
    workspaceRoot,
    "target",
    "x86_64-pc-windows-msvc",
    "release",
    "sdkwork-terminal-desktop-host.exe",
  );
  fs.mkdirSync(path.dirname(executablePath), { recursive: true });
  fs.writeFileSync(executablePath, "binary", "utf8");

  const resolved = module.resolveWindowsReleaseExecutablePath(
    { target: "x86_64-pc-windows-msvc" },
    workspaceRoot,
  );

  assert.equal(resolved, executablePath);
});

test("windows release launch probe can fail fast on failed checks", async () => {
  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.assertWindowsReleaseLaunchChecksPassed, "function");

  assert.throws(() =>
    module.assertWindowsReleaseLaunchChecksPassed({
      checks: [
        {
          id: "gui-subsystem",
          label: "release desktop host uses the Windows GUI subsystem",
          status: "failed",
          detail: "Unexpected PE subsystem 3.",
        },
      ],
    }),
  );
});

test("windows release launch probe can parse the Windows GUI subsystem from a PE buffer", async () => {
  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.readWindowsPortableExecutableSubsystem, "function");

  const buffer = Buffer.alloc(0x200);
  buffer.writeUInt32LE(0x80, 0x3c);
  buffer.writeUInt16LE(2, 0x80 + 0x5c);

  assert.equal(module.readWindowsPortableExecutableSubsystem(buffer), 2);
});

test("windows release launch probe CLI can print a report template", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const result = await execFileAsync(process.execPath, [
    probePath,
    "--report-template",
    "--target",
    "x86_64-pc-windows-msvc",
    "--startup-delay-ms",
    "5000",
  ], {
    cwd: rootDir,
  });

  const report = JSON.parse(result.stdout);
  assert.equal(report.kind, "windows-release-launch-smoke-report");
  assert.equal(report.target, "x86_64-pc-windows-msvc");
  assert.equal(report.startupDelayMs, 5000);
});

test("windows release launch probe CLI can print a markdown review template", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const result = await execFileAsync(process.execPath, [
    probePath,
    "--review-template",
    "--target",
    "x86_64-pc-windows-msvc",
  ], {
    cwd: rootDir,
  });

  assert.match(result.stdout, /Windows Release Launch Review/);
  assert.match(result.stdout, /GUI subsystem/i);
  assert.match(result.stdout, /Windows Terminal/i);
});

test("smoke README documents the Windows release launch probe", () => {
  const smokeReadme = fs.readFileSync(
    path.join(rootDir, "tools", "smoke", "README.md"),
    "utf8",
  );

  assert.match(smokeReadme, /windows-release-launch-probe\.mjs/i);
  assert.match(smokeReadme, /pnpm smoke:windows-release-launch/i);
  assert.match(smokeReadme, /--inspect-launch/i);
  assert.match(smokeReadme, /--assert-passed/i);
});
