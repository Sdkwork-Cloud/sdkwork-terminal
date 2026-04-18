import {
  createResourceCenterSnapshot,
  type ResourceCenterSnapshot,
} from "@sdkwork/terminal-resources/model";
import type { DesktopRuntimeBridgeClient } from "@sdkwork/terminal-infrastructure";

export function createEmptyDesktopResourceCenterSnapshot(): ResourceCenterSnapshot {
  return createResourceCenterSnapshot({ targets: [] });
}

export function createFallbackDesktopResourceCenterSnapshot(): ResourceCenterSnapshot {
  return createEmptyDesktopResourceCenterSnapshot();
}

export async function loadDesktopResourceCenterSnapshot(
  client: Pick<DesktopRuntimeBridgeClient, "executionTargets">,
): Promise<ResourceCenterSnapshot> {
  const targets = await client.executionTargets();
  return createResourceCenterSnapshot({ targets });
}
