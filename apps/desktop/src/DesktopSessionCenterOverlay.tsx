import type { CSSProperties, MouseEvent } from "react";

import type { SessionCenterSnapshot } from "../../../packages/sdkwork-terminal-sessions/src/model.ts";
import { summarizeSessionCenter } from "../../../packages/sdkwork-terminal-sessions/src/model.ts";
import { canReattachDesktopSession } from "./session-center-shell";

interface DesktopSessionCenterOverlayProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  snapshot: SessionCenterSnapshot | null;
  reattachingSessionIds: string[];
  onClose: () => void;
  onRefresh: () => void;
  onReattach: (sessionId: string) => void;
}

function describeSessionPreview(
  session: SessionCenterSnapshot["sessions"][number],
) {
  const latestEntry = session.replayPreview?.latestEntry;
  if (!latestEntry) {
    return "No replay preview yet";
  }

  const payload = latestEntry.payload.length > 84
    ? `${latestEntry.payload.slice(0, 81)}...`
    : latestEntry.payload;

  return `${latestEntry.kind} / ${payload}`;
}

function sessionStateTone(session: SessionCenterSnapshot["sessions"][number]) {
  if (session.attachmentState === "reattach-required") {
    return "#f59e0b";
  }

  if (session.state === "Running") {
    return "#22c55e";
  }

  if (session.state === "Exited") {
    return "#f87171";
  }

  return "#94a3b8";
}

function describeDesktopReattachHint(
  session: SessionCenterSnapshot["sessions"][number],
) {
  if (session.state === "Exited") {
    return "Session has already exited.";
  }

  if (session.attachmentState !== "reattach-required") {
    return "Session is already attached to a live terminal tab.";
  }

  if (session.target === "remote-runtime") {
    return "Desktop interactive reattach is not enabled for remote-runtime sessions yet.";
  }

  return "Desktop interactive reattach is available only for local-shell, SSH, Docker Exec, and Kubernetes Exec sessions.";
}

