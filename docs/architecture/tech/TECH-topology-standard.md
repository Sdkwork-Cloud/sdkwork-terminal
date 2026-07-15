> Migrated from `docs/topology-standard.md` on 2026-06-24.
> Owner: SDKWork maintainers

Human summary. Machine contract: `specs/topology.spec.json`.

| Document | Role |
| --- | --- |
| `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_ADOPTION.md` | Shared adoption path |
| `../sdkwork-specs/APP_RUNTIME_TOPOLOGY_NAMING.md` | Naming authority |
| `configs/topology/README.md` | Profile file index |

## Archetype

**application-http-gateway**

Terminal exposes **application.public-ingress** for the web runtime bridge HTTP API and uses **platform.api-gateway** for shared SDKWork platform APIs.

## Default dev profile

**standalone.development** — `pnpm terminal:dev`

Self-hosted dev maps **application.public-ingress** to `http://127.0.0.1:9620`, matching the default `sdkwork-terminal-runtime-node` bind. `terminal-dev.mjs` autostarts **platform.api-gateway** from sibling `sdkwork-api-cloud-gateway` when `SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_AUTOSTART=true`. Current topology runners may still prepare runtime-node for private-worker validation, but `pnpm terminal:dev:web` has no `/terminal/*` Vite proxy and Browser terminal execution remains fail-closed pending the reviewed device Internal API control plane.

## Cloud development

**cloud.development** — `pnpm terminal:dev:cloud`

## Cloud production

**cloud.production** — desktop/web release builds

Public hosts: application ingress is served at `https://api.sdkwork.com/apps/sdkwork-terminal`; platform gateway is `https://api.sdkwork.com`.

## Command matrix

| Command | Profile | Target |
| --- | --- | --- |
| `pnpm terminal:dev` | standalone development | desktop (Tauri) |
| `pnpm terminal:dev:web` | standalone development | web renderer |
| `pnpm terminal:dev:cloud` | cloud development | desktop (Tauri) |
| `pnpm terminal:build` | cloud production | desktop + web release |
| `pnpm terminal:build:self-hosted` | standalone production | on-prem release |
| `pnpm topology:verify` | n/a | validate contract + profiles + dry-run |

## Client env keys

| Key | Plane | Purpose |
| --- | --- | --- |
| `VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL` | application | Reserved application ingress URL; it must not configure the legacy Browser runtime bridge |
| `VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL` | platform | Platform SDK / IAM base URL |
| `VITE_SDKWORK_TERMINAL_RUNTIME_*` | retired Browser runtime | Ignored by Browser terminal composition; legacy runtime-node target configuration is blocked |
| `VITE_SDKWORK_TERMINAL_CLIENT_DESKTOP_RENDERER_HTTP_URL` | client dev | Tauri Vite host URL |
| `VITE_SDKWORK_TERMINAL_CLIENT_WEB_RENDERER_HTTP_URL` | client dev | Browser Vite host URL |

Retired keys (removed from profiles and client code): `VITE_API_BASE_URL`, `VITE_TERMINAL_RUNTIME_BASE_URL`.

The shared topology profiles do not select a remote runtime workspace or authority. Browser terminal launch remains unavailable until the approved device Internal API control plane supplies a server-authorized target and session grant at runtime. The product-local `/terminal/api/v1` and `/terminal/stream/v1` paths remain private-worker only.

## Packaging

Desktop release targets are declared in `specs/topology.spec.json` → `packaging.targets` and kept aligned with `apps/sdkwork-terminal-pc/tools/release/resolve-desktop-release-plan.mjs`.

## Validation

```bash
pnpm topology:verify
pnpm topology:validate
node scripts/terminal-dev.mjs --dry-run
```
