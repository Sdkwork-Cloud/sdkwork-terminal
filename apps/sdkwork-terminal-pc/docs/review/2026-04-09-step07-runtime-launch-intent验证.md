# 2026-04-09 Step07 Runtime Launch Intent 验证

## 验证目标

- connector-backed Session 创建时进入 `Starting`，而不是伪装成已 `Running`。
- runtime 可持久化 connector 启动意图，供后续 connect / exec、recovery 与重放链路复用。
- SQLite 重载后仍可恢复启动意图。

## 验证结果

- `crates/sdkwork-terminal-session-runtime/src/lib.rs` 已新增 `SessionLaunchIntent`。
- `SessionCreateRequest` 与 `SessionRecord` 已新增可选 `launch_intent`。
- connector-backed Session 创建后进入 `Starting`。
- SQLite `session_index` 已新增 `launch_intent` 列，并带兼容性补列逻辑。

## 最小证据

- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test -p sdkwork-terminal-resource-connectors`

## 结论

当前 Step 07 已从“launch request bridge”推进到“runtime launch intent 持久化”子阶段；但真实远程 Session 的 connect / exec 编排仍未接入 session runtime，因此 Step 07 仍未闭环。
