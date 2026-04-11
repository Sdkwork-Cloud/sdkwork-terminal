import {
  createResourceCenterSnapshot,
  type ResourceCenterSnapshot,
} from "../../../packages/sdkwork-terminal-resources/src/model.ts";
import type { DesktopRuntimeBridgeClient } from "../../../packages/sdkwork-terminal-infrastructure/src/index.ts";

export function createFallbackDesktopResourceCenterSnapshot(): ResourceCenterSnapshot {
  return createResourceCenterSnapshot();
}

export async function loadDesktopResourceCenterSnapshot(
  client: Pick<DesktopRuntimeBridgeClient, "executionTargets">,
): Promise<ResourceCenterSnapshot> {
  const targets = await client.executionTargets();
  return createResourceCenterSnapshot({ targets });
}
