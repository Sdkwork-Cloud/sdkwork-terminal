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
  and desktop/ sub-apps
  Phase 2 (Q4 2026): Migrate web/ content into src/ and update build pipeline
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
  Phase 1 (Q3 2026): Create pc-segment aliases for all packages
  Phase 2 (Q4 2026): Update all imports to use pc-segment names
  Phase 3 (Q1 2027): Remove legacy non-pc-segment package names
```

## Exception Record: Missing Root-Level Files

```yaml
id: EX-2026-PC-003
spec: APP_PC_ARCHITECTURE_SPEC.md
rule: Root must have index.html, tsconfig.json, vite.config.ts
owner: sdkwork-terminal-team
reason: >
  These files exist in sub-apps (apps/web/ and apps/desktop/) rather than at
  the root level. The root serves as a workspace container rather than a
  direct application root.
risk: >
  Build tools and IDE configurations may not work as expected at the root level.
expires_at: 2026-12-31
removal_plan: >
  As part of the single-root migration (EX-2026-PC-001), these files will be
  consolidated at the root level.
```

## Exception Status

| Exception | Status | Review Date |
|-----------|--------|-------------|
| EX-2026-PC-001 | Active | 2026-09-30 |
| EX-2026-PC-002 | Active | 2026-09-30 |
| EX-2026-PC-003 | Active | 2026-09-30 |

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
- [ ] Migration implementation started (pending)
