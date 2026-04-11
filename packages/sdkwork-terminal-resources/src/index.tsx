import { ActionButton, StatusBadge, SurfaceCard } from "@sdkwork/terminal-ui";

import {
  createResourceTargetActions,
  createDemoResourceCenterSnapshot,
  summarizeResourceCenter,
  type ResourceCenterTarget,
  type ResourceCenterSnapshot,
  type ResourceLaunchStatus,
} from "./model";

export * from "./model";

function getLaunchLabel(target: ResourceCenterSnapshot["targets"][number]) {
  if (target.launchState === "session-ready") {
    return "Session ready";
  }

  if (target.launchState === "needs-attention") {
    return "Needs attention";
  }

  return "Blocked";
}

function getBadgeTone(snapshot: ResourceCenterSnapshot) {
  if (snapshot.counts.blockedTargets > 0 || snapshot.counts.attentionTargets > 0) {
    return "warning" as const;
  }

  return "success" as const;
}

function getLaunchTone(target: ResourceCenterTarget) {
  if (target.launchState === "needs-attention") {
    return "warning" as const;
  }

  if (target.launchState === "blocked") {
    return "danger" as const;
  }

  return "success" as const;
}

export function ResourcesPanel(props: {
  snapshot?: ResourceCenterSnapshot;
  onLaunchTarget?: (target: ResourceCenterTarget) => void | Promise<void>;
  onProbeTarget?: (target: ResourceCenterTarget) => void | Promise<void>;
  launchStatus?: ResourceLaunchStatus | null;
}) {
  const snapshot = props.snapshot ?? createDemoResourceCenterSnapshot();
  const launchStatus = props.launchStatus ?? null;

  return (
    <SurfaceCard
      title="Execution Targets"
      accent={
        <StatusBadge
          label={`${snapshot.counts.sessionReadyTargets} session ready`}
          tone={getBadgeTone(snapshot)}
        />
      }
    >
      <p style={{ marginTop: 0, color: "#95a3b8" }}>
        {summarizeResourceCenter(snapshot)}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, color: "#c8d2df", display: "grid", gap: 12 }}>
        {snapshot.targets.map((target) => (
          <li key={target.targetId}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <strong>{target.label}</strong>
                <StatusBadge
                  label={getLaunchLabel(target)}
                  tone={getLaunchTone(target)}
                />
                <span style={{ color: "#95a3b8", fontSize: 13 }}>
                  {target.connectorLabel}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#c8d2df" }}>
                {target.authority}
                {" | "}
                {target.healthSummary}
              </div>
              {(() => {
                const actions = createResourceTargetActions(target, launchStatus)
                  .filter((action) =>
                    action.action === "launch" ? props.onLaunchTarget : props.onProbeTarget,
                  );

                if (!actions.length) {
                  return null;
                }

                return (
                <div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {actions.map((action) => (
                      <ActionButton
                        key={action.action}
                        active={
                          launchStatus?.phase === "launching"
                          && launchStatus.targetId === target.targetId
                          && launchStatus.action === action.action
                        }
                        disabled={action.disabled}
                        onClick={() => {
                          if (action.action === "launch") {
                            void props.onLaunchTarget?.(target);
                            return;
                          }

                          void props.onProbeTarget?.(target);
                        }}
                      >
                        {action.label}
                      </ActionButton>
                    ))}
                  </div>
                </div>
                );
              })()}
            </div>
          </li>
        ))}
      </ul>
      {launchStatus?.summary ? (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 14,
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <strong>{launchStatus.summary.title}</strong>
            <StatusBadge
              label={launchStatus.phase}
              tone={launchStatus.summary.tone}
            />
          </div>
          <div style={{ fontSize: 13, color: "#c8d2df" }}>
            {launchStatus.summary.detail}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#95a3b8", display: "grid", gap: 6 }}>
            {launchStatus.summary.evidence.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </SurfaceCard>
  );
}
