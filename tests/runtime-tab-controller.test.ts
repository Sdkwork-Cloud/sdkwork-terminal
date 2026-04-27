import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MAX_TERMINAL_PASTE_LENGTH } from "../packages/sdkwork-terminal-shell/src/terminal-clipboard.ts";
import {
  createRuntimeTabController,
  type RuntimeTabControllerClient,
  type RuntimeTabControllerDriver,
} from "../packages/sdkwork-terminal-shell/src/runtime-tab-controller.ts";
import type {
  RuntimeSessionStreamEvent,
  TerminalViewportInput,
  TerminalViewportRuntimeState,
} from "../packages/sdkwork-terminal-infrastructure/src/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function createFakeDriver() {
  let inputListener: ((input: TerminalViewportInput) => void) | null = null;
  let titleListener: ((title: string) => void) | null = null;
  const writes: Array<{ content: string; reset: boolean }> = [];
  const attachedHosts: unknown[] = [];
  const runtimeModes: boolean[] = [];
  const stdinDisabled: boolean[] = [];
  const cursorVisible: boolean[] = [];
  let runtimeState: TerminalViewportRuntimeState = {
    activeBufferType: "normal",
    mouseTrackingMode: "none",
  };
  let disposed = false;

  const driver: RuntimeTabControllerDriver = {
    kind: "xterm-view-adapter",
    async attach(container) {
      attachedHosts.push(container);
    },
    async writeRaw(content, reset = false) {
      writes.push({ content, reset });
    },
    async search() {},
    async getSelection() {
      return "";
    },
    async selectAll() {},
    async paste(text) {
      inputListener?.({
        kind: "text",
        data: text,
      });
    },
    async setInputListener(listener) {
      inputListener = listener;
    },
    async setTitleListener(listener) {
      titleListener = listener;
    },
    setRuntimeMode(enabled) {
      runtimeModes.push(enabled);
    },
    async measureViewport() {
      return null;
    },
    async focus() {},
    dispose() {
      disposed = true;
    },
    setFontSize() {},
    setDisableStdin(disabled) {
      stdinDisabled.push(disabled);
    },
    setCursorVisible(visible) {
      cursorVisible.push(visible);
    },
    async getRuntimeState() {
      return runtimeState;
    },
  };

  return {
    driver,
    getInputListener() {
      return inputListener;
    },
    emitTitle(title: string) {
      titleListener?.(title);
    },
    writes,
    attachedHosts,
    runtimeModes,
    stdinDisabled,
    cursorVisible,
    setRuntimeState(nextState: TerminalViewportRuntimeState) {
      runtimeState = nextState;
    },
    get disposed() {
      return disposed;
    },
  };
}

test("runtime tab controller routes background queues and cleanup through async boundaries", () => {
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "runtime-tab-controller.ts",
    ),
    "utf8",
  );

  assert.match(source, /function runRuntimeControllerCleanupBestEffort\(action: \(\) => unknown\) \{/);
  assert.match(
    source,
    /runTerminalTaskBestEffort\(\s*\(\) =>\s*enqueueStreamEvent\(async \(\) => \{/,
  );
  assert.match(source, /runRuntimeControllerCleanupBestEffort\(\(\) => inputWriteChain\);/);
  assert.match(source, /runRuntimeControllerCleanupBestEffort\(\(\) => renderWriteChain\);/);
  assert.match(source, /runRuntimeControllerCleanupBestEffort\(\(\) => streamEventChain\);/);
  assert.match(source, /runRuntimeControllerCleanupBestEffort\(\(\) => attachmentAckChain\);/);
  assert.match(source, /runRuntimeControllerCleanupBestEffort\(\(\) => runUnlisten\(previousUnlisten\)\);/);
  assert.doesNotMatch(source, /void enqueueStreamEvent\(/);
  assert.doesNotMatch(source, /void runUnlisten\(previousUnlisten\)/);
});

function createRuntimeClient() {
  const writtenText: string[] = [];
  const writtenBinary: number[][] = [];
  const replays: string[] = [];
  const streamListeners: Array<(event: RuntimeSessionStreamEvent) => void> = [];
  let unsubscribed = 0;

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      replays.push(sessionId);
      return {
        sessionId,
        fromCursor: "0",
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "PowerShell ready\r\n",
            occurredAt: "2026-04-18T00:00:01.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "PS D:\\sdkwork-terminal> ",
            occurredAt: "2026-04-18T00:00:02.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      writtenText.push(request.input);
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      writtenBinary.push([...request.inputBytes]);
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents(_sessionId, listener) {
      streamListeners.push(listener);
      return async () => {
        unsubscribed += 1;
      };
    },
  };

  return {
    client,
    writtenText,
    writtenBinary,
    replays,
    streamListeners,
    get unsubscribed() {
      return unsubscribed;
    },
  };
}

async function flushPendingMicrotasks(cycles = 6) {
  for (let index = 0; index < cycles; index += 1) {
    await Promise.resolve();
  }
}

test("runtime tab controller buffers input before a runtime session is bound", async () => {
  const fakeDriver = createFakeDriver();
  const bufferedInputs: TerminalViewportInput[] = [];
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
    onBufferedInput(input) {
      bufferedInputs.push(input);
    },
  });

  const inputListener = fakeDriver.getInputListener();
  assert.equal(typeof inputListener, "function");

  inputListener?.({
    kind: "text",
    data: "vim",
  });
  inputListener?.({
    kind: "binary",
    data: "\u001b[M",
    inputBytes: [0x1b, 0x5b, 0x4d],
  });

  assert.deepEqual(bufferedInputs, [
    {
      kind: "text",
      data: "vim",
    },
    {
      kind: "binary",
      data: "\u001b[M",
      inputBytes: [0x1b, 0x5b, 0x4d],
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller contains buffered input callback failures", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeErrors: string[] = [];
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
    onBufferedInput() {
      throw new Error("buffer callback failed");
    },
    onRuntimeError(message) {
      runtimeErrors.push(message);
    },
  });

  const inputListener = fakeDriver.getInputListener();
  assert.equal(typeof inputListener, "function");

  assert.doesNotThrow(() => {
    inputListener?.({
      kind: "text",
      data: "vim",
    });
  });

  assert.deepEqual(runtimeErrors, ["buffer callback failed"]);

  await controller.dispose();
});

test("runtime tab controller contains runtime error callback failures from input writes", async () => {
  const fakeDriver = createFakeDriver();
  const unhandledRejections: unknown[] = [];
  const handleUnhandledRejection = (cause: unknown) => {
    unhandledRejections.push(cause);
  };
  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: "0",
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
    async writeSessionInput() {
      throw new Error("write failed");
    },
    async writeSessionInputBytes() {
      throw new Error("write failed");
    },
  };
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
    onRuntimeError() {
      throw new Error("runtime error callback failed");
    },
  });

  process.on("unhandledRejection", handleUnhandledRejection);
  try {
    await controller.bindSession({
      sessionId: "session-error-callback-0001",
      cursor: "0",
      client,
      hydrateFromReplay: false,
      subscribeToStream: false,
    });

    fakeDriver.getInputListener()?.({
      kind: "text",
      data: "ls",
    });
    await flushPendingMicrotasks();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(unhandledRejections, []);
  } finally {
    process.off("unhandledRejection", handleUnhandledRejection);
    await controller.dispose();
  }
});

