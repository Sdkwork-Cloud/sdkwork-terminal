import test from "node:test";
import assert from "node:assert/strict";

import {
  createSurfacePath,
  createWebRuntimeBridgeClient,
} from "../packages/sdkwork-terminal-infrastructure/src/index.ts";

function createJsonResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    },
  };
}

class StubEventSource {
  listeners = new Map<string, Array<(event: { data: string }) => void>>();
  closed = false;

  addEventListener(type: string, listener: (event: { data: string }) => void) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type: string, payload: unknown) {
    const listeners = this.listeners.get(type) ?? [];
    const event = {
      data: JSON.stringify(payload),
    };

    for (const listener of listeners) {
      listener(event);
    }
  }

  close() {
    this.closed = true;
  }
}

test("web runtime bridge client routes remote runtime session lifecycle through public API", async () => {
  const calls: Array<{
    input: string;
    init: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    } | undefined;
  }> = [];
  const client = createWebRuntimeBridgeClient({
    baseUrl: "https://runtime.sdkwork.local",
    fetch: async (input, init) => {
      calls.push({
        input,
        init,
      });

      switch (`${init?.method ?? "GET"} ${input}`) {
        case "POST https://runtime.sdkwork.local/terminal/api/v1/sessions":
          return createJsonResponse({
            sessionId: "session-9001",
            workspaceId: "workspace-runtime",
            target: "remote-runtime",
            state: "Running",
            createdAt: "2026-04-10T16:30:00.000Z",
            lastActiveAt: "2026-04-10T16:30:00.000Z",
            modeTags: ["cli-native"],
            tags: ["resource:remote-runtime"],
            attachmentId: "attachment-9001",
            cursor: "0",
            lastAckSequence: 0,
            writable: true,
            authority: "runtime://edge-node-a",
            invokedProgram: "/bin/sh",
            invokedArgs: [],
            workingDirectory: "/workspace",
            replayEntry: {
              sequence: 1,
              kind: "state",
              payload: "{\"state\":\"running\"}",
              occurredAt: "2026-04-10T16:30:00.000Z",
            },
          });
        case "GET https://runtime.sdkwork.local/terminal/api/v1/replays?sessionId=session-9001&fromCursor=3&limit=16":
          return createJsonResponse({
            sessionId: "session-9001",
            fromCursor: "3",
            nextCursor: "5",
            hasMore: false,
            entries: [
              {
                sequence: 4,
                kind: "output",
                payload: "runtime ready",
                occurredAt: "2026-04-10T16:30:01.000Z",
              },
              {
                sequence: 5,
                kind: "output",
                payload: "$ ",
                occurredAt: "2026-04-10T16:30:02.000Z",
              },
            ],
          });
        case "POST https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/input":
          return createJsonResponse({
            sessionId: "session-9001",
            acceptedBytes: 12,
          });
        case "POST https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/input-bytes":
          return createJsonResponse({
            sessionId: "session-9001",
            acceptedBytes: 6,
          });
        case "POST https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/resize":
          return createJsonResponse({
            sessionId: "session-9001",
            cols: 132,
            rows: 36,
          });
        case "POST https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/terminate":
          return createJsonResponse({
            sessionId: "session-9001",
            state: "Stopping",
          });
        default:
          throw new Error(`Unexpected request ${init?.method ?? "GET"} ${input}`);
      }
    },
  });

  const created = await client.createRemoteRuntimeSession({
    workspaceId: "workspace-runtime",
    target: "remote-runtime",
    authority: "runtime://edge-node-a",
    command: ["/bin/sh"],
    modeTags: ["cli-native"],
    tags: ["resource:remote-runtime"],
  });
  const replay = await client.sessionReplay("session-9001", {
    fromCursor: "3",
    limit: 16,
  });
  const input = await client.writeSessionInput({
    sessionId: "session-9001",
    input: "echo runtime\r",
  });
  const inputBytes = await client.writeSessionInputBytes({
    sessionId: "session-9001",
    inputBytes: [0x1b, 0x5b, 0x41, 0x1b, 0x5b, 0x42],
  });
  const resized = await client.resizeSession({
    sessionId: "session-9001",
    cols: 132,
    rows: 36,
  });
  const terminated = await client.terminateSession("session-9001");

  assert.equal(created.sessionId, "session-9001");
  assert.equal(created.target, "remote-runtime");
  assert.equal(replay.nextCursor, "5");
  assert.equal(input.acceptedBytes, 12);
  assert.equal(inputBytes.acceptedBytes, 6);
  assert.equal(resized.cols, 132);
  assert.equal(terminated.state, "Stopping");
  assert.deepEqual(
    calls.map((call) => ({
      input: call.input,
      method: call.init?.method ?? "GET",
      body: call.init?.body,
    })),
    [
      {
        input: "https://runtime.sdkwork.local/terminal/api/v1/sessions",
        method: "POST",
        body: JSON.stringify({
          workspaceId: "workspace-runtime",
          target: "remote-runtime",
          authority: "runtime://edge-node-a",
          command: ["/bin/sh"],
          modeTags: ["cli-native"],
          tags: ["resource:remote-runtime"],
        }),
      },
      {
        input: "https://runtime.sdkwork.local/terminal/api/v1/replays?sessionId=session-9001&fromCursor=3&limit=16",
        method: "GET",
        body: undefined,
      },
      {
        input: "https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/input",
        method: "POST",
        body: JSON.stringify({
          input: "echo runtime\r",
        }),
      },
      {
        input: "https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/input-bytes",
        method: "POST",
        body: JSON.stringify({
          inputBytes: [0x1b, 0x5b, 0x41, 0x1b, 0x5b, 0x42],
        }),
      },
      {
        input: "https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/resize",
        method: "POST",
        body: JSON.stringify({
          cols: 132,
          rows: 36,
        }),
      },
      {
        input: "https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/terminate",
        method: "POST",
        body: undefined,
      },
    ],
  );
});

