import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_ATTACHMENT_DESCRIPTOR, DEFAULT_SESSION_DESCRIPTOR } from "../packages/sdkwork-terminal-contracts/src/index.ts";
import {
  createSessionCenterSnapshot,
  summarizeSessionCenter,
} from "../packages/sdkwork-terminal-sessions/src/model.ts";

test("session center snapshot keeps session truth separate from attachment state", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [
      DEFAULT_SESSION_DESCRIPTOR,
      {
        ...DEFAULT_SESSION_DESCRIPTOR,
        sessionId: "session-detached",
        state: "Detached",
      },
    ],
    attachments: [DEFAULT_ATTACHMENT_DESCRIPTOR],
  });

  assert.equal(snapshot.counts.totalSessions, 2);
  assert.equal(snapshot.counts.attachedSessions, 1);
  assert.equal(snapshot.counts.reattachableSessions, 1);
  assert.equal(snapshot.sessions[1]?.attachmentState, "reattach-required");
});

test("session center summary highlights runtime truth and reattach backlog", () => {
  const summary = summarizeSessionCenter(
    createSessionCenterSnapshot({
      sessions: [
        DEFAULT_SESSION_DESCRIPTOR,
        {
          ...DEFAULT_SESSION_DESCRIPTOR,
          sessionId: "session-detached",
          state: "Detached",
        },
      ],
      attachments: [DEFAULT_ATTACHMENT_DESCRIPTOR],
    }),
  );

  assert.match(summary, /runtime truth/);
  assert.match(summary, /2 sessions/);
  assert.match(summary, /1 reattach required/);
});

test("session center snapshot preserves replay preview for each runtime session", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    attachments: [DEFAULT_ATTACHMENT_DESCRIPTOR],
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
        fromCursor: null,
        nextCursor: "2",
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
        ],
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replayPreview, {
    entryCount: 2,
    nextCursor: "2",
    hasMore: false,
    latestEntry: {
      sequence: 2,
      kind: "output",
      payload: "/workspace",
      occurredAt: "2026-04-09T00:00:21.000Z",
    },
  });
});

test("session center snapshot preserves bounded replay slice for each runtime session", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    attachments: [
      {
        ...DEFAULT_ATTACHMENT_DESCRIPTOR,
        lastAckSequence: 11,
      },
    ],
    observedAt: "2026-04-09T00:00:25.000Z",
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
        fromCursor: null,
        nextCursor: "3",
        hasMore: true,
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
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replaySlice, {
    sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
    fromCursor: null,
    nextCursor: "3",
    hasMore: true,
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
  });
});

