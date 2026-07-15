import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  REMOTE_TERMINAL_CONTROL_PLANE_OPERATIONS,
  REMOTE_TERMINAL_FORBIDDEN_SESSION_CREATE_REQUEST_FIELDS,
  REMOTE_TERMINAL_SESSION_CREATE_REQUEST_FIELDS,
  type RemoteTerminalCommandProfileId,
  type RemoteTerminalSessionCreatePort,
  type RemoteTerminalSessionCreateRequest,
  type RemoteTerminalShellProfileId,
  type RemoteTerminalTargetId,
  type RemoteTerminalWorkspaceRootId,
} from "../packages/sdkwork-terminal-pc-contracts/src/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const remoteTerminalContractPath = path.join(
  __dirname,
  "..",
  "packages",
  "sdkwork-terminal-pc-contracts",
  "src",
  "remote-terminal.ts",
);

function readRemoteTerminalCreateRequestFields() {
  const source = fs.readFileSync(remoteTerminalContractPath, "utf8");
  const match = source.match(
    /export interface RemoteTerminalSessionCreateRequest \{([\s\S]*?)\n\}/u,
  );

  assert.ok(match, "RemoteTerminalSessionCreateRequest must remain an exported interface");

  return [...match[1].matchAll(/^\s*(?:readonly\s+)?([A-Za-z][A-Za-z0-9]*)\??:/gmu)]
    .map((field) => field[1]);
}

function assertCreatePortRejectsForbiddenFields(port: RemoteTerminalSessionCreatePort) {
  const requestWithForbiddenAuthority = {
    targetId: "target-ops" as RemoteTerminalTargetId,
    viewport: {
      cols: 132,
      rows: 36,
    },
    authority: "must-not-be-client-controlled",
  };

  // @ts-expect-error Remote terminal creation accepts only catalog identifiers and viewport data.
  void port.createSession(requestWithForbiddenAuthority);
}

void assertCreatePortRejectsForbiddenFields;

test("remote terminal session creation accepts only approved opaque selections", () => {
  const request = {
    targetId: "target-ops" as RemoteTerminalTargetId,
    shellProfileId: "shell-restricted" as RemoteTerminalShellProfileId,
    commandProfileId: "command-read-only" as RemoteTerminalCommandProfileId,
    workspaceRootId: "workspace-root-project" as RemoteTerminalWorkspaceRootId,
    viewport: {
      cols: 132,
      rows: 36,
    },
    idempotencyKey: "session-create-0001",
  } satisfies RemoteTerminalSessionCreateRequest;

  assert.deepEqual(
    Object.keys(request),
    REMOTE_TERMINAL_SESSION_CREATE_REQUEST_FIELDS,
  );
  assert.deepEqual(readRemoteTerminalCreateRequestFields(), [
    ...REMOTE_TERMINAL_SESSION_CREATE_REQUEST_FIELDS,
  ]);
  assert.equal(
    REMOTE_TERMINAL_FORBIDDEN_SESSION_CREATE_REQUEST_FIELDS.some((field) =>
      REMOTE_TERMINAL_SESSION_CREATE_REQUEST_FIELDS.includes(
        field as (typeof REMOTE_TERMINAL_SESSION_CREATE_REQUEST_FIELDS)[number],
      ),
    ),
    false,
  );
});

test("remote terminal contract defines the complete narrow control-plane port", () => {
  assert.deepEqual(REMOTE_TERMINAL_CONTROL_PLANE_OPERATIONS, [
    "listTargets",
    "createSession",
    "attachSession",
    "replaySession",
    "writeSessionInput",
    "resizeSession",
    "detachSession",
    "terminateSession",
  ]);

  const source = fs.readFileSync(remoteTerminalContractPath, "utf8");
  for (const operation of REMOTE_TERMINAL_CONTROL_PLANE_OPERATIONS) {
    assert.match(source, new RegExp(`\\b${operation}\\s*(?:<[^>]+>)?\\(`, "u"));
  }
});

test("remote terminal contract remains transport-free and independent from legacy runtime code", () => {
  const source = fs.readFileSync(remoteTerminalContractPath, "utf8");

  assert.doesNotMatch(source, /^import\s/mu);
  assert.doesNotMatch(source, /\b(?:fetch|axios|XMLHttpRequest|WebSocket|EventSource)\b/u);
  assert.doesNotMatch(source, /runtime-node/u);
});
