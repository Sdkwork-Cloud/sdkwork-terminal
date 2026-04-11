import { StatusBadge, SurfaceCard } from "@sdkwork/terminal-ui";

import {
  summarizeSessionReplayAckLag,
  summarizeSessionReplayAckWindow,
  createDemoSessionCenterSnapshot,
  createSessionReplayHistoryLines,
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
  summarizeSessionCenter,
  type SessionCenterSnapshot,
} from "./model";

export * from "./model";

function getAttachmentLabel(session: SessionCenterSnapshot["sessions"][number]) {
  if (session.attachmentState === "attached") {
    return "Attached";
  }

  if (session.attachmentState === "reattach-required") {
    return "Reattach required";
  }

  return "Idle";
}

function summarizeReplayPreview(session: SessionCenterSnapshot["sessions"][number]) {
  const latestEntry = session.replayPreview?.latestEntry;
  if (!latestEntry) {
    return null;
  }

  const payload = latestEntry.payload.length > 72
    ? `${latestEntry.payload.slice(0, 69)}...`
    : latestEntry.payload;
  const suffix = session.replayPreview?.hasMore ? " +" : "";

  return `${latestEntry.kind}: ${payload}${suffix}`;
}

export function SessionsPanel(props: { snapshot?: SessionCenterSnapshot }) {
  const snapshot = props.snapshot ?? createDemoSessionCenterSnapshot();

  return (
    <SurfaceCard
      title="Session Center"
      accent={<StatusBadge label={`${snapshot.counts.totalSessions} sessions`} />}
    >
      <p style={{ marginTop: 0, color: "#95a3b8" }}>
        {summarizeSessionCenter(snapshot)}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, color: "#c8d2df", display: "grid", gap: 8 }}>
        {snapshot.sessions.map((session) => {
          const replaySummary = summarizeReplayPreview(session);
          const replayStatus = summarizeSessionReplayStatus(session);
          const replayHealth = summarizeSessionReplayHealth(session);
          const replayCursor = summarizeSessionReplayCursor(session);
          const replayCursorDrift = summarizeSessionReplayCursorDrift(session);
          const replayAckLag = summarizeSessionReplayAckLag(session);
          const replayAckWindow = summarizeSessionReplayAckWindow(session);
          const replayWindowCoverage = summarizeSessionReplayWindowCoverage(session);
          const replayLatestState = summarizeSessionReplayLatestState(session);
          const replayStateLag = summarizeSessionReplayStateLag(session);
          const replayStateFreshness = summarizeSessionReplayStateFreshness(session);
          const replayStateAck = summarizeSessionReplayStateAck(session);
          const replayStateOutputDelta = summarizeSessionReplayStateOutputDelta(session);
          const replayLatestOutput = summarizeSessionReplayLatestOutput(session);
          const replayOutputLag = summarizeSessionReplayOutputLag(session);
          const replayOutputAck = summarizeSessionReplayOutputAck(session);
          const replayLatestWarning = summarizeSessionReplayLatestWarning(session);
          const replayLatestExit = summarizeSessionReplayLatestExit(session);
          const replayFreshness = summarizeSessionReplayFreshness(session);
          const replayOutputFreshness = summarizeSessionReplayOutputFreshness(session);
          const replayGap = summarizeSessionReplayGap(session);
          const replaySequenceGap = summarizeSessionReplaySequenceGap(session);
          const replayTimeline = summarizeSessionReplayTimeline(session);
          const replayMix = summarizeSessionReplayMix(session);
          const replayEvidence = summarizeSessionReplayEvidence(session);
          const replayEvidenceAck = summarizeSessionReplayEvidenceAck(session);
          const replayEvidenceFreshness = summarizeSessionReplayEvidenceFreshness(session);

          return (
            <li key={session.sessionId}>
              <div>
                <strong>{session.sessionId}</strong>
                {" / "}
                {session.state}
                {" / "}
                {getAttachmentLabel(session)}
              </div>
              {replaySummary ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  replay {replaySummary}
                </div>
              ) : null}
              {replayStatus ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayStatus}
                </div>
              ) : null}
              {replayHealth ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayHealth}
                </div>
              ) : null}
              {replayLatestWarning ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayLatestWarning}
                </div>
              ) : null}
              {replayLatestExit ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayLatestExit}
                </div>
              ) : null}
              {replayFreshness ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayFreshness}
                </div>
              ) : null}
              {replayOutputFreshness ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayOutputFreshness}
                </div>
              ) : null}
              {replayGap ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayGap}
                </div>
              ) : null}
              {replaySequenceGap ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replaySequenceGap}
                </div>
              ) : null}
              {replayCursor ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayCursor}
                </div>
              ) : null}
              {replayCursorDrift ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayCursorDrift}
                </div>
              ) : null}
              {replayAckLag ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayAckLag}
                </div>
              ) : null}
              {replayAckWindow ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayAckWindow}
                </div>
              ) : null}
              {replayWindowCoverage ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayWindowCoverage}
                </div>
              ) : null}
              {replayLatestState ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayLatestState}
                </div>
              ) : null}
              {replayStateLag ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayStateLag}
                </div>
              ) : null}
              {replayStateFreshness ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayStateFreshness}
                </div>
              ) : null}
              {replayStateAck ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayStateAck}
                </div>
              ) : null}
              {replayStateOutputDelta ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayStateOutputDelta}
                </div>
              ) : null}
              {replayLatestOutput ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayLatestOutput}
                </div>
              ) : null}
              {replayOutputLag ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayOutputLag}
                </div>
              ) : null}
              {replayOutputAck ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayOutputAck}
                </div>
              ) : null}
              {replayTimeline ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayTimeline}
                </div>
              ) : null}
              {replayMix ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayMix}
                </div>
              ) : null}
              {replayEvidence ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayEvidence}
                </div>
              ) : null}
              {replayEvidenceAck ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayEvidenceAck}
                </div>
              ) : null}
              {replayEvidenceFreshness ? (
                <div style={{ fontSize: 12, color: "#95a3b8" }}>
                  {replayEvidenceFreshness}
                </div>
              ) : null}
              {session.replaySlice?.entries.length ? (
                <div style={{ marginTop: 6, fontSize: 12, color: "#95a3b8" }}>
                  <div>
                    replay history {session.replaySlice.entries.length} entries
                    {session.replaySlice.hasMore ? " +" : ""}
                  </div>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18, display: "grid", gap: 2 }}>
                    {createSessionReplayHistoryLines(session).map((line, index) => (
                      <li key={`${session.sessionId}-${index + 1}`}>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </SurfaceCard>
  );
}
