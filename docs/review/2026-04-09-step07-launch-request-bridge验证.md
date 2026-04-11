# 2026-04-09 Step07 Launch Request Bridge 验证

## 验证目标

- Runtime contract 冻结 connector-backed session launch request 字段。
- Resource Center 可为 system-cli 目标生成稳定的 connector launch request。
- Rust connector crate 可从 launch request 生成 CLI launch plan。

## 验证结果

- `tests/runtime-contracts.test.ts` 已冻结 `connectorSessionLaunchRequestFields`。
- `packages/sdkwork-terminal-resources/src/model.ts` 已新增 `createConnectorSessionLaunchRequest`。
- `crates/sdkwork-terminal-resource-connectors/src/lib.rs` 已新增 `ConnectorSessionLaunchRequest` 与 `build_cli_launch_plan_for_request`。
- SSH / Docker / Kubernetes 三类 system-cli 目标均可从 request 生成稳定 launch plan。

## 最小证据

- `node --experimental-strip-types --test tests/runtime-contracts.test.ts`
- `node --experimental-strip-types --test tests/resource-center.test.ts`
- `cargo test -p sdkwork-terminal-resource-connectors`

## 结论

当前 Step 07 已从“Session draft / launch plan 分离”推进到“system-cli target -> connector launch request -> Rust launch plan”最小桥接子阶段；但远程目标 Session 的真实 connect / exec 主链与 Remote Runtime broker / node 闭环仍未完成。
