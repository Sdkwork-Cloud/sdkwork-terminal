# Third-Party Integration Review

Date: 2026-04-19

## Findings

1. `@sdkwork/terminal-shell` exposed a large internal assembly surface, but it did not expose a stable integration facade for third-party hosts.
2. Shell styling depended on implicit side-effect imports inside the component module, which is fragile for external bundlers and makes integration behavior less explicit.
3. `apps/web` recreated browser clipboard and runtime-target environment parsing locally, proving that the public package surface was incomplete.
4. The package had no package-level integration README documenting the supported entrypoints and the no-deep-import rule.

## Applied Fixes

1. Added explicit public subpath exports:
   - `@sdkwork/terminal-shell/integration`
   - `@sdkwork/terminal-shell/styles.css`
2. Promoted stable public contracts:
   - `ShellAppProps`
   - `ShellAppDesktopRuntimeClient`
   - `ShellAppWebRuntimeClient`
   - `ShellWorkingDirectoryPickerOptions`
3. Added host-specific wrappers:
   - `DesktopShellApp`
   - `WebShellApp`
4. Added browser/web helpers:
   - `createBrowserClipboardProvider`
   - `createWebRuntimeTargetFromEnvironment`
5. Moved xterm and shell stylesheet loading to the explicit stylesheet entrypoint and updated desktop/web entry files to import it directly.
6. Switched `apps/web` and `apps/desktop` to consume the public integration surface instead of private assembly details.

## Resulting Standard

- Third-party hosts integrate through declared package exports only.
- Styles load through a public stylesheet entrypoint.
- Desktop and web hosts each use a dedicated wrapper component.
- Host runtime bridges stay in `@sdkwork/terminal-infrastructure`.
- Deep imports into `packages/.../src` are not part of the supported integration surface.

## Packaging Verification

1. `pnpm pack` for `@sdkwork/terminal-shell` includes the public README and source entrypoints required for integration.
2. Packed `package.json` rewrites internal `workspace:*` ranges to concrete `0.2.53` dependencies, which is the expected release shape for third-party consumption.
3. Stylesheet entrypoints are retained as package side effects so terminal rendering is not broken by consumer-side tree shaking.
