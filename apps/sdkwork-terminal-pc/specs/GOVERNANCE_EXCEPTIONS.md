# SDKWork Terminal PC - Architecture Exceptions

This document records architecture exceptions for the PC application root per `GOVERNANCE_SPEC.md` §3.

## Exception Record: Multi-Sub-App Architecture

```yaml
id: EX-2026-PC-001
spec: APP_PC_ARCHITECTURE_SPEC.md
rule: Single-root src/ bootstrap layout
owner: sdkwork-terminal-team
reason: >
  The PC application uses a multi-sub-app monorepo pattern with apps/web/ and
  apps/desktop/ as separate application roots, sharing packages/ and crates/
  layers. This architecture was established before the APP_PC_ARCHITECTURE_SPEC
  was finalized and provides:
  
  1. Clear separation between web and desktop build targets
  2. Independent deployment pipelines for web and desktop
  3. Shared Rust crates for terminal core functionality
  4. Tauri-specific build isolation in packages/sdkwork-terminal-pc-desktop/
  
  Refactoring to single-root would require:
  - Merging apps/web/ and apps/desktop/ into a single src/ bootstrap
  - Moving all Tauri-specific code into the single root
  - Restructuring the build pipeline for both targets
  - Risk of breaking existing desktop and web builds
risk: >
  Inconsistent with other SDKWork applications (Flutter, H5) that follow the
  single-root pattern. May cause confusion for developers working across
  multiple SDKWork applications.
expires_at: 2026-12-31
removal_plan: >
  Phase 1 (Q3 2026): Create unified src/ bootstrap that delegates to web/
  and desktop/ sub-apps — DONE (pass 6–7): shared bootstrap, src/surfaces/web-app.tsx,
  sub-app entrypoints are thin hosts.
  Phase 2 (Q4 2026): Migrate web/ content into src/ — web App DONE (pass 7);
  desktop modules remain in apps/desktop/src until TypeScript package-boundary migration.
  Phase 3 (Q4 2026): Migrate desktop/ content into src/ with Tauri-specific
  conditional compilation
  Phase 4 (Q1 2027): Remove apps/web/ and apps/desktop/ subdirectories
```

## Exception Record: Package Naming Without `pc` Segment

```yaml
id: EX-2026-PC-002
spec: APP_PC_ARCHITECTURE_SPEC.md
rule: Package directory names MUST include the product code and the pc surface segment
owner: sdkwork-terminal-team
reason: >
  Existing packages were named before the pc segment requirement was established.
  Packages like sdkwork-terminal-core, sdkwork-terminal-shell, etc. are deeply
  integrated into the build system and have external dependencies.
risk: >
  Non-conformant naming may cause confusion when comparing with other SDKWork
  applications that follow the pc segment convention.
expires_at: 2026-12-31
removal_plan: >
  Phase 1 (Q3 2026): Create pc-segment aliases for all packages — DONE (pass 6).
  Phase 2 (Q4 2026): Update all imports to use pc-segment names — DONE (pass 7):
  authored TypeScript uses @sdkwork/terminal-pc-*; legacy aliases remain for compatibility.
  Phase 3 (Q1 2027): Remove legacy non-pc-segment package names
```

## Exception Record: Duplicate Sub-App Entrypoints

```yaml
id: EX-2026-PC-003
spec: APP_PC_ARCHITECTURE_SPEC.md
rule: Single-root index.html, tsconfig.json, vite.config.ts without duplicate sub-app entrypoints
owner: sdkwork-terminal-team
reason: >
  Root-level bootstrap files now exist (index.html, tsconfig.json, vite.config.ts),
  but apps/web/ and apps/desktop/ still maintain surface-specific copies during the
  multi-sub-app migration (EX-2026-PC-001).
risk: >
  Duplicate entrypoints may confuse tooling until the single-root migration completes.
expires_at: 2026-12-31
removal_plan: >
  Sub-app entrypoints remain during EX-2026-PC-001 migration. Pass 6 unified
  Vite config via tools/vite/create-terminal-app-vite-config.mjs; duplicate HTML
  configs remain until Phase 4 (Q1 2027).
```

## Exception Status

| Exception | Status | Review Date |
|-----------|--------|-------------|
| EX-2026-PC-001 | Active | 2026-09-30 |
| EX-2026-PC-002 | Active | 2026-09-30 |
| EX-2026-PC-003 | Active (narrowed) | 2026-09-30 |

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
- [x] Migration implementation started (bootstrap wired into web/desktop entrypoints; runtime-node auth; topology orchestration)
