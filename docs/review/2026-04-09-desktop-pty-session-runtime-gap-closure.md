# 2026-04-09 Desktop PTY Session Runtime Gap Closure

## 1. 结论

- 本轮已把桌面端核心缺口从 `one-shot local shell exec` 收敛到 `persistent PTY session per tab`。
- 顶部 tabs 现在开始与后台真实 session 对应，`create / input / resize / terminate / replay` 主链已打通。
- 当前实现仍不是最终态 raw VT 双向流；它是“真实 PTY + SessionRuntime replay + 前端 polling 消费”的中间闭环。

## 2. 已完成能力

- Frontend input path is now terminal-stage first: `xterm` keeps stdin enabled, receives focus on stage activation, and writes raw keystrokes to the desktop PTY session when a runtime-backed tab is active.
- The standalone HTML command input has been removed from the shell stage; the live prompt remains inside the terminal surface so the desktop layout stays closer to Windows Terminal semantics.
- `xterm` viewport rendering now has a dedicated render-plan layer, so repeated snapshots are treated as no-op updates instead of unconditional reset-and-rewrite passes.
- The terminal stage now measures real viewport capacity from the mounted `xterm` surface and feeds `cols/rows` back into the active tab, closing the gap between DOM size, shell snapshot viewport, and desktop PTY resize inputs.
- New tabs now inherit the current active viewport before local session bootstrap, reducing the first-frame mismatch where a desktop shell session would otherwise start at the default 96x14 size and resize only after activation.
- The desktop bridge now subscribes to namespaced live runtime events for `session.output`, `session.warning`, and `session.exit`, so PTY-backed tabs no longer depend on 120ms replay polling for their primary update path.
- The desktop host now emits `sdkwork-terminal.runtime.v1.session.output|warning|exit` immediately after each replay-store append, keeping replay persistence and real-time delivery aligned on the same sequence source.
- Shell replay application is now cursor-aware and idempotent, so overlap between live events and replay repair does not duplicate visible terminal output.

- Rust PTY runtime：
  - 新增 `LocalShellSessionRuntime`
  - 支持 session create / input / resize / terminate
  - 支持输出、warning、exit 事件流
- Tauri desktop bridge：
  - 新增 `desktop_local_shell_session_create`
  - 新增 `desktop_local_shell_session_input`
  - 新增 `desktop_local_shell_session_resize`
  - 新增 `desktop_local_shell_session_terminate`
  - PTY 事件已写入 `SessionRuntime` replay store
- Frontend shell：
  - tab 新增 runtime session 绑定状态
  - desktop tab 启动时自动 bootstrap 本地 shell session
  - 通过 `sessionReplay` 增量拉取输出并灌入 terminal stage
  - blank enter 不再退化为假 `help`
  - duplicate tab 不再共享旧 session id

## 3. 关键证据

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
- `pnpm dev`
  - 启动阶段未立即失败；本次仅做烟测，进程由超时主动截断

## 4. 关键工程判断

- 已验证此前根因确实是：
  - 前端是 terminal 外观，但 desktop 执行链仍是一次性 `Command.output()`
  - tabs 与 session 没有真实绑定
  - replay 只覆盖资源连接器路径，未覆盖本地 shell tab
- 已验证 Windows PowerShell 在 PTY 启动期会发 `ESC[6n` 光标位置查询。
- 本轮已补最小 `ESC[1;1R]` 响应，足以解除基础 prompt 阻塞；这证明后续必须走 raw VT 双向流，而不能长期停留在“只回放文本”的终态。

## 5. 仍未闭环项

- The current shell-app render regression test now blocks dashboard-style UI literals only; it intentionally no longer treats internal runtime identifiers like `activeSessions` as product regressions.
- The viewport driver still consumes terminal-core snapshots rather than a true raw VT attach stream, so the new render plan is a stabilization step, not the final Windows Terminal-grade data plane.
- The new viewport measurement path still depends on xterm/flex layout observation; it is a necessary precondition for raw VT attach, but not a substitute for a true event-driven terminal transport.
- Live Tauri events now cover the desktop local-shell happy path, but the product still needs a full raw VT attach stream before TUIs and terminal capability negotiation can be considered Windows Terminal-grade.

- 当前前端仍是 prompt/replay 模式，不是 xterm 原生双向流。
- 全屏 TUI、复杂终端协商、细粒度键盘输入、终端查询响应矩阵仍未完整实现。
- Windows PowerShell 的完整 VT query/response 仍有余量，不应把本轮实现描述为“最终完整 Windows Terminal 级别终端内核”。

## 6. 下一步建议

- Step 05/06 优先继续推进 raw VT data plane：
  - 后端输出从“文本 replay”升级为“原始字节流”
  - 前端 xterm 从“只渲染快照”升级为“真正 attach 到 session transport”
  - 把输入从 prompt bar 扩展到 xterm 键盘事件
- Step 09 保持 UI 不扩散：
  - 顶部仍是 tabs/custom header
  - 主体仍是 terminal stage
  - 不允许回退到 dashboard/workbench 首页
