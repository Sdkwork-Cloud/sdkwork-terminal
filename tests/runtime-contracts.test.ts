import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTRACT_VERSION,
  buildRuntimeContractSnapshot,
} from "../packages/sdkwork-terminal-contracts/src/index.ts";
import {
  createRuntimeBridge,
  createSurfacePath,
} from "../packages/sdkwork-terminal-infrastructure/src/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(
  __dirname,
  "fixtures",
  "runtime-contract.snapshot.json",
);

function readFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

test("contracts expose the frozen v1 runtime snapshot", () => {
  const fixture = readFixture();

  assert.equal(CONTRACT_VERSION, fixture.version);
  assert.deepEqual(buildRuntimeContractSnapshot(), fixture);
});

test("contracts expose connector-backed session launch request fields", () => {
  const snapshot = buildRuntimeContractSnapshot() as Record<string, unknown>;

  assert.deepEqual(snapshot.connectorSessionLaunchRequestFields, [
    "workspaceId",
    "target",
    "authority",
    "command",
    "modeTags",
    "tags",
  ]);
});

test("contracts expose session descriptor tags for session truth and recovery", () => {
  const snapshot = buildRuntimeContractSnapshot() as Record<string, unknown>;

  assert.deepEqual(snapshot.sessionDescriptorFields, [
    "sessionId",
    "workspaceId",
    "target",
    "state",
    "createdAt",
    "lastActiveAt",
    "modeTags",
    "tags",
  ]);
});

test("infrastructure resolves stable endpoint paths from shared contracts", () => {
  assert.equal(
    createSurfacePath("publicApi", "sessions"),
    "/terminal/api/v1/sessions",
  );
  assert.equal(
    createSurfacePath("manageApi", "runtime-nodes"),
    "/terminal/manage/v1/runtime-nodes",
  );
  assert.equal(
    createSurfacePath("runtimeStream", "attach"),
    "/terminal/stream/v1/attach",
  );
});

test("desktop and web runtime bridge descriptors stay on the approved channels", () => {
  const desktopBridge = createRuntimeBridge("desktop");
  const webBridge = createRuntimeBridge("web");

  assert.equal(desktopBridge.contractVersion, "v1");
  assert.equal(desktopBridge.controlPlane.kind, "tauri-ipc");
  assert.equal(desktopBridge.dataPlane.namespace, "sdkwork-terminal.runtime.v1");

  assert.equal(webBridge.controlPlane.kind, "http");
  assert.equal(webBridge.dataPlane.prefix, "/terminal/stream/v1");
});
