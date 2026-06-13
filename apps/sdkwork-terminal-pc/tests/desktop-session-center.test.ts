import test from "node:test";
import assert from "node:assert/strict";

test("desktop session center loader maps runtime session index into session snapshot", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const replayCalls: Array<{ sessionId: string; limit?: number }> = [];
  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-0001",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:20.000Z",
            lastActiveAt: "2026-04-09T00:00:20.000Z",
            modeTags: ["cli-native"],
            tags: ["resource:ssh"],
          },
          {
            sessionId: "session-0002",
            workspaceId: "workspace-demo",
            target: "docker-exec",
            state: "Detached",
            createdAt: "2026-04-09T00:00:21.000Z",
            lastActiveAt: "2026-04-09T00:00:21.000Z",
            modeTags: ["cli-native"],
            tags: ["resource:docker-exec"],
          },
        ],
        attachments: [
          {
            attachmentId: "attachment-0001",
            sessionId: "session-0001",
            cursor: "4",
            lastAckSequence: 4,
            writable: true,
          },
        ],
      };
    },
    async sessionReplay(sessionId, options) {
      replayCalls.push({ sessionId, limit: options?.limit });

      if (sessionId === "session-0001") {
        return {
          sessionId,
          fromCursor: null,
          nextCursor: "1",
          hasMore: false,
          entries: [
            {
              sequence: 1,
              kind: "state",
              payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
              occurredAt: "2026-04-09T00:00:20.000Z",
            },
          ],
        };
      }

      return {
        sessionId,
        fromCursor: null,
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
            occurredAt: "2026-04-09T00:00:21.000Z",
          },
          {
            sequence: 2,
            kind: "warning",
            payload: "permission denied",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
          {
            sequence: 3,
            kind: "exit",
            payload: "{\"exitCode\":126}",
            occurredAt: "2026-04-09T00:00:23.000Z",
          },
        ],
      };
    },
  }, {
    observedAt: "2026-04-09T00:00:40.000Z",
  });

  assert.deepEqual(replayCalls, [
    { sessionId: "session-0001", limit: 8 },
    { sessionId: "session-0002", limit: 8 },
  ]);
  assert.deepEqual(snapshot, {
    counts: {
      totalSessions: 2,
      attachedSessions: 1,
      reattachableSessions: 1,
      loadedReplayCount: 2,
      deferredReplayCount: 0,
      unavailableReplayCount: 0,
    },
    sessions: [
      {
        sessionId: "session-0001",
        workspaceId: "workspace-demo",
        target: "ssh",
        state: "Running",
        tags: ["resource:ssh"],
        attachmentState: "attached",
        lastAckSequence: 4,
        replayPreview: {
          entryCount: 1,
          nextCursor: "1",
          hasMore: false,
          latestEntry: {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
        },
        replayStatus: {
          state: "loaded",
          summary: "replay window 1-1 / 1 entries",
          fromCursor: null,
          nextCursor: "1",
          hasMore: false,
          entryCount: 1,
          firstSequence: 1,
          lastSequence: 1,
          error: null,
        },
        replayCursor: {
          fromCursor: null,
          firstSequence: 1,
          lastSequence: 1,
          nextCursor: "1",
          hasMore: false,
          summary: "cursor start -> 1-1 / next 1",
        },
        replayCursorDrift: undefined,
        replayAckLag: undefined,
        replayAckWindow: {
          position: "after-window",
          lastAckSequence: 4,
          firstSequence: 1,
          lastSequence: 1,
          summary: "ack after window / ack 4 / window 1-1",
        },
        replayWindowCoverage: {
          position: "full",
          fromCursor: null,
          nextCursor: "1",
          firstSequence: 1,
          lastSequence: 1,
          hasMore: false,
          summary: "coverage full / start -> 1-1",
        },
        replayLatestState: {
          state: "running",
          phase: "connect",
          sequence: 1,
          occurredAt: "2026-04-09T00:00:20.000Z",
          summary: "latest state running / phase connect / seq 1",
        },
        replayStateLag: {
          lagCount: 0,
          latestStateSequence: 1,
          latestSequence: 1,
          summary: "state lag aligned / state 1 / latest 1",
        },
        replayStateFreshness: {
          level: "aging",
          observedAt: "2026-04-09T00:00:40.000Z",
          latestOccurredAt: "2026-04-09T00:00:20.000Z",
          latestSequence: 1,
          ageSeconds: 20,
          summary: "state freshness aging / age 20s / seq 1",
        },
        replayStateAck: {
          position: "covered",
          deltaCount: 3,
          lastAckSequence: 4,
          latestStateSequence: 1,
          summary: "state ack covered +3 / ack 4 / state 1",
        },
        replayStateOutputDelta: undefined,
        replayLatestOutput: undefined,
        replayOutputLag: undefined,
        replayOutputAck: undefined,
        replayHealth: {
          level: "ready",
          warningCount: 0,
          latestExitCode: null,
          latestState: "running",
          summary: "health ready / state running",
        },
        replayLatestWarning: undefined,
        replayLatestExit: undefined,
        replayFreshness: {
          level: "aging",
          observedAt: "2026-04-09T00:00:40.000Z",
          latestOccurredAt: "2026-04-09T00:00:20.000Z",
          latestSequence: 1,
          ageSeconds: 20,
          summary: "freshness aging / age 20s / seq 1",
        },
        replayOutputFreshness: undefined,
        replayGap: undefined,
        replaySequenceGap: undefined,
        replayTimeline: {
          firstOccurredAt: "2026-04-09T00:00:20.000Z",
          lastOccurredAt: "2026-04-09T00:00:20.000Z",
          entryCount: 1,
          summary: "timeline 2026-04-09T00:00:20.000Z -> 2026-04-09T00:00:20.000Z / 1 events",
        },
        replayMix: {
          counts: {
            state: 1,
          },
          summary: "mix state=1",
        },
        replayEvidence: undefined,
        replayEvidenceAck: undefined,
        replayEvidenceFreshness: undefined,
        replaySlice: {
          sessionId: "session-0001",
          fromCursor: null,
          nextCursor: "1",
          hasMore: false,
          entries: [
            {
              sequence: 1,
              kind: "state",
              payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
              occurredAt: "2026-04-09T00:00:20.000Z",
            },
          ],
        },
      },
      {
        sessionId: "session-0002",
        workspaceId: "workspace-demo",
        target: "docker-exec",
        state: "Detached",
        tags: ["resource:docker-exec"],
        attachmentState: "reattach-required",
        lastAckSequence: 0,
        replayPreview: {
          entryCount: 3,
          nextCursor: "3",
          hasMore: false,
          latestEntry: {
            sequence: 3,
            kind: "exit",
            payload: "{\"exitCode\":126}",
            occurredAt: "2026-04-09T00:00:23.000Z",
          },
        },
        replayStatus: {
          state: "loaded",
          summary: "replay window 1-3 / 3 entries",
          fromCursor: null,
          nextCursor: "3",
          hasMore: false,
          entryCount: 3,
          firstSequence: 1,
          lastSequence: 3,
          error: null,
        },
        replayCursor: {
          fromCursor: null,
          firstSequence: 1,
          lastSequence: 3,
          nextCursor: "3",
          hasMore: false,
          summary: "cursor start -> 1-3 / next 3",
        },
        replayCursorDrift: undefined,
        replayAckLag: undefined,
        replayAckWindow: undefined,
        replayWindowCoverage: {
          position: "full",
          fromCursor: null,
          nextCursor: "3",
          firstSequence: 1,
          lastSequence: 3,
          hasMore: false,
          summary: "coverage full / start -> 1-3",
        },
        replayLatestState: {
          state: "running",
          phase: "connect",
          sequence: 1,
          occurredAt: "2026-04-09T00:00:21.000Z",
          summary: "latest state running / phase connect / seq 1",
        },
        replayStateLag: {
          lagCount: 2,
          latestStateSequence: 1,
          latestSequence: 3,
          summary: "state lag 2 / state 1 / latest 3",
        },
        replayStateFreshness: {
          level: "aging",
          observedAt: "2026-04-09T00:00:40.000Z",
          latestOccurredAt: "2026-04-09T00:00:21.000Z",
          latestSequence: 1,
          ageSeconds: 19,
          summary: "state freshness aging / age 19s / seq 1",
        },
        replayStateAck: undefined,
        replayStateOutputDelta: undefined,
        replayLatestOutput: undefined,
        replayOutputLag: undefined,
        replayOutputAck: undefined,
        replayHealth: {
          level: "failed",
          warningCount: 1,
          latestExitCode: 126,
          latestState: "running",
          summary: "health failed / exit code 126 / state running",
        },
        replayLatestWarning: {
          message: "permission denied",
          sequence: 2,
          occurredAt: "2026-04-09T00:00:22.000Z",
          summary: "latest warning permission denied / seq 2",
        },
        replayLatestExit: {
          exitCode: 126,
          sequence: 3,
          occurredAt: "2026-04-09T00:00:23.000Z",
          summary: "latest exit code 126 / seq 3",
        },
        replayFreshness: {
          level: "aging",
          observedAt: "2026-04-09T00:00:40.000Z",
          latestOccurredAt: "2026-04-09T00:00:23.000Z",
          latestSequence: 3,
          ageSeconds: 17,
          summary: "freshness aging / age 17s / seq 3",
        },
        replayOutputFreshness: undefined,
        replayGap: {
          largestGapSeconds: 1,
          fromSequence: 1,
          toSequence: 2,
          fromOccurredAt: "2026-04-09T00:00:21.000Z",
          toOccurredAt: "2026-04-09T00:00:22.000Z",
          summary: "gap max 1s / seq 1-2",
        },
        replaySequenceGap: undefined,
        replayTimeline: {
          firstOccurredAt: "2026-04-09T00:00:21.000Z",
          lastOccurredAt: "2026-04-09T00:00:23.000Z",
          entryCount: 3,
          summary: "timeline 2026-04-09T00:00:21.000Z -> 2026-04-09T00:00:23.000Z / 3 events",
        },
        replayMix: {
          counts: {
            exit: 1,
            state: 1,
            warning: 1,
          },
          summary: "mix exit=1, state=1, warning=1",
        },
        replayEvidence: {
          warningCount: 1,
          latestWarning: "permission denied",
          latestWarningSequence: 2,
          exitCount: 1,
          latestExitCode: 126,
          latestExitSequence: 3,
          summary: "evidence warning#2 permission denied / exit#3 code 126",
        },
        replayEvidenceAck: undefined,
        replayEvidenceFreshness: {
          level: "aging",
          observedAt: "2026-04-09T00:00:40.000Z",
          latestOccurredAt: "2026-04-09T00:00:23.000Z",
          latestSequence: 3,
          ageSeconds: 17,
          summary: "evidence freshness aging / age 17s / seq 3",
        },
        replaySlice: {
          sessionId: "session-0002",
          fromCursor: null,
          nextCursor: "3",
          hasMore: false,
          entries: [
            {
              sequence: 1,
              kind: "state",
              payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
              occurredAt: "2026-04-09T00:00:21.000Z",
            },
            {
              sequence: 2,
              kind: "warning",
              payload: "permission denied",
              occurredAt: "2026-04-09T00:00:22.000Z",
            },
            {
              sequence: 3,
              kind: "exit",
              payload: "{\"exitCode\":126}",
              occurredAt: "2026-04-09T00:00:23.000Z",
            },
          ],
        },
      },
    ],
  });
});

