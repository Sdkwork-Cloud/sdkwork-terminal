import test from "node:test";
import assert from "node:assert/strict";

import {
  createSessionCenterRefreshMachineState,
  openSessionCenterRefreshMachine,
  queueSessionCenterRefreshMachineAction,
  settleSessionCenterRefreshMachineRequest,
  closeSessionCenterRefreshMachine,
} from "../apps/desktop/src/session-center-refresh-machine.ts";

test("session center refresh machine clears stale pending actions when the drawer closes before settle", () => {
  let state = createSessionCenterRefreshMachineState({
    totalSessions: 120,
    deferredReplayCount: 96,
  });
  const requestLog: Array<{ action: string; preloadLimit: number }> = [];

  const open = openSessionCenterRefreshMachine(state);
  state = open.state;
  if (open.request) {
    requestLog.push(open.request);
  }

  const queueRefresh = queueSessionCenterRefreshMachineAction(state, "refresh");
  state = queueRefresh.state;
  assert.equal(queueRefresh.request, null);

  const queueLoadMore = queueSessionCenterRefreshMachineAction(state, "load-more");
  state = queueLoadMore.state;
  assert.equal(queueLoadMore.request, null);
  assert.equal(state.pendingAction, "load-more");

  state = closeSessionCenterRefreshMachine(state);
  assert.equal(state.pendingAction, null);
  assert.equal(state.open, false);

  const reopen = openSessionCenterRefreshMachine(state);
  state = reopen.state;
  assert.equal(state.pendingAction, "open");
  assert.equal(reopen.request, null);

  const settleOpen = settleSessionCenterRefreshMachineRequest(state, {
    totalSessions: 120,
    deferredReplayCount: 96,
  });
  state = settleOpen.state;
  if (settleOpen.request) {
    requestLog.push(settleOpen.request);
  }

  assert.deepEqual(requestLog, [
    { action: "open", preloadLimit: 24 },
    { action: "open", preloadLimit: 24 },
  ]);

  const settleReopen = settleSessionCenterRefreshMachineRequest(state, {
    totalSessions: 120,
    deferredReplayCount: 96,
  });
  state = settleReopen.state;
  assert.equal(settleReopen.request, null);

  assert.equal(state.pendingAction, null);
  assert.equal(state.activeAction, null);
  assert.equal(state.inFlight, false);
  assert.equal(state.preloadLimit, 24);
  assert.equal(state.totalSessions, 120);
  assert.equal(state.deferredReplayCount, 96);
});

test("session center refresh machine tails queued load-more after refresh settle and expands preload window", () => {
  let state = createSessionCenterRefreshMachineState({
    totalSessions: 120,
    deferredReplayCount: 96,
  });
  const requestLog: Array<{ action: string; preloadLimit: number }> = [];

  const open = openSessionCenterRefreshMachine(state);
  state = open.state;
  if (open.request) {
    requestLog.push(open.request);
  }

  const settleOpen = settleSessionCenterRefreshMachineRequest(state, {
    totalSessions: 120,
    deferredReplayCount: 96,
  });
  state = settleOpen.state;
  assert.equal(settleOpen.request, null);

  const refresh = queueSessionCenterRefreshMachineAction(state, "refresh");
  state = refresh.state;
  if (refresh.request) {
    requestLog.push(refresh.request);
  }
  assert.equal(state.activeAction, "refresh");

  const queueLoadMore = queueSessionCenterRefreshMachineAction(state, "load-more");
  state = queueLoadMore.state;
  assert.equal(queueLoadMore.request, null);
  assert.equal(state.pendingAction, "load-more");

  const settleRefresh = settleSessionCenterRefreshMachineRequest(state, {
    totalSessions: 120,
    deferredReplayCount: 96,
  });
  state = settleRefresh.state;
  if (settleRefresh.request) {
    requestLog.push(settleRefresh.request);
  }

  assert.deepEqual(requestLog, [
    { action: "open", preloadLimit: 24 },
    { action: "refresh", preloadLimit: 24 },
    { action: "load-more", preloadLimit: 48 },
  ]);

  const settleLoadMore = settleSessionCenterRefreshMachineRequest(state, {
    totalSessions: 120,
    deferredReplayCount: 72,
  });
  state = settleLoadMore.state;
  assert.equal(settleLoadMore.request, null);

  assert.equal(state.pendingAction, null);
  assert.equal(state.activeAction, null);
  assert.equal(state.inFlight, false);
  assert.equal(state.preloadLimit, 48);
  assert.equal(state.deferredReplayCount, 72);
});

test("session center refresh machine suppresses duplicate load-more while load-more is already active", () => {
  let state = createSessionCenterRefreshMachineState({
    totalSessions: 120,
    deferredReplayCount: 96,
    open: true,
  });
  const requestLog: Array<{ action: string; preloadLimit: number }> = [];

  const loadMore = queueSessionCenterRefreshMachineAction(state, "load-more");
  state = loadMore.state;
  if (loadMore.request) {
    requestLog.push(loadMore.request);
  }

  const duplicateLoadMore = queueSessionCenterRefreshMachineAction(state, "load-more");
  state = duplicateLoadMore.state;
  assert.equal(duplicateLoadMore.request, null);
  assert.equal(state.pendingAction, null);

  const settleLoadMore = settleSessionCenterRefreshMachineRequest(state, {
    totalSessions: 120,
    deferredReplayCount: 72,
  });
  state = settleLoadMore.state;
  assert.equal(settleLoadMore.request, null);

  assert.deepEqual(requestLog, [{ action: "load-more", preloadLimit: 48 }]);
  assert.equal(state.activeAction, null);
  assert.equal(state.inFlight, false);
  assert.equal(state.loading, false);
});
