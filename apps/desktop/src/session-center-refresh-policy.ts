import type { SessionReplayPreloadAction } from "./session-replay-preload-policy";

type ResolveQueuedSessionCenterRefreshActionInput = {
  current: SessionReplayPreloadAction | null;
  next: SessionReplayPreloadAction;
  active: SessionReplayPreloadAction | null;
};

export function resolveQueuedSessionCenterRefreshAction({
  current,
  next,
  active,
}: ResolveQueuedSessionCenterRefreshActionInput): SessionReplayPreloadAction | null {
  if (next === "load-more" && active === "load-more") {
    return current;
  }

  if (current === next) {
    return current;
  }

  if (!current) {
    return next;
  }

  const actionPriority: Record<SessionReplayPreloadAction, number> = {
    refresh: 1,
    "load-more": 2,
    open: 3,
  };

  return actionPriority[next] >= actionPriority[current] ? next : current;
}