test("desktop session center loader preserves runtime session tags instead of collapsing to mode tags", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-0100",
            workspaceId: "workspace-demo",
            target: "local-shell",
            state: "Detached",
            createdAt: "2026-04-10T09:00:00.000Z",
            lastActiveAt: "2026-04-10T09:00:01.000Z",
            modeTags: ["cli-native"],
            tags: ["profile:powershell"],
          },
        ],
        attachments: [],
      };
    },
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
  }, {
    observedAt: "2026-04-10T09:00:10.000Z",
  });

  assert.deepEqual(snapshot.sessions[0]?.tags, ["profile:powershell"]);
});

test("desktop session center loader surfaces replay read failures instead of hiding them", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-0003",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:30.000Z",
            lastActiveAt: "2026-04-09T00:00:31.000Z",
            modeTags: ["cli-native"],
          },
        ],
        attachments: [],
      };
    },
    async sessionReplay() {
      throw new Error("desktop_session_replay_slice unavailable");
    },
  });

  assert.deepEqual(snapshot.sessions[0]?.replayStatus, {
    state: "unavailable",
    summary: "replay unavailable: desktop_session_replay_slice unavailable",
    fromCursor: null,
    nextCursor: null,
    hasMore: false,
    entryCount: 0,
    firstSequence: null,
    lastSequence: null,
    error: "desktop_session_replay_slice unavailable",
  });
  assert.equal(snapshot.sessions[0]?.replayPreview, undefined);
  assert.equal(snapshot.sessions[0]?.replaySlice, undefined);
  assert.equal(snapshot.sessions[0]?.replayCursor, undefined);
  assert.equal(snapshot.sessions[0]?.replayAckLag, undefined);
  assert.equal(snapshot.sessions[0]?.replayAckWindow, undefined);
  assert.equal(snapshot.sessions[0]?.replayWindowCoverage, undefined);
  assert.equal(snapshot.sessions[0]?.replayLatestState, undefined);
  assert.equal(snapshot.sessions[0]?.replayStateLag, undefined);
  assert.equal(snapshot.sessions[0]?.replayStateFreshness, undefined);
  assert.equal(snapshot.sessions[0]?.replayStateAck, undefined);
  assert.equal(snapshot.sessions[0]?.replayStateOutputDelta, undefined);
  assert.equal(snapshot.sessions[0]?.replayLatestOutput, undefined);
  assert.deepEqual(snapshot.sessions[0]?.replayHealth, {
    level: "unknown",
    warningCount: 0,
    latestExitCode: null,
    latestState: null,
    summary: "health unknown / replay unavailable",
  });
  assert.equal(snapshot.sessions[0]?.replayLatestWarning, undefined);
  assert.equal(snapshot.sessions[0]?.replayLatestExit, undefined);
  assert.equal(snapshot.sessions[0]?.replayFreshness, undefined);
  assert.equal(snapshot.sessions[0]?.replayOutputLag, undefined);
  assert.equal(snapshot.sessions[0]?.replayOutputAck, undefined);
  assert.equal(snapshot.sessions[0]?.replayGap, undefined);
  assert.equal(snapshot.sessions[0]?.replaySequenceGap, undefined);
  assert.equal(snapshot.sessions[0]?.replayTimeline, undefined);
  assert.equal(snapshot.sessions[0]?.replayMix, undefined);
  assert.equal(snapshot.sessions[0]?.replayEvidence, undefined);
  assert.equal(snapshot.sessions[0]?.replayEvidenceFreshness, undefined);
  assert.equal(snapshot.counts.loadedReplayCount, 0);
  assert.equal(snapshot.counts.deferredReplayCount, 0);
  assert.equal(snapshot.counts.unavailableReplayCount, 1);
});