test("runtime tab controller contains synchronous driver setup failures", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeErrors: string[] = [];
  const driver: RuntimeTabControllerDriver = {
    ...fakeDriver.driver,
    setRuntimeMode() {
      throw new Error("runtime mode failed");
    },
  };
  let controller: ReturnType<typeof createRuntimeTabController> | null = null;

  assert.doesNotThrow(() => {
    controller = createRuntimeTabController({
      driver,
      onRuntimeError(message) {
        runtimeErrors.push(message);
      },
    });
  });

  assert.deepEqual(runtimeErrors, ["runtime mode failed"]);

  await controller?.dispose();
});

test("runtime tab controller contains asynchronous driver setup failures", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeErrors: string[] = [];
  const unhandledRejections: unknown[] = [];
  const handleUnhandledRejection = (cause: unknown) => {
    unhandledRejections.push(cause);
  };
  const driver: RuntimeTabControllerDriver = {
    ...fakeDriver.driver,
    async setInputListener() {
      throw new Error("input listener failed");
    },
  };

  process.on("unhandledRejection", handleUnhandledRejection);
  const controller = createRuntimeTabController({
    driver,
    onRuntimeError(message) {
      runtimeErrors.push(message);
    },
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(runtimeErrors, ["input listener failed"]);
    assert.deepEqual(unhandledRejections, []);
  } finally {
    process.off("unhandledRejection", handleUnhandledRejection);
    await controller.dispose();
  }
});

test("runtime tab controller contains driver input mode failures while binding a session", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const runtimeErrors: string[] = [];
  let failInputMode = false;
  const driver: RuntimeTabControllerDriver = {
    ...fakeDriver.driver,
    setRuntimeMode(enabled) {
      if (failInputMode) {
        throw new Error("bind runtime mode failed");
      }
      fakeDriver.driver.setRuntimeMode(enabled);
    },
    setDisableStdin(disabled) {
      if (failInputMode) {
        throw new Error("bind stdin failed");
      }
      fakeDriver.driver.setDisableStdin(disabled);
    },
  };
  const controller = createRuntimeTabController({
    driver,
    onRuntimeError(message) {
      runtimeErrors.push(message);
    },
  });

  failInputMode = true;
  await assert.doesNotReject(() =>
    controller.bindSession({
      sessionId: "session-bind-input-mode-failure-0001",
      cursor: "0",
      client: runtimeClient.client,
    }),
  );

  assert.deepEqual(runtimeErrors, [
    "bind runtime mode failed",
    "bind stdin failed",
  ]);
  assert.deepEqual(runtimeClient.replays, ["session-bind-input-mode-failure-0001"]);

  await controller.dispose();
});

test("runtime tab controller contains driver input mode failures while clearing a session", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const runtimeErrors: string[] = [];
  let failClearStdin = false;
  const driver: RuntimeTabControllerDriver = {
    ...fakeDriver.driver,
    setDisableStdin(disabled) {
      if (failClearStdin && disabled) {
        throw new Error("clear stdin failed");
      }
      fakeDriver.driver.setDisableStdin(disabled);
    },
  };
  const controller = createRuntimeTabController({
    driver,
    onRuntimeError(message) {
      runtimeErrors.push(message);
    },
  });

  await controller.bindSession({
    sessionId: "session-clear-input-mode-failure-0001",
    cursor: "0",
    client: runtimeClient.client,
  });
  failClearStdin = true;

  await assert.doesNotReject(() => controller.clearSession());

  assert.deepEqual(runtimeErrors, ["clear stdin failed"]);
  assert.deepEqual(fakeDriver.writes.at(-1), {
    content: "",
    reset: true,
  });

  await controller.dispose();
});

test("runtime tab controller contains public driver presentation update failures", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeErrors: string[] = [];
  const driver: RuntimeTabControllerDriver = {
    ...fakeDriver.driver,
    setFontSize() {
      throw new Error("font size failed");
    },
    setDisableStdin() {
      throw new Error("stdin toggle failed");
    },
    setCursorVisible() {
      throw new Error("cursor toggle failed");
    },
  };
  const controller = createRuntimeTabController({
    driver,
    onRuntimeError(message) {
      runtimeErrors.push(message);
    },
  });

  assert.doesNotThrow(() => {
    controller.setFontSize(16);
    controller.setDisableStdin(false);
    controller.setCursorVisible(true);
  });

  assert.deepEqual(runtimeErrors, [
    "font size failed",
    "stdin toggle failed",
    "cursor toggle failed",
  ]);

  await controller.dispose();
});

test("runtime tab controller writes bound text and binary input directly to the runtime client", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  await controller.bindSession({
    sessionId: "session-0001",
    cursor: "0",
    client: runtimeClient.client,
  });

  const inputListener = fakeDriver.getInputListener();
  assert.equal(typeof inputListener, "function");

  inputListener?.({
    kind: "text",
    data: "pwd\r",
  });
  inputListener?.({
    kind: "binary",
    data: "\u001b[M",
    inputBytes: [0x1b, 0x5b, 0x4d],
  });
  await flushPendingMicrotasks();

  await controller.dispose();

  assert.deepEqual(runtimeClient.writtenText, ["pwd\r"]);
  assert.deepEqual(runtimeClient.writtenBinary, [[0x1b, 0x5b, 0x4d]]);
});

test("runtime tab controller routes queued input to the session active when the input was received", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });
  const firstSessionWrites: string[] = [];
  const secondSessionWrites: string[] = [];
  let markFirstWriteStarted: (() => void) | null = null;
  let releaseFirstWrite: (() => void) | null = null;
  const firstWriteStarted = new Promise<void>((resolve) => {
    markFirstWriteStarted = resolve;
  });
  const firstWriteGate = new Promise<void>((resolve) => {
    releaseFirstWrite = resolve;
  });

  const firstClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
    async writeSessionInput(request) {
      firstSessionWrites.push(request.input);
      if (request.input === "slow-input") {
        markFirstWriteStarted?.();
        await firstWriteGate;
      }
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  const secondClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
    async writeSessionInput(request) {
      secondSessionWrites.push(request.input);
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.bindSession({
    sessionId: "session-input-route-first-0001",
    cursor: "0",
    client: firstClient,
    hydrateFromReplay: false,
    subscribeToStream: false,
  });

  const inputListener = fakeDriver.getInputListener();
  assert.equal(typeof inputListener, "function");
  inputListener?.({
    kind: "text",
    data: "slow-input",
  });
  await firstWriteStarted;
  inputListener?.({
    kind: "text",
    data: "queued-before-tab-switch",
  });

  await controller.bindSession({
    sessionId: "session-input-route-second-0001",
    cursor: "0",
    client: secondClient,
    hydrateFromReplay: false,
    subscribeToStream: false,
  });

  releaseFirstWrite?.();
  await flushPendingMicrotasks();
  await controller.dispose();

  assert.deepEqual(firstSessionWrites, [
    "slow-input",
    "queued-before-tab-switch",
  ]);
  assert.deepEqual(secondSessionWrites, []);
});

