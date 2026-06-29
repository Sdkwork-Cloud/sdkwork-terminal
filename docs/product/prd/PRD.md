# SDKWork Terminal PRD

Status: active
Owner: SDKWork maintainers
Application: sdkwork-terminal
Updated: 2026-06-27
Specs: REQUIREMENTS_SPEC.md, DOCUMENTATION_SPEC.md

## Document Map

- Add `PRD-<topic>.md` shards in this directory when the PRD grows beyond one reviewable screen.

## 1. Background And Problem

Professional developers use terminal emulators daily, yet most open-source terminals stop at basic shell access. Industry-leading products (Windows Terminal, VS Code integrated terminal, WezTerm, Arc) deliver polished UX, multi-session management, replay/audit, and observability, but each is isolated to its own ecosystem. SDKWork Terminal closes that gap by providing a cross-platform, commercially deployable terminal that integrates SDKWork resource connectors, AI CLI hosts, and runtime-node observability into a single product.

### Problem Statements

- **Fragmented terminal UX**: Users switch between terminal emulators for different workflows (local shells, remote sessions, AI CLIs). SDKWork Terminal unifies them under one multi-tab, multi-session surface.
- **No replay/audit in commodity terminals**: Most terminals discard output after scrollback. SDKWork Terminal persists every session as a replayable, queryable event stream backed by SQLite.
- **Weak observability for local runtimes**: Local terminals expose no health/metrics surface. SDKWork Terminal ships a runtime-node HTTP server with `/healthz`, `/readyz`, `/livez`, and `/metrics` (Prometheus text format).
- **Inconsistent security posture**: Many terminals store credentials in plaintext or skip encryption. SDKWork Terminal uses OS keyring + AES-256-GCM encrypted envelopes with versioning, TTL, and multi-slot isolation.

## 2. Target Users

- **Professional developers** who need a fast, reliable terminal with session persistence, replay, and multi-platform support (Windows, macOS, Linux, Web).
- **Platform engineers** who need observability into local runtime nodes (health, metrics, request latency) for debugging and SRE workflows.
- **AI-assisted developers** who use Codex CLI, Claude Code, Gemini CLI, or OpenCode and want native integration without leaving the terminal.
- **SDKWork ecosystem users** who need resource connectors to launch and manage SDKWork-backed execution targets from a unified terminal surface.

## 3. Goals And Non-Goals

### Goals

- Deliver a terminal product with UX fidelity matching Windows Terminal, VS Code Terminal, WezTerm, and Arc.
- Provide cross-platform desktop (Tauri 2) and web builds from a single React + TypeScript codebase.
- Persist every session as a replayable event stream with millisecond-resolution cursor and output tracking.
- Expose runtime-node health and Prometheus metrics for production observability.
- Secure session credentials with OS keyring + AES-256-GCM encryption + TTL + multi-slot isolation.
- Integrate AI CLIs (Codex, Claude Code, Gemini, OpenCode) as first-class discovery and launch targets.
- Achieve commercial deployment readiness: CI gates, SBOM, signed releases, supply-chain integrity.

### Non-Goals

- SDKWork Terminal does not replace SSH clients or full remote desktop tools; it focuses on terminal sessions and resource connector workflows.
- SDKWork Terminal does not implement its own shell; it hosts the user's native shell (PowerShell, bash, zsh, sh).
- SDKWork Terminal does not provide backend IAM, billing, or organization management; those are owned by SDKWork platform services.
- SDKWork Terminal does not generate SDK output or API contracts; those are owned by sdkwork-specs and generator tooling.

## 4. Scope

### In Scope

- Desktop application: Windows (x64), macOS (universal), Linux (x64 AppImage).
- Web application: browser-delivered bundle for cloud deployment profile.
- Rust runtime: PTY management, session runtime, replay store (SQLite), resource connectors, AI CLI host, observability, runtime-node HTTP server.
- TypeScript frontend: React shell, terminal viewport (xterm.js), session center, resource panel, AI CLI panel, diagnostics panel, settings panel, i18n (zh-CN, en-US).
- Security: OS keyring credential store, AES-256-GCM encrypted session envelopes, Tauri IPC capability scoping, CSP hardening.
- Observability: `/healthz`, `/readyz`, `/livez`, `/metrics` (Prometheus text format), health status state machine (Serving/Degraded/NotServing).
- Release: SBOM generation, checksum verification, signature validation, frozen-lockfile CI.

### Out of Scope

- Mobile native terminals (iOS/Android native) — web bundle covers mobile browsers.
- Backend API servers — runtime-node is a local HTTP server, not a cloud backend.
- IDE integration (VS Code extension) — may be a future phase.

## 5. User Scenarios

### Scenario 1: Local Development Session

