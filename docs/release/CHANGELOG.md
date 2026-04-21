# Changelog

## 0.2.58 - Project-Aware CLI Launch And TUI Scrollback Hardening

### Changed

- Refactored `@sdkwork/terminal-shell` into explicit launch, chrome, runtime, overlay, and state modules so the desktop/web host surface is componentized around stable shell contracts instead of one oversized entry file.
- Added project-aware CLI launch flows for desktop hosts: launch requests can now resolve a single project directly, open a built-in project picker for multiple projects, or fall back to the native working-directory picker when no project catalog is available.
- Added launch-project persistence helpers and public shell contract types for project collections, activation events, and removal/clear callbacks so third-party desktop hosts can integrate project-aware Codex / Claude Code / Gemini CLI / OpenCode entrypoints consistently.

### Fixed

- Fixed the TUI scrollback regression where alternate-screen, synchronized-output, mouse-reporting, and destructive redraw control sequences were still written raw into xterm, breaking Codex-style transcript scrolling after release/runtime hydration.
- Fixed replay gap repair so full-surface TUI rebuilds now rehydrate a linearized transcript instead of restoring raw control sequences back into the viewport.
- Fixed the release-validation blind spot by proving the packaged Windows desktop host still builds and launches cleanly after the shell/runtime refactor and project-launch changes.

### Verified

