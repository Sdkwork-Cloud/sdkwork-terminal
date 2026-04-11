# Step 10 - Server Mode、Control Plane、Broker 与 Runtime Node 落地

## 1. 目标与范围

目标：

- 打通 `Public API / Manage API / Internal API / Runtime Stream` 四条服务端主链。
- 落地 `gateway + broker + runtime node + web console`。
- 让 `Ubuntu Server x64 / arm64` 成为服务端官方运行基线，并为 Docker/Kubernetes 提供统一包装出口。

非目标：

- 不在本步完成所有企业治理细节。

## 2. 架构对齐

- `docs/架构/02-架构标准与总体设计.md`
- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/10-性能、可靠性与可观测性设计.md`
- `docs/架构/16-API体系与契约设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`

## 3. 写入范围

创建或修改：

- `apps/web/`
- 复用 `packages/sdkwork-terminal-shell/`、`packages/sdkwork-terminal-*` 共核前端包；如确需新增包，目录名必须遵守 `packages/sdkwork-terminal-xxx`
- `crates/sdkwork-terminal-control-plane/`
- `crates/sdkwork-terminal-runtime-node/`
- `crates/sdkwork-terminal-protocol/`

## 4. 设计

- `server` 是网络发布主体。
- `docker / k8s` 只包装 `server`，不创建第二套业务逻辑。
- `broker` 持有协调职责，`runtime-node` 持有远程执行职责。
- `server` 共享 `Session / Replay / ExecutionTarget / Connector` 共核契约，但不共享桌面宿主、窗口权限和本地 PTY 宿主实现。

## 5. 实施落地规划

- 落地 Public API：工作区、资源、Session、配置读取。
- 落地 Manage API：节点、策略、审计、发布、诊断。
- 落地 Internal API：hello、heartbeat、desired-state、session admit/close。
- 建立 Runtime Stream。
- 建立 Web Console 最小入口。
- 建立 `Ubuntu Server x64 / arm64` 的 runtime node 运行、注册、恢复与诊断路径。

## 6. 测试计划

- API 契约测试
- broker / node 协调测试
- 多节点 smoke
- Web Console 接入 smoke
- `Ubuntu Server x64 / arm64` 启动与 broker/node smoke

## 7. 结果验证

- 桌面与 Web 都可接入统一控制面。
- `server / docker / k8s` 共用同一 API 语义。
- `Ubuntu Server x64 / arm64` 都有实际运行证据，不再停留在理论支持。

最小证据：

- API 契约结果 + broker/node smoke + Web 接入 smoke + 回滚说明

能力兑现：

- 兑现 `docs/架构/04` 的 server 共核契约、broker/runtime-node 分工与后续可插拔扩展路线。
- 兑现 `docs/架构/02`、`10`、`16` 中 Server Mode、Broker、Runtime Node 与“共核但不全共享”要求。
- 兑现 `docs/架构/17` 中 Public / Manage / Internal / Runtime Stream 的能力映射。

架构回写：

- `docs/架构/02-架构标准与总体设计.md`
- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/10-性能、可靠性与可观测性设计.md`
- `docs/架构/16-API体系与契约设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`

快速执行建议：

- 串行先冻结 API 语义、Broker/Node 调度模型、Runtime Stream 主链。
- 共享契约不可并行改动项：API 语义、Runtime Stream 事件、Broker/Node 调度模型。
- 并行车道：
  - `10-A` Public API + web client entry
  - `10-B` Manage API + operator views
  - `10-C` Internal API + broker/node coordination
  - `10-D` Runtime Stream / attach path
- 收口顺序：先 internal heartbeat/hello，再 public/manage，再 web smoke。

## 8. 检查点

- `CP10-1`：四类 API 主链成立。
- `CP10-2`：Broker / Runtime Node 协调可用。
- `CP10-3`：Web Console 最小主链成立。
- `CP10-4`：`Ubuntu Server x64 / arm64` 服务端主链得到验证。

## 9. 串并行策略

- 串行：API 语义、Broker/Node 主链、Runtime Stream。
- 可并行：
  - Public API
  - Manage API
  - Web Console
  - Runtime Node 细项
- Web Console 仅消费已冻结 contracts，不得前置定义私有协议字段。
- 多子 agent 推荐拆分：`public / manage / internal-stream / web-console / verification`

## 10. 风险与回滚

- 风险：服务端演进成第二套 Session 模型。
- 回滚：以 `session-runtime / protocol / contracts` 为唯一共核模型收口。

## 11. 完成定义

- Server Mode 从架构概念变成可实现主链。
- 目标等级：`L3`

## 12. 下一步准入条件

- `11` 可以围绕桌面和服务端统一补齐观测、安全、测试与持久化。
