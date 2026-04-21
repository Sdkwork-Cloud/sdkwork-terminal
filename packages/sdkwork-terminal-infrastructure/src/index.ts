import {
  API_SURFACES,
  CONTRACT_VERSION,
  buildRuntimeContractSnapshot,
  getSurfaceDescriptor,
  getSurfacePrefix,
} from "@sdkwork/terminal-contracts";
import {
  appendTerminalInput,
  appendTerminalOutput,
  copyTerminalSelection,
  createTerminalCoreState,
  getTerminalSnapshot,
  resizeTerminalViewport,
  searchTerminal,
  selectTerminalRange,
  type CreateTerminalCoreOptions,
  type TerminalCoreState,
  type TerminalSelectionRange,
  type TerminalSnapshot,
  type TerminalViewport,
} from "@sdkwork/terminal-core";
import {
  extractErrorMessage,
  isIgnorableTauriCallbackLifecycleErrorMessage,
} from "@sdkwork/terminal-commons";
import type {
  ConnectorSessionLaunchRequest,
  ExecutionTargetDescriptor,
  ProtocolSurfaceName,
  RemoteRuntimeSessionCreateRequest,
  RuntimeMode,
  RuntimeStreamEventType,
  SessionAttachmentDescriptor,
  SessionDescriptor,
  SessionState,
} from "@sdkwork/terminal-types";

type RoutableSurface = Exclude<ProtocolSurfaceName, "desktopBridge" | "localRuntime">;
export type DesktopDaemonPhase =
  | "stopped"
  | "starting"
  | "running"
  | "reconnecting"
  | "failed";

export interface DesktopRuntimeBridgeDescriptor {
  mode: "desktop";
  contractVersion: typeof CONTRACT_VERSION;
  controlPlane: {
    kind: "tauri-ipc";
    namespace: string;
  };
  dataPlane: {
    kind: "local-runtime-channel";
    namespace: string;
  };
}

export interface WebRuntimeBridgeDescriptor {
  mode: "web";
  contractVersion: typeof CONTRACT_VERSION;
  controlPlane: {
    kind: "http";
    prefix: string;
  };
  dataPlane: {
    kind: "stream";
    prefix: string;
  };
}

export type RuntimeBridgeDescriptor =
  | DesktopRuntimeBridgeDescriptor
  | WebRuntimeBridgeDescriptor;

export interface DesktopHostStatusSnapshot {
  hostLabel: string;
  contractVersion: typeof CONTRACT_VERSION;
  controlPlaneKind: "tauri-ipc";
  controlPlaneNamespace: string;
  dataPlaneKind: "local-runtime-channel";
  dataPlaneNamespace: string;
}

export interface DesktopDaemonHealthSnapshot {
  phase: DesktopDaemonPhase;
  healthy: boolean;
  startCount: number;
  reconnectCount: number;
  stopCount: number;
  lastError: string | null;
  runtimeSummary: string;
  observabilitySummary: string;
}

export interface DesktopRuntimeBridgeStatus {
  ready: boolean;
  state: "ready" | "degraded";
  reason: string;
  checkedAt: string;
  controlPlaneNamespace: string;
  dataPlaneNamespace: string;
}

export interface DesktopRuntimeReadiness {
  mode: "desktop";
  contractVersion: typeof CONTRACT_VERSION;
  host: DesktopHostStatusSnapshot;
  daemon: DesktopDaemonHealthSnapshot;
  bridge: DesktopRuntimeBridgeStatus;
}

export type DesktopReplayEntryKind =
  | "output"
  | "marker"
  | "state"
  | "warning"
  | "exit";

export interface DesktopReplayEntrySnapshot {
  sequence: number;
  kind: DesktopReplayEntryKind;
  payload: string;
  occurredAt: string;
}

export interface DesktopConnectorLaunchSnapshot {
  sessionId: string;
  workspaceId: string;
  target: string;
  state: SessionState;
  createdAt: string;
  lastActiveAt: string;
  modeTags: string[];
  tags: string[];
  replayEntry: DesktopReplayEntrySnapshot;
}

export interface DesktopConnectorInteractiveSessionCreateRequest
  extends ConnectorSessionLaunchRequest {
  cols?: number;
  rows?: number;
}

export interface DesktopConnectorInteractiveSessionCreateSnapshot {
  sessionId: string;
  workspaceId: string;
  target: string;
  state: SessionState;
  createdAt: string;
  lastActiveAt: string;
  modeTags: string[];
  tags: string[];
  attachmentId: string;
  cursor: string;
  lastAckSequence: number;
  writable: boolean;
  authority: string;
  invokedProgram: string;
  invokedArgs: string[];
  workingDirectory: string;
  replayEntry: DesktopReplayEntrySnapshot;
}

export interface DesktopConnectorExecSnapshot {
  sessionId: string;
  workspaceId: string;
  target: string;
  state: SessionState;
  createdAt: string;
  lastActiveAt: string;
  modeTags: string[];
  tags: string[];
  exitCode: number | null;
  replayEntries: DesktopReplayEntrySnapshot[];
}

export interface DesktopSessionIndexSnapshot {
  sessions: SessionDescriptor[];
  attachments: SessionAttachmentDescriptor[];
}

export interface DesktopSessionReplayRequest {
  fromCursor?: string;
  limit?: number;
}

export interface DesktopSessionReplaySnapshot {
  sessionId: string;
  fromCursor: string | null;
  nextCursor: string;
  hasMore: boolean;
  entries: DesktopReplayEntrySnapshot[];
}

export interface DesktopSessionAttachRequest {
  sessionId: string;
}

export interface DesktopSessionDetachRequest {
  attachmentId: string;
}

export interface DesktopSessionAttachmentSnapshot {
  session: SessionDescriptor;
  attachment: SessionAttachmentDescriptor;
}

export interface DesktopLocalShellExecutionRequest {
  profile: string;
  commandText: string;
  workingDirectory?: string;
}