test("desktop session center loader preserves replay sequence gap summary when bounded replay has holes", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-gap",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:20.000Z",
            lastActiveAt: "2026-04-09T00:00:22.000Z",
            modeTags: ["cli-native"],
          },
        ],
        attachments: [],
      };
    },
    async sessionReplay() {
      return {
        sessionId: "session-gap",
        fromCursor: null,
        nextCursor: "5",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "/workspace",
            occurredAt: "2026-04-09T00:00:21.000Z",
          },
          {
            sequence: 5,
            kind: "output",
            payload: "done",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
        ],
      };
    },
  }, {
    observedAt: "2026-04-09T00:00:40.000Z",
  });

  assert.deepEqual(snapshot.sessions[0]?.replaySequenceGap, {
    missingCount: 2,
    fromSequence: 2,
    toSequence: 5,
    summary: "seq gap max 2 / seq 2-5",
  });
});

test("desktop session center loader preserves replay cursor drift summary when bounded replay skips ahead of requested cursor", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-drift",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:20.000Z",
            lastActiveAt: "2026-04-09T00:00:22.000Z",
            modeTags: ["cli-native"],
          },
        ],
        attachments: [],
      };
    },
    async sessionReplay() {
      return {
        sessionId: "session-drift",
        fromCursor: "8",
        nextCursor: "13",
        hasMore: true,
        entries: [
          {
            sequence: 11,
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
          {
            sequence: 13,
            kind: "output",
            payload: "done",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
        ],
      };
    },
  }, {
    observedAt: "2026-04-09T00:00:40.000Z",
  });

  assert.deepEqual(snapshot.sessions[0]?.replayCursorDrift, {
    driftCount: 2,
    fromCursor: "8",
    expectedSequence: 9,
    firstSequence: 11,
    summary: "cursor drift +2 / expected 9 / first 11",
  });
});

