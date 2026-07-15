import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BROWSER_REMOTE_CONTROL_PLANE_UNAVAILABLE_DIAGNOSTIC,
  LEGACY_BROWSER_RUNTIME_CONFIGURATION_BLOCKED_DIAGNOSTIC,
  createWebRuntimeTargetFromEnvironment,
  resolveWebRuntimeTargetFromEnvironment,
} from "../packages/sdkwork-terminal-pc-shell/src/web-runtime-config.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("web runtime configuration fails closed until the approved control plane is available", () => {
  const resolution = resolveWebRuntimeTargetFromEnvironment({});

  assert.deepEqual(resolution, {
    diagnostic: BROWSER_REMOTE_CONTROL_PLANE_UNAVAILABLE_DIAGNOSTIC,
  });
  assert.equal(resolution.target, undefined);
  assert.equal(createWebRuntimeTargetFromEnvironment({}), undefined);
});

test("web runtime configuration blocks every legacy Vite terminal runtime key", () => {
  const legacyEntries = [
    ["VITE_SDKWORK_TERMINAL_RUNTIME_WORKSPACE_ID", "workspace-terminal"],
    ["VITE_SDKWORK_TERMINAL_RUNTIME_AUTHORITY", "runtime-node-primary"],
    ["VITE_SDKWORK_TERMINAL_RUNTIME_TARGET", "server-runtime-node"],
    ["VITE_SDKWORK_TERMINAL_RUNTIME_WORKING_DIRECTORY", "/srv/workspace"],
    ["VITE_TERMINAL_RUNTIME_WORKSPACE_ID", "workspace-terminal"],
    ["VITE_TERMINAL_RUNTIME_AUTHORITY", "runtime-node-primary"],
    ["VITE_TERMINAL_RUNTIME_TARGET", "remote-runtime"],
    ["VITE_TERMINAL_RUNTIME_WORKING_DIRECTORY", "/srv/workspace"],
    ["VITE_EXPERIMENTAL_TERMINAL_RUNTIME_PROXY", "enabled"],
  ] as const;

  for (const [key, value] of legacyEntries) {
    const resolution = resolveWebRuntimeTargetFromEnvironment({ [key]: value });

    assert.equal(resolution.target, undefined, key);
    assert.equal(
      resolution.diagnostic,
      LEGACY_BROWSER_RUNTIME_CONFIGURATION_BLOCKED_DIAGNOSTIC,
      key,
    );
    assert.equal(createWebRuntimeTargetFromEnvironment({ [key]: value }), undefined, key);
  }
});

test("web shell selects the unavailable stage when a Browser runtime client is absent", () => {
  const shellSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-pc-shell", "src", "index.tsx"),
    "utf8",
  );
  const unavailableStageSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-shell",
      "src",
      "web-runtime-unavailable-stage.tsx",
    ),
    "utf8",
  );

  assert.match(
    shellSource,
    /props\.mode === "web"\s*&&\s*\(!props\.webRuntimeTarget \|\| !props\.webRuntimeClient\)/,
  );
  assert.match(shellSource, /<WebRuntimeUnavailableStage/);
  assert.match(unavailableStageSource, /data-slot="web-runtime-unavailable"/);
  assert.match(
    unavailableStageSource,
    /props\.messages \?\? webRuntimeUnavailableMessagesEnUS/,
  );
  assert.match(unavailableStageSource, /<h1 style=\{unavailableTitleStyle\}>\{messages\.title\}<\/h1>/);
});