A developer opens SDKWork Terminal, creates a new terminal tab, and the native shell (PowerShell/bash) launches. They run commands, resize the terminal, and switch between tabs. When they close the app and reopen it, the session is restored from the secure session store with full replay history.

### Scenario 2: Remote Runtime Node Observation

A platform engineer starts the runtime-node HTTP server on a remote edge node. They curl `/healthz` to verify liveness, `/readyz` to verify readiness, and scrape `/metrics` with Prometheus to track HTTP request latency, session count, and health gauge over time.

### Scenario 3: AI CLI Integration

A developer opens the AI CLI panel, which discovers installed CLIs (Codex, Claude Code, Gemini, OpenCode) and shows their version and authentication status. They click "Launch" to start a Codex session in a new terminal tab, with the CLI's working directory set to the current project.

### Scenario 4: Resource Connector Launch

A developer selects a resource connector execution target from the resource panel. The terminal resolves the launch plan, executes the connector phases, and attaches the resulting session to a new terminal tab with full replay and SSE streaming.

### Scenario 5: Multi-Slot Session Isolation

A developer uses separate session slots for "work" and "personal" contexts. Each slot has an independently encrypted session envelope with its own TTL. When the "work" slot expires, the "personal" slot remains active.

## 6. Success Metrics

- **UX fidelity**: Terminal rendering, input latency, and scrollback performance match Windows Terminal / WezTerm on the same hardware (measured by terminal-fidelity-probe and terminal-panel-stack-performance tests).
- **Session persistence**: 100% of sessions are restorable from the secure session store within TTL window (measured by session-persistence-contract and session-recovery-probe tests).
- **Observability coverage**: `/healthz`, `/readyz`, `/livez`, and `/metrics` endpoints are contract-tested and expose the canonical metric series (`runtime_node_health_status`, `runtime_node_http_requests_total`, `runtime_node_http_request_duration_seconds`).
- **Security posture**: CSP blocks script injection vectors; capability follows least-privilege; session envelopes are AES-256-GCM encrypted with per-slot key isolation; all assertions verified by contract tests.
- **CI quality gate**: `cargo test --workspace`, `cargo clippy -D warnings`, `pnpm test`, `pnpm lint` all pass on every commit; frozen-lockfile enforced; SBOM generated for releases.
- **Commercial readiness**: Signed releases with checksum verification; supply-chain evidence documented; deployment profiles (cloud, standalone) validated.

## 7. Phases

### Phase 0 — Foundation (current)

- Cross-platform desktop shell (Tauri 2 + React + TypeScript)
- Rust runtime: PTY, session runtime, replay store (SQLite), resource connectors, AI CLI host
- Observability crate: health, metrics, common labels
- Runtime-node HTTP server: `/healthz`, `/readyz`, `/livez`, `/metrics`
- Secure session store: OS keyring + AES-256-GCM + versioning + TTL + multi-slot
- Tauri IPC hardening: capability scoping, CSP, command whitelist
- i18n: zh-CN, en-US catalogs with parameter interpolation
- CI: cargo test, clippy, pnpm test, lint, verify

### Phase 1 — Commercial Release

- Signed release pipeline (Windows MSI, macOS DMG, Linux AppImage)
- SBOM generation and supply-chain evidence
- Web bundle deployment (cloud profile)
- Auto-update channel (STABLE)
- Telemetry opt-in with privacy-preserving metrics

### Phase 2 — Ecosystem Integration

- SDKWork resource connector marketplace
- Plugin system for third-party terminal panels
- Cloud sync for session snapshots (opt-in)
- Team sharing for replay histories

## 8. Linked Requirements

- `sdkwork-specs/SOUL.md` — execution principles
- `sdkwork-specs/SECURITY_SPEC.md` — authentication, authorization, token storage, CSP
- `sdkwork-specs/HEALTH_CHECK_SPEC.md` — `/healthz`, `/readyz`, `/livez`, `/metrics` contracts
- `sdkwork-specs/OBSERVABILITY_SPEC.md` — tracing, metrics, common labels
- `sdkwork-specs/DEPLOYMENT_SPEC.md` — securityContext, deployment profiles
- `sdkwork-specs/SUPPLY_CHAIN_SECURITY_SPEC.md` — SBOM, signing, checksums
- `sdkwork-specs/GITHUB_WORKFLOW_SPEC.md` — CI gates
- `sdkwork-specs/DOCUMENTATION_SPEC.md` — Canon documentation structure

## 9. Open Questions

- Should SDKWork Terminal support terminal multiplexer protocols (tmux/zellij) natively, or delegate to hosted CLIs?
- What is the telemetry opt-in granularity (anonymous usage vs. error reports vs. performance metrics)?
- Should the web bundle support WebContainer-based local PTY, or require a remote runtime-node for all web sessions?
- Should multi-slot session store support per-slot TTL customization in the UI, or keep it CLI-only?
