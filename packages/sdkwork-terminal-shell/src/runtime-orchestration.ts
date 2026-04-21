import {
  resolveTerminalShellRuntimeClientKind,
  type TerminalShellMode,
  type TerminalShellPendingRuntimeInput,
  type TerminalShellRuntimeBootstrap,
  type TerminalShellRuntimeBootstrapRequest,
} from "./model.ts";
import type { SharedRuntimeClient } from "./terminal-stage-shared.ts";

export const DESKTOP_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT = 1;
export const DESKTOP_RUNTIME_BOOTSTRAP_RETRY_DELAY_MS = 220;

interface RuntimeInteractiveSessionSnapshotLike {
  sessionId: string;
  attachmentId?: string | null;
  cursor?: string | null;
  workingDirectory: string;
  invokedProgram: string;
}

interface DesktopRuntimeClientLike extends SharedRuntimeClient {
  createConnectorInteractiveSession: (
    request: Extract<TerminalShellRuntimeBootstrapRequest, { kind: "connector" }>["request"],
  ) => Promise<RuntimeInteractiveSessionSnapshotLike>;
  createLocalProcessSession: (
    request: Extract<TerminalShellRuntimeBootstrapRequest, { kind: "local-process" }>["request"],
  ) => Promise<RuntimeInteractiveSessionSnapshotLike>;
  createLocalShellSession: (
    request: Extract<TerminalShellRuntimeBootstrapRequest, { kind: "local-shell" }>["request"],
  ) => Promise<RuntimeInteractiveSessionSnapshotLike>;
}

interface WebRuntimeClientLike extends SharedRuntimeClient {
  createRemoteRuntimeSession: (
    request: Extract<TerminalShellRuntimeBootstrapRequest, { kind: "remote-runtime" }>["request"],
  ) => Promise<RuntimeInteractiveSessionSnapshotLike>;
}

export interface RuntimeClientResolverArgs {
  mode: TerminalShellMode;
  runtimeBootstrap: TerminalShellRuntimeBootstrap;
  desktopRuntimeClient?: DesktopRuntimeClientLike | null;
  webRuntimeClient?: WebRuntimeClientLike | null;
}

export function resolveRuntimeUnavailableMessage(args: {
  mode: TerminalShellMode;
  kind: TerminalShellRuntimeBootstrap["kind"] | TerminalShellRuntimeBootstrapRequest["kind"];
}) {
  if (args.kind === "remote-runtime") {
    return args.mode === "web"
      ? "web remote runtime client is unavailable"
      : "remote runtime tabs are only supported in web mode";
  }

  if (args.kind === "connector") {
    return "desktop connector runtime client is unavailable";
  }

  if (args.kind === "local-process") {
    return "desktop local process runtime client is unavailable";
  }

  return "desktop shell runtime client is unavailable";
}

export function resolveTabRuntimeClient(
  args: RuntimeClientResolverArgs,
): SharedRuntimeClient | null {
  const runtimeClientKind = resolveTerminalShellRuntimeClientKind({
    mode: args.mode,
    runtimeBootstrap: args.runtimeBootstrap,
  });

  if (runtimeClientKind === "desktop") {
    return args.desktopRuntimeClient ?? null;
  }

  if (runtimeClientKind === "web") {
    return args.webRuntimeClient ?? null;
  }

  return null;
}

export function isRuntimeCapableTab(args: RuntimeClientResolverArgs) {
  return Boolean(resolveTabRuntimeClient(args));
}

export type RuntimeBootstrapRequestResolution =
  | {
      kind: "request";
      request: Promise<RuntimeInteractiveSessionSnapshotLike>;
    }
  | {
      kind: "error";
      message: string;
    };

export function createRuntimeBootstrapRequest(args: {
  mode: TerminalShellMode;
  request: TerminalShellRuntimeBootstrapRequest;
  desktopRuntimeClient?: DesktopRuntimeClientLike | null;
  webRuntimeClient?: WebRuntimeClientLike | null;
}): RuntimeBootstrapRequestResolution {
  if (args.request.kind === "connector") {
    if (!args.desktopRuntimeClient) {
      return {
        kind: "error",
        message: resolveRuntimeUnavailableMessage({
          mode: args.mode,
          kind: args.request.kind,
        }),
      };
    }

    return {
      kind: "request",
      request: args.desktopRuntimeClient.createConnectorInteractiveSession(
        args.request.request,
      ),
    };
  }

  if (args.request.kind === "local-process") {
    if (!args.desktopRuntimeClient) {
      return {
        kind: "error",
        message: resolveRuntimeUnavailableMessage({
          mode: args.mode,
          kind: args.request.kind,
        }),
      };
    }

    return {
      kind: "request",
      request: args.desktopRuntimeClient.createLocalProcessSession(
        args.request.request,
      ),
    };
  }

  if (args.request.kind === "remote-runtime") {
    if (!args.webRuntimeClient) {
      return {
        kind: "error",
        message: resolveRuntimeUnavailableMessage({
          mode: args.mode,
          kind: args.request.kind,
        }),
      };
    }

    return {
      kind: "request",
      request: args.webRuntimeClient.createRemoteRuntimeSession(
        args.request.request,
      ),
    };
  }

  if (!args.desktopRuntimeClient) {
    return {
      kind: "error",
      message: resolveRuntimeUnavailableMessage({
        mode: args.mode,
        kind: args.request.kind,
      }),
    };
  }

  return {
    kind: "request",
    request: args.desktopRuntimeClient.createLocalShellSession(
      args.request.request,
    ),
  };
}

export async function writeRuntimeInput(
  client: SharedRuntimeClient,
  sessionId: string,
  input: TerminalShellPendingRuntimeInput,
) {
  if (input.kind === "binary") {
    await client.writeSessionInputBytes({
      sessionId,
      inputBytes: input.inputBytes,
    });
    return;
  }

  await client.writeSessionInput({
    sessionId,
    input: input.data,
  });
}