test("web runtime bridge client subscribes to runtime stream events through the runtimeStream surface", async () => {
  const streams: string[] = [];
  let source: StubEventSource | null = null;
  const client = createWebRuntimeBridgeClient({
    createEventSource(input) {
      streams.push(input);
      source = new StubEventSource();
      return source;
    },
  });
  const received: Array<{
    sessionId: string;
    nextCursor: string;
    kind: "output" | "warning" | "exit";
  }> = [];

  assert.ok(client.subscribeSessionEvents);
  const unlisten = await client.subscribeSessionEvents!("session-9001", (event) => {
    received.push({
      sessionId: event.sessionId,
      nextCursor: event.nextCursor,
      kind: event.entry.kind,
    });
  });

  assert.deepEqual(streams, [
    createSurfacePath("runtimeStream", "attach") + "?sessionId=session-9001",
  ]);
  assert.ok(source);

  source.emit("session.output", {
    sessionId: "session-9999",
    nextCursor: "1",
    entry: {
      sequence: 1,
      kind: "output",
      payload: "ignore",
      occurredAt: "2026-04-10T16:35:00.000Z",
    },
  });
  source.emit("session.output", {
    sessionId: "session-9001",
    nextCursor: "2",
    entry: {
      sequence: 2,
      kind: "output",
      payload: "runtime ready",
      occurredAt: "2026-04-10T16:35:01.000Z",
    },
  });
  source.emit("session.warning", {
    sessionId: "session-9001",
    nextCursor: "3",
    entry: {
      sequence: 3,
      kind: "warning",
      payload: "{\"message\":\"slow network\"}",
      occurredAt: "2026-04-10T16:35:02.000Z",
    },
  });
  source.emit("session.exit", {
    sessionId: "session-9001",
    nextCursor: "4",
    entry: {
      sequence: 4,
      kind: "exit",
      payload: "{\"exitCode\":0}",
      occurredAt: "2026-04-10T16:35:03.000Z",
    },
  });

  assert.deepEqual(received, [
    {
      sessionId: "session-9001",
      nextCursor: "2",
      kind: "output",
    },
    {
      sessionId: "session-9001",
      nextCursor: "3",
      kind: "warning",
    },
    {
      sessionId: "session-9001",
      nextCursor: "4",
      kind: "exit",
    },
  ]);

  await unlisten();

  assert.equal(source.closed, true);
});
