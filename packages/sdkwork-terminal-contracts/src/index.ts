import type {
  ConnectorHealthStatus,
  ConnectorTransport,
  ControlAction,
  ExecutionTargetDescriptor,
  ExecutionModeTag,
  ExecutionTargetKind,
  ProtocolSurfaceName,
  RuntimeContractSnapshot,
  RuntimeStreamEventType,
  SessionAttachmentDescriptor,
  SessionDescriptor,
  SessionState,
} from "@sdkwork/terminal-types";

export const CONTRACT_VERSION = "v1" as const;

export const CONTRACT_ERROR_FIELDS = [
  "code",
  "message",
  "traceId",
  "retryable",
  "details",
] as const;

export const SESSION_STATES = [
  "Creating",
  "Starting",
  "Running",
  "Detached",
  "Reattaching",
  "Replaying",
  "Stopping",
  "Exited",
  "Failed",
] as const satisfies readonly SessionState[];

export const EXECUTION_TARGET_KINDS = [
  "local-shell",
  "ssh",
  "docker-exec",
  "kubernetes-exec",
  "remote-runtime",
  "server-runtime-node",
] as const satisfies readonly ExecutionTargetKind[];

export const EXECUTION_TARGET_DESCRIPTOR_FIELDS = [
  "targetId",
  "workspaceId",
  "kind",
  "label",
  "authority",
  "connector",
  "health",
  "sessionLaunchable",
  "tags",
] as const satisfies readonly string[];

export const CONNECTOR_SESSION_LAUNCH_REQUEST_FIELDS = [
  "workspaceId",
  "target",
  "authority",
  "command",
  "modeTags",
  "tags",
] as const satisfies readonly string[];

export const EXECUTION_MODE_TAGS = [
  "cli-native",
] as const satisfies readonly ExecutionModeTag[];

export const CONNECTOR_HEALTH_STATUSES = [
  "ready",
  "degraded",
  "unavailable",
] as const satisfies readonly ConnectorHealthStatus[];

export const CONNECTOR_TRANSPORTS = [
  "builtin",
  "system-cli",
  "remote-api",
] as const satisfies readonly ConnectorTransport[];

export const RUNTIME_STREAM_EVENTS = [
  "session.state",
  "session.output",
  "session.marker",
  "session.warning",
  "session.exit",
  "session.replay.ready",
  "session.attach.lost",
] as const satisfies readonly RuntimeStreamEventType[];

export const CONTROL_ACTIONS = [
  "session.create",
  "session.attach",
  "session.detach",
  "session.input",
  "session.resize",
  "session.replay",
  "session.terminate",
] as const satisfies readonly ControlAction[];

export const PUBLIC_API_RESOURCES = [
  "workspaces",
  "resources",
  "profiles",
  "sessions",
  "replays",
  "settings",
  "diagnostics",
  "cli",
] as const;

export const MANAGE_API_RESOURCES = [
  "runtime-nodes",
  "policies",
  "audits",
  "releases",
  "system",
] as const;

export const INTERNAL_API_RESOURCES = [
  "nodes/hello",
  "nodes/heartbeat",
  "sessions/admit",
  "sessions/close",
  "desired-state/pull",
  "desired-state/ack",
] as const;

export const SESSION_DESCRIPTOR_FIELDS = [
  "sessionId",
  "workspaceId",
  "target",
  "state",
  "createdAt",
  "lastActiveAt",
  "modeTags",
  "tags",
] as const;

export const ATTACHMENT_FIELDS = [
  "attachmentId",
  "sessionId",
  "cursor",
  "lastAckSequence",
  "writable",
] as const;

export const API_SURFACES = {
  desktopBridge: {
    kind: "tauri-ipc",
    namespace: "sdkwork-terminal.desktop.v1",
  },
  localRuntime: {
    kind: "local-runtime-channel",
    namespace: "sdkwork-terminal.runtime.v1",
    transports: ["named-pipe", "unix-domain-socket"],
    controlEncoding: "json",
    dataEncoding: "binary-frame",
  },
  publicApi: {
    kind: "http",
    prefix: "/terminal/api/v1",
  },
  manageApi: {
    kind: "http",
    prefix: "/terminal/manage/v1",
  },
  internalApi: {
    kind: "http",
    prefix: "/terminal/internal/v1",
  },
  runtimeStream: {
    kind: "stream",
    prefix: "/terminal/stream/v1",
  },
} as const satisfies RuntimeContractSnapshot["surfaces"];

export const DEFAULT_SESSION_DESCRIPTOR: SessionDescriptor = {
  sessionId: "session-demo",
  workspaceId: "workspace-demo",
  target: "local-shell",
  state: "Creating",
  createdAt: "2026-04-09T00:00:00.000Z",
  lastActiveAt: "2026-04-09T00:00:00.000Z",
  modeTags: ["cli-native"],
  tags: ["profile:shell"],
};

export const DEFAULT_ATTACHMENT_DESCRIPTOR: SessionAttachmentDescriptor = {
  attachmentId: "attachment-demo",
  sessionId: "session-demo",
  cursor: "0",
  lastAckSequence: 0,
  writable: true,
};

const DEFAULT_TARGET_CHECKED_AT = "2026-04-09T00:00:00.000Z";

