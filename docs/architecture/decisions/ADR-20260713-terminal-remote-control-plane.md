# ADR-20260713-terminal-remote-control-plane

Status: proposed
Requirement: REQ-2026-TERMINAL-REMOTE-001
Owner: sdkwork-terminal-team
Date: 2026-07-13
Specs: ARCHITECTURE_DECISION_SPEC.md, INTERNAL_API_SPEC.md, API_SPEC.md, SECURITY_SPEC.md, IAM_LOGIN_INTEGRATION_SPEC.md, APP_PC_ARCHITECTURE_SPEC.md, APP_RUNTIME_TOPOLOGY_SPEC.md, DEPLOYMENT_SPEC.md, PRIVACY_SPEC.md

## Context

SDKWork Terminal has one shared React shell for Browser and Tauri, a local Tauri
runtime bridge, and a product-local `sdkwork-terminal-runtime-node` protocol.
The latter currently accepts a deployment-level bearer token and client-selected
command, authority, workspace, and working-directory values. It is suitable only
as a loopback or private worker protocol. It is not an authenticated application
control plane and must not become a Browser-facing endpoint by configuration.

The product needs the same authorized remote targets and recoverable sessions in
Browser and Tauri. Tauri additionally retains its local host capabilities. The
design must preserve tenant and organization isolation, terminal session ownership,
auditing, stream recovery, and private node execution without putting credentials
or topology decisions in a browser bundle.

## Decision

### API and SDK boundary

Remote terminal control is an application-owned Internal API:

| Field | Decision |
| --- | --- |
| API authority | `sdkwork-device-internal-api` |
| SDK family | `sdkwork-device-internal-sdk` |
| TypeScript package | `@sdkwork/device-internal-sdk` |
| HTTP prefix | `/internal/v3/api/device/terminal` |
| public placement | `application.public-ingress` |
| request context | `WebRequestContext` |
| protected auth mode | `ingress-token` |

The authority will own target catalog, session lifecycle, attachment grant, replay,
input, resize, detach, and terminate resources. JSON control operations use the
SDKWork v3 envelope, `ProblemDetail`, object-level authorization, pagination where
applicable, and `Idempotency-Key` for create and retryable commands. Browser and
Tauri renderer code consume the generated/composed internal SDK through an injected
remote runtime service. UI code must not use raw HTTP or construct authentication
headers.

Representative resource paths are:

```text
GET  /internal/v3/api/device/terminal/execution-targets
POST /internal/v3/api/device/terminal/sessions
GET  /internal/v3/api/device/terminal/sessions/{sessionId}
POST /internal/v3/api/device/terminal/sessions/{sessionId}/attachments
GET  /internal/v3/api/device/terminal/sessions/{sessionId}/replay
POST /internal/v3/api/device/terminal/sessions/{sessionId}/input
POST /internal/v3/api/device/terminal/sessions/{sessionId}/resize
POST /internal/v3/api/device/terminal/sessions/{sessionId}/detach
POST /internal/v3/api/device/terminal/sessions/{sessionId}/terminate
```

The final OpenAPI authority, derived sdkgen input, generated SDK, route crate, and
permission manifest are created only after the framework and security review in
this ADR has been accepted.

### Identity, target, and grant model

`application.public-ingress` validates IAM-backed ingress credentials and resolves
the typed `WebRequestContext`. The terminal control plane never trusts tenant,
organization, user, target endpoint, workspace, command program, arguments, or
working directory submitted by the client.

The UI requests a server-filtered target catalog and submits only immutable
`targetId`, approved `shellProfileId` or `commandProfileId`, allowed workspace-root
identifier, viewport, and an explicit user action. The service resolves the selected
node, connector, command, environment, working root, and policy version from the
verified context and target policy.

Each session and attachment grant is short lived, unpredictable, revocable, and
bound to all of the following:

```text
tenantId, organizationId, subjectId, IAM sessionId, targetId, nodeId,
sessionId, target policy version, command profile version, capability
(read/write/terminate), issue time, expiry, audience, revocation epoch
```

Every read, replay, attach, input, resize, detach, terminate, and stream resume
performs service-level owner or participant authorization again. A valid login or
prior attachment alone is not authorization for a different session.

### Interactive data plane

The control plane and terminal data plane are intentionally separate. The proposed
production transport is a WebSocket terminated by `application.public-ingress` and
backed by the same session/attachment grants. It is an SDKWork-owned runtime stream,
not an `external` wire-protocol exception.

The runtime-stream contract must version and define session/attachment binding,
monotonic server output sequence, client input sequence and acknowledgement, replay
cursor and resume behavior, frame and output budgets, backpressure, heartbeat,
idle/absolute expiry, grant revocation, origin validation, and close/error codes.
Until that contract and its gateway implementation are reviewed, SSE output plus
SDK-backed control operations may remain a private/transition transport only. It
must not grant Browser access to the product-local runtime-node endpoint.

### Broker and node execution boundary

The control plane owns durable target, session, owner, grant, audit-metadata, and
node-lease records. A broker routes an authorized session to a private node channel.
Nodes accept only broker workload identity over mTLS; they never accept user IAM
tokens or requests directly from Browser/Tauri.

