import {
  DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT,
  resolveSessionReplayPreloadLimit,
  type SessionReplayPreloadAction,
} from "./session-replay-preload-policy.ts";
import { resolveQueuedSessionCenterRefreshAction } from "./session-center-refresh-policy.ts";

export interface SessionCenterRefreshMachineState {
  open: boolean;
  loading: boolean;
  inFlight: boolean;
  activeAction: SessionReplayPreloadAction | null;
  pendingAction: SessionReplayPreloadAction | null;
  preloadLimit: number;
  totalSessions: number;
  deferredReplayCount: number;
}

export interface SessionCenterRefreshMachineRequest {
  action: SessionReplayPreloadAction;
  preloadLimit: number;
}

export interface SessionCenterRefreshMachineStepResult {
  state: SessionCenterRefreshMachineState;
  request: SessionCenterRefreshMachineRequest | null;
}

function normalizeCount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeLimit(value: number) {
  if (Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT;
}

export function createSessionCenterRefreshMachineState(
  overrides: Partial<SessionCenterRefreshMachineState> = {},
): SessionCenterRefreshMachineState {
  return {
    open: overrides.open ?? false,
    loading: overrides.loading ?? false,
    inFlight: overrides.inFlight ?? false,
    activeAction: overrides.activeAction ?? null,
    pendingAction: overrides.pendingAction ?? null,
    preloadLimit: normalizeLimit(overrides.preloadLimit ?? DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT),
    totalSessions: normalizeCount(overrides.totalSessions ?? 0),
    deferredReplayCount: normalizeCount(overrides.deferredReplayCount ?? 0),
  };
}

export function queueSessionCenterRefreshMachineAction(
  currentState: SessionCenterRefreshMachineState,
  action: SessionReplayPreloadAction,
): SessionCenterRefreshMachineStepResult {
  if (currentState.inFlight) {
    return {
      state: {
        ...currentState,
        pendingAction: resolveQueuedSessionCenterRefreshAction({
          current: currentState.pendingAction,
          next: action,
          active: currentState.activeAction,
        }),
      },
      request: null,
    };
  }

  if (action === "load-more" && currentState.loading) {
    return {
      state: currentState,
      request: null,
    };
  }

  if (action === "load-more" && currentState.deferredReplayCount <= 0) {
    return {
      state: currentState,
      request: null,
    };
  }

  const nextPreloadLimit = resolveSessionReplayPreloadLimit({
    action,
    currentLimit: currentState.preloadLimit,
    totalSessions: currentState.totalSessions,
    deferredReplayCount: currentState.deferredReplayCount > 0
      ? currentState.deferredReplayCount
      : 0,
    loading: currentState.loading,
  });

  return {
    state: {
      ...currentState,
      loading: true,
      inFlight: true,
      activeAction: action,
      preloadLimit: nextPreloadLimit,
    },
    request: {
      action,
      preloadLimit: nextPreloadLimit,
    },
  };
}

export function settleSessionCenterRefreshMachineRequest(
  currentState: SessionCenterRefreshMachineState,
  input: {
    totalSessions: number;
    deferredReplayCount: number;
  },
): SessionCenterRefreshMachineStepResult {
  const settledState: SessionCenterRefreshMachineState = {
    ...currentState,
    loading: false,
    inFlight: false,
    activeAction: null,
    totalSessions: normalizeCount(input.totalSessions),
    deferredReplayCount: normalizeCount(input.deferredReplayCount),
  };

  if (!settledState.open) {
    return {
      state: {
        ...settledState,
        pendingAction: null,
      },
      request: null,
    };
  }

  if (!settledState.pendingAction) {
    return {
      state: settledState,
      request: null,
    };
  }

  const pendingAction = settledState.pendingAction;
  return queueSessionCenterRefreshMachineAction(
    {
      ...settledState,
      pendingAction: null,
    },
    pendingAction,
  );
}

export function openSessionCenterRefreshMachine(
  currentState: SessionCenterRefreshMachineState,
): SessionCenterRefreshMachineStepResult {
  if (currentState.open) {
    return {
      state: currentState,
      request: null,
    };
  }

  return queueSessionCenterRefreshMachineAction(
    {
      ...currentState,
      open: true,
    },
    "open",
  );
}

export function closeSessionCenterRefreshMachine(
  currentState: SessionCenterRefreshMachineState,
) {
  return {
    ...currentState,
    open: false,
    pendingAction: null,
  };
}
