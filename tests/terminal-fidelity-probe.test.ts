import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const probePath = path.join(rootDir, "tools", "smoke", "terminal-fidelity-probe.mjs");
const smokeReadmePath = path.join(rootDir, "tools", "smoke", "README.md");

test("terminal fidelity probe exposes a real VT smoke plan", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildTerminalFidelityProbePlan, "function");

  const plan = module.buildTerminalFidelityProbePlan();
  assert.equal(plan.title, "sdkwork terminal fidelity probe");
  assert.match(plan.titleSequence, /\u001b\]0;sdkwork terminal fidelity probe/i);
  assert.equal(plan.alternateScreen.enter, "\u001b[?1049h");
  assert.equal(plan.alternateScreen.exit, "\u001b[?1049l");
  assert.equal(plan.bracketedPaste.enable, "\u001b[?2004h");
  assert.equal(plan.bracketedPaste.disable, "\u001b[?2004l");
  assert.match(plan.mouseReporting.enable, /\u001b\[\?1000h/);
  assert.match(plan.mouseReporting.enable, /\u001b\[\?1006h/);
  assert.match(plan.cjkSample, /中文/);
});

test("terminal fidelity probe can classify bracketed paste and mouse reporting input", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.analyzeTerminalFidelityInput, "function");

  const analysis = module.analyzeTerminalFidelityInput(
    "\u001b[200~hello sdkwork\u001b[201~\u001b[<0;12;8M\u001b[<0;12;8m",
  );

  assert.equal(analysis.bracketedPaste.startCount, 1);
  assert.equal(analysis.bracketedPaste.endCount, 1);
  assert.equal(analysis.mouseReports.length, 2);
  assert.match(analysis.printablePreview, /hello sdkwork/);
});

test("terminal fidelity probe can generate a structured platform smoke report template", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildTerminalFidelityReportTemplate, "function");

  const report = module.buildTerminalFidelityReportTemplate({
    platform: "windows",
    shell: "powershell",
  });

  assert.equal(report.kind, "terminal-fidelity-smoke-report");
  assert.equal(report.platform, "windows");
  assert.equal(report.shell, "powershell");
  assert.equal(report.checks.length >= 7, true);
  assert.equal(report.checks.some((check) => check.id === "osc-title"), true);
  assert.equal(report.checks.some((check) => check.id === "alternate-screen"), true);
  assert.equal(report.checks.some((check) => check.id === "mouse-reporting"), true);
  assert.equal(report.checks.some((check) => check.id === "ime-input"), true);
  assert.equal(report.checks.every((check) => check.status === "pending"), true);
});

test("terminal fidelity probe CLI can print a report template", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const result = await execFileAsync(process.execPath, [
    probePath,
    "--report-template",
    "--platform",
    "ubuntu",
    "--shell",
    "bash",
  ], {
    cwd: rootDir,
  });

  const report = JSON.parse(result.stdout);
  assert.equal(report.kind, "terminal-fidelity-smoke-report");
  assert.equal(report.platform, "ubuntu");
  assert.equal(report.shell, "bash");
  assert.equal(Array.isArray(report.commands), true);
  assert.equal(report.commands.includes("node tools/smoke/terminal-fidelity-probe.mjs"), true);
});

test("terminal fidelity probe can generate a markdown review template", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildTerminalFidelityReviewTemplate, "function");

  const markdown = module.buildTerminalFidelityReviewTemplate({
    platform: "windows",
    shell: "powershell",
  });

  assert.match(markdown, /# Terminal Fidelity Smoke Review/i);
  assert.match(markdown, /Platform: `windows`/);
  assert.match(markdown, /Shell: `powershell`/);
  assert.match(markdown, /OSC title/i);
  assert.match(markdown, /alternate screen/i);
  assert.match(markdown, /mouse-reporting/i);
  assert.match(markdown, /powershell -ExecutionPolicy Bypass -File tools\/smoke\/terminal-fidelity-probe\.ps1/);
});

test("terminal fidelity probe CLI can print a markdown review template", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  const result = await execFileAsync(process.execPath, [
    probePath,
    "--review-template",
    "--platform",
    "macos",
    "--shell",
    "zsh",
  ], {
    cwd: rootDir,
  });

  assert.match(result.stdout, /Platform: `macos`/);
  assert.match(result.stdout, /Shell: `zsh`/);
  assert.match(result.stdout, /node tools\/smoke\/terminal-fidelity-probe\.mjs/);
});

test("smoke readme documents the terminal fidelity probe entrypoint", () => {
  const source = fs.readFileSync(smokeReadmePath, "utf8");

  assert.match(source, /terminal-fidelity-probe\.mjs/);
  assert.match(source, /report-template/i);
  assert.match(source, /review-template/i);
  assert.match(source, /alternate screen/i);
  assert.match(source, /mouse-reporting/i);
  assert.match(source, /OSC/i);
});
