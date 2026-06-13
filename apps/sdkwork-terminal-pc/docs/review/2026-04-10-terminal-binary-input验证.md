# 2026-04-10 Terminal Binary Input 验证

## 目标

- 确认 `xterm.onBinary` 不再被忽略。
- 确认 desktop bridge / Tauri / Rust PTY 具备 bytes-safe 原始输入链路。
- 确认 `binding / retrying` 阶段 mixed `text / binary / text` 输入按原顺序排队和 flush。

## 核对结论

- `tests/terminal-view-driver.test.ts`
  - 已冻结 `binaryStringToBytes(...)`
  - 已冻结 `terminal.onBinary(...)`
- `tests/desktop-runtime-bridge.test.ts`
  - 已冻结 `writeLocalShellInputBytes(...) -> desktop_local_shell_session_input_bytes`
- `tests/shell-tabs.test.ts`
  - 已冻结 `runtimePendingInputQueue` 对 mixed 输入顺序的保持
- `packages/sdkwork-terminal-shell/src/index.tsx`
  - direct running path 与 queued flush path 均支持 binary chunk
- `src-tauri/src/lib.rs` / `crates/sdkwork-terminal-pty-runtime/src/lib.rs`
  - 已具备 `desktop_local_shell_session_input_bytes` / `write_input_bytes(...)`

## 验证命令

- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime -- --nocapture`

## 结果

- 上述命令均已通过。
- 本轮仍停留在 `Step 05`，未推进到 `Step 06`。
