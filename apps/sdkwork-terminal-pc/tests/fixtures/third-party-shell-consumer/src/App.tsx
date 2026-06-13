import "@sdkwork/terminal-shell/styles.css";

import {
  WebShellApp,
  createBrowserClipboardProvider,
} from "@sdkwork/terminal-shell/integration";
import type {
  ShellAppWebRuntimeClient,
  ShellRuntimeInteractiveSessionSnapshot,
  ShellRuntimeSessionInputBytesRequest,
  ShellRuntimeSessionInputRequest,
  ShellRuntimeSessionReplayRequest,
  ShellRuntimeSessionReplaySnapshot,
  ShellRuntimeSessionResizeRequest,
  ShellRuntimeSessionResizeSnapshot,
  ShellRuntimeSessionTerminateSnapshot,
  WebRuntimeTarget,
} from "@sdkwork/terminal-shell";

const clipboardProvider = createBrowserClipboardProvider({
  clipboard: {
    readText: async () => "",
    writeText: async () => undefined,
  },
});

async function createInteractiveSession(): Promise<ShellRuntimeInteractiveSessionSnapshot> {
  return {
    sessionId: "fixture-session",
    attachmentId: "fixture-attachment",
    cursor: "0",
    workingDirectory: "/workspace",
    invokedProgram: "/bin/bash",
  };
}

async function readReplay(
  request?: ShellRuntimeSessionReplayRequest,
): Promise<ShellRuntimeSessionReplaySnapshot> {
  return {
    sessionId: "fixture-session",
    fromCursor: request?.fromCursor ?? null,
    nextCursor: request?.fromCursor ?? "0",
    hasMore: false,
    entries: [],
  };
}

async function writeTextInput(
  request: ShellRuntimeSessionInputRequest,
) {
  return {
    sessionId: request.sessionId,
    acceptedBytes: request.input.length,
  };
}

async function writeBytesInput(
  request: ShellRuntimeSessionInputBytesRequest,
) {
  return {
    sessionId: request.sessionId,
    acceptedBytes: request.inputBytes.length,
  };
}

async function resizeSession(
  request: ShellRuntimeSessionResizeRequest,
): Promise<ShellRuntimeSessionResizeSnapshot> {
  return {
    sessionId: request.sessionId,
    cols: request.cols,
    rows: request.rows,
  };
}

async function terminateSession(
  sessionId: string,
): Promise<ShellRuntimeSessionTerminateSnapshot> {
  return {
    sessionId,
    state: "terminated",
  };
}

const runtimeClient: ShellAppWebRuntimeClient = {
  createRemoteRuntimeSession: async () => createInteractiveSession(),
  sessionReplay: async (_sessionId, request) => readReplay(request),
  writeSessionInput: writeTextInput,
  writeSessionInputBytes: writeBytesInput,
  resizeSession,
  terminateSession,
  subscribeSessionEvents: async () => async () => undefined,
};

const runtimeTarget: WebRuntimeTarget = {
  workspaceId: "fixture-workspace",
  authority: "https://fixture.invalid",
  target: "remote-runtime",
  workingDirectory: "/workspace",
  modeTags: ["cli-native"],
  tags: ["third-party-consumer"],
};

export function App() {
  return (
    <WebShellApp
      clipboardProvider={clipboardProvider}
      webRuntimeClient={runtimeClient}
      webRuntimeTarget={runtimeTarget}
    />
  );
}
