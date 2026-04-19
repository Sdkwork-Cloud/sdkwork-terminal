# @sdkwork/terminal-shell

`@sdkwork/terminal-shell` is the product-grade React surface for `sdkwork-terminal`.

## Public integration surface

- `ShellApp`: full terminal-first desktop/web shell surface.
- `ShellAppProps`: stable host integration contract for desktop and web hosts.
- `DesktopTerminalSurface`: lower-level surface wrapper for host-driven launch flows.
- `DesktopRuntimeBridgeClient` and `WebRuntimeBridgeClient`: canonical runtime bridge types re-exported for host integration.
- `ShellAppDesktopRuntimeClient`, `ShellAppWebRuntimeClient`, and `DesktopTerminalSurfaceRuntimeClient`: stable runtime-client contracts for embedding.
- `TerminalShellProfile` and `OpenTerminalShellTabOptions`: stable launch and tab-bootstrap contracts.

## Integration rules

- Keep the shell terminal-first. Do not wrap it in a dashboard-first home screen.
- Treat runtime sessions as the source of truth. UI state must not replace session/replay truth.
- Keep platform adapters outside the shell package. Working-directory pickers, native window controls, and runtime bridge implementations belong to the host.
- Use `@sdkwork/terminal-infrastructure` for xterm/runtime bridge wiring and keep `@sdkwork/terminal-shell` focused on composition and interaction.

## Minimal host responsibilities

- Provide either `desktopRuntimeClient` or `webRuntimeClient`.
- Provide optional host adapters such as `desktopWindowController`, `clipboardProvider`, and `onPickWorkingDirectory`.
- Keep release verification in place for Windows desktop builds so packaged behavior matches `tauri:dev`.
