# 2026-04-09 Step07 Host Connect Bridge 验证

## 验证目标

- `src-tauri` 组合层可将 protocol launch request 串接到 CLI launch plan 与 connect phase
- connect phase 成功后，runtime 可从 `Starting` 收口到 `Running`
- connect phase 失败后，runtime 可从 `Starting` 收口到 `Failed`

## 验证结果

- `src-tauri/Cargo.toml` 已引入 `sdkwork-terminal-resource-connectors`
- `src-tauri/src/lib.rs` 新增 `launch_connector_session_from_request`
- 该桥接已完成：
  - protocol request -> resource connector launch request 映射
  - launch request -> CLI launch plan 构建
  - connect phase runner 执行
  - connect 结果 -> `resolve_connector_launch` 回写
- 成功路径写入 replay `state`
- 失败路径写入 replay `warning`

## 最小证据

- `cargo test --manifest-path src-tauri/Cargo.toml launch_connector_session_from_request_marks_session_running_after_successful_connect_phase`
- `cargo test --manifest-path src-tauri/Cargo.toml launch_connector_session_from_request_marks_session_failed_after_connect_phase_error`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## 结论

当前 Step 07 已从“launch resolution”推进到“host connect bridge”子阶段。该桥接仍只覆盖 connect phase，尚未完成 exec phase、统一 IPC 暴露与 Remote Runtime broker / node 闭环，因此 Step 07 仍未完成。
