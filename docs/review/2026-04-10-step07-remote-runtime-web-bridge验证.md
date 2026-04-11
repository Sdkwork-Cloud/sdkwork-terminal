# 2026-04-10 Step07 Remote Runtime Web Bridge 验证

## 范围

- `remote-runtime` 是否已从 desktop `system-cli` connector request 中显式分离。
- web/runtime-node 侧是否已有独立的 `publicApi + runtimeStream` bridge client。
- 本轮实现是否保持 desktop `remote-runtime` 不可伪装成交互式 PTY 的边界。

## 结论

- 问题根因是此前仓库只有 `remote-runtime` discovery/read-model 事实，没有对应的专用创建请求和 web/runtime bridge，导致后续 `apps/web` 或 runtime-node host 无法沿正式协议继续推进。
- 修复后，`packages/sdkwork-terminal-resources/src/model.ts` 已新增 `createRemoteRuntimeSessionCreateRequest(...)`，并明确要求目标必须是 `remote-api`、可启动、且不是 desktop `system-cli` connector。
- 修复后，`packages/sdkwork-terminal-infrastructure/src/index.ts` 已新增 `createWebRuntimeBridgeClient(...)`，并把链路固定为：
  `POST /terminal/api/v1/sessions -> GET /terminal/api/v1/replays -> EventSource /terminal/stream/v1/attach -> input/resize/terminate`。
- 修复后，desktop 现有 `createConnectorSessionLaunchRequest(...)`、`desktop_connector_session_create`、Session Center reattach 规则没有被放宽，`remote-runtime` 仍未被错误提升为 desktop interactive target。

## 已验证命令

- `node --experimental-strip-types --test tests/resource-center.test.ts tests/web-runtime-bridge.test.ts`
- `node --experimental-strip-types --test tests/runtime-contracts.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/web-runtime-bridge.test.ts`

## 仍需继续

- 将 `createWebRuntimeBridgeClient(...)` 真正接入 `apps/web -> ShellApp`。
- 在 server/runtime-node 侧补齐真实 session create/replay/stream host。
- 继续完成 `remote-runtime` 的 attach/input/stream/recovery 实证与评审归档。
