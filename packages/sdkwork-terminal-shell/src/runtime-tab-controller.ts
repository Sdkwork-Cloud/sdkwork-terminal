import type { TerminalViewport } from "@sdkwork/terminal-core";
import {
  createXtermViewportDriver,
  type RuntimeSessionReplaySnapshot,
  type RuntimeSessionStreamEvent,
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
  let hostAttached = false;
  let pendingReplayChunks: string[] = [];

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

  async function acknowledgeLatestSequence(
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

    await activeBinding.acknowledgeAttachment({
      attachmentId: activeBinding.attachmentId,
      sequence: latestSequence,
    });
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

  async function writeReplayChunks(chunks: string[]) {
    if (disposed || chunks.length === 0) {
      return;
    }

    if (!hostAttached) {
      pendingReplayChunks.push(...chunks);
      return;
    }

    for (const chunk of chunks) {
      await driver.writeRaw(chunk);
    }
  }

  async function resetTerminalSurface() {
    pendingReplayChunks = [];
    await enqueueReplayRender(async () => {
      if (disposed) {
        return;
      }

      pendingReplayChunks = [];
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

    await enqueueReplayRender(async () => {
      if (disposed || binding !== activeBinding) {
        return;
      }

      await writeReplayChunks(renderedChunks);
    });

    try {
      await acknowledgeLatestSequence(activeBinding, entries);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      callbacks.onRuntimeError?.(message);
    }
  }

  async function repairFromReplay(activeBinding: RuntimeTabControllerBinding) {
    const replay = await activeBinding.client.sessionReplay(activeBinding.sessionId, {
      fromCursor: activeBinding.cursor ?? undefined,
      limit: 64,
    });

    if (disposed || binding !== activeBinding) {
      return;
    }

    if (replay.entries.length === 0) {
      binding.cursor = replay.nextCursor;
      return;
    }

    await applyReplay(replay.nextCursor, replay.entries);
  }

  async function subscribeToSession(activeBinding: RuntimeTabControllerBinding) {
    if (!activeBinding.client.subscribeSessionEvents) {
      return;
    }

    sessionUnlisten = await activeBinding.client.subscribeSessionEvents(
      activeBinding.sessionId,
      (event) => {
        void enqueueStreamEvent(async () => {
          if (
            disposed ||
            !binding ||
            binding !== activeBinding ||
            event.sessionId !== activeBinding.sessionId
          ) {
            return;
          }

          const currentSequence = parseCursorSequence(activeBinding.cursor);
          if (currentSequence !== null) {
            if (event.entry.sequence <= currentSequence) {
              return;
            }

            if (event.entry.sequence > currentSequence + 1) {
              await repairFromReplay(activeBinding);
              if (disposed || !binding || binding !== activeBinding) {
                return;
              }

              const repairedSequence = parseCursorSequence(activeBinding.cursor);
              if (repairedSequence !== null && event.entry.sequence <= repairedSequence) {
                return;
              }
            }
          }

          await applyReplay(event.nextCursor, [event.entry]);
        });
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

        const chunks = pendingReplayChunks;
        pendingReplayChunks = [];
        await writeReplayChunks(chunks);
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
      }
      driver.setRuntimeMode(true);
      driver.setDisableStdin(false);

      if (shouldResetForNewSession) {
        await resetTerminalSurface();
      }

      try {
        if (nextBinding.hydrateFromReplay !== false) {
          await repairFromReplay(binding);
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
      disposed = true;
      hostAttached = false;
      binding = null;
      pendingReplayChunks = [];
      await runUnlisten(sessionUnlisten);
      sessionUnlisten = null;
      driver.dispose();
    },
  };
}