test("runtime tab controller drops queued input that has not started after the session is cleared", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });
  const writes: string[] = [];
  let markFirstWriteStarted: (() => void) | null = null;
  let releaseFirstWrite: (() => void) | null = null;
  const firstWriteStarted = new Promise<void>((resolve) => {
    markFirstWriteStarted = resolve;
  });
  const firstWriteGate = new Promise<void>((resolve) => {
    releaseFirstWrite = resolve;
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
    async writeSessionInput(request) {
      writes.push(request.input);
      if (request.input === "slow-input") {
        markFirstWriteStarted?.();
        await firstWriteGate;
      }
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.bindSession({
    sessionId: "session-clear-pending-input-0001",
    cursor: "0",
    client,
    hydrateFromReplay: false,
    subscribeToStream: false,
  });

  const inputListener = fakeDriver.getInputListener();
  assert.equal(typeof inputListener, "function");
  inputListener?.({
    kind: "text",
    data: "slow-input",
  });
  await firstWriteStarted;
  inputListener?.({
    kind: "text",
    data: "queued-after-clear",
  });

  await controller.clearSession();
  releaseFirstWrite?.();
  await flushPendingMicrotasks();
  await controller.dispose();

  assert.deepEqual(writes, ["slow-input"]);
});

test("runtime tab controller drops queued input that has not started after dispose", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });
  const writes: string[] = [];
  let markFirstWriteStarted: (() => void) | null = null;
  let releaseFirstWrite: (() => void) | null = null;
  const firstWriteStarted = new Promise<void>((resolve) => {
    markFirstWriteStarted = resolve;
  });
  const firstWriteGate = new Promise<void>((resolve) => {
    releaseFirstWrite = resolve;
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
    async writeSessionInput(request) {
      writes.push(request.input);
      if (request.input === "slow-input") {
        markFirstWriteStarted?.();
        await firstWriteGate;
      }
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.bindSession({
    sessionId: "session-dispose-queued-input-0001",
    cursor: "0",
    client,
    hydrateFromReplay: false,
    subscribeToStream: false,
  });

  const inputListener = fakeDriver.getInputListener();
  assert.equal(typeof inputListener, "function");
  inputListener?.({
    kind: "text",
    data: "slow-input",
  });
  await firstWriteStarted;
  inputListener?.({
    kind: "text",
    data: "queued-after-dispose",
  });

  await controller.dispose();
  releaseFirstWrite?.();
  await flushPendingMicrotasks();

  assert.deepEqual(writes, ["slow-input"]);
});

test("runtime tab controller disposes immediately while a session input write is still pending", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });
  let markWriteStarted: (() => void) | null = null;
  let releaseWrite: (() => void) | null = null;
  const writeStarted = new Promise<void>((resolve) => {
    markWriteStarted = resolve;
  });
  const writeGate = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  const unlistenCalls: string[] = [];
  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "0",
        hasMore: false,
        entries: [],
      };
    },
    async writeSessionInput(request) {
      markWriteStarted?.();
      await writeGate;
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents(sessionId) {
      return async () => {
        unlistenCalls.push(sessionId);
      };
    },
  };

  await controller.bindSession({
    sessionId: "session-dispose-pending-input-0001",
    cursor: "0",
    client,
  });

  const inputListener = fakeDriver.getInputListener();
  assert.equal(typeof inputListener, "function");
  inputListener?.({
    kind: "text",
    data: "blocked-input",
  });
  await writeStarted;

  const dispose = controller.dispose();
  const disposedBeforeInputSettled = await Promise.race([
    dispose.then(() => true),
    new Promise<false>((resolve) => {
      setTimeout(() => resolve(false), 0);
    }),
  ]);
  releaseWrite?.();
  await dispose;

  assert.equal(disposedBeforeInputSettled, true);
  assert.equal(fakeDriver.disposed, true);
  assert.deepEqual(unlistenCalls, ["session-dispose-pending-input-0001"]);
});

test("runtime tab controller buffers replay until a host is attached and then writes it into xterm", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const replayApplications: Array<{ nextCursor: string; entryKinds: string[] }> = [];
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
    onReplayApplied(args) {
      replayApplications.push({
        nextCursor: args.nextCursor,
        entryKinds: args.entries.map((entry) => entry.kind),
      });
    },
  });

  await controller.bindSession({
    sessionId: "session-0002",
    cursor: "0",
    client: runtimeClient.client,
  });

  assert.deepEqual(fakeDriver.writes, []);

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);

  assert.deepEqual(fakeDriver.writes, [
    {
      content: "PowerShell ready\r\nPS D:\\sdkwork-terminal> ",
      reset: false,
    },
  ]);
  assert.deepEqual(replayApplications, [
    {
      nextCursor: "3",
      entryKinds: ["output", "output"],
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller detaches the host without disposing the xterm runtime and replays buffered output after reattach", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  await controller.attachHost({ nodeName: "DIV-A" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-detach-0001",
    cursor: "0",
    client: runtimeClient.client,
  });

  await controller.detachHost();

  runtimeClient.streamListeners[0]?.({
    sessionId: "session-detach-0001",
    nextCursor: "4",
    entry: {
      sequence: 4,
      kind: "output",
      payload: "after detach\r\n",
      occurredAt: "2026-04-18T00:00:04.000Z",
    },
  });

  await Promise.resolve();
  await Promise.resolve();

  assert.equal(
    fakeDriver.writes.some((entry) => entry.content === "after detach\r\n"),
    false,
  );
  assert.equal(fakeDriver.disposed, false);

  await controller.attachHost({ nodeName: "DIV-B" } as unknown as HTMLElement);

  assert.deepEqual(
    fakeDriver.writes.map((entry) => entry.content),
    [
      "PowerShell ready\r\nPS D:\\sdkwork-terminal> ",
      "after detach\r\n",
    ],
  );
  assert.equal(fakeDriver.disposed, false);

  await controller.dispose();
});

