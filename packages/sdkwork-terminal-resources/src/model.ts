import {
  DEFAULT_EXECUTION_TARGET_DESCRIPTORS,
} from "@sdkwork/terminal-contracts";
import type {
  ConnectorSessionLaunchRequest,
  ExecutionTargetDescriptor,
  RemoteRuntimeSessionCreateRequest,
  SessionCreateDraft,
} from "@sdkwork/terminal-types";

export type ResourceLaunchState =
  | "session-ready"
  | "needs-attention"
  | "blocked";

export interface ResourceCenterTarget {
  targetId: string;
  workspaceId: string;
  kind: ExecutionTargetDescriptor["kind"];
  label: string;
  authority: string;
  connectorId: string;
  connectorLabel: string;
  connectorTransport: ExecutionTargetDescriptor["connector"]["transport"];
  diagnosticsHint: string;
  healthStatus: ExecutionTargetDescriptor["health"]["status"];
  healthSummary: string;
  sessionLaunchable: boolean;
  launchState: ResourceLaunchState;
  tags: string[];
}

export interface ResourceCenterSnapshot {
  counts: {
    totalTargets: number;
    sessionReadyTargets: number;
    attentionTargets: number;
    blockedTargets: number;
  };
  targets: ResourceCenterTarget[];
}

export type ResourceLaunchSummaryTone =
  | "success"
  | "warning"
  | "danger";

export type ResourceActionKind =
  | "launch"
  | "exec-probe";

export interface ResourceLaunchReplayEvidence {
  sequence: number;
  kind: string;
  payload: string;
  occurredAt: string;
}

export interface ResourceLaunchEvidence {
  sessionId: string;
  workspaceId: string;
  target: string;
  state: string;
  createdAt: string;
  lastActiveAt: string;
  replayEntry: ResourceLaunchReplayEvidence;
}

export interface ResourceLaunchSummary {
  targetId: string;
  tone: ResourceLaunchSummaryTone;
  title: string;
  detail: string;
  evidence: string[];
}

export type ResourceLaunchPhase =
  | "idle"
  | "launching"
  | "succeeded"
  | "failed";

export interface ResourceLaunchStatus {
  action: ResourceActionKind | null;
  phase: ResourceLaunchPhase;
  targetId: string | null;
  summary: ResourceLaunchSummary | null;
}

export interface ResourceTargetAction {
  action: ResourceActionKind;
  label: string;
  disabled: boolean;
}

export interface CreateResourceCenterSnapshotOptions {
  targets?: readonly ExecutionTargetDescriptor[];
}

function getLaunchState(target: ExecutionTargetDescriptor): ResourceLaunchState {
  if (!target.sessionLaunchable || target.health.status === "unavailable") {
    return "blocked";
  }

  if (target.health.status === "degraded") {
    return "needs-attention";
  }

  return "session-ready";
}

export function createResourceCenterSnapshot(
  options: CreateResourceCenterSnapshotOptions = {},
): ResourceCenterSnapshot {
  const targets = (options.targets ?? DEFAULT_EXECUTION_TARGET_DESCRIPTORS).map((target) => ({
    targetId: target.targetId,
    workspaceId: target.workspaceId,
    kind: target.kind,
    label: target.label,
    authority: target.authority,
    connectorId: target.connector.connectorId,
    connectorLabel: target.connector.label,
    connectorTransport: target.connector.transport,
    diagnosticsHint: target.connector.diagnosticsHint,
    healthStatus: target.health.status,
    healthSummary: target.health.summary,
    sessionLaunchable: target.sessionLaunchable,
    launchState: getLaunchState(target),
    tags: [...target.tags],
  }) satisfies ResourceCenterTarget);

  return {
    counts: {
      totalTargets: targets.length,
      sessionReadyTargets: targets.filter((target) => target.launchState !== "blocked")
        .length,
      attentionTargets: targets.filter((target) => target.launchState === "needs-attention")
        .length,
      blockedTargets: targets.filter((target) => target.launchState === "blocked").length,
    },
    targets,
  };
}

export function summarizeResourceCenter(snapshot: ResourceCenterSnapshot) {
  return `${snapshot.counts.totalTargets} targets, ${snapshot.counts.sessionReadyTargets} session ready, ${snapshot.counts.attentionTargets} needs attention, ${snapshot.counts.blockedTargets} blocked`;
}

export function createIdleResourceLaunchStatus(): ResourceLaunchStatus {
  return {
    action: null,
    phase: "idle",
    targetId: null,
    summary: null,
  };
}

export function createPendingResourceLaunchStatus(
  target: ResourceCenterTarget,
  action: ResourceActionKind = "launch",
): ResourceLaunchStatus {
  return {
    action,
    phase: "launching",
    targetId: target.targetId,
    summary: null,
  };
}

function dedupeTags(tags: string[]) {
  return Array.from(new Set(tags));
}