test("desktop session center loader preserves replay ack lag summary when attachment ack trails latest replay event", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-ack-lag",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:20.000Z",
            lastActiveAt: "2026-04-09T00:00:22.000Z",
            modeTags: ["cli-native"],
          },
        ],
        attachments: [
          {
            attachmentId: "attachment-ack-lag",
            sessionId: "session-ack-lag",
            cursor: "11",
            lastAckSequence: 11,
            writable: true,
          },
        ],
      };
    },
    async sessionReplay() {
      return {
        sessionId: "session-ack-lag",
        fromCursor: "8",
        nextCursor: "13",
        hasMore: true,
        entries: [
          {
            sequence: 9,
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
          {
            sequence: 13,
            kind: "output",
            payload: "done",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
        ],
      };
    },
  }, {
    observedAt: "2026-04-09T00:00:40.000Z",
  });

  assert.deepEqual(snapshot.sessions[0]?.replayAckLag, {
    lagCount: 2,
    lastAckSequence: 11,
    latestSequence: 13,
    summary: "ack lag 2 / ack 11 / latest 13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayAckWindow, {
    position: "within-window",
    lastAckSequence: 11,
    firstSequence: 9,
    lastSequence: 13,
    summary: "ack in window / ack 11 / window 9-13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayWindowCoverage, {
    position: "middle",
    fromCursor: "8",
    nextCursor: "13",
    firstSequence: 9,
    lastSequence: 13,
    hasMore: true,
    summary: "coverage middle / after 8 -> 9-13 / more ahead",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateLag, {
    lagCount: 4,
    latestStateSequence: 9,
    latestSequence: 13,
    summary: "state lag 4 / state 9 / latest 13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayLatestOutput, {
    payload: "done",
    sequence: 13,
    occurredAt: "2026-04-09T00:00:22.000Z",
    summary: "latest output done / seq 13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayOutputLag, {
    lagCount: 0,
    latestOutputSequence: 13,
    latestSequence: 13,
    summary: "output lag aligned / output 13 / latest 13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayOutputAck, {
    position: "lagging",
    deltaCount: 2,
    lastAckSequence: 11,
    latestOutputSequence: 13,
    summary: "output ack lag 2 / ack 11 / output 13",
  });
});