export function DesktopSessionCenterOverlay(props: DesktopSessionCenterOverlayProps) {
  if (!props.open) {
    return null;
  }

  const sessions = [...(props.snapshot?.sessions ?? [])].sort((left, right) => {
    const leftPriority = canReattachDesktopSession(left) ? 0 : 1;
    const rightPriority = canReattachDesktopSession(right) ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.sessionId.localeCompare(left.sessionId);
  });

  return (
    <div
      data-slot="desktop-session-center-overlay"
      role="presentation"
      onClick={props.onClose}
      style={overlayBackdropStyle}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Session Center"
        onClick={(event: MouseEvent<HTMLElement>) => {
          event.stopPropagation();
        }}
        style={overlayDrawerStyle}
      >
        <header style={overlayHeaderStyle}>
          <div style={overlayHeaderTextStyle}>
            <strong style={overlayTitleStyle}>Session Center</strong>
            <span style={overlaySubtitleStyle}>
              {props.snapshot ? summarizeSessionCenter(props.snapshot) : "Load detached sessions"}
            </span>
          </div>
          <div style={overlayHeaderActionsStyle}>
            <button type="button" onClick={props.onRefresh} style={overlayButtonStyle("secondary")}>
              Refresh
            </button>
            <button type="button" onClick={props.onClose} style={overlayButtonStyle("secondary")}>
              Close
            </button>
          </div>
        </header>

        {props.error ? (
          <div style={overlayErrorStyle}>
            Session Center load failed: {props.error}
          </div>
        ) : null}

        <div style={overlayBodyStyle}>
          {props.loading && !props.snapshot ? (
            <div style={overlayEmptyStateStyle}>Loading session inventory...</div>
          ) : null}

          {!props.loading && sessions.length === 0 ? (
            <div style={overlayEmptyStateStyle}>No detached shell sessions available.</div>
          ) : null}

          {sessions.map((session) => {
            const reattaching = props.reattachingSessionIds.includes(session.sessionId);
            const reattachable = canReattachDesktopSession(session);

            return (
              <article key={session.sessionId} style={overlaySessionCardStyle}>
                <div style={overlaySessionHeaderStyle}>
                  <div style={overlaySessionTitleBlockStyle}>
                    <div style={overlaySessionTitleRowStyle}>
                      <strong style={overlaySessionTitleStyle}>{session.target}</strong>
                      <span
                        style={{
                          ...overlaySessionStateStyle,
                          color: sessionStateTone(session),
                        }}
                      >
                        {session.state}
                      </span>
                    </div>
                    <div style={overlaySessionMetaStyle}>
                      {session.sessionId}
                      {" / "}
                      {session.attachmentState}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!reattachable || reattaching}
                    onClick={() => props.onReattach(session.sessionId)}
                    style={overlayButtonStyle(reattachable ? "primary" : "disabled")}
                  >
                    {reattaching ? "Reattaching..." : "Reattach"}
                  </button>
                </div>

                <div style={overlaySessionPreviewStyle}>{describeSessionPreview(session)}</div>

                <div style={overlaySessionMetaGridStyle}>
                  <span>ack {session.lastAckSequence}</span>
                  {session.replayCursor ? <span>{session.replayCursor.summary}</span> : null}
                  {session.replayFreshness ? <span>{session.replayFreshness.summary}</span> : null}
                </div>

                {!reattachable ? (
                  <div style={overlaySessionHintStyle}>
                    {describeDesktopReattachHint(session)}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

const overlayBackdropStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 60,
  display: "flex",
  justifyContent: "flex-end",
  background: "rgba(2, 6, 23, 0.26)",
  backdropFilter: "blur(8px)",
};

const overlayDrawerStyle: CSSProperties = {
  width: 368,
  maxWidth: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  borderLeft: "1px solid rgba(148, 163, 184, 0.18)",
  background: "rgba(15, 23, 42, 0.96)",
  boxShadow: "-20px 0 48px rgba(0, 0, 0, 0.35)",
};

const overlayHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  minHeight: 56,
  padding: "12px 14px",
  borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
};

const overlayHeaderTextStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
};

const overlayTitleStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 13,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const overlaySubtitleStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.4,
};

const overlayHeaderActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: "none",
};

const overlayBodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  display: "grid",
  gap: 10,
  padding: "12px 12px 16px",
};

const overlayErrorStyle: CSSProperties = {
  margin: "12px 12px 0",
  padding: "10px 12px",
  border: "1px solid rgba(248, 113, 113, 0.22)",
  background: "rgba(127, 29, 29, 0.22)",
  color: "#fecaca",
  fontSize: 12,
  lineHeight: 1.5,
};

const overlayEmptyStateStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  minHeight: 120,
  border: "1px dashed rgba(148, 163, 184, 0.18)",
  color: "#94a3b8",
  fontSize: 12,
};

const overlaySessionCardStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  padding: "12px 12px 14px",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "rgba(15, 23, 42, 0.82)",
};

const overlaySessionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
};

const overlaySessionTitleBlockStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
};

const overlaySessionTitleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const overlaySessionTitleStyle: CSSProperties = {
  color: "#f8fafc",
  fontSize: 13,
  textTransform: "capitalize",
};

const overlaySessionStateStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const overlaySessionMetaStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 11,
  wordBreak: "break-all",
};

const overlaySessionPreviewStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 12,
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const overlaySessionMetaGridStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  color: "#94a3b8",
  fontSize: 11,
};

const overlaySessionHintStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 11,
  lineHeight: 1.5,
};

function overlayButtonStyle(intent: "primary" | "secondary" | "disabled"): CSSProperties {
  if (intent === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 88,
      height: 30,
      padding: "0 12px",
      border: "1px solid rgba(96, 165, 250, 0.24)",
      background: "rgba(37, 99, 235, 0.22)",
      color: "#dbeafe",
      cursor: "pointer",
      fontSize: 12,
    };
  }

  if (intent === "disabled") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 88,
      height: 30,
      padding: "0 12px",
      border: "1px solid rgba(148, 163, 184, 0.12)",
      background: "rgba(15, 23, 42, 0.6)",
      color: "#64748b",
      cursor: "not-allowed",
      fontSize: 12,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
    height: 30,
    padding: "0 12px",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    background: "rgba(15, 23, 42, 0.78)",
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: 12,
  };
}
