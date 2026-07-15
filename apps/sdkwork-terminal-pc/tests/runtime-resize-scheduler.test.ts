import assert from "node:assert/strict";
import test from "node:test";

import {
  createRuntimeResizeScheduler,
  type RuntimeResizeSchedulerTimer,
} from "../packages/sdkwork-terminal-pc-shell/src/runtime-resize-scheduler.ts";

interface ScheduledTimer {
  callback: () => void;
  delayMs: number;
  cancelled: boolean;
}

function createFakeTimer() {
  const timers: ScheduledTimer[] = [];
  const timer: RuntimeResizeSchedulerTimer = {
    setTimeout(callback, delayMs) {
      const scheduled: ScheduledTimer = {
        callback,
        delayMs,
        cancelled: false,
      };
      timers.push(scheduled);
      return scheduled as never;
    },
    clearTimeout(handle) {
      (handle as unknown as ScheduledTimer).cancelled = true;
    },
  };

  return {
    timer,
    timers,
    runNext() {
      const next = timers.find((entry) => !entry.cancelled);
      if (!next) {
        return false;
      }

      next.cancelled = true;
      next.callback();
      return true;
    },
  };
}

async function flushMicrotasks(cycles = 6) {
  for (let index = 0; index < cycles; index += 1) {
    await Promise.resolve();
  }
}

function createResizeRequest(args: {
  tabId?: string;
  sessionId?: string;
  cols: number;
  rows: number;
  resizeCalls: Array<{ sessionId: string; cols: number; rows: number }>;
}) {
  return {
    tabId: args.tabId ?? "tab-remote-0001",
    sessionId: args.sessionId ?? "session-remote-0001",
    runtimeState: "running" as const,
    viewport: {
      cols: args.cols,
      rows: args.rows,
    },
    runtimeClient: {
      async resizeSession(request: { sessionId: string; cols: number; rows: number }) {
        args.resizeCalls.push(request);
        return request;
      },
    },
    mountedRef: { current: true },
    updateShellStateDeferred() {},
  };
}

test("runtime resize scheduler coalesces rapid viewport changes to the latest dimensions", async () => {
  const fakeTimer = createFakeTimer();
  const resizeCalls: Array<{ sessionId: string; cols: number; rows: number }> = [];
  const scheduler = createRuntimeResizeScheduler({
    debounceMs: 48,
    timer: fakeTimer.timer,
  });

  scheduler.schedule(createResizeRequest({ cols: 100, rows: 30, resizeCalls }));
  scheduler.schedule(createResizeRequest({ cols: 120, rows: 36, resizeCalls }));
  scheduler.schedule(createResizeRequest({ cols: 132, rows: 40, resizeCalls }));

  assert.equal(fakeTimer.timers.length, 3);
  assert.equal(fakeTimer.timers[0]?.cancelled, true);
  assert.equal(fakeTimer.timers[1]?.cancelled, true);
  assert.equal(fakeTimer.timers[2]?.delayMs, 48);
  assert.equal(fakeTimer.runNext(), true);
  await flushMicrotasks();

  assert.deepEqual(resizeCalls, [
    {
      sessionId: "session-remote-0001",
      cols: 132,
      rows: 40,
    },
  ]);
});

test("runtime resize scheduler queues only the latest resize while a prior request is in flight", async () => {
  const fakeTimer = createFakeTimer();
  const resizeCalls: Array<{ sessionId: string; cols: number; rows: number }> = [];
  let releaseFirstResize: (() => void) | null = null;
  const firstResizeGate = new Promise<void>((resolve) => {
    releaseFirstResize = resolve;
  });
  let callCount = 0;
  const scheduler = createRuntimeResizeScheduler({
    debounceMs: 48,
    timer: fakeTimer.timer,
  });
  const createRequest = (cols: number, rows: number) => ({
    ...createResizeRequest({ cols, rows, resizeCalls }),
    runtimeClient: {
      async resizeSession(request: { sessionId: string; cols: number; rows: number }) {
        resizeCalls.push(request);
        callCount += 1;
        if (callCount === 1) {
          await firstResizeGate;
        }
        return request;
      },
    },
  });

  scheduler.schedule(createRequest(100, 30));
  assert.equal(fakeTimer.runNext(), true);
  await flushMicrotasks(1);

  scheduler.schedule(createRequest(120, 36));
  scheduler.schedule(createRequest(132, 40));
  assert.equal(fakeTimer.runNext(), false);

  releaseFirstResize?.();
  await flushMicrotasks();
  assert.equal(fakeTimer.runNext(), true);
  await flushMicrotasks();

  assert.deepEqual(resizeCalls, [
    {
      sessionId: "session-remote-0001",
      cols: 100,
      rows: 30,
    },
    {
      sessionId: "session-remote-0001",
      cols: 132,
      rows: 40,
    },
  ]);
});

