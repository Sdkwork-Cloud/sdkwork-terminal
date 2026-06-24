# API体系与契约设计

## 1. 目标

API 体系必须同时解决五件事：桌面桥接、运行时热路径、服务端用户面、运维管理面、节点内部协调面。

## 2. 契约总览

| 面 | 入口 | 主要调用方 | 定位 |
| --- | --- | --- | --- |
| Desktop Bridge IPC | Tauri IPC | Shell / Feature | 窗口、文件、系统能力、粗粒度控制 |
| Local Runtime Channel | Named Pipe / Unix Domain Socket | WebView -> Local Daemon | 本地 Session 热路径 |
| Public API | `/terminal/api/v1/*` | Desktop / Web Console / SDK | 用户面 |
| Manage API | `/terminal/manage/v1/*` | Operator / Admin | 管理面 |
| Internal API | `/terminal/internal/v1/*` | Broker / Runtime Node | 内部协调 |
| Runtime Stream | `/terminal/stream/v1/*` | UI / Broker / Runtime | 终端流与事件 |

## 3. Desktop Bridge IPC

只承载：

- 窗口管理
- 文件选择
- 本机路径与系统能力
- 本地桥初始化
- 粗粒度 Session 控制

不承载：

- 高频终端字节流
- 大量日志传输
- 长连接热路径

当前已冻结命令：

| 命令 | 语义 | 返回 |
| --- | --- | --- |
| `desktop_host_status` | 返回宿主契约版本、control/data namespace 与宿主标签 | `DesktopHostSnapshot` |
| `desktop_daemon_health` | 查询本地 daemon 健康快照 | `LocalDaemonHealthSnapshot` |
| `desktop_daemon_start` | 启动或恢复本地 daemon | `LocalDaemonHealthSnapshot` |
| `desktop_daemon_stop` | 停止本地 daemon | `LocalDaemonHealthSnapshot` |
| `desktop_daemon_reconnect` | 执行 bridge 重连 | `LocalDaemonHealthSnapshot` |

命令规则：

- 命令名必须稳定，不能按平台分叉。
- IPC 只做粗粒度控制与诊断；高频数据面继续留给本地 runtime channel。

## 4. 本地运行时通道

推荐形态：

- Windows：Named Pipe
- macOS / Ubuntu：Unix Domain Socket
- 上层协议：控制消息 JSON，数据消息 Binary Frame

要求：

- Session 创建、Attach、Detach、Resize、输入输出统一走本通道。
- 通道必须支持背压与断线重连。
- 当前 `LOCAL_RUNTIME_NAMESPACE = sdkwork-terminal.runtime.v1` 已冻结；Step 04 只完成命名空间与 readiness 对齐，真实 attach/binary-frame 热路径在 Step 05-06 落地。

## 5. Server API

### 5.1 Public API

负责：

- 用户、工作区、资源、Session 查询
- 创建/连接/关闭 Session
- 历史、回放、配置读取

建议资源族：

- `/terminal/api/v1/workspaces`
- `/terminal/api/v1/resources`
- `/terminal/api/v1/profiles`
- `/terminal/api/v1/sessions`
- `/terminal/api/v1/replays`
- `/terminal/api/v1/settings`
- `/terminal/api/v1/diagnostics`
- `/terminal/api/v1/cli`

### 5.2 Manage API

负责：

- Runtime Node 注册与治理
- 策略、审计、发布、系统诊断
- 管理员级配置与运维能力

建议资源族：

- `/terminal/manage/v1/runtime-nodes`
- `/terminal/manage/v1/policies`
- `/terminal/manage/v1/audits`
- `/terminal/manage/v1/releases`
- `/terminal/manage/v1/system`

### 5.3 Internal API

负责：

- Broker 与 Node 心跳
- 租约、期望状态、节点能力同步
- 内部调度与恢复

建议资源族：

- `/terminal/internal/v1/nodes/hello`
- `/terminal/internal/v1/nodes/heartbeat`
- `/terminal/internal/v1/sessions/admit`
- `/terminal/internal/v1/sessions/close`
- `/terminal/internal/v1/desired-state/pull`
- `/terminal/internal/v1/desired-state/ack`

## 6. 版本、错误与观测

- 对外 API 使用路径版本化。
- 错误体必须机器可读，带 `traceId / correlationId`。
- Streaming 与非 Streaming 错误语义要分离。
- 任一 API 都必须可接入统一日志、Trace、审计。

建议错误体字段：

- `code`
- `message`
- `traceId`
- `retryable`
- `details`

建议 Runtime Stream 事件族：

- `session.state`
- `session.output`
- `session.marker`
- `session.warning`
- `session.exit`
- `session.replay.ready`

## 7. 多形态一致性规则

- `desktop` 通过本地桥接暴露同一套领域契约。
- `server` 是网络发布主体。
- `docker / k8s` 复用 `server` 的路由族、资源模型和错误契约。
- 任何模式变化都不得生成第二套 API 语义。
- `desktop` 与 `server` 共享契约，不共享宿主传输、权限与部署实现。
- `desktop` 当前允许先以 `IPC + readiness` 完成最小闭环，但不得把该临时控制面固化为热路径替代品。

## 8. 评估标准

| 评估项 | 合格线 | 领先线 | 当前判断 |
| --- | --- | --- | --- |
| API 分层清晰度 | IPC、Runtime、Public、Manage、Internal 分离 | 每个能力都有唯一主入口 | `L4` |
| 多形态一致性 | `docker / k8s` 不复制 API，`desktop / server` 共享契约但不共享宿主实现 | 模式变化只改变适配层与包装层 | `L4` |
