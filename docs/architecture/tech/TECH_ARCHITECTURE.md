# SDKWork Terminal Technical Architecture

Status: active
Owner: SDKWork maintainers
Updated: 2026-06-27
Specs: ARCHITECTURE_DECISION_SPEC.md, SECURITY_SPEC.md, HEALTH_CHECK_SPEC.md, OBSERVABILITY_SPEC.md, DEPLOYMENT_SPEC.md, RUST_CODE_SPEC.md, TYPESCRIPT_CODE_SPEC.md, FRONTEND_SPEC.md, NAMING_SPEC.md

## Document Map

- [TECH-topology-standard.md](TECH-topology-standard.md)
- Architecture shards live in this directory as `TECH-<kebab-topic>.md`.

## 1. Architecture Overview

SDKWork Terminal is a cross-platform terminal application built on a layered architecture:

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Vite)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Terminal │ │ Session  │ │ Resource │ │ AI CLI   │   │
│  │ Viewport │ │ Center   │ │ Panel    │ │ Panel    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐    │
│  │ Settings │ │ Diagnos- │ │ i18n (zh-CN, en-US)  │    │
│  │ Panel    │ │ tics     │ │                      │    │
│  └──────────┘ └──────────┘ └──────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │ Tauri IPC (capability-scoped)
┌────────────────────────┴────────────────────────────────┐
│  Desktop Host (Rust + Tauri 2)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Secure   │ │ Control  │ │ AI CLI   │ │ Desktop  │   │
│  │ Session  │ │ Plane    │ │ Host     │ │ Commands │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ Rust crate boundaries
┌────────────────────────┴────────────────────────────────┐
│  Runtime Crates (Rust)                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ PTY      │ │ Session  │ │ Replay   │ │ Resource │   │
│  │ Runtime  │ │ Runtime  │ │ Store    │ │ Connect- │   │
│  │          │ │          │ │ (SQLite) │ │ ors      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Observ-  │ │ Protocol │ │ Shell    │ │ Terminal │   │
│  │ ability  │ │          │ │ Integra- │ │ Core     │   │
│  │          │ │          │ │ tion     │ │          │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (axum)
┌────────────────────────┴────────────────────────────────┐
│  Runtime Node HTTP Server                               │
│  /healthz  /livez  /readyz  /metrics                    │
│  /terminal/api/v1/sessions  /terminal/stream/v1/attach  │
└─────────────────────────────────────────────────────────┘
```

The frontend communicates with the Rust backend exclusively through Tauri IPC commands. The Rust runtime crates provide PTY management, session lifecycle, replay persistence, resource connector execution, and AI CLI discovery. The runtime-node HTTP server exposes health, metrics, and session APIs for observability and remote access.

## 2. Technology Choices

| Layer | Technology | Rationale |
| --- | --- | --- |
| Desktop shell | Tauri 2 | Native performance, small bundle, Rust backend, cross-platform |
| Frontend framework | React 18 + TypeScript 5 | Industry standard, strong typing, ecosystem maturity |
| Build tooling | Vite 5 + pnpm 10 | Fast HMR, workspace monorepo, frozen-lockfile reproducibility |
| Terminal renderer | xterm.js | Industry-standard terminal emulator, proven in VS Code |
| Rust runtime | Tokio + axum 0.7 | Async runtime, type-safe HTTP framework, middleware ecosystem |
| PTY management | portable-pty | Cross-platform PTY abstraction (Windows ConPTY, Unix forkpty) |
| Persistence | rusqlite (SQLite) | Embedded, zero-config, battle-tested for session replay storage |
| Observability | Custom Prometheus crate | Bounded cardinality, text exposition format v0.0.4, no external dependency |
| Crypto | sdkwork-utils-rust (AES-256-GCM + HKDF-SHA256) | NIST-approved primitives, defense-in-depth for session envelopes |
| Credential store | keyring 3 | OS-native secure storage (Windows Credential Manager, macOS Keychain, Linux Secret Service) |
| i18n | React Context + message catalogs | Zero-dependency, type-safe, parameter interpolation |

## 3. System Boundaries And Modules

### Rust Crates (12 crates)

| Crate | Responsibility | Public API |
| --- | --- | --- |
| `sdkwork-terminal-protocol` | Contract version, namespaces, shared types | `CONTRACT_VERSION`, `DESKTOP_BRIDGE_NAMESPACE`, `LOCAL_RUNTIME_NAMESPACE` |
| `sdkwork-terminal-pty-runtime` | PTY process lifecycle, local shell execution | `LocalShellSessionRuntime`, `PtyProcessSessionCreateRequest`, `LocalShellExecutionError` |
| `sdkwork-terminal-session-runtime` | Session state machine, attachment tracking | `SessionRuntime`, `SessionRecord`, `SessionState`, `LocalSessionDaemon` |
| `sdkwork-terminal-replay-store` | SQLite-backed replay event persistence | `ReplayEntry`, `ReplayEventKind` |
| `sdkwork-terminal-resource-connectors` | Execution target discovery, launch plan execution | `ConnectorExecutionTarget`, `ConnectorDiscoveryEnvironment`, `CommandRunner` |
| `sdkwork-terminal-shell-integration` | Platform shell launch command normalization | `build_local_shell_launch_command` |
| `sdkwork-terminal-control-plane` | Desktop session runtime, interactive connector sessions | `create_desktop_session_runtime`, `InteractiveConnectorSessionSpawner` |
| `sdkwork-terminal-ai-cli-host` | AI CLI discovery and launch (Codex, Claude Code, Gemini, OpenCode) | `AiCliHost`, `AiCliDiscoverySnapshot` |
| `sdkwork-terminal-terminal-core` | Terminal core abstractions | Terminal state and event types |
| `sdkwork-terminal-observability` | Health, metrics, common labels | `HealthStatus`, `MetricsRegistry`, `CommonLabels`, `render_prometheus_text` |
| `sdkwork-terminal-runtime-node` | HTTP server exposing session, replay, health, metrics APIs | `create_runtime_node_router`, `create_runtime_node_router_with_auth`, `RuntimeNodeHost` |
| `sdkwork-terminal-desktop-host` | Tauri application host, IPC commands, secure session | `desktop_*` Tauri commands, `secure_session` module |

### TypeScript Packages (20 packages)

| Package | Responsibility |
| --- | --- |
| `@sdkwork/terminal-pc-core` | Bootstrap, session persistence, shell state bridge |
| `@sdkwork/terminal-pc-shell` | Shell integration, tab controller, viewport surface |
| `@sdkwork/terminal-pc-i18n` | i18n Provider, message catalogs (zh-CN, en-US) |
| `@sdkwork/terminal-pc-ai-cli` | AI CLI panel component |
| `@sdkwork/terminal-pc-sessions` | Session center panel component |
| `@sdkwork/terminal-pc-resources` | Resource panel component |
| `@sdkwork/terminal-pc-settings` | Settings panel component |
| `@sdkwork/terminal-pc-diagnostics` | Diagnostics panel component |
| `@sdkwork/terminal-pc-desktop` | Desktop host entry, secure session persistence adapter |
| `@sdkwork/terminal-pc-types` | Shared TypeScript types |
| `@sdkwork/terminal-pc-contracts` | Frontend contract definitions |

### Boundary Rules

- Frontend packages MUST NOT import Rust crate internals directly; they communicate through Tauri IPC commands.
- Rust crates MUST NOT depend on Tauri; only `sdkwork-terminal-desktop-host` depends on Tauri.
- The runtime-node HTTP server MUST NOT require Tauri; it runs as a standalone binary.
- Observability crate MUST NOT depend on HTTP frameworks; it provides primitives that `runtime-node` wires into axum.
- Secure session module MUST use `sdkwork-utils-rust` for crypto primitives; no hand-rolled cryptography.

## 4. Directory And Package Layout

```
sdkwork-terminal/
├── apps/sdkwork-terminal-pc/          # Application root
│   ├── crates/                        # 12 Rust crates
│   │   ├── sdkwork-terminal-protocol/
│   │   ├── sdkwork-terminal-pty-runtime/
│   │   ├── sdkwork-terminal-session-runtime/
│   │   ├── sdkwork-terminal-replay-store/
│   │   ├── sdkwork-terminal-resource-connectors/
│   │   ├── sdkwork-terminal-shell-integration/
│   │   ├── sdkwork-terminal-control-plane/
│   │   ├── sdkwork-terminal-ai-cli-host/
│   │   ├── sdkwork-terminal-terminal-core/
│   │   ├── sdkwork-terminal-observability/
│   │   ├── sdkwork-terminal-runtime-node/
│   │   └── sdkwork-terminal-runtime-node-ffi/  # (if present)
│   ├── packages/                      # 20 TypeScript packages
│   │   ├── sdkwork-terminal-pc-core/
│   │   ├── sdkwork-terminal-pc-shell/
│   │   ├── sdkwork-terminal-pc-i18n/
│   │   ├── sdkwork-terminal-pc-ai-cli/
│   │   ├── sdkwork-terminal-pc-sessions/
│   │   ├── sdkwork-terminal-pc-resources/
│   │   ├── sdkwork-terminal-pc-settings/
│   │   ├── sdkwork-terminal-pc-diagnostics/
│   │   ├── sdkwork-terminal-pc-desktop/
│   │   │   └── src-tauri/             # Tauri application
│   │   │       ├── src/
│   │   │       │   ├── lib.rs         # IPC commands, host wiring
│   │   │       │   ├── main.rs        # Tauri entry point
│   │   │       │   └── secure_session.rs  # AES-256-GCM session store
│   │   │       ├── capabilities/      # IPC capability scoping
│   │   │       ├── permissions/       # Command whitelist
│   │   │       └── tauri.conf.json    # CSP, window config
│   │   └── ...
│   ├── tests/                         # 90+ test files
│   ├── specs/                         # Component contracts
│   └── Cargo.toml                     # Workspace manifest
├── docs/                              # Canon documentation
│   ├── product/prd/PRD.md
│   └── architecture/tech/TECH_ARCHITECTURE.md
└── AGENTS.md                          # Agent entrypoint
```

## 5. API, SDK, And Data Ownership

### Tauri IPC API

All frontend-to-backend communication flows through Tauri IPC commands. The command surface is defined in `permissions/desktop-host.toml` and includes:

- **Session lifecycle**: `desktop_session_index`, `desktop_session_attach`, `desktop_session_detach`, `desktop_session_reattach`, `desktop_session_input`, `desktop_session_resize`, `desktop_session_terminate`
- **Replay**: `desktop_session_replay_slice`
- **Resource connectors**: `desktop_execution_target_catalog`, `desktop_connector_launch`, `desktop_connector_session_create`, `desktop_connector_exec_probe`
- **Local shell**: `desktop_local_shell_exec`, `desktop_local_shell_session_create`, `desktop_local_process_session_create`
- **Secure session**: `desktop_secure_session_read`, `desktop_secure_session_write`, `desktop_secure_session_clear`, `desktop_secure_session_read_slot`, `desktop_secure_session_write_slot`, `desktop_secure_session_clear_slot`
- **Desktop host**: `desktop_host_status`, `desktop_daemon_health`, `desktop_daemon_start`, `desktop_daemon_stop`, `desktop_daemon_reconnect`
- **Clipboard**: `desktop_clipboard_read_text`, `desktop_clipboard_write_text`
- **Dialog**: `desktop_pick_working_directory`

### Runtime Node HTTP API

The runtime-node HTTP server (axum 0.7) exposes:

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/healthz` | GET | No | Liveness probe (always 200 when process is alive) |
| `/livez` | GET | No | Kubernetes-style liveness alias |
| `/readyz` | GET | No | Readiness probe (503 when not serving) |
| `/metrics` | GET | No | Prometheus text exposition format |
| `/terminal/api/v1/sessions` | GET, POST | Bearer token (when auth enabled) | List/create sessions |
| `/terminal/api/v1/replays` | GET | Bearer token | Read replay entries |
| `/terminal/api/v1/sessions/:id/input` | POST | Bearer token | Write input to session |
| `/terminal/api/v1/sessions/:id/resize` | POST | Bearer token | Resize session PTY |
| `/terminal/api/v1/sessions/:id/terminate` | POST | Bearer token | Terminate session |
| `/terminal/stream/v1/attach` | GET (SSE) | Bearer token | Stream session events |