function getDefaultConnectorCommand(
  kind: ResourceCenterTarget["kind"],
): string[] | null {
  switch (kind) {
    case "ssh":
      return ["bash", "-l"];
    case "docker-exec":
    case "kubernetes-exec":
      return ["/bin/sh"];
    default:
      return null;
  }
}

function getDefaultConnectorExecProbeCommand(
  kind: ResourceCenterTarget["kind"],
): string[] | null {
  switch (kind) {
    case "ssh":
    case "docker-exec":
    case "kubernetes-exec":
      return ["/bin/sh", "-lc", "pwd"];
    default:
      return null;
  }
}

function getDefaultRemoteRuntimeCommand(
  kind: ResourceCenterTarget["kind"],
): string[] | null {
  switch (kind) {
    case "remote-runtime":
      return ["/bin/sh"];
    default:
      return null;
  }
}

export function createResourceSessionDraft(
  target: ResourceCenterTarget,
): SessionCreateDraft | null {
  if (!target.sessionLaunchable || target.launchState === "blocked") {
    return null;
  }

  return {
    workspaceId: target.workspaceId,
    target: target.kind,
    modeTags: ["cli-native"],
    tags: dedupeTags([
      ...target.tags,
      `resource:${target.kind}`,
      `connector:${target.connectorId}`,
      `target:${target.targetId}`,
    ]),
  };
}

export function createConnectorSessionLaunchRequest(
  target: ResourceCenterTarget,
  command?: string[],
): ConnectorSessionLaunchRequest | null {
  if (
    !target.sessionLaunchable
    || target.launchState === "blocked"
    || target.connectorTransport !== "system-cli"
  ) {
    return null;
  }

  const resolvedCommand = (command?.length ? [...command] : getDefaultConnectorCommand(target.kind));
  if (!resolvedCommand) {
    return null;
  }

  switch (target.kind) {
    case "ssh":
    case "docker-exec":
    case "kubernetes-exec":
      return {
        workspaceId: target.workspaceId,
        target: target.kind,
        authority: target.authority,
        command: resolvedCommand,
        modeTags: ["cli-native"],
        tags: dedupeTags([
          ...target.tags,
          `resource:${target.kind}`,
          `connector:${target.connectorId}`,
          `target:${target.targetId}`,
        ]),
      };
    default:
      return null;
  }
}

export function createConnectorExecProbeRequest(
  target: ResourceCenterTarget,
  command?: string[],
): ConnectorSessionLaunchRequest | null {
  if (
    !target.sessionLaunchable
    || target.launchState === "blocked"
    || target.connectorTransport !== "system-cli"
  ) {
    return null;
  }

  const resolvedCommand = (
    command?.length ? [...command] : getDefaultConnectorExecProbeCommand(target.kind)
  );
  if (!resolvedCommand) {
    return null;
  }

  return createConnectorSessionLaunchRequest(target, resolvedCommand);
}

export function createRemoteRuntimeSessionCreateRequest(
  target: ResourceCenterTarget,
  command?: string[],
): RemoteRuntimeSessionCreateRequest | null {
  if (
    !target.sessionLaunchable
    || target.launchState === "blocked"
    || target.connectorTransport !== "remote-api"
  ) {
    return null;
  }

  const resolvedCommand = (
    command?.length ? [...command] : getDefaultRemoteRuntimeCommand(target.kind)
  );
  if (!resolvedCommand) {
    return null;
  }

  switch (target.kind) {
    case "remote-runtime":
      return {
        workspaceId: target.workspaceId,
        target: target.kind,
        authority: target.authority,
        command: resolvedCommand,
        modeTags: ["cli-native"],
        tags: dedupeTags([
          ...target.tags,
          `resource:${target.kind}`,
          `connector:${target.connectorId}`,
          `target:${target.targetId}`,
        ]),
      };
    default:
      return null;
  }
}

function normalizeCauseMessage(cause: unknown) {
  if (cause instanceof Error) {
    return cause.message;
  }

  return String(cause);
}

function summarizePayload(payload: string) {
  if (payload.length <= 120) {
    return payload;
  }

  return `${payload.slice(0, 117)}...`;
}

function getLaunchSummaryTone(launch: ResourceLaunchEvidence): ResourceLaunchSummaryTone {
  if (launch.state === "Failed") {
    return "danger";
  }

  if (launch.replayEntry.kind === "warning") {
    return "warning";
  }

  return "success";
}

function getActionDefaultLabel(action: ResourceActionKind) {
  return action === "launch" ? "Launch connector" : "Exec probe";
}

function getActionPendingLabel(action: ResourceActionKind) {
  return action === "launch" ? "Launching..." : "Probing...";
}

function getActionRetryLabel(action: ResourceActionKind) {
  return action === "launch" ? "Retry launch" : "Retry probe";
}