export interface DesktopLocalShellExecutionResult {
  profile: string;
  commandText: string;
  workingDirectory: string;
  invokedProgram: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface DesktopLocalShellSessionCreateRequest {
  profile: string;
  workingDirectory?: string;
  cols?: number;
  rows?: number;
  title?: string | null;
  profileId?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
}

export interface DesktopLocalShellSessionCreateSnapshot {
  sessionId: string;
  workspaceId: string;
  target: SessionDescriptor["target"];
  state: SessionState;
  createdAt: string;
  lastActiveAt: string;
  modeTags: string[];
  tags: string[];
  attachmentId: string;
  cursor: string;
  lastAckSequence: number;
  writable: boolean;
  profile: string;
  workingDirectory: string;
  invokedProgram: string;
}

export interface DesktopLocalProcessSessionCreateRequest {
  command: string[];
  workingDirectory?: string;
  cols?: number;
  rows?: number;
  title?: string | null;
  profileId?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
}

export interface DesktopLocalProcessSessionCreateSnapshot {
  sessionId: string;
  workspaceId: string;
  target: SessionDescriptor["target"];
  state: SessionState;
  createdAt: string;
  lastActiveAt: string;
  modeTags: string[];
  tags: string[];
  attachmentId: string;
  cursor: string;
  lastAckSequence: number;
  writable: boolean;
  workingDirectory: string;
  invokedProgram: string;
  invokedArgs: string[];
}

export interface DesktopWorkingDirectoryPickerRequest {
  defaultPath?: string | null;
  title?: string;
}

export interface DesktopTerminalSessionInventorySnapshot {
  sessionId: string;
  title: string;
  profileId: string;
  cwd: string;
  updatedAt: string;
  workspaceId: string;
  projectId: string;
  status: string;
  lastExitCode: number | null;
}

export interface DesktopSessionInputRequest {
  sessionId: string;
  input: string;
}

export interface DesktopSessionInputBytesRequest {
  sessionId: string;
  inputBytes: number[];
}

export interface DesktopSessionAttachmentAcknowledgeRequest {
  attachmentId: string;
  sequence: number;
}

export interface DesktopSessionInputSnapshot {
  sessionId: string;
  acceptedBytes: number;
}

export interface DesktopSessionResizeRequest {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface DesktopSessionResizeSnapshot {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface DesktopSessionTerminateSnapshot {
  sessionId: string;
  state: SessionState;
}

export type DesktopSessionStreamEventType = Extract<
  RuntimeStreamEventType,
  "session.output" | "session.warning" | "session.exit"
>;

export interface DesktopSessionStreamEvent {
  sessionId: string;
  nextCursor: string;
  entry: DesktopReplayEntrySnapshot & {
    kind: Extract<DesktopReplayEntryKind, "output" | "warning" | "exit">;
  };
}

export type RuntimeInteractiveSessionCreateSnapshot =
  DesktopConnectorInteractiveSessionCreateSnapshot;
export type RuntimeSessionIndexSnapshot = DesktopSessionIndexSnapshot;
export type RuntimeSessionReplayRequest = DesktopSessionReplayRequest;
export type RuntimeSessionReplaySnapshot = DesktopSessionReplaySnapshot;
export type RuntimeSessionInputRequest = DesktopSessionInputRequest;
export type RuntimeSessionInputBytesRequest = DesktopSessionInputBytesRequest;
export type RuntimeSessionInputSnapshot = DesktopSessionInputSnapshot;
export type RuntimeSessionResizeRequest = DesktopSessionResizeRequest;
export type RuntimeSessionResizeSnapshot = DesktopSessionResizeSnapshot;
export type RuntimeSessionTerminateSnapshot = DesktopSessionTerminateSnapshot;
export type RuntimeSessionStreamEventType = DesktopSessionStreamEventType;
export type RuntimeSessionStreamEvent = DesktopSessionStreamEvent;

export type DesktopLocalShellSessionInputRequest = DesktopSessionInputRequest;
export type DesktopLocalShellSessionInputBytesRequest = DesktopSessionInputBytesRequest;
export type DesktopLocalShellSessionInputSnapshot = DesktopSessionInputSnapshot;
export type DesktopLocalShellSessionResizeRequest = DesktopSessionResizeRequest;
export type DesktopLocalShellSessionResizeSnapshot = DesktopSessionResizeSnapshot;
export type DesktopLocalShellSessionTerminateSnapshot = DesktopSessionTerminateSnapshot;
export type DesktopLocalShellSessionStreamEventType = DesktopSessionStreamEventType;
export type DesktopLocalShellSessionStreamEvent = DesktopSessionStreamEvent;

export type DesktopInvoke = <T>(
  command: string,
  args?: Record<string, unknown>,
) => Promise<T>;

export interface DesktopListenEvent<T> {
  payload: T;
}

export type DesktopUnlisten = () => void | Promise<void>;

export type DesktopListen = <T>(
  event: string,
  listener: (event: DesktopListenEvent<T>) => void,
) => Promise<DesktopUnlisten>;

export interface WebFetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
}

export type WebFetch = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<WebFetchResponse>;

export interface WebEventSourceMessage {
  data: string;
}

export interface WebEventSourceLike {
  addEventListener: (
    event: string,
    listener: (event: WebEventSourceMessage) => void,
  ) => void;
  close: () => void;
}

export type WebEventSourceFactory = (input: string) => WebEventSourceLike;

export interface DesktopRuntimeBridgeClient {
  hostStatus: () => Promise<DesktopHostStatusSnapshot>;
  daemonHealth: () => Promise<DesktopDaemonHealthSnapshot>;
  startDaemon: () => Promise<DesktopDaemonHealthSnapshot>;
  stopDaemon: () => Promise<DesktopDaemonHealthSnapshot>;
  reconnectDaemon: () => Promise<DesktopDaemonHealthSnapshot>;
  readClipboardText: () => Promise<string>;
  writeClipboardText: (text: string) => Promise<void>;
  executionTargets: () => Promise<ExecutionTargetDescriptor[]>;
  sessionIndex: () => Promise<DesktopSessionIndexSnapshot>;
  sessionReplay: (
    sessionId: string,
    request?: DesktopSessionReplayRequest,
  ) => Promise<DesktopSessionReplaySnapshot>;
  attachSession: (
    request: DesktopSessionAttachRequest,
  ) => Promise<DesktopSessionAttachmentSnapshot>;
  detachSessionAttachment: (
    request: DesktopSessionDetachRequest,
  ) => Promise<SessionDescriptor>;
  reattachSession: (
    request: DesktopSessionAttachRequest,
  ) => Promise<DesktopSessionAttachmentSnapshot>;
  launchConnectorSession: (
    request: ConnectorSessionLaunchRequest,
  ) => Promise<DesktopConnectorLaunchSnapshot>;
  createConnectorInteractiveSession: (
    request: DesktopConnectorInteractiveSessionCreateRequest,
  ) => Promise<DesktopConnectorInteractiveSessionCreateSnapshot>;
  probeConnectorExecSession: (
    request: ConnectorSessionLaunchRequest,
  ) => Promise<DesktopConnectorExecSnapshot>;
  executeLocalShellCommand: (
    request: DesktopLocalShellExecutionRequest,
  ) => Promise<DesktopLocalShellExecutionResult>;
  createLocalShellSession: (
    request: DesktopLocalShellSessionCreateRequest,
  ) => Promise<DesktopLocalShellSessionCreateSnapshot>;
  createLocalProcessSession: (
    request: DesktopLocalProcessSessionCreateRequest,
  ) => Promise<DesktopLocalProcessSessionCreateSnapshot>;
  terminalSessionInventory: () => Promise<DesktopTerminalSessionInventorySnapshot[]>;
  pickWorkingDirectory: (
    request: DesktopWorkingDirectoryPickerRequest,
  ) => Promise<string | null>;
  writeSessionInput: (
    request: DesktopSessionInputRequest,
  ) => Promise<DesktopSessionInputSnapshot>;
  writeSessionInputBytes: (
    request: DesktopSessionInputBytesRequest,
  ) => Promise<DesktopSessionInputSnapshot>;
  resizeSession: (
    request: DesktopSessionResizeRequest,
  ) => Promise<DesktopSessionResizeSnapshot>;
  terminateSession: (
    sessionId: string,
  ) => Promise<DesktopSessionTerminateSnapshot>;
  subscribeSessionEvents?: (
    sessionId: string,
    listener: (event: DesktopSessionStreamEvent) => void,
  ) => Promise<DesktopUnlisten>;
  writeLocalShellInput: (
    request: DesktopSessionInputRequest,
  ) => Promise<DesktopSessionInputSnapshot>;
  writeLocalShellInputBytes: (
    request: DesktopSessionInputBytesRequest,
  ) => Promise<DesktopSessionInputSnapshot>;
  acknowledgeSessionAttachment: (
    request: DesktopSessionAttachmentAcknowledgeRequest,
  ) => Promise<SessionAttachmentDescriptor>;
  resizeLocalShellSession: (
    request: DesktopSessionResizeRequest,
  ) => Promise<DesktopSessionResizeSnapshot>;
  terminateLocalShellSession: (
    sessionId: string,
  ) => Promise<DesktopSessionTerminateSnapshot>;
  subscribeLocalShellSessionEvents?: (
    sessionId: string,
    listener: (event: DesktopSessionStreamEvent) => void,
  ) => Promise<DesktopUnlisten>;
}

export interface WebRuntimeBridgeClient {
  sessionIndex: () => Promise<RuntimeSessionIndexSnapshot>;
  createRemoteRuntimeSession: (
    request: RemoteRuntimeSessionCreateRequest,
  ) => Promise<RuntimeInteractiveSessionCreateSnapshot>;
  sessionReplay: (
    sessionId: string,
    request?: RuntimeSessionReplayRequest,
  ) => Promise<RuntimeSessionReplaySnapshot>;
  writeSessionInput: (
    request: RuntimeSessionInputRequest,
  ) => Promise<RuntimeSessionInputSnapshot>;
  writeSessionInputBytes: (
    request: RuntimeSessionInputBytesRequest,
  ) => Promise<RuntimeSessionInputSnapshot>;
  resizeSession: (
    request: RuntimeSessionResizeRequest,
  ) => Promise<RuntimeSessionResizeSnapshot>;
  terminateSession: (
    sessionId: string,
  ) => Promise<RuntimeSessionTerminateSnapshot>;
  subscribeSessionEvents?: (
    sessionId: string,
    listener: (event: RuntimeSessionStreamEvent) => void,
  ) => Promise<DesktopUnlisten>;
}

export interface TerminalViewAdapter {
  kind: "terminal-view-adapter";
  getSnapshot: () => TerminalSnapshot;
  writeOutput: (chunk: string) => TerminalSnapshot;
  writeInput: (input: string) => TerminalSnapshot;
  resize: (viewport: TerminalViewport) => TerminalSnapshot;
  search: (query: string) => TerminalSnapshot;
  select: (selection: TerminalSelectionRange) => TerminalSnapshot;
  copySelection: () => string;
}

export type TerminalViewportInput =
  | {
      kind: "text";
      data: string;
    }
  | {
      kind: "binary";
      data: string;
      inputBytes: number[];
    };

export interface TerminalViewportRuntimeState {
  activeBufferType: "normal" | "alternate" | "unknown";
  mouseTrackingMode: "none" | "x10" | "vt200" | "drag" | "any" | "unknown";
}

export interface TerminalViewportWheelInputResolution {
  sequence: string;
  wheelAccumulator: number;
}

const TERMINAL_WHEEL_DELTA_PIXEL = 0;
const TERMINAL_WHEEL_DELTA_LINE = 1;
const TERMINAL_WHEEL_DELTA_PAGE = 2;
const TERMINAL_WHEEL_PIXELS_PER_LINE = 40;
const TERMINAL_ALTERNATE_BUFFER_WHEEL_SCROLL_SPEED = 3;
const TERMINAL_ALTERNATE_BUFFER_WHEEL_MAX_STEPS = 48;

export function shouldUseAlternateBufferWheelInput(
  runtimeState: TerminalViewportRuntimeState,
) {
  return (
    runtimeState.activeBufferType === "alternate" &&
    runtimeState.mouseTrackingMode === "none"
  );
}

export function normalizeTerminalWheelDeltaToLines(args: {
  deltaY: number;
  deltaMode: number;
  viewportRows: number;
}) {
  if (!Number.isFinite(args.deltaY) || args.deltaY === 0) {
    return 0;
  }

  if (args.deltaMode === TERMINAL_WHEEL_DELTA_LINE) {
    return args.deltaY;
  }

  if (args.deltaMode === TERMINAL_WHEEL_DELTA_PAGE) {
    return args.deltaY * Math.max(args.viewportRows, 1);
  }

  if (args.deltaMode === TERMINAL_WHEEL_DELTA_PIXEL) {
    return args.deltaY / TERMINAL_WHEEL_PIXELS_PER_LINE;
  }

  return args.deltaY;
}

export function resolveAlternateBufferWheelInput(args: {
  runtimeState: TerminalViewportRuntimeState;
  deltaY: number;
  deltaMode: number;
  viewportRows: number;
  wheelAccumulator: number;
  scrollSpeed?: number;
  maxStepCount?: number;
}): TerminalViewportWheelInputResolution {
  if (!shouldUseAlternateBufferWheelInput(args.runtimeState)) {
    return {
      sequence: "",
      wheelAccumulator: 0,
    };
  }

  const normalizedLineDelta = normalizeTerminalWheelDeltaToLines({
    deltaY: args.deltaY,
    deltaMode: args.deltaMode,
    viewportRows: args.viewportRows,
  });
  const nextAccumulator = args.wheelAccumulator + normalizedLineDelta;
  if (Math.abs(nextAccumulator) < 1) {
    return {
      sequence: "",
      wheelAccumulator: nextAccumulator,
    };
  }

  const wholeLineDelta =
    nextAccumulator > 0 ? Math.floor(nextAccumulator) : Math.ceil(nextAccumulator);
  const scrollSpeed = Math.max(
    1,
    Math.floor(args.scrollSpeed ?? TERMINAL_ALTERNATE_BUFFER_WHEEL_SCROLL_SPEED),
  );
  const maxStepCount = Math.max(
    scrollSpeed,
    Math.floor(args.maxStepCount ?? TERMINAL_ALTERNATE_BUFFER_WHEEL_MAX_STEPS),
  );
  const stepCount = Math.max(
    1,
    Math.min(Math.abs(wholeLineDelta) * scrollSpeed, maxStepCount),
  );

  return {
    sequence: (wholeLineDelta < 0 ? "\u001b[A" : "\u001b[B").repeat(stepCount),
    wheelAccumulator: nextAccumulator - wholeLineDelta,
  };
}

export interface XtermViewportDriver {
  kind: "xterm-view-adapter";
  attach: (container: HTMLElement) => Promise<void>;
  render: (snapshot: TerminalSnapshot) => Promise<void>;
  reset: () => Promise<void>;
  writeRaw: (content: string, reset?: boolean) => Promise<void>;
  search: (query: string) => Promise<void>;
  getSelection: () => Promise<string>;
  selectAll: () => Promise<void>;
  paste: (text: string) => Promise<void>;
  setInputListener: (
    listener: ((input: TerminalViewportInput) => void) | null,
  ) => Promise<void>;
  setTitleListener: (
    listener: ((title: string) => void) | null,
  ) => Promise<void>;
  setRuntimeMode: (enabled: boolean) => void;
  measureViewport: () => Promise<TerminalViewport | null>;
  focus: () => Promise<void>;
  dispose: () => void;
  setFontSize: (size: number) => void;
  setDisableStdin: (disabled: boolean) => void;
  setCursorVisible: (visible: boolean) => void;
  getRuntimeState: () => Promise<TerminalViewportRuntimeState>;
}

export interface TerminalViewportRenderPlan {
  viewport: TerminalViewport;
  content: string;
  searchQuery: string;
  shouldResize: boolean;
  shouldRefresh: boolean;
  shouldSearch: boolean;
}

export function createSurfacePath(surface: RoutableSurface, resource: string) {
  return `${getSurfacePrefix(surface)}/${resource}`;
}

export function createRuntimeBridge(
  mode: "desktop",
): DesktopRuntimeBridgeDescriptor;
export function createRuntimeBridge(
  mode: "web",
): WebRuntimeBridgeDescriptor;
export function createRuntimeBridge(
  mode: Extract<RuntimeMode, "desktop" | "web">,
): RuntimeBridgeDescriptor;
export function createRuntimeBridge(
  mode: Extract<RuntimeMode, "desktop" | "web">,
): RuntimeBridgeDescriptor {
  const snapshot = buildRuntimeContractSnapshot();

  if (mode === "desktop") {
    return {
      mode,
      contractVersion: snapshot.version,
      controlPlane: {
        kind: API_SURFACES.desktopBridge.kind,
        namespace: API_SURFACES.desktopBridge.namespace,
      },
      dataPlane: {
        kind: API_SURFACES.localRuntime.kind,
        namespace: API_SURFACES.localRuntime.namespace,
      },
    };
  }

  const publicApi = getSurfaceDescriptor("publicApi");
  const runtimeStream = getSurfaceDescriptor("runtimeStream");

  return {
    mode,
    contractVersion: snapshot.version,
    controlPlane: {
      kind: publicApi.kind,
      prefix: publicApi.prefix!,
    },
    dataPlane: {
      kind: runtimeStream.kind,
      prefix: runtimeStream.prefix!,
    },
  };
}

export function createDesktopRuntimeBridgeClient(
  invoke: DesktopInvoke,
  listen?: DesktopListen,
): DesktopRuntimeBridgeClient {
  const client: DesktopRuntimeBridgeClient = {
    hostStatus: () => invoke<DesktopHostStatusSnapshot>("desktop_host_status"),
    daemonHealth: () => invoke<DesktopDaemonHealthSnapshot>("desktop_daemon_health"),
    startDaemon: () => invoke<DesktopDaemonHealthSnapshot>("desktop_daemon_start"),
    stopDaemon: () => invoke<DesktopDaemonHealthSnapshot>("desktop_daemon_stop"),
    reconnectDaemon: () => invoke<DesktopDaemonHealthSnapshot>("desktop_daemon_reconnect"),
    readClipboardText: () => invoke<string>("desktop_clipboard_read_text"),
    writeClipboardText: (text) =>
      invoke<void>("desktop_clipboard_write_text", {
        text,
      }),
    executionTargets: () =>
      invoke<ExecutionTargetDescriptor[]>("desktop_execution_target_catalog"),
    sessionIndex: () => invoke<DesktopSessionIndexSnapshot>("desktop_session_index"),
    sessionReplay: (sessionId, request) =>
      invoke<DesktopSessionReplaySnapshot>("desktop_session_replay_slice", {
        sessionId,
        fromCursor: request?.fromCursor,
        limit: request?.limit,
      }),
    attachSession: (request) =>
      invoke<DesktopSessionAttachmentSnapshot>("desktop_session_attach", {
        request,
      }),
    detachSessionAttachment: (request) =>
      invoke<SessionDescriptor>("desktop_session_detach", {
        request,
      }),
    reattachSession: (request) =>
      invoke<DesktopSessionAttachmentSnapshot>("desktop_session_reattach", {
        request,
      }),
    launchConnectorSession: (request) =>
      invoke<DesktopConnectorLaunchSnapshot>("desktop_connector_launch", { request }),
    createConnectorInteractiveSession: (request) =>
      invoke<DesktopConnectorInteractiveSessionCreateSnapshot>(
        "desktop_connector_session_create",
        { request },
      ),
    probeConnectorExecSession: (request) =>
      invoke<DesktopConnectorExecSnapshot>("desktop_connector_exec_probe", { request }),
    executeLocalShellCommand: (request) =>
      invoke<DesktopLocalShellExecutionResult>("desktop_local_shell_exec", { request }),
    createLocalShellSession: (request) =>
      invoke<DesktopLocalShellSessionCreateSnapshot>("desktop_local_shell_session_create", {
        request,
      }),
    createLocalProcessSession: (request) =>
      invoke<DesktopLocalProcessSessionCreateSnapshot>("desktop_local_process_session_create", {
        request,
      }),
    terminalSessionInventory: () =>
      invoke<DesktopTerminalSessionInventorySnapshot[]>(
        "desktop_terminal_session_inventory_list",
      ),
    pickWorkingDirectory: (request) =>
      invoke<string | null>("desktop_pick_working_directory", {
        request: {
          defaultPath: request.defaultPath ?? null,
          title: request.title ?? null,
        },
      }),
    writeSessionInput: (request) =>
      invoke<DesktopSessionInputSnapshot>("desktop_session_input", {
        request,
      }),
    writeSessionInputBytes: (request) =>
      invoke<DesktopSessionInputSnapshot>(
        "desktop_session_input_bytes",
        {
          request,
        },
      ),
    writeLocalShellInput: (request) =>
      invoke<DesktopSessionInputSnapshot>("desktop_session_input", {
        request,
      }),
    writeLocalShellInputBytes: (request) =>
      invoke<DesktopSessionInputSnapshot>("desktop_session_input_bytes", {
        request,
      }),
    acknowledgeSessionAttachment: (request) =>
      invoke<SessionAttachmentDescriptor>("desktop_session_attachment_acknowledge", {
        request,
      }),
    resizeSession: (request) =>
      invoke<DesktopSessionResizeSnapshot>("desktop_session_resize", {
        request,
      }),
    resizeLocalShellSession: (request) =>
      invoke<DesktopSessionResizeSnapshot>("desktop_session_resize", {
        request,
      }),
    terminateSession: (sessionId) =>
      invoke<DesktopSessionTerminateSnapshot>("desktop_session_terminate", {
        sessionId,
      }),
    terminateLocalShellSession: (sessionId) =>
      invoke<DesktopSessionTerminateSnapshot>(
        "desktop_session_terminate",
        {
          sessionId,
        },
      ),
  };

  if (!listen) {
    return client;
  }

  client.subscribeSessionEvents = async (sessionId, listener) => {
    const eventTypes = [
      "session.output",
      "session.warning",
      "session.exit",
    ] as const satisfies readonly DesktopSessionStreamEventType[];
    const unlistens = await Promise.all(
      eventTypes.map((eventType) =>
        listen<DesktopSessionStreamEvent>(
          createLocalRuntimeEventName(eventType),
          (event) => {
            if (event.payload.sessionId !== sessionId) {
              return;
            }

            listener(event.payload);
          },
        ),
      ),
    );

    return async () => {
      const results = await Promise.allSettled(
        unlistens.map((unlisten) => unlisten()),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          continue;
        }

        const message = extractErrorMessage(result.reason);
        if (isIgnorableTauriCallbackLifecycleErrorMessage(message)) {
          continue;
        }

        throw result.reason;
      }
    };
  };
  client.subscribeLocalShellSessionEvents = client.subscribeSessionEvents;

