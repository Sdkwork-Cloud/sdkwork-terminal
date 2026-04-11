export type RuntimeMode = "desktop" | "web" | "server";
export type ProtocolVersion = "v1";
export type ProtocolSurfaceName =
  | "desktopBridge"
  | "localRuntime"
  | "publicApi"
  | "manageApi"
  | "internalApi"
  | "runtimeStream";
export type ProtocolSurfaceKind =
  | "tauri-ipc"
  | "local-runtime-channel"
  | "http"
  | "stream";
export type LocalRuntimeTransport = "named-pipe" | "unix-domain-socket";
export type ProtocolEncoding = "json" | "binary-frame";
export type SessionState =
  | "Creating"
  | "Starting"
  | "Running"
  | "Detached"
  | "Reattaching"
  | "Replaying"
  | "Stopping"
  | "Exited"
  | "Failed";
export type ExecutionTargetKind =
  | "local-shell"
  | "ssh"
  | "docker-exec"
  | "kubernetes-exec"
  | "remote-runtime"
  | "server-runtime-node";
export type ConnectorSessionLaunchTarget =
  | "ssh"
  | "docker-exec"
  | "kubernetes-exec";
export type RemoteRuntimeSessionCreateTarget =
  | "remote-runtime"
  | "server-runtime-node";
export type ExecutionModeTag = "cli-native";
export type ConnectorHealthStatus = "ready" | "degraded" | "unavailable";
export type ConnectorTransport = "builtin" | "system-cli" | "remote-api";
export type RuntimeStreamEventType =
  | "session.state"
  | "session.output"
  | "session.marker"
  | "session.warning"
  | "session.exit"
  | "session.replay.ready"
  | "session.attach.lost";
export type ControlAction =
  | "session.create"
  | "session.attach"
  | "session.detach"
  | "session.input"
  | "session.resize"
  | "session.replay"
  | "session.terminate";

export interface ProtocolSurfaceDescriptor {
  kind: ProtocolSurfaceKind;
  namespace?: string;
  prefix?: string;
  transports?: readonly LocalRuntimeTransport[];
  controlEncoding?: ProtocolEncoding;
  dataEncoding?: ProtocolEncoding;
}

export interface RuntimeContractSnapshot {
  version: ProtocolVersion;
  surfaces: Record<ProtocolSurfaceName, ProtocolSurfaceDescriptor>;
  errorFields: readonly string[];
  runtimeStreamEvents: readonly RuntimeStreamEventType[];
  sessionStates: readonly SessionState[];
  executionTargets: readonly ExecutionTargetKind[];
  executionTargetDescriptorFields: readonly string[];
  connectorSessionLaunchRequestFields: readonly string[];
  executionModeTags: readonly ExecutionModeTag[];
  connectorHealthStatuses: readonly ConnectorHealthStatus[];
  connectorTransports: readonly ConnectorTransport[];
  controlActions: readonly ControlAction[];
  publicResources: readonly string[];
  manageResources: readonly string[];
  internalResources: readonly string[];
  sessionDescriptorFields: readonly string[];
  attachmentFields: readonly string[];
}

export interface ExecutionTargetConnectorDescriptor {
  connectorId: string;
  label: string;
  transport: ConnectorTransport;
  diagnosticsHint: string;
}

export interface ExecutionTargetHealthDescriptor {
  status: ConnectorHealthStatus;
  summary: string;
  lastCheckedAt: string;
}

export interface ExecutionTargetDescriptor {
  targetId: string;
  workspaceId: string;
  kind: ExecutionTargetKind;
  label: string;
  authority: string;
  connector: ExecutionTargetConnectorDescriptor;
  health: ExecutionTargetHealthDescriptor;
  sessionLaunchable: boolean;
  tags: string[];
}

export interface SessionCreateDraft {
  workspaceId: string;
  target: ExecutionTargetKind;
  modeTags: ExecutionModeTag[];
  tags: string[];
}

export interface ConnectorSessionLaunchRequest {
  workspaceId: string;
  target: ConnectorSessionLaunchTarget;
  authority: string;
  command: string[];
  modeTags: ExecutionModeTag[];
  tags: string[];
}

export interface RemoteRuntimeSessionCreateRequest {
  workspaceId: string;
  target: RemoteRuntimeSessionCreateTarget;
  authority: string;
  command: string[];
  workingDirectory?: string;
  cols?: number;
  rows?: number;
  modeTags: ExecutionModeTag[];
  tags: string[];
}

export interface SessionDescriptor {
  sessionId: string;
  workspaceId: string;
  target: ExecutionTargetKind;
  state: SessionState;
  createdAt: string;
  lastActiveAt: string;
  modeTags: ExecutionModeTag[];
  tags: string[];
}

export interface SessionAttachmentDescriptor {
  attachmentId: string;
  sessionId: string;
  cursor: string;
  lastAckSequence: number;
  writable: boolean;
}

export interface MetricItem {
  label: string;
  value: string;
}

export interface FeatureTile {
  id: string;
  title: string;
  summary: string;
}