export function createResourceTargetActions(
  target: ResourceCenterTarget,
  launchStatus: ResourceLaunchStatus | null | undefined,
): ResourceTargetAction[] {
  const actionDescriptors = [
    {
      action: "launch" as const,
      enabled: createConnectorSessionLaunchRequest(target) !== null,
    },
    {
      action: "exec-probe" as const,
      enabled: createConnectorExecProbeRequest(target) !== null,
    },
  ];

  return actionDescriptors
    .filter((action) => action.enabled)
    .map((action) => {
      const isCurrentTarget = launchStatus?.targetId === target.targetId;
      const isCurrentAction = launchStatus?.action === action.action;
      const isPending = launchStatus?.phase === "launching" && isCurrentTarget && isCurrentAction;
      const isRetry = launchStatus?.phase === "failed" && isCurrentTarget && isCurrentAction;

      return {
        action: action.action,
        label: isPending
          ? getActionPendingLabel(action.action)
          : isRetry
            ? getActionRetryLabel(action.action)
            : getActionDefaultLabel(action.action),
        disabled: launchStatus?.phase === "launching",
      } satisfies ResourceTargetAction;
    });
}

export function createResourceLaunchSummary(
  target: ResourceCenterTarget,
  launch: ResourceLaunchEvidence,
): ResourceLaunchSummary {
  return {
    targetId: target.targetId,
    tone: getLaunchSummaryTone(launch),
    title: `${target.label} launch ${launch.state.toLowerCase()}`,
    detail: `${target.connectorLabel} -> ${launch.state} (${launch.sessionId})`,
    evidence: [
      `workspace=${launch.workspaceId}`,
      `authority=${target.authority}`,
      `replay=${launch.replayEntry.kind}`,
      `payload=${summarizePayload(launch.replayEntry.payload)}`,
    ],
  };
}

function createResourceActionFailureSummary(
  target: ResourceCenterTarget,
  action: ResourceActionKind,
  cause: unknown,
): ResourceLaunchSummary {
  return {
    targetId: target.targetId,
    tone: "danger",
    title: `${target.label} ${action === "launch" ? "launch" : "exec probe"} failed`,
    detail: normalizeCauseMessage(cause),
    evidence: [
      `connector=${target.connectorId}`,
      `transport=${target.connectorTransport}`,
      `authority=${target.authority}`,
    ],
  };
}

export function createResourceLaunchFailureSummary(
  target: ResourceCenterTarget,
  cause: unknown,
): ResourceLaunchSummary {
  return createResourceActionFailureSummary(target, "launch", cause);
}

export interface ResourceExecProbeEvidence {
  sessionId: string;
  workspaceId: string;
  target: string;
  state: string;
  createdAt: string;
  lastActiveAt: string;
  modeTags: string[];
  tags: string[];
  exitCode: number | null;
  replayEntries: ResourceLaunchReplayEvidence[];
}

function getRelevantExecReplayEntry(
  replayEntries: ResourceLaunchReplayEvidence[],
): ResourceLaunchReplayEvidence | null {
  for (let index = replayEntries.length - 1; index >= 0; index -= 1) {
    const entry = replayEntries[index];

    if (entry && entry.kind !== "exit" && entry.kind !== "state") {
      return entry;
    }
  }

  return replayEntries[replayEntries.length - 1] ?? null;
}

function getExecProbeSummaryTone(
  probe: ResourceExecProbeEvidence,
  replayEntry: ResourceLaunchReplayEvidence | null,
): ResourceLaunchSummaryTone {
  if (probe.exitCode !== null && probe.exitCode !== 0) {
    return "danger";
  }

  if (replayEntry?.kind === "warning") {
    return "warning";
  }

  return "success";
}

export function createResourceExecProbeSummary(
  target: ResourceCenterTarget,
  probe: ResourceExecProbeEvidence,
): ResourceLaunchSummary {
  const replayEntry = getRelevantExecReplayEntry(probe.replayEntries);
  const replayPayload = replayEntry ? summarizePayload(replayEntry.payload) : probe.state;
  const tone = getExecProbeSummaryTone(probe, replayEntry);
  const exitCode = probe.exitCode ?? -1;

  return {
    targetId: target.targetId,
    tone,
    title: `${target.label} exec probe ${probe.state.toLowerCase()}`,
    detail: `${target.connectorLabel} -> exit ${exitCode} (${replayPayload})`,
    evidence: [
      `workspace=${probe.workspaceId}`,
      `authority=${target.authority}`,
      `replay=${replayEntry?.kind ?? "none"}`,
      `exitCode=${probe.exitCode ?? "unknown"}`,
    ],
  };
}

export function createResourceExecProbeFailureSummary(
  target: ResourceCenterTarget,
  cause: unknown,
): ResourceLaunchSummary {
  return createResourceActionFailureSummary(target, "exec-probe", cause);
}

export function createDemoResourceCenterSnapshot() {
  return createResourceCenterSnapshot();
}