test("runtime tab controller clamps direct paste payloads to the shared paste limit before forwarding them", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  await controller.bindSession({
    sessionId: "session-paste-clamp-0001",
    cursor: "0",
    client: runtimeClient.client,
  });

  await controller.paste("x".repeat(MAX_TERMINAL_PASTE_LENGTH + 96));
  await flushPendingMicrotasks();
  await controller.dispose();

  assert.equal(runtimeClient.writtenText.length, 2);
  assert.equal(runtimeClient.writtenText[0]?.length, MAX_TERMINAL_PASTE_LENGTH);
  assert.equal(runtimeClient.writtenText[1]?.length, 96);
  assert.equal(
    runtimeClient.writtenText.join(""),
    "x".repeat(MAX_TERMINAL_PASTE_LENGTH + 96),
  );
});

test("runtime tab controller stops forwarding paste chunks after dispose", async () => {
  const fakeDriver = createFakeDriver();
  const pastedChunks: string[] = [];
  let markFirstPasteStarted: (() => void) | null = null;
  let releaseFirstPaste: (() => void) | null = null;
  const firstPasteStarted = new Promise<void>((resolve) => {
    markFirstPasteStarted = resolve;
  });
  const firstPasteGate = new Promise<void>((resolve) => {
    releaseFirstPaste = resolve;
  });
  const controller = createRuntimeTabController({
    driver: {
      ...fakeDriver.driver,
      async paste(text) {
        pastedChunks.push(text);
        if (pastedChunks.length === 1) {
          markFirstPasteStarted?.();
          await firstPasteGate;
        }
      },
    },
  });

  const pasteOperation = controller.paste("x".repeat(MAX_TERMINAL_PASTE_LENGTH + 96));
  await firstPasteStarted;
  await controller.dispose();
  releaseFirstPaste?.();
  await pasteOperation;

  assert.equal(pastedChunks.length, 1);
  assert.equal(pastedChunks[0]?.length, MAX_TERMINAL_PASTE_LENGTH);
});

test("runtime tab controller ignores viewport actions after dispose", async () => {
  const fakeDriver = createFakeDriver();
  const actionCalls: string[] = [];
  const controller = createRuntimeTabController({
    driver: {
      ...fakeDriver.driver,
      async search() {
        actionCalls.push("search");
      },
      async paste() {
        actionCalls.push("paste");
      },
      async getSelection() {
        actionCalls.push("getSelection");
        return "stale-selection";
      },
      async selectAll() {
        actionCalls.push("selectAll");
      },
      async measureViewport() {
        actionCalls.push("measureViewport");
        return {
          rows: 24,
          columns: 80,
        };
      },
      async focus() {
        actionCalls.push("focus");
      },
      setFontSize() {
        actionCalls.push("setFontSize");
      },
      setDisableStdin() {
        actionCalls.push("setDisableStdin");
      },
      setCursorVisible() {
        actionCalls.push("setCursorVisible");
      },
    },
  });

  await controller.dispose();

  await controller.search("query");
  await controller.paste("paste");
  const selection = await controller.getSelection();
  await controller.selectAll();
  const viewport = await controller.measureViewport();
  await controller.focus();
  controller.setFontSize(18);
  controller.setDisableStdin(false);
  controller.setCursorVisible(true);

  assert.equal(selection, "");
  assert.equal(viewport, null);
  assert.deepEqual(actionCalls, []);
});

test("runtime tab controller resets the xterm surface when the current session is cleared", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-clear-0001",
    cursor: "0",
    client: runtimeClient.client,
  });

  await controller.clearSession();

  assert.deepEqual(fakeDriver.writes, [
    {
      content: "PowerShell ready\r\nPS D:\\sdkwork-terminal> ",
      reset: false,
    },
    {
      content: "",
      reset: true,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller prevents stale clearSession cleanup from blocking or wiping a newer session", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });
  let firstUnlistenCalls = 0;
  let markFirstUnlistenStarted: (() => void) | null = null;
  let releaseFirstUnlisten: (() => void) | null = null;
  const firstUnlistenStarted = new Promise<void>((resolve) => {
    markFirstUnlistenStarted = resolve;
  });
  const firstUnlistenGate = new Promise<void>((resolve) => {
    releaseFirstUnlisten = resolve;
  });

  const firstClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "first session before clear\r\n",
            occurredAt: "2026-04-20T00:00:01.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents() {
      return async () => {
        firstUnlistenCalls += 1;
        markFirstUnlistenStarted?.();
        await firstUnlistenGate;
      };
    },
  };

  const secondClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "second session after clear\r\n",
            occurredAt: "2026-04-20T00:00:02.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-clear-race-first-0001",
    cursor: "0",
    client: firstClient,
  });

  const clearSession = controller.clearSession();
  await firstUnlistenStarted;

  const secondBinding = controller.bindSession({
    sessionId: "session-clear-race-second-0001",
    cursor: "0",
    client: secondClient,
  });
  const secondBindingCompletedBeforeOldUnlisten = await Promise.race([
    secondBinding.then(() => true),
    new Promise<false>((resolve) => {
      setTimeout(() => resolve(false), 0);
    }),
  ]);

  releaseFirstUnlisten?.();
  await Promise.all([clearSession, secondBinding]);

  assert.equal(secondBindingCompletedBeforeOldUnlisten, true);
  assert.equal(firstUnlistenCalls, 1);
  assert.deepEqual(
    fakeDriver.writes.map((entry) => ({
      content: entry.content,
      reset: entry.reset,
    })),
    [
      {
        content: "first session before clear\r\n",
        reset: false,
      },
      {
        content: "",
        reset: true,
      },
      {
        content: "second session after clear\r\n",
        reset: false,
      },
    ],
  );
  assert.deepEqual(fakeDriver.stdinDisabled, [false, false]);

  await controller.dispose();
});