### Data Ownership

- **Session state**: Owned by `sdkwork-terminal-session-runtime`; persisted in SQLite via `sdkwork-terminal-replay-store`.
- **Replay events**: Owned by `sdkwork-terminal-replay-store`; SQLite is the single source of truth.
- **Credentials**: Owned by `secure_session` module in `sdkwork-terminal-desktop-host`; stored in OS keyring with AES-256-GCM encryption.
- **Metrics**: Owned by `sdkwork-terminal-observability`; global singleton registry with bounded cardinality labels.
- **Health status**: Owned by `sdkwork-terminal-observability`; global `OnceLock<RwLock<HealthStatus>>`.

## 6. Security, Privacy, And Observability

### Security

Cite: `sdkwork-specs/SECURITY_SPEC.md`

- **Credential storage**: OS keyring (Windows Credential Manager, macOS Keychain, Linux Secret Service) with AES-256-GCM encrypted envelopes. Master key is a 32-byte CSPRNG value stored in a dedicated keyring entry; per-slot keys derived via HKDF-SHA256.
- **Session envelopes**: Versioned (`v1:` prefix), TTL-bounded (default 7 days), slot-isolated (independent encryption keys per slot). Expired or corrupted envelopes are lazily cleared on read.
- **Tauri IPC**: Capability scoped to `main` window only. Command whitelist in `permissions/desktop-host.toml`. No `core:shell:*`, `core:process:*`, `core:fs:*`, or `core:http:*` permissions granted.
- **CSP**: `default-src 'self'`; `script-src 'self'` (no wildcards); `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`; `object-src 'none'`. `connect-src` allows `ipc:`, `http://ipc.localhost`, and local runtime-node connections.
- **Bearer token auth**: Runtime-node HTTP server uses constant-time token comparison. Auth is fail-closed: if auth is required and no token is configured, the server refuses to start. Wildcard bind addresses (`0.0.0.0`, `[::]`) automatically require auth.

