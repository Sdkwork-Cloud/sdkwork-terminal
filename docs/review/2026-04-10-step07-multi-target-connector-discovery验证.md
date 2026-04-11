# 2026-04-10 Step07 Multi-Target Connector Discovery 验证

## 范围

- `ssh / docker-exec / kubernetes-exec` discovery 是否仍停留在单 authority
- 显式 authority 是否优先于 discovery 结果
- 重复 authority 是否被去重
- 桌面层 Resource Center / Connectors 菜单是否能消费多目标 inventory
- `remote-runtime` 是否仍保持只读边界

## 结论

- 根因在 `crates/sdkwork-terminal-resource-connectors/src/lib.rs`：旧实现每类 connector 只返回一个 `ConnectorExecutionTarget`。
- 修复后，connector discovery 已升级为多目标 inventory：
  - `SSH = env 优先 + ~/.ssh/config 多 Host`
  - `Docker = env 优先 + docker ps 多运行容器`
  - `Kubernetes = env 优先 + current-context + 多 pod`
- 显式 authority 现在保留优先级，discovery 结果会在其后补齐，重复项会被去重。
- `tests/desktop-resource-launch.test.ts` 已证明桌面产品层能够读取多目标 snapshot，并在顶部 `Connectors` 菜单中展示多个同类目标。
- `remote-runtime` 边界未被放宽，仍停留在 discovery/read-model 阶段。

## 已验证命令

- `cargo test --manifest-path crates/sdkwork-terminal-resource-connectors/Cargo.toml -- --nocapture`
- `node --experimental-strip-types --test tests/desktop-resource-launch.test.ts`
- `cargo check --tests --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 仍需继续

- Step 07 的 connector reconnect/recovery 还缺实机 report/review 证据。
- `remote-runtime` 仍未具备 live attach/input/stream/recovery 主链。
