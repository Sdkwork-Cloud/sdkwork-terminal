import type { DesktopRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";
import {
  createSessionCenterSnapshot,
  type SessionReplayFailure,
} from "@sdkwork/terminal-sessions/model";

const SESSION_REPLAY_CONCURRENCY_LIMIT = 4;
const SESSION_REPLAY_PRELOAD_LIMIT = 24;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return "unknown replay load failure";
}

export interface LoadDesktopSessionCenterSnapshotOptions {
  observedAt?: string;
  replayPreloadLimit?: number;
}

async function mapWithConcurrencyLimit<TInput, TOutput>(
  items: readonly TInput[],
  limit: number,
  worker: (item: TInput) => Promise<TOutput>,
): Promise<TOutput[]> {
  if (items.length === 0) {
    return [];
  }

  const maxConcurrency = Math.max(1, Math.floor(limit));
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(maxConcurrency, items.length) },
    () => run(),
  );

  await Promise.all(workers);
  return results;
}

function getSessionReplayPriority(
  session: {
    state: string;
    lastActiveAt: string;
    createdAt: string;
    sessionId: string;
  },
) {
  const detachedPriority = session.state === "Detached" ? 10 : 0;
  const runningPriority = session.state === "Running" ? 5 : 0;
  const lifecyclePriority = detachedPriority + runningPriority;

  const lastActiveAt = Date.parse(session.lastActiveAt);
  if (Number.isFinite(lastActiveAt)) {
    return lifecyclePriority * 1_000_000_000_000 + lastActiveAt;
  }

  const createdAt = Date.parse(session.createdAt);
  if (Number.isFinite(createdAt)) {
    return lifecyclePriority * 1_000_000_000_000 + createdAt;
  }

  return lifecyclePriority * 1_000_000_000_000 + Number.NEGATIVE_INFINITY;
}

function selectReplaySessionIds(
  sessions: Array<{
    sessionId: string;
    state: string;
    lastActiveAt: string;
    createdAt: string;
  }>,
  replayPreloadLimit: number,
) {
  const normalizedLimit = Math.max(0, Math.floor(replayPreloadLimit));
  if (normalizedLimit >= sessions.length) {
    return new Set(sessions.map((session) => session.sessionId));
  }

  const prioritizedSessions = [...sessions].sort((left, right) => {
    const priorityDelta = getSessionReplayPriority(right) - getSessionReplayPriority(left);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return right.sessionId.localeCompare(left.sessionId);
  });

  return new Set(
    prioritizedSessions
      .slice(0, normalizedLimit)
      .map((session) => session.sessionId),
  );
}

export async function loadDesktopSessionCenterSnapshot(
  client: Pick<DesktopRuntimeBridgeClient, "sessionIndex" | "sessionReplay">,
  options: LoadDesktopSessionCenterSnapshotOptions = {},
) {
  const sessionIndex = await client.sessionIndex();
  const replaySessionIds = selectReplaySessionIds(
    sessionIndex.sessions,
    options.replayPreloadLimit ?? SESSION_REPLAY_PRELOAD_LIMIT,
  );
  const replaySessions = sessionIndex.sessions.filter((session) =>
    replaySessionIds.has(session.sessionId)
  );
  const replayDeferredFailures = sessionIndex.sessions
    .filter((session) => !replaySessionIds.has(session.sessionId))
    .map((session) => ({
      sessionId: session.sessionId,
      error: `outside preload limit (${replaySessions.length}/${sessionIndex.sessions.length})`,
      reason: "deferred" as const,
    }));

  const replayResults = await mapWithConcurrencyLimit(
    replaySessions,
    SESSION_REPLAY_CONCURRENCY_LIMIT,
    async (session) => {
      try {
        return {
          replay: await client.sessionReplay(session.sessionId, { limit: 8 }),
          failure: null,
        };
      } catch (error) {
        return {
          replay: null,
          failure: {
            sessionId: session.sessionId,
            error: getErrorMessage(error),
            reason: "error" as const,
          },
        };
      }
    },
  );
  const replays = replayResults.flatMap((result) => (result.replay ? [result.replay] : []));
  const replayFailures: SessionReplayFailure[] = [
    ...replayResults.flatMap((result) =>
      result.failure ? [result.failure as SessionReplayFailure] : []
    ),
    ...replayDeferredFailures,
  ];

  return createSessionCenterSnapshot({
    ...sessionIndex,
    replays,
    replayFailures,
    observedAt: options.observedAt ?? new Date().toISOString(),
  });
}
