# SDKWork Terminal â€?Architecture Alignment

Alignment matrix for `sdkwork-terminal` against canonical [`sdkwork-specs`](../sdkwork-specs/README.md). Last reviewed: 2026-06-21 (alignment pass 9).

## Summary

| Area | Status | Evidence |
| --- | --- | --- |
| Agent entrypoints (`AGENTS.md`, shims) | Aligned | Root + app roots |
| `.sdkwork/` workspace metadata | Aligned | Root + PC/H5/Flutter app roots |
| Runtime topology (`@sdkwork/app-topology` v2) | Aligned | `specs/topology.spec.json` |
| Component specs (`component.spec.json`) | Aligned | 31 PC components + H5/Flutter app roots |
| PC architecture (`APP_PC_ARCHITECTURE_SPEC`) | Partial â€?Phase 4 pending | `terminal-pc-desktop` surface package; `@sdkwork/terminal-pc-*` taxonomy; thin sub-app hosts remain |
| Cross-client alignment | Aligned | H5/Flutter/PC topology + IAM bootstrap + component specs |
| Platform SDK integration (IAM) | Aligned | Generated `@sdkwork/appbase-app-sdk` |
| `sdkwork-web-framework` | N/A (exception for local runtime) | See Â§ Framework integration |
| `sdkwork-database` | N/A | Embedded SQLite for local state |
| `sdkwork-discovery` | N/A | No RPC/gRPC services |
| `sdkwork-utils` | Aligned | `@sdkwork/utils` in `terminal-pc-commons`; `sdkwork-utils-rust` in `runtime-node` |
| Deployment / packaging | Aligned | Docker/K8s + GitHub release workflows |
| Security / IAM | Aligned | AuthGate, TokenManager, secure session storage |
| Testing / verification | Aligned | `pnpm verify`, CI matrix |

## Framework integration

### `sdkwork-web-framework`

**Mandatory scope** (`WEB_FRAMEWORK_SPEC.md`): platform HTTP `open-api`, `app-api`, `backend-api`, gateways, and `sdkwork-*-api-server` processes.

**This repository**: does not own platform HTTP APIs. The local `sdkwork-terminal-runtime-node` service exposes `/terminal/api/v1` for session/PTY/replay using Axum directly.

**Posture**: documented exception **EX-2026-REPO-002** in [`GOVERNANCE_EXCEPTIONS.md`](./GOVERNANCE_EXCEPTIONS.md). Revisit when the terminal runtime API becomes a published platform `*-api` surface.

### `sdkwork-database`

**Mandatory scope** (`DATABASE_SPEC.md`): platform relational persistence with SQLx repositories and migrations.

**This repository**: uses embedded `rusqlite` in `sdkwork-terminal-session-runtime` and optional replay recovery paths â€?appropriate for local client/runtime state, not platform data services.

**Posture**: not required. No action until Terminal owns shared platform persistence.

### `sdkwork-discovery`

**Mandatory scope**: RPC/gRPC service registration and discovery.

**This repository**: no `.proto` files, no `tonic`/`grpc` dependencies. Internal contracts use `sdkwork-terminal-protocol` (serde).

**Posture**: not required. Integrate when RPC services are added.

### `sdkwork-utils`

**Mandatory scope**: cross-language shared helpers (string, crypto, id, validation) consumed through `@sdkwork/utils` and `sdkwork-utils-rust` instead of ad-hoc duplicates.

**This repository**: `terminal-pc-commons` re-exports `isBlank` from `@sdkwork/utils/string` and centralizes `extractErrorMessage`; `runtime-node` validates request fields with `sdkwork_utils_rust::is_blank`.

**Posture**: integrated for TypeScript commons, release checksum tooling, and Rust runtime-node validation.

## API and SDK integration

