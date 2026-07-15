/**
 * Browser and desktop clients use this contract to request an already-governed
 * remote terminal capability. Concrete SDK and host adapters own transport,
 * authentication, endpoint selection, and server-side policy enforcement.
 */

declare const remoteTerminalOpaqueId: unique symbol;

export type RemoteTerminalOpaqueId<TKind extends string> = string & {
  readonly [remoteTerminalOpaqueId]: TKind;
};

export type RemoteTerminalTargetId = RemoteTerminalOpaqueId<"target">;
export type RemoteTerminalShellProfileId = RemoteTerminalOpaqueId<"shell-profile">;
export type RemoteTerminalCommandProfileId = RemoteTerminalOpaqueId<"command-profile">;
export type RemoteTerminalWorkspaceRootId = RemoteTerminalOpaqueId<"workspace-root">;
export type RemoteTerminalSessionId = RemoteTerminalOpaqueId<"session">;
export type RemoteTerminalAttachmentId = RemoteTerminalOpaqueId<"attachment">;
export type RemoteTerminalCursor = RemoteTerminalOpaqueId<"cursor">;

export const REMOTE_TERMINAL_SESSION_CREATE_REQUEST_FIELDS = [
  "targetId",
  "shellProfileId",
  "commandProfileId",
  "workspaceRootId",
  "viewport",
  "idempotencyKey",
] as const;

export const REMOTE_TERMINAL_FORBIDDEN_SESSION_CREATE_REQUEST_FIELDS = [
  "authority",
  "nodeId",
  "nodeEndpoint",
  "command",
  "rawCommand",
  "workingDirectory",
] as const;

export const REMOTE_TERMINAL_CONTROL_PLANE_OPERATIONS = [
  "listTargets",
  "createSession",
  "attachSession",
  "replaySession",
  "writeSessionInput",
  "resizeSession",
  "detachSession",
  "terminateSession",
] as const;

export type RemoteTerminalTargetStatus =
  | "ready"
  | "degraded"
  | "unavailable"
  | "access-denied"
  | "policy-blocked";

export type RemoteTerminalSelectionStatus =
  | "available"
  | "unavailable"
  | "policy-blocked";

export type RemoteTerminalSessionStatus =
  | "creating"
  | "starting"
  | "running"
  | "detached"
  | "replaying"
  | "terminating"
  | "terminated"
  | "failed"
  | "lost";

export type RemoteTerminalAttachmentStatus =
  | "attaching"
  | "attached"
  | "replaying"
  | "detached"
  | "lost"
  | "revoked"
  | "expired";

export interface RemoteTerminalViewport {
  readonly cols: number;
  readonly rows: number;
}

export interface RemoteTerminalShellProfileDescriptor {
  readonly shellProfileId: RemoteTerminalShellProfileId;
  readonly label: string;
  readonly status: RemoteTerminalSelectionStatus;
}

export interface RemoteTerminalCommandProfileDescriptor {
  readonly commandProfileId: RemoteTerminalCommandProfileId;
  readonly label: string;
  readonly status: RemoteTerminalSelectionStatus;
}

export interface RemoteTerminalWorkspaceRootDescriptor {
  readonly workspaceRootId: RemoteTerminalWorkspaceRootId;
  readonly label: string;
  readonly status: RemoteTerminalSelectionStatus;
}

export interface RemoteTerminalTargetDescriptor {
  readonly targetId: RemoteTerminalTargetId;
  readonly label: string;
  readonly status: RemoteTerminalTargetStatus;
  readonly sessionCreateAllowed: boolean;
  readonly shellProfiles: readonly RemoteTerminalShellProfileDescriptor[];
  readonly commandProfiles: readonly RemoteTerminalCommandProfileDescriptor[];
  readonly workspaceRoots: readonly RemoteTerminalWorkspaceRootDescriptor[];
}

export interface RemoteTerminalTargetCatalogRequest {
  readonly cursor?: RemoteTerminalCursor;
  readonly pageSize?: number;
}

export interface RemoteTerminalTargetCatalogPage {
  readonly items: readonly RemoteTerminalTargetDescriptor[];
  readonly nextCursor: RemoteTerminalCursor | null;
}

/**
 * The client selects opaque, approved catalog identifiers only. The service
 * derives all execution details from authorization and target policy.
 */
