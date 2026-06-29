# SDKWork Terminal Architecture Alignment

Alignment matrix for `sdkwork-terminal` against canonical [`sdkwork-specs`](../sdkwork-specs/README.md). Last reviewed: 2026-06-27 (alignment pass 13; root + PC `pnpm verify` green; code redundancy elimination completed; all tests pass).

## Summary

| Area | Status | Evidence |
| --- | --- | --- |
| Agent entrypoints (`AGENTS.md`, shims) | Aligned | Root + app roots |
| `.sdkwork/` workspace metadata | Aligned | Root + PC/H5/Flutter app roots |
| Runtime topology (`@sdkwork/app-topology` v2) | Aligned | `specs/topology.spec.json` |
| Component specs (`component.spec.json`) | Aligned | 30 PC components + H5/Flutter app roots |
| PC architecture (`APP_PC_ARCHITECTURE_SPEC`) | Aligned | Single-root `src/entries`, `index.{web,desktop}.html`, bootstrap in `@sdkwork/terminal-pc-core` |
| Cross-client alignment | Aligned | H5/Flutter companion shells + PC topology + IAM bootstrap |
| Platform SDK integration (IAM) | Aligned | Generated `@sdkwork/iam-app-sdk` |
| `sdkwork-web-framework` | N/A (exception for local runtime) | See � Framework integration |
| `sdkwork-database` | N/A | Embedded SQLite for local state |
| `sdkwork-discovery` | N/A | No RPC/gRPC services |
| `sdkwork-utils` | **Enhanced** | `@sdkwork/utils` in `terminal-pc-commons`; `sdkwork-utils-rust` with new `platform.rs` module (normalize_cpu_arch, detect_platform_family); crates `runtime-node`, `ai-cli-host` updated to use shared utilities |
| Deployment / packaging | Aligned | Docker/K8s + GitHub release workflows; checksums finalized by release pipeline |
| Security / IAM | Aligned | AuthGate, TokenManager, desktop keyring session storage, runtime-node loopback auth |
| Smoke / CP07-5 evidence | Partial | Automated probes green; manual web remote-runtime smoke + recovery review pending |
| Testing / verification | Aligned | Root `pnpm verify` + PC `pnpm verify`; **all 117 tests pass**; clippy clean; fmt clean |

## Code Quality & Redundancy Elimination

### Phase 3 Completed - Code Reuse Achieved

**New `sdkwork-utils-rust/src/platform.rs` module added:**
- `normalize_cpu_arch()` - Standardizes CPU architecture strings (x86_64→x64, aarch64→arm64)
- `detect_platform_family()` - Detects current platform (windows/macos/linux)
- `detect_runtime_node_platform_family()` - Server deployment specific
- `detect_desktop_platform_family()` - Desktop deployment specific

**Crates Updated:**
- `sdkwork-terminal-runtime-node/src/lib.rs` - Removed duplicate `normalize_cpu_arch()`, uses `sdkwork_utils_rust::normalize_cpu_arch`
- `sdkwork-terminal-ai-cli-host/src/lib.rs` - Removed duplicate implementations, now uses `detect_desktop_platform_family()` and `format_datetime(now())` from sdkwork-utils-rust

**Benefits:**
- ~70 lines of duplicate code eliminated
- Consistent behavior across all platforms
- Future maintenance simplified (single source of truth)

## Verification Commands

```bash
# Repository root
pnpm topology:verify
node --test tests/repository-structure.test.mjs
pnpm verify

# PC application workspace
cd apps/sdkwork-terminal-pc
node tools/scripts/align-component-specs.mjs   # repair component.spec.json paths if needed
node --test tests/component-spec-alignment.test.mjs
node --test tests/sdkwork-terminal-utils-standard.test.mjs
pnpm verify
cargo test --workspace          # ✓ All 117 tests pass
cargo clippy --workspace --tests -- -D warnings  # ✓ Clean
cargo fmt --all --check        # ✓ Passes
cargo build --release         # ✓ Builds successfully
```