### Observability

Cite: `sdkwork-specs/OBSERVABILITY_SPEC.md`, `sdkwork-specs/HEALTH_CHECK_SPEC.md`

- **Health endpoints**: `/healthz` (liveness, always 200), `/livez` (Kubernetes alias), `/readyz` (readiness, 503 when not serving), `/metrics` (Prometheus text format).
- **Health state machine**: `HealthStatus::Serving` (gauge=1), `HealthStatus::Degraded` (gauge=0), `HealthStatus::NotServing` (gauge=0). State transitions: Serving at startup, NotServing on graceful shutdown.
- **Metrics series**:
  - `runtime_node_health_status` (Gauge): 1=serving, 0=not serving
  - `runtime_node_http_requests_total` (Counter): total HTTP requests on protected router
  - `runtime_node_http_request_duration_seconds` (Histogram): request latency with default buckets `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]`
- **Common labels**: `service`, `environment`, `deployment_profile`, `runtime_target` — bounded cardinality, derived from environment variables.
- **Readiness failure**: `/readyz` returns 503 with `READINESS_DEPENDENCY_UNAVAILABLE` detail (no internal dependency information leaked per spec).

## 7. Deployment And Runtime Topology

Cite: `sdkwork-specs/DEPLOYMENT_SPEC.md`