`sessionId -> nodeId -> lease` is durable state, not Kubernetes Service routing.
Node loss has explicit `reconnectable`, `lost`, or `ended` semantics. An existing
PTY is never silently moved to a different node. Multi-node cloud operation requires
durable relational state, a bounded shared realtime/lease/rate-limit store, and
observability for lease, stream, and policy failures.

Each node executes only an approved broker envelope. PTY execution clears inherited
environment, restores a narrow allowlist, uses an allowed resolved working root,
runs under a low-privilege identity or sandbox, enforces session TTL/concurrency/
input/output quotas, and does not expose cloud credentials, service-account tokens,
SSH keys, or the deployment access token to child processes. Connector credentials
remain node/broker-owned and are never client-selected.

### Client parity

Browser and Tauri use the same injected remote target/session provider and the same
shared terminal rendering, replay, reconnect, clipboard state, and terminal UX.
Browser has no local PTY, file picker, native clipboard privilege, or node endpoint.
Tauri may additionally expose its capability-scoped local host adapter, local target,
native clipboard, secure storage, and directory picker. A remote session follows the
same target/grant policy on both clients; desktop must not bypass it merely because a
local host is available.

### Legacy migration

`/terminal/api/v1`, `/terminal/manage/v1`, `/terminal/internal/v1`, and
`/terminal/stream/v1` remain product-local loopback/private worker protocols while
`EX-2026-REPO-002` is active. They must not be mounted by
`application.public-ingress`; public ingress route tests must return `404` for them.
The new Internal API is a clean migration, not a dual public route. Browser
configuration remains fail-closed until the reviewed control plane and composed
internal SDK are available.

Standalone Tauri continues to use its in-process local runtime for local sessions.
Cloud and standalone remote sessions both use the approved control plane. Existing
local replay SQLite remains local session storage; it is not the shared cloud owner
registry or transcript store.

## Alternatives

| Alternative | Rejected because |
| --- | --- |
| Expose `/terminal/api/v1` through Browser configuration | A static bearer cannot establish tenant, subject, object ownership, target policy, or revocation. It also turns a product-local Axum protocol into an ungoverned public API. |
| Treat terminal as app-api or backend-api | The first-party application shell/runtime use case maps to Internal API and ingress-token validation, not dual-token app-api or staff backend-admin semantics. |
| Let Browser connect directly to nodes with mTLS or a user bearer | Browser cannot safely hold node credentials, and direct node access bypasses target catalog, policy, audit, leases, and revocation. |
| Keep Web-only remote runtime and native-only Tauri runtime | It duplicates session behavior and prevents the desktop client from accessing the same approved remote target catalog. |
| Use best-effort HTTP/SSE without a stream contract | It lacks the required ordering, acknowledgement, backpressure, resume, and session-expiry semantics for an interactive terminal. |

## Consequences

Benefits:

- Browser and Tauri gain one auditable, policy-driven remote terminal experience.
- Node credentials and deployment topology remain private.
- Session recovery, node failure, revocation, and transcript treatment are explicit.
- The renderer can evolve independently of the control-plane transport through an
  injected remote runtime service.

Costs:

- This requires platform framework support for `internal-api`, ingress-token
  validation, `WebRequestContext`, route interceptors, generated SDK behavior, and
  a private broker/node channel.
- Cloud deployment needs durable state, shared lease/realtime capacity, mTLS/workload
  identity, sandboxing, and operational runbooks.
- The legacy runtime-node must be constrained while migration work occurs; it cannot
  be advertised as the production Browser remote runtime.

## Required Human Review

This ADR changes public naming, authn/authz, data ownership, generated SDK authority,
security posture, transcript handling, and production deployment topology. Approval
is required from the application owner, SDKWork web-framework owner, IAM/ingress
owner, security/privacy owner, deployment/platform owner, and IAM permission catalog
owner before implementation of the public control plane or WebSocket transport.

The framework owner must first provide the standard Rust route/interceptor support
for `internal-api`, `ingress-token`, and `WebRequestContext`. This repository must
not substitute handwritten Axum middleware for that standard chain.

## Verification

After approval and implementation, retain evidence for:

- Internal OpenAPI authority, sdkgen input, generated/composed SDK, route mounts, and
  consumer-import checks.
- API operation/envelope/pagination checks and no raw HTTP/manual-auth-header scans.
- Cross-tenant, cross-organization, owner/participant, expired/revoked grant, and
  target-policy-change authorization tests.
- Idempotent create/input/resize sequence, replay cursor, reconnect, slow-consumer,
  stream heartbeat, and node-loss tests.
- Broker-to-node mTLS/workload identity tests, child-environment leak tests, working
  root containment tests, sandbox/TTL/quota tests, and sensitive-audit redaction.
- Browser/Tauri target/session parity tests, including unavailable, permission-denied,
  detached, reconnecting, resumed, and terminal-lost states.
- Cloud topology and ingress tests proving the legacy `/terminal/*` paths are not
  public and that runtime nodes have no Browser-facing ingress.

## Supersedes / Superseded By

Supersedes the Browser-facing interpretation of the remote-runtime portion of
`EX-2026-REPO-002`. It does not remove the local/private runtime exception. A future
accepted migration ADR will supersede the legacy protocol after the Internal API,
broker, and node migration are complete.
