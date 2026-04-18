import {
  DEFAULT_ATTACHMENT_DESCRIPTOR,
  DEFAULT_SESSION_DESCRIPTOR,
} from "@sdkwork/terminal-contracts";
import type {
  SessionAttachmentDescriptor,
  SessionDescriptor,
} from "@sdkwork/terminal-types";

export type SessionAttachmentState =
  | "attached"
  | "reattach-required"
  | "idle";

export interface SessionReplayEntry {
  sequence: number;
  kind: string;
  payload: string;
  occurredAt: string;
}

export interface SessionReplaySlice {
  sessionId: string;
  fromCursor: string | null;
  nextCursor: string;
  hasMore: boolean;
  entries: SessionReplayEntry[];
}

export interface SessionReplayFailure {
  sessionId: string;
  error: string;
  reason?: "error" | "deferred";
}

export interface SessionReplayPreview {
  entryCount: number;
  nextCursor: string;
  hasMore: boolean;
  latestEntry: SessionReplayEntry | null;
}

export interface SessionReplayStatus {
  state: "loaded" | "unavailable" | "deferred";
  summary: string;
  fromCursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  entryCount: number;
  firstSequence: number | null;
  lastSequence: number | null;
  error: string | null;
}

export interface SessionReplayCursor {
  fromCursor: string | null;
  firstSequence: number | null;
  lastSequence: number | null;
  nextCursor: string;
  hasMore: boolean;
  summary: string;
}

export interface SessionReplayCursorDrift {
  driftCount: number;
  fromCursor: string;
  expectedSequence: number;
  firstSequence: number;
  summary: string;
}

export interface SessionReplayAckLag {
  lagCount: number;
  lastAckSequence: number;
  latestSequence: number;
  summary: string;
}

export interface SessionReplayAckWindow {
  position: "before-window" | "within-window" | "after-window";
  lastAckSequence: number;
  firstSequence: number;
  lastSequence: number;
  summary: string;
}

export interface SessionReplayWindowCoverage {
  position: "full" | "head" | "middle" | "tail";
  fromCursor: string | null;
  nextCursor: string;
  firstSequence: number;
  lastSequence: number;
  hasMore: boolean;
  summary: string;
}

export interface SessionReplayLatestState {
  state: string | null;
  phase: string | null;
  sequence: number;
  occurredAt: string;
  summary: string;
}

export interface SessionReplayStateLag {
  lagCount: number;
  latestStateSequence: number;
  latestSequence: number;
  summary: string;
}

export interface SessionReplayStateFreshness {
  level: "fresh" | "aging" | "stale";
  observedAt: string;
  latestOccurredAt: string;
  latestSequence: number;
  ageSeconds: number;
  summary: string;
}

export interface SessionReplayStateAck {
  position: "lagging" | "aligned" | "covered";
  deltaCount: number;
  lastAckSequence: number;
  latestStateSequence: number;
  summary: string;
}

export interface SessionReplayStateOutputDelta {
  relation: "aligned" | "state-ahead" | "output-ahead";
  deltaCount: number;
  latestStateSequence: number;
  latestOutputSequence: number;
  summary: string;
}

export interface SessionReplayLatestOutput {
  payload: string;
  sequence: number;
  occurredAt: string;
  summary: string;
}

export interface SessionReplayOutputLag {
  lagCount: number;
  latestOutputSequence: number;
  latestSequence: number;
  summary: string;
}

export interface SessionReplayOutputAck {
  position: "lagging" | "aligned" | "covered";
  deltaCount: number;
  lastAckSequence: number;
  latestOutputSequence: number;
  summary: string;
}

export interface SessionReplayHealth {
  level: "ready" | "degraded" | "failed" | "unknown";
  warningCount: number;
  latestExitCode: number | null;
  latestState: string | null;
  summary: string;
}

export interface SessionReplayLatestWarning {
  message: string;
  sequence: number;
  occurredAt: string;
  summary: string;
}

export interface SessionReplayLatestExit {
  exitCode: number | null;
  sequence: number;
  occurredAt: string;
  summary: string;
}

export interface SessionReplayFreshness {
  level: "fresh" | "aging" | "stale";
  observedAt: string;
  latestOccurredAt: string;
  latestSequence: number;
  ageSeconds: number;
  summary: string;
}

export interface SessionReplayOutputFreshness {
  level: "fresh" | "aging" | "stale";
  observedAt: string;
  latestOccurredAt: string;
  latestSequence: number;
  ageSeconds: number;
  summary: string;
}

export interface SessionReplayGap {
  largestGapSeconds: number;
  fromSequence: number;
  toSequence: number;
  fromOccurredAt: string;
  toOccurredAt: string;
  summary: string;
}

export interface SessionReplaySequenceGap {
  missingCount: number;
  fromSequence: number;
  toSequence: number;
  summary: string;
}

export interface SessionReplayTimeline {
  firstOccurredAt: string | null;
  lastOccurredAt: string | null;
  entryCount: number;
  summary: string;
}

export interface SessionReplayMix {
  counts: Record<string, number>;
  summary: string;
}

export interface SessionReplayEvidence {
  warningCount: number;
  latestWarning: string | null;
  latestWarningSequence: number | null;
  exitCount: number;
  latestExitCode: number | null;
  latestExitSequence: number | null;
  summary: string;
}

export interface SessionReplayEvidenceAck {
  position: "lagging" | "aligned" | "covered";
  deltaCount: number;
  lastAckSequence: number;
  latestEvidenceSequence: number;
  summary: string;
}

