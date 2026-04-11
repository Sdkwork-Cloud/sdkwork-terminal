# 能力到API与IPC调用矩阵

## 1. 目标

本章把“产品能力”落到“调用链”，用于统一研发、测试、诊断与发布回归。

## 2. 总调用图

```text
UI / Feature
-> Shell Service
-> Infrastructure Client
-> one of:
   Tauri IPC
   Local Runtime Channel
   Public API
   Manage API
   Internal API
   Runtime Stream
```

## 3. 桌面本地能力矩阵

| 能力 | 主入口 | 主调用链 | 下游 | 验收点 |
| --- | --- | --- | --- | --- |
| 桌面启动 | `@sdkwork/terminal-desktop` | Host Bootstrap -> Local Session Daemon | Tauri IPC + Local Daemon | UI 可起，Daemon 可连 |
| 本地命令执行（one-shot） | `shell` | ShellApp -> Desktop Bridge Client -> Tauri IPC | Shell Integration + PTY Runtime | 当前 tab 可回填 `stdout / stderr / exitCode` |
| 本地 PTY Session | `sessions` | Feature Service -> Local Runtime Channel | Windows `ConPTY` / Ubuntu-macOS `POSIX PTY` Runtime | 三平台 interactive shell 可用 |
| Resize / Input / Output | `workbench` | Terminal Adapter -> Local Runtime Channel | Session Runtime | 高频操作无明显卡顿 |
| 打开文件/目录 | `desktop` | Tauri IPC | OS API | 路径返回稳定 |
| 生成诊断包 | `diagnostics` | Feature Service -> Tauri IPC + Runtime | Host/Logs/Metrics | 包含版本、日志、配置摘要 |
| Reattach 活会话 | `sessions` | Shell dropdown -> Session Center overlay -> Desktop Bridge Client -> Tauri IPC | Session Runtime | `local-shell / ssh / docker-exec / kubernetes-exec` detached session 可重连并恢复输入 |
| Replay 历史会话 | `sessions` | Feature Service -> Local Runtime / Public API | Replay Store | 字节流与命令回放可用 |

## 4. 远程与资源能力矩阵

| 能力 | 主入口 | 主调用链 | 下游 | 验收点 |
| --- | --- | --- | --- | --- |
| SSH Session | `resources` | Feature Service -> Runtime Channel | SSH Connector | 可连、可断、可重连 |
| Docker Exec | `resources` | Feature Service -> Runtime Channel | Docker Connector | 容器 exec 正常 |
| Kubernetes Exec | `resources` | Feature Service -> Runtime Channel | K8s Connector | Pod/container exec 正常 |
| Remote Runtime | `resources` | Feature Service -> Public API / Runtime Stream | Broker / Node | 路由正确、会话稳定 |

当前事实：

- 当前桌面主舞台已可通过 `desktop_local_shell_exec` 发起本地 one-shot shell 执行；`packages/sdkwork-terminal-shell` 会把结构化结果回填到当前 tab transcript，并显示 `exitCode / workingDirectory / invokedProgram`。
- 当前已落地 `ExecutionTargetDescriptor`、connector session launch request 字段、connector catalog、CLI launch/diag/close 计划、launch request -> launch plan 桥接、protocol -> runtime admission bridge、runtime launch intent 持久化、connector launch resolution、host connect bridge、desktop IPC launch bridge、desktop Resource Center launch loop、runner 执行抽象与 Resource Center 状态派生。
- 当前 `resources` 主入口已可消费统一目标状态，并可为 launchable target 生成 Session draft、connector launch request 与 bounded exec probe request；connector-backed Session 已可通过 protocol launch request 进入 runtime admission、保存启动意图，并通过 `resolve_connector_launch` 显式收口 `Starting -> Running / Failed`。`src-tauri` 已可在组合层执行 connect phase，并通过 `desktop_connector_launch`、`desktop_connector_exec_probe`、`desktop_session_index` 与 `desktop_session_replay_slice` 暴露 launch / bounded probe / session-index / replay-read 能力，`apps/desktop` 已可在 `ResourcesPanel` 中直接发起 launch 与 exec probe，并在 `SessionsPanel` 中消费真实 runtime session 快照、bounded replay transcript、replay unavailable 诊断、replay cursor metadata、replay cursor drift summary、replay ack lag summary、replay ack window summary、replay window coverage summary、replay latest state projection、replay state lag summary、replay state freshness projection、replay latest output projection、replay output lag summary、replay output ack summary、replay output freshness projection、replay health summary、replay latest warning projection、replay latest exit projection、replay freshness projection、replay timeline gap summary、replay sequence gap summary、replay timeline metadata、replay event mix metadata、replay warning/exit evidence digest、replay evidence ack summary 与 replay evidence freshness projection；但 Remote Runtime 与远程目标 Session 的 interactive connect / exec / attach 主链仍待继续打通。
- 当前本地执行链仍属于 one-shot command execute，不等同于持久 PTY / ConPTY / streaming session；文档、测试与发布均不得把该能力描述为“完整本地交互式终端内核”。
- 当前任何本地 PTY 能力若未分别经过 `Windows / Ubuntu / macOS` 验证，都只能标记为“局部平台可用”，不能统一宣称“桌面已完成”。
- 当前 `Session Center` 读链已新增 replay state ack summary，可直接给出 attachment ack 相对 latest state 的 `lagging / aligned / covered` 关系；该能力仍属于 bounded replay 读侧摘要，不新增任何 attach / stream 写链。
- 当前 `Session Center` 读链已新增 replay state/output delta summary，可直接给出 latest state 与 latest output 的相对先后和差值；该能力仍属于 bounded replay 读侧摘要，不新增任何 attach / stream 写链。
- 当前 `Session Center` 读链已新增 replay evidence ack summary，可直接给出 attachment ack 相对 latest warning/exit evidence 的 `lagging / aligned / covered` 关系；该能力仍属于 bounded replay 读侧摘要，不新增任何 attach / stream 写链。
- 当前 `Session Center` 读链已新增 replay evidence freshness projection，可直接给出 latest warning/exit evidence 相对 `observedAt` 的 `fresh / aging / stale` 状态；该能力仍属于 bounded replay 读侧摘要，不新增任何 attach / stream 写链。
- 当前 desktop local shell 主链已新增 `desktop_session_attachment_acknowledge`：shell tab 在消费 live replay event 与 replay catch-up 后，会把最新 sequence 回写到 runtime attachment，避免 `sessionIndex.attachments.lastAckSequence` 永久停留在启动时初值。
- 当前 desktop bridge 已新增 `desktop_session_attach / detach / reattach`，`@sdkwork/terminal-infrastructure` 已可路由结构化 Session 写请求到 `SessionRuntime`。
- 当前 `@sdkwork/terminal-shell` 在宿主卸载时会 best-effort `detach` 仍存活 attachment，避免 host teardown 后 session index 长期残留“已附着”的假状态。
- 当前 `SessionRuntime::record_output` 已在无活跃 attachment 时保持 `Detached`，不会因为 detached session 的后台 output 再次把会话状态抬回 `Running`。
- 当前 desktop shell 仍保留 `Close tab / Restart shell -> terminate` 的显式产品语义；这不等同于 host teardown 下的 `detach` 保活。
- 当前 `apps/desktop` 已把 Session Center 收口为 shell-first overlay：入口位于 shell dropdown，打开后读取 `desktop_session_index + desktop_session_replay_slice`，重连动作走 `desktop_session_reattach`，成功后由 ShellApp 打开新的 runtime-backed tab。
- 当前 desktop Session truth 读写链已显式保留 `SessionDescriptor.tags`：`session_index / attach / detach / reattach -> shared types/contracts -> Session Center / reattach intent` 不再把 `profile:*`、`resource:*` 标签压扁成 `modeTags`；仅对旧快照缺失 `tags` 时做读侧兼容回退。
- 当前 desktop 交互式重连已对 `target=local-shell / ssh / docker-exec / kubernetes-exec` 开放；`remote-runtime` 在 live attach/input/stream host 未落地前仍只展示会话真相、replay 与诊断，不暴露伪交互式 `Reattach`。

