import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BROWSER_TERMINAL_APP_API_READY_DIAGNOSTIC,
  LEGACY_BROWSER_RUNTIME_CONFIGURATION_IGNORED_DIAGNOSTIC,
  createWebRuntimeTargetFromEnvironment,
  resolveWebRuntimeTargetFromEnvironment,
} from "../packages/sdkwork-terminal-pc-shell/src/web-runtime-config.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("web runtime configuration resolves the authenticated Terminal App API target", () => {
  const resolution = resolveWebRuntimeTargetFromEnvironment({});

  assert.deepEqual(resolution, {
    target: {
      workspaceId: "sdkwork-terminal-browser",
      authority: "terminal-application-ingress",
      target: "server-runtime-node",
      modeTags: ["cli-native"],
      tags: ["surface:browser"],
    },
    diagnostic: BROWSER_TERMINAL_APP_API_READY_DIAGNOSTIC,
  });
  assert.deepEqual(createWebRuntimeTargetFromEnvironment({}), resolution.target);
});

test("web runtime configuration ignores every legacy Vite terminal runtime key", () => {
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

    assert.equal(resolution.target?.target, "server-runtime-node", key);
    assert.equal(resolution.target?.authority, "terminal-application-ingress", key);
    assert.equal(
      resolution.diagnostic,
      LEGACY_BROWSER_RUNTIME_CONFIGURATION_IGNORED_DIAGNOSTIC,
      key,
    );
    assert.deepEqual(createWebRuntimeTargetFromEnvironment({ [key]: value }), resolution.target, key);
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