test("runtime resize scheduler discards a superseded pending size when the latest size matches in-flight work", async () => {
  const fakeTimer = createFakeTimer();
  const resizeCalls: Array<{ sessionId: string; cols: number; rows: number }> = [];
  let releaseFirstResize: (() => void) | null = null;
  const firstResizeGate = new Promise<void>((resolve) => {
    releaseFirstResize = resolve;
  });
  let callCount = 0;
  const scheduler = createRuntimeResizeScheduler({
    debounceMs: 48,
    timer: fakeTimer.timer,
  });
  const createRequest = (cols: number, rows: number) => ({
    ...createResizeRequest({ cols, rows, resizeCalls }),
    runtimeClient: {
      async resizeSession(request: { sessionId: string; cols: number; rows: number }) {
        resizeCalls.push(request);
        callCount += 1;
        if (callCount === 1) {
          await firstResizeGate;
        }
        return request;
      },
    },
  });

  scheduler.schedule(createRequest(100, 30));
  assert.equal(fakeTimer.runNext(), true);
  await flushMicrotasks(1);

  scheduler.schedule(createRequest(132, 40));
  scheduler.schedule(createRequest(100, 30));
  releaseFirstResize?.();
  await flushMicrotasks();

  assert.equal(fakeTimer.runNext(), false);
  assert.deepEqual(resizeCalls, [
    {
      sessionId: "session-remote-0001",
      cols: 100,
      rows: 30,
    },
  ]);
});

test("runtime resize scheduler resends the current viewport after recovery invalidates applied dimensions", async () => {
  const fakeTimer = createFakeTimer();
  const resizeCalls: Array<{ sessionId: string; cols: number; rows: number }> = [];
  const scheduler = createRuntimeResizeScheduler({
    debounceMs: 48,
    timer: fakeTimer.timer,
  });
  const request = createResizeRequest({
    cols: 132,
    rows: 40,
    resizeCalls,
  });

  scheduler.schedule(request);
  assert.equal(fakeTimer.runNext(), true);
  await flushMicrotasks();

  scheduler.invalidateAppliedResize(request.tabId);
  scheduler.schedule(request);
  assert.equal(fakeTimer.runNext(), true);
  await flushMicrotasks();

  assert.deepEqual(resizeCalls, [
    {
      sessionId: "session-remote-0001",
      cols: 132,
      rows: 40,
    },
    {
      sessionId: "session-remote-0001",
      cols: 132,
      rows: 40,
    },
  ]);
});

test("runtime resize scheduler cancels work for removed tabs and disposed shells", async () => {
  const fakeTimer = createFakeTimer();
  const resizeCalls: Array<{ sessionId: string; cols: number; rows: number }> = [];
  const scheduler = createRuntimeResizeScheduler({
    debounceMs: 48,
    timer: fakeTimer.timer,
  });

  scheduler.schedule(createResizeRequest({ cols: 132, rows: 40, resizeCalls }));
  scheduler.syncTabs([]);
  assert.equal(fakeTimer.runNext(), false);

  scheduler.schedule(createResizeRequest({ cols: 140, rows: 42, resizeCalls }));
  scheduler.dispose();
  assert.equal(fakeTimer.runNext(), false);
  await flushMicrotasks();
  assert.deepEqual(resizeCalls, []);
});