export interface RemoteTerminalSessionCreateRequest {
  readonly targetId: RemoteTerminalTargetId;
  readonly shellProfileId?: RemoteTerminalShellProfileId;
  readonly commandProfileId?: RemoteTerminalCommandProfileId;
  readonly workspaceRootId?: RemoteTerminalWorkspaceRootId;
  readonly viewport: RemoteTerminalViewport;
  readonly idempotencyKey?: string;
}

type RemoteTerminalAssert<TCondition extends true> = TCondition;
type RemoteTerminalSessionCreateRequestField =
  (typeof REMOTE_TERMINAL_SESSION_CREATE_REQUEST_FIELDS)[number];
type RemoteTerminalForbiddenSessionCreateRequestField =
  (typeof REMOTE_TERMINAL_FORBIDDEN_SESSION_CREATE_REQUEST_FIELDS)[number];

type RemoteTerminalSessionCreateRequestHasExactFields = RemoteTerminalAssert<
  [keyof RemoteTerminalSessionCreateRequest] extends [RemoteTerminalSessionCreateRequestField]
    ? [RemoteTerminalSessionCreateRequestField] extends [keyof RemoteTerminalSessionCreateRequest]
      ? true
      : false
    : false
>;

type RemoteTerminalSessionCreateRequestExcludesForbiddenFields = RemoteTerminalAssert<
  [Extract<
    keyof RemoteTerminalSessionCreateRequest,
    RemoteTerminalForbiddenSessionCreateRequestField
  >] extends [never]
    ? true
    : false
>;

type RemoteTerminalExactSessionCreateRequest<
  TRequest extends RemoteTerminalSessionCreateRequest,
> = TRequest & Record<Exclude<keyof TRequest, keyof RemoteTerminalSessionCreateRequest>, never>;

type RemoteTerminalSessionCreateRequestWithForbiddenAuthority =
  RemoteTerminalSessionCreateRequest & {
    readonly authority: string;
  };

type RemoteTerminalSessionCreateRequestRejectsForbiddenAuthority = RemoteTerminalAssert<
  [RemoteTerminalExactSessionCreateRequest<
    RemoteTerminalSessionCreateRequestWithForbiddenAuthority
  >] extends [{ readonly authority: infer TAuthority }]
    ? [TAuthority] extends [never]
      ? true
      : false
    : false
>;

export interface RemoteTerminalSessionDescriptor {
  readonly sessionId: RemoteTerminalSessionId;
  readonly targetId: RemoteTerminalTargetId;
  readonly status: RemoteTerminalSessionStatus;
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly expiresAt: string | null;
}

export interface RemoteTerminalAttachmentDescriptor {
  readonly attachmentId: RemoteTerminalAttachmentId;
  readonly sessionId: RemoteTerminalSessionId;
  readonly status: RemoteTerminalAttachmentStatus;
  readonly writable: boolean;
  readonly resumeCursor: RemoteTerminalCursor | null;
  readonly expiresAt: string | null;
}

export interface RemoteTerminalSessionBinding {
  readonly session: RemoteTerminalSessionDescriptor;
  readonly attachment: RemoteTerminalAttachmentDescriptor;
}

export interface RemoteTerminalSessionAttachRequest {
  readonly sessionId: RemoteTerminalSessionId;
  readonly viewport: RemoteTerminalViewport;
  readonly resumeCursor?: RemoteTerminalCursor;
}

export type RemoteTerminalSessionInput =
  | {
      readonly kind: "text";
      readonly data: string;
    }
  | {
      readonly kind: "bytes";
      readonly data: readonly number[];
    };

export interface RemoteTerminalSessionInputRequest {
  readonly sessionId: RemoteTerminalSessionId;
  readonly attachmentId: RemoteTerminalAttachmentId;
  readonly input: RemoteTerminalSessionInput;
}

export interface RemoteTerminalSessionInputAcknowledgement {
  readonly sessionId: RemoteTerminalSessionId;
  readonly attachmentId: RemoteTerminalAttachmentId;
  readonly acceptedBytes: number;
  readonly attachmentStatus: RemoteTerminalAttachmentStatus;
}