export interface SessionReplayEvidenceFreshness {
  level: "fresh" | "aging" | "stale";
  observedAt: string;
  latestOccurredAt: string;
  latestSequence: number;
  ageSeconds: number;
  summary: string;
}

export interface SessionCenterSession {
  sessionId: string;
  workspaceId: string;
  target: string;
  state: SessionDescriptor["state"];
  tags: string[];
  attachmentState: SessionAttachmentState;
  lastAckSequence: number;
  replayPreview?: SessionReplayPreview;
  replaySlice?: SessionReplaySlice;
  replayStatus?: SessionReplayStatus;
  replayCursor?: SessionReplayCursor;
  replayCursorDrift?: SessionReplayCursorDrift;
  replayAckLag?: SessionReplayAckLag;
  replayAckWindow?: SessionReplayAckWindow;
  replayWindowCoverage?: SessionReplayWindowCoverage;
  replayLatestState?: SessionReplayLatestState;
  replayStateLag?: SessionReplayStateLag;
  replayStateFreshness?: SessionReplayStateFreshness;
  replayStateAck?: SessionReplayStateAck;
  replayStateOutputDelta?: SessionReplayStateOutputDelta;
  replayLatestOutput?: SessionReplayLatestOutput;
  replayOutputLag?: SessionReplayOutputLag;
  replayOutputAck?: SessionReplayOutputAck;
  replayHealth?: SessionReplayHealth;
  replayLatestWarning?: SessionReplayLatestWarning;
  replayLatestExit?: SessionReplayLatestExit;
  replayFreshness?: SessionReplayFreshness;
  replayOutputFreshness?: SessionReplayOutputFreshness;
  replayGap?: SessionReplayGap;
  replaySequenceGap?: SessionReplaySequenceGap;
  replayTimeline?: SessionReplayTimeline;
  replayMix?: SessionReplayMix;
  replayEvidence?: SessionReplayEvidence;
  replayEvidenceAck?: SessionReplayEvidenceAck;
  replayEvidenceFreshness?: SessionReplayEvidenceFreshness;
}

export interface SessionCenterSnapshot {
  counts: {
    totalSessions: number;
    attachedSessions: number;
    reattachableSessions: number;
    loadedReplayCount: number;
    deferredReplayCount: number;
    unavailableReplayCount: number;
  };
  sessions: SessionCenterSession[];
}

export interface CreateSessionCenterSnapshotOptions {
  sessions: SessionDescriptor[];
  attachments?: SessionAttachmentDescriptor[];
  replays?: SessionReplaySlice[];
  replayFailures?: SessionReplayFailure[];
  observedAt?: string;
}

function getAttachmentState(
  session: SessionDescriptor,
  attachment: SessionAttachmentDescriptor | undefined,
): SessionAttachmentState {
  if (attachment?.writable) {
    return "attached";
  }

  if (session.state === "Detached") {
    return "reattach-required";
  }

  return "idle";
}

function createReplayPreview(
  replay: SessionReplaySlice | undefined,
): SessionReplayPreview | undefined {
  if (!replay) {
    return undefined;
  }

  return {
    entryCount: replay.entries.length,
    nextCursor: replay.nextCursor,
    hasMore: replay.hasMore,
    latestEntry: replay.entries[replay.entries.length - 1] ?? null,
  };
}

function cloneReplaySlice(
  replay: SessionReplaySlice | undefined,
): SessionReplaySlice | undefined {
  if (!replay) {
    return undefined;
  }

  return {
    sessionId: replay.sessionId,
    fromCursor: replay.fromCursor,
    nextCursor: replay.nextCursor,
    hasMore: replay.hasMore,
    entries: replay.entries.map((entry) => ({
      sequence: entry.sequence,
      kind: entry.kind,
      payload: entry.payload,
      occurredAt: entry.occurredAt,
    })),
  };
}

function createReplayStatus(
  replay: SessionReplaySlice | undefined,
  failure: SessionReplayFailure | undefined,
): SessionReplayStatus | undefined {
  if (replay) {
    const firstSequence = replay.entries[0]?.sequence ?? null;
    const lastSequence = replay.entries[replay.entries.length - 1]?.sequence ?? null;
    const range = firstSequence === null || lastSequence === null
      ? "empty"
      : `${firstSequence}-${lastSequence}`;
    const suffix = replay.hasMore ? " +" : "";

    return {
      state: "loaded",
      summary: `replay window ${range} / ${replay.entries.length} entries${suffix}`,
      fromCursor: replay.fromCursor,
      nextCursor: replay.nextCursor,
      hasMore: replay.hasMore,
      entryCount: replay.entries.length,
      firstSequence,
      lastSequence,
      error: null,
    };
  }

  if (!failure) {
    return undefined;
  }

  const replayDeferred =
    failure.reason === "deferred" || failure.error.startsWith("replay deferred:");
  if (replayDeferred) {
    const detail = failure.error.startsWith("replay deferred:")
      ? failure.error.slice("replay deferred:".length).trim()
      : failure.error;

    return {
      state: "deferred",
      summary: `replay deferred: ${detail}`,
      fromCursor: null,
      nextCursor: null,
      hasMore: false,
      entryCount: 0,
      firstSequence: null,
      lastSequence: null,
      error: detail,
    };
  }

  return {
    state: "unavailable",
    summary: `replay unavailable: ${failure.error}`,
    fromCursor: null,
    nextCursor: null,
    hasMore: false,
    entryCount: 0,
    firstSequence: null,
    lastSequence: null,
    error: failure.error,
  };
}

