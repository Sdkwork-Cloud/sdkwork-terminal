import test from "node:test";
import assert from "node:assert/strict";

import {
  createResourceCenterSnapshot,
} from "../packages/sdkwork-terminal-resources/src/model.ts";

test("desktop resource catalog state starts empty without demo fallback targets", async () => {
  const resourceCatalogState = await import(
    "../apps/desktop/src/resource-catalog-state.ts"
  ).catch(() => null);

  assert.ok(resourceCatalogState);
  assert.equal(typeof resourceCatalogState.createDesktopResourceCatalogState, "function");

  const state = resourceCatalogState.createDesktopResourceCatalogState();

  assert.equal(state.status, "empty");
  assert.equal(state.error, null);
  assert.equal(state.snapshot.counts.totalTargets, 0);
  assert.equal(state.snapshot.targets.length, 0);
});

test("desktop resource catalog keeps last successful snapshot as stale when refresh fails", async () => {
  const resourceCatalogState = await import(
    "../apps/desktop/src/resource-catalog-state.ts"
  ).catch(() => null);

  assert.ok(resourceCatalogState);
  assert.equal(typeof resourceCatalogState.applyDesktopResourceCatalogRefreshSuccess, "function");
  assert.equal(typeof resourceCatalogState.applyDesktopResourceCatalogRefreshFailure, "function");

  const readySnapshot = createResourceCenterSnapshot({
    targets: [
      {
        targetId: "target-ssh-primary",
        workspaceId: "workspace-runtime",
        kind: "ssh",
        label: "SSH",
        authority: "ops@edge-node",
        connector: {
          connectorId: "system-ssh",
          label: "System SSH",
          transport: "system-cli",
          diagnosticsHint: "Check ssh binary",
        },
        health: {
          status: "ready",
          summary: "SSH ready",
          lastCheckedAt: "2026-04-12T08:00:00.000Z",
        },
        sessionLaunchable: true,
        tags: ["remote", "system-ssh"],
      },
    ],
  });
  const readyState = resourceCatalogState.applyDesktopResourceCatalogRefreshSuccess(
    resourceCatalogState.createDesktopResourceCatalogState(),
    readySnapshot,
  );
  const staleState = resourceCatalogState.applyDesktopResourceCatalogRefreshFailure(
    readyState,
    new Error("desktop_execution_target_catalog unavailable"),
  );

  assert.equal(staleState.status, "stale");
  assert.equal(staleState.error, "desktop_execution_target_catalog unavailable");
  assert.equal(staleState.snapshot.counts.totalTargets, 1);
  assert.equal(staleState.snapshot.targets[0]?.targetId, "target-ssh-primary");
});

test("desktop resource catalog stays empty when initial refresh fails", async () => {
  const resourceCatalogState = await import(
    "../apps/desktop/src/resource-catalog-state.ts"
  ).catch(() => null);

  assert.ok(resourceCatalogState);
  assert.equal(typeof resourceCatalogState.applyDesktopResourceCatalogRefreshFailure, "function");

  const failedState = resourceCatalogState.applyDesktopResourceCatalogRefreshFailure(
    resourceCatalogState.createDesktopResourceCatalogState(),
    new Error("host bridge unavailable"),
  );

  assert.equal(failedState.status, "error");
  assert.equal(failedState.error, "host bridge unavailable");
  assert.equal(failedState.snapshot.counts.totalTargets, 0);
  assert.equal(failedState.snapshot.targets.length, 0);
});
