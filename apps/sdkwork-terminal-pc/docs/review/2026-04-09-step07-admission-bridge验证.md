# 2026-04-09 Step07 Admission Bridge 验证

## 验证目标

- Rust protocol 提供稳定的 `ConnectorSessionLaunchRequest`。
- runtime 可从 protocol launch request 直接生成 `SessionCreateRequest`。
- connector-backed Session admission 后仍保留 `Starting` 与 `launch_intent` 语义。

## 验证结果

- `crates/sdkwork-terminal-protocol/src/lib.rs` 已新增 `ConnectorSessionLaunchRequest`。
- `SessionCreateRequest::from_connector_launch_request` 已在 `crates/sdkwork-terminal-session-runtime/src/lib.rs` 落地。
- protocol launch request 进入 runtime 后，workspace/target/tags 保持不变，authority/command 下沉为 `launch_intent`。

## 最小证据

- `cargo test -p sdkwork-terminal-protocol`
- `cargo test -p sdkwork-terminal-session-runtime`

## 结论

当前 Step 07 已从“runtime launch intent 持久化”继续推进到“protocol -> runtime admission bridge”子阶段；但真实 connect / exec 编排与 Remote Runtime broker / node 闭环仍未完成。
