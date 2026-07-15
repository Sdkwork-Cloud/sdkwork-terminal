import type {
  SessionReplayFailure,
  SessionReplayStatus,
} from "@sdkwork/terminal-pc-sessions/model";

export type DesktopSessionCenterErrorKind =
  | "refresh"
  | "reattach"
  | "replay-load";

export interface DesktopSessionCenterError {
  readonly kind: DesktopSessionCenterErrorKind;
}

export interface DesktopSessionCenterMessages {
  readonly errors: Readonly<Record<DesktopSessionCenterErrorKind, string>>;
  readonly replayDeferred: string;
}

const DESKTOP_SESSION_CENTER_REPLAY_LOAD_FAILURE_KIND = "replay-load" as const;

export function createDesktopSessionCenterError(
  kind: DesktopSessionCenterErrorKind,
): DesktopSessionCenterError {
  return { kind };
}

export function createDesktopSessionReplayLoadFailure(
  sessionId: string,
): SessionReplayFailure {
  return {
    sessionId,
    error: DESKTOP_SESSION_CENTER_REPLAY_LOAD_FAILURE_KIND,
    reason: "error",
  };
}

export function resolveDesktopSessionCenterErrorMessage(
  error: DesktopSessionCenterError,
  messages: DesktopSessionCenterMessages,
) {
  return messages.errors[error.kind];
}

export function resolveDesktopSessionReplayStatusMessage(
  status: Pick<SessionReplayStatus, "state"> | undefined,
  messages: DesktopSessionCenterMessages,
) {
  if (!status || status.state === "loaded") {
    return null;
  }

  return status.state === "deferred"
    ? messages.replayDeferred
    : messages.errors["replay-load"];
}