  return client;
}

function resolveWebBridgePath(path: string, baseUrl?: string) {
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function readWebJsonResponse<T>(
  response: WebFetchResponse,
  requestLabel: string,
): Promise<T> {
  if (response.ok) {
    return await response.json() as T;
  }

  const details = typeof response.text === "function"
    ? await response.text()
    : `status ${response.status}`;
  throw new Error(`${requestLabel} failed: ${details}`);
}

function createWebJsonHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function buildRuntimeReplayRequestUrl(
  sessionId: string,
  request: RuntimeSessionReplayRequest | undefined,
  baseUrl?: string,
) {
  const params = new URLSearchParams();
  params.set("sessionId", sessionId);

  if (request?.fromCursor) {
    params.set("fromCursor", request.fromCursor);
  }

  if (typeof request?.limit === "number") {
    params.set("limit", String(request.limit));
  }

  return resolveWebBridgePath(
    `${createSurfacePath("publicApi", "replays")}?${params.toString()}`,
    baseUrl,
  );
}

function buildRuntimeSessionPath(sessionId: string, suffix: string, baseUrl?: string) {
  return resolveWebBridgePath(
    `${createSurfacePath("publicApi", "sessions")}/${encodeURIComponent(sessionId)}${suffix}`,
    baseUrl,
  );
}

export function createWebRuntimeBridgeClient(options: {
  baseUrl?: string;
  fetch?: WebFetch;
  createEventSource?: WebEventSourceFactory;
} = {}): WebRuntimeBridgeClient {
  const fetchImpl = options.fetch ?? (globalThis.fetch as WebFetch | undefined);

  function getFetch() {
    if (!fetchImpl) {
      throw new Error("web runtime bridge requires a fetch implementation");
    }

    return fetchImpl;
  }

  const createEventSource = options.createEventSource;
  const sessionsPath = resolveWebBridgePath(
    createSurfacePath("publicApi", "sessions"),
    options.baseUrl,
  );

  const client: WebRuntimeBridgeClient = {
    sessionIndex: async () =>
      readWebJsonResponse<RuntimeSessionIndexSnapshot>(
        await getFetch()(sessionsPath, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }),
        "session index",
      ),
    createRemoteRuntimeSession: async (request) =>
      readWebJsonResponse<RuntimeInteractiveSessionCreateSnapshot>(
        await getFetch()(sessionsPath, {
          method: "POST",
          headers: createWebJsonHeaders(),
          body: JSON.stringify(request),
        }),
        "remote runtime session create",
      ),
    sessionReplay: async (sessionId, request) =>
      readWebJsonResponse<RuntimeSessionReplaySnapshot>(
        await getFetch()(buildRuntimeReplayRequestUrl(sessionId, request, options.baseUrl), {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }),
        "session replay",
      ),
    writeSessionInput: async (request) =>
      readWebJsonResponse<RuntimeSessionInputSnapshot>(
        await getFetch()(buildRuntimeSessionPath(request.sessionId, "/input", options.baseUrl), {
          method: "POST",
          headers: createWebJsonHeaders(),
          body: JSON.stringify({
            input: request.input,
          }),
        }),
        "session input",
      ),
    writeSessionInputBytes: async (request) =>
      readWebJsonResponse<RuntimeSessionInputSnapshot>(
        await getFetch()(
          buildRuntimeSessionPath(request.sessionId, "/input-bytes", options.baseUrl),
          {
            method: "POST",
            headers: createWebJsonHeaders(),
            body: JSON.stringify({
              inputBytes: request.inputBytes,
            }),
          },
        ),
        "session input bytes",
      ),
    resizeSession: async (request) =>
      readWebJsonResponse<RuntimeSessionResizeSnapshot>(
        await getFetch()(buildRuntimeSessionPath(request.sessionId, "/resize", options.baseUrl), {
          method: "POST",
          headers: createWebJsonHeaders(),
          body: JSON.stringify({
            cols: request.cols,
            rows: request.rows,
          }),
        }),
        "session resize",
      ),
    terminateSession: async (sessionId) =>
      readWebJsonResponse<RuntimeSessionTerminateSnapshot>(
        await getFetch()(buildRuntimeSessionPath(sessionId, "/terminate", options.baseUrl), {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        }),
        "session terminate",
      ),
  };

  if (!createEventSource) {
    return client;
  }

  client.subscribeSessionEvents = async (sessionId, listener) => {
    const source = createEventSource(
      resolveWebBridgePath(
        `${createSurfacePath("runtimeStream", "attach")}?sessionId=${encodeURIComponent(sessionId)}`,
        options.baseUrl,
      ),
    );

    const eventTypes = [
      "session.output",
      "session.warning",
      "session.exit",
    ] as const satisfies readonly RuntimeSessionStreamEventType[];

    for (const eventType of eventTypes) {
      source.addEventListener(eventType, (event) => {
        const payload = JSON.parse(event.data) as RuntimeSessionStreamEvent;
        if (payload.sessionId !== sessionId) {
          return;
        }

        listener(payload);
      });
    }

    return async () => {
      source.close();
    };
  };

  return client;
}

function createLocalRuntimeEventName(eventType: RuntimeStreamEventType) {
  return [
    API_SURFACES.localRuntime.namespace,
    eventType,
  ].map((segment) => segment.split(".").join(":")).join(":");
}

export function createTerminalViewAdapter(
  options: CreateTerminalCoreOptions = {},
): TerminalViewAdapter {
  let state: TerminalCoreState = createTerminalCoreState(options);

  return {
    kind: "terminal-view-adapter",
    getSnapshot: () => getTerminalSnapshot(state),
    writeOutput: (chunk) => {
      state = appendTerminalOutput(state, chunk);
      return getTerminalSnapshot(state);
    },
    writeInput: (input) => {
      state = appendTerminalInput(state, input);
      return getTerminalSnapshot(state);
    },
    resize: (viewport) => {
      state = resizeTerminalViewport(state, viewport);
      return getTerminalSnapshot(state);
    },
    search: (query) => {
      state = searchTerminal(state, query);
      return getTerminalSnapshot(state);
    },
    select: (selection) => {
      state = selectTerminalRange(state, selection);
      return getTerminalSnapshot(state);
    },
    copySelection: () => copyTerminalSelection(state),
  };
}

function serializeTerminalViewportContent(snapshot: Pick<TerminalSnapshot, "lines">) {
  return snapshot.lines.map((line) => line.text).join("\r\n");
}

function cloneTerminalViewportSnapshot(
  snapshot: Pick<TerminalSnapshot, "lines" | "viewport" | "searchQuery">,
) {
  return {
    lines: snapshot.lines.map((line) => ({
      ...line,
    })),
    viewport: {
      cols: snapshot.viewport.cols,
      rows: snapshot.viewport.rows,
    },
    searchQuery: snapshot.searchQuery,
  };
}

function binaryStringToBytes(data: string) {
  return Array.from(data, (char) => char.charCodeAt(0) & 0xff);
}

export function createTerminalViewportRenderPlan(
  previous:
    | Pick<TerminalSnapshot, "lines" | "viewport" | "searchQuery">
    | null,
  next: Pick<TerminalSnapshot, "lines" | "viewport" | "searchQuery">,
): TerminalViewportRenderPlan {
  const previousContent = previous ? serializeTerminalViewportContent(previous) : "";
  const nextContent = serializeTerminalViewportContent(next);
  const viewportChanged =
    !previous ||
    previous.viewport.cols !== next.viewport.cols ||
    previous.viewport.rows !== next.viewport.rows;
  const contentChanged = !previous || previousContent !== nextContent;
  const clearedSearch =
    Boolean(previous?.searchQuery) && next.searchQuery.trim().length === 0;
  const shouldRefresh = contentChanged || viewportChanged || clearedSearch;
  const shouldSearch =
    next.searchQuery.trim().length > 0 &&
    (!previous || previous.searchQuery !== next.searchQuery || shouldRefresh);

  return {
    viewport: {
      cols: next.viewport.cols,
      rows: next.viewport.rows,
    },
    content: shouldRefresh ? nextContent : "",
    searchQuery: next.searchQuery,
    shouldResize: viewportChanged,
    shouldRefresh,
    shouldSearch,
  };
}

interface XtermDisposable {
  dispose: () => void;
}

interface XtermLoadableAddon {}

interface XtermFitAddonLike extends XtermLoadableAddon {
  fit: () => void;
}

interface XtermSearchAddonLike extends XtermLoadableAddon {
  findNext: (
    query: string,
    options?: {
      incremental?: boolean;
    },
  ) => void;
  clearDecorations?: () => void;
}

interface XtermCanvasAddonLike extends XtermLoadableAddon {}

interface XtermUnicodeApi {
  activeVersion: string;
}

interface XtermTerminalOptions {
  fontSize: number;
  disableStdin: boolean;
  theme: Record<string, string>;
}

interface XtermTerminalLike {
  cols: number;
  rows: number;
  element?: HTMLElement | null;
  options: XtermTerminalOptions;
  unicode: XtermUnicodeApi;
  buffer?: {
    active?: {
      type?: "normal" | "alternate";
    };
  };
  modes?: {
    mouseTrackingMode?: "none" | "x10" | "vt200" | "drag" | "any";
  };
  open: (container: HTMLElement) => void;
  loadAddon: (addon: XtermLoadableAddon) => void;
  refresh: (start: number, end: number) => void;
  write: (content: string, callback?: () => void) => void;
  reset: () => void;
  resize: (cols: number, rows: number) => void;
  getSelection: () => string | undefined;
  selectAll: () => void;
  paste?: (text: string) => void;
  focus: () => void;
  dispose: () => void;
  onData: (listener: (data: string) => void) => XtermDisposable;
  onBinary: (listener: (data: string) => void) => XtermDisposable;
  onTitleChange: (listener: (title: string) => void) => XtermDisposable;
}

interface XtermTerminalConstructor {
  new (options: {
    cols: number;
    rows: number;
    convertEol: boolean;
    disableStdin: boolean;
    allowTransparency: boolean;
    cursorBlink: boolean;
    cursorStyle: "bar";
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    scrollback: number;
    allowProposedApi: boolean;
    theme: Record<string, string>;
  }): XtermTerminalLike;
}

interface XtermZeroArgumentConstructor<T> {
  new (): T;
}

function resolveInteropExport(
  moduleNamespace: Record<string, unknown>,
  exportName: string,
) {
  const visitedNamespaces = new Set<unknown>();
  const namespacesToInspect: unknown[] = [moduleNamespace];

  while (namespacesToInspect.length > 0) {
    const nextNamespace = namespacesToInspect.shift();
    if (
      !nextNamespace ||
      visitedNamespaces.has(nextNamespace) ||
      (typeof nextNamespace !== "object" && typeof nextNamespace !== "function")
    ) {
      continue;
    }

    visitedNamespaces.add(nextNamespace);

    const namespaceRecord = nextNamespace as Record<string, unknown>;
    const directExport = namespaceRecord[exportName];
    if (directExport !== undefined) {
      return directExport;
    }

    const defaultNamespace = namespaceRecord.default;
    if (
      defaultNamespace &&
      (typeof defaultNamespace === "object" || typeof defaultNamespace === "function")
    ) {
      namespacesToInspect.push(defaultNamespace);
    }
  }

  return undefined;
}

function resolveInteropConstructor<T>(
  moduleNamespace: Record<string, unknown>,
  exportName: string,
): T {
  const exportedValue = resolveInteropExport(moduleNamespace, exportName);
  if (typeof exportedValue !== "function") {
    const namespaceKeys = Object.keys(moduleNamespace).join(", ");
    throw new Error(
      `Failed to resolve ${exportName} from terminal runtime module namespace. Keys: ${namespaceKeys || "(none)"}.`,
    );
  }

  return exportedValue as T;
}

export function createXtermViewportDriver(): XtermViewportDriver {
  type Runtime = {
    terminal: XtermTerminalLike;
    fitAddon: XtermFitAddonLike;
    searchAddon: XtermSearchAddonLike;
    canvasAddon: XtermCanvasAddonLike | null;
    canvasRendererLoaded: boolean;
  };
  const baseTheme = {
    background: "#050607",
    foreground: "#d4d4d8",
    cursor: "#f5f5f5",
    cursorAccent: "#050607",
    selectionBackground: "rgba(115, 115, 115, 0.28)",
    selectionForeground: "#f5f5f5",
    black: "#15161e",
    red: "#f7768e",
    green: "#9ece6a",
    yellow: "#e0af68",
    blue: "#7aa2f7",
    magenta: "#bb9af7",
    cyan: "#7dcfff",
    white: "#a9b1d6",
    brightBlack: "#414868",
    brightRed: "#f7768e",
    brightGreen: "#9ece6a",
    brightYellow: "#e0af68",
    brightBlue: "#7aa2f7",
    brightMagenta: "#bb9af7",
    brightCyan: "#7dcfff",
    brightWhite: "#c0caf5",
  } as const;

  let runtime: Runtime | null = null;
  let runtimePromise: Promise<Runtime> | null = null;
  let container: HTMLElement | null = null;
  let opened = false;
  let inputListener: ((input: TerminalViewportInput) => void) | null = null;
  let titleListener: ((title: string) => void) | null = null;
  let inputDisposables: Array<{ dispose: () => void }> = [];
  let wheelListenerTarget: HTMLElement | null = null;
  let wheelListener: ((event: WheelEvent) => void) | null = null;
  let alternateBufferWheelAccumulator = 0;
  let lastRenderedSnapshot:
    | Pick<TerminalSnapshot, "lines" | "viewport" | "searchQuery">
    | null = null;
  let runtimeModeEnabled = false;
  let cursorVisible = true;
  let pendingTerminalMutation: Promise<void> = Promise.resolve();

  const resolveTheme = (visible: boolean) => ({
    ...baseTheme,
    cursor: visible ? baseTheme.cursor : "transparent",
    cursorAccent: visible ? baseTheme.cursorAccent : "transparent",
  });

  async function waitForNextAnimationFrame() {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
      return;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  function hasRenderableContainerSize(element: HTMLElement | null) {
    if (!element) {
      return false;
    }

    return element.offsetWidth >= 20 && element.offsetHeight >= 20;
  }

  async function waitForRenderableContainerSize() {
    const MAX_CONTAINER_LAYOUT_ATTEMPTS = 12;
    for (let attempt = 0; attempt < MAX_CONTAINER_LAYOUT_ATTEMPTS; attempt += 1) {
      if (hasRenderableContainerSize(container)) {
        return true;
      }

      await waitForNextAnimationFrame();
    }

    return hasRenderableContainerSize(container);
  }

  async function waitForDocumentFontsReady() {
    if (typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    try {
      await document.fonts.ready;
    } catch {
      // Font readiness should not block terminal startup forever.
    }
  }

  function fitViewportSafely(nextRuntime: Runtime) {
    try {
      nextRuntime.fitAddon.fit();
      return true;
    } catch {
      return false;
    }
  }

  function refreshViewportSafely(nextRuntime: Runtime) {
    try {
      nextRuntime.terminal.refresh(0, Math.max(Number(nextRuntime.terminal.rows ?? 0) - 1, 0));
      return true;
    } catch {
      return false;
    }
  }

  function hasRenderableTerminalSurface(nextRuntime: Runtime) {
    const screenElement = nextRuntime.terminal.element?.querySelector(".xterm-screen");
    if (!(screenElement instanceof HTMLElement)) {
      return false;
    }

    return screenElement.clientWidth >= 20 && screenElement.clientHeight >= 20;
  }

  async function measureRuntimeViewport(nextRuntime: Runtime) {
    if (!container) {
      return null;
    }

    const MAX_VIEWPORT_MEASURE_ATTEMPTS = 8;
    for (let attempt = 0; attempt < MAX_VIEWPORT_MEASURE_ATTEMPTS; attempt += 1) {
      await waitForNextAnimationFrame();

      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      if (containerWidth < 20 || containerHeight < 20) {
        continue;
      }

      if (!fitViewportSafely(nextRuntime)) {
        continue;
      }
      refreshViewportSafely(nextRuntime);
      const cols = Number(nextRuntime.terminal.cols ?? 0);
      const rows = Number(nextRuntime.terminal.rows ?? 0);
      if (cols < 2 || rows < 1) {
        continue;
      }

      if (!hasRenderableTerminalSurface(nextRuntime)) {
        continue;
      }

      return {
        cols,
        rows,
      };
    }

    return null;
  }

  function reactivateUnicode(rt: Runtime) {
    try {
      rt.terminal.unicode.activeVersion = "11";
    } catch {
      // Unicode addon may not be loaded yet
    }
  }

  function activateCanvasRenderer(nextRuntime: Runtime) {
    if (nextRuntime.canvasRendererLoaded || !nextRuntime.canvasAddon) {
      return;
    }

    try {
      nextRuntime.terminal.loadAddon(nextRuntime.canvasAddon);
      nextRuntime.canvasRendererLoaded = true;
    } catch {
      nextRuntime.canvasAddon = null;
    }
  }

  async function ensureRuntime(): Promise<Runtime> {
    if (runtime) {
      return runtime;
    }

    if (!runtimePromise) {
      runtimePromise = Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-canvas").catch(() => null),
        import("@xterm/addon-fit"),
        import("@xterm/addon-search"),
        import("@xterm/addon-unicode11"),
      ]).then(([xtermModule, canvasModule, fitModule, searchModule, unicodeModule]) => {
          const TerminalConstructor = resolveInteropConstructor<XtermTerminalConstructor>(
            xtermModule as Record<string, unknown>,
            "Terminal",
          );
          const FitAddonConstructor = resolveInteropConstructor<XtermZeroArgumentConstructor<XtermFitAddonLike>>(
            fitModule as Record<string, unknown>,
            "FitAddon",
          );
          const SearchAddonConstructor = resolveInteropConstructor<XtermZeroArgumentConstructor<XtermSearchAddonLike>>(
            searchModule as Record<string, unknown>,
            "SearchAddon",
          );
          const Unicode11AddonConstructor =
            resolveInteropConstructor<XtermZeroArgumentConstructor<XtermLoadableAddon>>(
              unicodeModule as Record<string, unknown>,
              "Unicode11Addon",
            );
          const CanvasAddonConstructor =
            canvasModule === null
              ? null
              : resolveInteropConstructor<XtermZeroArgumentConstructor<XtermCanvasAddonLike>>(
                  canvasModule as Record<string, unknown>,
                  "CanvasAddon",
                );

          const terminal = new TerminalConstructor({
            cols: 96,
            rows: 14,
            convertEol: false,
            disableStdin: false,
            allowTransparency: false,
            cursorBlink: true,
            cursorStyle: "bar",
            fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", \"JetBrains Mono\", \"Fira Code\", Consolas, \"Courier New\", monospace",
            fontSize: 14,
            lineHeight: 1.25,
            letterSpacing: 0.15,
            scrollback: 50000,
            allowProposedApi: true,
            theme: resolveTheme(cursorVisible),
          });
          const canvasAddon = CanvasAddonConstructor ? new CanvasAddonConstructor() : null;
          const fitAddon = new FitAddonConstructor();
          const searchAddon = new SearchAddonConstructor();
          const unicodeAddon = new Unicode11AddonConstructor();

          terminal.loadAddon(fitAddon);
          terminal.loadAddon(searchAddon);
          terminal.loadAddon(unicodeAddon);
          terminal.unicode.activeVersion = "11";

          return {
            terminal,
            fitAddon,
            searchAddon,
            canvasAddon,
            canvasRendererLoaded: false,
          };
        }) as Promise<Runtime>;
    }

    const resolvedRuntime = await runtimePromise;
    runtime = resolvedRuntime;

    return resolvedRuntime;
  }

  function bindInputDisposables(nextRuntime: Runtime) {
    if (inputDisposables.length > 0) {
      return;
    }

    inputDisposables = [
      nextRuntime.terminal.onData((data: string) => {
        inputListener?.({
          kind: "text",
          data,
        });
      }),
      nextRuntime.terminal.onBinary((data: string) => {
        inputListener?.({
          kind: "binary",
          data,
          inputBytes: binaryStringToBytes(data),
        });
      }),
      nextRuntime.terminal.onTitleChange((title: string) => {
        titleListener?.(title);
      }),
    ];
  }

  function enqueueTerminalMutation(operation: () => Promise<void>) {
    const queuedOperation = pendingTerminalMutation.catch(() => undefined).then(operation);
    pendingTerminalMutation = queuedOperation.catch(() => undefined);
    return queuedOperation;
  }

  async function writeTerminalContent(nextRuntime: Runtime, content: string) {
    if (content.length === 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      nextRuntime.terminal.write(content, () => {
        resolve();
      });
    });
  }

