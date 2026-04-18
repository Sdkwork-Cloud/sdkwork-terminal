import assert from "node:assert/strict";
import test from "node:test";

import { resolveQueuedSessionCenterRefreshAction } from "../apps/desktop/src/session-center-refresh-policy.ts";

test("session center refresh queue ignores load-more while preserving current pending action", () => {
  assert.equal(
    resolveQueuedSessionCenterRefreshAction({
      current: null,
      next: "load-more",
      active: "load-more",
    }),
    null,
  );

  assert.equal(
    resolveQueuedSessionCenterRefreshAction({
      current: "refresh",
      next: "load-more",
      active: "load-more",
    }),
    "refresh",
  );
});

test("session center refresh queue keeps queued load-more while refresh is active", () => {
  assert.equal(
    resolveQueuedSessionCenterRefreshAction({
      current: null,
      next: "load-more",
      active: "refresh",
    }),
    "load-more",
  );
});

test("session center refresh queue preserves pending open over later load-more", () => {
  assert.equal(
    resolveQueuedSessionCenterRefreshAction({
      current: "open",
      next: "load-more",
      active: "refresh",
    }),
    "open",
  );
});

test("session center refresh queue upgrades pending refresh to open", () => {
  assert.equal(
    resolveQueuedSessionCenterRefreshAction({
      current: "refresh",
      next: "open",
      active: "refresh",
    }),
    "open",
  );
});

test("session center refresh queue preserves pending load-more over later refresh", () => {
  assert.equal(
    resolveQueuedSessionCenterRefreshAction({
      current: "load-more",
      next: "refresh",
      active: "refresh",
    }),
    "load-more",
  );
});

test("session center refresh queue keeps refresh when no higher-priority action exists", () => {
  assert.equal(
    resolveQueuedSessionCenterRefreshAction({
      current: null,
      next: "refresh",
      active: "open",
    }),
    "refresh",
  );
});