function createReplayCursor(
  replay: SessionReplaySlice | undefined,
): SessionReplayCursor | undefined {
  if (!replay) {
    return undefined;
  }

  const firstSequence = replay.entries[0]?.sequence ?? null;
  const lastSequence = replay.entries[replay.entries.length - 1]?.sequence ?? null;
  const start = replay.fromCursor ?? "start";
  const window = firstSequence === null || lastSequence === null
    ? "empty"
    : `${firstSequence}-${lastSequence}`;
  const suffix = replay.hasMore ? " +" : "";

  return {
    fromCursor: replay.fromCursor,
    firstSequence,
    lastSequence,
    nextCursor: replay.nextCursor,
    hasMore: replay.hasMore,
    summary: `cursor ${start} -> ${window} / next ${replay.nextCursor}${suffix}`,
  };
}

function parseReplayCursorSequence(cursor: string | null) {
  if (!cursor) {
    return null;
  }

  const parsed = Number.parseInt(cursor, 10);
  if (!Number.isSafeInteger(parsed) || `${parsed}` !== cursor) {
    return null;
  }

  return parsed;
}

function createReplayCursorDrift(
  replay: SessionReplaySlice | undefined,
): SessionReplayCursorDrift | undefined {
  if (!replay) {
    return undefined;
  }

  const fromCursor = replay.fromCursor;
  const firstSequence = replay.entries[0]?.sequence;
  const parsedCursor = parseReplayCursorSequence(fromCursor);
  if (fromCursor === null || firstSequence === undefined || parsedCursor === null) {
    return undefined;
  }

  const expectedSequence = parsedCursor + 1;
  if (firstSequence < expectedSequence) {
    return undefined;
  }

  const driftCount = firstSequence - expectedSequence;
  const summary = driftCount === 0
    ? `cursor drift aligned / expected ${expectedSequence} / first ${firstSequence}`
    : `cursor drift +${driftCount} / expected ${expectedSequence} / first ${firstSequence}`;

  return {
    driftCount,
    fromCursor,
    expectedSequence,
    firstSequence,
    summary,
  };
}

function createReplayAckLag(
  replay: SessionReplaySlice | undefined,
  attachment: SessionAttachmentDescriptor | undefined,
): SessionReplayAckLag | undefined {
  if (!replay || !attachment) {
    return undefined;
  }

  const latestSequence = replay.entries[replay.entries.length - 1]?.sequence;
  if (latestSequence === undefined) {
    return undefined;
  }

  const lastAckSequence = attachment.lastAckSequence;
  if (lastAckSequence > latestSequence) {
    return undefined;
  }

  const lagCount = latestSequence - lastAckSequence;
  const summary = lagCount === 0
    ? `ack lag aligned / ack ${lastAckSequence} / latest ${latestSequence}`
    : `ack lag ${lagCount} / ack ${lastAckSequence} / latest ${latestSequence}`;

  return {
    lagCount,
    lastAckSequence,
    latestSequence,
    summary,
  };
}

function createReplayAckWindow(
  replay: SessionReplaySlice | undefined,
  attachment: SessionAttachmentDescriptor | undefined,
): SessionReplayAckWindow | undefined {
  if (!replay || !attachment) {
    return undefined;
  }

  const firstSequence = replay.entries[0]?.sequence;
  const lastSequence = replay.entries[replay.entries.length - 1]?.sequence;
  if (firstSequence === undefined || lastSequence === undefined) {
    return undefined;
  }

  const lastAckSequence = attachment.lastAckSequence;
  const position = lastAckSequence < firstSequence
    ? "before-window"
    : lastAckSequence > lastSequence
      ? "after-window"
      : "within-window";
  const positionSummary = position === "before-window"
    ? "ack before window"
    : position === "after-window"
      ? "ack after window"
      : "ack in window";

  return {
    position,
    lastAckSequence,
    firstSequence,
    lastSequence,
    summary: `${positionSummary} / ack ${lastAckSequence} / window ${firstSequence}-${lastSequence}`,
  };
}

function createReplayWindowCoverage(
  replay: SessionReplaySlice | undefined,
): SessionReplayWindowCoverage | undefined {
  if (!replay) {
    return undefined;
  }

  const firstSequence = replay.entries[0]?.sequence;
  const lastSequence = replay.entries[replay.entries.length - 1]?.sequence;
  if (firstSequence === undefined || lastSequence === undefined) {
    return undefined;
  }

  const position = replay.fromCursor === null
    ? replay.hasMore
      ? "head"
      : "full"
    : replay.hasMore
      ? "middle"
      : "tail";
  const start = replay.fromCursor === null ? "start" : `after ${replay.fromCursor}`;
  const suffix = replay.hasMore ? " / more ahead" : "";

  return {
    position,
    fromCursor: replay.fromCursor,
    nextCursor: replay.nextCursor,
    firstSequence,
    lastSequence,
    hasMore: replay.hasMore,
    summary: `coverage ${position} / ${start} -> ${firstSequence}-${lastSequence}${suffix}`,
  };
}

function parseReplayStatePayload(payload: string) {
  try {
    const parsed = JSON.parse(payload) as {
      state?: unknown;
      phase?: unknown;
    };

    return {
      state: typeof parsed.state === "string" ? parsed.state : null,
      phase: typeof parsed.phase === "string" ? parsed.phase : null,
    };
  } catch {
    return {
      state: null,
      phase: null,
    };
  }
}

function createReplayLatestState(
  replay: SessionReplaySlice | undefined,
): SessionReplayLatestState | undefined {
  if (!replay) {
    return undefined;
  }

  const latestStateEntry = replay.entries.filter((entry) => entry.kind === "state").at(-1);
  if (!latestStateEntry) {
    return undefined;
  }

  const payload = parseReplayStatePayload(latestStateEntry.payload);
  const state = payload.state ?? summarizeReplayPayload(latestStateEntry.payload);
  const phaseSummary = payload.phase ? ` / phase ${payload.phase}` : "";

  return {
    state: payload.state,
    phase: payload.phase,
    sequence: latestStateEntry.sequence,
    occurredAt: latestStateEntry.occurredAt,
    summary: `latest state ${state}${phaseSummary} / seq ${latestStateEntry.sequence}`,
  };
}