| API surface | Integration pattern | Compliant |
| --- | --- | --- |
| Platform IAM (appbase) | Generated `@sdkwork/appbase-app-sdk` via `src/bootstrap/sdkClients.ts` | Yes |
| Platform API gateway | Topology env keys + sibling `sdkwork-api-gateway` | Yes |
| Local terminal runtime `/terminal/api/v1` | Generated `@sdkwork/terminal-local-runtime-app-sdk` + OpenAPI parity tests | Yes |
| Drive SDK | Not declared in workspace (unused dependency removed) | Re-add when Drive features ship |

## Project structure

See root [`README.md`](../README.md) for the active directory dictionary. PC app owns `apis/` (local runtime contract), `crates/`, `sdks/` consumer posture, `deployments/`, and `tools/`.

## Deployment and packaging

| Concern | Standard | Implementation |
| --- | --- | --- |
| Topology profiles | `APP_RUNTIME_TOPOLOGY_SPEC.md` | 4 profiles in `configs/topology/` |
| Desktop release matrix | `RELEASE_SPEC.md`, topology packaging | `specs/topology.spec.json` â†?`resolve-desktop-release-plan.mjs` |
| Container runtime | `DEPLOYMENT_SPEC.md` | `apps/sdkwork-terminal-pc/deployments/docker/` |
| K8s runtime | `DEPLOYMENT_SPEC.md` | `apps/sdkwork-terminal-pc/deployments/k8s/runtime-node/` |
| CI verification | `GITHUB_WORKFLOW_SPEC.md`, `TEST_SPEC.md` | `.github/workflows/ci.yml` |

## Code,åˆ†åŒ…, performance, security, testing

| Concern | Standard | Status |
| --- | --- | --- |
| Code style | `CODE_STYLE_SPEC.md`, language specs | Enforced via lint/typecheck/cargo fmt/clippy in PC workspace |
| Package taxonomy | `APP_PC_ARCHITECTURE_SPEC.md` | `sdkwork-terminal-pc-*` packages; legacy import aliases removed (pass 9) |
| UI layering | `FRONTEND_SPEC.md`, `APP_PC_REACT_UI_SPEC.md` | UI â†?service â†?SDK in PC packages |
| Performance | `PERFORMANCE_SPEC.md` | Terminal viewport/replay tests in PC workspace |
| Security | `SECURITY_SPEC.md`, `IAM_LOGIN_INTEGRATION_SPEC.md` | AuthGate, no raw Access-Token env, runtime auth token for runtime-node |
| Testing | `TEST_SPEC.md` | Workspace structure, topology, shell integration, Rust tests |

## Governance exceptions

| ID | Scope | Document |
| --- | --- | --- |
| EX-2026-REPO-001 | Narrow multi-app root layout | [`GOVERNANCE_EXCEPTIONS.md`](./GOVERNANCE_EXCEPTIONS.md) |
| EX-2026-REPO-002 | Local runtime without `sdkwork-web-framework` | [`GOVERNANCE_EXCEPTIONS.md`](./GOVERNANCE_EXCEPTIONS.md) |
| EX-2026-REPO-003 | Local runtime OpenAPI without generated SDK | Resolved (pass 5) â€?[`GOVERNANCE_EXCEPTIONS.md`](./GOVERNANCE_EXCEPTIONS.md) |
| EX-2026-PC-001..003 | PC app surface exceptions | [`apps/sdkwork-terminal-pc/specs/GOVERNANCE_EXCEPTIONS.md`](../apps/sdkwork-terminal-pc/specs/GOVERNANCE_EXCEPTIONS.md) |

## Verification commands

```bash
# Repository root
pnpm topology:verify
node --test tests/repository-structure.test.mjs
pnpm verify

# PC application workspace
cd apps/sdkwork-terminal-pc
node tools/scripts/align-component-specs.mjs   # repair component.spec.json paths if needed
node --test tests/component-spec-alignment.test.mjs
node --test tests/sdkwork-terminal-utils-standard.test.mjs
pnpm verify
cargo test --workspace
cargo clippy --workspace --tests -- -D warnings
```