test("desktop session center loader preserves replay output freshness when latest output lags behind newer replay evidence", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-output-freshness",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:20.000Z",
            lastActiveAt: "2026-04-09T00:00:50.000Z",
            modeTags: ["cli-native"],
          },
        ],
        attachments: [],
      };
    },
    async sessionReplay() {
      return {
        sessionId: "session-output-freshness",
        fromCursor: null,
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "/workspace",
            occurredAt: "2026-04-09T00:00:21.000Z",
          },
          {
            sequence: 3,
            kind: "warning",
            payload: "permission denied",
            occurredAt: "2026-04-09T00:00:50.000Z",
          },
        ],
      };
    },
  }, {
    observedAt: "2026-04-09T00:01:00.000Z",
  });

  assert.deepEqual(snapshot.sessions[0]?.replayOutputFreshness, {
    level: "aging",
    observedAt: "2026-04-09T00:01:00.000Z",
    latestOccurredAt: "2026-04-09T00:00:21.000Z",
    latestSequence: 2,
    ageSeconds: 39,
    summary: "output freshness aging / age 39s / seq 2",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayOutputLag, {
    lagCount: 1,
    latestOutputSequence: 2,
    latestSequence: 3,
    summary: "output lag 1 / output 2 / latest 3",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayFreshness, {
    level: "fresh",
    observedAt: "2026-04-09T00:01:00.000Z",
    latestOccurredAt: "2026-04-09T00:00:50.000Z",
    latestSequence: 3,
    ageSeconds: 10,
    summary: "freshness fresh / age 10s / seq 3",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateLag, {
    lagCount: 2,
    latestStateSequence: 1,
    latestSequence: 3,
    summary: "state lag 2 / state 1 / latest 3",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateFreshness, {
    level: "aging",
    observedAt: "2026-04-09T00:01:00.000Z",
    latestOccurredAt: "2026-04-09T00:00:20.000Z",
    latestSequence: 1,
    ageSeconds: 40,
    summary: "state freshness aging / age 40s / seq 1",
  });
  assert.equal(snapshot.sessions[0]?.replayStateAck, undefined);
  assert.equal(snapshot.sessions[0]?.replayEvidenceAck, undefined);
  assert.deepEqual(snapshot.sessions[0]?.replayStateOutputDelta, {
    relation: "output-ahead",
    deltaCount: 1,
    latestStateSequence: 1,
    latestOutputSequence: 2,
    summary: "state/output output+1 / state 1 / output 2",
  });
});

test("desktop session center loader preserves replay evidence ack when attachment ack trails latest warning-exit evidence", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-evidence-ack",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:20.000Z",
            lastActiveAt: "2026-04-09T00:00:23.000Z",
            modeTags: ["cli-native"],
          },
        ],
        attachments: [
          {
            attachmentId: "attachment-evidence-ack",
            sessionId: "session-evidence-ack",
            cursor: "1",
            lastAckSequence: 1,
            writable: true,
          },
        ],
      };
    },
    async sessionReplay() {
      return {
        sessionId: "session-evidence-ack",
        fromCursor: null,
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
          {
            sequence: 2,
            kind: "warning",
            payload: "permission denied",
            occurredAt: "2026-04-09T00:00:21.000Z",
          },
          {
            sequence: 3,
            kind: "exit",
            payload: "{\"exitCode\":126}",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
        ],
      };
    },
  }, {
    observedAt: "2026-04-09T00:00:40.000Z",
  });

  assert.deepEqual(snapshot.sessions[0]?.replayEvidenceAck, {
    position: "lagging",
    deltaCount: 2,
    lastAckSequence: 1,
    latestEvidenceSequence: 3,
    summary: "evidence ack lag 2 / ack 1 / evidence 3",
  });
});

