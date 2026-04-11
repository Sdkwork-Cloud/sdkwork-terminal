# 2026-04-09 Step07 Launch Resolution 验证

## 验证目标

- connector-backed Session 在 attach / output 期间保持 `Starting`，不被 UI 或普通输出提前抬升为 `Running`
- runtime 可显式把 connector 启动结果从 `Starting` 收口到 `Running / Failed`
- 成功与失败结果都会写入 replay 证据，供后续诊断与 recovery 复用

## 验证结果

- `crates/sdkwork-terminal-session-runtime/src/lib.rs` 新增 `ConnectorLaunchResolution`
- `SessionRuntime::attach`、`detach`、`reattach`、`record_output` 已避免把 `Starting` 会话提前改写为 `Running`
- `SessionRuntime::resolve_connector_launch` 已支持：
  - `Starting -> Running`，并写入 replay `state`
  - `Starting -> Failed`，并写入 replay `warning`
- replay payload 使用结构化 JSON，包含 `state` 与 phase / code / retryable / program / status / message 等诊断字段

## 最小证据

- `cargo test -p sdkwork-terminal-session-runtime connector_backed_session_stays_starting_until_launch_resolution`
- `cargo test -p sdkwork-terminal-session-runtime connector_launch_resolution_marks_session_running_and_records_state_evidence`
- `cargo test -p sdkwork-terminal-session-runtime connector_launch_resolution_marks_session_failed_and_records_warning_evidence`
- `cargo test -p sdkwork-terminal-session-runtime`

## 结论

当前 Step 07 已从“runtime launch intent 持久化”推进到“launch resolution”子阶段。远程目标的真实 connect / exec 编排仍未与 connector 执行闭环完全打通，因此 Step 07 仍未完成。