export interface RemoteTerminalSessionResizeRequest {
  readonly sessionId: RemoteTerminalSessionId;
  readonly attachmentId: RemoteTerminalAttachmentId;
  readonly viewport: RemoteTerminalViewport;
}

export interface RemoteTerminalSessionResizeResult {
  readonly session: RemoteTerminalSessionDescriptor;
  readonly attachment: RemoteTerminalAttachmentDescriptor;
  readonly viewport: RemoteTerminalViewport;
}

export interface RemoteTerminalSessionDetachRequest {
  readonly sessionId: RemoteTerminalSessionId;
  readonly attachmentId: RemoteTerminalAttachmentId;
}

export interface RemoteTerminalSessionTerminateRequest {
  readonly sessionId: RemoteTerminalSessionId;
  readonly idempotencyKey?: string;
}

export type RemoteTerminalReplayEntry =
  | {
      readonly cursor: RemoteTerminalCursor;
      readonly sequence: number;
      readonly kind: "output";
      readonly data: string;
      readonly occurredAt: string;
    }
  | {
      readonly cursor: RemoteTerminalCursor;
      readonly sequence: number;
      readonly kind: "state";
      readonly status: RemoteTerminalSessionStatus;
      readonly occurredAt: string;
    }
  | {
      readonly cursor: RemoteTerminalCursor;
      readonly sequence: number;
      readonly kind: "warning";
      readonly code: string;
      readonly occurredAt: string;
    }
  | {
      readonly cursor: RemoteTerminalCursor;
      readonly sequence: number;
      readonly kind: "exit";
      readonly exitCode: number | null;
      readonly occurredAt: string;
    };

export interface RemoteTerminalSessionReplayRequest {
  readonly sessionId: RemoteTerminalSessionId;
  readonly attachmentId: RemoteTerminalAttachmentId;
  readonly afterCursor?: RemoteTerminalCursor;
  readonly maxEntries?: number;
}

export interface RemoteTerminalSessionReplaySnapshot {
  readonly session: RemoteTerminalSessionDescriptor;
  readonly attachment: RemoteTerminalAttachmentDescriptor;
  readonly fromCursor: RemoteTerminalCursor | null;
  readonly nextCursor: RemoteTerminalCursor | null;
  readonly hasMore: boolean;
  readonly entries: readonly RemoteTerminalReplayEntry[];
}

export interface RemoteTerminalTargetCatalogPort {
  listTargets(
    request?: RemoteTerminalTargetCatalogRequest,
  ): Promise<RemoteTerminalTargetCatalogPage>;
}

export interface RemoteTerminalSessionCreatePort {
  createSession<TRequest extends RemoteTerminalSessionCreateRequest>(
    request: RemoteTerminalExactSessionCreateRequest<TRequest>,
  ): Promise<RemoteTerminalSessionBinding>;
}

export interface RemoteTerminalSessionAttachmentPort {
  attachSession(request: RemoteTerminalSessionAttachRequest): Promise<RemoteTerminalSessionBinding>;
  detachSession(request: RemoteTerminalSessionDetachRequest): Promise<RemoteTerminalAttachmentDescriptor>;
}

export interface RemoteTerminalSessionReplayPort {
  replaySession(
    request: RemoteTerminalSessionReplayRequest,
  ): Promise<RemoteTerminalSessionReplaySnapshot>;
}

export interface RemoteTerminalSessionInputPort {
  writeSessionInput(
    request: RemoteTerminalSessionInputRequest,
  ): Promise<RemoteTerminalSessionInputAcknowledgement>;
}

export interface RemoteTerminalSessionViewportPort {
  resizeSession(
    request: RemoteTerminalSessionResizeRequest,
  ): Promise<RemoteTerminalSessionResizeResult>;
}

export interface RemoteTerminalSessionTerminationPort {
  terminateSession(
    request: RemoteTerminalSessionTerminateRequest,
  ): Promise<RemoteTerminalSessionDescriptor>;
}

export interface RemoteTerminalControlPlanePort
  extends RemoteTerminalTargetCatalogPort,
    RemoteTerminalSessionCreatePort,
    RemoteTerminalSessionAttachmentPort,
    RemoteTerminalSessionReplayPort,
    RemoteTerminalSessionInputPort,
    RemoteTerminalSessionViewportPort,
    RemoteTerminalSessionTerminationPort {}