test("desktop session center loader preserves replay evidence freshness when latest evidence lags behind newer output", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-evidence-freshness",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:20.000Z",
            lastActiveAt: "2026-04-09T00:00:50.000Z",
            modeTags: ["cli-native"],
          },
        ],
        attachments: [],
      };
    },
    async sessionReplay() {
      return {
        sessionId: "session-evidence-freshness",
        fromCursor: null,
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
          {
            sequence: 2,
            kind: "warning",
            payload: "permission denied",
            occurredAt: "2026-04-09T00:00:21.000Z",
          },
          {
            sequence: 3,
            kind: "output",
            payload: "still running",
            occurredAt: "2026-04-09T00:00:50.000Z",
          },
        ],
      };
    },
  }, {
    observedAt: "2026-04-09T00:01:00.000Z",
  });

  assert.deepEqual(snapshot.sessions[0]?.replayEvidenceFreshness, {
    level: "aging",
    observedAt: "2026-04-09T00:01:00.000Z",
    latestOccurredAt: "2026-04-09T00:00:21.000Z",
    latestSequence: 2,
    ageSeconds: 39,
    summary: "evidence freshness aging / age 39s / seq 2",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayFreshness, {
    level: "fresh",
    observedAt: "2026-04-09T00:01:00.000Z",
    latestOccurredAt: "2026-04-09T00:00:50.000Z",
    latestSequence: 3,
    ageSeconds: 10,
    summary: "freshness fresh / age 10s / seq 3",
  });
});