export const DEFAULT_LOCAL_EXECUTION_TARGET: ExecutionTargetDescriptor = {
  targetId: "target-local-shell",
  workspaceId: "workspace-demo",
  kind: "local-shell",
  label: "Local Shell",
  authority: "localhost",
  connector: {
    connectorId: "builtin-local-shell",
    label: "Builtin PTY",
    transport: "builtin",
    diagnosticsHint: "Verify local shell profile and PTY permissions.",
  },
  health: {
    status: "ready",
    summary: "Local PTY runtime ready.",
    lastCheckedAt: DEFAULT_TARGET_CHECKED_AT,
  },
  sessionLaunchable: true,
  tags: ["desktop", "default"],
};

export const DEFAULT_SSH_EXECUTION_TARGET: ExecutionTargetDescriptor = {
  targetId: "target-ssh-bastion",
  workspaceId: "workspace-demo",
  kind: "ssh",
  label: "SSH",
  authority: "ops@prod-bastion",
  connector: {
    connectorId: "system-ssh",
    label: "System SSH",
    transport: "system-cli",
    diagnosticsHint: "Check ssh binary, config and host-key trust chain.",
  },
  health: {
    status: "degraded",
    summary: "Host-key confirmation required before the next launch.",
    lastCheckedAt: DEFAULT_TARGET_CHECKED_AT,
  },
  sessionLaunchable: true,
  tags: ["remote", "system-ssh"],
};

export const DEFAULT_DOCKER_EXECUTION_TARGET: ExecutionTargetDescriptor = {
  targetId: "target-docker-dev",
  workspaceId: "workspace-demo",
  kind: "docker-exec",
  label: "Docker Exec",
  authority: "docker://workspace-dev",
  connector: {
    connectorId: "system-docker",
    label: "Docker CLI",
    transport: "system-cli",
    diagnosticsHint: "Check docker context, socket access and exec permissions.",
  },
  health: {
    status: "ready",
    summary: "Docker context is reachable for interactive exec.",
    lastCheckedAt: DEFAULT_TARGET_CHECKED_AT,
  },
  sessionLaunchable: true,
  tags: ["container", "docker"],
};

export const DEFAULT_KUBERNETES_EXECUTION_TARGET: ExecutionTargetDescriptor = {
  targetId: "target-k8s-prod",
  workspaceId: "workspace-demo",
  kind: "kubernetes-exec",
  label: "Kubernetes Exec",
  authority: "k8s://prod/web-0",
  connector: {
    connectorId: "system-kubectl",
    label: "kubectl",
    transport: "system-cli",
    diagnosticsHint: "Check kubeconfig, current context and exec RBAC.",
  },
  health: {
    status: "ready",
    summary: "kubectl context is ready for pod exec.",
    lastCheckedAt: DEFAULT_TARGET_CHECKED_AT,
  },
  sessionLaunchable: true,
  tags: ["cluster", "kubernetes"],
};

export const DEFAULT_REMOTE_RUNTIME_EXECUTION_TARGET: ExecutionTargetDescriptor = {
  targetId: "target-remote-runtime",
  workspaceId: "workspace-demo",
  kind: "remote-runtime",
  label: "Remote Runtime",
  authority: "runtime://edge-node-a",
  connector: {
    connectorId: "runtime-node-api",
    label: "Runtime Node API",
    transport: "remote-api",
    diagnosticsHint: "Register a healthy runtime node before creating sessions.",
  },
  health: {
    status: "unavailable",
    summary: "Runtime node registration is still pending.",
    lastCheckedAt: DEFAULT_TARGET_CHECKED_AT,
  },
  sessionLaunchable: false,
  tags: ["server", "planned"],
};

export const DEFAULT_EXECUTION_TARGET_DESCRIPTORS = [
  DEFAULT_LOCAL_EXECUTION_TARGET,
  DEFAULT_SSH_EXECUTION_TARGET,
  DEFAULT_DOCKER_EXECUTION_TARGET,
  DEFAULT_KUBERNETES_EXECUTION_TARGET,
  DEFAULT_REMOTE_RUNTIME_EXECUTION_TARGET,
] as const satisfies readonly ExecutionTargetDescriptor[];

export function getSurfaceDescriptor<T extends ProtocolSurfaceName>(
  surface: T,
): (typeof API_SURFACES)[T] {
  return API_SURFACES[surface];
}

export function getSurfacePrefix<T extends Exclude<ProtocolSurfaceName, "desktopBridge" | "localRuntime">>(
  surface: T,
): NonNullable<(typeof API_SURFACES)[T]["prefix"]> {
  return API_SURFACES[surface].prefix;
}

export function buildRuntimeContractSnapshot(): RuntimeContractSnapshot {
  return {
    version: CONTRACT_VERSION,
    surfaces: API_SURFACES,
    errorFields: [...CONTRACT_ERROR_FIELDS],
    runtimeStreamEvents: [...RUNTIME_STREAM_EVENTS],
    sessionStates: [...SESSION_STATES],
    executionTargets: [...EXECUTION_TARGET_KINDS],
    executionTargetDescriptorFields: [...EXECUTION_TARGET_DESCRIPTOR_FIELDS],
    connectorSessionLaunchRequestFields: [...CONNECTOR_SESSION_LAUNCH_REQUEST_FIELDS],
    executionModeTags: [...EXECUTION_MODE_TAGS],
    connectorHealthStatuses: [...CONNECTOR_HEALTH_STATUSES],
    connectorTransports: [...CONNECTOR_TRANSPORTS],
    controlActions: [...CONTROL_ACTIONS],
    publicResources: [...PUBLIC_API_RESOURCES],
    manageResources: [...MANAGE_API_RESOURCES],
    internalResources: [...INTERNAL_API_RESOURCES],
    sessionDescriptorFields: [...SESSION_DESCRIPTOR_FIELDS],
    attachmentFields: [...ATTACHMENT_FIELDS],
  };
}
