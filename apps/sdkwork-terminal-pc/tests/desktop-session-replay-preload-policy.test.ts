import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT,
  resolveSessionReplayPreloadLimit,
} from "../apps/desktop/src/session-replay-preload-policy.ts";

test("session replay preload policy resets to default on open", () => {
  assert.equal(
    resolveSessionReplayPreloadLimit({
      action: "open",
      currentLimit: 96,
      totalSessions: 240,
    }),
    DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT,
  );
});

test("session replay preload policy keeps current limit on refresh", () => {
  assert.equal(
    resolveSessionReplayPreloadLimit({
      action: "refresh",
      currentLimit: 96,
      totalSessions: 240,
    }),
    96,
  );
});

test("session replay preload policy expands aggressively on load-more", () => {
  assert.equal(
    resolveSessionReplayPreloadLimit({
      action: "load-more",
      currentLimit: 24,
      totalSessions: 240,
    }),
    48,
  );

  assert.equal(
    resolveSessionReplayPreloadLimit({
      action: "load-more",
      currentLimit: 48,
      totalSessions: 240,
    }),
    96,
  );
});

test("session replay preload policy caps load-more limit to total sessions", () => {
  assert.equal(
    resolveSessionReplayPreloadLimit({
      action: "load-more",
      currentLimit: 96,
      totalSessions: 120,
    }),
    120,
  );
});

test("session replay preload policy keeps current limit when total is unknown", () => {
  assert.equal(
    resolveSessionReplayPreloadLimit({
      action: "load-more",
      currentLimit: 48,
      totalSessions: 0,
    }),
    48,
  );
});

test("session replay preload policy keeps current limit when load-more is requested during an in-flight refresh", () => {
  assert.equal(
    resolveSessionReplayPreloadLimit({
      action: "load-more",
      currentLimit: 48,
      totalSessions: 240,
      deferredReplayCount: 120,
      loading: true,
    }),
    48,
  );
});

test("session replay preload policy keeps current limit when load-more is requested without deferred replay", () => {
  assert.equal(
    resolveSessionReplayPreloadLimit({
      action: "load-more",
      currentLimit: 96,
      totalSessions: 240,
      deferredReplayCount: 0,
    }),
    96,
  );
});

test("session replay preload policy keeps rapid load-more and refresh interaction stable once deferred replay is drained", () => {
  let currentLimit = DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT;

  currentLimit = resolveSessionReplayPreloadLimit({
    action: "load-more",
    currentLimit,
    totalSessions: 240,
    deferredReplayCount: 120,
  });
  assert.equal(currentLimit, 48);

  currentLimit = resolveSessionReplayPreloadLimit({
    action: "refresh",
    currentLimit,
    totalSessions: 240,
    deferredReplayCount: 120,
  });
  assert.equal(currentLimit, 48);

  currentLimit = resolveSessionReplayPreloadLimit({
    action: "load-more",
    currentLimit,
    totalSessions: 240,
    deferredReplayCount: 0,
  });
  assert.equal(currentLimit, 48);
});