- `node --experimental-strip-types --test tests/runtime-tab-controller.test.ts`
- `pnpm verify:terminal-runtime`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm verify:windows-release`

## 0.2.57 - Third-Party Consumer Tarball Smoke Baseline

### Changed

- Added a packed-tarball third-party consumer fixture for `@sdkwork/terminal-shell`, including a minimal React/Vite host template under `tests/fixtures/third-party-shell-consumer`.
- Added an automated smoke test that packs `@sdkwork/terminal-shell`, extracts the tarball into an isolated consumer `node_modules`, then type-checks and builds that external host.
- Extended package documentation and review evidence so the published shell contract now requires proof from a real consumer fixture, not only workspace-local package builds.

### Fixed

- Fixed the remaining verification gap where the package could be packed successfully but still lacked proof that an external host could consume the tarball without workspace aliases.
- Fixed the standardization gap where third-party integration correctness depended on monorepo-local assumptions instead of an explicit packed-consumer baseline.

### Verified

- `node --test tests/shell-third-party-consumer-smoke.test.mjs`
- `node --test tests/shell-integration-surface.test.ts tests/shell-app-render.test.ts tests/desktop-package-boundary.test.ts tests/workspace-structure.test.mjs`
- `corepack pnpm --filter @sdkwork/terminal-shell run build`
- `corepack pnpm --filter @sdkwork/terminal-web build`
- `corepack pnpm --filter @sdkwork/terminal-desktop build`
- `node --test --experimental-strip-types tests/release-plan.test.mjs tests/release-assets.test.mjs tests/release-workflows.test.mjs`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `corepack pnpm pack` in `packages/sdkwork-terminal-shell`

## 0.2.56 - Terminal Shell Component Package Distribution Hardening

### Changed

- Reworked `@sdkwork/terminal-shell` into a real component package that publishes only `dist/` plus `README.md`, with ESM entrypoints for the root module and `./integration`.
- Added package-owned declaration files for the public shell contract so hosts integrate against stable shell interfaces instead of workspace source internals.
- Added a package build pipeline that emits runtime bundles, bundled terminal stylesheet assets, and a Windows-safe `prepack` launcher for `pnpm pack`.
- Added a component package distribution review record and extended the package contract tests to lock the new export, build, and prepack surface.

### Fixed

- Fixed the third-party packaging gap where `@sdkwork/terminal-shell` still exported `src/*.ts(x)` files directly, forcing consumers onto workspace-style source resolution instead of a publishable package boundary.
- Fixed public type leakage where the shell package contract depended on infrastructure workspace types instead of a package-owned integration surface.
- Fixed Windows `pnpm pack` instability where the lifecycle script could fail because `node` was not available in the lifecycle `PATH`.

### Verified

- `corepack pnpm --filter @sdkwork/terminal-shell run build`
- `node --test tests/shell-integration-surface.test.ts tests/shell-app-render.test.ts tests/desktop-package-boundary.test.ts tests/workspace-structure.test.mjs`
- `corepack pnpm --filter @sdkwork/terminal-web build`
- `corepack pnpm --filter @sdkwork/terminal-desktop build`
- `corepack pnpm pack` in `packages/sdkwork-terminal-shell`

## 0.2.55 - Remove Node24 Compatibility Override From Workflows

### Changed

- Removed `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` from both `ci.yml` and `release-reusable.yml` now that the repository no longer depends on Node20-based GitHub Actions.
- Tightened the workflow contract test so both CI and release workflows explicitly reject the removed compatibility override.

### Fixed

- Fixed the final workflow maintenance debt where release automation still depended on a temporary environment override even after the underlying action versions had been upgraded.
- Fixed a hidden coupling risk where future contributors could assume the compatibility flag remained required, masking the actual supported workflow baseline.

### Verified

- `node --test --experimental-strip-types tests/release-plan.test.mjs tests/release-assets.test.mjs tests/release-workflows.test.mjs`

## 0.2.54 - Release Workflow Node24 Alignment

### Changed

- Upgraded the GitHub release workflow to use current artifact and release actions: `actions/upload-artifact@v7`, `actions/download-artifact@v8`, and `softprops/action-gh-release@v3`.
- Tightened the workflow contract test so the repository now locks the new action major versions and rejects the previous Node20-based versions.

### Fixed

- Fixed the remaining GitHub Actions deprecation warnings in the desktop release pipeline that were caused by `upload-artifact@v4`, `download-artifact@v4`, and `softprops/action-gh-release@v2` still targeting the deprecated Node 20 runtime.
- Fixed a release-maintenance gap where the workflow could stay green but still carry upstream runtime deprecation noise that would eventually become operational risk.

### Verified

- `node --test --experimental-strip-types tests/release-plan.test.mjs tests/release-assets.test.mjs tests/release-workflows.test.mjs`

## 0.2.53 - Third-Party Integration Surface And Packaging Contract

### Changed

- Added a stable public integration surface for `@sdkwork/terminal-shell`, including `ShellAppProps`, explicit desktop/web runtime client types, working-directory picker options, and dedicated `DesktopShellApp` / `WebShellApp` wrappers.
- Added explicit package entrypoints for `@sdkwork/terminal-shell/integration` and `@sdkwork/terminal-shell/styles.css`, and switched the desktop and web hosts to consume those public entrypoints directly.
- Added browser-side integration helpers for clipboard and runtime-target environment resolution so external hosts can integrate the terminal shell without copying internal host logic.
- Added a package-level README, a third-party integration review record, and an architecture standard that define the supported integration boundary and no-deep-import rule.
- Added package distribution constraints through `files` and `sideEffects` so published tarballs retain only the supported surface and consumer bundlers preserve terminal styling.

### Fixed

- Fixed a packaging boundary gap where terminal shell styles depended on implicit side-effect imports inside the component module instead of an explicit public stylesheet contract.
- Fixed a Vite workspace alias resolution bug where `@sdkwork/terminal-shell/styles.css` could be swallowed by the root shell alias and resolve to an invalid `index.tsx/styles.css` path.
- Fixed host integration drift where the web host duplicated browser clipboard and runtime-target parsing logic locally instead of using a package-owned integration contract.
- Fixed the absence of a documented package distribution contract, which made third-party consumption vulnerable to deep imports, tree-shaken style loss, and version-line drift across sibling terminal packages.

### Verified

- `node --test tests/shell-integration-surface.test.ts tests/shell-app-render.test.ts tests/desktop-package-boundary.test.ts tests/workspace-structure.test.mjs`
- `node --experimental-strip-types tests/release-plan.test.mjs tests/release-assets.test.mjs tests/release-workflows.test.mjs`
- `node node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`
- `node node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc --noEmit -p apps/desktop/tsconfig.json`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `node tools/scripts/run-web-vite.mjs build`
- `node tools/scripts/run-vite-host.mjs build`
- `node tools/scripts/run-tauri-cli.mjs build --config src-tauri/tauri.release.conf.json --bundles msi,nsis`
- `pnpm pack --pack-destination .tmp-pack` in `packages/sdkwork-terminal-shell`
- Local Windows release artifacts:
  - `target/release/bundle/msi/sdkwork-terminal_0.2.53_x64_en-US.msi`
  - `target/release/bundle/nsis/sdkwork-terminal_0.2.53_x64-setup.exe`

## 0.2.52 - Desktop Launch, Release Parity, And Runtime Input Hardening

### Changed

- Added a dedicated shell stylesheet and desktop HTML bootstrap contract so packaged desktop builds keep the same terminal viewport, scrollbar, helper-textarea, and dark-surface behavior as `tauri:dev`.
- Hardened desktop launch profiles around working-directory selection, WSL discovery refresh, and fallback prompt rendering so launcher flows preserve more context and degrade explicitly instead of silently failing.
- Hardened local Tauri build/dev wrappers so release packaging and dev startup use explicit Node-backed commands, portable generated config overlays, and a dev-only desktop identity split.

### Fixed

- Fixed large paste handling so terminal paste no longer silently truncates and no longer splits surrogate-pair characters across chunk boundaries.
- Fixed the desktop working-directory picker path so the host waits with a bounded timeout and the profile menu now surfaces a visible launch error when directory selection fails.
- Fixed WSL launch discovery so a transient probe failure does not immediately erase previously discovered distributions, and stale discovery now remains visible as an explicit product status.
- Fixed Windows release startup so packaged desktop builds run under the GUI subsystem instead of spawning an extra console window.

### Verified

- `node --test tests/desktop-bootstrap-contract.test.mjs tests/desktop-host-commands.test.ts tests/run-tauri-cli.test.mjs tests/tauri-dev-script.test.mjs tests/workspace-structure.test.mjs tests/runtime-terminal-stage.test.ts tests/terminal-stage-shared.test.ts tests/terminal-view-driver.test.ts tests/terminal-viewport-presentation-effects.test.ts tests/terminal-viewport-interaction-handlers.test.ts tests/terminal-react-stability.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/runtime-tab-controller.test.ts tests/terminal-clipboard.test.ts tests/terminal-hidden-input-bridge.test.ts tests/terminal-shortcuts.test.ts`
- `node node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`
- `node node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/bin/tsc --noEmit -p apps/desktop/tsconfig.json`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `node tools/scripts/run-tauri-cli.mjs build --config src-tauri/tauri.release.conf.json`
- Local Windows release artifacts:
  - `target/release/bundle/msi/sdkwork-terminal_0.2.52_x64_en-US.msi`
  - `target/release/bundle/nsis/sdkwork-terminal_0.2.52_x64-setup.exe`

## 0.2.51 - Desktop Terminal Release Consolidation

### Changed

- Consolidated the unpublished `2026-04-10 v0.2.41` through `v0.2.50` release candidate notes, the `2026-04-11 v0.2.40-*` terminal/runtime increment notes, and the current desktop CLI working-directory picker changes into one formal release line.
- Desktop AI CLI launch entries now require a native folder picker before opening `Codex / Claude Code / Gemini CLI / OpenCode` terminal tabs, and the selected path is injected into the local-process bootstrap request and initial tab state.
- Desktop session-center, runtime-tab orchestration, clipboard routing, PTY/runtime replay flow, shell-stage composition, and runtime-node/web bridge work accumulated in the unpublished notes are now covered by one release summary instead of scattered point documents.
- Workspace, web, and desktop command entrypoints are now wrapped in explicit Node-backed launcher scripts so local Windows verification does not depend on recursive `pnpm`, bare `tsc`, bare `vite`, or child-process PATH lookup.
- Tauri build and dev invocations now materialize a temporary explicit-node config overlay before execution, keeping `beforeBuildCommand` and `beforeDevCommand` stable in local release environments.

### Fixed

- Fixed the product gap where desktop AI CLI entries opened a shell tab and still required manual command entry instead of entering the target CLI in the chosen working directory.
- Fixed Windows user-facing path leakage by normalizing working-directory strings before they are shown back to the UI, preventing raw `\\?\` prefixes from surfacing in the desktop terminal product path.
- Fixed the desktop host permission surface so the app-owned bridge now explicitly grants the folder-picker command needed by the desktop launcher flow.
- Fixed local Windows release validation where nested `pnpm` and static Tauri `beforeBuildCommand` / `beforeDevCommand` strings could fail before bundling started.

### Verified

- `node --experimental-strip-types tests/workspace-structure.test.mjs`
- `node --experimental-strip-types tests/desktop-runtime-bridge.test.ts`
- `node --experimental-strip-types tests/desktop-session-center.test.ts`
- `node --experimental-strip-types tests/session-center.test.ts`
- `node --experimental-strip-types tests/sessions-panel.test.ts`
- `node --experimental-strip-types tests/desktop-package-boundary.test.ts`
- `node --experimental-strip-types tests/desktop-resource-catalog-state.test.ts`
- `node --experimental-strip-types tests/desktop-session-center-overlay.test.ts`
- `node --experimental-strip-types tests/desktop-session-center-refresh-machine.test.ts`
- `node --experimental-strip-types tests/desktop-session-center-refresh-policy.test.ts`
- `node --experimental-strip-types tests/desktop-session-replay-preload-policy.test.ts`
- `node --experimental-strip-types tests/shell-runtime.test.ts`
- `node --experimental-strip-types tests/desktop-tauri-permissions.test.ts`
- `node --experimental-strip-types tests/shell-app-render.test.ts`
- `node --experimental-strip-types tests/shell-tabs.test.ts`
- `node --experimental-strip-types tests/tauri-dev-script.test.mjs`
- `node --experimental-strip-types tests/terminal-view-driver.test.ts`
- `node --experimental-strip-types tests/runtime-tab-controller-store.test.ts`
- `node --experimental-strip-types tests/runtime-tab-controller.test.ts`
- `node --experimental-strip-types tests/runtime-terminal-stage.test.ts`
- `node --experimental-strip-types tests/session-center-menu-status.test.ts`
- `node --experimental-strip-types tests/terminal-clipboard.test.ts`
- `node --experimental-strip-types tests/terminal-hidden-input-bridge.test.ts`
- `node --experimental-strip-types tests/terminal-host-lifecycle.test.ts`
- `node --experimental-strip-types tests/terminal-host-status-descriptor.test.ts`
- `node --experimental-strip-types tests/terminal-host-status-model.test.ts`
- `node --experimental-strip-types tests/terminal-host-status-overlay.test.ts`
- `node --experimental-strip-types tests/terminal-host-surface.test.ts`
- `node --experimental-strip-types tests/terminal-react-stability.test.ts`
- `node --experimental-strip-types tests/terminal-runtime-session-binding.test.ts`
- `node --experimental-strip-types tests/terminal-runtime-status.test.ts`
- `node --experimental-strip-types tests/terminal-runtime-status-overlay.test.ts`
- `node --experimental-strip-types tests/terminal-search-overlay.test.ts`
- `node --experimental-strip-types tests/terminal-shortcuts.test.ts`
- `node --experimental-strip-types tests/terminal-stage-shared.test.ts`
- `node --experimental-strip-types tests/terminal-viewport-context-menu.test.ts`
- `node --experimental-strip-types tests/terminal-viewport-chrome.test.ts`
- `node --experimental-strip-types tests/terminal-viewport-interaction-handlers.test.ts`
- `node --experimental-strip-types tests/terminal-viewport-presentation-effects.test.ts`
- `node --experimental-strip-types tests/terminal-viewport-surface.test.ts`
- `node --experimental-strip-types tests/run-tauri-cli.test.mjs`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `node tools/scripts/run-tauri-cli.mjs build --config src-tauri/tauri.release.conf.json --bundles msi,nsis`
- Local Windows release artifacts:
  - `target/release/bundle/msi/sdkwork-terminal_0.2.51_x64_en-US.msi`
  - `target/release/bundle/nsis/sdkwork-terminal_0.2.51_x64-setup.exe`

## Unreleased - Runtime Derived State Tabs-Reference Cache

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now caches `createRuntimeDerivedState(...)` results by `snapshot.tabs` reference through a `WeakMap`, so repeated `ShellApp` rerenders with unchanged terminal snapshot tabs reuse the same derived maps, candidate lists, and effect keys.
- `tests/shell-app-render.test.ts` now locks the runtime-derived-state cache contract, including cache lookup, early return on hit, and cache write on miss.
- `docs/release/2026-04-11-v0.2.40-runtime-derived-state-tabs-reference-cache.md` now archives this increment.

### Fixed

- Reduced repeated `Map` and candidate-array rebuilding during pure UI rerenders such as menu open/close, window-control state changes, and other non-shell state updates.
- Reduced one more avoidable `ShellApp` main-thread cost on `new tab` and high-output layouts when the terminal snapshot itself has not changed between rerenders.
- Preserved existing runtime effect semantics while making derived-state construction reference-stable for unchanged snapshot tabs.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Replay Batch Model-Level Single-Pass Apply

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` now exposes `applyTerminalShellReplayBatches(...)`, which reuses the replay-tab apply logic while updating multiple queued runtime replay batches through one shell-state pass.
- `packages/sdkwork-terminal-shell/src/model.ts` now shares replay application logic through an internal tab-level helper, so single-batch and multi-batch replay paths stay behaviorally aligned.
- `packages/sdkwork-terminal-shell/src/index.tsx` now flushes desktop runtime replay queues through `applyTerminalShellReplayBatches(...)` instead of chaining `applyTerminalShellReplayEntries(...)` with `reduce(...)`.
- `tests/shell-tabs.test.ts` and `tests/shell-app-render.test.ts` now lock the multi-batch replay contract, stale-batch state-identity bailout, and the model-layer single-pass flush path.
- `docs/release/2026-04-11-v0.2.40-replay-batch-model-level-single-pass-apply.md` now archives this increment.

### Fixed

- Reduced repeated shell-state and tab-array cloning when one animation-frame flush contains replay batches for multiple PTY sessions.
- Reduced one more predictable main-thread spike during `new tab`, replay catch-up, and concurrent multi-tab runtime output.
- Preserved replay ordering and per-tab stale-entry suppression while moving the multi-batch apply path into the model layer.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Indexed Tab Replacement And No-Op State Bailout

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` now resolves tab position through `getTabIndexOrThrow(...)` and replaces only the addressed tab entry with `slice()` + indexed assignment instead of rebuilding the whole tab array with `map(...)` for every single-tab update.
- `packages/sdkwork-terminal-shell/src/model.ts` now returns the original `TerminalShellState` when a `withTab(...)` update resolves to the same tab object, so stale replay batches and other no-op tab updates stop forcing shell-level state churn.
- `tests/shell-tabs.test.ts` now locks both contracts: stale replay must preserve shell state identity, and `withTab(...)` must stay on the indexed replacement path.
- `docs/release/2026-04-11-v0.2.40-indexed-tab-replacement-and-no-op-state-bailout.md` now archives this increment.

### Fixed

- Reduced hot-path work during PTY replay, input, resize, and per-tab state transitions by removing one predictable full-array callback traversal from every single-tab update.
- Reduced avoidable React state churn when replay batches arrive stale or otherwise resolve to a true no-op for the target tab.
- Preserved existing tab semantics and targeted-tab correctness while tightening the shell model update path.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Runtime Replay Direct Entry Scan

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` now scans `replay.entries` directly inside `applyTerminalShellReplayEntries(...)` and skips stale entries by cursor in-loop, instead of allocating a filtered replay array up front.
- `tests/shell-tabs.test.ts` now locks the direct-entry-scan contract and rejects the older `replay.entries.filter(...)` path.
- `docs/release/2026-04-11-v0.2.40-runtime-replay-direct-entry-scan.md` now archives this increment.

### Fixed

- Reduced one replay-batch allocation on the PTY catch-up path.
- Reduced avoidable array-copy churn when a replay batch contains a mix of already-acked and newly-arrived entries.
- Preserved cursor advancement, replay ordering, and duplicate suppression semantics while tightening the replay scan path.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Runtime Replay Chunk Join Aggregation

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` now collects replay batch output into `runtimeOutputChunks` and appends the raw runtime payload to `runtimeTerminalContent` with one `join("")` per batch instead of repeated per-entry string concatenation.
- `tests/shell-tabs.test.ts` now locks the replay chunk aggregation contract and rejects the older per-entry `runtimeTerminalContent += entry.payload` path.
- `docs/release/2026-04-11-v0.2.40-runtime-replay-chunk-join-aggregation.md` now archives this increment.

### Fixed

- Reduced repeated string-copy pressure when one replay batch contains many PTY output entries.
- Reduced one more hot-path cost during desktop runtime replay and catch-up repair under bursty output.
- Preserved replay ordering, truncation behavior, exit markers, and raw VT fidelity while changing only the batch concatenation strategy.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Shell Snapshot State Cache

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` now caches `TerminalShellSnapshot` objects by immutable shell state reference, so repeated reads of the same state reuse the shell-level snapshot wrapper and `tabs` array.
- `tests/shell-tabs.test.ts` now locks the shell-level snapshot cache contract in addition to the existing per-tab snapshot reuse contract.
- `docs/release/2026-04-11-v0.2.40-shell-snapshot-state-cache.md` now archives this increment.

### Fixed

- Reduced repeated shell snapshot wrapping work when the same `TerminalShellState` is read multiple times in one render/update cycle.
- Reduced avoidable `tabs.map(...)` allocation and `activeTab` lookup churn on hot UI paths that read the same state more than once.
- Preserved existing per-tab snapshot reuse behavior while extending caching to the shell snapshot envelope.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Active Runtime Append Frame Batching

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now batches active runtime append writes per frame inside `TerminalStage`, instead of issuing one `driver.writeRaw(appendedContent)` call for every incremental `runtimeTerminalContent` growth.
- `packages/sdkwork-terminal-shell/src/index.tsx` now clears pending append batches when a tab becomes inactive, when runtime mode switches, or when a full reset sync is required, so batched appends cannot replay after a reset path.
- `tests/shell-app-render.test.ts` now locks the active-runtime append batching contract and the reset-path queue clearing contract.
- `docs/release/2026-04-11-v0.2.40-active-runtime-append-frame-batching.md` now archives this increment.

### Fixed

- Reduced active-tab xterm write frequency during high-output PTY bursts.
- Reduced another `new tab`, restore, and runtime startup stutter path caused by issuing many tiny append writes on the visible terminal.
- Preserved full-sync correctness by forcing reset/re-activate paths to clear queued append data before writing the latest full runtime content.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Xterm Mutation Write Serialization

### Changed

- `packages/sdkwork-terminal-infrastructure/src/index.ts` now serializes `render(...)`, `reset()`, and `writeRaw(...)` through one internal terminal-mutation queue so xterm resets and writes cannot overlap out of order.
- `packages/sdkwork-terminal-infrastructure/src/index.ts` now routes content writes through `writeTerminalContent(...)`, giving full refresh and runtime raw writes the same completion boundary.
- `tests/terminal-view-driver.test.ts` now locks the mutation-queue contract and rejects driver implementations that issue unsynchronized reset/write paths.
- `docs/release/2026-04-11-v0.2.40-xterm-mutation-write-serialization.md` now archives this increment.

### Fixed

- Reduced a remaining high-output race where active-tab reset and append writes could interleave and produce stale frames, duplicated content, or transient cursor drift.
- Reduced one more freeze source during `new tab`, tab restore, and rapid runtime replay bursts by making driver-side terminal mutations deterministic.
- Preserved the existing terminal appearance and PTY-first runtime behavior while tightening mutation ordering inside the xterm adapter.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Runtime Replay Transcript Cold Cache

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` now clears the tab adapter transcript when a PTY/runtime session is bound, so runtime tabs stop carrying a second buffered transcript alongside the real xterm stream.
- `packages/sdkwork-terminal-shell/src/model.ts` now keeps `applyTerminalShellReplayEntries(...)` on the raw `runtimeTerminalContent` path for runtime-stream tabs and skips adapter transcript writes/search refresh in that mode.
- `tests/shell-tabs.test.ts` now locks the runtime-tab contract: replay output lives in `runtimeTerminalContent`, while the adapter-backed snapshot transcript stays cold for runtime-rendered tabs.
- `docs/release/2026-04-11-v0.2.40-runtime-replay-transcript-cold-cache.md` now archives this increment.

### Fixed

- Reduced duplicate transcript work during PTY replay, where runtime output was previously stored both in the real terminal stream and in the adapter snapshot model.
- Reduced per-event terminal-core line rebuilding and snapshot churn during `new tab`, busy shell startup, and high-output runtime sessions.
- Kept runtime restore correctness by preserving raw VT payloads in `runtimeTerminalContent`, which remains the source of truth for active and reactivated runtime tabs.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Runtime Effect Candidate Tab Preselection

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now preselects `runtimeBootstrapCandidateTabs` and `runtimePendingInputTabs` inside `createRuntimeDerivedState(...)` so the bootstrap and pending-input effects no longer rescan every tab after their effect keys change.
- `tests/shell-app-render.test.ts` now locks the candidate-tab preselection contract for runtime bootstrap and runtime-input flush effects.
- `docs/release/2026-04-11-v0.2.40-runtime-effect-candidate-tab-preselection.md` now archives this increment.

### Fixed

- Reduced follow-up full-array scans inside bootstrap and pending-input effects, especially when most tabs are already stable running sessions.
- Reduced more deterministic main-thread work during `new tab`, retry, and queued-input flush paths by iterating only the relevant candidate tabs.
- Preserved existing bootstrap and pending-input behavior while tightening the effect work set.

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Shell Snapshot Runtime-Derived Single-Pass Aggregation

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now derives runtime effect keys and the per-tab snapshot lookup map through one `createRuntimeDerivedState(...)` pass instead of scanning `snapshot.tabs` multiple times per render.
- `resolveTabSnapshotById(...)` now resolves through the derived `snapshotTabById` map instead of repeated linear lookup.
- `tests/shell-app-render.test.ts` now locks the single-pass runtime-derived-state contract and rejects the older per-key full-array scan pattern.
- `docs/release/2026-04-11-v0.2.40-shell-snapshot-runtime-derived-single-pass-aggregation.md` now archives this increment.

### Fixed

- Reduced render-time main-thread work during busy PTY output by collapsing repeated `snapshot.tabs` effect-key scans into a single traversal.
- Reduced repeated tab lookup overhead in runtime repair paths by reusing the derived snapshot-by-id map.
- Preserved existing shell behavior while removing one more predictable source of `new tab` and tab-switch sluggishness.

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Session Replay In-Flight Deduplication

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now tracks in-flight replay repair requests per runtime session and skips overlapping `sessionReplay` calls for the same session while one request is already pending.
- The in-flight replay set is cleared on unmount and released in `finally`, so replay repair can resume cleanly after each request completes.
- `tests/shell-app-render.test.ts` now locks the replay in-flight deduplication contract.
- `docs/release/2026-04-11-v0.2.40-session-replay-in-flight-deduplication.md` now archives this increment.

### Fixed

- Reduced one more desktop freeze path where timer-based catch-up and subscription-triggered catch-up could issue overlapping replay pulls against the same session.
- Reduced avoidable PTY replay pressure and duplicate repair work during `new tab`, tab switching, and burst-output recovery windows.
- Preserved existing replay repair semantics by deduplicating only concurrent requests for the same session.

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Runtime Replay Poll Backoff After Live Subscription

### Changed

- `packages/sdkwork-terminal-shell/src/runtime.ts` now treats healthy live-subscription coverage as a steady-state path and backs replay polling off to `1500ms` instead of keeping the same high-frequency interval used for recovery.
- Recovery polling remains at `120ms` whenever subscriptions are unavailable, incomplete, or already marked failed, so replay catch-up still stays aggressive while the runtime stream is not trustworthy.
- `tests/shell-runtime.test.ts` now locks the steady-state poll-backoff contract and the explicit `1500ms` interval.
- `docs/release/2026-04-11-v0.2.40-runtime-replay-poll-backoff-after-live-subscription.md` now archives this increment.

### Fixed

- Reduced one persistent desktop performance drain where every bound terminal tab kept calling `sessionReplay` at high frequency even after live runtime subscriptions were already healthy.
- Reduced avoidable `new tab`, tab-switch, and high-output contention caused by replay polling competing with the live PTY event path in stable sessions.
- Preserved fast replay recovery for missing or degraded subscriptions instead of globally slowing the safety path.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Desktop Runtime Replay Frame Batching

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now batches live desktop runtime replay events per frame through `queueDesktopRuntimeReplay(...)` and `flushQueuedDesktopRuntimeReplay(...)` instead of applying every PTY stream entry synchronously on arrival.
- Desktop attachment acknowledgement now advances once per queued batch with `batch.maxSequence`, keeping the ack cursor aligned with the last replay entry actually flushed into shell state.
- `tests/shell-app-render.test.ts` now locks the frame-batched replay contract and its batch-level acknowledgement sequence.
- `docs/release/2026-04-11-v0.2.40-desktop-runtime-replay-frame-batching.md` now archives this increment.

### Fixed

- Reduced one more `new tab`, tab-switch, and high-output freeze path caused by routing every live PTY replay event through immediate shell-state application.
- Reduced per-event React scheduling pressure during busy desktop sessions by coalescing replay writes onto the next animation frame.
- Removed the stale source-contract assertion that still expected per-entry desktop acknowledgement after the replay path had already moved to batch-level flushing.

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Terminal Interaction Priority Split

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now splits shell state updates into two paths: direct synchronous updates for user interactions and deferred transition updates for runtime replay, async bootstrap, and queued runtime flush completion.
- `tests/shell-app-render.test.ts` now locks the dual-helper contract so `updateShellState(...)` remains direct while `updateShellStateDeferred(...)` owns `startTransition(...)`.
- `docs/release/2026-04-11-v0.2.40-terminal-interaction-priority-split.md` now archives this increment.

### Fixed

- Reduced the chance that `new tab`, tab switching, and direct keyboard interaction would feel stalled because all shell state changes were previously routed through one transition-only update path.
- Reduced the chance that asynchronous runtime replay and bootstrap bookkeeping would compete with immediate user-triggered shell interactions on the same scheduling lane.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Desktop PTY Input Unblock and Helper Textarea Hardening

### Changed

- `packages/sdkwork-terminal-shell/src/runtime.ts` now treats a bound `running` PTY session as immediately interactive, so desktop keystrokes no longer wait for the first PTY repaint before bypassing or flushing the runtime input queue.
- `packages/sdkwork-terminal-shell/src/index.tsx` now hardens the xterm helper textarea with fixed off-screen positioning, 1px box sizing, zero opacity, and disabled pointer events to avoid visible caret leakage in the top-left corner.
- `tests/shell-runtime.test.ts` now locks the contract that desktop PTY input stays live before the first frame once the session is already `running`.
- `tests/shell-app-render.test.ts` now locks the hardened helper-textarea CSS contract.
- `docs/release/2026-04-11-v0.2.40-desktop-pty-input-unblock-and-helper-textarea-hardening.md` now archives this increment.

### Fixed

- Fixed a desktop interaction stall where typed input could remain queued indefinitely until the PTY emitted its first replay/output frame, making the terminal appear present but unusable.
- Fixed the desktop startup path where prefilled CLI tabs or immediate user typing could look frozen even though the PTY session had already entered `running`.
- Fixed one visible-caret regression path by forcing xterm's hidden helper textarea completely out of the visible viewport.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Windows Split-Enter PTY Verification Alignment

### Changed

- `crates/sdkwork-terminal-pty-runtime/tests/local_shell_session_runtime.rs` now gives the Windows split-enter PTY assertion the same 10-second output collection window already tolerated by the passing host-level interactive tests.
- Added a test comment explaining that Windows PowerShell can spend extra time repainting split-enter input before final command output lands on the PTY stream.
- `docs/release/2026-04-11-v0.2.40-windows-split-enter-pty-verification-alignment.md` now archives this increment.

### Fixed

- Removed a false-negative Windows PTY test signal where the local runtime split-enter assertion could fail even though the same enter-separated interaction already passed through `runtime-node` host coverage.
- Re-aligned local PTY verification with the real desktop/server host timing envelope used by current product paths.

### Verified

- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime -- --nocapture`
- `cargo test -p sdkwork-terminal-runtime-node --test runtime_node_host_test -- --nocapture`

## Unreleased - Workbench Lazy Driver Initialization and Desktop Dev Smoke

### Changed

- `packages/sdkwork-terminal-workbench/src/index.tsx` now lazily initializes both `createWorkbenchTerminalStage()` and `createXtermViewportDriver()`, so the workbench package no longer repeats stage or driver factory work on every render.
- `tests/terminal-core-workbench.test.ts` now locks the lazy-initialization contract for workbench stage and xterm driver refs.
- Desktop dev startup was smoke-validated through the real `node tools/scripts/run-tauri-dev.mjs` path, confirming that the Vite host becomes reachable and `sdkwork-terminal-desktop-host.exe` starts successfully.
- `docs/release/2026-04-11-v0.2.40-workbench-lazy-init-and-dev-smoke.md` now archives this increment.

### Fixed

- Reduced the same eager-ref render overhead pattern from surviving inside `sdkwork-terminal-workbench`.
- Reduced the chance that future workbench-based panels reintroduce `new tab`-like xterm factory churn after the shell package was hardened.
- Confirmed that the current `pnpm dev` desktop startup path is functional, instead of only passing static script/config checks.

### Verified

- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`
- Controlled smoke: `node tools/scripts/run-tauri-dev.mjs` reached `http://127.0.0.1:1420` and launched `sdkwork-terminal-desktop-host.exe`

## Unreleased - Terminal Stage Lazy Xterm Driver Initialization

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now lazily initializes the per-tab xterm viewport driver inside `TerminalStage`, so render passes no longer execute `createXtermViewportDriver()` for tabs that already own a stable driver instance.
- `tests/shell-app-render.test.ts` now locks the lazy driver initialization contract and rejects the old eager `useRef(createXtermViewportDriver())` pattern.
- `docs/release/2026-04-11-v0.2.40-terminal-stage-lazy-driver-init.md` now archives this increment.

### Fixed

- Reduced `new tab` and tab-switch render overhead caused by re-running the xterm driver factory on every `TerminalStage` render.
- Reduced avoidable per-render allocation pressure in the active terminal surface, especially while runtime status, replay, or command-buffer state causes frequent React updates.
- Reduced one more source of UI stalls without changing PTY, xterm attach, or terminal interaction semantics.

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Terminal Core Snapshot Reference Cache

### Changed

- `packages/sdkwork-terminal-core/src/index.ts` now caches `TerminalSnapshot` by immutable `TerminalCoreState` identity, so repeated reads against the same terminal state reuse both the snapshot object and its `visibleLines` slice by reference.
- `tests/terminal-core-workbench.test.ts` now locks the unchanged-state snapshot reuse contract at terminal-core level instead of only at shell snapshot level.
- `docs/release/2026-04-11-v0.2.40-terminal-core-snapshot-cache.md` now archives this increment.

### Fixed

- Reduced snapshot churn inside terminal-core, which previously recreated workbench-facing snapshot objects even when no terminal state had changed.
- Reduced avoidable downstream rerender pressure for xterm/workbench consumers that rely on snapshot reference stability during repeated reads.
- Reduced one remaining contributor to `new tab` and tab-switch sluggishness under repeated shell snapshot polling.

### Verified

- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Terminal Bootstrap Effect Narrowing and Dark Theme Alignment

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` now exposes `resolveTerminalShellRuntimeBootstrapRequestFromTab(...)`, so runtime bootstrap requests can be derived from a tab snapshot instead of reaching back into the full shell state tree.
- `packages/sdkwork-terminal-shell/src/model.ts` now caches `TerminalShellTabSnapshot` objects per immutable tab-state instance plus `active/closable` shape, so repeated snapshot reads and unrelated tab updates can reuse unchanged tab snapshots by reference.
- `packages/sdkwork-terminal-shell/src/index.tsx` now derives narrow effect keys for runtime binding sync, bootstrap retries, session bootstrap, subscription/poll orchestration, and pending-input flushing, so live PTY output or command-buffer edits no longer retrigger every runtime-control effect.
- `packages/sdkwork-terminal-shell/src/index.tsx` now routes tab actions through `tabId -> latest snapshot` lookup helpers and memoizes `TerminalStage`, so inactive panels are not forced through full terminal-stage rerenders when unrelated tabs change.
- `packages/sdkwork-terminal-shell/src/index.tsx` now keeps command-submit dedupe in a `Set` ref instead of React state, so runtime submit/restart bookkeeping no longer triggers whole-app rerenders by itself.
- `packages/sdkwork-terminal-shell/src/index.tsx` now applies a neutral Windows Terminal-style dark palette: charcoal header chrome and tabs, with a near-black terminal stage.
- `packages/sdkwork-terminal-infrastructure/src/index.ts` now aligns the xterm base theme background, cursor accent, and foreground with the deeper terminal surface.
- `tests/shell-tabs.test.ts`, `tests/shell-app-render.test.ts`, and `tests/terminal-view-driver.test.ts` now lock the tab-snapshot bootstrap helper, snapshot reference reuse, memoized panel contract, narrowed bootstrap effect contract, and dark theme tokens.
- `docs/release/2026-04-11-v0.2.40-terminal-bootstrap-performance-and-theme.md` now archives this increment.

### Fixed

- Reduced desktop `new tab` startup churn caused by runtime-control effects being coupled to broad render-time tab snapshots instead of narrower bootstrap and binding state.
- Reduced the chance that typing, PTY replay, or other non-bootstrap updates would repeatedly rescan every tab for session bootstrap work.
- Reduced unnecessary inactive-tab `TerminalStage` rerenders during active-tab input, output, and `new tab` creation.
- Reduced repeated snapshot object churn for unchanged tabs, which previously made React treat dormant terminal panels as freshly changed on every shell-state update.
- Reduced no-op rerenders triggered only by command-submit pending bookkeeping.
- Fixed the tab/header color direction drifting away from the intended Windows Terminal-style gray-black chrome.
- Fixed the terminal surface staying too bright relative to the desired deep-black command area.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts`
- `pnpm typecheck`
- `pnpm tauri:check`

## Unreleased - Terminal Bootstrap Input Gating

### Changed

- `packages/sdkwork-terminal-shell/src/runtime.ts` now exposes `shouldFlushTerminalRuntimeInputQueue(...)`, separating `bypass live write` from `queue flush` so desktop PTY startup no longer flushes normal typed input before the first real shell frame arrives.
- `packages/sdkwork-terminal-shell/src/model.ts` now exposes `queueTerminalShellTabBootstrapCommand(...)`, so prefilled CLI tabs such as `codex`, `claude`, `gemini`, and `opencode` enter the same buffered runtime-input path as real user keystrokes.
- `packages/sdkwork-terminal-shell/src/index.tsx` now queues bootstrap command text instead of directly writing `commandText + Enter` into the PTY during session bind.
- `packages/sdkwork-terminal-shell/src/index.tsx` now gates desktop pending-input flush until the runtime has emitted its first PTY frame, except for protocol response traffic such as CPR/DSR replies.
- `tests/shell-runtime.test.ts`, `tests/shell-tabs.test.ts`, and `tests/shell-app-render.test.ts` now lock the bootstrap-input gating contract.
- `docs/release/2026-04-11-v0.2.40-terminal-bootstrap-input-gating.md` now archives this increment.

### Fixed

- Fixed a desktop startup race where queued input could flush as soon as the session state became `running`, even if the real shell prompt had not rendered yet.
- Fixed CLI bootstrap tabs bypassing the buffered runtime-input path and writing directly into the PTY too early.
- Reduced the risk of malformed first-command execution, duplicate-looking early echo, and unstable startup interaction during Windows Terminal-style tab bootstrap.

### Verified

- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`

## Unreleased - Runtime-Node HTTP Input Coverage

### Changed

- `crates/sdkwork-terminal-runtime-node/tests/runtime_node_http_test.rs` now verifies that `/terminal/api/v1/sessions/:id/input` still executes a command when command text and `Enter` are posted separately.
- `crates/sdkwork-terminal-runtime-node/tests/runtime_node_http_test.rs` now verifies that the same HTTP input path preserves `DEL` backspace correction before `Enter`, matching the real xterm editing pattern used by the desktop client.
- `crates/sdkwork-terminal-runtime-node/tests/runtime_node_http_test.rs` now waits for Windows shell readiness through replay polling instead of late live subscription events, and it reads a larger replay window so PowerShell prompt and syntax-highlighting noise do not hide the final token output.
- `docs/release/2026-04-11-v0.2.40-runtime-node-http-input-coverage.md` now archives this increment.

### Fixed

- Closed the remaining server-mode coverage gap between PTY runtime tests, runtime-node host tests, and the public HTTP input surface.
- Reduced the risk that runtime-node would pass host-layer interactive tests while still regressing on the actual `/input` API used by remote or service-first terminal deployments.
- Fixed a Windows test harness race where HTTP-path readiness checks could miss already-emitted shell startup events and report false negatives even though replay had already captured the real PTY bootstrap.
- Fixed a replay-window blind spot where verbose PowerShell prompt output could push the assertion token beyond the first 64 entries.

### Verified

- `cargo test -p sdkwork-terminal-runtime-node --test runtime_node_http_test -- --nocapture`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/terminal-view-driver.test.ts`

## Unreleased - Windows Interactive Probe Alignment

### Changed

- `src-tauri/src/lib.rs` now boots the desktop local-shell runtime with `LocalShellSessionRuntime::with_synthetic_probe_responses()` on Windows and keeps transparent mode on non-Windows hosts.
- `crates/sdkwork-terminal-runtime-node/src/host.rs` now applies the same Windows-only synthetic probe default to server-mode interactive PTY sessions.
- `crates/sdkwork-terminal-pty-runtime/tests/local_shell_session_runtime.rs` now verifies that an interactive shell command still executes when command text and `Enter` are written separately.
- `crates/sdkwork-terminal-runtime-node/tests/runtime_node_host_test.rs` now verifies the same split-input `Enter` behavior through the runtime-node host layer.
- `tests/runtime-host-probe-mode.test.ts` now locks the Windows probe-mode contract for both desktop and runtime-node hosts.
- `docs/release/2026-04-11-v0.2.40-windows-interactive-probe-alignment.md` now archives this increment.

### Fixed

- Fixed a Windows-only interactive PTY regression where desktop host and runtime-node host initialized shell runtimes in transparent probe mode, leaving split command input plus standalone `Enter` less reliable than the direct PTY runtime path.
- Fixed the behavioral drift between direct local PTY tests and the real desktop/server host entrypoints that actually construct interactive shell runtimes.

### Verified

- `node --experimental-strip-types --test tests/runtime-host-probe-mode.test.ts`
- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime local_shell_session_runtime_executes_command_when_enter_is_sent_separately -- --nocapture`
- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime local_shell_session_runtime_applies_backspace_edits_before_enter -- --nocapture`
- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime -- --nocapture`
- `cargo test -p sdkwork-terminal-runtime-node --test runtime_node_host_test runtime_node_host_executes_command_when_enter_is_sent_separately -- --nocapture`
- `cargo test -p sdkwork-terminal-runtime-node --test runtime_node_host_test runtime_node_host_applies_backspace_edits_before_enter -- --nocapture`
- `cargo test -p sdkwork-terminal-runtime-node --test runtime_node_host_test -- --nocapture`
- `pnpm tauri:check`

## Unreleased - Terminal Attach and Input Stability

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now lazily attaches xterm only when a terminal tab first becomes active, so hidden tabs no longer pre-open the PTY surface or pre-fit against invisible layout.
- `packages/sdkwork-terminal-shell/src/index.tsx` now hydrates the first active attach from live refs for runtime mode, title listener, input listener, snapshot, and raw PTY content, preventing stale mount-time closures from leaking into newly activated tabs.
- `packages/sdkwork-terminal-infrastructure/src/index.ts` now reserves xterm `open + fit + bindInputDisposables` for `attach(...)` only; `ensureRuntime()` no longer opens the terminal implicitly.
- `packages/sdkwork-terminal-infrastructure/src/index.ts` now keeps pre-attach `setInputListener(...)` and `setTitleListener(...)` side-effect-free, so inactive tabs do not eagerly create runtime surfaces.
- `tests/shell-app-render.test.ts` and `tests/terminal-view-driver.test.ts` now lock the lazy attach and attach-only xterm open/bind contract.
- `docs/release/2026-04-11-v0.2.40-terminal-attach-and-input-stability.md` now archives this increment.

### Fixed

- Fixed inactive tabs opening xterm against hidden panels, which could leave first activation with stale geometry, cursor drift, and broken focus recovery.
- Fixed a driver ordering bug where listener setup could pre-create runtime state before `attach(...)`, causing the real attach path to skip its `waitForNextAnimationFrame + fit + bindInputDisposables` sequence.
- Fixed desktop tabs rendering a visible terminal surface without reliably wiring live xterm input on first attach.

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/shell-runtime.test.ts tests/shell-tabs.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `pnpm tauri:check`
- Controlled `pnpm dev` startup confirmed Vite served `http://127.0.0.1:1420` and `sdkwork-terminal-desktop-host.exe` launched before the smoke process was intentionally stopped

## Unreleased - Terminal Desktop Fidelity and Dev Observability

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` now stops replaying the full raw PTY buffer on every desktop tab activation and binds xterm cursor visibility to the real bootstrap overlay state.
- `packages/sdkwork-terminal-shell/src/index.tsx` now limits fake prompt rendering and fake command execution fallback to `web local-shell` tabs only.
- `packages/sdkwork-terminal-infrastructure/src/index.ts` now applies cursor visibility during xterm theme creation, preventing pre-stream cursor leakage.
- `packages/sdkwork-terminal-shell/src/model.ts` now keeps real runtime tabs transcript-empty until actual PTY/replay bytes arrive, reserving seed transcript lines for web local-shell fallback only.
- `packages/sdkwork-terminal-shell/src/model.ts` now exposes `shouldUseTerminalShellFallbackMode(...)` so fallback seed transcript, fallback prompt, and fake command execution share the same gate.
- `packages/sdkwork-terminal-shell/src/model.ts` plus `packages/sdkwork-terminal-shell/src/index.tsx` now keep desktop/runtime/fallback mode truth helper-driven end to end, removing the last source-test dependency on literal `remote-runtime` checks inside `TerminalStage`.
- `packages/sdkwork-terminal-shell/src/model.ts` now exposes `resolveTerminalStageBehavior(...)`, letting `TerminalStage` consume one mode decision for runtime stream, fallback prompt, and bootstrap overlay instead of recomputing those flags independently.
- `packages/sdkwork-terminal-shell/src/model.ts` now exposes `resolveTerminalShellRuntimeClientKind(...)`, and `packages/sdkwork-terminal-shell/src/index.tsx` now uses that helper so `remote-runtime` stays web-only while desktop `local-shell / connector` tabs stay desktop-bound.
- `packages/sdkwork-terminal-shell/src/index.tsx` idle bootstrap now fails fast for runtime tabs that need a client but do not have one, instead of silently staying stuck in `idle`.
- `packages/sdkwork-terminal-shell/src/index.tsx` now re-registers the viewport paste handler when `showLivePrompt` or `onViewportInput` changes, preventing stale fallback paste behavior from leaking into real runtime tabs after bootstrap.
- `packages/sdkwork-terminal-shell/src/index.tsx` active-tab focus recovery now also tracks `showLivePrompt` and `usesRuntimeTerminalStream`, so a tab that changes interaction mode while active re-focuses the correct input surface.
- `packages/sdkwork-terminal-shell/src/index.tsx` active-tab focus recovery now yields when the terminal search overlay is open, preventing terminal mode changes from stealing focus back from the search input.
- `packages/sdkwork-terminal-shell/src/index.tsx` now keeps a live `active` ref inside `TerminalStage` measurement/attach logic, so tabs that mount inactive can still re-measure and sync to the real PTY surface when later activated.
- `packages/sdkwork-terminal-shell/src/index.tsx` active-tab focus recovery now also tracks `showBootstrapOverlay`, so focus and viewport measurement re-arm when the desktop bootstrap mask yields to the first live PTY frame.
- `packages/sdkwork-terminal-infrastructure/src/index.ts` now waits one animation frame before the first `fitAddon.fit()` and before viewport measurement, preventing hidden-to-visible tab activation from using pre-layout PTY geometry.
- `packages/sdkwork-terminal-shell/src/index.tsx` now explicitly forces the xterm helper textarea caret transparent inside the terminal surface, closing off native browser caret leakage on top of the real PTY cursor.
- `packages/sdkwork-terminal-shell/src/index.tsx` active-tab recovery now awaits viewport measurement before refocusing the terminal surface, reducing focus-before-fit races during tab activation.
- `packages/sdkwork-terminal-infrastructure/src/index.ts` viewport measurement now retries across a small number of animation frames before giving up, reducing stale PTY geometry when the terminal surface stabilizes slightly after activation.
- `apps/desktop/src/main.tsx` and `apps/web/src/main.tsx` no longer wrap the terminal app in `React.StrictMode`, preventing dev-only double mount of PTY/session/bootstrap side effects.
- `tests/shell-app-render.test.ts` now locks the non-StrictMode desktop/web entrypoint contract for terminal runtime stability.
- `tests/terminal-view-driver.test.ts` now locks the delayed xterm fit/measure timing path.
- `tests/shell-app-render.test.ts` now locks the non-stale active-tab measurement path and the bootstrap-overlay focus dependency.
- `crates/sdkwork-terminal-pty-runtime/tests/local_shell_session_runtime.rs` now verifies Windows interactive shell input/output before termination.
- `tools/scripts/run-tauri-dev.mjs`, `tools/scripts/run-vite-host.mjs`, and `tools/scripts/run-tauri-cli.mjs` now expose startup diagnostics instead of failing silently in long-running desktop dev flows.
- `tools/scripts/run-tauri-dev.mjs` now reclaims stale workspace-scoped desktop Vite servers on the default dev port so repeated `pnpm dev` runs keep the canonical desktop URL more reliably.
- `tools/scripts/run-tauri-cli.mjs` no longer auto-executes on import, removing `tauri help` side effects from test and tooling use.
- `apps/desktop/package.json` now routes `tauri:info` through the normalized CLI wrapper, and `tests/run-tauri-cli.test.mjs` plus `tests/workspace-structure.test.mjs` now lock that behavior.
- `docs/release/2026-04-11-v0.2.40-terminal-desktop-fidelity-and-dev-observability.md` now archives this increment.

### Verified

- `pnpm typecheck`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-tabs.test.ts tests/shell-runtime.test.ts tests/terminal-view-driver.test.ts`
- `node --experimental-strip-types --test tests/terminal-view-driver.test.ts tests/shell-app-render.test.ts tests/shell-tabs.test.ts tests/shell-runtime.test.ts`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-runtime.test.ts tests/terminal-view-driver.test.ts`
- `node --experimental-strip-types --test tests/terminal-view-driver.test.ts tests/shell-app-render.test.ts tests/shell-runtime.test.ts tests/shell-tabs.test.ts`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/terminal-view-driver.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-runtime.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/shell-runtime.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/shell-runtime.test.ts tests/terminal-view-driver.test.ts`
- `node --experimental-strip-types --test tests/shell-runtime.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/run-vite-host.test.mjs tests/run-tauri-cli.test.mjs tests/tauri-dev-script.test.mjs tests/workspace-structure.test.mjs`
- `cargo test -p sdkwork-terminal-pty-runtime --lib -- --nocapture`
- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime -- --nocapture`
- controlled `pnpm dev` startup confirmed `sdkwork-terminal-desktop-host.exe` launches on the desktop dev path
- repeated `pnpm dev` startup after removing `StrictMode` still launched `sdkwork-terminal-desktop-host.exe`
- `pnpm --dir apps/desktop tauri:info`
- `pnpm tauri:check`
- `pnpm build`

## Unreleased - Step 07 Runtime-Node Host Core

### Changed

- `crates/sdkwork-terminal-runtime-node/src/host.rs` now exposes `RuntimeNodeHost`, `RemoteRuntimeSessionCreateRequest`, session/replay/input/resize/terminate snapshots, and `RuntimeNodeStreamEvent`, freezing a pure Rust remote-runtime host core instead of leaving Step 07 on request-shape and web wiring only.
- `RuntimeNodeHost` now composes `SessionRuntime + LocalShellSessionRuntime + stream fanout`, closing the server-side loop `create -> attach -> PTY spawn -> replay/state -> input / input-bytes / resize / terminate -> output / warning / exit -> sqlite recovery`.
- `crates/sdkwork-terminal-pty-runtime/src/lib.rs` now removes the session handle during `terminate_session()` and treats Windows `os error 6 / 1460` as best-effort close, allowing explicit-command PTY sessions to drain `Exit` instead of getting stranded in `Stopping`.
- `crates/sdkwork-terminal-runtime-node/tests/runtime_node_host_test.rs` now locks the real host create/output/exit path and the sqlite recovery rebuild path.
- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/prompts/反复执行Step指令.md` now record the new Step 07 state: `runtime-node host core` is done, but HTTP/SSE wrapper and reviewed evidence are still open.
- `docs/release/2026-04-10-v0.2.50-step07-runtime-node-host-core.md` and `docs/review/2026-04-10-step07-runtime-node-host-core验证.md` now archive this increment.

### Verified

- `cargo test --manifest-path crates/sdkwork-terminal-pty-runtime/Cargo.toml -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture`

### Constraint

- This closes the pure Rust host core only.
- `publicApi / runtimeStream` thin wrappers, web manual smoke, and reviewed `remote-runtime` recovery evidence remain open before `CP07-5` can close.

## Unreleased - Step 07 Web Shell Runtime Binding

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` now carries tab-level `remote-runtime` bootstrap truth alongside `local-shell` and connector bootstrap.
- `packages/sdkwork-terminal-shell/src/index.tsx` now accepts `webRuntimeClient` and `webRuntimeTarget`, and reuses the same `session-first` replay/input/resize/terminate/subscribe path for desktop and web runtime sessions while keeping desktop-only `detach / attachment-ack` boundaries intact.
- `apps/web/src/App.tsx` now creates `createWebRuntimeBridgeClient(...)`, resolves `VITE_TERMINAL_RUNTIME_BASE_URL / WORKSPACE_ID / AUTHORITY / TARGET / WORKING_DIRECTORY`, and passes the result into `ShellApp`.
- `apps/web/.env.example` now documents the minimal remote-runtime bootstrap variables for the web shell.
- `apps/web/package.json` now depends on `@sdkwork/terminal-infrastructure`.
- `tests/shell-app-render.test.ts` now locks the `apps/web -> createWebRuntimeBridgeClient -> ShellApp` wiring and the web `remote-runtime` shell path.
- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/prompts/反复执行Step指令.md` now record this web shell binding slice.
- `docs/release/2026-04-10-v0.2.49-step07-web-shell-runtime-binding.md` and `docs/review/2026-04-10-step07-web-shell-runtime-binding验证.md` now archive this increment.

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/resource-center.test.ts tests/web-runtime-bridge.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts`
- `pnpm typecheck`
- `pnpm build`

### Constraint

- This closes only the `apps/web -> ShellApp` binding slice.
- `runtime-node` host attach/input/stream/recovery and `CP07-5` closure remain open.

## Unreleased - Step 07 Remote Runtime Web Bridge

### Changed

- `packages/sdkwork-terminal-types/src/index.ts` now exposes `RemoteRuntimeSessionCreateRequest`, freezing the dedicated `remote-runtime` create-request shape for web/runtime-node orchestration without reusing the desktop `system-cli` connector contract.
- `packages/sdkwork-terminal-resources/src/model.ts` now exposes `createRemoteRuntimeSessionCreateRequest(...)`, mapping launchable `remote-api` targets into a dedicated `remote-runtime` session request while keeping `createConnectorSessionLaunchRequest(...)` desktop/system-cli-only.
- `packages/sdkwork-terminal-infrastructure/src/index.ts` now exposes `createWebRuntimeBridgeClient(...)`, routing `session create / replay / input / binary input / resize / terminate / stream subscribe` through `publicApi` and `runtimeStream` surfaces.
- `tests/resource-center.test.ts` and `tests/web-runtime-bridge.test.ts` now lock the request-model split and the new web/runtime bridge client path.
- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/prompts/反复执行Step指令.md` now freeze this Step 07 remote-runtime foundation slice and keep desktop boundaries honest.
- `docs/release/2026-04-10-v0.2.48-step07-remote-runtime-web-bridge.md` and `docs/review/2026-04-10-step07-remote-runtime-web-bridge验证.md` now archive this capability increment.

### Verified

- `node --experimental-strip-types --test tests/resource-center.test.ts tests/web-runtime-bridge.test.ts`
- `node --experimental-strip-types --test tests/runtime-contracts.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/web-runtime-bridge.test.ts`

### Constraint

- This lands only the dedicated `remote-runtime` request model and the web/runtime bridge client. `apps/web -> ShellApp` live binding, runtime-node host attach/input/stream, and Step 07 recovery closure remain open.

## Unreleased - Step 07 Connector Execution Plan

### Changed

- `tools/smoke/connector-interactive-probe.mjs` now exposes `buildConnectorInteractiveExecutionPlan(...)` and CLI support for `--print-execution-plan --platform <platform>`, merging host preflight with the current-platform batch matrix into an operator-facing execution view.
- `tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform <platform> --output-dir <dir> --ready-only` now writes report/review skeletons only for ready targets on the current host and returns skipped entries with readiness reasons.
- `tests/connector-interactive-probe.test.ts` now locks execution-plan merging, ready-only template filtering, CLI execution-plan output, and README coverage for the new Step 07 commands.
- `tools/smoke/README.md`, `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/prompts/反复执行Step指令.md` now enforce the Step 07 smoke sequence `preflight -> execution-plan -> ready-only templates -> field smoke -> serial closeout`.
- `docs/release/2026-04-10-v0.2.47-step07-connector-execution-plan.md` and `docs/review/2026-04-10-step07-connector-execution-plan验证.md` now archive this execution-layer upgrade and the current Windows host snapshot.

### Verified

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --print-execution-plan --platform windows-desktop`
- `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform windows-desktop --output-dir %TEMP%/sdkwork-terminal-ready-only-cli --ready-only`

### Constraint

- This adds an execution-layer filter and operator view only. Step 07 still requires real-machine connector smoke evidence and `remote-runtime` live attach/recovery implementation.

## Unreleased - Step 07 Connector Preflight Audit

### Changed

- `tools/smoke/connector-interactive-probe.mjs` now exposes `--print-preflight --platform <platform>`, producing a repository-owned readiness report for `ssh / docker-exec / kubernetes-exec` with command status, authority candidates, and concrete host blockers.
- `tests/connector-interactive-probe.test.ts` now locks ready-host preflight, blocked-host preflight, and CLI preflight output.
- `tools/smoke/README.md`, `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/prompts/反复执行Step指令.md` now require preflight before Step 07 field smoke collection.
- `docs/release/2026-04-10-v0.2.46-step07-connector-preflight-audit.md` and `docs/review/2026-04-10-step07-connector-preflight-audit验证.md` now archive the new Step 07 preflight baseline and the current Windows host snapshot.

### Verified

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --print-preflight --platform windows-desktop`

### Constraint

- This adds host readiness auditing only. Step 07 still requires real-machine connector smoke evidence and `remote-runtime` live attach/recovery implementation.

## Unreleased - Step 07 Connector Batch Template Writer

### Changed

- `tools/smoke/connector-interactive-probe.mjs` now exposes `--write-batch-templates --output-dir <dir>`, writing JSON report templates and markdown review templates for the selected `platform-target` connector smoke batch.
- `tests/connector-interactive-probe.test.ts` now locks both direct template writing and CLI-driven batch template output.
- `tools/smoke/README.md`, `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/prompts/反复执行Step指令.md` now treat batch template generation as the next Step 07 action after batch-plan generation.
- `docs/release/2026-04-10-v0.2.45-step07-connector-batch-template-writer.md` and `docs/review/2026-04-10-step07-connector-batch-template-writer验证.md` now archive this batching upgrade.

### Verified

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform ubuntu-desktop --output-dir $env:TEMP/sdkwork-terminal-connector-batch-manual`

### Constraint

- This writes template skeletons only. Step 07 still requires real-machine `ssh / docker-exec / kubernetes-exec` smoke execution, reviewed artifacts, and `remote-runtime` live attach/recovery implementation.

## Unreleased - Step 07 Connector Batch Smoke Matrix

### Changed

- `tools/smoke/connector-interactive-probe.mjs` now exposes `--print-batch-plan`, emitting a repository-owned `windows-desktop / ubuntu-desktop / macos-desktop x ssh / docker-exec / kubernetes-exec` evidence matrix with per-entry report/review commands, suggested artifact paths, parallel groups, and serial closeout constraints.
- `tests/connector-interactive-probe.test.ts` now locks the batch-plan generation path and CLI output.
- `tools/smoke/README.md`, `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/prompts/反复执行Step指令.md` now treat batch-plan generation as the preferred Step 07 entry before real-machine evidence collection.
- `docs/release/2026-04-10-v0.2.44-step07-connector-batch-smoke-matrix.md` and `docs/review/2026-04-10-step07-connector-batch-smoke-matrix验证.md` now archive this Step 07 batching baseline.

### Verified

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --print-plan`
- `node tools/smoke/connector-interactive-probe.mjs --print-batch-plan`

### Constraint

- This adds batch evidence planning only. Step 07 still requires real-machine `ssh / docker-exec / kubernetes-exec` report/review artifacts and `remote-runtime` live attach/recovery implementation.

## Unreleased - Step 07 Connector Smoke Scope Alignment

### Changed

- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, and `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md` now freeze `connector-interactive-probe` as the repository-owned smoke entry for `ssh / docker-exec / kubernetes-exec` live terminal, Session Center reattach, and restart/recovery evidence.
- `docs/prompts/反复执行Step指令.md` now forbids closing Step 07 from Docker/Kubernetes launch-only notes and points the loop back to the shared connector smoke entry.
- `docs/release/2026-04-10-v0.2.43-step07-connector-smoke-scope-alignment.md` and `docs/review/2026-04-10-step07-connector-smoke-scope-alignment验证.md` now archive this Step 07 evidence-baseline alignment.

### Verified

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --print-plan`

### Constraint

- This aligns the Step 07 evidence baseline only. Real-machine `ssh / docker-exec / kubernetes-exec` report/review artifacts and `remote-runtime` live attach/recovery remain open.

## Unreleased - Step 07 Multi-Target Connector Discovery

### Changed

- `crates/sdkwork-terminal-resource-connectors/src/lib.rs` now expands connector discovery from one authority per connector into multi-target inventory for `ssh / docker-exec / kubernetes-exec`.
- SSH discovery now merges `SDKWORK_TERMINAL_SSH_AUTHORITY` with multiple valid `Host` aliases from `~/.ssh/config`, preserving configured-authority priority and removing duplicates.
- Docker discovery now merges `SDKWORK_TERMINAL_DOCKER_AUTHORITY` with multiple running containers from `docker ps --format {{.Names}}`, preserving configured-authority priority and removing duplicates.
- Kubernetes discovery now merges `SDKWORK_TERMINAL_KUBERNETES_AUTHORITY` with multiple pod authorities from the current context, preserving configured-authority priority and removing duplicates.
- `src-tauri/src/lib.rs` test coverage and `tests/desktop-resource-launch.test.ts` now lock the desktop catalog/menu expectation that multiple discovered connector targets remain visible to the product layer.
- `README.md`、`docs/架构/06-终端会话、运行目标与协议设计.md`、`docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md` now freeze the new multi-target discovery baseline.

### Verified

- `cargo test --manifest-path crates/sdkwork-terminal-resource-connectors/Cargo.toml -- --nocapture`
- `node --experimental-strip-types --test tests/desktop-resource-launch.test.ts`

### Constraint

- This closes the single-authority discovery gap only. Step 07 still remains open for connector reconnect/recovery real-machine evidence and Remote Runtime live attach/recovery.

## Unreleased - Desktop Connector Reattach Alignment

### Changed

- `apps/desktop/src/session-center-shell.ts` now exposes desktop interactive reattach for `local-shell / ssh / docker-exec / kubernetes-exec`, while keeping `remote-runtime` outside the writable desktop allowlist.
- The same desktop reattach intent mapper now restores connector-first shell semantics, resolving `SSH / Docker / Kubernetes` titles and defaulting connector tabs back to `bash` instead of generic `shell / Session`.
- `apps/desktop/src/DesktopSessionCenterOverlay.tsx` now distinguishes `attached / exited / remote-runtime` non-reattachable states instead of showing the previous `local-shell only` hint for every non-local session.
- `docs/prompts/反复执行Step指令.md`、`docs/架构/06-终端会话、运行目标与协议设计.md`、`docs/架构/17-能力到API与IPC调用矩阵.md`、`docs/step/06-Session-Runtime、Replay与Recovery主链落地.md`、`docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md` now freeze the updated Step 07 product boundary.

### Verified

- `node --experimental-strip-types --test tests/desktop-session-reattach.test.ts`
- `node --experimental-strip-types --test tests/desktop-session-reattach.test.ts tests/desktop-session-center.test.ts tests/desktop-runtime-bridge.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Constraint

- This expands only the desktop reattach product boundary for connector sessions that already have a real desktop live path. `remote-runtime` attach/recovery and cross-host reconnect evidence remain open in Step 07.

## Unreleased - Desktop Runtime Event Name Alignment

### Changed

- `packages/sdkwork-terminal-infrastructure/src/index.ts` now converts desktop runtime event subscriptions into Tauri-safe event names, replacing `.` with `:` before calling `listen(...)`.
- `src-tauri/src/lib.rs` now emits local runtime session events with the same Tauri-safe encoding, so desktop `listen/emit` names stay aligned across the bridge.
- `tests/desktop-runtime-bridge.test.ts` now locks the regression with explicit expectations that desktop session subscription event names contain no `.` and remain Tauri-valid.

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Constraint

- This fixes the desktop Tauri runtime event naming incompatibility only. It does not close Step 07 connector attach/reconnect/recovery work.

## Unreleased - Desktop Bridge Command Permission Alignment

### Changed

- `src-tauri/permissions/desktop-host.toml` now defines an app-owned `desktop-host-commands` permission set that authorizes every desktop bridge command with its invoke-visible `snake_case` name.
- `src-tauri/capabilities/default.json` now mounts `desktop-host-commands` into the main desktop capability, so `desktop_local_shell_session_create` and the rest of the desktop bridge no longer depend on the drifted autogenerated kebab-case command permissions alone.
- `tests/desktop-tauri-permissions.test.ts` now locks this regression with a repository-owned check over the capability file and manual permission manifest.

### Verified

- `node --experimental-strip-types --test tests/desktop-tauri-permissions.test.ts`
- `node --experimental-strip-types --test tests/desktop-tauri-permissions.test.ts tests/desktop-runtime-bridge.test.ts tests/shell-app-render.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm typecheck`
- `pnpm build`

### Constraint

- This fixes the desktop bridge ACL drift only. Step 07 still remains open for real-machine connector attach/reconnect/recovery evidence and Remote Runtime live recovery closure.

## Unreleased - Step 07 Connector Interactive Smoke Baseline

### Changed

- `tools/smoke/connector-interactive-probe.mjs` and `tools/smoke/connector-interactive-probe.ps1` now freeze a repository-owned Step 07 `CP07-4` smoke entry for `docker-exec / kubernetes-exec` live terminal validation.
- The new probe emits a shared smoke plan, JSON report template, and markdown review template so Docker/Kubernetes interactive evidence is no longer left as narrative-only notes.
- `crates/sdkwork-terminal-control-plane` now has explicit interactive bootstrap coverage for `docker-exec` and `kubernetes-exec`, proving the shared truth loop is not SSH-only.
- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`, and `tools/smoke/README.md` now freeze this Step 07 evidence baseline.

### Verified

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`

### Constraint

- This lands the Step 07 `CP07-4` smoke baseline only. Real-machine Docker/Kubernetes report/review artifacts, connector attach/reconnect/recovery closure, multi-target inventory, and Remote Runtime recovery remain open.

## Unreleased - Step 07 Repeated Connector Launch Intents

### Changed

- `apps/desktop/src/connector-shell.ts` now generates a one-shot action-scoped `requestId` for default connector launch intents instead of reusing a target-scoped stable key.
- Repeated launches of the same `SSH / Docker / Kubernetes` target from the top `Connectors` menu can now open multiple live terminal tabs; ShellApp dedupe remains scoped to truly identical action ids only.
- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, and `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md` now freeze this product truth.

### Verified

- `node --experimental-strip-types --test tests/desktop-resource-launch.test.ts`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Constraint

- This closes the Step 07 repeated same-target launch-intent gap only. Docker/Kubernetes interactive expansion, multi-target inventory, and Remote Runtime recovery remain open.

## Unreleased - Step 07 Session-First Runtime Write Surface

### Changed

- `packages/sdkwork-terminal-infrastructure` now freezes `writeSessionInput / writeSessionInputBytes / resizeSession / terminateSession / subscribeSessionEvents` as the canonical desktop terminal write/read hot path, while preserving `local-shell` aliases as compatibility wrappers.
- `packages/sdkwork-terminal-shell` now consumes the session-first surface only, so local-shell and connector live tabs share the same write, resize, terminate, and runtime-event subscription semantics.
- `src-tauri` now exposes `desktop_session_input / desktop_session_input_bytes / desktop_session_resize / desktop_session_terminate`, and `src-tauri/capabilities/default.json` plus autogenerated permissions now explicitly authorize that generic session write surface.
- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/架构/08-渲染、兼容性与终端体验设计.md`, `docs/step/05-Terminal-Core与渲染交互基线落地.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`, and `docs/prompts/反复执行Step指令.md` now freeze session-first naming as landed Step 07 truth.

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Constraint

- This closes the Step 07 naming-drift sub-stage only. Docker/Kubernetes interactive expansion, multi-target inventory, and Remote Runtime recovery remain open work.

## Unreleased - Step 07 Host Discovery And Desktop Catalog Refresh

### Changed

- `crates/sdkwork-terminal-resource-connectors` now exposes real desktop connector discovery, replacing the previous demo catalog with host/config/health-driven target resolution for `ssh / docker-exec / kubernetes-exec / remote-runtime`.
- The current discovery baseline is explicit and repository-owned: `SSH=SDKWORK_TERMINAL_SSH_AUTHORITY | ~/.ssh/config`, `Docker=SDKWORK_TERMINAL_DOCKER_AUTHORITY | docker ps`, `Kubernetes=SDKWORK_TERMINAL_KUBERNETES_AUTHORITY | current-context + first pod`, `Remote Runtime=SDKWORK_TERMINAL_REMOTE_RUNTIME_AUTHORITY`.
- `src-tauri` now maps `desktop_execution_target_catalog` from shared discovery results instead of static connector constants, keeping the desktop host thin while moving target truth into the shared Rust crate.
- `packages/sdkwork-terminal-shell` now exposes `onBeforeProfileMenuOpen`, and `apps/desktop` now refreshes `resourceCenterSnapshot` before opening the top profile/connectors dropdown, so header connector entries are no longer mount-time stale.
- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md` now freeze the new Step 07 truth.

### Verified

- `cargo test --manifest-path crates/sdkwork-terminal-resource-connectors/Cargo.toml -- --nocapture`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Constraint

- On the current Windows host, direct execution of the `src-tauri` Rust unit-test binary still fails with `STATUS_ENTRYPOINT_NOT_FOUND`; this round therefore uses shared Rust crate tests plus `src-tauri cargo check` and TypeScript bridge/render tests as the accepted evidence.

## Unreleased - Step 07 Desktop Connector Catalog Product Entry

### Changed

- `src-tauri` now exposes `desktop_execution_target_catalog`, providing the desktop host read-model entry for execution targets instead of forcing the shell chrome to depend on module-load-time static snapshots.
- `packages/sdkwork-terminal-infrastructure` now exposes `executionTargets()` on the desktop bridge client, and `apps/desktop/src/resource-center.ts` now projects that catalog into a live `ResourceCenterSnapshot`.
- `apps/desktop/src/App.tsx` now owns `resourceCenterSnapshot` state, derives `desktopConnectorEntries` from the current snapshot, and resolves connector launch intents against that snapshot before opening ShellApp live tabs.
- `apps/desktop/src/connector-shell.ts` no longer relies on implicit `createResourceCenterSnapshot()` defaults for menu-entry lookup; connector menu resolution is now explicitly snapshot-driven.
- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md` now freeze the new Step 07 truth: top-dropdown `Connectors` is a real product entry, while host-driven catalog refresh, Docker/Kubernetes expansion, and Remote Runtime recovery remain open.

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/desktop-resource-launch.test.ts tests/shell-app-render.test.ts tests/shell-tabs.test.ts tests/desktop-runtime-bridge.test.ts tests/resource-center.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Constraint

- This closes the Step 07 desktop connector product-entry gap only. The current catalog is still a desktop host default read-model, not a real host/config/health discovery loop, and the generic `session-first` write API naming plus Docker/Kubernetes/Remote Runtime recovery work remain open.

## Unreleased - Step 07 ShellApp Connector Tab Bootstrap

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` now carries tab-level `runtimeBootstrap`, allowing a desktop tab to resolve either `local-shell` or connector interactive bootstrap requests without reintroducing fake dashboard/session abstractions.
- `packages/sdkwork-terminal-shell/src/index.tsx` now branches desktop bootstrap between `createLocalShellSession(...)` and `createConnectorInteractiveSession(...)`, so connector interactive sessions can be mounted as real top-tab live terminals.
- Desktop input hot-path handling now keeps raw input queueable during `idle / binding / retrying`, reducing early-input loss while a local-shell or connector tab is still bootstrapping.
- `README.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`, and `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md` now freeze the new Step 07 truth: ShellApp live-tab bootstrap is landed; formal product entrypoints remain open.

### Verified

- `node --experimental-strip-types --test tests/shell-tabs.test.ts`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`

### Constraint

- This closes the ShellApp connector live-tab bootstrap sub-stage only. Resource Center product entry wiring, Docker/Kubernetes interactive expansion, generic `session-first` write API naming, and Remote Runtime recovery remain open Step 07 work.

## Unreleased - Step 07 Interactive Connector Session Bootstrap

### Changed

- `crates/sdkwork-terminal-pty-runtime` now exposes `create_process_session(...)`, so desktop PTY hosting is no longer limited to local shell profiles and can bootstrap explicit `program + args` interactive connector processes.
- `crates/sdkwork-terminal-control-plane` now owns the shared `create_interactive_connector_session(...)` truth loop for desktop connector interactive create: `connect preflight -> Session admission -> attachment -> PTY spawn -> launch resolution / spawn-failure replay`.
- `src-tauri` now exposes `desktop_connector_session_create`, and `packages/sdkwork-terminal-infrastructure` now exposes `createConnectorInteractiveSession(...)`, returning `session + attachment + invokedProgram + replay state` bootstrap evidence instead of only bounded launch/probe read models.
- `README.md`、`docs/架构/03-模块规划与边界.md`、`docs/架构/06-终端会话、运行目标与协议设计.md`、`docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`、`docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md` now freeze this Step 07 sub-stage.

### Verified

- `cargo test --manifest-path crates/sdkwork-terminal-pty-runtime/Cargo.toml session_runtime_creates_interactive_process_from_explicit_command -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm typecheck`

### Constraint

- This only closes the shared interactive connector bootstrap baseline. ShellApp top-tab live binding, Docker/Kubernetes interactive expansion, generic session write API naming, and Remote Runtime orchestration remain open Step 07 follow-up work.

## Unreleased - Step 06 Runtime-Node Server Recovery Bootstrap

### Changed

- `crates/sdkwork-terminal-runtime-node` now owns the Step 06 server-side `SessionRuntime` bootstrap, freezing `create_runtime_node_session_runtime(...)`, `RuntimeNodeBootstrapConfig`, and `RuntimeNodeRecoveryDiagnostics` as the current `ubuntu-server` recovery truth loop.
- The new runtime-node bootstrap now records explicit `hostMode / platformFamily / cpuArch / runtimeLocation / storageSurface` diagnostics instead of leaving `ubuntu-server` recovery as an untyped “server persistence” claim.
- `tools/smoke/session-recovery-probe.mjs`, `tests/session-recovery-probe.test.ts`, `README.md`, `docs/架构/03-模块规划与边界.md`, `docs/架构/06-终端会话、运行目标与协议设计.md`, `docs/step/06-Session-Runtime、Replay与Recovery主链落地.md`, and `docs/prompts/反复执行Step指令.md` now freeze runtime-node recovery as a mandatory Step 06 server evidence path.

### Verified

- `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `node --experimental-strip-types --test tests/session-recovery-probe.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`

### Constraint

- This closes the Step 06 server-side recovery baseline only. Full server broker/runtime-node coordination, remote live attach, and deployment orchestration remain Step 10 work and must not be backfilled into Step 06 claims.

## Unreleased - Step 06 Recovery Smoke Matrix

### Changed

- `tools/smoke/session-recovery-probe.mjs` and `tools/smoke/session-recovery-probe.ps1` now freeze the Step 06 `CP06-5` recovery matrix for `windows-desktop / ubuntu-desktop / macos-desktop / ubuntu-server`.
- The new probe now emits repository-owned `--print-plan`, `--report-template`, and `--review-template` artifacts so recovery evidence is no longer left as narrative-only notes.
- `tools/smoke/README.md`, `README.md`, `docs/架构/10-性能、可靠性与可观测性设计.md`, `docs/step/06-Session-Runtime、Replay与Recovery主链落地.md`, and `docs/prompts/反复执行Step指令.md` now freeze the probe as the Step 06 cross-platform recovery evidence entrypoint.
- `packages/sdkwork-terminal-shell/src/index.tsx` now reads the real replay field `kind` instead of the removed `entryType`, clearing the shell-side type drift that broke `pnpm typecheck`.

### Verified

- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `node --experimental-strip-types --test tests/session-recovery-probe.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`

### Constraint

- The recovery matrix is now repeatable inside the repository, but platform-specific report/review artifacts still need to be collected before any platform can be claimed as fully recovery-validated.

## Unreleased - Step 06 Desktop SQLite Recovery Bootstrap

### Changed

- `crates/sdkwork-terminal-control-plane` now owns the shared desktop `SessionRuntime` bootstrap, freezing `session-runtime.sqlite3`, parent-directory creation, and `SessionRuntime::with_sqlite` initialization behind `create_desktop_session_runtime(...)`.
- `src-tauri` now reuses that shared Rust control-plane bootstrap instead of maintaining a second private desktop SQLite initialization branch.
- `README.md`、`docs/架构/06-终端会话、运行目标与协议设计.md`、`docs/step/06-Session-Runtime、Replay与Recovery主链落地.md` and `docs/prompts/反复执行Step指令.md` now freeze the new desktop recovery bootstrap boundary and the current Windows host test limitation.

### Verified

- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`

### Constraint

- On the current Windows development host, direct execution of the `src-tauri` Rust unit-test binary still fails with `STATUS_ENTRYPOINT_NOT_FOUND`; this round therefore treats the shared Rust control-plane test as the recovery truth-loop evidence and `src-tauri cargo check` as the desktop bridge evidence.

## Unreleased - Step 06 Session Tags Truth Loop

### Changed

- `packages/sdkwork-terminal-types` now freezes `SessionDescriptor.tags` in the shared contract, separating session truth tags from `modeTags`.
- `packages/sdkwork-terminal-contracts` and `tests/fixtures/runtime-contract.snapshot.json` now include `tags` in `sessionDescriptorFields`, keeping the runtime contract snapshot aligned with the real desktop bridge payload.
- `src-tauri/src/lib.rs` now preserves `tags` on desktop session descriptors, so `desktop_session_index / attach / detach / reattach` no longer erase `profile:*` or `resource:*` metadata.
- `packages/sdkwork-terminal-sessions` now builds Session Center entries from real `session.tags`, with compatibility fallback only when older snapshots still omit `tags`.
- `apps/desktop/src/session-center-shell.ts` now derives reattach profile intent from real session tags instead of reusing `modeTags`.
- `README.md`、`docs/step/06-Session-Runtime、Replay与Recovery主链落地.md`、`docs/prompts/反复执行Step指令.md` and the new architecture supplement docs freeze the `SessionDescriptor.tags` truth-loop boundary.

### Verified

- `node --experimental-strip-types --test tests/runtime-contracts.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Constraint

- `tags` 已成为 Session truth 的权威标签面，但为兼容历史快照，读侧仍允许在缺失 `tags` 时临时回退到 `modeTags`；该回退不能被反向写回 runtime，也不能替代新的显式 `tags` 写链。

> 历史条目按发布当时事实保留；当前有效架构标准、命名规范、terminal-first 首页约束与平台支持口径，以 `README.md`、`docs/架构/`、`docs/step/` 最新内容为准。

## Unreleased - Step 06 Session Center Overlay Reattach

### Changed

- `apps/desktop/src/App.tsx` now keeps a stable desktop bridge client, loads Session Center snapshots on demand, and routes reattach actions through the real `desktop_session_reattach` write chain instead of a fake local restore.
- `apps/desktop/src/DesktopSessionCenterOverlay.tsx` introduces a terminal-first overlay entrypoint for Session Center, keeping the desktop homepage as `tabs/custom header + terminal stage` instead of reintroducing dashboard/home content.
- `apps/desktop/src/session-center-shell.ts` now freezes desktop reattach intent mapping and explicitly gates interactive desktop reattach to `target=local-shell`.
- `packages/sdkwork-terminal-shell` now accepts external Session Center toggle/reattach intents, exposes a product-visible `Session Center` menu item in shell chrome, and binds successful reattach results into a new runtime-backed tab.
- `README.md`、`docs/架构/06-终端会话、运行目标与协议设计.md`、`docs/架构/17-能力到API与IPC调用矩阵.md`、`docs/step/06-Session-Runtime、Replay与Recovery主链落地.md`、`docs/prompts/反复执行Step指令.md` have been rewritten to freeze the overlay-first entry path and the current `local-shell only` interactive reattach boundary.

### Verified

- `node --experimental-strip-types --test tests/desktop-session-reattach.test.ts tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm dev` smoke: process stayed alive until timeout, with no immediate startup crash

### Constraint

- Desktop interactive reattach remains intentionally scoped to `local-shell` until remote/connector live input and stream hosts are completed; Session Center may still show non-local session truth/read models, but must not present them as writable terminal tabs.

## Unreleased - Step 06 Desktop Session Attach/Detach/Reattach

### Changed

- `packages/sdkwork-terminal-infrastructure` now exposes `attachSession(...)`、`detachSessionAttachment(...)`、`reattachSession(...)`, routing them to `desktop_session_attach / detach / reattach` instead of leaving Session write semantics trapped inside Rust only.
- `src-tauri` now publishes matching desktop Session IPC commands, so Step 06 desktop host capability is no longer limited to `session_index / replay_slice / attachment_acknowledge`.
- `packages/sdkwork-terminal-shell` now best-effort detaches still-live attachments during host teardown, reducing attachment-state drift when the UI surface disappears before the session itself is intentionally terminated.
- `crates/sdkwork-terminal-session-runtime` now preserves `Detached` when background output arrives without any active attachment, preventing detached sessions from being silently promoted back to `Running`.
- `README.md`、`docs/架构/06-终端会话、运行目标与协议设计.md`、`docs/架构/17-能力到API与IPC调用矩阵.md`、`docs/step/06-Session-Runtime、Replay与Recovery主链落地.md`、`docs/prompts/反复执行Step指令.md` have been rewritten to freeze the new detach/reattach truth-loop boundary.

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`
- `cargo test --manifest-path crates/sdkwork-terminal-session-runtime/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml --no-run`
- `pnpm dev` smoke: process stayed alive until timeout, with no immediate startup crash

### Constraint

- Direct execution of the `src-tauri` unit-test binary is still blocked on this Windows host by a native loader failure (`STATUS_ENTRYPOINT_NOT_FOUND`); this round therefore uses compile-only evidence for the Tauri test target, plus JS bridge tests and Rust `session-runtime` tests for behavior coverage.

## Unreleased - Terminal Input Fidelity

### Changed

- `packages/sdkwork-terminal-shell`, `packages/sdkwork-terminal-infrastructure`, and `src-tauri` now carry a desktop attachment-ack feedback loop: runtime-backed tabs persist `runtimeAttachmentId`, desktop bridge exposes `desktop_session_attachment_acknowledge`, and replay/event consumption writes the latest sequence back into `SessionRuntime` attachment state.
- `packages/sdkwork-terminal-shell` now buffers raw desktop keystrokes while a tab is still in runtime `binding`, then flushes them to the real PTY once the session reaches `running`, preventing early input loss on newly opened tabs.
- `packages/sdkwork-terminal-shell` now renders a terminal-native runtime status overlay for `binding` and queued-input states, so freshly opened desktop tabs no longer look like a dead blank stage while the PTY is attaching.
- `packages/sdkwork-terminal-shell` now lets desktop tabs recover in place with `Restart shell` after `failed / exited`, instead of leaving the tab in a dead-end state.
- `packages/sdkwork-terminal-shell` now models desktop startup recovery with an explicit `retrying` state, performs one automatic bootstrap retry for launch failures, and keeps queued xterm input alive across retry boundaries.
- `packages/sdkwork-terminal-shell` now preserves queued input when the user manually restarts a `failed` startup tab, so recovery does not discard keystrokes entered during bootstrap.
- `packages/sdkwork-terminal-infrastructure`, `packages/sdkwork-terminal-shell`, `src-tauri`, and `crates/sdkwork-terminal-pty-runtime` now carry `xterm.onBinary` through a bytes-safe desktop path, using ordered pending-input chunks plus `writeLocalShellInputBytes(...)` / `write_input_bytes(...)` so non-UTF-8 terminal payloads are not corrupted by string coercion.
- `packages/sdkwork-terminal-shell` and `packages/sdkwork-terminal-infrastructure` now route clipboard paste through xterm's native `paste(...)` path, keeping bracketed-paste semantics closer to a professional terminal instead of bypassing the terminal with direct input injection.
- `packages/sdkwork-terminal-shell` now routes tab-menu copy through the live xterm viewport selection when available, instead of defaulting to stale `copiedText` snapshot state; snapshot fallback is only retained for tabs whose viewport is not currently attached.
- `packages/sdkwork-terminal-shell` and `packages/sdkwork-terminal-infrastructure` now make both `Ctrl/Cmd + Shift + A` and the terminal viewport menu `Select all` execute a real viewport `selectAll()` action, instead of degrading into focus-only no-ops.
- `packages/sdkwork-terminal-shell` now maps `Ctrl+Insert` and `Shift+Insert` onto the same real terminal copy/paste pipeline as `Ctrl/Cmd + Shift + C/V`, keeping Windows-style shortcut behavior aligned with Windows Terminal expectations.
- `packages/sdkwork-terminal-shell` now keeps truncation state outside the raw terminal byte stream: oversized replay tails still set `runtimeContentTruncated`, but no longer inject synthetic `output truncated` marker text into `runtimeTerminalContent`.
- `packages/sdkwork-terminal-infrastructure` and `packages/sdkwork-terminal-shell` now propagate xterm `onTitleChange` into top tabs, so real `OSC 0 / 2` terminal title updates can surface in the Windows Terminal style header without bypassing the viewport.
- `tools/smoke/terminal-fidelity-probe.mjs` and `tools/smoke/terminal-fidelity-probe.ps1` now provide a repeatable Step 05 smoke harness for `OSC title / alternate screen / bracketed paste / mouse-reporting / CJK`, plus parser-backed evidence for raw terminal input capture.
- `tools/smoke/terminal-fidelity-probe.mjs` now also emits `--report-template` JSON for `Windows / Ubuntu / macOS` smoke archival, so Step 05 platform evidence can be recorded in a consistent structure.
- `tools/smoke/terminal-fidelity-probe.mjs` now also emits `--review-template` markdown for `Windows / Ubuntu / macOS` manual smoke review, keeping platform evidence anchored to a repository-owned checklist instead of free-form notes.
- `packages/sdkwork-terminal-shell/src/model.ts` now falls back to the host platform when browser `navigator` data is unavailable, so Windows desktop shells no longer mis-default to `bash`.
- `packages/sdkwork-terminal-shell` now forces focus onto the active xterm stage after attach, reducing the “terminal cannot input” failure mode caused by initial focus races.
- `packages/sdkwork-terminal-shell` now adds product-quality hover states for header chrome, window controls, and tab close actions while keeping the page terminal-first.
- `packages/sdkwork-terminal-shell` further refines xterm viewport chrome with thinner professional scrollbars and a unified terminal background.
- `packages/sdkwork-terminal-infrastructure` now hardens xterm runtime defaults with `fontSize`、`lineHeight`、`letterSpacing`、`allowTransparency` and deeper `scrollback`, keeping the renderer closer to a professional terminal baseline.
- `packages/sdkwork-terminal-infrastructure` now activates xterm Unicode 11 with an explicit version literal, keeping width semantics stable while removing the TypeScript build break caused by `Unicode11Addon.version`.
- `packages/sdkwork-terminal-shell` also fixes shell-level compile drift around runtime close/restart flow, so `pnpm typecheck` stays green while the terminal recovery path is active.
- `docs/架构/08-渲染、兼容性与终端体验设计.md`、`docs/step/05-Terminal-Core与渲染交互基线落地.md`、`docs/prompts/反复执行Step指令.md` have been rewritten to freeze the real terminal input hot path and blocker-first execution policy.

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-tabs.test.ts tests/terminal-view-driver.test.ts tests/desktop-runtime-bridge.test.ts`
- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime -- --nocapture`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm dev` smoke: process stayed alive until timeout, with no immediate startup crash

### Recovery Note

- Auto recovery is now explicitly limited to one desktop bootstrap retry. Normal `exited` tabs are not auto-relaunched.

## Unreleased - Terminal UI Polish

### Changed

- `packages/sdkwork-terminal-infrastructure` now exposes `search()` and `getSelection()` on the xterm viewport driver, so shell-level search and clipboard flows can operate on the real terminal surface.
- `packages/sdkwork-terminal-shell` now includes a terminal search overlay, clipboard copy/paste shortcuts, and xterm viewport scrollbar styling aligned more closely with professional terminal products.
- `docs/架构/08-渲染、兼容性与终端体验设计.md` has been rewritten to freeze the current terminal-first rendering and interaction baseline.
- `docs/step/05-Terminal-Core与渲染交互基线落地.md` has been rewritten to reflect the real Step 05 state, delivered capabilities, checkpoints, and remaining gaps.
- `docs/prompts/反复执行Step指令.md` has been rewritten into a clean repeatable execution prompt with self-regression rules.

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts`
- `pnpm typecheck`

## Unreleased - Desktop PTY Session Backbone

### Changed

- `packages/sdkwork-terminal-infrastructure` now keeps `xterm` stdin enabled, binds a terminal-stage input listener, and restores focus directly on the viewport so the desktop shell can accept raw keystrokes from the terminal surface.
- `packages/sdkwork-terminal-shell` removes the detached HTML command box, keeps the live prompt inside the terminal stage, and forwards desktop keystrokes to `writeLocalShellInput(...)` whenever a real PTY-backed tab is active.
- `tests/shell-app-render.test.ts` narrows the anti-dashboard regression guard to visible UI literals and text nodes, preventing false failures from runtime identifiers such as `activeSessions`.
- `packages/sdkwork-terminal-infrastructure` now exposes `createTerminalViewportRenderPlan(...)`, so the xterm viewport driver can skip identical snapshot repaints and separate resize, refresh, and search-only updates.
- `tests/terminal-viewport-render-plan.test.ts` freezes the render-plan contract for identical snapshots, search-only updates, and viewport resize refreshes.
- `packages/sdkwork-terminal-infrastructure` now exposes `measureViewport()` on the xterm driver, and `packages/sdkwork-terminal-shell` uses a stage-local `ResizeObserver` to feed measured `cols/rows` back into the active tab viewport instead of keeping every tab pinned to the default 96x14 snapshot.
- `packages/sdkwork-terminal-shell/src/model.ts` now treats repeated viewport writes as no-op updates, so container-resize observation does not churn shell state or trigger redundant PTY resize calls.
- `packages/sdkwork-terminal-shell` now opens new tabs with the current active viewport, so newly bootstrapped desktop shell sessions start closer to the real terminal size instead of always beginning from the default viewport and correcting later.
- `packages/sdkwork-terminal-infrastructure` now exposes namespaced local-runtime event subscriptions for `session.output`, `session.warning`, and `session.exit`, so the desktop bridge can consume live PTY increments without inventing a separate transport contract.
- `apps/desktop/src/App.tsx` now passes both Tauri `invoke` and `listen` into the desktop bridge client, keeping the shell package runtime-agnostic while enabling desktop-only live session streaming.
- `src-tauri/src/lib.rs` now emits `sdkwork-terminal.runtime.v1.session.output|warning|exit` events after each replay-store append, preserving `SessionRuntime` as the replay truth source while adding a real-time desktop data path.
- `packages/sdkwork-terminal-shell` now tracks live session subscriptions per runtime tab, applies streamed replay entries immediately, and downgrades replay polling into a lower-frequency repair path instead of the primary render loop.
- `packages/sdkwork-terminal-shell/src/model.ts` now ignores replay entries at or behind the current cursor, preventing duplicate terminal output when live events and replay catch-up overlap.

- `crates/sdkwork-terminal-pty-runtime` 新增 `LocalShellSessionRuntime`，落地桌面端持久本地 shell session 的创建、输入写入、窗口尺寸调整、最佳努力终止与输出/退出事件流。
- `crates/sdkwork-terminal-shell-integration` 新增交互式 shell launch command 构建逻辑，区分一次性命令执行与持久 shell 启动。
- `src-tauri/src/lib.rs` 新增 `desktop_local_shell_session_create / input / resize / terminate` Tauri 命令，并把 PTY 事件写入 `SessionRuntime` replay store。
- `packages/sdkwork-terminal-infrastructure` 新增桌面本地 shell session bridge client API；`apps/desktop/src/App.tsx` 改为把完整 desktop runtime client 注入 shell。
- `packages/sdkwork-terminal-shell` 新增 tab 级 runtime session 绑定、replay 增量应用与桌面 blank-enter 语义；desktop tab 首屏不再注入伪 transcript，而是等待真实 shell session 输出。
- `packages/sdkwork-terminal-shell` 新增 desktop runtime bootstrap / replay polling / terminate 接线，使顶部 tabs 开始对应真实后台 session，而不是 one-shot `desktop_local_shell_exec` 结果回填。

### Verified

- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/desktop-runtime-bridge.test.ts`
- `node --experimental-strip-types --test tests/terminal-viewport-render-plan.test.ts tests/terminal-core-workbench.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/desktop-runtime-bridge.test.ts`
- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts`

- `cargo test -p sdkwork-terminal-pty-runtime`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test -p sdkwork-terminal-desktop-host`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test -p sdkwork-terminal-desktop-host --no-run`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/shell-tabs.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `pnpm dev` 启动烟测：启动阶段未立即崩溃，进程在运行中被超时截断

### Known Gap

- Desktop local shell tabs now prefer live Tauri events and keep replay as catch-up/recovery, but the frontend is still not attached to a raw VT byte stream end-to-end.
- 当前桌面终端已从 one-shot 命令执行前进到“持久 PTY session + replay polling”，但前端仍是 prompt/replay 驱动，不是最终态的 raw VT 双向流。
- Windows PowerShell 启动期已补最小 `ESC[6n -> ESC[1;1R]` 响应以解除基础 prompt 阻塞；完整 VT query/response、TUI、全量终端协商仍需在后续 raw-stream 阶段继续收口。

## Unreleased - Cross-Platform Architecture Hardening

### Changed

- `docs/架构/README.md`、`02-架构标准与总体设计.md`、`04-技术选型与可插拔策略.md`、`08-渲染、兼容性与终端体验设计.md`、`11-安全、测试与质量治理.md`、`12-安装、部署、发布与商业化交付标准.md` 已重写为跨平台 terminal 标准，明确 `desktop / server` 是双主态，`docker / k8s` 只是 `server` 的交付包装。
- 架构文档已明确“专业 terminal 不能四态全共享，只能共核但不全共享”，并把 `Windows ConPTY`、`Ubuntu/macOS POSIX PTY`、目标三元组发布物、`P0 / P1` 支持矩阵、签名/公证与平台证据写成硬约束。
- `docs/step/README.md`、`00`、`02`、`05`、`07`、`11`、`12`、`13`、`94`、`95` 已重写为可执行的实施标准，补齐串并行策略、平台适配边界、target triple、测试门禁、发布/回滚与最终 RC 判定规则。
- `docs/架构/13`、`14`、`16` 与 `docs/step/10` 已同步清理旧的多形态共享口径，统一收口到“共核但不全共享”的一致语义，避免同目录下出现互相冲突的架构标准。
- `docs/架构/01-产品设计与需求范围.md`、`16-API体系与契约设计.md`、`17-能力到API与IPC调用矩阵.md`、`docs/step/04-Desktop-Host、本地Daemon与Runtime桥接重构.md`、`docs/step/10-Server-Mode、Control-Plane、Broker与Runtime-Node落地.md` 已继续补齐 `Windows / Ubuntu / macOS / Ubuntu Server` 与 `x64 / arm64` 的平台边界、官方支持范围、桥接通道和 Server 运行基线。
- `docs/架构/03-模块规划与边界.md`、`05-功能架构与核心业务流程.md`、`06-终端会话、运行目标与协议设计.md` 与 `docs/step/03-API、IPC与Runtime-Stream契约冻结.md`、`06-Session-Runtime、Replay与Recovery主链落地.md`、`08-AI-CLI-Native-Host与Launch-Template体系落地.md` 已进一步重写，补齐模块边界、Session 协议、Desktop/Server 差异、`ConPTY / POSIX PTY`、Launch Template 与平台恢复/托管证据要求。
- 本轮继续收口平台措辞：把旧的泛化 PTY 写法统一更正为 `ConPTY / POSIX PTY`，把桌面发行版描述统一收口为“官方 Ubuntu 桌面基线”，并移除不精确的服务端交付占位写法，改为显式 `deployments/docker`、`deployments/k8s` 服务端交付边界。
- 本轮继续收口 terminal-first 文档标准：`docs/架构/07`、`09`、`10` 与 `docs/step/01`、`09`、`90` 已补强“顶部 tabs/custom header + 剩余区域 terminal stage”首页约束，明确 `Sessions / Resources / AI CLI / Settings / Diagnostics` 只能作为 drawer/overlay/palette 辅助层，不能演变为 dashboard 或多业务面板首页。
- 本轮继续收口桌面分包与并行编排标准：`README.md`、`docs/架构/15`、`docs/step/94`、`docs/step/10` 已统一到 `packages/sdkwork-terminal-xxx` + `@sdkwork/terminal-xxx` 命名规范，明确 `claw-studio` 式 workspace 纪律、首页 terminal-first 约束，以及 Server Mode 只能复用 `packages/sdkwork-terminal-*` 共核前端包，不再出现 `packages/web-shell` 这类偏离规范的命名。
- 本轮继续把 terminal-first 首页约束写入评估与验收层：`docs/架构/14` 与 `docs/step/95` 已新增 `tabs/custom header + terminal stage` 首页主链、无 dashboard 回归、自定义 header/window controls 证据等门禁，避免设计文档与最终验收标准脱节。
- 本轮继续收口 release 文档解释规则：`docs/release/README.md` 与 `CHANGELOG.md` 顶部已新增“历史条目按当时事实保留，当前有效标准以 `README.md`、`docs/架构/`、`docs/step/` 最新内容为准”的说明，避免历史措辞误导当前实现判断。
- 本轮继续统一 review/release 历史记录解释规则：`docs/review/README.md` 已同步新增“历史 review 按当时事实保留，当前有效标准以最新架构/step 文档为准”的说明，避免旧审计措辞干扰当前实现与验收判断。
- 本轮补充真实工程对齐证据：新增 `docs/review/2026-04-09-workspace-shell与web入口对齐验证.md`，确认 `apps/desktop` 与 `apps/web` 已共同复用 `@sdkwork/terminal-shell`，并以 `pnpm typecheck` 与 shell 相关 13 个测试通过作为当前 shell 主舞台对齐证据。

## Unreleased - Terminal Header Interaction Refinement

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` adds per-tab `commandHistory` and `historyIndex`, keeps duplicated tabs history-aligned, and records submitted commands before execution so each tab behaves like an independent shell.
- `packages/sdkwork-terminal-shell/src/model.ts` adds `recallPreviousTerminalShellCommand`, `recallNextTerminalShellCommand`, and `shouldDockTerminalTabActions` to formalize shell-history recall and width-based header docking decisions.
- `packages/sdkwork-terminal-shell/src/index.tsx` wires `ArrowUp` / `ArrowDown` into prompt history recall, removes the fake placeholder, and keeps the stage closer to a real terminal prompt.
- `packages/sdkwork-terminal-shell/src/index.tsx` replaces the old `tabs.length > 3` docking heuristic with real header-width / tab-content measurement plus overflow detection, so `new tab` and profile actions stay next to tabs until space is actually tight.
- `packages/sdkwork-terminal-shell/src/index.tsx` makes the left drag spacer conditional after docking, so once `+ / dropdown` moves to the right header, the tabs row reclaims the full remaining width instead of splitting space with an empty spacer.
- `packages/sdkwork-terminal-shell/src/index.tsx` aligns the terminal stage closer to `sdkwork-birdcoder-terminal` by introducing a shared stage inset for the xterm viewport and the prompt row, tightening the tab corner radius, and giving the dropdown button an explicit open state instead of a permanently flat chrome treatment.
- `src-tauri/capabilities/default.json` expands the desktop capability set for app-owned chrome, including minimize / maximize / unmaximize / close and related window-control permissions required by the custom Tauri header.

### Fixed

- Fixes premature docking of `+ / dropdown` into the right header area when tab count was still low and the tabs row had enough width.
- Fixes the docked-header regression where tabs only used roughly half of the left header width because the drag spacer kept stretching after actions moved right.
- Fixes missing command-history recall for the terminal prompt, which made the shell surface diverge from `sdkwork-birdcoder-terminal` and Windows Terminal behavior.
- Fixes custom desktop window controls being present in UI but under-provisioned in Tauri capability scope.

## Unreleased - Custom Header Docking Alignment

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` 将 terminal header 收口为 `leading / trailing / window-controls` 三槽结构，对齐 `claw-studio` 的自定义 header 组织方式。
- `packages/sdkwork-terminal-shell/src/index.tsx` 新增 `shouldDockTabActionsToTrailing`，当 tabs 数量较少时 `+ / dropdown` 紧跟 tabs；当 tabs 数量变多或发生溢出时，自动切换到右侧并贴近 window controls。
- `packages/sdkwork-terminal-shell/src/index.tsx` 新增桌面 header 所需的 `data-tauri-drag-region` 与 `data-slot` 标记，保证左侧 tabs 区可拖拽、交互控件不可拖拽。
- `packages/sdkwork-terminal-shell/src/index.tsx` 新增桌面 window controls 视图层，提供 `Minimize / Maximize / Restore / Close` 控件，并保持 terminal 页仍然是“顶部 header + 下方 terminal stage”。
- `apps/desktop/src/App.tsx` 新增桌面 window controller 注入，由 desktop 宿主接管 Tauri `window` API，`shell` 包不再直接依赖桌面运行时模块。
- `src-tauri/tauri.conf.json` 将主窗口 `decorations` 设为 `false`，由应用自身接管标题栏与窗口控制区。

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-tabs.test.ts tests/terminal-view-driver.test.ts`
- `pnpm typecheck`
- `pnpm build`

## Unreleased - Visual Alignment Refinement

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` 将顶部 header 进一步向 `sdkwork-birdcoder-terminal` / `Windows Terminal` 收口：tabs 增加 hover 感知、active 底部遮罩、inactive close 按钮 hover 才显示，并将 `+ / chevron / close` 替换为终端风格 SVG glyph。
- `packages/sdkwork-terminal-shell/src/index.tsx` 将 tab/profile glyph 从纯色圆点升级为终端图标样式，减少 dashboard 感，强化“顶部 tabs + 下方 terminal stage”的产品语义。
- `packages/sdkwork-terminal-shell/src/index.tsx` 去掉底部命令输入行中的 `running / ready` 状态文案，弱化工具栏感；输入行改为与 terminal stage 一体化排版。
- `packages/sdkwork-terminal-infrastructure/src/index.ts` 将 xterm 字体与主题对齐到终端舞台：`Cascadia Code`、`#18181b` 背景、`#cccccc` 前景，消除与 shell stage 配色割裂。

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-tabs.test.ts tests/terminal-view-driver.test.ts`
- `pnpm typecheck`
- `pnpm build`

## Unreleased - Tab Context Menu Alignment

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` 新增 `duplicateTerminalShellTab`、`closeTerminalShellTabsExcept`、`closeTerminalShellTabsToRight`，补齐 tabs 右键菜单所需的窗口级状态操作，并在批量关 tab 后重算 `nextTabIndex`。
- `packages/sdkwork-terminal-shell/src/model.ts` 复制 tab 时按当前终端快照重建 adapter，保留 transcript、search、selection、working directory、invoked program 与 exit code。
- `packages/sdkwork-terminal-shell/src/index.tsx` 新增与 `sdkwork-birdcoder-terminal` / `Windows Terminal` 对齐的 tab 右键菜单，支持 `Close tab`、`Close other tabs`、`Close tabs to the right`、`Duplicate tab`。
- `packages/sdkwork-terminal-shell/src/index.tsx` 新增菜单定位、越界收口、点击外部关闭，以及 tabs / profile menu 之间的互斥交互，保持顶部 header 仍然是纯 tabs terminal chrome。

### Fixed

- 修复 tabs 缺少右键菜单、无法完成标准终端 tab 管理动作的问题。
- 修复批量关 tab 后新建 tab 编号游标漂移，导致行为与测试及参考实现不一致的问题。

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-tabs.test.ts`
- `pnpm typecheck`
- `pnpm build`

## Unreleased - Terminal UI Alignment

### Changed

- `packages/sdkwork-terminal-shell/src/index.tsx` 已按 `sdkwork-birdcoder-terminal` / `Windows Terminal` 方向重构为纯终端主界面：顶部仅保留 tabs、新建 tab、profile 菜单，主体仅保留 terminal viewport 与底部命令输入行。
- `packages/sdkwork-terminal-shell/src/index.tsx` 已补齐更接近参考实现的 header 细节：tab 溢出左右滚动控制、`Shells / AI CLI` 分组启动菜单，以及 `Codex / Claude Code / Gemini / OpenCode` CLI 入口。
- `packages/sdkwork-terminal-shell/src/model.ts` 已将布局契约收口为 `tablist + new-tab-button + profile-menu`，去掉与主界面不一致的辅助面板定义，并同步调整初始 shell 文案，使首屏更接近真实终端。
- `apps/desktop/src/App.tsx` 已收敛为纯 shell 挂载入口，仅保留桌面本地命令执行桥接，不再把资源中心、会话中心、桌面 host 状态条挂进首页。
- `apps/desktop/index.html` 与 `apps/web/index.html` 已补齐全屏根样式重置，消除浏览器默认白边与外层留白。
- `tools/scripts/run-tauri-dev.mjs` 已增加 Windows 下的 desktop host 残留进程与旧二进制预清理逻辑，避免 `pnpm dev` 因 `sdkwork-terminal-desktop-host.exe` 文件锁失败。
- `src-tauri/Cargo.toml` 与 `src-tauri/src/main.rs` 已将桌面 host 的 lib crate 更名为 `sdkwork_terminal_desktop_host_lib`，消除 lib/bin 输出同名碰撞。

### Fixed

- 修复首页偏向 dashboard/workbench、未能体现 `tabs -> shell window` 主模型的问题。
- 修复 `Resources / Sessions / Settings / Diagnostics` 抢占终端主舞台、破坏 terminal-first 视觉和交互的问题。
- 修复根节点默认 margin 导致上下左右出现白边和外层 padding 的问题。

### Verified

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-tabs.test.ts`
- `node --test tests/tauri-dev-script.test.mjs tests/workspace-structure.test.mjs`
- `pnpm typecheck`
- `pnpm build`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## Unreleased

### Changed

- `packages/sdkwork-terminal-shell/src/model.ts` 新增 terminal shell tab 状态模型，已支持 `open / activate / close / run-command / search / resize / selection copy`，并保证各 tab transcript 独立。
- `packages/sdkwork-terminal-shell/src/index.tsx` 已从 dashboard/workbench 卡片布局重构为 `Windows Terminal` 风格壳层：顶部 `tab strip`、中部 active terminal stage、底部 secondary utility drawer。
- `apps/desktop/src/App.tsx` 已移除顶部大号 desktop host 状态卡，并把 daemon / bridge 状态与控制动作收口到 shell 顶部轻量状态条。

### Fixed

- 修复桌面主界面偏成 dashboard prototype、无法体现 `tabs -> shell window` 主心智的问题。
- 修复 `Sessions / Resources / AI CLI / Settings / Diagnostics` 抢占首页主舞台、导致 terminal-first 目标失真的问题。
- 修复 desktop host 状态区块独立占屏、破坏 `Windows Terminal` 风格顶栏与 tab 布局的问题。

### Verified

- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm build`

## 0.2.40 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayEvidenceFreshness` 与 `summarizeSessionReplayEvidenceFreshness`，让 Session Center 从 bounded replay 的 latest warning/exit evidence 与 `observedAt` 直接派生 evidence freshness projection。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay evidence freshness 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / state lag / state freshness / state ack / state/output delta / latest output / output lag / output ack / output freshness / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / evidence ack / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay evidence freshness 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.40`。

### Fixed

- 修复 Session Center 已能显示 warning/exit evidence digest 与 evidence ack，但仍无法直接判断 latest evidence 本身是否陈旧的问题。
- 修复 loaded replay 需要人工同时比对 evidence occurrence 与整体 freshness 才能判断风险时效的问题。
- 修复 Step 07 文档未同步 replay evidence freshness projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-evidence-freshness-projection验证.md`
- `docs/release/2026-04-09-v0.2.40.md`

## 0.2.39 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayEvidenceAck` 与 `summarizeSessionReplayEvidenceAck`，让 Session Center 从 bounded replay 的 latest warning/exit evidence sequence 与 attachment `lastAckSequence` 直接派生 evidence ack summary。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay evidence ack summary 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / state lag / state freshness / state ack / state/output delta / latest output / output lag / output ack / output freshness / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay evidence ack summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.39`。

### Fixed

- 修复 Session Center 已能显示 warning/exit evidence digest，但仍无法直接判断 attachment ack 是否已覆盖 latest evidence 的问题。
- 修复 loaded replay 需要人工同时比对 evidence sequence 与 `lastAckSequence` 才能判断消费关系的问题。
- 修复 Step 07 文档未同步 replay evidence ack summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-evidence-ack-summary验证.md`
- `docs/release/2026-04-09-v0.2.39.md`

## 0.2.38 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayStateAck` 与 `summarizeSessionReplayStateAck`，让 Session Center 从 bounded replay 的 latest `state` sequence 与 attachment `lastAckSequence` 直接派生 state ack summary。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay state ack summary 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / state lag / state freshness / state/output delta / latest output / output lag / output ack / output freshness / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay state ack summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.38`。

### Fixed

- 修复 Session Center 已能显示 latest state、state lag 与 attachment ack 全局位置，但仍无法直接判断 attachment 是否已经覆盖 latest state 的问题。
- 修复 loaded replay 需要人工同时比对 latest state 与 `lastAckSequence` 才能理解状态消费进度的问题。
- 修复 Step 07 文档未同步 replay state ack summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-state-ack-summary验证.md`
- `docs/release/2026-04-09-v0.2.38.md`

## 0.2.37 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayStateOutputDelta` 与 `summarizeSessionReplayStateOutputDelta`，让 Session Center 从 bounded replay 的 latest `state` / latest `output` sequence 直接派生 state/output delta summary。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay state/output delta summary 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / state lag / state freshness / latest output / output lag / output ack / output freshness / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay state/output delta summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.37`。

### Fixed

- 修复 Session Center 已能分别显示 latest state 与 latest output，但仍无法直接判断谁更新、差多少的问题。
- 修复 loaded replay 需要人工比对 state/output sequence 才能判断读侧时序的问题。
- 修复 Step 07 文档未同步 replay state/output delta summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-state-output-delta-summary验证.md`
- `docs/release/2026-04-09-v0.2.37.md`

## 0.2.36 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayStateFreshness` 与 `summarizeSessionReplayStateFreshness`，让 Session Center 从 latest `state` event 与 `observedAt` 派生 state freshness projection。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay state freshness projection 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / state lag / latest output / output lag / output ack / output freshness / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay state freshness projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.36`。

### Fixed

- 修复 Session Center 已能显示 latest state 与 state lag，但仍无法直接判断最新 state 自身是否陈旧的问题。
- 修复 loaded replay 只能用整体 freshness 或 latest state 单点近似理解状态时效，无法直接读出 latest state 相对 `observedAt` 老化程度的问题。
- 修复 Step 07 文档未同步 replay state freshness projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-state-freshness-projection验证.md`
- `docs/release/2026-04-09-v0.2.36.md`

## 0.2.35 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayStateLag` 与 `summarizeSessionReplayStateLag`，让 Session Center 从 latest `state` sequence 与 latest replay sequence 派生 state lag 摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay state lag summary 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / latest output / output lag / output ack / output freshness / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay state lag summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.35`。

### Fixed

- 修复 Session Center 已能显示 latest state，但仍无法直接判断该 state 相对最新 replay 证据是否滞后的问题。
- 修复 loaded replay 只能从 transcript 或 latest state 单点理解状态时序，无法直接读出 latest state 与最新 replay event 差值的问题。
- 修复 Step 07 文档未同步 replay state lag summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-state-lag-summary验证.md`
- `docs/release/2026-04-09-v0.2.35.md`

## 0.2.34 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayOutputAck` 与 `summarizeSessionReplayOutputAck`，让 Session Center 从 `lastAckSequence` 与 latest output sequence 派生 output ack 摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay output ack summary 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / latest output / output lag / output freshness / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay output ack summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.34`。

### Fixed

- 修复 Session Center 已能显示 ack lag 与 output lag，但仍无法直接判断 attachment 是否已经消费到最新终端输出的问题。
- 修复 loaded replay 无法区分“ack 落后于 latest output”和“ack 已覆盖 latest output 但仍落后于更晚非 output 证据”的问题。
- 修复 Step 07 文档未同步 replay output ack summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-output-ack-summary验证.md`
- `docs/release/2026-04-09-v0.2.34.md`

## 0.2.33 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayOutputLag` 与 `summarizeSessionReplayOutputLag`，让 Session Center 从 latest output sequence 与 latest replay sequence 派生 output lag 摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay output lag summary 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / latest output / output freshness / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay output lag summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.33`。

### Fixed

- 修复 Session Center 已能显示 latest output 与 output freshness，但仍无法直接判断最新终端输出是否已经落后于更晚 replay 证据的问题。
- 修复 loaded replay 只能从 transcript 明细或 freshness 近似理解 output 时序，无法直接读出 latest output 相对最新 replay event 滞后的问题。
- 修复 Step 07 文档未同步 replay output lag summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-output-lag-summary验证.md`
- `docs/release/2026-04-09-v0.2.33.md`

## 0.2.32 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayOutputFreshness` 读模型与 `summarizeSessionReplayOutputFreshness`，让 Session Center 基于最新 `output` 事件和 `observedAt` 派生终端输出 freshness 摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay output freshness projection 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / latest output / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay output freshness projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.32`。

### Fixed

- 修复 Session Center 已能显示 latest output 与整体 freshness，但仍无法区分“最新 replay 事件仍新鲜”和“最近终端输出是否仍新鲜”的问题。
- 修复 loaded replay 只能通过 latest event freshness 近似判断输出活跃度，无法直接读出 latest output freshness 的问题。
- 修复 Step 07 文档未同步 replay output freshness projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-output-freshness-projection验证.md`
- `docs/release/2026-04-09-v0.2.32.md`

## 0.2.31 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayLatestOutput` 读模型与 `summarizeSessionReplayLatestOutput`，让 Session Center 直接从 replay `output` 事件派生最新终端输出摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay latest output projection 文本，和 replay status / cursor / cursor drift / ack lag / ack window / window coverage / latest state / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay latest output projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.31`。

### Fixed

- 修复 Session Center 已能显示 latest state / warning / exit，但仍无法直接读出最近一条终端输出摘要的问题。
- 修复 loaded replay 只能通过 transcript 明细查看 output，无法在会话摘要层直接看到 latest output projection 的问题。
- 修复 Step 07 文档未同步 replay latest output projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-latest-output-projection验证.md`
- `docs/release/2026-04-09-v0.2.31.md`

## 0.2.30 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayWindowCoverage` 读模型与 `summarizeSessionReplayWindowCoverage`，让 Session Center 只基于 `fromCursor / nextCursor / hasMore / first-last sequence` 显式表达当前 bounded replay 是 `full / head / middle / tail` 哪一种历史窗口。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay window coverage summary 文本，和 replay status / cursor / cursor drift / ack lag / ack window / latest state / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay window coverage summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.30`。

### Fixed

- 修复 Session Center 已能显示 replay ack window，但仍无法判断当前 bounded replay 究竟覆盖完整历史、历史头部、中段还是尾部窗口的问题。
- 修复 loaded replay 只能看到 cursor / ack / window 范围，无法直接读出当前 replay slice 历史覆盖位置的问题。
- 修复 Step 07 文档未同步 replay window coverage summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-window-coverage-summary验证.md`
- `docs/release/2026-04-09-v0.2.30.md`

## 0.2.29 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayAckWindow` 读模型与 `summarizeSessionReplayAckWindow`，让 Session Center 显式表达 attachment ack 位点相对 bounded replay window 的 before / within / after 只读事实。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay ack window summary 文本，和 replay status / cursor / cursor drift / ack lag / latest state / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay ack window summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.29`。

### Fixed

- 修复 Session Center 已可显示 replay ack lag，但仍无法解释 ack 当前处于回放窗口之前、窗口内还是窗口之后的问题。
- 修复 loaded replay 只能看到 ack 差值、无法直接读出 ack 与当前 bounded replay window 相对位置的问题。
- 修复 Step 07 文档未同步 replay ack window summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-ack-window-summary验证.md`
- `docs/release/2026-04-09-v0.2.29.md`

## 0.2.28 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayAckLag` 读模型与 `summarizeSessionReplayAckLag`，让 Session Center 对 attachment `lastAckSequence` 与 replay 最新 sequence 之间的差值显式给出只读摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay ack lag summary 文本，和 replay status / cursor / cursor drift / latest state / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay ack lag summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.28`。

### Fixed

- 修复 Session Center 已可显示 replay cursor 与 cursor drift，但仍无法判断 attachment ack 与 replay 最新事件之间差距的问题。
- 修复 loaded replay 只能看到窗口范围、无法直接读出 ack 跟进程度摘要的问题。
- 修复 Step 07 文档未同步 replay ack lag summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-ack-lag-summary验证.md`
- `docs/release/2026-04-09-v0.2.28.md`

## 0.2.27 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayCursorDrift` 读模型与 `summarizeSessionReplayCursorDrift`，让 Session Center 对可比较的 replay cursor 窗口显式给出 aligned / shifted 摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay cursor drift summary 文本，和 replay status / cursor / latest state / health / latest warning / latest exit / freshness / timeline gap / sequence gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay cursor drift summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.27`。

### Fixed

- 修复 Session Center 已可显示 replay cursor metadata，但仍无法判断已请求 cursor 与当前窗口首条事件是否对齐的问题。
- 修复 loaded replay 只能看到 cursor 窗口范围、无法直接读出 shifted cursor 摘要的问题。
- 修复 Step 07 文档未同步 replay cursor drift summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-cursor-drift-summary验证.md`
- `docs/release/2026-04-09-v0.2.27.md`

## 0.2.26 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replaySequenceGap` 读模型与 `summarizeSessionReplaySequenceGap`，让 Session Center 从 bounded replay slice 派生最大 sequence gap 摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay sequence gap summary 文本，和 replay status / cursor / latest state / health / latest warning / latest exit / freshness / timeline gap / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay sequence gap summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.26`。

### Fixed

- 修复 Session Center 已可显示 timeline gap，但仍无法表达 bounded replay slice 内 sequence 跳号的问题。
- 修复 loaded replay 只能看到时间间隔、无法直接读出丢失序号数量摘要的问题。
- 修复 Step 07 文档未同步 replay sequence gap summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-sequence-gap-summary验证.md`
- `docs/release/2026-04-09-v0.2.26.md`

## 0.2.25 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayGap` 读模型与 `summarizeSessionReplayGap`，让 Session Center 从 bounded replay slice 派生最大 timeline gap 摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay timeline gap summary 文本，和 replay status / cursor / latest state / health / latest warning / latest exit / freshness / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay timeline gap summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.25`。

### Fixed

- 修复 Session Center 已可显示 freshness 与 timeline 时间窗口，但仍无法表达回放窗口内最大事件间隔的问题。
- 修复 loaded replay 只能看到首尾时间、无法直接读出窗口内最大间隔摘要的问题。
- 修复 Step 07 文档未同步 replay timeline gap summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-timeline-gap-summary验证.md`
- `docs/release/2026-04-09-v0.2.25.md`

## 0.2.24 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayFreshness` 读模型与 `summarizeSessionReplayFreshness`，让 Session Center 从最新 replay 证据与 `observedAt` 派生 freshness 投影。
- `apps/desktop/src/session-center.ts` 已支持 `observedAt` 注入，保证桌面端 freshness 投影可重复验证。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay freshness 文本，和 replay status / cursor / latest state / health / latest warning / latest exit / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay freshness projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.24`。

### Fixed

- 修复 Session Center 已可显示 latest warning、latest exit、health 与 timeline，但仍无法表达“最近回放证据距离当前观测点有多旧”的问题。
- 修复 loaded replay 只能看到事件事实、无法直接读出 fresh / aging / stale 级别摘要的问题。
- 修复 Step 07 文档未同步 replay freshness projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-freshness-projection验证.md`
- `docs/release/2026-04-09-v0.2.24.md`

## 0.2.23 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayLatestExit` 读模型与 `summarizeSessionReplayLatestExit`，让 Session Center 从 replay slice 派生最新 exit 投影。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay latest exit 文本，和 replay status / cursor / latest state / health / latest warning / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay latest exit projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.23`。

### Fixed

- 修复 Session Center 已可显示 replay latest warning、health、timeline、mix 与 warning/exit evidence，但仍无法显式表达最新 exit 事实的问题。
- 修复 loaded replay 只能通过 health / evidence 间接看见退出结果、无法直接读出最新 exit 码 / 序号 / 时间的问题。
- 修复 Step 07 文档未同步 replay latest exit projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-latest-exit-projection验证.md`
- `docs/release/2026-04-09-v0.2.23.md`

## 0.2.22 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayLatestWarning` 读模型与 `summarizeSessionReplayLatestWarning`，让 Session Center 从 replay slice 派生最新 warning 投影。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay latest warning 文本，和 replay status / cursor / latest state / health / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay latest warning projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.22`。

### Fixed

- 修复 Session Center 已可显示 replay health、timeline、mix 与 warning/exit evidence，但仍无法显式表达最新 warning 事实的问题。
- 修复 loaded replay 只能展示 warning 汇总与健康级别、无法直接读出最新 warning 消息 / 序号 / 时间的问题。
- 修复 Step 07 文档未同步 replay latest warning projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-latest-warning-projection验证.md`
- `docs/release/2026-04-09-v0.2.22.md`

## 0.2.21 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayHealth` 读模型与 `summarizeSessionReplayHealth`，让 Session Center 从 replay status / latest state / evidence 派生 replay health summary。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay health summary 文本，和 replay status / cursor / latest state / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay health summary 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.21`。

### Fixed

- 修复 Session Center 已可显示 replay latest state、timeline、mix 与 warning/exit evidence，但仍无法显式表达健康/就绪状态的问题。
- 修复 loaded replay 只能展示事实碎片、无法给出 ready / degraded / failed / unknown 级别摘要的问题。
- 修复 Step 07 文档未同步 replay health summary 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-health-summary验证.md`
- `docs/release/2026-04-09-v0.2.21.md`

## 0.2.20 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayLatestState` 读模型与 `summarizeSessionReplayLatestState`，让 Session Center 从 bounded replay slice 派生 latest state projection。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay latest state projection 文本，和 replay status / cursor / timeline / mix / evidence / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay latest state projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.20`。

### Fixed

- 修复 Session Center 已可显示 replay 窗口、事件分布与 warning/exit 证据，但仍无法显式表达 latest state 事实的问题。
- 修复 loaded replay 只能展示 transcript / status / cursor / timeline / mix / evidence、无法读出最新 `state` 事件投影的问题。
- 修复 Step 07 文档未同步 replay latest state projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-latest-state-projection验证.md`
- `docs/release/2026-04-09-v0.2.20.md`

## 0.2.19 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayEvidence` 读模型与 `summarizeSessionReplayEvidence`，让 Session Center 从 bounded replay slice 派生 warning / exit 证据摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay warning/exit evidence digest 文本，和 replay status / cursor / timeline / mix / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay evidence projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.19`。

### Fixed

- 修复 Session Center 已可显示 replay 时间窗口、游标窗口与事件分布，但仍无法显式表达 warning / exit 证据的问题。
- 修复 loaded replay 只能展示 transcript / status / cursor / timeline / mix、无法读出 warning / exit digest 事实的问题。
- 修复 Step 07 文档未同步 replay warning/exit evidence digest projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-warning-exit-evidence-digest验证.md`
- `docs/release/2026-04-09-v0.2.19.md`

## 0.2.18 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayMix` 读模型与 `summarizeSessionReplayMix`，让 Session Center 保留 replay slice 的事件分布摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay event mix metadata 文本，和 replay status / cursor / timeline / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay mix projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.18`。

### Fixed

- 修复 Session Center 已可显示时间窗口与游标窗口，但仍无法显式表达 replay 事件分布的问题。
- 修复 loaded replay 只能展示 transcript / status / cursor / timeline、无法读出 kind mix 事实的问题。
- 修复 Step 07 文档未同步 replay event mix metadata projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-event-mix-metadata验证.md`
- `docs/release/2026-04-09-v0.2.18.md`

## 0.2.17 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayTimeline` 读模型与 `summarizeSessionReplayTimeline`，让 Session Center 保留 replay slice 的时间窗口摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay timeline metadata 文本，和 replay status / cursor / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay timeline projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.17`。

### Fixed

- 修复 Session Center 已可显示 replay cursor metadata，但仍无法显式表达 replay 事件时间窗口的问题。
- 修复 loaded replay 只能展示 transcript / status / cursor，无法读出 `firstOccurredAt / lastOccurredAt` 事实的问题。
- 修复 Step 07 文档未同步 replay timeline metadata projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-timeline-metadata验证.md`
- `docs/release/2026-04-09-v0.2.17.md`

## 0.2.16 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayCursor` 读模型与 `summarizeSessionReplayCursor`，让 Session Center 保留 replay slice 的 cursor 窗口摘要。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay cursor metadata 文本，和 replay status / transcript 并列呈现。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay cursor projection 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.16`。

### Fixed

- 修复 Session Center 已具备 replay status，但仍无法显式表达 `fromCursor / nextCursor / hasMore` 窗口事实的问题。
- 修复 UI 只能看到 replay window 与 unavailable 诊断、无法读出当前 cursor 窗口摘要的问题。
- 修复 Step 07 文档未同步 replay cursor metadata projection 事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-cursor-metadata验证.md`
- `docs/release/2026-04-09-v0.2.16.md`

## 0.2.15 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replayFailures` 输入、`replayStatus` 读模型与 `summarizeSessionReplayStatus`，让 Session Center 同时保留 bounded replay window 摘要与 replay unavailable 诊断。
- `apps/desktop/src/session-center.ts` 已把 `desktop_session_replay_slice` 读取失败显式回写为 replay diagnostics，而不是静默回退为空 slice。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 replay status 文本，配合 transcript 列表提供更真实的只读状态。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已补齐 replay status / replay failure 断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.15`。

### Fixed

- 修复 desktop Session Center 在 replay 读取失败时静默伪装成空回放的状态漂移问题。
- 修复 Session snapshot 只能保留 transcript 明细、不能表达 replay window 与 unavailable 诊断的问题。
- 修复 Step 07 文档未体现 replay status diagnostics 投影事实的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-status-diagnostics验证.md`
- `docs/release/2026-04-09-v0.2.15.md`

## 0.2.14 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-sessions/src/model.ts` 新增 `replaySlice` 保留与 `createSessionReplayHistoryLines`，让 Session Center 不再只保留 replay preview。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示 bounded replay history 列表，而不是只显示最新 replay 摘要。
- `tests/sessions-panel.test.ts` 新增 session replay transcript formatter 测试，`tests/session-center.test.ts` 与 `tests/desktop-session-center.test.ts` 已补齐 replay slice 明细断言。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.14`。

### Fixed

- 修复 Session Center 只保留 replay preview、无法展示 bounded transcript 明细的问题。
- 修复 desktop loader 已取回 replay slice、但 snapshot 模型丢弃 entry 明细的问题。
- 修复 Step 07 文档仍停留在 replay evidence / preview 表述、未体现 bounded transcript projection 的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-session-replay-transcript-projection验证.md`
- `docs/release/2026-04-09-v0.2.14.md`

## 0.2.13 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-infrastructure/src/index.ts` 新增 `DesktopSessionReplayRequest`、`DesktopSessionReplaySnapshot` 与 `sessionReplay` bridge。
- `src-tauri/src/lib.rs` 新增 `DesktopSessionReplaySnapshot`、`DesktopRuntimeState::session_replay_slice` 与 `desktop_session_replay_slice`，把 `SessionRuntime::replay` 以受限只读 IPC 暴露到桌面端。
- `packages/sdkwork-terminal-sessions/src/model.ts` 新增 replay slice / replay preview 投影，`apps/desktop/src/session-center.ts` 已串通 `desktop_session_index / desktop_session_replay_slice -> Session Center snapshot + replay preview`。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已在 `SessionsPanel` 展示只读 replay 摘要，避免 Session Center 停留在纯计数视图。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.13`。

### Fixed

- 修复 runtime 已具备 replay 读能力、但 desktop bridge 与 Session Center 无法消费该事实的问题。
- 修复 `SessionsPanel` 只能显示 session/attachment 真相、无法展示最小 replay 证据的问题。
- 修复 Step 07 文档仍停留在 session index 子阶段、未体现 replay slice bridge 与只读 evidence projection 的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-desktop-session-replay-bridge验证.md`
- `docs/release/2026-04-09-v0.2.13.md`

## 0.2.12 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-infrastructure/src/index.ts` 新增 `DesktopSessionIndexSnapshot` 与 `sessionIndex` bridge。
- `src-tauri/src/lib.rs` 新增 `desktop_session_index`，可把 runtime 中的 session / attachment 快照直接暴露给桌面端。
- `apps/desktop/src/session-center.ts` 与 `apps/desktop/src/App.tsx` 已把 `desktop_session_index -> Session Center snapshot` 串成桌面读链。
- `packages/sdkwork-terminal-shell/src/index.tsx` 已支持透传真实 `sessions` snapshot。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.12`。

### Fixed

- 修复 `SessionsPanel` 仍停留在 demo 数据、无法展示 launch / exec probe 后真实 runtime session 的问题。
- 修复桌面端缺少 session index IPC、导致 Session Center 与 resource actions 结果脱节的问题。
- 修复 Session runtime 已具备真实 session truth，但桌面工作台未消费该 truth 的缺口。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `pnpm typecheck`
- `pnpm build`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-desktop-session-index-bridge验证.md`
- `docs/release/2026-04-09-v0.2.12.md`

## 0.2.11 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-resources/src/model.ts` 新增 `ResourceActionKind`、`createConnectorExecProbeRequest`、`createResourceTargetActions` 与 exec probe 摘要生成能力。
- `packages/sdkwork-terminal-resources/src/index.tsx` 已从单一 launch 按钮升级为 launch / exec probe 双动作面板。
- `apps/desktop/src/resource-launch.ts` 与 `apps/desktop/src/App.tsx` 已接通 `ResourcesPanel -> desktop_connector_exec_probe -> exec probe summary` 桌面闭环。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.11`。

### Fixed

- 修复 desktop host 已有 `desktop_connector_exec_probe`，但桌面资源面板仍无法直接触发 bounded exec probe 的问题。
- 修复 Resource Center 对 connector-backed target 仅有 launch 动作、缺少统一 exec probe 动作状态与标签的缺口。
- 修复 exec probe 缺少结构化 `exitCode / output / warning` 摘要投影的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `pnpm typecheck`
- `pnpm build`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-desktop-exec-probe-bridge验证.md`
- `docs/release/2026-04-09-v0.2.11.md`

## 0.2.10 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-resources/src/model.ts` 新增 `ResourceLaunchSummary`、`ResourceLaunchStatus` 与 launch 成功/失败摘要生成能力。
- `packages/sdkwork-terminal-resources/src/index.tsx` 新增 resource launch action、launching 状态与结构化结果投影。
- `packages/sdkwork-terminal-shell/src/index.tsx` 新增 resources 组合透传，`apps/desktop/src/App.tsx` 与 `apps/desktop/src/resource-launch.ts` 已接通 `ResourcesPanel -> desktop_connector_launch -> launch summary` 最小闭环。
- `apps/web/vite.config.ts`、`apps/desktop/vite.config.ts` 与 `vite.workspace-alias.ts` 对齐 workspace alias，消除 `tsconfig` 与 Vite 构建期解析偏差。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.10`。

### Fixed

- 修复 Resource Center 仍停留在只读状态、桌面端无法直接发起 connector launch 的问题。
- 修复 launch 结果无法在资源面板中收口为统一成功/失败证据的问题。
- 修复 workspace package alias 仅在 `tsc` 可解析、Vite 构建期失效的问题。

### Verified

- `node --experimental-strip-types --test tests/resource-center.test.ts`
- `node --experimental-strip-types --test tests/desktop-resource-launch.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-desktop-resource-launch-loop验证.md`
- `docs/release/2026-04-09-v0.2.10.md`

## 0.2.9 - 2026-04-09

### Changed

- 继续推进 Step 07：`src-tauri/src/lib.rs` 新增 `DesktopConnectorLaunchSnapshot`、`DesktopReplayEntrySnapshot`、`DesktopRuntimeState::launch_connector_session` 与 `desktop_connector_launch`。
- `packages/sdkwork-terminal-infrastructure/src/index.ts` 新增 connector launch bridge 类型与 `launchConnectorSession`。
- desktop bridge client 现可通过 Tauri IPC 调用 connector launch，并返回 session + replay 快照。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.9`。

### Fixed

- 修复 host connect bridge 仅停留在宿主内部函数、前端 bridge 无法直接调用的问题。
- 修复 connector launch IPC 缺少结构化返回体、无法为 UI 提供 session 与 replay 证据的问题。

### Verified

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --workspace`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-desktop-ipc-launch-bridge验证.md`
- `docs/release/2026-04-09-v0.2.9.md`

## 0.2.8 - 2026-04-09

### Changed

- 继续推进 Step 07：`src-tauri/Cargo.toml` 新增 `sdkwork-terminal-resource-connectors` 依赖。
- `src-tauri/src/lib.rs` 新增 `launch_connector_session_from_request`，用于把 protocol launch request 串接到 CLI launch plan、connect phase 与 runtime launch resolution。
- connect 成功时回写 `Running + replay state`，失败时回写 `Failed + replay warning`。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.8`。

### Fixed

- 修复 connector launch request 仍停留在“计划可生成”层、未进入桌面宿主组合桥接的问题。
- 修复 connect phase 结果未回写 session runtime、导致 host 层无法形成真实状态闭环的问题。

### Verified

- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo test --workspace`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm typecheck`
- `pnpm build`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-host-connect-bridge验证.md`
- `docs/release/2026-04-09-v0.2.8.md`

## 0.2.7 - 2026-04-09

### Changed

- 继续推进 Step 07：`crates/sdkwork-terminal-session-runtime` 新增 `ConnectorLaunchResolution` 与 `SessionRuntime::resolve_connector_launch`。
- connector-backed Session 在 attach / output 期间保持 `Starting`，必须通过显式 launch resolution 收口到 `Running / Failed`。
- connector 启动成功时写入 replay `state` 证据，失败时写入 replay `warning` 证据。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.7`。

### Fixed

- 修复 connector-backed Session 仍可能被 attach / output 提前改写状态、导致 `Starting` 真相漂移的问题。
- 修复 runtime 缺少 connector 启动成功/失败显式收口接口、无法沉淀 replay 证据的问题。

### Verified

- `cargo test -p sdkwork-terminal-session-runtime`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-launch-resolution验证.md`
- `docs/release/2026-04-09-v0.2.7.md`

## 0.2.6 - 2026-04-09

### Changed

- 继续推进 Step 07：`crates/sdkwork-terminal-session-runtime` 新增 `SessionLaunchIntent`，用于保存 connector-backed Session 的启动意图。
- `crates/sdkwork-terminal-protocol` 新增 Rust `ConnectorSessionLaunchRequest`，`SessionCreateRequest::from_connector_launch_request` 已可把 protocol launch request 映射到 runtime admission。
- `SessionCreateRequest` 与 `SessionRecord` 已支持可选 `launch_intent`，connector-backed Session 创建后进入 `Starting`。
- SQLite `session_index` 新增 `launch_intent` 列，并补充兼容性补列逻辑。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.6`。

### Fixed

- 修复 connector-backed Session 创建时直接伪装成 `Running`、无法表达真实启动阶段的问题。
- 修复 session runtime 对远程目标启动意图无持久化真相源、无法支撑后续 recovery 的问题。
- 修复 protocol launch request 还未接入 runtime admission、需要手写拼装 `SessionCreateRequest` 的问题。

### Verified

- `node --test tests/workspace-structure.test.mjs`
- `node --experimental-strip-types --test tests/runtime-contracts.test.ts`
- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/session-center.test.ts`
- `node --experimental-strip-types --test tests/resource-center.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo test --workspace`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo run -p sdkwork-terminal-resource-connectors --example connector_toolchain_smoke`
- `powershell -ExecutionPolicy Bypass -File tools/smoke/connector-toolchain-smoke.ps1`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-admission-bridge验证.md`
- `docs/review/2026-04-09-step07-runtime-launch-intent验证.md`
- `docs/release/2026-04-09-v0.2.6.md`

## 0.2.5 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-types` 新增 `ConnectorSessionLaunchRequest` 与 `connectorSessionLaunchRequestFields` 契约。
- `packages/sdkwork-terminal-resources` 新增 `createConnectorSessionLaunchRequest`，可从 system-cli target 生成 connector launch request。
- `crates/sdkwork-terminal-resource-connectors` 新增 `ConnectorSessionLaunchRequest` 与 `build_cli_launch_plan_for_request`，可从 launch request 生成 Rust launch plan。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.5`。

### Fixed

- 修复 Step 07 中 Session draft 与 Rust connector launch plan 之间缺少统一桥接请求的问题。
- 修复 runtime contract 未冻结 connector-backed session launch request 字段的问题。

### Verified

- `node --test tests/workspace-structure.test.mjs`
- `node --experimental-strip-types --test tests/runtime-contracts.test.ts`
- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/session-center.test.ts`
- `node --experimental-strip-types --test tests/resource-center.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo test --workspace`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo run -p sdkwork-terminal-resource-connectors --example connector_toolchain_smoke`
- `powershell -ExecutionPolicy Bypass -File tools/smoke/connector-toolchain-smoke.ps1`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-launch-request-bridge验证.md`
- `docs/release/2026-04-09-v0.2.5.md`

## 0.2.4 - 2026-04-09

### Changed

- 继续推进 Step 07：`crates/sdkwork-terminal-resource-connectors` 新增 `ConnectorSmokeStatus`、`ConnectorSmokeReport`、`build_toolchain_smoke_command`、`run_toolchain_smoke`。
- 新增 `connector_toolchain_smoke` example 与 `tools/smoke/connector-toolchain-smoke.ps1`，形成 SSH / Docker / Kubernetes 标准 toolchain smoke 入口。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.4`。

### Fixed

- 修复 Step 07 仅停留在 runner 抽象、缺少真实 CLI toolchain smoke 证据的问题。
- 修复 Resource Connectors 文档仍把 SSH / Docker / Kubernetes toolchain smoke 标记为“未落地”的状态漂移问题。

### Verified

- `node --test tests/workspace-structure.test.mjs`
- `node --experimental-strip-types --test tests/runtime-contracts.test.ts`
- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/session-center.test.ts`
- `node --experimental-strip-types --test tests/resource-center.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-resource-connectors`
- `cargo run -p sdkwork-terminal-resource-connectors --example connector_toolchain_smoke`
- `powershell -ExecutionPolicy Bypass -File tools/smoke/connector-toolchain-smoke.ps1`
- `cargo test --workspace`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `tools/smoke/README.md`
- `docs/架构/README.md`
- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`
- `docs/review/2026-04-09-step07-toolchain-smoke验证.md`
- `docs/release/2026-04-09-v0.2.4.md`

## 0.2.3 - 2026-04-09

### Changed

- 继续推进 Step 07：`crates/sdkwork-terminal-resource-connectors` 新增 `ConnectorPhase`、`CommandRunner`、`SystemCommandRunner`、`execute_plan_phase` 与 phase 级错误分类。
- Rust connector 主链已从“launch plan”推进到“runner 可执行”，并完成本机 smoke。
- 文档回写到 `runner smoke` 子阶段的真实状态。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.3`。

### Fixed

- 修复 connector 仍停留在命令计划层、无法进入执行层验证的问题。
- 修复执行失败缺少 phase / retryable / status 分类的问题。
- 修复 Windows smoke 下 stderr 尾随空白导致断言漂移的问题，统一做尾部空白规整。

### Verified

- `node --test tests/workspace-structure.test.mjs`
- `node --experimental-strip-types --test tests/runtime-contracts.test.ts`
- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/session-center.test.ts`
- `node --experimental-strip-types --test tests/resource-center.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo test --workspace`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`

## 0.2.2 - 2026-04-09

### Changed

- 继续推进 Step 07：`packages/sdkwork-terminal-resources` 新增 launchable target 的 Session draft 派生能力。
- `crates/sdkwork-terminal-resource-connectors` 新增 SSH / Docker Exec / Kubernetes Exec 的 CLI `connect / exec / diag / close` 计划生成。
- `packages/sdkwork-terminal-types` 新增 `SessionCreateDraft`，使资源侧到 Session Runtime 的创建语义更明确。
- README、架构、Step、review、release 文档已同步回写到“launch plan 子阶段”真实状态。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.2`。

### Fixed

- 修复 Resource Center 只能展示状态、无法给出 Session 创建准备结果的问题。
- 修复 Rust connector 仍停留在 catalog 层、无法生成真实 CLI 计划的问题。
- 修复 Step 07 文档与实际代码状态不同步的问题。

### Verified

- `node --test tests/workspace-structure.test.mjs`
- `node --experimental-strip-types --test tests/runtime-contracts.test.ts`
- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/session-center.test.ts`
- `node --experimental-strip-types --test tests/resource-center.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo test --workspace`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`

## 0.2.1 - 2026-04-09

### Changed

- 启动 Step 07 并冻结统一远程目标 contract：新增 `ExecutionTargetDescriptor`、connector health、connector transport 元数据。
- `packages/sdkwork-terminal-resources` 新增 Resource Center 派生模型与 `ready / needs-attention / blocked` 目标状态展示。
- `crates/sdkwork-terminal-resource-connectors` 新增 SSH / Docker Exec / Kubernetes Exec / Remote Runtime connector catalog 与汇总能力。
- `crates/sdkwork-terminal-protocol` 与 `tests/fixtures/runtime-contract.snapshot.json` 已同步 Step 07 contract 字段。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.1`。

### Fixed

- 修复 Resource Center 仍停留在占位文案的问题，改为真实消费统一目标快照。
- 修复 runtime contract 缺失执行目标描述字段，导致 Resources 无法复用共享 contract 的问题。
- 修复 Rust connector crate 仅暴露 crate id、未形成目标目录与健康汇总的问题。
- 修复版本批量回写时引入 JSON BOM，导致 `workspace-structure`、`vite build` 与 `tauri check` 失败的编码回归。

### Verified

- `node --experimental-strip-types --test tests/resource-center.test.ts`
- `node --experimental-strip-types --test tests/runtime-contracts.test.ts`
- `cargo test -p sdkwork-terminal-resource-connectors`
- `cargo test -p sdkwork-terminal-protocol`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`
- `docs/step/README.md`
- `docs/step/07-SSH、Docker、Kubernetes与Remote-Runtime连接器落地.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`

## 0.2.0 - 2026-04-09

### Changed

- 收口 Wave B runtime foundation：补齐 Step 05 文档回写，并完成 Step 06 主链。
- `packages/sdkwork-terminal-core`、`packages/sdkwork-terminal-infrastructure`、`packages/sdkwork-terminal-workbench` 与 `crates/sdkwork-terminal-terminal-core` 形成稳定的 terminal-core + adapter + pane 基线。
- `crates/sdkwork-terminal-session-runtime` 新增 Session 状态机、Attach/Detach/Reattach、Ack、Replay、SQLite 索引与退出元数据。
- `crates/sdkwork-terminal-replay-store` 新增 Replay 片段、游标回放与增量读取能力。
- `packages/sdkwork-terminal-sessions` 新增 Session Center 消费模型，明确“runtime truth / UI attachment”边界。
- 根 `package.json`、前端 apps/packages、Cargo workspace 与 `src-tauri/tauri.conf.json` 版本统一提升到 `0.2.0`。

### Fixed

- 修复历史文档乱码，重写 `README.md`、`docs/架构/README.md`、`docs/架构/06/07/08/09/10`、`docs/step/README.md` 与 `docs/step/90` 的可读基线。
- 修复 Session 主链缺失导致的 “UI 先于 runtime 持有状态” 风险。
- 修复 release 收口缺失导致的 Step 05 未闭环问题。

### Verified

- `pnpm install`
- `node --test tests/workspace-structure.test.mjs`
- `node --experimental-strip-types --test tests/runtime-contracts.test.ts`
- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `node --experimental-strip-types --test tests/session-center.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo test --workspace`
- `cargo check --manifest-path src-tauri/Cargo.toml`

### Architecture Write-Back

- `README.md`
- `docs/架构/README.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/07-终端工作台与 CLI 原生集成设计.md`
- `docs/架构/08-渲染、兼容性与终端体验设计.md`
- `docs/架构/09-数据、状态与配置治理设计.md`
- `docs/架构/10-性能、可靠性与可观测性设计.md`
- `docs/step/README.md`
- `docs/step/90-架构能力-Step-代码目录-证据映射矩阵.md`

## 0.1.2 - 2026-04-09

### Changed

- 完成 Step 04 最小桌面主链：`Tauri Host -> Local Session Daemon -> Desktop Runtime Bridge`。
- `@sdkwork/terminal-infrastructure` 新增 desktop bridge client、readiness 聚合与按 `mode` 精确缩窄的桥接描述类型。
- `apps/desktop` 新增 daemon / bridge 健康区块与 `refresh / start / reconnect / stop` 控制。
- 根 `package.json`、前端 apps/packages 与 Cargo workspace 版本统一提升到 `0.1.2`。

### Fixed

- 修复 desktop runtime bridge 描述类型过宽导致的 `pnpm typecheck` 失败。
- 修复 `src-tauri` 缺失 `sdkwork-terminal-protocol` 依赖导致的 Rust 编译失败。
- 修复 Tauri command 在根模块注册产生的宏冲突问题，收口到 `commands` 子模块。

## 0.1.1 - 2026-04-09

### Changed

- 前端 workspace 命名标准完成收口：目录统一为 `packages/sdkwork-terminal-xxx`，包名统一为 `@sdkwork/terminal-xxx`。
- 根 `package.json`、前端 packages、apps 与 Cargo workspace 版本统一提升到 `0.1.1`。
- `pnpm-lock.yaml` 重新生成，清理旧命名阶段留下的损坏锁文件状态。

### Fixed

- 清理旧短目录包，只保留标准目录结构。
- 修复 `@sdkwork/terminal-contracts` 的 surface helper 类型收窄问题。
- 回写架构与 step 文档，明确区分目录命名标准与包名标准。

## 0.1.0 - 2026-04-09

### Added

- 建立 `sdkwork-terminal` 首个真实工程骨架。
- 新增 Step 01 审计基线、差距矩阵、风险清单。
- 新增 workspace 结构测试、首版 release 管理文档与版本说明。
