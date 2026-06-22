import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const probePath = path.join(rootDir, "tools", "smoke", "web-remote-runtime-smoke-probe.mjs");
const probeModuleUrl = pathToFileURL(probePath).href;
const smokeReadmePath = path.join(rootDir, "tools", "smoke", "README.md");
const legacyDesktopTauriManifest = /cargo check --manifest-path src-tauri\/Cargo\.toml/;

async function runProbe(args: string[]) {
  const { runWebRemoteRuntimeProbeCli } = await import(probeModuleUrl);
  let stdout = "";

  await runWebRemoteRuntimeProbeCli(args, {
    stdout: {
      write(value: string) {
        stdout += value;
      },
    },
  });

  return { stdout };
}

test("web remote-runtime smoke probe exposes CP07-5 automated evidence", async () => {
  const { stdout } = await runProbe(["--print-plan"]);
  const plan = JSON.parse(stdout);

  assert.equal(plan.kind, "web-remote-runtime-smoke-plan");
  assert.match(
    plan.automatedEvidence.join("\n"),
    /tests\/web-runtime-bridge\.test\.ts/,
  );
  assert.match(
    plan.automatedEvidence.join("\n"),
    /packages\/sdkwork-terminal-pc-desktop\/src-tauri\/Cargo\.toml/,
  );
  assert.match(
    plan.automatedEvidence.join("\n"),
    /crates\/sdkwork-terminal-runtime-node\/Cargo\.toml/,
  );
});

test("web remote-runtime smoke probe renders review template with topology keys", async () => {
  const { stdout } = await runProbe([
    "--review-template",
    "--platform",
    "ubuntu-server",
    "--runtime-target",
    "remote-runtime",
  ]);

  assert.match(stdout, /VITE_SDKWORK_TERMINAL_RUNTIME_AUTHORITY/);
  assert.match(stdout, /SDKWORK_RUNTIME_NODE_REQUIRE_AUTH/);
  assert.match(stdout, /shell-stream-resync/);
});

test("smoke contract paths avoid legacy src-tauri root references", async () => {
  const { DESKTOP_TAURI_MANIFEST } = await import(
    pathToFileURL(path.join(rootDir, "tools", "smoke", "smoke-contract.mjs")).href
  );
  const sessionRecovery = fs.readFileSync(
    path.join(rootDir, "tools", "smoke", "session-recovery-probe.mjs"),
    "utf8",
  );
  const connectorInteractive = fs.readFileSync(
    path.join(rootDir, "tools", "smoke", "connector-interactive-probe.mjs"),
    "utf8",
  );
  const workspaceSmoke = fs.readFileSync(
    path.join(rootDir, "tools", "smoke", "workspace-smoke.ps1"),
    "utf8",
  );

  assert.doesNotMatch(sessionRecovery, legacyDesktopTauriManifest);
  assert.doesNotMatch(connectorInteractive, legacyDesktopTauriManifest);
  assert.doesNotMatch(workspaceSmoke, legacyDesktopTauriManifest);
  assert.match(sessionRecovery, /DESKTOP_TAURI_MANIFEST/);
  assert.match(connectorInteractive, /DESKTOP_TAURI_MANIFEST/);
  assert.match(workspaceSmoke, new RegExp(DESKTOP_TAURI_MANIFEST.replace(/\//g, "\\/")));
});

test("web remote-runtime smoke entrypoint is documented", () => {
  const source = fs.readFileSync(smokeReadmePath, "utf8");

  assert.match(source, /web-remote-runtime-smoke-probe\.mjs/);
  assert.match(source, /CP07-5/i);
});