test("runtime tab controller resets the xterm surface before hydrating a different session on the same host", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const firstClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "first session\r\n",
            occurredAt: "2026-04-18T00:00:01.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  const secondClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "second session\r\n",
            occurredAt: "2026-04-18T00:00:02.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-first-0001",
    cursor: "0",
    client: firstClient,
  });
  await controller.bindSession({
    sessionId: "session-second-0001",
    cursor: "0",
    client: secondClient,
  });

  assert.deepEqual(fakeDriver.writes, [
    {
      content: "first session\r\n",
      reset: false,
    },
    {
      content: "",
      reset: true,
    },
    {
      content: "second session\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller filters overlapping replay entries when a session is rebound", async () => {
  const fakeDriver = createFakeDriver();
  const replayRequests: Array<{ sessionId: string; fromCursor?: string; limit?: number }> = [];
  const replayApplications: Array<{ nextCursor: string; sequences: number[] }> = [];
  let replayCallCount = 0;
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
    onReplayApplied(args) {
      replayApplications.push({
        nextCursor: args.nextCursor,
        sequences: args.entries.map((entry) => entry.sequence),
      });
    },
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId, request) {
      replayRequests.push({
        sessionId,
        fromCursor: request?.fromCursor,
        limit: request?.limit,
      });
      replayCallCount += 1;

      if (replayCallCount === 1) {
        return {
          sessionId,
          fromCursor: request?.fromCursor ?? null,
          nextCursor: "1",
          hasMore: false,
          entries: [
            {
              sequence: 1,
              kind: "output",
              payload: "already rendered\r\n",
              occurredAt: "2026-04-25T00:00:01.000Z",
            },
          ],
        };
      }

      return {
        sessionId,
        fromCursor: request?.fromCursor ?? null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "already rendered\r\n",
            occurredAt: "2026-04-25T00:00:01.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "new only\r\n",
            occurredAt: "2026-04-25T00:00:02.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-overlap-rebind-0001",
    cursor: "0",
    client,
    subscribeToStream: false,
  });
  await controller.bindSession({
    sessionId: "session-overlap-rebind-0001",
    cursor: "0",
    client,
    subscribeToStream: false,
  });

  assert.deepEqual(replayRequests, [
    {
      sessionId: "session-overlap-rebind-0001",
      fromCursor: "0",
      limit: 256,
    },
    {
      sessionId: "session-overlap-rebind-0001",
      fromCursor: "1",
      limit: 256,
    },
  ]);
  assert.deepEqual(
    fakeDriver.writes.map((entry) => entry.content),
    [
      "already rendered\r\n",
      "new only\r\n",
    ],
  );
  assert.deepEqual(replayApplications, [
    {
      nextCursor: "1",
      sequences: [1],
    },
    {
      nextCursor: "2",
      sequences: [2],
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller applies live stream events and disposes subscriptions and the driver", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const titleChanges: string[] = [];
  const replayApplications: Array<{ nextCursor: string; entryKinds: string[] }> = [];
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
    onTitleChange(title) {
      titleChanges.push(title);
    },
    onReplayApplied(args) {
      replayApplications.push({
        nextCursor: args.nextCursor,
        entryKinds: args.entries.map((entry) => entry.kind),
      });
    },
  });

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-0003",
    cursor: "0",
    client: runtimeClient.client,
    acknowledgeAttachment: async () => undefined,
  });

  assert.equal(runtimeClient.streamListeners.length, 1);
  fakeDriver.emitTitle("pwsh / workspace");

  runtimeClient.streamListeners[0]?.({
    sessionId: "session-0003",
    nextCursor: "4",
    entry: {
      sequence: 4,
      kind: "output",
      payload: "dir\r\n",
      occurredAt: "2026-04-18T00:00:03.000Z",
    },
  });

  runtimeClient.streamListeners[0]?.({
    sessionId: "session-0003",
    nextCursor: "5",
    entry: {
      sequence: 5,
      kind: "exit",
      payload: "{\"exitCode\":0}",
      occurredAt: "2026-04-18T00:00:04.000Z",
    },
  });

  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(titleChanges, ["pwsh / workspace"]);
  assert.deepEqual(
    fakeDriver.writes.map((entry) => entry.content),
    [
      "PowerShell ready\r\nPS D:\\sdkwork-terminal> ",
      "dir\r\n\r\n[shell session exited with code 0]\r\n",
    ],
  );
  assert.deepEqual(replayApplications, [
    {
      nextCursor: "3",
      entryKinds: ["output", "output"],
    },
    {
      nextCursor: "5",
      entryKinds: ["output", "exit"],
    },
  ]);

  await controller.dispose();

  assert.equal(runtimeClient.unsubscribed, 1);
  assert.equal(fakeDriver.disposed, true);
});

test("runtime tab controller keeps rendering live stream output while attachment acknowledge is in flight", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const acknowledgeCalls: Array<{ attachmentId: string; sequence: number }> = [];
  let acknowledgeCallCount = 0;
  let releaseInitialAcknowledge: (() => void) | null = null;
  const initialAcknowledge = new Promise<void>((resolve) => {
    releaseInitialAcknowledge = resolve;
  });

  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-ack-lag-0001",
    cursor: "0",
    attachmentId: "attachment-ack-lag-0001",
    client: runtimeClient.client,
    acknowledgeAttachment: async (request) => {
      acknowledgeCalls.push({
        attachmentId: request.attachmentId,
        sequence: request.sequence,
      });
      acknowledgeCallCount += 1;

      if (acknowledgeCallCount === 1) {
        await initialAcknowledge;
      }
    },
  });

  assert.deepEqual(acknowledgeCalls, [
    {
      attachmentId: "attachment-ack-lag-0001",
      sequence: 2,
    },
  ]);

  runtimeClient.streamListeners[0]?.({
    sessionId: "session-ack-lag-0001",
    nextCursor: "4",
    entry: {
      sequence: 4,
      kind: "output",
      payload: "live frame 4\r\n",
      occurredAt: "2026-04-18T00:00:04.000Z",
    },
  });
  runtimeClient.streamListeners[0]?.({
    sessionId: "session-ack-lag-0001",
    nextCursor: "5",
    entry: {
      sequence: 5,
      kind: "output",
      payload: "live frame 5\r\n",
      occurredAt: "2026-04-18T00:00:05.000Z",
    },
  });

  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(
    fakeDriver.writes.map((entry) => entry.content),
    [
      "PowerShell ready\r\nPS D:\\sdkwork-terminal> ",
      "live frame 4\r\nlive frame 5\r\n",
    ],
  );
  assert.deepEqual(acknowledgeCalls, [
    {
      attachmentId: "attachment-ack-lag-0001",
      sequence: 2,
    },
  ]);

  releaseInitialAcknowledge?.();

  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(acknowledgeCalls, [
    {
      attachmentId: "attachment-ack-lag-0001",
      sequence: 2,
    },
    {
      attachmentId: "attachment-ack-lag-0001",
      sequence: 5,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller ignores stale attachment acknowledge failures after the attachment is rotated away", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const runtimeErrors: string[] = [];
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
    onRuntimeError(message) {
      runtimeErrors.push(message);
    },
  });

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-stale-ack-0001",
    cursor: "0",
    attachmentId: "attachment-stale-ack-0001",
    client: runtimeClient.client,
    acknowledgeAttachment: async () => {
      throw new Error("attachment not found: attachment-stale-ack-0001");
    },
  });

  runtimeClient.streamListeners[0]?.({
    sessionId: "session-stale-ack-0001",
    nextCursor: "4",
    entry: {
      sequence: 4,
      kind: "output",
      payload: "live frame after stale ack\r\n",
      occurredAt: "2026-04-20T00:00:04.000Z",
    },
  });

  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(
    fakeDriver.writes.map((entry) => entry.content),
    [
      "PowerShell ready\r\nPS D:\\sdkwork-terminal> ",
      "live frame after stale ack\r\n",
    ],
  );
  assert.deepEqual(runtimeErrors, []);

  await controller.dispose();
});

