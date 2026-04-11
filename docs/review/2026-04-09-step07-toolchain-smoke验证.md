# 2026-04-09 Step07 Toolchain Smoke 验证

## 验证目标

- SSH / Docker / Kubernetes 连接器可生成稳定的 CLI smoke 命令。
- 缺失二进制返回 `Skipped`，非零退出返回 `Failed`，成功探测返回 `Passed`。
- 仓库存在标准化 smoke 入口，且可在当前机器直接执行。

## 验证结果

- `build_toolchain_smoke_command` 已覆盖 `ssh`、`docker-exec`、`kubernetes-exec` 三类目标。
- `run_toolchain_smoke` 已完成 `Passed / Failed / Skipped` 三态归类。
- `connector_toolchain_smoke` example 可直接复用 `SystemCommandRunner` 执行真实探测。
- `tools/smoke/connector-toolchain-smoke.ps1` 已作为仓库级 smoke 包装入口落地。

## 本机证据

- `cargo test -p sdkwork-terminal-resource-connectors` 通过。
- `cargo run -p sdkwork-terminal-resource-connectors --example connector_toolchain_smoke` 通过。
- `powershell -ExecutionPolicy Bypass -File tools/smoke/connector-toolchain-smoke.ps1` 通过。
- 本机探测结果：
  - `ssh -V` => `OpenSSH_for_Windows_9.5p1, LibreSSL 3.8.2`
  - `docker -v` => `Docker version 28.0.4, build b8034c0`
  - `kubectl version --client --output=json` => client `v1.32.2`

## 结论

当前 Step 07 已从“runner 可执行”推进到“真实 toolchain smoke”子阶段；但远程目标创建 Session 的 connect / exec 主链与 Remote Runtime broker / node 闭环仍未完成，因此 Step 07 仍不能标记为完成。
