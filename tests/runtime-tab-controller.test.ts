import test from "node:test";
import assert from "node:assert/strict";

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

  await controller.dispose();

  assert.deepEqual(runtimeClient.writtenText, ["pwd\r"]);
  assert.deepEqual(runtimeClient.writtenBinary, [[0x1b, 0x5b, 0x4d]]);
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
  await controller.dispose();

  assert.equal(runtimeClient.writtenText.length, 2);
  assert.equal(runtimeClient.writtenText[0]?.length, MAX_TERMINAL_PASTE_LENGTH);
  assert.equal(runtimeClient.writtenText[1]?.length, 96);
  assert.equal(
    runtimeClient.writtenText.join(""),
    "x".repeat(MAX_TERMINAL_PASTE_LENGTH + 96),
  );
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

test("runtime tab controller fully rebuilds the viewport from replay when a TUI gap is detected", async () => {
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
      content: "rebuilt tui frame\r\nrebuilt tui frame 2\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller strips alternate screen toggles so interactive tui output keeps viewport scrollback", async () => {
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
      content: "before tui\r\ninteractive frame\r\nafter tui\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller linearizes destructive tui redraw sequences into scrollable transcript history", async () => {
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
      content: "frame 1\r\nframe 2\r\nstatus updated\r\nafter tui\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller preserves tui transcript scrollback when control sequences are split across stream chunks", async () => {
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
      "\r\nframe split 1\r\nframe split 2\r\nafter split tui\r\n",
    ],
  );

  await controller.dispose();
});

test("runtime tab controller activates tui transcript mode from mouse-reporting and clear-screen sequences without alternate-screen enter", async () => {
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
      content: "codex frame 1\r\ncodex frame 2\r\nafter mouse tui\r\n",
      reset: false,
    },
  ]);

  await controller.dispose();
});

test("runtime tab controller keeps Codex transcript mode active across cursor-visibility redraw toggles", async () => {
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
      content: "shell ready\r\nframe 1\r\nstatus line\r\nframe 2\r\nafter tui\r\n",
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

test("runtime tab controller activates Codex inline transcript mode from synchronized-output and scroll-region redraw sequences", async () => {
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
        "status frame 1\r\nstatus frame 2\r\nstatus frame 3\r\nstatus frame 4\r\nafter inline tui\r\n",
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
