# 2026-04-10 Step 07 Interactive Connector Session Bootstrap 验证

## 范围

- `crates/sdkwork-terminal-pty-runtime`
- `crates/sdkwork-terminal-control-plane`
- `packages/sdkwork-terminal-infrastructure`
- `src-tauri`

## 本轮核验结论

- 已确认 desktop 侧新增 shared interactive connector bootstrap 基线。
- 已确认显式命令 PTY spawn、shared control-plane orchestration、desktop bridge IPC create 三条证据链存在且可自动化验证。
- 当前不能宣称 ShellApp 已直接承载 remote connector live tab；该产品链路仍未闭环。

## 执行命令

- `cargo test --manifest-path crates/sdkwork-terminal-pty-runtime/Cargo.toml session_runtime_creates_interactive_process_from_explicit_command -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm typecheck`

## 关键证据

- PTY runtime 可从显式 `program + args` 创建 interactive session，并写入真实输出。
- control-plane 可在 connect 失败时留下 `Failed` Session 真相且不触发 PTY spawn。
- control-plane 可在 connect 成功后创建 attachment、触发 PTY spawn，并回写 `Running + replay state`。
- desktop bridge client 已能调用 `desktop_connector_session_create` 并获取 `sessionId / attachmentId / invokedProgram / replayEntry`。

## 剩余风险

- remote connector live input/resize/terminate 仍未从 `local shell` 命名收口到通用 session 语义。
- `apps/desktop` 尚未把该能力直接绑定到 Windows Terminal 风格顶部 tab 终端舞台。
