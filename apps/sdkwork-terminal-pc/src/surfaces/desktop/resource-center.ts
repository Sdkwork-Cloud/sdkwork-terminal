import {
  createResourceCenterSnapshot,
  type ResourceCenterSnapshot,
} from "@sdkwork/terminal-pc-resources/model";
import type { DesktopRuntimeBridgeClient } from "@sdkwork/terminal-pc-infrastructure";

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

