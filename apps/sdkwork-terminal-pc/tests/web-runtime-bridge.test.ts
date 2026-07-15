import test from "node:test";
import assert from "node:assert/strict";

import {
  createAuthorizedFetchEventSourceFactory,
  createSurfacePath,
  createWebRuntimeBridgeClient,
  RUNTIME_STREAM_DISCONNECTED_WARNING,
  type WebFetchResponse,
} from "../packages/sdkwork-terminal-pc-infrastructure/src/index.ts";

function createJsonResponse(payload: unknown): WebFetchResponse {
  return {
    ok: true,
    status: 200,
    headers: new Headers({
      "content-type": "application/json",
    }),
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    },
  };
}

function createSdkWorkV3ItemResponse(item: unknown) {
  return createJsonResponse({
    code: 0,
    data: {
      item,
    },
    traceId: "trace-web-runtime-bridge",
  });
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

async function waitFor(condition: () => boolean) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  assert.fail("timed out waiting for an asynchronous SSE result");
}

function createSseResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
  );
}

test("authorized SSE factory parses CRLF frames and reports unexpected EOF after closing", async () => {
  let request: { input: string; authorization: string | null; accept: string | null } | null = null;
  const factory = createAuthorizedFetchEventSourceFactory("web-session-token", {
    fetch: async (input, init) => {
      request = {
        input: String(input),
        authorization: new Headers(init?.headers).get("authorization"),
        accept: new Headers(init?.headers).get("accept"),
      };
      return createSseResponse([
        "event: session.output\r\ndata: {\"sessionId\":\"session-9001\"}\r",
        "\n\r\n",
      ]);
    },
  });
  const source = factory("/terminal/stream/v1/attach?sessionId=session-9001");
  const events: string[] = [];
  const errorReadyStates: number[] = [];

  source.addEventListener("session.output", (event) => {
    events.push(event.data);
  });
  source.onerror = () => {
    errorReadyStates.push(source.readyState ?? -1);
  };

  await waitFor(() => source.readyState === 2);

  assert.deepEqual(request, {
    input: "/terminal/stream/v1/attach?sessionId=session-9001",
    authorization: "Bearer web-session-token",
    accept: "text/event-stream",
  });
  assert.deepEqual(events, ['{"sessionId":"session-9001"}']);
  assert.deepEqual(errorReadyStates, [2]);
});

test("authorized SSE factory does not report a graceful session exit as a disconnect", async () => {
  const factory = createAuthorizedFetchEventSourceFactory("web-session-token", {
    fetch: async () =>
      createSseResponse([
        "event: session.exit\ndata: {\"sessionId\":\"session-9001\"}\n\n",
      ]),
  });
  const source = factory("/terminal/stream/v1/attach?sessionId=session-9001");
  const events: string[] = [];
  let errorCount = 0;

  source.addEventListener("session.exit", (event) => {
    events.push(event.data);
  });
  source.onerror = () => {
    errorCount += 1;
  };

  await waitFor(() => source.readyState === 2);

  assert.deepEqual(events, ['{"sessionId":"session-9001"}']);
  assert.equal(errorCount, 0);
});

test("web runtime bridge client unwraps SDKWork v3 runtime session lifecycle responses", async () => {
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
        case "GET https://runtime.sdkwork.local/terminal/api/v1/sessions":
          return createSdkWorkV3ItemResponse({
            sessions: [],
            attachments: [],
          });
        case "POST https://runtime.sdkwork.local/terminal/api/v1/sessions":
          return createSdkWorkV3ItemResponse({
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
          return createSdkWorkV3ItemResponse({
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
          return createSdkWorkV3ItemResponse({
            sessionId: "session-9001",
            acceptedBytes: 12,
          });
        case "POST https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/input-bytes":
          return createSdkWorkV3ItemResponse({
            sessionId: "session-9001",
            acceptedBytes: 6,
          });
        case "POST https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/resize":
          return createSdkWorkV3ItemResponse({
            sessionId: "session-9001",
            cols: 132,
            rows: 36,
          });
        case "POST https://runtime.sdkwork.local/terminal/api/v1/sessions/session-9001/terminate":
          return createSdkWorkV3ItemResponse({
            sessionId: "session-9001",
            state: "Stopping",
          });
        default:
          throw new Error(`Unexpected request ${init?.method ?? "GET"} ${input}`);
      }
    },
  });

  const sessionIndex = await client.sessionIndex();
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

  assert.deepEqual(sessionIndex, {
    sessions: [],
    attachments: [],
  });
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
        method: "GET",
        body: undefined,
      },
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

test("web runtime bridge client emits structured disconnect warnings on runtimeStream errors", async () => {
  let source: StubEventSource | null = null;
  const client = createWebRuntimeBridgeClient({
    createEventSource() {
      source = new StubEventSource();
      Object.defineProperty(source, "readyState", {
        configurable: true,
        get() {
          return 2;
        },
      });
      queueMicrotask(() => {
        source?.onerror?.(new Event("error"));
      });
      return source;
    },
  });
  const received: Array<{
    kind: string;
    payload: string;
  }> = [];

  const unlisten = await client.subscribeSessionEvents!("session-9001", (event) => {
    received.push({
      kind: event.entry.kind,
      payload: event.entry.payload,
    });
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(received, [
    {
      kind: "warning",
      payload: RUNTIME_STREAM_DISCONNECTED_WARNING,
    },
  ]);
  assert.equal(source?.closed, true);

  await unlisten();
});