### Deployment Profiles

| Profile | Description | Runtime Target |
| --- | --- | --- |
| `standalone` | Desktop application installed locally | Desktop (Tauri) |
| `cloud` | Web bundle served from cloud | Browser |

### Runtime Topology

- **Desktop (standalone)**: Tauri application hosts the Rust runtime in-process. PTY sessions run locally. Secure session store uses OS keyring. No runtime-node HTTP server is required for normal operation.
- **Runtime-node (optional)**: A standalone HTTP server binary (`sdkwork-terminal-runtime-node`) can be started on local or remote nodes. It exposes session, replay, health, and metrics APIs. Auth is required when binding to wildcard addresses.
- **Web (cloud)**: Browser loads the React bundle. Session communication flows through a remote runtime-node HTTP server. No local PTY access; all sessions are remote.

### Bind Address Security

- `127.0.0.1:9620` (default): loopback only, auth optional
- `0.0.0.0:*` or `[::]`: wildcard, auth REQUIRED (server refuses to start without `SDKWORK_ACCESS_TOKEN`)
- `SDKWORK_RUNTIME_NODE_REQUIRE_AUTH=true`: forces auth even on loopback

## 8. Architecture Decision Index

| Decision | Status | Reference |
| --- | --- | --- |
| Tauri 2 for desktop shell | Accepted | Cross-platform, Rust backend, small bundle |
| xterm.js for terminal rendering | Accepted | Industry standard, proven in VS Code |
| SQLite for replay persistence | Accepted | Embedded, zero-config, ACID |
| AES-256-GCM + HKDF for session encryption | Accepted | Defense-in-depth, NIST-approved |
| Custom Prometheus crate (no prometheus dep) | Accepted | Bounded cardinality, no external metric server dependency |
| axum 0.7 for runtime-node HTTP | Accepted | Type-safe, middleware ecosystem, Tokio integration |
| React Context for i18n (no react-intl) | Accepted | Zero-dependency, type-safe, sufficient for 2 locales |
| Capability-scoped IPC (no wildcard core permissions) | Accepted | Least-privilege, defense-in-depth |

