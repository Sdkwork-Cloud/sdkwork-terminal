import type { TerminalViewport } from "@sdkwork/terminal-core";
import {
  createXtermViewportDriver,
  type RuntimeSessionReplaySnapshot,
  type RuntimeSessionStreamEvent,
  type TerminalViewportRuntimeState,
  type TerminalViewportInput,
  type XtermViewportDriver,
} from "@sdkwork/terminal-infrastructure";
import { splitTerminalClipboardPaste } from "./terminal-clipboard.ts";

export interface RuntimeTabControllerClient {
  sessionReplay: (
    sessionId: string,
    request?: {
      fromCursor?: string;
      limit?: number;
    },
  ) => Promise<RuntimeSessionReplaySnapshot>;
  writeSessionInput: (request: {
    sessionId: string;
    input: string;
  }) => Promise<{
    sessionId: string;
    acceptedBytes: number;
  }>;
  writeSessionInputBytes: (request: {
    sessionId: string;
    inputBytes: number[];
  }) => Promise<{
    sessionId: string;
    acceptedBytes: number;
  }>;
  subscribeSessionEvents?: (
    sessionId: string,
    listener: (event: RuntimeSessionStreamEvent) => void,
  ) => Promise<() => void | Promise<void>>;
}

export interface RuntimeTabControllerCallbacks {
  onBufferedInput?: (input: TerminalViewportInput) => void;
  onReplayApplied?: (args: {
    nextCursor: string;
    entries: RuntimeSessionReplaySnapshot["entries"];
  }) => void;
  onTitleChange?: (title: string) => void;
  onRuntimeError?: (message: string) => void;
}

export type RuntimeTabControllerDriver = Pick<
  XtermViewportDriver,
  | "attach"
  | "writeRaw"
  | "search"
  | "getSelection"
  | "selectAll"
  | "paste"
  | "setInputListener"
  | "setTitleListener"
  | "setRuntimeMode"
  | "measureViewport"
  | "focus"
  | "dispose"
  | "setFontSize"
  | "setDisableStdin"
  | "setCursorVisible"
  | "getRuntimeState"
>;

interface RuntimeTabControllerBinding {
  sessionId: string;
  cursor: string | null;
  attachmentId?: string | null;
  client: RuntimeTabControllerClient;
  acknowledgeAttachment?: (request: {
    attachmentId: string;
    sequence: number;
  }) => Promise<unknown>;
}

interface PendingAttachmentAcknowledge {
  attachmentId: string;
  sequence: number;
  acknowledgeAttachment: NonNullable<RuntimeTabControllerBinding["acknowledgeAttachment"]>;
}

export interface RuntimeTabControllerOptions extends RuntimeTabControllerCallbacks {
  driver?: RuntimeTabControllerDriver;
}

export interface RuntimeTabController {
  attachHost: (host: HTMLElement) => Promise<void>;
  detachHost: () => Promise<void>;
  setCallbacks: (callbacks: RuntimeTabControllerCallbacks) => void;
  bindSession: (binding: {
    sessionId: string;
    cursor?: string | null;
    attachmentId?: string | null;
    client: RuntimeTabControllerClient;
    acknowledgeAttachment?: (request: {
      attachmentId: string;
      sequence: number;
    }) => Promise<unknown>;
    hydrateFromReplay?: boolean;
    subscribeToStream?: boolean;
  }) => Promise<void>;
  applyReplay: (
    nextCursor: string,
    entries: RuntimeSessionReplaySnapshot["entries"],
  ) => Promise<void>;
  clearSession: () => Promise<void>;
  search: (query: string) => Promise<void>;
  paste: (text: string) => Promise<void>;
  getSelection: () => Promise<string>;
  selectAll: () => Promise<void>;
  measureViewport: () => Promise<TerminalViewport | null>;
  focus: () => Promise<void>;
  setFontSize: (size: number) => void;
  setDisableStdin: (disabled: boolean) => void;
  setCursorVisible: (visible: boolean) => void;
  dispose: () => Promise<void>;
}

function parseExitCode(payload: string): number | null {
  try {
    const value = JSON.parse(payload) as { exitCode?: number | null };
    return typeof value.exitCode === "number" ? value.exitCode : null;
  } catch {
    return null;
  }
}

