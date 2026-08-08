import type { TerminalViewport } from "@sdkwork/terminal-pc-core";
import {
  resizeActiveRuntimeSession,
  type OnRuntimeTransportFailure,
} from "./runtime-effects";
import type { TerminalShellSnapshot } from "./model";
import type { UpdateShellState } from "./shell-state-bridge";
import type { SharedRuntimeClient } from "./terminal-stage-shared";

export const RUNTIME_RESIZE_DEBOUNCE_MS = 48;

interface MutableRefObjectLike<T> {
  current: T;
}

interface RuntimeResizeRequest {
  tabId: string;
  sessionId: string | null;
  runtimeState: TerminalShellSnapshot["tabs"][number]["runtimeState"];
  viewport: TerminalViewport;
  runtimeClient?: Pick<SharedRuntimeClient, "resizeSession"> | null;
  mountedRef: MutableRefObjectLike<boolean>;
  updateShellStateDeferred: UpdateShellState;
  onRuntimeTransportFailure?: OnRuntimeTransportFailure;
}

interface AppliedRuntimeResize {
  sessionId: string;
  cols: number;
  rows: number;
}

interface RuntimeResizeEntry {
  pending?: RuntimeResizeRequest;
  timer?: unknown;
  inFlight?: RuntimeResizeRequest;
  applied?: AppliedRuntimeResize;
}

export interface RuntimeResizeSchedulerTimer {
  setTimeout: (callback: () => void, delayMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface RuntimeResizeSchedulerOptions {
  debounceMs?: number;
  timer?: RuntimeResizeSchedulerTimer;
}

export interface RuntimeResizeScheduler {
  schedule: (request: RuntimeResizeRequest) => void;
  invalidateAppliedResize: (tabId: string) => void;
  syncTabs: (tabIds: readonly string[]) => void;
  cancel: (tabId: string) => void;
  dispose: () => void;
}

function isRunnableRuntimeResize(request: RuntimeResizeRequest) {
  return Boolean(
    request.runtimeClient &&
      request.sessionId &&
      request.runtimeState !== "exited" &&
      request.runtimeState !== "failed",
  );
}

function matchesResize(
  request: RuntimeResizeRequest,
  applied: AppliedRuntimeResize | undefined,
) {
  return Boolean(
    applied &&
      request.sessionId === applied.sessionId &&
      request.viewport.cols === applied.cols &&
      request.viewport.rows === applied.rows,
  );
}

function matchesRuntimeResizeRequest(
  left: RuntimeResizeRequest,
  right: RuntimeResizeRequest | undefined,
) {
  return Boolean(
    right &&
      left.sessionId === right.sessionId &&
      left.viewport.cols === right.viewport.cols &&
      left.viewport.rows === right.viewport.rows,
  );
}

export function createRuntimeResizeScheduler(
  options: RuntimeResizeSchedulerOptions = {},
): RuntimeResizeScheduler {
  const debounceMs = options.debounceMs ?? RUNTIME_RESIZE_DEBOUNCE_MS;
  const timer: RuntimeResizeSchedulerTimer = options.timer ?? {
    setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimeout: (handle) => {
      globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>);
    },
  };
  const entries = new Map<string, RuntimeResizeEntry>();
  let disposed = false;

  function cancelTimer(entry: RuntimeResizeEntry) {
    if (entry.timer === undefined) {
      return;
    }

    timer.clearTimeout(entry.timer);
    entry.timer = undefined;
  }

  function removeEntry(tabId: string) {
    const entry = entries.get(tabId);
    if (!entry) {
      return;
    }

    cancelTimer(entry);
    entries.delete(tabId);
  }

  function arm(tabId: string, entry: RuntimeResizeEntry, delayMs: number) {
    if (disposed || entry.timer || entry.inFlight || !entry.pending) {
      return;
    }

    entry.timer = timer.setTimeout(() => {
      entry.timer = undefined;
      void execute(tabId, entry);
    }, delayMs);
  }

  async function execute(tabId: string, entry: RuntimeResizeEntry) {
    if (disposed || entry.inFlight) {
      return;
    }

    const request = entry.pending;
    entry.pending = undefined;
    if (!request || !isRunnableRuntimeResize(request)) {
      return;
    }

    if (matchesResize(request, entry.applied)) {
      return;
    }

    entry.inFlight = request;
    const resized = await resizeActiveRuntimeSession(request);
    if (resized && request.sessionId) {
      entry.applied = {
        sessionId: request.sessionId,
        cols: request.viewport.cols,
        rows: request.viewport.rows,
      };
    }
    entry.inFlight = undefined;

    if (disposed || !entries.has(tabId)) {
      return;
    }

    if (!resized) {
      entry.pending = undefined;
      return;
    }

    arm(tabId, entry, 0);
  }

  return {
    schedule(request) {
      if (disposed) {
        return;
      }

      if (!isRunnableRuntimeResize(request)) {
        removeEntry(request.tabId);
        return;
      }

      const entry = entries.get(request.tabId) ?? {};
      entries.set(request.tabId, entry);

      if (matchesRuntimeResizeRequest(request, entry.inFlight)) {
        entry.pending = undefined;
        cancelTimer(entry);
        return;
      }

      if (!entry.inFlight && matchesResize(request, entry.applied)) {
        entry.pending = undefined;
        cancelTimer(entry);
        return;
      }

      if (matchesRuntimeResizeRequest(request, entry.pending)) {
        return;
      }

      entry.pending = request;
      if (!entry.inFlight) {
        cancelTimer(entry);
        arm(request.tabId, entry, debounceMs);
      }
    },

    invalidateAppliedResize(tabId) {
      const entry = entries.get(tabId);
      if (entry) {
        entry.applied = undefined;
      }
    },

    syncTabs(tabIds) {
      const activeTabIds = new Set(tabIds);
      for (const tabId of entries.keys()) {
        if (!activeTabIds.has(tabId)) {
          removeEntry(tabId);
        }
      }
    },

    cancel(tabId) {
      removeEntry(tabId);
    },

    dispose() {
      disposed = true;
      for (const tabId of entries.keys()) {
        removeEntry(tabId);
      }
    },
  };
}
