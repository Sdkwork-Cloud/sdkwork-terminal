import test from "node:test";
import assert from "node:assert/strict";

import {
  createSessionReplayHistoryLines,
  summarizeSessionReplayAckLag,
  summarizeSessionReplayAckWindow,
  summarizeSessionReplayCursor,
  summarizeSessionReplayCursorDrift,
  summarizeSessionReplayEvidenceAck,
  summarizeSessionReplayEvidence,
  summarizeSessionReplayEvidenceFreshness,
  summarizeSessionReplayGap,
  summarizeSessionReplayHealth,
  summarizeSessionReplayFreshness,
  summarizeSessionReplayOutputAck,
  summarizeSessionReplayOutputLag,
  summarizeSessionReplayOutputFreshness,
  summarizeSessionReplayLatestExit,
  summarizeSessionReplayLatestOutput,
  summarizeSessionReplayLatestState,
  summarizeSessionReplayStateAck,
  summarizeSessionReplayStateLag,
  summarizeSessionReplayStateFreshness,
  summarizeSessionReplayStateOutputDelta,
  summarizeSessionReplaySequenceGap,
  summarizeSessionReplayLatestWarning,
  summarizeSessionReplayMix,
  summarizeSessionReplayStatus,
  summarizeSessionReplayTimeline,
  summarizeSessionReplayWindowCoverage,
} from "../packages/sdkwork-terminal-sessions/src/model.ts";

test("session replay history lines expose bounded transcript entries for ui rendering", () => {
  const lines = createSessionReplayHistoryLines({
    sessionId: "session-0002",
    workspaceId: "workspace-demo",
    target: "docker-exec",
    state: "Exited",
    tags: ["cli-native"],
    attachmentState: "attached",
    lastAckSequence: 3,
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
  });

  assert.deepEqual(lines, [
    "seq 1 state {\"state\":\"running\",\"phase\":\"connect\"}",
    "seq 2 warning permission denied",
    "seq 3 exit {\"exitCode\":126}",
  ]);
});

test("session replay status formatter exposes loaded and unavailable summaries", () => {
  assert.equal(
    summarizeSessionReplayStatus({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayStatus: {
        state: "loaded",
        summary: "replay window 4-8 / 4 entries +",
        fromCursor: "3",
        nextCursor: "8",
        hasMore: true,
        entryCount: 4,
        firstSequence: 4,
        lastSequence: 8,
        error: null,
      },
    }),
    "replay window 4-8 / 4 entries +",
  );

  assert.equal(
    summarizeSessionReplayStatus({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
      replayStatus: {
        state: "unavailable",
        summary: "replay unavailable: desktop_session_replay_slice unavailable",
        fromCursor: null,
        nextCursor: null,
        hasMore: false,
        entryCount: 0,
        firstSequence: null,
        lastSequence: null,
        error: "desktop_session_replay_slice unavailable",
      },
    }),
    "replay unavailable: desktop_session_replay_slice unavailable",
  );
});