function renderReplayEntry(entry: RuntimeSessionReplaySnapshot["entries"][number]) {
  if (entry.kind === "exit") {
    const exitCode = parseExitCode(entry.payload);
    return exitCode == null
      ? "\r\n[shell session exited]\r\n"
      : `\r\n[shell session exited with code ${exitCode}]\r\n`;
  }

  return entry.payload;
}

async function runUnlisten(unlisten: (() => void | Promise<void>) | null) {
  if (!unlisten) {
    return;
  }

  await unlisten();
}

function parseCursorSequence(cursor: string | null | undefined) {
  if (!cursor) {
    return null;
  }

  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const REPLAY_REPAIR_PAGE_LIMIT = 256;
const REPLAY_REPAIR_PAGE_SIZE = 256;

function shouldUseFullReplayRepair(runtimeState: TerminalViewportRuntimeState) {
  return (
    runtimeState.activeBufferType === "alternate" ||
    runtimeState.mouseTrackingMode === "x10" ||
    runtimeState.mouseTrackingMode === "vt200" ||
    runtimeState.mouseTrackingMode === "drag" ||
    runtimeState.mouseTrackingMode === "any"
  );
}

export function createRuntimeTabController(
  options: RuntimeTabControllerOptions = {},
): RuntimeTabController {
  const driver = options.driver ?? createXtermViewportDriver();
  let callbacks: RuntimeTabControllerCallbacks = {
    onBufferedInput: options.onBufferedInput,
    onReplayApplied: options.onReplayApplied,
    onTitleChange: options.onTitleChange,
    onRuntimeError: options.onRuntimeError,
  };
  let disposed = false;
  let binding: RuntimeTabControllerBinding | null = null;
  let sessionUnlisten: (() => void | Promise<void>) | null = null;
  let inputWriteChain: Promise<void> = Promise.resolve();
  let renderWriteChain: Promise<void> = Promise.resolve();
  let streamEventChain: Promise<void> = Promise.resolve();
  let attachmentAckChain: Promise<void> = Promise.resolve();
  let hostAttached = false;
  let pendingReplayChunks: string[] = [];
  let pendingStreamEvents: RuntimeSessionStreamEvent[] = [];
  let streamDrainScheduled = false;
  let pendingAttachmentAcknowledges = new Map<string, PendingAttachmentAcknowledge>();
  let attachmentAckScheduled = false;
  let runtimeSurfacePrimed = false;

  void driver.setRuntimeMode(true);
  void driver.setInputListener((input) => {
    if (disposed) {
      return;
    }

    if (!binding) {
      callbacks.onBufferedInput?.(input);
      return;
    }

    inputWriteChain = inputWriteChain
      .catch(() => undefined)
      .then(async () => {
        if (!binding || disposed) {
          callbacks.onBufferedInput?.(input);
          return;
        }

        if (input.kind === "binary") {
          await binding.client.writeSessionInputBytes({
            sessionId: binding.sessionId,
            inputBytes: input.inputBytes,
          });
          return;
        }

        await binding.client.writeSessionInput({
          sessionId: binding.sessionId,
          input: input.data,
        });
      })
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        callbacks.onRuntimeError?.(message);
      });
  });
  void driver.setTitleListener((title) => {
    callbacks.onTitleChange?.(title);
  });

  function ensureAttachmentAcknowledgeDrain() {
    if (attachmentAckScheduled) {
      return;
    }

    attachmentAckScheduled = true;
    let nextAcknowledge: Promise<void>;
    nextAcknowledge = attachmentAckChain
      .catch(() => undefined)
      .then(async () => {
        while (pendingAttachmentAcknowledges.size > 0) {
          const nextPending = pendingAttachmentAcknowledges.values().next().value;
          if (!nextPending) {
            break;
          }

          pendingAttachmentAcknowledges.delete(nextPending.attachmentId);
          await nextPending.acknowledgeAttachment({
            attachmentId: nextPending.attachmentId,
            sequence: nextPending.sequence,
          });
        }
      })
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        callbacks.onRuntimeError?.(message);
      })
      .finally(() => {
        attachmentAckScheduled = false;
        if (attachmentAckChain === nextAcknowledge) {
          attachmentAckChain = Promise.resolve();
        }

        if (pendingAttachmentAcknowledges.size > 0) {
          ensureAttachmentAcknowledgeDrain();
        }
      });

    attachmentAckChain = nextAcknowledge;
  }

  function queueAttachmentAcknowledge(
    activeBinding: RuntimeTabControllerBinding,
    entries: RuntimeSessionReplaySnapshot["entries"],
  ) {
    if (!activeBinding.acknowledgeAttachment || !activeBinding.attachmentId || entries.length === 0) {
      return;
    }

    const latestSequence = entries.reduce((maxValue, entry) => Math.max(maxValue, entry.sequence), 0);
    if (latestSequence <= 0) {
      return;
    }

    const currentPending = pendingAttachmentAcknowledges.get(activeBinding.attachmentId);
    if (currentPending) {
      currentPending.sequence = Math.max(currentPending.sequence, latestSequence);
    } else {
      pendingAttachmentAcknowledges.set(activeBinding.attachmentId, {
        attachmentId: activeBinding.attachmentId,
        sequence: latestSequence,
        acknowledgeAttachment: activeBinding.acknowledgeAttachment,
      });
    }

    ensureAttachmentAcknowledgeDrain();
  }

  function enqueueReplayRender(operation: () => Promise<void>) {
    let nextRender: Promise<void>;
    nextRender = renderWriteChain
      .catch(() => undefined)
      .then(operation)
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        callbacks.onRuntimeError?.(message);
      })
      .finally(() => {
        if (renderWriteChain === nextRender) {
          renderWriteChain = Promise.resolve();
        }
      });

    renderWriteChain = nextRender;
    return nextRender;
  }

  function enqueueStreamEvent(operation: () => Promise<void>) {
    let nextEvent: Promise<void>;
    nextEvent = streamEventChain
      .catch(() => undefined)
      .then(operation)
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        callbacks.onRuntimeError?.(message);
      })
      .finally(() => {
        if (streamEventChain === nextEvent) {
          streamEventChain = Promise.resolve();
        }
      });

    streamEventChain = nextEvent;
    return nextEvent;
  }

  async function processPendingStreamEvents(activeBinding: RuntimeTabControllerBinding) {
    let bufferedEntries: RuntimeSessionReplaySnapshot["entries"] = [];
    let bufferedNextCursor: string | null = null;
    let expectedSequence = parseCursorSequence(activeBinding.cursor);

    async function flushBufferedEntries() {
      if (bufferedEntries.length === 0 || bufferedNextCursor === null) {
        return;
      }

      const entries = bufferedEntries;
      const nextCursor = bufferedNextCursor;
      bufferedEntries = [];
      bufferedNextCursor = null;
      await applyReplay(nextCursor, entries);
      expectedSequence = parseCursorSequence(activeBinding.cursor);
    }

    while (pendingStreamEvents.length > 0) {
      const events = pendingStreamEvents;
      pendingStreamEvents = [];

      for (const event of events) {
        if (
          disposed ||
          !binding ||
          binding !== activeBinding ||
          event.sessionId !== activeBinding.sessionId
        ) {
          bufferedEntries = [];
          bufferedNextCursor = null;
          continue;
        }

        if (expectedSequence !== null) {
          if (event.entry.sequence <= expectedSequence) {
            continue;
          }

          if (event.entry.sequence > expectedSequence + 1) {
            await flushBufferedEntries();
            if (disposed || !binding || binding !== activeBinding) {
              return;
            }

            await repairFromReplayForGap(activeBinding);
            if (disposed || !binding || binding !== activeBinding) {
              return;
            }

            expectedSequence = parseCursorSequence(activeBinding.cursor);
            if (expectedSequence !== null && event.entry.sequence <= expectedSequence) {
              continue;
            }
          }
        }

        bufferedEntries.push(event.entry);
        bufferedNextCursor = event.nextCursor;
        expectedSequence = parseCursorSequence(event.nextCursor) ?? event.entry.sequence;
      }
    }

    await flushBufferedEntries();
  }

  function scheduleStreamEventDrain(activeBinding: RuntimeTabControllerBinding) {
    if (streamDrainScheduled) {
      return;
    }

    streamDrainScheduled = true;
    void enqueueStreamEvent(async () => {
      try {
        while (pendingStreamEvents.length > 0) {
          await processPendingStreamEvents(activeBinding);
        }
      } finally {
        streamDrainScheduled = false;
        if (pendingStreamEvents.length > 0) {
          scheduleStreamEventDrain(activeBinding);
        }
      }
    });
  }

  function queueReplayChunks(chunks: string[]) {
    if (disposed || chunks.length === 0) {
      return;
    }

    pendingReplayChunks.push(...chunks);
  }

  async function flushReplayChunks() {
    if (disposed || !hostAttached || pendingReplayChunks.length === 0) {
      return;
    }

    const content = pendingReplayChunks.join("");
    pendingReplayChunks = [];

    if (content.length === 0) {
      return;
    }

    await driver.writeRaw(content);
    runtimeSurfacePrimed = true;
  }

  async function resetTerminalSurface() {
    pendingReplayChunks = [];
    await enqueueReplayRender(async () => {
      if (disposed) {
        return;
      }

      pendingReplayChunks = [];
      runtimeSurfacePrimed = false;
      await driver.writeRaw("", true);
    });
  }

  async function applyReplay(
    nextCursor: string,
    entries: RuntimeSessionReplaySnapshot["entries"],
  ) {
    if (disposed || !binding || entries.length === 0) {
      return;
    }

    const renderedChunks = entries.map((entry) => renderReplayEntry(entry));
    const activeBinding = binding;
    binding.cursor = nextCursor;
    callbacks.onReplayApplied?.({
      nextCursor,
      entries,
    });
    queueReplayChunks(renderedChunks);

    await enqueueReplayRender(async () => {
      if (disposed || binding !== activeBinding) {
        return;
      }

      await flushReplayChunks();
    });

    queueAttachmentAcknowledge(activeBinding, entries);
  }

  async function repairFromReplay(
    activeBinding: RuntimeTabControllerBinding,
    options: {
      fromStart?: boolean;
      resetTerminal?: boolean;
    } = {},
  ) {
    if (options.resetTerminal) {
      await resetTerminalSurface();
      if (disposed || binding !== activeBinding) {
        return;
      }
    }

    let fromCursor = options.fromStart ? undefined : activeBinding.cursor ?? undefined;

    for (let page = 0; page < REPLAY_REPAIR_PAGE_LIMIT; page += 1) {
      const replay = await activeBinding.client.sessionReplay(activeBinding.sessionId, {
        fromCursor,
        limit: REPLAY_REPAIR_PAGE_SIZE,
      });

      if (disposed || binding !== activeBinding) {
        return;
      }

      if (replay.entries.length === 0) {
        binding.cursor = replay.nextCursor;
      } else {
        await applyReplay(replay.nextCursor, replay.entries);
        if (disposed || binding !== activeBinding) {
          return;
        }
      }

      if (!replay.hasMore) {
        return;
      }

      if (!replay.nextCursor || replay.nextCursor === fromCursor) {
        throw new Error(
          `runtime replay cursor stalled while repairing session ${activeBinding.sessionId}`,
        );
      }

      fromCursor = replay.nextCursor;
    }

    throw new Error(
      `runtime replay repair exceeded ${REPLAY_REPAIR_PAGE_LIMIT} pages for session ${activeBinding.sessionId}`,
    );
  }

  async function repairFromReplayForGap(activeBinding: RuntimeTabControllerBinding) {
    let runtimeState: TerminalViewportRuntimeState = {
      activeBufferType: "unknown",
      mouseTrackingMode: "unknown",
    };

    try {
      runtimeState = await driver.getRuntimeState();
    } catch {
      runtimeState = {
        activeBufferType: "unknown",
        mouseTrackingMode: "unknown",
      };
    }

    const fullReplayRepair = shouldUseFullReplayRepair(runtimeState);
    await repairFromReplay(activeBinding, {
      fromStart: fullReplayRepair,
      resetTerminal: fullReplayRepair,
    });
  }

  function shouldReplayFromSessionStartOnInitialHydration(
    activeBinding: RuntimeTabControllerBinding,
  ) {
    const cursor = parseCursorSequence(activeBinding.cursor);
    return !runtimeSurfacePrimed && cursor !== null && cursor > 0;
  }

  async function subscribeToSession(activeBinding: RuntimeTabControllerBinding) {
    if (!activeBinding.client.subscribeSessionEvents) {
      return;
    }

    sessionUnlisten = await activeBinding.client.subscribeSessionEvents(
      activeBinding.sessionId,
      (event) => {
        pendingStreamEvents.push(event);
        scheduleStreamEventDrain(activeBinding);
      },
    );
  }

  return {
    async attachHost(host) {
      if (disposed) {
        return;
      }

      await driver.attach(host);
      hostAttached = true;
      await enqueueReplayRender(async () => {
        if (disposed || !hostAttached || pendingReplayChunks.length === 0) {
          return;
        }

        await flushReplayChunks();
      });
    },
    async detachHost() {
      hostAttached = false;
    },
    setCallbacks(nextCallbacks) {
      callbacks = {
        onBufferedInput: nextCallbacks.onBufferedInput,
        onReplayApplied: nextCallbacks.onReplayApplied,
        onTitleChange: nextCallbacks.onTitleChange,
        onRuntimeError: nextCallbacks.onRuntimeError,
      };
    },
    async bindSession(nextBinding) {
      if (disposed) {
        return;
      }

      const previousBinding = binding;
      const hasPendingReplaySurfaceState = pendingReplayChunks.length > 0;
      const isSameSession = previousBinding?.sessionId === nextBinding.sessionId;
      const shouldResetForNewSession =
        !isSameSession && (previousBinding !== null || hasPendingReplaySurfaceState);
      await runUnlisten(sessionUnlisten);
      sessionUnlisten = null;
      binding = {
        sessionId: nextBinding.sessionId,
        cursor:
          isSameSession && previousBinding
            ? previousBinding.cursor ?? nextBinding.cursor ?? null
            : nextBinding.cursor ?? null,
        attachmentId: nextBinding.attachmentId ?? null,
        client: nextBinding.client,
        acknowledgeAttachment: nextBinding.acknowledgeAttachment,
      };
      if (!isSameSession) {
        pendingReplayChunks = [];
        pendingStreamEvents = [];
        streamDrainScheduled = false;
        pendingAttachmentAcknowledges = new Map<string, PendingAttachmentAcknowledge>();
        attachmentAckScheduled = false;
      }
      driver.setRuntimeMode(true);
      driver.setDisableStdin(false);

      if (shouldResetForNewSession) {
        await resetTerminalSurface();
      }

      try {
        const shouldReplayFromStart = shouldReplayFromSessionStartOnInitialHydration(binding);
        if (nextBinding.hydrateFromReplay !== false) {
          await repairFromReplay(binding, {
            fromStart: shouldReplayFromStart,
            resetTerminal: shouldReplayFromStart,
          });
        }
        if (nextBinding.subscribeToStream !== false) {
          await subscribeToSession(binding);
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        callbacks.onRuntimeError?.(message);
      }
    },
    async applyReplay(nextCursor, entries) {
      await applyReplay(nextCursor, entries);
    },
    async clearSession() {
      binding = null;
      await runUnlisten(sessionUnlisten);
      sessionUnlisten = null;
      pendingStreamEvents = [];
      streamDrainScheduled = false;
      pendingAttachmentAcknowledges = new Map<string, PendingAttachmentAcknowledge>();
      attachmentAckScheduled = false;
      driver.setDisableStdin(true);
      await resetTerminalSurface();
    },
    async search(query) {
      await driver.search(query);
    },
    async paste(text) {
      const chunks = splitTerminalClipboardPaste(text);
      if (chunks.length === 0) {
        return;
      }

      for (const chunk of chunks) {
        await driver.paste(chunk);
      }
    },
    async getSelection() {
      return driver.getSelection();
    },
    async selectAll() {
      await driver.selectAll();
    },
    async measureViewport() {
      return driver.measureViewport();
    },
    async focus() {
      await driver.focus();
    },
    setFontSize(size) {
      driver.setFontSize(size);
    },
    setDisableStdin(disabled) {
      driver.setDisableStdin(disabled);
    },
    setCursorVisible(visible) {
      driver.setCursorVisible(visible);
    },
    async dispose() {
      await inputWriteChain.catch(() => undefined);
      await renderWriteChain.catch(() => undefined);
      await streamEventChain.catch(() => undefined);
      await attachmentAckChain.catch(() => undefined);
      disposed = true;
      hostAttached = false;
      binding = null;
      pendingReplayChunks = [];
      pendingStreamEvents = [];
      streamDrainScheduled = false;
      pendingAttachmentAcknowledges = new Map<string, PendingAttachmentAcknowledge>();
      attachmentAckScheduled = false;
      runtimeSurfacePrimed = false;
      await runUnlisten(sessionUnlisten);
      sessionUnlisten = null;
      driver.dispose();
    },
  };
}