  function resolveRuntimeState(
    nextRuntime: Runtime | null,
  ): TerminalViewportRuntimeState {
    if (!nextRuntime) {
      return {
        activeBufferType: "unknown",
        mouseTrackingMode: "unknown",
      };
    }

    const activeBufferType = nextRuntime.terminal.buffer?.active?.type === "alternate"
      ? "alternate"
      : nextRuntime.terminal.buffer?.active?.type === "normal"
        ? "normal"
        : "unknown";
    const mouseTrackingMode = nextRuntime.terminal.modes?.mouseTrackingMode;

    return {
      activeBufferType,
      mouseTrackingMode:
        mouseTrackingMode === "none" ||
        mouseTrackingMode === "x10" ||
        mouseTrackingMode === "vt200" ||
        mouseTrackingMode === "drag" ||
        mouseTrackingMode === "any"
          ? mouseTrackingMode
          : "unknown",
    };
  }

  function clearAlternateBufferWheelAccumulator() {
    alternateBufferWheelAccumulator = 0;
  }

  function unbindViewportWheelBridge() {
    if (!wheelListenerTarget || !wheelListener) {
      return;
    }

    wheelListenerTarget.removeEventListener("wheel", wheelListener, {
      capture: true,
    });
    wheelListenerTarget = null;
    wheelListener = null;
    clearAlternateBufferWheelAccumulator();
  }

