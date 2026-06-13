#!/usr/bin/env node

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const PLATFORM = process.argv.includes("--platform")
  ? process.argv[process.argv.indexOf("--platform") + 1]
  : detectPlatform();

const CLI_KINDS = ["codex", "claude-code", "gemini", "opencode"];

function detectPlatform() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "macos";
  return "ubuntu-desktop";
}

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", timeout: 10000 }).trim();
  } catch {
    return null;
  }
}

function discoverCli(kind) {
  const binaryName = kind === "claude-code" ? "claude" : kind;
  const whichCmd = process.platform === "win32"
    ? `powershell -NoProfile -Command "(Get-Command ${binaryName} -ErrorAction SilentlyContinue).Source"`
    : `which ${binaryName}`;

  const binaryPath = runCommand(whichCmd);
  const found = !!binaryPath;

  let version = null;
  if (found) {
    version = runCommand(`${binaryPath} --version`);
  }

  const envKeys = {
    codex: ["OPENAI_API_KEY"],
    "claude-code": ["ANTHROPIC_API_KEY"],
    gemini: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
    opencode: ["OPENAI_API_KEY"],
  };

  const authEnvKey = envKeys[kind]?.find((key) => process.env[key]?.trim());
  const authenticated = !!authEnvKey;

  return {
    cliKind: kind,
    found,
    binaryPath: binaryPath || null,
    version: version || null,
    authState: {
      authenticated,
      summary: authenticated ? `${authEnvKey} is set` : "no authentication env var found",
      details: authenticated ? `${authEnvKey}=<redacted>` : `checked: ${envKeys[kind]?.join(", ")}`,
    },
    platformFamily: PLATFORM,
    checkedAt: new Date().toISOString(),
  };
}

function generateReport(discoveries) {
  const lines = [
    `# AI CLI Native Host Smoke Report`,
    ``,
    `## Platform`,
    ``,
    `- Family: ${PLATFORM}`,
    `- Arch: ${process.arch}`,
    `- Node: ${process.version}`,
    `- Checked: ${new Date().toISOString()}`,
    ``,
    `## Discovery Results`,
    ``,
    `| CLI | Found | Version | Authenticated | Binary Path |`,
    `|-----|-------|---------|---------------|-------------|`,
  ];

  for (const d of discoveries) {
    lines.push(
      `| ${d.cliKind} | ${d.found ? "Yes" : "No"} | ${d.version ?? "N/A"} | ${d.authState.authenticated ? "Yes" : "No"} | ${d.binaryPath ?? "N/A"} |`
    );
  }

  lines.push(``, `## Checklist`, ``);
  lines.push(`- [${discoveries.some((d) => d.found) ? "x" : " "}] At least one CLI discovered`);
  lines.push(`- [${discoveries.some((d) => d.authState.authenticated) ? "x" : " "}] At least one CLI authenticated`);
  lines.push(`- [ ] CLI launch smoke passed (requires manual verification)`);
  lines.push(`- [ ] CLI session recovery passed (requires manual verification)`);

  lines.push(``, `## Review Notes`, ``, `<!-- Add review notes here -->`);

  return lines.join("\n");
}

function generateReviewTemplate(discoveries) {
  const lines = [
    `# AI CLI Native Host Smoke Review`,
    ``,
    `## Platform: ${PLATFORM}`,
    ``,
    `## Commands`,
    ``,
    "```bash",
    `node tools/smoke/ai-cli-discovery-probe.mjs --platform ${PLATFORM}`,
    `node tools/smoke/ai-cli-discovery-probe.mjs --platform ${PLATFORM} --write-report --output-dir tmp/ai-cli-smoke`,
    "```",
    ``,
    `## Checklist`,
    ``,
    `- [ ] CLI discovery returns structured results`,
    `- [ ] Version detection works for discovered CLIs`,
    `- [ ] Auth state detection works correctly`,
    `- [ ] CLI launch creates a valid session`,
    `- [ ] CLI session integrates with Session Center`,
    `- [ ] CLI session recovery works after restart`,
    ``,
    `## Review Notes`, ``,
    `<!-- Add review notes here -->`,
  ];

  return lines.join("\n");
}

// Main
const discoveries = CLI_KINDS.map(discoverCli);

if (process.argv.includes("--print-plan")) {
  console.log(JSON.stringify({ platform: PLATFORM, discoveries }, null, 2));
  process.exit(0);
}

if (process.argv.includes("--write-report")) {
  const outputDir = process.argv.includes("--output-dir")
    ? process.argv[process.argv.indexOf("--output-dir") + 1]
    : "tmp/ai-cli-smoke";

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = join(outputDir, `ai-cli-smoke-${PLATFORM}.md`);
  writeFileSync(reportPath, generateReport(discoveries));
  console.log(`Report written to: ${reportPath}`);

  const reviewPath = join(outputDir, `ai-cli-review-${PLATFORM}.md`);
  writeFileSync(reviewPath, generateReviewTemplate(discoveries));
  console.log(`Review template written to: ${reviewPath}`);

  process.exit(0);
}

// Default: print summary
console.log(`AI CLI Discovery Summary (${PLATFORM}):`);
console.log("─".repeat(50));
for (const d of discoveries) {
  const status = d.found ? "✓" : "✗";
  const auth = d.authState.authenticated ? "🔐" : "🔓";
  console.log(`  ${status} ${d.cliKind.padEnd(15)} ${auth} ${d.version ?? "not found"}`);
}
console.log("─".repeat(50));
console.log(`Found: ${discoveries.filter((d) => d.found).length}/${discoveries.length}`);
console.log(`Authenticated: ${discoveries.filter((d) => d.authState.authenticated).length}/${discoveries.length}`);