test("runtime tab controller ignores tauri callback disposal noise while replacing a session subscription", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const firstClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "1",
        hasMore: false,
        entries: [],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents() {
      return async () => {
        throw new Error(
          "[TAURI] Couldn't find callback id 3545547035. This might happen when the app is reloaded while Rust is running an asynchronous operation.",
        );
      };
    },
  };

  const secondClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "second binding replay\r\n",
            occurredAt: "2026-04-20T00:00:01.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents() {
      return async () => undefined;
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-reload-0001",
    cursor: "0",
    client: firstClient,
  });

  await controller.bindSession({
    sessionId: "session-reload-0002",
    cursor: "0",
    client: secondClient,
  });

  assert.deepEqual(
    fakeDriver.writes.map((entry) => ({
      content: entry.content,
      reset: entry.reset,
    })),
    [
      {
        content: "",
        reset: true,
      },
      {
        content: "second binding replay\r\n",
        reset: false,
      },
    ],
  );

  await controller.dispose();
});

test("runtime tab controller prevents stale concurrent bindings from duplicating the active stream subscription", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });
  let releaseFirstReplay: (() => void) | null = null;
  let firstSubscribeCount = 0;
  let secondSubscribeCount = 0;
  const secondUnlistenCalls: string[] = [];
  const firstReplayGate = new Promise<void>((release) => {
    releaseFirstReplay = release;
  });
  let markFirstReplayStarted: (() => void) | null = null;
  const firstReplayStarted = new Promise<void>((resolve) => {
    markFirstReplayStarted = resolve;
  });
  const firstClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      markFirstReplayStarted?.();
      await firstReplayGate;
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "stale first replay\r\n",
            occurredAt: "2026-04-20T00:00:01.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents() {
      firstSubscribeCount += 1;
      return async () => undefined;
    },
  };

  const secondClient: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "2",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "active second replay\r\n",
            occurredAt: "2026-04-20T00:00:02.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents(sessionId) {
      secondSubscribeCount += 1;
      return async () => {
        secondUnlistenCalls.push(sessionId);
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  const firstBind = controller.bindSession({
    sessionId: "session-concurrent-first-0001",
    cursor: "0",
    client: firstClient,
  });
  await firstReplayStarted;
  await controller.bindSession({
    sessionId: "session-concurrent-second-0001",
    cursor: "0",
    client: secondClient,
  });

  releaseFirstReplay?.();
  await firstBind;

  assert.equal(firstSubscribeCount, 0);
  assert.equal(secondSubscribeCount, 1);
  assert.deepEqual(
    fakeDriver.writes.map((entry) => entry.content),
    [
      "",
      "active second replay\r\n",
    ],
  );

  await controller.dispose();
  assert.deepEqual(secondUnlistenCalls, ["session-concurrent-second-0001"]);
});

test("runtime tab controller repairs missed stream gaps from replay before applying later live entries", async () => {
  const fakeDriver = createFakeDriver();
  const replayRequests: Array<{ sessionId: string; fromCursor?: string; limit?: number }> = [];
  const streamListeners: Array<(event: RuntimeSessionStreamEvent) => void> = [];
  let replayCallCount = 0;

  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId, request) {
      replayRequests.push({
        sessionId,
        fromCursor: request?.fromCursor,
        limit: request?.limit,
      });
      replayCallCount += 1;

      if (replayCallCount === 1) {
        return {
          sessionId,
          fromCursor: request?.fromCursor ?? null,
          nextCursor: "1",
          hasMore: false,
          entries: [],
        };
      }

      return {
        sessionId,
        fromCursor: request?.fromCursor ?? null,
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 2,
            kind: "output",
            payload: "echo second\r\n",
            occurredAt: "2026-04-18T00:00:02.000Z",
          },
          {
            sequence: 3,
            kind: "output",
            payload: "echo third\r\n",
            occurredAt: "2026-04-18T00:00:03.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents(_sessionId, listener) {
      streamListeners.push(listener);
      return async () => undefined;
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-gap-0001",
    cursor: "1",
    client,
  });

  assert.equal(streamListeners.length, 1);

  streamListeners[0]?.({
    sessionId: "session-gap-0001",
    nextCursor: "3",
    entry: {
      sequence: 3,
      kind: "output",
      payload: "echo third\r\n",
      occurredAt: "2026-04-18T00:00:03.000Z",
    },
  });

  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(replayRequests, [
    {
      sessionId: "session-gap-0001",
      fromCursor: undefined,
      limit: 256,
    },
    {
      sessionId: "session-gap-0001",
      fromCursor: "1",
      limit: 256,
    },
  ]);
  assert.deepEqual(
    fakeDriver.writes.map((entry) => entry.content),
    [
      "",
      "echo second\r\necho third\r\n",
    ],
  );

  await controller.dispose();
});