  function bindViewportWheelBridge(nextRuntime: Runtime) {
    const nextWheelListenerTarget = nextRuntime.terminal.element;
    if (!(nextWheelListenerTarget instanceof HTMLElement)) {
      return;
    }

    if (wheelListenerTarget === nextWheelListenerTarget && wheelListener) {
      return;
    }

    unbindViewportWheelBridge();

    wheelListener = (event: WheelEvent) => {
      if (
        !runtimeModeEnabled ||
        !inputListener ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        nextRuntime.terminal.options.disableStdin
      ) {
        clearAlternateBufferWheelAccumulator();
        return;
      }

      const resolution = resolveAlternateBufferWheelInput({
        runtimeState: resolveRuntimeState(nextRuntime),
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        viewportRows: Number(nextRuntime.terminal.rows ?? 0),
        wheelAccumulator: alternateBufferWheelAccumulator,
      });
      alternateBufferWheelAccumulator = resolution.wheelAccumulator;

      if (resolution.sequence.length === 0) {
        return;
      }

      event.preventDefault();
      nextRuntime.terminal.focus();
      inputListener({
        kind: "text",
        data: resolution.sequence,
      });
    };
    wheelListenerTarget = nextWheelListenerTarget;
    wheelListenerTarget.addEventListener("wheel", wheelListener, {
      passive: false,
      capture: true,
    });
  }

