# SDKWork Terminal H5 Specs

Component-local specifications for the H5 application root.

Canonical platform standards: [`../../../../sdkwork-specs/README.md`](../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-terminal-h5` |
| Type | `application` |
| Domain | `device` |
| Surface | `app` |

## Files

- [`component.spec.json`](./component.spec.json) — machine-readable contract
- [`GOVERNANCE_EXCEPTIONS.md`](./GOVERNANCE_EXCEPTIONS.md) — satellite surface exceptions (when present)

## Verification

Run from `apps/sdkwork-terminal-h5/`:

```bash
pnpm typecheck
pnpm test
```
