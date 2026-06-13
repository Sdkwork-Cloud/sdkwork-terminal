# 2026-04-10 Terminal Input Path 验证

## 范围

- 真实 terminal 输入热路径
- xterm 终端聚焦与 viewport 视觉
- Rust PTY 封装能力最小证据

## 结论

- Rust `sdkwork-terminal-pty-runtime` 交互式 session 测试通过，说明 PTY create / write / resize / terminate 主链已具备最小可用性。
- 当前用户感知“terminal 无法输入”的主要风险更接近前端终端壳层的 focus/attach 时序，而不是 Rust PTY 完全不可用。
- 本轮已把 active terminal stage 的 attach 后主动 focus 固化进实现与测试，降低首屏不可输入风险。
- 本轮继续把 runtime `binding` 阶段输入改为“先缓存、后冲刷”，避免新 tab 启动期按键直接丢失。
- 本轮补齐 Desktop 启动空窗期的终端原生反馈：`binding` 与 queued input 期间，terminal stage 会显示 `Starting shell / Input queued`，不再表现为纯黑屏。
- 本轮补齐 Desktop `failed / exited` 后的最小恢复能力：overlay 直接提供 `Restart shell`，同 tab 可重新回到 PTY bootstrap。
- 本轮补齐 Desktop 默认 shell 的宿主平台兜底，避免 Windows 主机在无 `navigator` 信息时误回落为 `bash`。
- 本轮补齐 xterm Unicode 11 的显式激活，修复 `Unicode11Addon.version` 类型漂移导致的 `pnpm typecheck` 失败。

## 已验证命令

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-tabs.test.ts tests/terminal-view-driver.test.ts tests/desktop-runtime-bridge.test.ts`
- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime -- --nocapture`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm dev` 启动烟测：未立即崩溃

## 仍需人工补证

- Windows: 新建 tab、直接输入字符、Enter、复制/粘贴、切 tab、resize。
- Ubuntu: `bash/zsh/fish`、CJK、IME、粘贴、scrollback。
- macOS: `zsh`、`Command` 键位、IME、粘贴、resize。
