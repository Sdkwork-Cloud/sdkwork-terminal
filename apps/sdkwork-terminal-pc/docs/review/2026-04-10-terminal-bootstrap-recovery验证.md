# 2026-04-10 Terminal Bootstrap Recovery 验证

## 范围

- Desktop shell 启动失败自动重试一次
- `retrying` 状态语义与 overlay 文案
- `binding / retrying` 期间 queued input 保留
- `failed` tab 手动 `Restart shell` 时 queued input 保留

## 结论

- terminal shell 现已具备显式 `retrying` 状态，启动失败不会立刻把 tab 留在死状态。
- 自动恢复策略被收口为“只自动重试一次”，符合真实终端产品预期，不会无限拉起。
- `binding / retrying` 期间的输入现统一进入 `runtimePendingInput`，不因无 `sessionId` 或中途重试而丢失。
- 自动重试耗尽后，overlay 会明确提示 exhausted，并允许同 tab `Restart shell`。
- 手动重启 `failed` 启动失败 tab 时会保留 queued input，恢复后可继续刷回真实 PTY。

## 已验证命令

- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime -- --nocapture`
- `pnpm dev`
  - 命令在约 `34s` timeout 时被截断，未发生立即失败退出。

## 仍需人工补证

- Windows / Ubuntu / macOS 新建 tab 后立即输入字符与 Enter。
- 强制制造 bootstrap failure 后观察 auto retry / exhausted / manual restart。
- TUI / CJK / IME / bracketed paste / OSC / alternate screen。