function createReplayStateLag(
  replay: SessionReplaySlice | undefined,
): SessionReplayStateLag | undefined {
  if (!replay) {
    return undefined;
  }

  const latestSequence = replay.entries[replay.entries.length - 1]?.sequence;
  const latestStateSequence = replay.entries.filter((entry) => entry.kind === "state").at(-1)
    ?.sequence;
  if (latestSequence === undefined || latestStateSequence === undefined) {
    return undefined;
  }

  if (latestStateSequence > latestSequence) {
    return undefined;
  }

  const lagCount = latestSequence - latestStateSequence;
  const summary = lagCount === 0
    ? `state lag aligned / state ${latestStateSequence} / latest ${latestSequence}`
    : `state lag ${lagCount} / state ${latestStateSequence} / latest ${latestSequence}`;

  return {
    lagCount,
    latestStateSequence,
    latestSequence,
    summary,
  };
}

function createReplayStateFreshness(
  replay: SessionReplaySlice | undefined,
  observedAt: string | undefined,
): SessionReplayStateFreshness | undefined {
  if (!replay) {
    return undefined;
  }

  return createReplayFreshnessProjection(
    replay.entries.filter((entry) => entry.kind === "state").at(-1),
    observedAt,
    "state freshness",
  ) as SessionReplayStateFreshness | undefined;
}

function createReplayStateAck(
  latestState: SessionReplayLatestState | undefined,
  attachment: SessionAttachmentDescriptor | undefined,
): SessionReplayStateAck | undefined {
  if (!latestState || !attachment) {
    return undefined;
  }

  const lastAckSequence = attachment.lastAckSequence;
  if (lastAckSequence < latestState.sequence) {
    const deltaCount = latestState.sequence - lastAckSequence;

    return {
      position: "lagging",
      deltaCount,
      lastAckSequence,
      latestStateSequence: latestState.sequence,
      summary: `state ack lag ${deltaCount} / ack ${lastAckSequence} / state ${latestState.sequence}`,
    };
  }

  if (lastAckSequence === latestState.sequence) {
    return {
      position: "aligned",
      deltaCount: 0,
      lastAckSequence,
      latestStateSequence: latestState.sequence,
      summary: `state ack aligned / ack ${lastAckSequence} / state ${latestState.sequence}`,
    };
  }

  const deltaCount = lastAckSequence - latestState.sequence;

  return {
    position: "covered",
    deltaCount,
    lastAckSequence,
    latestStateSequence: latestState.sequence,
    summary: `state ack covered +${deltaCount} / ack ${lastAckSequence} / state ${latestState.sequence}`,
  };
}

function createReplayStateOutputDelta(
  latestState: SessionReplayLatestState | undefined,
  latestOutput: SessionReplayLatestOutput | undefined,
): SessionReplayStateOutputDelta | undefined {
  if (!latestState || !latestOutput) {
    return undefined;
  }

  if (latestState.sequence === latestOutput.sequence) {
    return {
      relation: "aligned",
      deltaCount: 0,
      latestStateSequence: latestState.sequence,
      latestOutputSequence: latestOutput.sequence,
      summary: `state/output aligned / state ${latestState.sequence} / output ${latestOutput.sequence}`,
    };
  }

  const relation = latestState.sequence > latestOutput.sequence
    ? "state-ahead"
    : "output-ahead";
  const deltaCount = Math.abs(latestState.sequence - latestOutput.sequence);
  const relationSummary = relation === "state-ahead"
    ? `state+${deltaCount}`
    : `output+${deltaCount}`;

  return {
    relation,
    deltaCount,
    latestStateSequence: latestState.sequence,
    latestOutputSequence: latestOutput.sequence,
    summary: `state/output ${relationSummary} / state ${latestState.sequence} / output ${latestOutput.sequence}`,
  };
}

function createReplayLatestOutput(
  replay: SessionReplaySlice | undefined,
): SessionReplayLatestOutput | undefined {
  if (!replay) {
    return undefined;
  }

  const latestOutputEntry = replay.entries.filter((entry) => entry.kind === "output").at(-1);
  if (!latestOutputEntry) {
    return undefined;
  }

  const payload = summarizeReplayPayload(latestOutputEntry.payload);

  return {
    payload,
    sequence: latestOutputEntry.sequence,
    occurredAt: latestOutputEntry.occurredAt,
    summary: `latest output ${payload} / seq ${latestOutputEntry.sequence}`,
  };
}

function createReplayOutputLag(
  replay: SessionReplaySlice | undefined,
): SessionReplayOutputLag | undefined {
  if (!replay) {
    return undefined;
  }

  const latestSequence = replay.entries[replay.entries.length - 1]?.sequence;
  const latestOutputSequence = replay.entries.filter((entry) => entry.kind === "output").at(-1)
    ?.sequence;
  if (latestSequence === undefined || latestOutputSequence === undefined) {
    return undefined;
  }

  if (latestOutputSequence > latestSequence) {
    return undefined;
  }

  const lagCount = latestSequence - latestOutputSequence;
  const summary = lagCount === 0
    ? `output lag aligned / output ${latestOutputSequence} / latest ${latestSequence}`
    : `output lag ${lagCount} / output ${latestOutputSequence} / latest ${latestSequence}`;

  return {
    lagCount,
    latestOutputSequence,
    latestSequence,
    summary,
  };
}

