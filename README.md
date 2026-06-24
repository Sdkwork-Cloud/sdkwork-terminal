# SDKWork Terminal

Multi-surface SDKWork client application for terminal session management. This git repository hosts PC (React + Tauri), H5, and Flutter mobile application roots that consume platform SDKs and embed a local terminal runtime.

Canonical standards: [`../sdkwork-specs/README.md`](../sdkwork-specs/README.md). Agent entrypoint: [`AGENTS.md`](./AGENTS.md).

## Repository classification

| Layer | Owned here | Notes |
| --- | --- | --- |
| Platform IAM / app APIs | No | Consumed via generated `@sdkwork/appbase-app-sdk` |
| Platform API gateway | No | Referenced in topology; sibling `sdkwork-api-cloud-gateway` repo |
| Local terminal runtime HTTP | Yes | `runtime-node` Axum service at `/terminal/api/v1` |
| Desktop Tauri bridge | Yes | In-process via `sdkwork-terminal-protocol` |
| Platform OpenAPI authorities | No | No root `apis/` directory |

This is primarily a **client application repository** with a co-located **local runtime microservice**, not a platform `app-api` / `backend-api` backend repository.

## Active directory layout

Per [`SDKWORK_WORKSPACE_SPEC.md`](../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md), this narrow-purpose multi-app repository uses the following top-level dictionary:

| Directory | Status | Purpose |
| --- | --- | --- |
| [`apps/`](./apps/) | Active | Application roots: PC, H5, Flutter mobile |
| [`configs/`](./configs/) | Active | Topology profile env files |
| [`specs/`](./specs/) | Active | Repository contracts (`topology.spec.json`, alignment docs) |
| [`scripts/`](./scripts/) | Active | Thin topology orchestration entrypoints |
| [`tests/`](./tests/) | Active | Cross-package topology and repository structure tests |
| [`docs/`](./docs/) | Active | Repository-level documentation |
| [`.sdkwork/`](./.sdkwork/) | Active | Source-controlled workspace metadata |
| `deployments/` | Pointer | See [`deployments/README.md`](./deployments/README.md) — deployables live under PC app root |
| `apis/` | Intentionally absent | No owned HTTP/RPC API contracts |
| `crates/` | Under PC app | Rust crates at `apps/sdkwork-terminal-pc/crates/` |
| `apis/` | Under PC app | Local runtime contract at `apps/sdkwork-terminal-pc/apis/` |
| `sdks/` | Under PC app | Consumer-only posture at `apps/sdkwork-terminal-pc/sdks/` |
| `tools/` | Under PC app | Verification and release tooling |
| `jobs/`, `examples/`, `plugins/` | Intentionally absent | Not required for current product scope |

## Application roots

| Root | Framework | Manifest |
| --- | --- | --- |
| [`apps/sdkwork-terminal-pc/`](./apps/sdkwork-terminal-pc/) | React + Tauri | `sdkwork.app.config.json` |
| [`apps/sdkwork-terminal-h5/`](./apps/sdkwork-terminal-h5/) | React + Vite | `sdkwork.app.config.json` |
| [`apps/sdkwork-terminal-flutter-mobile/`](./apps/sdkwork-terminal-flutter-mobile/) | Flutter | `sdkwork.app.config.json` |

PC application architecture exceptions: [`apps/sdkwork-terminal-pc/specs/GOVERNANCE_EXCEPTIONS.md`](./apps/sdkwork-terminal-pc/specs/GOVERNANCE_EXCEPTIONS.md).

## Framework integration posture

| Framework | Required when | This repository |
| --- | --- | --- |
| `sdkwork-web-framework` | Platform HTTP `*-api` surfaces | **N/A** — no platform APIs; local `runtime-node` documented exception |
| `sdkwork-database` | Platform relational persistence | **N/A** — embedded SQLite for local session/replay state |
| `sdkwork-discovery` | RPC/gRPC services | **N/A** — no RPC services |
| `sdkwork-utils` | Cross-language shared helpers | **Aligned** — `terminal-pc-commons` + `runtime-node` |

Details: [`specs/architecture-alignment.md`](./specs/architecture-alignment.md).

## Development

From repository root:

```bash
pnpm install
pnpm dev              # Desktop (delegates to PC workspace + topology)
pnpm dev:web          # Web renderer
pnpm topology:verify  # Topology contract + orchestration dry-run
pnpm verify           # Full repository verification
```

PC workspace commands run from `apps/sdkwork-terminal-pc/` — see [`apps/sdkwork-terminal-pc/README.md`](./apps/sdkwork-terminal-pc/README.md).

## Runtime topology

Topology contract: [`specs/topology.spec.json`](./specs/topology.spec.json) (`@sdkwork/app-topology` v2, archetype `application-http-gateway`).

Profile env files: [`configs/topology/`](./configs/topology/).

## Verification

```bash
pnpm verify
```

CI runs `pnpm topology:verify`, workspace structure tests, typecheck, build, and Tauri check — see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