## 9. Verification

### Build Verification

- `cargo check --workspace`: all Rust crates compile
- `cargo clippy --workspace --tests -- -D warnings`: no clippy warnings
- `cargo fmt --all --check`: Rust formatting verified
- `pnpm run typecheck`: TypeScript types verified
- `pnpm run lint`: ESLint passes

### Test Verification

- `cargo test --workspace`: all Rust unit and integration tests pass
- `pnpm run test`: all TypeScript/Node.js contract tests pass
- `pnpm run verify`: full repository verification (architecture, boundaries, contracts)

### Key Test Suites

| Suite | Scope | Count |
| --- | --- | --- |
| `runtime_node_http_test` | HTTP API, health, metrics, SSE | 11 tests |
| `sdkwork-terminal-observability` | Health, labels, metrics | 16 tests |
| `desktop-bootstrap-contract` | CSP, capability, secure session | 5 tests |
| `desktop-tauri-permissions` | IPC permission whitelist | 1 test |
| `session-persistence-contract` | Session store contracts | 3 tests |
| `terminal-fidelity-probe` | Terminal rendering fidelity | varies |

### CI Gates

Cite: `sdkwork-specs/GITHUB_WORKFLOW_SPEC.md`, `sdkwork-specs/QUALITY_GATE_SPEC.md`

- Every commit: `cargo test`, `cargo clippy -D warnings`, `pnpm test`, `pnpm lint`
- Release: SBOM generation, checksum verification, signature validation
- Supply chain: `frozen-lockfile` enforced, no wildcard dependencies