function createReplayOutputAck(
  replay: SessionReplaySlice | undefined,
  attachment: SessionAttachmentDescriptor | undefined,
): SessionReplayOutputAck | undefined {
  if (!replay || !attachment) {
    return undefined;
  }

  const latestOutputSequence = replay.entries.filter((entry) => entry.kind === "output").at(-1)
    ?.sequence;
  if (latestOutputSequence === undefined) {
    return undefined;
  }

  const lastAckSequence = attachment.lastAckSequence;
  if (lastAckSequence < latestOutputSequence) {
    const deltaCount = latestOutputSequence - lastAckSequence;

    return {
      position: "lagging",
      deltaCount,
      lastAckSequence,
      latestOutputSequence,
      summary: `output ack lag ${deltaCount} / ack ${lastAckSequence} / output ${latestOutputSequence}`,
    };
  }

  if (lastAckSequence === latestOutputSequence) {
    return {
      position: "aligned",
      deltaCount: 0,
      lastAckSequence,
      latestOutputSequence,
      summary: `output ack aligned / ack ${lastAckSequence} / output ${latestOutputSequence}`,
    };
  }

  const deltaCount = lastAckSequence - latestOutputSequence;

  return {
    position: "covered",
    deltaCount,
    lastAckSequence,
    latestOutputSequence,
    summary: `output ack covered +${deltaCount} / ack ${lastAckSequence} / output ${latestOutputSequence}`,
  };
}

function createReplayLatestWarning(
  replay: SessionReplaySlice | undefined,
): SessionReplayLatestWarning | undefined {
  if (!replay) {
    return undefined;
  }

  const latestWarningEntry = replay.entries.filter((entry) => entry.kind === "warning").at(-1);
  if (!latestWarningEntry) {
    return undefined;
  }

  const message = summarizeReplayPayload(latestWarningEntry.payload);

  return {
    message,
    sequence: latestWarningEntry.sequence,
    occurredAt: latestWarningEntry.occurredAt,
    summary: `latest warning ${message} / seq ${latestWarningEntry.sequence}`,
  };
}

function createReplayLatestExit(
  replay: SessionReplaySlice | undefined,
): SessionReplayLatestExit | undefined {
  if (!replay) {
    return undefined;
  }

  const latestExitEntry = replay.entries.filter((entry) => entry.kind === "exit").at(-1);
  if (!latestExitEntry) {
    return undefined;
  }

  const exitCode = parseExitCode(latestExitEntry.payload);
  const exitLabel = exitCode ?? "unknown";

  return {
    exitCode,
    sequence: latestExitEntry.sequence,
    occurredAt: latestExitEntry.occurredAt,
    summary: `latest exit code ${exitLabel} / seq ${latestExitEntry.sequence}`,
  };
}

function createReplayFreshnessProjection(
  latestEntry: SessionReplayEntry | undefined,
  observedAt: string | undefined,
  summaryPrefix: string,
): SessionReplayFreshness | SessionReplayOutputFreshness | undefined {
  if (!latestEntry || !observedAt) {
    return undefined;
  }

  const observedAtMilliseconds = Date.parse(observedAt);
  const latestOccurredAtMilliseconds = Date.parse(latestEntry.occurredAt);
  if (Number.isNaN(observedAtMilliseconds) || Number.isNaN(latestOccurredAtMilliseconds)) {
    return undefined;
  }

  const ageSeconds = Math.max(
    0,
    Math.floor((observedAtMilliseconds - latestOccurredAtMilliseconds) / 1000),
  );
  const level = ageSeconds <= 15
    ? "fresh"
    : ageSeconds <= 60
      ? "aging"
      : "stale";

  return {
    level,
    observedAt,
    latestOccurredAt: latestEntry.occurredAt,
    latestSequence: latestEntry.sequence,
    ageSeconds,
    summary: `${summaryPrefix} ${level} / age ${ageSeconds}s / seq ${latestEntry.sequence}`,
  };
}

function createReplayFreshness(
  replay: SessionReplaySlice | undefined,
  observedAt: string | undefined,
): SessionReplayFreshness | undefined {
  if (!replay) {
    return undefined;
  }

  return createReplayFreshnessProjection(
    replay.entries[replay.entries.length - 1],
    observedAt,
    "freshness",
  );
}

function createReplayOutputFreshness(
  replay: SessionReplaySlice | undefined,
  observedAt: string | undefined,
): SessionReplayOutputFreshness | undefined {
  if (!replay) {
    return undefined;
  }

  return createReplayFreshnessProjection(
    replay.entries.filter((entry) => entry.kind === "output").at(-1),
    observedAt,
    "output freshness",
  );
}

function createReplayGap(
  replay: SessionReplaySlice | undefined,
): SessionReplayGap | undefined {
  if (!replay || replay.entries.length < 2) {
    return undefined;
  }

  let largestGap: SessionReplayGap | undefined;
  for (let index = 0; index < replay.entries.length - 1; index += 1) {
    const currentEntry = replay.entries[index];
    const nextEntry = replay.entries[index + 1];
    if (!currentEntry || !nextEntry) {
      continue;
    }

    const currentOccurredAtMilliseconds = Date.parse(currentEntry.occurredAt);
    const nextOccurredAtMilliseconds = Date.parse(nextEntry.occurredAt);
    if (Number.isNaN(currentOccurredAtMilliseconds) || Number.isNaN(nextOccurredAtMilliseconds)) {
      continue;
    }

    const largestGapSeconds = Math.max(
      0,
      Math.floor((nextOccurredAtMilliseconds - currentOccurredAtMilliseconds) / 1000),
    );
    if (largestGap && largestGapSeconds <= largestGap.largestGapSeconds) {
      continue;
    }

    largestGap = {
      largestGapSeconds,
      fromSequence: currentEntry.sequence,
      toSequence: nextEntry.sequence,
      fromOccurredAt: currentEntry.occurredAt,
      toOccurredAt: nextEntry.occurredAt,
      summary: `gap max ${largestGapSeconds}s / seq ${currentEntry.sequence}-${nextEntry.sequence}`,
    };
  }

  return largestGap;
}

