import test from "node:test";
import assert from "node:assert/strict";

import {
  canReattachDesktopSession,
  createDesktopSessionReattachIntent,
} from "../apps/desktop/src/session-center-shell.ts";

test("desktop session center exposes reattach for detached local and connector sessions with a live desktop path", () => {
  assert.equal(
    canReattachDesktopSession({
      sessionId: "session-0001",
      workspaceId: "workspace-demo",
      target: "local-shell",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "reattach-required",
      lastAckSequence: 8,
    }),
    true,
  );

  assert.equal(
    canReattachDesktopSession({
      sessionId: "session-0002",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "reattach-required",
      lastAckSequence: 8,
    }),
    true,
  );

  assert.equal(
    canReattachDesktopSession({
      sessionId: "session-0002a",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "reattach-required",
      lastAckSequence: 8,
    }),
    true,
  );

  assert.equal(
    canReattachDesktopSession({
      sessionId: "session-0002b",
      workspaceId: "workspace-demo",
      target: "kubernetes-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "reattach-required",
      lastAckSequence: 8,
    }),
    true,
  );

  assert.equal(
    canReattachDesktopSession({
      sessionId: "session-0002c",
      workspaceId: "workspace-demo",
      target: "remote-runtime",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "reattach-required",
      lastAckSequence: 8,
    }),
    false,
  );

  assert.equal(
    canReattachDesktopSession({
      sessionId: "session-0003",
      workspaceId: "workspace-demo",
      target: "local-shell",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 8,
    }),
    false,
  );

  assert.equal(
    canReattachDesktopSession({
      sessionId: "session-0004",
      workspaceId: "workspace-demo",
      target: "local-shell",
      state: "Exited",
      tags: ["cli-native"],
      attachmentState: "reattach-required",
      lastAckSequence: 8,
    }),
    false,
  );
});

test("desktop session reattach intent maps runtime session metadata into shell tab intent", () => {
  const intent = createDesktopSessionReattachIntent(
    {
      session: {
        sessionId: "session-0005",
        workspaceId: "workspace-demo",
        target: "local-shell",
        state: "Running",
        createdAt: "2026-04-10T08:00:00.000Z",
        lastActiveAt: "2026-04-10T08:00:20.000Z",
        modeTags: ["cli-native"],
        tags: ["profile:powershell"],
      },
      attachment: {
        attachmentId: "attachment-0005",
        sessionId: "session-0005",
        cursor: "18",
        lastAckSequence: 18,
        writable: true,
      },
    },
    {
      requestId: "reattach-0005",
    },
  );

  assert.deepEqual(intent, {
    requestId: "reattach-0005",
    sessionId: "session-0005",
    attachmentId: "attachment-0005",
    cursor: "18",
    profile: "powershell",
    title: "PowerShell",
    targetLabel: "reattach / local-shell",
  });
});

test("desktop connector session reattach intent restores connector shell semantics", () => {
  const intent = createDesktopSessionReattachIntent(
    {
      session: {
        sessionId: "session-0006",
        workspaceId: "workspace-demo",
        target: "ssh",
        state: "Running",
        createdAt: "2026-04-10T08:10:00.000Z",
        lastActiveAt: "2026-04-10T08:10:20.000Z",
        modeTags: ["cli-native"],
        tags: ["resource:ssh"],
      },
      attachment: {
        attachmentId: "attachment-0006",
        sessionId: "session-0006",
        cursor: "12",
        lastAckSequence: 12,
        writable: true,
      },
    },
    {
      requestId: "reattach-0006",
    },
  );

  assert.deepEqual(intent, {
    requestId: "reattach-0006",
    sessionId: "session-0006",
    attachmentId: "attachment-0006",
    cursor: "12",
    profile: "bash",
    title: "SSH",
    targetLabel: "reattach / ssh",
  });
});
