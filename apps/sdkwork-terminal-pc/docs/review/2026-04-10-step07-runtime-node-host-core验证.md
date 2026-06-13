# 2026-04-10 Step 07 Runtime-Node Host Core 验证

## 范围

- `runtime-node` 是否已从“只有 bootstrap/recovery 基线”推进到真实 host core。
- `remote-runtime / server-runtime-node` 是否已具备仓库内可验证的 `create / input / stream / terminate / recovery` 主链。
- Windows 显式命令 PTY terminate 是否仍会把 session 卡死在 `Stopping`。

## 结论

- 修复前，Step 07 只有 request model、web bridge 与 web shell binding；`runtime-node` 仍缺真实 host 主链。
- 修复后，`crates/sdkwork-terminal-runtime-node/src/host.rs` 已新增 `RuntimeNodeHost`，并用 `SessionRuntime + LocalShellSessionRuntime + stream fanout` 收口真实 server-side 宿主能力。
- 修复后，`RuntimeNodeHost` 已能创建 `remote-runtime / server-runtime-node` 会话、写入文本/二进制输入、调整尺寸、发出 `output / warning / exit` 事件，并在 sqlite rebuild 后恢复 session/replay 真相。
- 修复后，`crates/sdkwork-terminal-pty-runtime` 的 terminate 路径已不再把 Windows 显式命令 PTY 长期卡在 `Stopping`；仓库测试现在可以看到真实 `Exit` 收口。
- 当前仍未关闭 `CP07-5`：HTTP/SSE 薄宿主、web 手工 smoke 与 reviewed recovery 证据还没补齐。

## 已验证命令

- `cargo test --manifest-path crates/sdkwork-terminal-pty-runtime/Cargo.toml -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture`

## 仍需继续

- 在 `RuntimeNodeHost` 之上补齐 `publicApi /sessions`、`/replays` 与 `runtimeStream /attach` 的真实薄包装。
- 用 `apps/web/.env.example` 配置真实 runtime host 后执行手工 smoke。
- 补齐 `remote-runtime` recovery 的 report/review 证据，再收口 `CP07-5`。
