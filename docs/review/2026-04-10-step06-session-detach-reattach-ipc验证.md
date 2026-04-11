# 2026-04-10 Step 06 Session Attach/Detach/Reattach IPC 验证

## 核对范围

- Desktop bridge 是否暴露 `attach / detach / reattach` 写链。
- Shell 宿主卸载时是否 best-effort `detach` 活跃 attachment。
- Detached session 在无 attachment 时继续接收 output，状态是否仍保持 `Detached`。

## 结果

- `packages/sdkwork-terminal-infrastructure` 已新增 `attachSession(...)`、`detachSessionAttachment(...)`、`reattachSession(...)`，并分别路由到 `desktop_session_attach / detach / reattach`。
- `src-tauri` 已新增对应 Tauri command，并桥接到 `SessionRuntime::attach / detach / reattach`。
- `packages/sdkwork-terminal-shell` 已在 host teardown cleanup 中对仍存活 attachment 执行 best-effort `detach`。
- `crates/sdkwork-terminal-session-runtime` 已修正 detached consistency：无活跃 attachment 的 session 即使继续接收后台 output，也保持 `Detached`。
- `tests/desktop-runtime-bridge.test.ts`、`tests/shell-app-render.test.ts` 与 `crates/sdkwork-terminal-session-runtime` 新测试已锁定桥接、cleanup 与状态一致性。

## 验证命令

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`
- `cargo test --manifest-path crates/sdkwork-terminal-session-runtime/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml --no-run`
- `pnpm dev` smoke：进程持续运行到超时，未出现立即启动崩溃

## 限制

- 本机直接执行 `src-tauri` 单测二进制仍会触发 Windows 原生 loader 错误：`STATUS_ENTRYPOINT_NOT_FOUND`。本轮仅把 `src-tauri` 作为 compile-level 证据保留，行为层由 JS bridge 测试与 Rust `session-runtime` 测试覆盖。

## 结论

- Step 06 的 desktop Session 主链已从“只有 replay 读侧 + attachment ack 回写”推进到“包含 attach/detach/reattach 的完整结构化写入口”。
- 当前仍未宣称 Session Center 已具备完整 reattach 产品界面；本轮只收口 runtime truth、desktop bridge 与 host teardown 的一致性。