## 5. AI CLI 能力矩阵

| 能力 | 主入口 | 主调用链 | 下游 | 验收点 |
| --- | --- | --- | --- | --- |
| CLI 发现 | `ai-cli` | Feature Service -> Local Runtime Channel | CLI Host | 能识别二进制、版本、认证状态 |
| 本地 CLI 启动 | `ai-cli` | Feature Service -> Runtime Channel | CLI Host + PTY | 原生命令运行 |
| 远程 CLI 启动 | `ai-cli` | Feature Service -> Runtime Channel | Connector + CLI Host | 目标环境内可运行 |
| CLI 恢复 | `sessions` | Session Center -> Runtime | Session Runtime | 历史、退出码、版本可追溯 |

## 6. Server Mode 能力矩阵

| 能力 | 主入口 | 主调用链 | 下游 | 验收点 |
| --- | --- | --- | --- | --- |
| 登录与工作区 | `shell/web` | Public API | Auth / Workspace | 认证、鉴权、工作区切换正确 |
| Node 管理 | `operator` | Manage API | Broker / Runtime Node | 节点状态、能力、负载可见 |
| Session Broker 协调 | `server` | Internal API + Runtime Stream | Broker / Node | 期望状态与实际状态一致 |
| 审计 | `manage` | Manage API | Audit Store | 写操作可追踪 |
| 发布与升级治理 | `manage` | Manage API | Release/Upgrade Service | 版本、校验、回滚状态可见 |

规则补充：

- `Server Mode` 的官方运行平台是 `Ubuntu Server x64 / arm64`；Docker 与 Kubernetes 只复用该调用链，不新增独立语义。

## 7. 配置与诊断矩阵

| 能力 | 主入口 | 主调用链 | 下游 | 验收点 |
| --- | --- | --- | --- | --- |
| Profile 更新 | `settings` | Feature Service -> Local Runtime / Public API | Config Store | 写后可读回 |
| Theme / Keybinding 更新 | `settings` | Feature Service -> Shell / Config Store | UI + Config | 新会话与工作台一致 |
| 诊断导出 | `diagnostics` | Feature Service -> Host + Runtime + Store | Logs/Metrics/Crash | 诊断包完整 |
| CLI 模板更新 | `ai-cli` | Feature Service -> Local Runtime / Public API | Template Store | 启动模板写后可读回 |
| 发布检查 | `diagnostics/manage` | Manage API + Diagnostics | Release Manifest / Smoke Report | 发布证据完整 |

## 8. 规则

- 页面不得直接拼接底层协议。
- 任一写操作都必须存在读回校验链。
- 任一能力都必须有唯一主调用链，避免“一能力多主链”。

## 9. 结论

调用矩阵是后续实现、测试、回归和发布 smoke 的统一总表。新增能力若没有在本章落地到主调用链，视为架构未完成。