test("session center snapshot derives replay status from bounded replay slice", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    attachments: [
      {
        ...DEFAULT_ATTACHMENT_DESCRIPTOR,
        lastAckSequence: 11,
      },
    ],
    observedAt: "2026-04-09T00:00:25.000Z",
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
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
            sequence: 10,
            kind: "output",
            payload: "/workspace",
            occurredAt: "2026-04-09T00:00:21.000Z",
          },
          {
            sequence: 13,
            kind: "warning",
            payload: "permission denied",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
        ],
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replayStatus, {
    state: "loaded",
    summary: "replay window 9-13 / 3 entries +",
    fromCursor: "8",
    nextCursor: "13",
    hasMore: true,
    entryCount: 3,
    firstSequence: 9,
    lastSequence: 13,
    error: null,
  });
  assert.deepEqual(snapshot.sessions[0]?.replayCursor, {
    fromCursor: "8",
    firstSequence: 9,
    lastSequence: 13,
    nextCursor: "13",
    hasMore: true,
    summary: "cursor 8 -> 9-13 / next 13 +",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayCursorDrift, {
    driftCount: 0,
    fromCursor: "8",
    expectedSequence: 9,
    firstSequence: 9,
    summary: "cursor drift aligned / expected 9 / first 9",
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
  assert.deepEqual(snapshot.sessions[0]?.replayLatestState, {
    state: "running",
    phase: null,
    sequence: 9,
    occurredAt: "2026-04-09T00:00:20.000Z",
    summary: "latest state running / seq 9",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateLag, {
    lagCount: 4,
    latestStateSequence: 9,
    latestSequence: 13,
    summary: "state lag 4 / state 9 / latest 13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateFreshness, {
    level: "fresh",
    observedAt: "2026-04-09T00:00:25.000Z",
    latestOccurredAt: "2026-04-09T00:00:20.000Z",
    latestSequence: 9,
    ageSeconds: 5,
    summary: "state freshness fresh / age 5s / seq 9",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateAck, {
    position: "covered",
    deltaCount: 2,
    lastAckSequence: 11,
    latestStateSequence: 9,
    summary: "state ack covered +2 / ack 11 / state 9",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateOutputDelta, {
    relation: "output-ahead",
    deltaCount: 1,
    latestStateSequence: 9,
    latestOutputSequence: 10,
    summary: "state/output output+1 / state 9 / output 10",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayLatestOutput, {
    payload: "/workspace",
    sequence: 10,
    occurredAt: "2026-04-09T00:00:21.000Z",
    summary: "latest output /workspace / seq 10",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayOutputLag, {
    lagCount: 3,
    latestOutputSequence: 10,
    latestSequence: 13,
    summary: "output lag 3 / output 10 / latest 13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayOutputAck, {
    position: "covered",
    deltaCount: 1,
    lastAckSequence: 11,
    latestOutputSequence: 10,
    summary: "output ack covered +1 / ack 11 / output 10",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayHealth, {
    level: "degraded",
    warningCount: 1,
    latestExitCode: null,
    latestState: "running",
    summary: "health degraded / 1 warning / state running",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayLatestWarning, {
    message: "permission denied",
    sequence: 13,
    occurredAt: "2026-04-09T00:00:22.000Z",
    summary: "latest warning permission denied / seq 13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayFreshness, {
    level: "fresh",
    observedAt: "2026-04-09T00:00:25.000Z",
    latestOccurredAt: "2026-04-09T00:00:22.000Z",
    latestSequence: 13,
    ageSeconds: 3,
    summary: "freshness fresh / age 3s / seq 13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayGap, {
    largestGapSeconds: 1,
    fromSequence: 9,
    toSequence: 10,
    fromOccurredAt: "2026-04-09T00:00:20.000Z",
    toOccurredAt: "2026-04-09T00:00:21.000Z",
    summary: "gap max 1s / seq 9-10",
  });
  assert.deepEqual(snapshot.sessions[0]?.replaySequenceGap, {
    missingCount: 2,
    fromSequence: 10,
    toSequence: 13,
    summary: "seq gap max 2 / seq 10-13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayTimeline, {
    firstOccurredAt: "2026-04-09T00:00:20.000Z",
    lastOccurredAt: "2026-04-09T00:00:22.000Z",
    entryCount: 3,
    summary: "timeline 2026-04-09T00:00:20.000Z -> 2026-04-09T00:00:22.000Z / 3 events",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayMix, {
    counts: {
      output: 1,
      state: 1,
      warning: 1,
    },
    summary: "mix output=1, state=1, warning=1",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayEvidence, {
    warningCount: 1,
    latestWarning: "permission denied",
    latestWarningSequence: 13,
    exitCount: 0,
    latestExitCode: null,
    latestExitSequence: null,
    summary: "evidence warning#13 permission denied",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayEvidenceAck, {
    position: "lagging",
    deltaCount: 2,
    lastAckSequence: 11,
    latestEvidenceSequence: 13,
    summary: "evidence ack lag 2 / ack 11 / evidence 13",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayEvidenceFreshness, {
    level: "fresh",
    observedAt: "2026-04-09T00:00:25.000Z",
    latestOccurredAt: "2026-04-09T00:00:22.000Z",
    latestSequence: 13,
    ageSeconds: 3,
    summary: "evidence freshness fresh / age 3s / seq 13",
  });
  assert.equal(snapshot.sessions[0]?.replayLatestExit, undefined);
});

test("session center snapshot derives replay state ack when attachment ack trails latest state", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    attachments: [
      {
        ...DEFAULT_ATTACHMENT_DESCRIPTOR,
        lastAckSequence: 1,
      },
    ],
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
        fromCursor: null,
        nextCursor: "4",
        hasMore: false,
        entries: [
          {
            sequence: 2,
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
          {
            sequence: 3,
            kind: "output",
            payload: "/workspace",
            occurredAt: "2026-04-09T00:00:21.000Z",
          },
          {
            sequence: 4,
            kind: "state",
            payload: "{\"state\":\"running\",\"phase\":\"steady\"}",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
        ],
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replayStateAck, {
    position: "lagging",
    deltaCount: 3,
    lastAckSequence: 1,
    latestStateSequence: 4,
    summary: "state ack lag 3 / ack 1 / state 4",
  });
});

test("session center snapshot derives replay state ack when attachment ack matches latest state", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    attachments: [
      {
        ...DEFAULT_ATTACHMENT_DESCRIPTOR,
        lastAckSequence: 3,
      },
    ],
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
        fromCursor: null,
        nextCursor: "4",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"starting\"}",
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
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
          {
            sequence: 4,
            kind: "output",
            payload: "done",
            occurredAt: "2026-04-09T00:00:23.000Z",
          },
        ],
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replayStateAck, {
    position: "aligned",
    deltaCount: 0,
    lastAckSequence: 3,
    latestStateSequence: 3,
    summary: "state ack aligned / ack 3 / state 3",
  });
});

test("session center snapshot derives replay warning and exit evidence digest", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    attachments: [
      {
        ...DEFAULT_ATTACHMENT_DESCRIPTOR,
        lastAckSequence: 3,
      },
    ],
    observedAt: "2026-04-09T00:01:02.000Z",
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
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
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replayEvidence, {
    warningCount: 1,
    latestWarning: "permission denied",
    latestWarningSequence: 2,
    exitCount: 1,
    latestExitCode: 126,
    latestExitSequence: 3,
    summary: "evidence warning#2 permission denied / exit#3 code 126",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayEvidenceAck, {
    position: "aligned",
    deltaCount: 0,
    lastAckSequence: 3,
    latestEvidenceSequence: 3,
    summary: "evidence ack aligned / ack 3 / evidence 3",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayHealth, {
    level: "failed",
    warningCount: 1,
    latestExitCode: 126,
    latestState: "running",
    summary: "health failed / exit code 126 / state running",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayLatestWarning, {
    message: "permission denied",
    sequence: 2,
    occurredAt: "2026-04-09T00:00:21.000Z",
    summary: "latest warning permission denied / seq 2",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayLatestExit, {
    exitCode: 126,
    sequence: 3,
    occurredAt: "2026-04-09T00:00:22.000Z",
    summary: "latest exit code 126 / seq 3",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayAckLag, {
    lagCount: 0,
    lastAckSequence: 3,
    latestSequence: 3,
    summary: "ack lag aligned / ack 3 / latest 3",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateAck, {
    position: "covered",
    deltaCount: 2,
    lastAckSequence: 3,
    latestStateSequence: 1,
    summary: "state ack covered +2 / ack 3 / state 1",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayFreshness, {
    level: "aging",
    observedAt: "2026-04-09T00:01:02.000Z",
    latestOccurredAt: "2026-04-09T00:00:22.000Z",
    latestSequence: 3,
    ageSeconds: 40,
    summary: "freshness aging / age 40s / seq 3",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayGap, {
    largestGapSeconds: 1,
    fromSequence: 1,
    toSequence: 2,
    fromOccurredAt: "2026-04-09T00:00:20.000Z",
    toOccurredAt: "2026-04-09T00:00:21.000Z",
    summary: "gap max 1s / seq 1-2",
  });
  assert.equal(snapshot.sessions[0]?.replaySequenceGap, undefined);
});

test("session center snapshot derives replay cursor drift when replay window skips ahead of requested cursor", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
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
            payload: "/workspace",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
        ],
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replayCursorDrift, {
    driftCount: 2,
    fromCursor: "8",
    expectedSequence: 9,
    firstSequence: 11,
    summary: "cursor drift +2 / expected 9 / first 11",
  });
});

test("session center snapshot derives replay ack window summary when attachment ack sits after bounded replay window", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    attachments: [
      {
        ...DEFAULT_ATTACHMENT_DESCRIPTOR,
        lastAckSequence: 20,
      },
    ],
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
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
            payload: "/workspace",
            occurredAt: "2026-04-09T00:00:22.000Z",
          },
        ],
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replayAckWindow, {
    position: "after-window",
    lastAckSequence: 20,
    firstSequence: 9,
    lastSequence: 13,
    summary: "ack after window / ack 20 / window 9-13",
  });
  assert.equal(snapshot.sessions[0]?.replayAckLag, undefined);
});

test("session center snapshot derives replay ready health without warnings or exits", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    observedAt: "2026-04-09T00:03:21.000Z",
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
        fromCursor: null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "/workspace",
            occurredAt: "2026-04-09T00:00:21.000Z",
          },
        ],
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replayHealth, {
    level: "ready",
    warningCount: 0,
    latestExitCode: null,
    latestState: "running",
    summary: "health ready / state running",
  });
  assert.equal(snapshot.sessions[0]?.replayLatestWarning, undefined);
  assert.equal(snapshot.sessions[0]?.replayLatestExit, undefined);
  assert.deepEqual(snapshot.sessions[0]?.replayFreshness, {
    level: "stale",
    observedAt: "2026-04-09T00:03:21.000Z",
    latestOccurredAt: "2026-04-09T00:00:21.000Z",
    latestSequence: 2,
    ageSeconds: 180,
    summary: "freshness stale / age 180s / seq 2",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateFreshness, {
    level: "stale",
    observedAt: "2026-04-09T00:03:21.000Z",
    latestOccurredAt: "2026-04-09T00:00:20.000Z",
    latestSequence: 1,
    ageSeconds: 181,
    summary: "state freshness stale / age 181s / seq 1",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateOutputDelta, {
    relation: "output-ahead",
    deltaCount: 1,
    latestStateSequence: 1,
    latestOutputSequence: 2,
    summary: "state/output output+1 / state 1 / output 2",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayGap, {
    largestGapSeconds: 1,
    fromSequence: 1,
    toSequence: 2,
    fromOccurredAt: "2026-04-09T00:00:20.000Z",
    toOccurredAt: "2026-04-09T00:00:21.000Z",
    summary: "gap max 1s / seq 1-2",
  });
  assert.equal(snapshot.sessions[0]?.replaySequenceGap, undefined);
});

test("session center snapshot derives replay output freshness from latest output instead of latest replay event", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    attachments: [
      {
        ...DEFAULT_ATTACHMENT_DESCRIPTOR,
        lastAckSequence: 2,
      },
    ],
    observedAt: "2026-04-09T00:01:00.000Z",
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
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
      },
    ],
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
  assert.deepEqual(snapshot.sessions[0]?.replayOutputAck, {
    position: "aligned",
    deltaCount: 0,
    lastAckSequence: 2,
    latestOutputSequence: 2,
    summary: "output ack aligned / ack 2 / output 2",
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
  assert.deepEqual(snapshot.sessions[0]?.replayStateAck, {
    position: "covered",
    deltaCount: 1,
    lastAckSequence: 2,
    latestStateSequence: 1,
    summary: "state ack covered +1 / ack 2 / state 1",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayEvidenceAck, {
    position: "lagging",
    deltaCount: 1,
    lastAckSequence: 2,
    latestEvidenceSequence: 3,
    summary: "evidence ack lag 1 / ack 2 / evidence 3",
  });
  assert.deepEqual(snapshot.sessions[0]?.replayStateOutputDelta, {
    relation: "output-ahead",
    deltaCount: 1,
    latestStateSequence: 1,
    latestOutputSequence: 2,
    summary: "state/output output+1 / state 1 / output 2",
  });
});

test("session center snapshot derives replay evidence freshness from latest warning-exit evidence instead of latest replay event", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    observedAt: "2026-04-09T00:01:00.000Z",
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
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
      },
    ],
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

test("session center snapshot derives replay state/output delta when latest state is newer than latest output", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    replays: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
        fromCursor: null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "/workspace",
            occurredAt: "2026-04-09T00:00:20.000Z",
          },
          {
            sequence: 2,
            kind: "state",
            payload: "{\"state\":\"running\"}",
            occurredAt: "2026-04-09T00:00:21.000Z",
          },
        ],
      },
    ],
  });

  assert.deepEqual(snapshot.sessions[0]?.replayStateOutputDelta, {
    relation: "state-ahead",
    deltaCount: 1,
    latestStateSequence: 2,
    latestOutputSequence: 1,
    summary: "state/output state+1 / state 2 / output 1",
  });
});

