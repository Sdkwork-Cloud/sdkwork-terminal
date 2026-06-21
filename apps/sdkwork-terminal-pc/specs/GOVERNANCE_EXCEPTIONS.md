# SDKWork Terminal PC - Architecture Exceptions

This document records architecture exceptions for the PC application root per `GOVERNANCE_SPEC.md` §3.

## Exception Record: Multi-Sub-App Architecture

```yaml
id: EX-2026-PC-001
spec: APP_PC_ARCHITECTURE_SPEC.md
rule: Single-root src/ bootstrap layout
owner: sdkwork-terminal-team
status: resolved
resolved_at: 2026-06-21
reason: >
  Resolved in alignment pass 11. Web and desktop surfaces now build from the PC
  application root via index.web.html / index.desktop.html, src/entries/*, and
  vite.config.{web,desktop}.mjs. Legacy apps/web/ and apps/desktop/ sub-app
  directories were removed.
removal_plan: >
  Completed Phase 4 (pass 11): single-root Vite entries, unified scripts, Tauri
  frontendDist -> dist/desktop, bootstrap moved to @sdkwork/terminal-pc-core.
```

## Exception Record: Package Naming Without `pc` Segment

```yaml
id: EX-2026-PC-002
spec: APP_PC_ARCHITECTURE_SPEC.md
rule: Package directory names MUST include the product code and the pc surface segment
owner: sdkwork-terminal-team
status: resolved
resolved_at: 2026-06-18
reason: >
  Resolved in alignment pass 9. Authored TypeScript uses @sdkwork/terminal-pc-*;
  legacy vite/tsconfig aliases were removed.
```

## Exception Record: Duplicate Sub-App Entrypoints

```yaml
id: EX-2026-PC-003
spec: APP_PC_ARCHITECTURE_SPEC.md
rule: Single-root index.html, tsconfig.json, vite.config.ts without duplicate sub-app entrypoints
owner: sdkwork-terminal-team
status: resolved
resolved_at: 2026-06-21
reason: >
  Resolved in alignment pass 11 with EX-2026-PC-001. Surface-specific HTML and
  Vite configs now live only at the PC application root.
```

## Exception Record: PC Infrastructure Package Role Split

```yaml
id: EX-2026-PC-004
spec: APP_PC_ARCHITECTURE_SPEC.md
rule: pc-core owns SDK factories, TokenManager, IAM runtime, and application bootstrap wiring
owner: sdkwork-terminal-team
reason: >
  IAM/SDK/bootstrap wiring now lives in @sdkwork/terminal-pc-core/src/bootstrap/.
  terminal-pc-infrastructure retains the local runtime bridge, generated
  terminal-local-runtime-app-sdk consumption, and SSE transport for runtime streams.
risk: >
  Developers may look for runtime bridge code in pc-core unless this split is
  documented.
expires_at: 2027-06-30
removal_plan: >
  Evaluate folding terminal-pc-infrastructure runtime bridge into pc-core or a
  dedicated pc-runtime package once local runtime API stabilizes.
```

## Exception Status

| Exception | Status | Review Date |
|-----------|--------|-------------|
| EX-2026-PC-001 | Resolved (pass 11) | 2026-12-31 |
| EX-2026-PC-002 | Resolved (pass 9) | 2026-12-31 |
| EX-2026-PC-003 | Resolved (pass 11) | 2026-12-31 |
| EX-2026-PC-004 | Active (narrowed) | 2026-12-31 |

## Migration Tracking

Migration progress is tracked in the following documents:
- `docs/step/` - Step-by-step implementation plans
- `docs/review/` - Review evidence and decisions

## Compliance Checklist

- [x] Exception records created per GOVERNANCE_SPEC.md §3
- [x] Owner identified for each exception
- [x] Risk assessment documented
- [x] Expiry date set (2026-12-31)
- [x] Removal plan documented with phases
- [x] Phase 4 single-root migration completed (pass 11)