test("desktop session center loader limits replay fetch concurrency to avoid flooding runtime bridge", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const sessionCount = 12;
  let activeCalls = 0;
  let maxActiveCalls = 0;

  const sessions = Array.from({ length: sessionCount }, (_, index) => ({
    sessionId: `session-${String(index + 1).padStart(4, "0")}`,
    workspaceId: "workspace-demo",
    target: "ssh",
    state: "Running",
    createdAt: "2026-04-09T00:00:20.000Z",
    lastActiveAt: "2026-04-09T00:00:20.000Z",
    modeTags: ["cli-native"],
  }));

  await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions,
        attachments: [],
      };
    },
    async sessionReplay(sessionId) {
      activeCalls += 1;
      maxActiveCalls = Math.max(maxActiveCalls, activeCalls);

      await new Promise((resolve) => setTimeout(resolve, 8));
      activeCalls -= 1;

      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
  });

  assert.ok(
    maxActiveCalls <= 4,
    `expected replay fetch concurrency <= 4, received ${maxActiveCalls}`,
  );
});

test("desktop session center loader defers replay fetch outside preload window and prioritizes recent sessions", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const replayCalls: string[] = [];
  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-older",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:10.000Z",
            lastActiveAt: "2026-04-09T00:00:15.000Z",
            modeTags: ["cli-native"],
          },
          {
            sessionId: "session-newest",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:20.000Z",
            lastActiveAt: "2026-04-09T00:00:40.000Z",
            modeTags: ["cli-native"],
          },
          {
            sessionId: "session-mid",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:15.000Z",
            lastActiveAt: "2026-04-09T00:00:30.000Z",
            modeTags: ["cli-native"],
          },
          {
            sessionId: "session-oldest",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:05.000Z",
            lastActiveAt: "2026-04-09T00:00:08.000Z",
            modeTags: ["cli-native"],
          },
        ],
        attachments: [],
      };
    },
    async sessionReplay(sessionId) {
      replayCalls.push(sessionId);
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
  }, {
    replayPreloadLimit: 2,
  });

  assert.deepEqual([...replayCalls].sort(), ["session-mid", "session-newest"]);

  const sessionById = new Map(snapshot.sessions.map((session) => [session.sessionId, session]));
  assert.equal(snapshot.counts.loadedReplayCount, 2);
  assert.equal(snapshot.counts.deferredReplayCount, 2);
  assert.equal(snapshot.counts.unavailableReplayCount, 0);
  assert.equal(sessionById.get("session-newest")?.replayStatus?.state, "loaded");
  assert.equal(sessionById.get("session-mid")?.replayStatus?.state, "loaded");
  assert.deepEqual(sessionById.get("session-older")?.replayStatus, {
    state: "deferred",
    summary: "replay deferred: outside preload limit (2/4)",
    fromCursor: null,
    nextCursor: null,
    hasMore: false,
    entryCount: 0,
    firstSequence: null,
    lastSequence: null,
    error: "outside preload limit (2/4)",
  });
  assert.deepEqual(sessionById.get("session-oldest")?.replayStatus, {
    state: "deferred",
    summary: "replay deferred: outside preload limit (2/4)",
    fromCursor: null,
    nextCursor: null,
    hasMore: false,
    entryCount: 0,
    firstSequence: null,
    lastSequence: null,
    error: "outside preload limit (2/4)",
  });
  assert.equal(
    sessionById.get("session-older")?.replayHealth?.summary,
    "health unknown / replay deferred",
  );
});

