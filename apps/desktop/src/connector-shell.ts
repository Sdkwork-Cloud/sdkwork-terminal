import type {
  DesktopConnectorLaunchEntry,
  DesktopConnectorSessionIntent,
} from "@sdkwork/terminal-shell";
import {
  createConnectorSessionLaunchRequest,
  type ResourceCenterSnapshot,
  type ResourceCenterTarget,
} from "../../../packages/sdkwork-terminal-resources/src/model.ts";

let desktopConnectorIntentSequence = 0;

function resolveConnectorEntryLabel(target: ResourceCenterTarget) {
  switch (target.kind) {
    case "ssh":
      return "SSH";
    case "docker-exec":
      return "Docker";
    case "kubernetes-exec":
      return "Kubernetes";
    default:
      return target.label;
  }
}

function resolveConnectorEntryAccent(target: ResourceCenterTarget) {
  switch (target.kind) {
    case "ssh":
      return "#38bdf8";
    case "docker-exec":
      return "#34d399";
    case "kubernetes-exec":
      return "#60a5fa";
    default:
      return "#a1a1aa";
  }
}

function resolveConnectorShellProfile(): DesktopConnectorSessionIntent["profile"] {
  return "bash";
}

function resolveConnectorTargetLabel(target: ResourceCenterTarget) {
  return `${target.kind} / ${target.authority}`;
}

function createDesktopConnectorIntentRequestId(
  target: ResourceCenterTarget,
  request: DesktopConnectorSessionIntent["request"],
) {
  desktopConnectorIntentSequence += 1;
  return `${target.targetId}:${request.target}:${request.authority}:${desktopConnectorIntentSequence}`;
}

export function createDesktopConnectorMenuEntries(
  snapshot: ResourceCenterSnapshot,
): DesktopConnectorLaunchEntry[] {
  return snapshot.targets
    .filter((target) => createConnectorSessionLaunchRequest(target) !== null)
    .map((target) => ({
      targetId: target.targetId,
      label: resolveConnectorEntryLabel(target),
      subtitle: target.authority,
      accent: resolveConnectorEntryAccent(target),
    }));
}

export function findDesktopConnectorTargetById(
  targetId: string,
  snapshot: ResourceCenterSnapshot,
) {
  return snapshot.targets.find((target) => target.targetId === targetId) ?? null;
}

export function createDesktopConnectorSessionIntent(
  target: ResourceCenterTarget,
  options: {
    requestId?: string;
  } = {},
): DesktopConnectorSessionIntent {
  const request = createConnectorSessionLaunchRequest(target);
  if (!request) {
    throw new Error(`target ${target.targetId} is not eligible for desktop connector launch`);
  }

  return {
    requestId:
      options.requestId ?? createDesktopConnectorIntentRequestId(target, request),
    profile: resolveConnectorShellProfile(),
    title: resolveConnectorEntryLabel(target),
    targetLabel: resolveConnectorTargetLabel(target),
    request,
  };
}
