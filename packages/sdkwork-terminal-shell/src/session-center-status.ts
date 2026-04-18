export interface SessionCenterReplayDiagnostics {
  totalSessions: number;
  loadedReplayCount: number;
  deferredReplayCount: number;
  unavailableReplayCount: number;
}

function normalizeCount(value: number) {
  if (Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return 0;
}

export function summarizeSessionCenterMenuSubtitle(
  diagnostics: SessionCenterReplayDiagnostics | undefined,
  fallback = "Reconnect detached shell sessions",
) {
  if (!diagnostics) {
    return fallback;
  }

  const totalSessions = normalizeCount(diagnostics.totalSessions);
  const loadedReplayCount = normalizeCount(diagnostics.loadedReplayCount);
  const deferredReplayCount = normalizeCount(diagnostics.deferredReplayCount);
  const unavailableReplayCount = normalizeCount(diagnostics.unavailableReplayCount);

  if (totalSessions === 0) {
    return fallback;
  }

  const parts = [
    `${totalSessions} sessions indexed`,
    `${loadedReplayCount} replay loaded`,
  ];
  if (deferredReplayCount > 0) {
    parts.push(`${deferredReplayCount} replay deferred`);
  }
  if (unavailableReplayCount > 0) {
    parts.push(`${unavailableReplayCount} replay unavailable`);
  }

  return parts.join(" / ");
}