test("session center snapshot preserves replay unavailability diagnostics", () => {
  const snapshot = createSessionCenterSnapshot({
    sessions: [DEFAULT_SESSION_DESCRIPTOR],
    replayFailures: [
      {
        sessionId: DEFAULT_SESSION_DESCRIPTOR.sessionId,
        error: "desktop_session_replay_slice unavailable",
      },
    ],
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
  assert.equal(snapshot.sessions[0]?.replayCursorDrift, undefined);
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
  assert.equal(snapshot.sessions[0]?.replayOutputFreshness, undefined);
  assert.equal(snapshot.sessions[0]?.replayOutputLag, undefined);
  assert.equal(snapshot.sessions[0]?.replayOutputAck, undefined);
  assert.equal(snapshot.sessions[0]?.replayGap, undefined);
  assert.equal(snapshot.sessions[0]?.replaySequenceGap, undefined);
  assert.equal(snapshot.sessions[0]?.replayTimeline, undefined);
  assert.equal(snapshot.sessions[0]?.replayMix, undefined);
  assert.equal(snapshot.sessions[0]?.replayEvidence, undefined);
  assert.equal(snapshot.sessions[0]?.replayEvidenceAck, undefined);
  assert.equal(snapshot.sessions[0]?.replayEvidenceFreshness, undefined);
});
