# Deployments

This git repository root does not host deployment descriptors directly. Deployable artifacts for the terminal runtime are owned by the PC application surface.

## Active deployment paths

| Path | Purpose |
| --- | --- |
| [`apps/sdkwork-terminal-pc/deployments/docker/`](../apps/sdkwork-terminal-pc/deployments/docker/) | `runtime-node` container image and compose example |
| [`apps/sdkwork-terminal-pc/deployments/k8s/runtime-node/`](../apps/sdkwork-terminal-pc/deployments/k8s/runtime-node/) | Helm chart for `runtime-node` |

Desktop release packaging is orchestrated through GitHub Actions (`.github/workflows/release.yml`) and topology packaging targets in [`specs/topology.spec.json`](../specs/topology.spec.json).

## Why deployments are app-scoped

Per [`SDKWORK_WORKSPACE_SPEC.md`](../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md), `deployments/` belongs at the capability owner. This multi-app repository keeps Rust runtime and container/K8s descriptors with the PC app that builds and ships `runtime-node`.
