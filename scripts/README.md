# Scripts

Thin command entrypoints for repository-level topology orchestration. Business build logic remains in application workspaces.

| Script | Purpose |
| --- | --- |
| [`terminal-dev.mjs`](./terminal-dev.mjs) | Development orchestration (runtime-node, desktop, web renderers) |
| [`terminal-build.mjs`](./terminal-build.mjs) | Production build orchestration by hosting profile |
| [`lib/terminal-topology.mjs`](./lib/terminal-topology.mjs) | Topology profile loading and gateway spawn planning |

Invoked from root `package.json` as `terminal:dev`, `terminal:build`, `dev`, `build`, etc.
