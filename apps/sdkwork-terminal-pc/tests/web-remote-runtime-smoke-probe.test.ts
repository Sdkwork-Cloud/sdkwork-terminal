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

test("Browser remote terminal smoke probe records the protected App API lifecycle", async () => {
  const { stdout } = await runProbe(["--print-plan"]);
  const plan = JSON.parse(stdout);

  assert.equal(plan.kind, "browser-terminal-app-api-smoke-plan");
  assert.match(
    plan.automatedEvidence.join("\n"),
    /sdkwork-routes-terminal-app-api/,
  );
  assert.match(
    plan.constraints.join("\n"),
    /Browser ignores legacy VITE_\*TERMINAL_RUNTIME\* configuration/,
  );
  assert.match(
    plan.constraints.join("\n"),
    /\/app\/v3\/api\/device\/terminal/,
  );
  assert.deepEqual(plan.runtimeTargets, ["server-runtime-node"]);
});

test("Browser remote terminal smoke probe does not generate legacy topology-key review instructions", async () => {
  const { stdout } = await runProbe([
    "--review-template",
    "--platform",
    "ubuntu-server",
  ]);

  assert.match(stdout, /Browser terminal status: `ready-for-smoke`/);
  assert.match(stdout, /protected Terminal App API/);
  assert.match(stdout, /\/terminal\/api\/v1/);
  assert.doesNotMatch(stdout, /VITE_SDKWORK_TERMINAL_RUNTIME_/);
  assert.doesNotMatch(stdout, /SDKWORK_RUNTIME_NODE_REQUIRE_AUTH/);
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

test("Browser Terminal App API smoke workflow is documented", () => {
  const source = fs.readFileSync(smokeReadmePath, "utf8");

  assert.match(source, /web-remote-runtime-smoke-probe\.mjs/);
  assert.match(source, /Terminal App API/i);
  assert.match(source, /private-worker/i);
});