test("runtime tab controller hydrates every replay page so large histories remain scrollable", async () => {
  const fakeDriver = createFakeDriver();
  const replayRequests: Array<{ sessionId: string; fromCursor?: string; limit?: number }> = [];
  let replayCallCount = 0;

  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId, request) {
      replayRequests.push({
        sessionId,
        fromCursor: request?.fromCursor,
        limit: request?.limit,
      });
      replayCallCount += 1;

      if (replayCallCount === 1) {
        return {
          sessionId,
          fromCursor: request?.fromCursor ?? null,
          nextCursor: "64",
          hasMore: true,
          entries: [
            {
              sequence: 1,
              kind: "output",
              payload: "page 1 line 1\r\n",
              occurredAt: "2026-04-18T00:00:01.000Z",
            },
            {
              sequence: 64,
              kind: "output",
              payload: "page 1 line 64\r\n",
              occurredAt: "2026-04-18T00:01:04.000Z",
            },
          ],
        };
      }

      return {
        sessionId,
        fromCursor: request?.fromCursor ?? null,
        nextCursor: "66",
        hasMore: false,
        entries: [
          {
            sequence: 65,
            kind: "output",
            payload: "page 2 line 65\r\n",
            occurredAt: "2026-04-18T00:01:05.000Z",
          },
          {
            sequence: 66,
            kind: "output",
            payload: "page 2 line 66\r\n",
            occurredAt: "2026-04-18T00:01:06.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-large-history-0001",
    cursor: "0",
    client,
  });

  assert.deepEqual(replayRequests, [
    {
      sessionId: "session-large-history-0001",
      fromCursor: "0",
      limit: 256,
    },
    {
      sessionId: "session-large-history-0001",
      fromCursor: "64",
      limit: 256,
    },
  ]);
  assert.deepEqual(
    fakeDriver.writes.map((entry) => entry.content),
    [
      "page 1 line 1\r\npage 1 line 64\r\n",
      "page 2 line 65\r\npage 2 line 66\r\n",
    ],
  );

  await controller.dispose();
});

test("runtime tab controller fully rebuilds the viewport from raw replay when a TUI gap is detected", async () => {
  const fakeDriver = createFakeDriver();
  fakeDriver.setRuntimeState({
    activeBufferType: "alternate",
    mouseTrackingMode: "any",
  });
  const replayRequests: Array<{ sessionId: string; fromCursor?: string; limit?: number }> = [];
  const streamListeners: Array<(event: RuntimeSessionStreamEvent) => void> = [];
  let replayCallCount = 0;

  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId, request) {
      replayRequests.push({
        sessionId,
        fromCursor: request?.fromCursor,
        limit: request?.limit,
      });
      replayCallCount += 1;

      if (replayCallCount === 1) {
        return {
          sessionId,
          fromCursor: request?.fromCursor ?? null,
          nextCursor: "10",
          hasMore: false,
          entries: [],
        };
      }

      return {
        sessionId,
        fromCursor: request?.fromCursor ?? null,
        nextCursor: "12",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "\u001b[?1049h",
            occurredAt: "2026-04-18T00:00:01.000Z",
          },
          {
            sequence: 11,
            kind: "output",
            payload: "rebuilt tui frame\r\n",
            occurredAt: "2026-04-18T00:00:11.000Z",
          },
          {
            sequence: 12,
            kind: "output",
            payload: "rebuilt tui frame 2\r\n",
            occurredAt: "2026-04-18T00:00:12.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents(_sessionId, listener) {
      streamListeners.push(listener);
      return async () => undefined;
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-tui-gap-0001",
    cursor: "10",
    client,
  });

  streamListeners[0]?.({
    sessionId: "session-tui-gap-0001",
    nextCursor: "12",
    entry: {
      sequence: 12,
      kind: "output",
      payload: "rebuilt tui frame 2\r\n",
      occurredAt: "2026-04-18T00:00:12.000Z",
    },
  });

  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(replayRequests, [
    {
      sessionId: "session-tui-gap-0001",
      fromCursor: undefined,
      limit: 256,
    },
    {
      sessionId: "session-tui-gap-0001",
      fromCursor: undefined,
      limit: 256,
    },
  ]);
  assert.deepEqual(fakeDriver.writes, [
    {
      content: "",
      reset: true,
    },
    {
      content: "",
      reset: true,
    },
    {
      content: "\u001b[?1049hrebuilt tui frame\r\nrebuilt tui frame 2\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller writes alternate-screen control bytes through to xterm", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "before tui\r\n",
            occurredAt: "2026-04-20T00:00:01.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "\u001b[?1049hinteractive frame\r\n",
            occurredAt: "2026-04-20T00:00:02.000Z",
          },
          {
            sequence: 3,
            kind: "output",
            payload: "\u001b[?1049lafter tui\r\n",
            occurredAt: "2026-04-20T00:00:03.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-tui-scrollback-0001",
    cursor: "0",
    client,
  });

  assert.deepEqual(fakeDriver.writes, [
    {
      content: "before tui\r\n\u001b[?1049hinteractive frame\r\n\u001b[?1049lafter tui\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller writes destructive tui redraw bytes through to xterm", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "4",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "\u001b[?1049h\u001b[2J\u001b[Hframe 1\r\n",
            occurredAt: "2026-04-20T00:00:01.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "\u001b[2J\u001b[Hframe 2\r\n",
            occurredAt: "2026-04-20T00:00:02.000Z",
          },
          {
            sequence: 3,
            kind: "output",
            payload: "\u001b[2K\rstatus updated",
            occurredAt: "2026-04-20T00:00:03.000Z",
          },
          {
            sequence: 4,
            kind: "output",
            payload: "\u001b[?1049lafter tui\r\n",
            occurredAt: "2026-04-20T00:00:04.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-tui-linearized-history-0001",
    cursor: "0",
    client,
  });

  assert.deepEqual(fakeDriver.writes, [
    {
      content:
        "\u001b[?1049h\u001b[2J\u001b[Hframe 1\r\n" +
        "\u001b[2J\u001b[Hframe 2\r\n" +
        "\u001b[2K\rstatus updated\u001b[?1049lafter tui\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller preserves split tui control sequences in raw stream order", async () => {
  const fakeDriver = createFakeDriver();
  const runtimeClient = createRuntimeClient();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-split-tui-0001",
    cursor: "0",
    client: runtimeClient.client,
  });

  runtimeClient.streamListeners[0]?.({
    sessionId: "session-split-tui-0001",
    nextCursor: "4",
    entry: {
      sequence: 4,
      kind: "output",
      payload: "\u001b[?104",
      occurredAt: "2026-04-20T00:00:04.000Z",
    },
  });
  runtimeClient.streamListeners[0]?.({
    sessionId: "session-split-tui-0001",
    nextCursor: "5",
    entry: {
      sequence: 5,
      kind: "output",
      payload: "9h\u001b[2J\u001b[Hframe split 1\r\n",
      occurredAt: "2026-04-20T00:00:05.000Z",
    },
  });
  runtimeClient.streamListeners[0]?.({
    sessionId: "session-split-tui-0001",
    nextCursor: "6",
    entry: {
      sequence: 6,
      kind: "output",
      payload: "\u001b[2J\u001b[Hframe split 2\r\n",
      occurredAt: "2026-04-20T00:00:06.000Z",
    },
  });
  runtimeClient.streamListeners[0]?.({
    sessionId: "session-split-tui-0001",
    nextCursor: "7",
    entry: {
      sequence: 7,
      kind: "output",
      payload: "\u001b[?1049lafter split tui\r\n",
      occurredAt: "2026-04-20T00:00:07.000Z",
    },
  });

  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(
    fakeDriver.writes.map((entry) => entry.content),
    [
      "PowerShell ready\r\nPS D:\\sdkwork-terminal> ",
      "\u001b[?1049h\u001b[2J\u001b[Hframe split 1\r\n" +
        "\u001b[2J\u001b[Hframe split 2\r\n" +
        "\u001b[?1049lafter split tui\r\n",
    ],
  );

  await controller.dispose();
});

test("runtime tab controller writes mouse-reporting and clear-screen control bytes raw", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "\u001b[?1000h\u001b[?1006h\u001b[2J\u001b[Hcodex frame 1\r\n",
            occurredAt: "2026-04-20T00:00:01.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "\u001b[2J\u001b[Hcodex frame 2\r\n",
            occurredAt: "2026-04-20T00:00:02.000Z",
          },
          {
            sequence: 3,
            kind: "output",
            payload: "\u001b[?1000l\u001b[?1006lafter mouse tui\r\n",
            occurredAt: "2026-04-20T00:00:03.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-tui-mouse-reporting-0001",
    cursor: "0",
    client,
  });

  assert.deepEqual(fakeDriver.writes, [
    {
      content:
        "\u001b[?1000h\u001b[?1006h\u001b[2J\u001b[Hcodex frame 1\r\n" +
        "\u001b[2J\u001b[Hcodex frame 2\r\n" +
        "\u001b[?1000l\u001b[?1006lafter mouse tui\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller writes Codex cursor-visibility redraw toggles raw", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "4",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "shell ready\r\n",
            occurredAt: "2026-04-20T00:00:01.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "\u001b[?1049hframe 1\r\n",
            occurredAt: "2026-04-20T00:00:02.000Z",
          },
          {
            sequence: 3,
            kind: "output",
            payload: "\u001b[?25hstatus line\rframe 2\r\n",
            occurredAt: "2026-04-20T00:00:03.000Z",
          },
          {
            sequence: 4,
            kind: "output",
            payload: "\u001b[?1049lafter tui\r\n",
            occurredAt: "2026-04-20T00:00:04.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-tui-cursor-redraw-0001",
    cursor: "0",
    client,
  });

  assert.deepEqual(fakeDriver.writes, [
    {
      content:
        "shell ready\r\n" +
        "\u001b[?1049hframe 1\r\n" +
        "\u001b[?25hstatus line\rframe 2\r\n" +
        "\u001b[?1049lafter tui\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller keeps ordinary shell prompt redraw sequences in the live terminal buffer", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "PowerShell ready\r\n",
            occurredAt: "2026-04-20T00:00:01.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "\u001b[?25l\u001b[2K\rPS D:\\sdkwork-terminal> dir\u001b[?25h",
            occurredAt: "2026-04-20T00:00:02.000Z",
          },
          {
            sequence: 3,
            kind: "output",
            payload: "\r\nlisting\r\nPS D:\\sdkwork-terminal> ",
            occurredAt: "2026-04-20T00:00:03.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-normal-prompt-redraw-0001",
    cursor: "0",
    client,
  });

  assert.deepEqual(fakeDriver.writes, [
    {
      content:
        "PowerShell ready\r\n" +
        "\u001b[?25l\u001b[2K\rPS D:\\sdkwork-terminal> dir\u001b[?25h" +
        "\r\nlisting\r\nPS D:\\sdkwork-terminal> ",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller writes Codex inline redraw stream as raw terminal bytes", async () => {
  const fakeDriver = createFakeDriver();
  const streamListeners: Array<(event: RuntimeSessionStreamEvent) => void> = [];
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId, request) {
      return {
        sessionId,
        fromCursor: request?.fromCursor ?? null,
        nextCursor: request?.fromCursor ?? "0",
        hasMore: false,
        entries: [],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
    async subscribeSessionEvents(_sessionId, listener) {
      streamListeners.push(listener);
      return async () => undefined;
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-codex-inline-raw-0001",
    cursor: "0",
    client,
  });

  const firstFrame =
    "\u001b[?2026h\u001b[1;24rCodex thinking\rworking set";
  const redrawFrame =
    "\u001b[2K\rCodex thinking\rworking set\u001b[?2026l";
  streamListeners[0]?.({
    sessionId: "session-codex-inline-raw-0001",
    nextCursor: "1",
    entry: {
      sequence: 1,
      kind: "output",
      payload: firstFrame,
      occurredAt: "2026-04-25T00:00:01.000Z",
    },
  });
  streamListeners[0]?.({
    sessionId: "session-codex-inline-raw-0001",
    nextCursor: "2",
    entry: {
      sequence: 2,
      kind: "output",
      payload: redrawFrame,
      occurredAt: "2026-04-25T00:00:02.000Z",
    },
  });

  await flushPendingMicrotasks();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(fakeDriver.writes, [
    {
      content: `${firstFrame}${redrawFrame}`,
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller writes Codex synchronized-output and scroll-region control bytes raw", async () => {
  const fakeDriver = createFakeDriver();
  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId) {
      return {
        sessionId,
        fromCursor: null,
        nextCursor: "3",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "\u001b[?2026h\u001b[1;24rstatus frame 1\rstatus frame 2",
            occurredAt: "2026-04-20T00:00:01.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "\u001b[2Kstatus frame 3\rstatus frame 4",
            occurredAt: "2026-04-20T00:00:02.000Z",
          },
          {
            sequence: 3,
            kind: "output",
            payload: "\u001b[?2026lafter inline tui\r\n",
            occurredAt: "2026-04-20T00:00:03.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-tui-inline-redraw-0001",
    cursor: "0",
    client,
  });

  assert.deepEqual(fakeDriver.writes, [
    {
      content:
        "\u001b[?2026h\u001b[1;24rstatus frame 1\rstatus frame 2" +
        "\u001b[2Kstatus frame 3\rstatus frame 4" +
        "\u001b[?2026lafter inline tui\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller replays from the session start when a fresh surface binds to a non-origin cursor", async () => {
  const fakeDriver = createFakeDriver();
  const replayRequests: Array<{ sessionId: string; fromCursor?: string; limit?: number }> = [];

  const controller = createRuntimeTabController({
    driver: fakeDriver.driver,
  });

  const client: RuntimeTabControllerClient = {
    async sessionReplay(sessionId, request) {
      replayRequests.push({
        sessionId,
        fromCursor: request?.fromCursor,
        limit: request?.limit,
      });

      if (request?.fromCursor) {
        return {
          sessionId,
          fromCursor: request.fromCursor,
          nextCursor: request.fromCursor,
          hasMore: false,
          entries: [],
        };
      }

      return {
        sessionId,
        fromCursor: null,
        nextCursor: "42",
        hasMore: false,
        entries: [
          {
            sequence: 1,
            kind: "output",
            payload: "full restore line 1\r\n",
            occurredAt: "2026-04-18T00:00:01.000Z",
          },
          {
            sequence: 42,
            kind: "output",
            payload: "full restore line 42\r\n",
            occurredAt: "2026-04-18T00:00:42.000Z",
          },
        ],
      };
    },
    async writeSessionInput(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.input.length,
      };
    },
    async writeSessionInputBytes(request) {
      return {
        sessionId: request.sessionId,
        acceptedBytes: request.inputBytes.length,
      };
    },
  };

  await controller.attachHost({ nodeName: "DIV" } as unknown as HTMLElement);
  await controller.bindSession({
    sessionId: "session-restore-0001",
    cursor: "41",
    client,
    subscribeToStream: false,
  });

  assert.deepEqual(replayRequests, [
    {
      sessionId: "session-restore-0001",
      fromCursor: undefined,
      limit: 256,
    },
  ]);
  assert.deepEqual(fakeDriver.writes, [
    {
      content: "",
      reset: true,
    },
    {
      content: "full restore line 1\r\nfull restore line 42\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});