test("desktop session center loader prioritizes detached sessions ahead of running sessions for replay preload", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const replayCalls: string[] = [];
  await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: [
          {
            sessionId: "session-running-newest",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:20.000Z",
            lastActiveAt: "2026-04-09T00:00:40.000Z",
            modeTags: ["cli-native"],
          },
          {
            sessionId: "session-running-mid",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-09T00:00:15.000Z",
            lastActiveAt: "2026-04-09T00:00:30.000Z",
            modeTags: ["cli-native"],
          },
          {
            sessionId: "session-detached-old",
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Detached",
            createdAt: "2026-04-09T00:00:05.000Z",
            lastActiveAt: "2026-04-09T00:00:08.000Z",
            modeTags: ["cli-native"],
          },
        ],
        attachments: [],
      };
    },
    async sessionReplay(sessionId) {
      replayCalls.push(sessionId);
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
  }, {
    replayPreloadLimit: 2,
  });

  assert.deepEqual(
    [...replayCalls].sort(),
    ["session-detached-old", "session-running-newest"],
  );
});

test("desktop session center loader keeps replay diagnostics consistent for high-cardinality mixed results", async () => {
  const { loadDesktopSessionCenterSnapshot } = await import(
    "../apps/desktop/src/session-center.ts"
  ).catch(() => null);

  assert.ok(loadDesktopSessionCenterSnapshot);

  const totalSessions = 60;
  const replayPreloadLimit = 20;
  const replayCalls: string[] = [];

  const snapshot = await loadDesktopSessionCenterSnapshot({
    async sessionIndex() {
      return {
        sessions: Array.from({ length: totalSessions }, (_, index) => {
          const numericId = index + 1;
          const offsetSeconds = numericId - 1;
          const occurredAt = new Date(
            Date.UTC(2026, 3, 9, 0, 0, offsetSeconds),
          ).toISOString();
          return {
            sessionId: `session-${String(numericId).padStart(3, "0")}`,
            workspaceId: "workspace-demo",
            target: "ssh",
            state: "Running",
            createdAt: occurredAt,
            lastActiveAt: occurredAt,
            modeTags: ["cli-native"],
          };
        }),
        attachments: [],
      };
    },
    async sessionReplay(sessionId) {
      replayCalls.push(sessionId);
      const numericId = Number.parseInt(sessionId.split("-")[1] ?? "0", 10);

      if (numericId % 7 === 0) {
        throw new Error("desktop_session_replay_slice overloaded");
      }

      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:00.000Z",
          },
        ],
      };
    },
  }, {
    replayPreloadLimit,
    observedAt: "2026-04-09T00:00:59.000Z",
  });

  assert.equal(replayCalls.length, replayPreloadLimit);
  assert.ok(replayCalls.includes("session-060"));
  assert.ok(!replayCalls.includes("session-001"));
  assert.equal(snapshot.counts.totalSessions, totalSessions);
  assert.equal(snapshot.counts.loadedReplayCount, 17);
  assert.equal(snapshot.counts.unavailableReplayCount, 3);
  assert.equal(snapshot.counts.deferredReplayCount, 40);

  const sessionById = new Map(snapshot.sessions.map((session) => [session.sessionId, session]));

  assert.equal(sessionById.get("session-060")?.replayStatus?.state, "loaded");
  assert.equal(sessionById.get("session-056")?.replayStatus?.state, "unavailable");
  assert.deepEqual(sessionById.get("session-001")?.replayStatus, {
    state: "deferred",
    summary: "replay deferred: outside preload limit (20/60)",
    fromCursor: null,
    nextCursor: null,
    hasMore: false,
    entryCount: 0,
    firstSequence: null,
    lastSequence: null,
    error: "outside preload limit (20/60)",
  });
});
