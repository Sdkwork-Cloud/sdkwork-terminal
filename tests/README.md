# Tests

Cross-package verification for the `sdkwork-terminal` git repository root.

| Test file | Purpose |
| --- | --- |
| [`terminal-topology.test.mjs`](./terminal-topology.test.mjs) | Topology spec, profile env alignment, satellite client bootstrap contracts |
| [`repository-structure.test.mjs`](./repository-structure.test.mjs) | Root layout, README presence, standards documentation links |

Application-level tests live under each app root (for example `apps/sdkwork-terminal-pc/tests/`).

Run from repository root:

```bash
pnpm topology:test
node --test tests/repository-structure.test.mjs
pnpm verify
```
