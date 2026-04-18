import type { DesktopRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";
import {
  createConnectorExecProbeRequest,
  createConnectorSessionLaunchRequest,
  createResourceExecProbeFailureSummary,
  createResourceExecProbeSummary,
  createResourceLaunchFailureSummary,
  createResourceLaunchSummary,
  type ResourceCenterTarget,
  type ResourceLaunchStatus,
} from "@sdkwork/terminal-resources/model";

export async function launchDesktopResourceTarget(
  target: ResourceCenterTarget,
  client: Pick<DesktopRuntimeBridgeClient, "launchConnectorSession">,
): Promise<ResourceLaunchStatus> {
  const request = createConnectorSessionLaunchRequest(target);

  if (!request) {
    return {
      action: "launch",
      phase: "failed",
      targetId: target.targetId,
      summary: createResourceLaunchFailureSummary(
        target,
        "target is not eligible for desktop connector launch",
      ),
    };
  }

  try {
    const snapshot = await client.launchConnectorSession(request);
    const summary = createResourceLaunchSummary(target, snapshot);

    return {
      action: "launch",
      phase: summary.tone === "danger" ? "failed" : "succeeded",
      targetId: target.targetId,
      summary,
    };
  } catch (cause) {
    return {
      action: "launch",
      phase: "failed",
      targetId: target.targetId,
      summary: createResourceLaunchFailureSummary(target, cause),
    };
  }
}

export async function probeDesktopResourceTarget(
  target: ResourceCenterTarget,
  client: Pick<DesktopRuntimeBridgeClient, "probeConnectorExecSession">,
): Promise<ResourceLaunchStatus> {
  const request = createConnectorExecProbeRequest(target);

  if (!request) {
    return {
      action: "exec-probe",
      phase: "failed",
      targetId: target.targetId,
      summary: createResourceExecProbeFailureSummary(
        target,
        "target is not eligible for desktop connector exec probe",
      ),
    };
  }

  try {
    const snapshot = await client.probeConnectorExecSession(request);
    const summary = createResourceExecProbeSummary(target, snapshot);

    return {
      action: "exec-probe",
      phase: summary.tone === "danger" ? "failed" : "succeeded",
      targetId: target.targetId,
      summary,
    };
  } catch (cause) {
    return {
      action: "exec-probe",
      phase: "failed",
      targetId: target.targetId,
      summary: createResourceExecProbeFailureSummary(target, cause),
    };
  }
}
