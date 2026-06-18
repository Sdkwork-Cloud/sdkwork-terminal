# SDKWork Terminal Runtime Topology

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

**self-hosted.split-services.development** — `pnpm terminal:dev`

Self-hosted dev maps **application.public-ingress** to `http://127.0.0.1:9620`, matching the default `sdkwork-terminal-runtime-node` bind. `terminal-dev.mjs` autostarts **platform.api-gateway** from sibling `sdkwork-api-gateway` when `SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_AUTOSTART=true`. Start runtime-node separately when exercising the web runtime bridge (`pnpm terminal:dev:web`).

## Cloud development

**cloud-hosted.split-services.development** — `pnpm terminal:dev:cloud`

## Cloud production

**cloud-hosted.split-services.production** — desktop/web release builds

Public hosts: application ingress is served at `https://api.sdkwork.com/apps/sdkwork-terminal`; platform gateway is `https://api.sdkwork.com`.

## Command matrix

| Command | Profile | Target |
| --- | --- | --- |
| `pnpm terminal:dev` | self-hosted split dev | desktop (Tauri) |
| `pnpm terminal:dev:web` | self-hosted split dev | web renderer |
| `pnpm terminal:dev:cloud` | cloud split dev | desktop (Tauri) |
| `pnpm terminal:build` | cloud split prod | desktop + web release |
| `pnpm terminal:build:self-hosted` | self-hosted split prod | on-prem release |
| `pnpm topology:verify` | n/a | validate contract + profiles + dry-run |

## Client env keys

| Key | Plane | Purpose |
| --- | --- | --- |
| `VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL` | application | Web runtime bridge base URL |
| `VITE_SDKWORK_TERMINAL_PLATFORM_API_GATEWAY_HTTP_URL` | platform | Platform SDK / IAM base URL |
| `VITE_SDKWORK_TERMINAL_RUNTIME_WORKSPACE_ID` | application runtime | Web shell remote runtime workspace |
| `VITE_SDKWORK_TERMINAL_RUNTIME_AUTHORITY` | application runtime | Web shell remote runtime authority |
| `VITE_SDKWORK_TERMINAL_CLIENT_DESKTOP_RENDERER_HTTP_URL` | client dev | Tauri Vite host URL |
| `VITE_SDKWORK_TERMINAL_CLIENT_WEB_RENDERER_HTTP_URL` | client dev | Browser Vite host URL |

Retired keys (removed from profiles and client code): `VITE_API_BASE_URL`, `VITE_TERMINAL_RUNTIME_BASE_URL`.

## Packaging

Desktop release targets are declared in `specs/topology.spec.json` → `packaging.targets` and kept aligned with `apps/sdkwork-terminal-pc/tools/release/resolve-desktop-release-plan.mjs`.

## Validation

```bash
pnpm topology:verify
pnpm topology:validate
node scripts/terminal-dev.mjs --dry-run
```
