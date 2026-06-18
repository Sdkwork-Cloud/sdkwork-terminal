# SDKWork Workspace

This `.sdkwork/` directory is source-controlled workspace metadata for `sdkwork-terminal`.

It is governed by [`../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`](../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md) and follows the standards entrypoint at [`../sdkwork-specs/README.md`](../sdkwork-specs/README.md).

Authoritative local entries:

- `README.md`: purpose and ownership for this workspace metadata directory.
- `skills/README.md`: repository skill contribution guidance.
- `plugins/README.md`: repository plugin contribution guidance.

This directory is not runtime state. Do not store generated SDK transport output, secrets, local credentials, runtime databases, cache, logs, or user-private files here.

## Execution References

- Agent entrypoint: [`AGENTS.md`](../AGENTS.md)
- Shared execution soul: [`../sdkwork-specs/SOUL.md`](../sdkwork-specs/SOUL.md)
- Workspace metadata standard: [`../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`](../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md)
