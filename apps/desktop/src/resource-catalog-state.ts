import type { ResourceCenterSnapshot } from "@sdkwork/terminal-resources/model";
import { createEmptyDesktopResourceCenterSnapshot } from "./resource-center.ts";

export type DesktopResourceCatalogStatus = "empty" | "ready" | "stale" | "error";

export interface DesktopResourceCatalogState {
  snapshot: ResourceCenterSnapshot;
  status: DesktopResourceCatalogStatus;
  error: string | null;
  observedAt: string | null;
}

function getErrorMessage(cause: unknown) {
  if (cause instanceof Error && cause.message) {
    return cause.message;
  }

  if (typeof cause === "string" && cause) {
    return cause;
  }

  return "unknown desktop resource catalog failure";
}

export function createDesktopResourceCatalogState(): DesktopResourceCatalogState {
  return {
    snapshot: createEmptyDesktopResourceCenterSnapshot(),
    status: "empty",
    error: null,
    observedAt: null,
  };
}

export function applyDesktopResourceCatalogRefreshSuccess(
  current: DesktopResourceCatalogState,
  snapshot: ResourceCenterSnapshot,
  observedAt = new Date().toISOString(),
): DesktopResourceCatalogState {
  if (
    current.status === "ready" &&
    current.snapshot === snapshot &&
    current.error === null
  ) {
    return current;
  }

  return {
    snapshot,
    status: "ready",
    error: null,
    observedAt,
  };
}

export function applyDesktopResourceCatalogRefreshFailure(
  current: DesktopResourceCatalogState,
  cause: unknown,
): DesktopResourceCatalogState {
  const error = getErrorMessage(cause);
  const hasLoadedSnapshot =
    current.observedAt !== null || current.snapshot.targets.length > 0;

  if (!hasLoadedSnapshot) {
    return {
      snapshot: createEmptyDesktopResourceCenterSnapshot(),
      status: "error",
      error,
      observedAt: null,
    };
  }

  return {
    ...current,
    status: "stale",
    error,
  };
}