function createReplaySequenceGap(
  replay: SessionReplaySlice | undefined,
): SessionReplaySequenceGap | undefined {
  if (!replay || replay.entries.length < 2) {
    return undefined;
  }

  let largestGap: SessionReplaySequenceGap | undefined;
  for (let index = 0; index < replay.entries.length - 1; index += 1) {
    const currentEntry = replay.entries[index];
    const nextEntry = replay.entries[index + 1];
    if (!currentEntry || !nextEntry) {
      continue;
    }

    const missingCount = Math.max(0, nextEntry.sequence - currentEntry.sequence - 1);
    if (missingCount === 0) {
      continue;
    }

    if (largestGap && missingCount <= largestGap.missingCount) {
      continue;
    }

    largestGap = {
      missingCount,
      fromSequence: currentEntry.sequence,
      toSequence: nextEntry.sequence,
      summary: `seq gap max ${missingCount} / seq ${currentEntry.sequence}-${nextEntry.sequence}`,
    };
  }

  return largestGap;
}

function createReplayTimeline(
  replay: SessionReplaySlice | undefined,
): SessionReplayTimeline | undefined {
  if (!replay) {
    return undefined;
  }

  const firstOccurredAt = replay.entries[0]?.occurredAt ?? null;
  const lastOccurredAt = replay.entries[replay.entries.length - 1]?.occurredAt ?? null;
  const start = firstOccurredAt ?? "unknown";
  const end = lastOccurredAt ?? "unknown";

  return {
    firstOccurredAt,
    lastOccurredAt,
    entryCount: replay.entries.length,
    summary: `timeline ${start} -> ${end} / ${replay.entries.length} events`,
  };
}

function createReplayMix(
  replay: SessionReplaySlice | undefined,
): SessionReplayMix | undefined {
  if (!replay) {
    return undefined;
  }

  const counts: Record<string, number> = {};
  for (const entry of replay.entries) {
    counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  }

  const sortedKinds = Object.keys(counts).sort();
  const summary = sortedKinds
    .map((kind) => `${kind}=${counts[kind]}`)
    .join(", ");

  return {
    counts,
    summary: `mix ${summary}`,
  };
}

function summarizeReplayPayload(payload: string) {
  return payload.length > 72 ? `${payload.slice(0, 69)}...` : payload;
}

function parseExitCode(payload: string) {
  try {
    const parsed = JSON.parse(payload) as { exitCode?: unknown };
    return typeof parsed.exitCode === "number" ? parsed.exitCode : null;
  } catch {
    return null;
  }
}

function createReplayEvidence(
  replay: SessionReplaySlice | undefined,
): SessionReplayEvidence | undefined {
  if (!replay) {
    return undefined;
  }

  const warningEntries = replay.entries.filter((entry) => entry.kind === "warning");
  const exitEntries = replay.entries.filter((entry) => entry.kind === "exit");

  if (!warningEntries.length && !exitEntries.length) {
    return undefined;
  }

  const latestWarningEntry = warningEntries[warningEntries.length - 1] ?? null;
  const latestExitEntry = exitEntries[exitEntries.length - 1] ?? null;
  const latestWarning = latestWarningEntry
    ? summarizeReplayPayload(latestWarningEntry.payload)
    : null;
  const latestExitCode = latestExitEntry ? parseExitCode(latestExitEntry.payload) : null;
  const parts = [
    latestWarningEntry
      ? `warning#${latestWarningEntry.sequence} ${latestWarning}`
      : null,
    latestExitEntry
      ? `exit#${latestExitEntry.sequence} code ${latestExitCode ?? "unknown"}`
      : null,
  ].filter((part): part is string => part !== null);

  return {
    warningCount: warningEntries.length,
    latestWarning,
    latestWarningSequence: latestWarningEntry?.sequence ?? null,
    exitCount: exitEntries.length,
    latestExitCode,
    latestExitSequence: latestExitEntry?.sequence ?? null,
    summary: `evidence ${parts.join(" / ")}`,
  };
}

function createReplayEvidenceAck(
  evidence: SessionReplayEvidence | undefined,
  attachment: SessionAttachmentDescriptor | undefined,
): SessionReplayEvidenceAck | undefined {
  if (!evidence || !attachment) {
    return undefined;
  }

  const latestEvidenceSequence = Math.max(
    evidence.latestWarningSequence ?? 0,
    evidence.latestExitSequence ?? 0,
  );
  if (latestEvidenceSequence <= 0) {
    return undefined;
  }

  const lastAckSequence = attachment.lastAckSequence;
  if (lastAckSequence < latestEvidenceSequence) {
    const deltaCount = latestEvidenceSequence - lastAckSequence;

    return {
      position: "lagging",
      deltaCount,
      lastAckSequence,
      latestEvidenceSequence,
      summary: `evidence ack lag ${deltaCount} / ack ${lastAckSequence} / evidence ${latestEvidenceSequence}`,
    };
  }

  if (lastAckSequence === latestEvidenceSequence) {
    return {
      position: "aligned",
      deltaCount: 0,
      lastAckSequence,
      latestEvidenceSequence,
      summary: `evidence ack aligned / ack ${lastAckSequence} / evidence ${latestEvidenceSequence}`,
    };
  }

  const deltaCount = lastAckSequence - latestEvidenceSequence;

  return {
    position: "covered",
    deltaCount,
    lastAckSequence,
    latestEvidenceSequence,
    summary: `evidence ack covered +${deltaCount} / ack ${lastAckSequence} / evidence ${latestEvidenceSequence}`,
  };
}