test("session replay cursor formatter exposes loaded cursor metadata only", () => {
  assert.equal(
    summarizeSessionReplayCursor({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayCursor: {
        fromCursor: "8",
        firstSequence: 9,
        lastSequence: 13,
        nextCursor: "13",
        hasMore: true,
        summary: "cursor 8 -> 9-13 / next 13 +",
      },
    }),
    "cursor 8 -> 9-13 / next 13 +",
  );

  assert.equal(
    summarizeSessionReplayCursor({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay cursor drift formatter exposes drift summary only when cursor metadata is comparable", () => {
  assert.equal(
    summarizeSessionReplayCursorDrift({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayCursorDrift: {
        driftCount: 2,
        fromCursor: "8",
        expectedSequence: 9,
        firstSequence: 11,
        summary: "cursor drift +2 / expected 9 / first 11",
      },
    }),
    "cursor drift +2 / expected 9 / first 11",
  );

  assert.equal(
    summarizeSessionReplayCursorDrift({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay ack lag formatter exposes ack lag summary only when attachment ack is comparable", () => {
  assert.equal(
    summarizeSessionReplayAckLag({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 11,
      replayAckLag: {
        lagCount: 2,
        lastAckSequence: 11,
        latestSequence: 13,
        summary: "ack lag 2 / ack 11 / latest 13",
      },
    }),
    "ack lag 2 / ack 11 / latest 13",
  );

  assert.equal(
    summarizeSessionReplayAckLag({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay ack window formatter exposes ack position relative to bounded replay window", () => {
  assert.equal(
    summarizeSessionReplayAckWindow({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 11,
      replayAckWindow: {
        position: "within-window",
        lastAckSequence: 11,
        firstSequence: 9,
        lastSequence: 13,
        summary: "ack in window / ack 11 / window 9-13",
      },
    }),
    "ack in window / ack 11 / window 9-13",
  );

  assert.equal(
    summarizeSessionReplayAckWindow({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay window coverage formatter exposes bounded replay placement across history", () => {
  assert.equal(
    summarizeSessionReplayWindowCoverage({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 11,
      replayWindowCoverage: {
        position: "middle",
        fromCursor: "8",
        nextCursor: "13",
        firstSequence: 9,
        lastSequence: 13,
        hasMore: true,
        summary: "coverage middle / after 8 -> 9-13 / more ahead",
      },
    }),
    "coverage middle / after 8 -> 9-13 / more ahead",
  );

  assert.equal(
    summarizeSessionReplayWindowCoverage({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay latest state formatter exposes loaded state projection only", () => {
  assert.equal(
    summarizeSessionReplayLatestState({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayLatestState: {
        state: "running",
        phase: "connect",
        sequence: 9,
        occurredAt: "2026-04-09T00:00:20.000Z",
        summary: "latest state running / phase connect / seq 9",
      },
    }),
    "latest state running / phase connect / seq 9",
  );

  assert.equal(
    summarizeSessionReplayLatestState({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay state lag formatter exposes latest state lag only", () => {
  assert.equal(
    summarizeSessionReplayStateLag({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayStateLag: {
        lagCount: 4,
        latestStateSequence: 9,
        latestSequence: 13,
        summary: "state lag 4 / state 9 / latest 13",
      },
    }),
    "state lag 4 / state 9 / latest 13",
  );

  assert.equal(
    summarizeSessionReplayStateLag({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay state freshness formatter exposes latest state freshness only", () => {
  assert.equal(
    summarizeSessionReplayStateFreshness({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayStateFreshness: {
        level: "aging",
        observedAt: "2026-04-09T00:01:00.000Z",
        latestOccurredAt: "2026-04-09T00:00:20.000Z",
        latestSequence: 1,
        ageSeconds: 40,
        summary: "state freshness aging / age 40s / seq 1",
      },
    }),
    "state freshness aging / age 40s / seq 1",
  );

  assert.equal(
    summarizeSessionReplayStateFreshness({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay state ack formatter exposes latest state coverage relative to attachment ack", () => {
  assert.equal(
    summarizeSessionReplayStateAck({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 1,
      replayStateAck: {
        position: "lagging",
        deltaCount: 2,
        lastAckSequence: 1,
        latestStateSequence: 3,
        summary: "state ack lag 2 / ack 1 / state 3",
      },
    }),
    "state ack lag 2 / ack 1 / state 3",
  );

  assert.equal(
    summarizeSessionReplayStateAck({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay state/output delta formatter exposes latest state-output order only", () => {
  assert.equal(
    summarizeSessionReplayStateOutputDelta({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayStateOutputDelta: {
        relation: "state-ahead",
        deltaCount: 1,
        latestStateSequence: 2,
        latestOutputSequence: 1,
        summary: "state/output state+1 / state 2 / output 1",
      },
    }),
    "state/output state+1 / state 2 / output 1",
  );

  assert.equal(
    summarizeSessionReplayStateOutputDelta({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay latest output formatter exposes latest output projection only", () => {
  assert.equal(
    summarizeSessionReplayLatestOutput({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayLatestOutput: {
        payload: "/workspace",
        sequence: 10,
        occurredAt: "2026-04-09T00:00:21.000Z",
        summary: "latest output /workspace / seq 10",
      },
    }),
    "latest output /workspace / seq 10",
  );

  assert.equal(
    summarizeSessionReplayLatestOutput({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay health formatter exposes replay health summary only", () => {
  assert.equal(
    summarizeSessionReplayHealth({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayHealth: {
        level: "degraded",
        warningCount: 1,
        latestExitCode: null,
        latestState: "running",
        summary: "health degraded / 1 warning / state running",
      },
    }),
    "health degraded / 1 warning / state running",
  );

  assert.equal(
    summarizeSessionReplayHealth({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay latest warning formatter exposes latest warning projection only", () => {
  assert.equal(
    summarizeSessionReplayLatestWarning({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayLatestWarning: {
        message: "permission denied",
        sequence: 13,
        occurredAt: "2026-04-09T00:00:22.000Z",
        summary: "latest warning permission denied / seq 13",
      },
    }),
    "latest warning permission denied / seq 13",
  );

  assert.equal(
    summarizeSessionReplayLatestWarning({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay latest exit formatter exposes latest exit projection only", () => {
  assert.equal(
    summarizeSessionReplayLatestExit({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayLatestExit: {
        exitCode: 126,
        sequence: 3,
        occurredAt: "2026-04-09T00:00:23.000Z",
        summary: "latest exit code 126 / seq 3",
      },
    }),
    "latest exit code 126 / seq 3",
  );

  assert.equal(
    summarizeSessionReplayLatestExit({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay freshness formatter exposes freshness projection only", () => {
  assert.equal(
    summarizeSessionReplayFreshness({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayFreshness: {
        level: "aging",
        observedAt: "2026-04-09T00:01:02.000Z",
        latestOccurredAt: "2026-04-09T00:00:22.000Z",
        latestSequence: 3,
        ageSeconds: 40,
        summary: "freshness aging / age 40s / seq 3",
      },
    }),
    "freshness aging / age 40s / seq 3",
  );

  assert.equal(
    summarizeSessionReplayFreshness({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay output freshness formatter exposes latest output freshness only", () => {
  assert.equal(
    summarizeSessionReplayOutputFreshness({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayOutputFreshness: {
        level: "aging",
        observedAt: "2026-04-09T00:01:00.000Z",
        latestOccurredAt: "2026-04-09T00:00:21.000Z",
        latestSequence: 2,
        ageSeconds: 39,
        summary: "output freshness aging / age 39s / seq 2",
      },
    }),
    "output freshness aging / age 39s / seq 2",
  );

  assert.equal(
    summarizeSessionReplayOutputFreshness({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay output lag formatter exposes output sequence lag only", () => {
  assert.equal(
    summarizeSessionReplayOutputLag({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayOutputLag: {
        lagCount: 3,
        latestOutputSequence: 10,
        latestSequence: 13,
        summary: "output lag 3 / output 10 / latest 13",
      },
    }),
    "output lag 3 / output 10 / latest 13",
  );

  assert.equal(
    summarizeSessionReplayOutputLag({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay output ack formatter exposes latest output coverage relative to attachment ack", () => {
  assert.equal(
    summarizeSessionReplayOutputAck({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 13,
      replayOutputAck: {
        position: "covered",
        deltaCount: 3,
        lastAckSequence: 13,
        latestOutputSequence: 10,
        summary: "output ack covered +3 / ack 13 / output 10",
      },
    }),
    "output ack covered +3 / ack 13 / output 10",
  );

  assert.equal(
    summarizeSessionReplayOutputAck({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay gap formatter exposes timeline gap summary only", () => {
  assert.equal(
    summarizeSessionReplayGap({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayGap: {
        largestGapSeconds: 31,
        fromSequence: 2,
        toSequence: 3,
        fromOccurredAt: "2026-04-09T00:00:21.000Z",
        toOccurredAt: "2026-04-09T00:00:52.000Z",
        summary: "gap max 31s / seq 2-3",
      },
    }),
    "gap max 31s / seq 2-3",
  );

  assert.equal(
    summarizeSessionReplayGap({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay sequence gap formatter exposes sequence gap summary only", () => {
  assert.equal(
    summarizeSessionReplaySequenceGap({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replaySequenceGap: {
        missingCount: 3,
        fromSequence: 4,
        toSequence: 8,
        summary: "seq gap max 3 / seq 4-8",
      },
    }),
    "seq gap max 3 / seq 4-8",
  );

  assert.equal(
    summarizeSessionReplaySequenceGap({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay timeline formatter exposes loaded timeline metadata only", () => {
  assert.equal(
    summarizeSessionReplayTimeline({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayTimeline: {
        firstOccurredAt: "2026-04-09T00:00:20.000Z",
        lastOccurredAt: "2026-04-09T00:00:22.000Z",
        entryCount: 3,
        summary: "timeline 2026-04-09T00:00:20.000Z -> 2026-04-09T00:00:22.000Z / 3 events",
      },
    }),
    "timeline 2026-04-09T00:00:20.000Z -> 2026-04-09T00:00:22.000Z / 3 events",
  );

  assert.equal(
    summarizeSessionReplayTimeline({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay mix formatter exposes loaded kind distribution only", () => {
  assert.equal(
    summarizeSessionReplayMix({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayMix: {
        counts: {
          output: 2,
          state: 1,
          warning: 1,
        },
        summary: "mix output=2, state=1, warning=1",
      },
    }),
    "mix output=2, state=1, warning=1",
  );

  assert.equal(
    summarizeSessionReplayMix({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay evidence formatter exposes warning and exit digest only", () => {
  assert.equal(
    summarizeSessionReplayEvidence({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 4,
      replayEvidence: {
        warningCount: 1,
        latestWarning: "permission denied",
        latestWarningSequence: 2,
        exitCount: 1,
        latestExitCode: 126,
        latestExitSequence: 3,
        summary: "evidence warning#2 permission denied / exit#3 code 126",
      },
    }),
    "evidence warning#2 permission denied / exit#3 code 126",
  );

  assert.equal(
    summarizeSessionReplayEvidence({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay evidence ack formatter exposes latest warning-exit coverage relative to attachment ack", () => {
  assert.equal(
    summarizeSessionReplayEvidenceAck({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 3,
      replayEvidenceAck: {
        position: "covered",
        deltaCount: 1,
        lastAckSequence: 3,
        latestEvidenceSequence: 2,
        summary: "evidence ack covered +1 / ack 3 / evidence 2",
      },
    }),
    "evidence ack covered +1 / ack 3 / evidence 2",
  );

  assert.equal(
    summarizeSessionReplayEvidenceAck({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});

test("session replay evidence freshness formatter exposes latest warning-exit freshness only", () => {
  assert.equal(
    summarizeSessionReplayEvidenceFreshness({
      sessionId: "session-loaded",
      workspaceId: "workspace-demo",
      target: "ssh",
      state: "Running",
      tags: ["cli-native"],
      attachmentState: "attached",
      lastAckSequence: 3,
      replayEvidenceFreshness: {
        level: "aging",
        observedAt: "2026-04-09T00:01:00.000Z",
        latestOccurredAt: "2026-04-09T00:00:21.000Z",
        latestSequence: 2,
        ageSeconds: 39,
        summary: "evidence freshness aging / age 39s / seq 2",
      },
    }),
    "evidence freshness aging / age 39s / seq 2",
  );

  assert.equal(
    summarizeSessionReplayEvidenceFreshness({
      sessionId: "session-unavailable",
      workspaceId: "workspace-demo",
      target: "docker-exec",
      state: "Detached",
      tags: ["cli-native"],
      attachmentState: "idle",
      lastAckSequence: 0,
    }),
    null,
  );
});
