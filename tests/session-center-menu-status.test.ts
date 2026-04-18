import test from "node:test";
import assert from "node:assert/strict";

import { summarizeSessionCenterMenuSubtitle } from "../packages/sdkwork-terminal-shell/src/session-center-status.ts";

test("session center menu subtitle falls back to reconnect hint when diagnostics are absent", () => {
  assert.equal(
    summarizeSessionCenterMenuSubtitle(undefined),
    "Reconnect detached shell sessions",
  );
});

test("session center menu subtitle exposes indexed session counts", () => {
  assert.equal(
    summarizeSessionCenterMenuSubtitle({
      totalSessions: 12,
      loadedReplayCount: 12,
      deferredReplayCount: 0,
      unavailableReplayCount: 0,
    }),
    "12 sessions indexed / 12 replay loaded",
  );
});

test("session center menu subtitle includes deferred and unavailable replay counts", () => {
  assert.equal(
    summarizeSessionCenterMenuSubtitle({
      totalSessions: 12,
      loadedReplayCount: 8,
      deferredReplayCount: 3,
      unavailableReplayCount: 1,
    }),
    "12 sessions indexed / 8 replay loaded / 3 replay deferred / 1 replay unavailable",
  );
});