function createReplayEvidenceFreshness(
  replay: SessionReplaySlice | undefined,
  observedAt: string | undefined,
): SessionReplayEvidenceFreshness | undefined {
  if (!replay) {
    return undefined;
  }

  return createReplayFreshnessProjection(
    replay.entries.filter((entry) => entry.kind === "warning" || entry.kind === "exit").at(-1),
    observedAt,
    "evidence freshness",
  ) as SessionReplayEvidenceFreshness | undefined;
}

function createReplayHealth(
  latestState: SessionReplayLatestState | undefined,
  evidence: SessionReplayEvidence | undefined,
  failure: SessionReplayFailure | undefined,
): SessionReplayHealth {
  if (failure) {
    const replayDeferred =
      failure.reason === "deferred" || failure.error.startsWith("replay deferred:");

    return {
      level: "unknown",
      warningCount: 0,
      latestExitCode: null,
      latestState: null,
      summary: replayDeferred
        ? "health unknown / replay deferred"
        : "health unknown / replay unavailable",
    };
  }

  if (evidence?.latestExitCode !== null && evidence?.latestExitCode !== undefined) {
    const stateSummary = latestState?.state ? ` / state ${latestState.state}` : "";

    return {
      level: "failed",
      warningCount: evidence.warningCount,
      latestExitCode: evidence.latestExitCode,
      latestState: latestState?.state ?? null,
      summary: `health failed / exit code ${evidence.latestExitCode}${stateSummary}`,
    };
  }

  if ((evidence?.warningCount ?? 0) > 0) {
    const warningLabel = evidence?.warningCount === 1 ? "warning" : "warnings";
    const stateSummary = latestState?.state ? ` / state ${latestState.state}` : "";

    return {
      level: "degraded",
      warningCount: evidence?.warningCount ?? 0,
      latestExitCode: null,
      latestState: latestState?.state ?? null,
      summary: `health degraded / ${evidence?.warningCount} ${warningLabel}${stateSummary}`,
    };
  }

  if (latestState?.state) {
    return {
      level: "ready",
      warningCount: 0,
      latestExitCode: null,
      latestState: latestState.state,
      summary: `health ready / state ${latestState.state}`,
    };
  }

  return {
    level: "unknown",
    warningCount: 0,
    latestExitCode: null,
    latestState: null,
    summary: "health unknown / replay loaded",
  };
}

export function createSessionReplayHistoryLines(session: SessionCenterSession) {
  return (session.replaySlice?.entries ?? []).map((entry) =>
    `seq ${entry.sequence} ${entry.kind} ${summarizeReplayPayload(entry.payload)}`
  );
}

export function summarizeSessionReplayStatus(session: SessionCenterSession) {
  return session.replayStatus?.summary ?? null;
}

export function summarizeSessionReplayCursor(session: SessionCenterSession) {
  return session.replayCursor?.summary ?? null;
}

export function summarizeSessionReplayCursorDrift(session: SessionCenterSession) {
  return session.replayCursorDrift?.summary ?? null;
}

export function summarizeSessionReplayAckLag(session: SessionCenterSession) {
  return session.replayAckLag?.summary ?? null;
}

export function summarizeSessionReplayAckWindow(session: SessionCenterSession) {
  return session.replayAckWindow?.summary ?? null;
}

export function summarizeSessionReplayWindowCoverage(session: SessionCenterSession) {
  return session.replayWindowCoverage?.summary ?? null;
}

export function summarizeSessionReplayLatestState(session: SessionCenterSession) {
  return session.replayLatestState?.summary ?? null;
}

export function summarizeSessionReplayStateLag(session: SessionCenterSession) {
  return session.replayStateLag?.summary ?? null;
}

export function summarizeSessionReplayStateFreshness(session: SessionCenterSession) {
  return session.replayStateFreshness?.summary ?? null;
}

export function summarizeSessionReplayStateAck(session: SessionCenterSession) {
  return session.replayStateAck?.summary ?? null;
}

export function summarizeSessionReplayStateOutputDelta(session: SessionCenterSession) {
  return session.replayStateOutputDelta?.summary ?? null;
}

export function summarizeSessionReplayLatestOutput(session: SessionCenterSession) {
  return session.replayLatestOutput?.summary ?? null;
}

export function summarizeSessionReplayOutputLag(session: SessionCenterSession) {
  return session.replayOutputLag?.summary ?? null;
}

export function summarizeSessionReplayOutputAck(session: SessionCenterSession) {
  return session.replayOutputAck?.summary ?? null;
}

export function summarizeSessionReplayHealth(session: SessionCenterSession) {
  return session.replayHealth?.summary ?? null;
}

export function summarizeSessionReplayLatestWarning(session: SessionCenterSession) {
  return session.replayLatestWarning?.summary ?? null;
}

export function summarizeSessionReplayLatestExit(session: SessionCenterSession) {
  return session.replayLatestExit?.summary ?? null;
}

export function summarizeSessionReplayFreshness(session: SessionCenterSession) {
  return session.replayFreshness?.summary ?? null;
}