  return {
    kind: "xterm-view-adapter",
    async attach(nextContainer) {
      container = nextContainer;
      const nextRuntime = await ensureRuntime();

      if (!opened) {
        nextRuntime.terminal.open(nextContainer);
        activateCanvasRenderer(nextRuntime);
        await waitForRenderableContainerSize();
        await waitForDocumentFontsReady();
        await measureRuntimeViewport(nextRuntime);
        refreshViewportSafely(nextRuntime);
        bindInputDisposables(nextRuntime);
        bindViewportWheelBridge(nextRuntime);
        opened = true;
        return;
      }

      const terminalElement = nextRuntime.terminal.element;
      if (
        terminalElement instanceof HTMLElement &&
        terminalElement.parentElement !== nextContainer
      ) {
        nextContainer.replaceChildren(terminalElement);
      }

      activateCanvasRenderer(nextRuntime);
      await waitForRenderableContainerSize();
      await waitForDocumentFontsReady();
      await measureRuntimeViewport(nextRuntime);
      refreshViewportSafely(nextRuntime);
      bindInputDisposables(nextRuntime);
      bindViewportWheelBridge(nextRuntime);
    },
    async render(snapshot) {
      if (!container) {
        return;
      }

      const nextRuntime = await ensureRuntime();
      return enqueueTerminalMutation(async () => {
        if (!container || runtime !== nextRuntime) {
          return;
        }

        const renderPlan = createTerminalViewportRenderPlan(lastRenderedSnapshot, snapshot);

        if (renderPlan.shouldResize) {
          nextRuntime.terminal.resize(renderPlan.viewport.cols, renderPlan.viewport.rows);
        }

        if (renderPlan.shouldRefresh && !runtimeModeEnabled) {
          nextRuntime.terminal.reset();
          reactivateUnicode(nextRuntime);

          await writeTerminalContent(nextRuntime, renderPlan.content);
        }

        if (renderPlan.shouldSearch) {
          nextRuntime.searchAddon.findNext(renderPlan.searchQuery);
        }

        if (!runtimeModeEnabled) {
          lastRenderedSnapshot = cloneTerminalViewportSnapshot(snapshot);
        }
      });
    },
    async reset() {
      if (!container) {
        return;
      }

      const nextRuntime = await ensureRuntime();
      return enqueueTerminalMutation(async () => {
        if (!container || runtime !== nextRuntime) {
          return;
        }

        nextRuntime.terminal.reset();
        reactivateUnicode(nextRuntime);
        lastRenderedSnapshot = null;
      });
    },
    writeRaw: async (content, reset = false) => {
      if (!container) {
        return;
      }

      const nextRuntime = await ensureRuntime();
      return enqueueTerminalMutation(async () => {
        if (!container || runtime !== nextRuntime) {
          return;
        }

        if (reset) {
          nextRuntime.terminal.reset();
          reactivateUnicode(nextRuntime);
          lastRenderedSnapshot = null;
        }

        await writeTerminalContent(nextRuntime, content);
      });
    },
    search: async (query) => {
      if (!container) {
        return;
      }

      const nextRuntime = await ensureRuntime();
      const normalizedQuery = query.trim();

      if (normalizedQuery.length === 0) {
        nextRuntime.searchAddon.clearDecorations?.();
        return;
      }

      nextRuntime.searchAddon.findNext(query, {
        incremental: true,
      });
    },
    getSelection: async () => {
      if (!container) {
        return "";
      }

      const nextRuntime = await ensureRuntime();
      return nextRuntime.terminal.getSelection() ?? "";
    },
    selectAll: async () => {
      if (!container) {
        return;
      }

      const nextRuntime = await ensureRuntime();
      nextRuntime.terminal.selectAll();
    },
    paste: async (text) => {
      if (!container || text.length === 0) {
        return;
      }

      const nextRuntime = await ensureRuntime();
      if (typeof nextRuntime.terminal.paste === "function") {
        nextRuntime.terminal.paste(text);
        return;
      }

      inputListener?.({
        kind: "text",
        data: text,
      });
    },
    async setInputListener(listener) {
      inputListener = listener;
      if (!runtime && !opened) {
        return;
      }
      const nextRuntime = await ensureRuntime();
      if (opened) {
        bindInputDisposables(nextRuntime);
      }
    },
    async setTitleListener(listener) {
      titleListener = listener;
      if (!runtime && !opened) {
        return;
      }
      const nextRuntime = await ensureRuntime();
      if (opened) {
        bindInputDisposables(nextRuntime);
      }
    },
    setRuntimeMode(enabled) {
      runtimeModeEnabled = enabled;
      if (enabled) {
        lastRenderedSnapshot = null;
        clearAlternateBufferWheelAccumulator();
      }
    },
    async measureViewport() {
      if (!container) {
        return null;
      }

      const nextRuntime = await ensureRuntime();
      if (!opened) {
        return null;
      }

      return measureRuntimeViewport(nextRuntime);
    },
    async focus() {
      if (!container) {
        return;
      }

      const nextRuntime = await ensureRuntime();
      nextRuntime.terminal.focus();
    },
    dispose() {
      unbindViewportWheelBridge();
      for (const disposable of inputDisposables) {
        disposable.dispose();
      }
      inputDisposables = [];
      inputListener = null;
      titleListener = null;
      runtime?.terminal.dispose();
      runtime = null;
      runtimePromise = null;
      container = null;
      opened = false;
      lastRenderedSnapshot = null;
      runtimeModeEnabled = false;
      clearAlternateBufferWheelAccumulator();
      pendingTerminalMutation = Promise.resolve();
    },

    setFontSize(size: number) {
      if (runtime) {
        runtime.terminal.options.fontSize = size;
        fitViewportSafely(runtime);
        refreshViewportSafely(runtime);
      }
    },

    setDisableStdin(disabled: boolean) {
      if (runtime) {
        runtime.terminal.options.disableStdin = disabled;
      }
    },
    setCursorVisible(visible: boolean) {
      cursorVisible = visible;
      if (runtime) {
        runtime.terminal.options.theme = resolveTheme(visible);
        refreshViewportSafely(runtime);
      }
    },
    async getRuntimeState() {
      const nextRuntime = runtime ?? await ensureRuntime().catch(() => null);
      return resolveRuntimeState(nextRuntime);
    },
  };
}

export async function loadDesktopRuntimeReadiness(
  client: DesktopRuntimeBridgeClient,
): Promise<DesktopRuntimeReadiness> {
  const host = await client.hostStatus();
  const daemon = await client.daemonHealth();
  const descriptor = createRuntimeBridge("desktop");
  const ready =
    host.contractVersion === CONTRACT_VERSION &&
    daemon.healthy &&
    host.controlPlaneNamespace === descriptor.controlPlane.namespace &&
    host.dataPlaneNamespace === descriptor.dataPlane.namespace;

  return {
    mode: "desktop",
    contractVersion: CONTRACT_VERSION,
    host,
    daemon,
    bridge: {
      ready,
      state: ready ? "ready" : "degraded",
      reason: ready ? "desktop host and local daemon are connected" : "desktop host is not ready",
      checkedAt: new Date().toISOString(),
      controlPlaneNamespace: host.controlPlaneNamespace,
      dataPlaneNamespace: host.dataPlaneNamespace,
    },
  };
}
