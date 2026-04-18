export const DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT = 24;

export type SessionReplayPreloadAction = "open" | "refresh" | "load-more";

function normalizePositiveInteger(value: number, fallback: number) {
  if (Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return fallback;
}

export function resolveSessionReplayPreloadLimit(input: {
  action: SessionReplayPreloadAction;
  currentLimit: number;
  totalSessions: number;
  deferredReplayCount?: number;
  loading?: boolean;
  defaultLimit?: number;
}) {
  const normalizedDefault = normalizePositiveInteger(
    input.defaultLimit ?? DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT,
    DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT,
  );
  const normalizedCurrent = Math.max(
    normalizePositiveInteger(input.currentLimit, normalizedDefault),
    normalizedDefault,
  );
  const normalizedTotalSessions = Math.max(0, Math.floor(input.totalSessions));
  const normalizedDeferredReplayCount = input.deferredReplayCount === undefined
    ? null
    : Math.max(0, Math.floor(input.deferredReplayCount));
  const suppressLoadMoreExpansion =
    input.action === "load-more" &&
    (input.loading === true || normalizedDeferredReplayCount === 0);
  const effectiveAction = suppressLoadMoreExpansion
    ? "refresh"
    : input.action;

  if (effectiveAction === "open") {
    return normalizedDefault;
  }

  if (effectiveAction === "refresh") {
    return normalizedCurrent;
  }

  if (normalizedTotalSessions <= 0) {
    return normalizedCurrent;
  }

  const expandedLimit = Math.max(
    normalizedCurrent + normalizedDefault,
    normalizedCurrent * 2,
  );
  return Math.min(normalizedTotalSessions, expandedLimit);
}