export function summarizeSessionReplayOutputFreshness(session: SessionCenterSession) {
  return session.replayOutputFreshness?.summary ?? null;
}

export function summarizeSessionReplayGap(session: SessionCenterSession) {
  return session.replayGap?.summary ?? null;
}

export function summarizeSessionReplaySequenceGap(session: SessionCenterSession) {
  return session.replaySequenceGap?.summary ?? null;
}

export function summarizeSessionReplayTimeline(session: SessionCenterSession) {
  return session.replayTimeline?.summary ?? null;
}

export function summarizeSessionReplayMix(session: SessionCenterSession) {
  return session.replayMix?.summary ?? null;
}

export function summarizeSessionReplayEvidence(session: SessionCenterSession) {
  return session.replayEvidence?.summary ?? null;
}

export function summarizeSessionReplayEvidenceAck(session: SessionCenterSession) {
  return session.replayEvidenceAck?.summary ?? null;
}

export function summarizeSessionReplayEvidenceFreshness(session: SessionCenterSession) {
  return session.replayEvidenceFreshness?.summary ?? null;
}

export function createSessionCenterSnapshot(
  options: CreateSessionCenterSnapshotOptions,
): SessionCenterSnapshot {
  const attachments = new Map(
    (options.attachments ?? []).map((attachment) => [attachment.sessionId, attachment]),
  );
  const replays = new Map(
    (options.replays ?? []).map((replay) => [replay.sessionId, replay]),
  );
  const replayFailures = new Map(
    (options.replayFailures ?? []).map((failure) => [failure.sessionId, failure]),
  );
  const sessions = options.sessions.map((session) => {
    const attachment = attachments.get(session.sessionId);
    const replay = replays.get(session.sessionId);
    const replayFailure = replayFailures.get(session.sessionId);
    const replayLatestState = createReplayLatestState(replay);
    const replayEvidence = createReplayEvidence(replay);
    const replayLatestWarning = createReplayLatestWarning(replay);
    const replayLatestExit = createReplayLatestExit(replay);
    const replayFreshness = createReplayFreshness(replay, options.observedAt);
    const replayEvidenceFreshness = createReplayEvidenceFreshness(replay, options.observedAt);
    const replayOutputFreshness = createReplayOutputFreshness(replay, options.observedAt);
    const replayStateFreshness = createReplayStateFreshness(replay, options.observedAt);
    const replayGap = createReplayGap(replay);
    const replaySequenceGap = createReplaySequenceGap(replay);
    const replayAckLag = createReplayAckLag(replay, attachment);
    const replayAckWindow = createReplayAckWindow(replay, attachment);
    const replayWindowCoverage = createReplayWindowCoverage(replay);
    const replayLatestOutput = createReplayLatestOutput(replay);
    const replayOutputLag = createReplayOutputLag(replay);
    const replayOutputAck = createReplayOutputAck(replay, attachment);
    const replayStateLag = createReplayStateLag(replay);
    const replayStateAck = createReplayStateAck(replayLatestState, attachment);
    const replayEvidenceAck = createReplayEvidenceAck(replayEvidence, attachment);
    const replayStateOutputDelta = createReplayStateOutputDelta(
      replayLatestState,
      replayLatestOutput,
    );

    return {
      sessionId: session.sessionId,
      workspaceId: session.workspaceId,
      target: session.target,
      state: session.state,
      tags: [...(Array.isArray(session.tags) ? session.tags : session.modeTags)],
      attachmentState: getAttachmentState(session, attachment),
      lastAckSequence: attachment?.lastAckSequence ?? 0,
      replayPreview: createReplayPreview(replay),
      replaySlice: cloneReplaySlice(replay),
      replayStatus: createReplayStatus(replay, replayFailure),
      replayCursor: createReplayCursor(replay),
      replayCursorDrift: createReplayCursorDrift(replay),
      replayAckLag,
      replayAckWindow,
      replayWindowCoverage,
      replayLatestState,
      replayStateLag,
      replayStateFreshness,
      replayStateAck,
      replayStateOutputDelta,
      replayLatestOutput,
      replayOutputLag,
      replayOutputAck,
      replayHealth: createReplayHealth(replayLatestState, replayEvidence, replayFailure),
      replayLatestWarning,
      replayLatestExit,
      replayFreshness,
      replayOutputFreshness,
      replayGap,
      replaySequenceGap,
      replayTimeline: createReplayTimeline(replay),
      replayMix: createReplayMix(replay),
      replayEvidence,
      replayEvidenceAck,
      replayEvidenceFreshness,
    } satisfies SessionCenterSession;
  });

  return {
    counts: {
      totalSessions: sessions.length,
      attachedSessions: sessions.filter((session) => session.attachmentState === "attached")
        .length,
      reattachableSessions: sessions.filter(
        (session) => session.attachmentState === "reattach-required",
      ).length,
      loadedReplayCount: sessions.filter((session) => session.replayStatus?.state === "loaded")
        .length,
      deferredReplayCount: sessions.filter((session) => session.replayStatus?.state === "deferred")
        .length,
      unavailableReplayCount: sessions.filter(
        (session) => session.replayStatus?.state === "unavailable",
      ).length,
    },
    sessions,
  };
}

export function summarizeSessionCenter(snapshot: SessionCenterSnapshot) {
  return `${snapshot.counts.totalSessions} sessions, runtime truth, ${snapshot.counts.reattachableSessions} reattach required, replay ${snapshot.counts.loadedReplayCount} loaded / ${snapshot.counts.deferredReplayCount} deferred / ${snapshot.counts.unavailableReplayCount} unavailable`;
}

export function createDemoSessionCenterSnapshot() {
  return createSessionCenterSnapshot({
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
}
