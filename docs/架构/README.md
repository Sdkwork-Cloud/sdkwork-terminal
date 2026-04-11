# sdkwork-terminal 架构文档

## 1. 文档定位

本目录用于冻结 `sdkwork-terminal` 的产品目标、架构标准、实施边界、交付模型与验收口径。写法对齐 `apps/claw-studio/docs/架构`，要求同时给出当前事实、强约束、评估标准与最终结论。

## 2. 当前事实快照

- 产品目标：对标 `Windows Terminal` 的专业跨平台 terminal，首页必须是“顶部 tabs + 终端窗口”，不是 dashboard。
- 技术主栈：`Tauri 2 + React + TypeScript + Vite + Rust Workspace`。
- 集成边界：`Codex`、`Claude Code`、`Gemini`、`OpenCode` 采用原生命令行托管，不做统一 AI 语义抽象。
- 真实终端输入热路径：`xterm onData -> desktop bridge -> Tauri IPC -> Rust PTY writer -> shell echo -> runtime event/replay -> xterm writeRaw`。
- 官方桌面支持目标：`Windows`、`Ubuntu`、`macOS`；官方服务端支持目标：`Ubuntu Server`。
- 官方 CPU 目标：`x64`、`arm64`；发布物必须按目标三元组分别产出。
- 命名规范冻结：目录为 `packages/sdkwork-terminal-xxx`，`package.json.name` 为 `@sdkwork/terminal-xxx`。

## 3. 核心结论

- 专业 terminal 不能做 `desktop / server / docker / k8s` 四态全共享。
- 正确路线是“共核但不全共享”：
  - 共核：`Session`、`Replay`、`ExecutionTarget`、`CLI Launch Contract`、错误语义、配置模型、观测字段、发布元数据。
  - 分层适配：桌面窗口宿主、`ConPTY / POSIX PTY`、系统 shell 发现、凭证库、权限模型、安装器、签名/公证、服务端 broker/runtime node、容器编排。
- `desktop` 与 `server` 是双主态；`docker / k8s` 只是 `server` 的交付包装，不是第二套 terminal 实现。

## 4. 官方支持矩阵

| 形态 | 平台 | 架构 | 说明 |
| --- | --- | --- | --- |
| Desktop | Windows | `x64` / `arm64` | 自定义 header、ConPTY、本地 shell、原生窗口控制 |
| Desktop | Ubuntu | `x64` / `arm64` | 官方 Ubuntu 桌面基线，首发以 Ubuntu LTS 为准 |
| Desktop | macOS | `arm64` / `x64` | 自定义 header、POSIX PTY、签名、公证、登录 shell 环境 |
| Server | Ubuntu Server | `x64` / `arm64` | 控制面、broker、runtime node 官方基线 |
| Docker | Ubuntu Server | `x64` / `arm64` | 仅包装 `server` |
| Kubernetes | Ubuntu Server 节点 | `x64` / `arm64` | 仅编排 `server` |

## 5. 架构硬约束

- `terminal-first`：首页只允许 terminal header 与 terminal viewport 成为主舞台。
- `session-first`：UI 只持有 attachment，不持有 session 真相。
- `platform-explicit`：任何能力都必须明确 `Windows / Ubuntu / macOS` 与 `x64 / arm64` 差异。
- `desktop-local-first`：交互式本地终端体验以桌面为权威实现。
- `server-mode-ready`：服务端复用共核模型，但拥有独立宿主、权限与发布链。
- `docker / k8s -> server only`：不得形成第二套业务实现。
- `src-tauri` 只做宿主桥、窗口、权限、sidecar 与 IPC 组合，不能承载 PTY 热路径与业务真相。
- 终端热路径必须下沉到 Rust runtime，不允许把 PTY 字节流、scrollback、replay 真相压在 React/WebView。
- 焦点、输入回显、复制粘贴、scrollbar 与 tab 切换同属终端主链体验，不能被当成次要 UI 细节。

## 6. 文档目录

1. `01-产品设计与需求范围.md`
2. `02-架构标准与总体设计.md`
3. `03-模块规划与边界.md`
4. `04-技术选型与可插拔策略.md`
5. `05-功能架构与核心业务流程.md`
6. `06-终端会话、运行目标与协议设计.md`
7. `07-终端工作台与 CLI 原生集成设计.md`
8. `08-渲染、兼容性与终端体验设计.md`
9. `09-数据、状态与配置治理设计.md`
10. `10-性能、可靠性与可观测性设计.md`
11. `11-安全、测试与质量治理.md`
12. `12-安装、部署、发布与商业化交付标准.md`
13. `13-演进路线图与阶段评估.md`
14. `14-综合评估矩阵与优先级清单.md`
15. `15-桌面分包集成、组件化与验收基线.md`
16. `16-API体系与契约设计.md`
17. `17-能力到API与IPC调用矩阵.md`

## 7. 评估方法

- 统一采用 `L0-L5`：`L0` 仅规划，`L1` 骨架，`L2` 单机场景可用，`L3` 跨平台/跨目标主链可用，`L4` 具备恢复、观测、安全与回滚口径，`L5` 具备正式商业交付证据。
- 任何“已支持某平台/架构”的结论，都必须附带该目标的构建、启动、核心交互、安装或部署证据。
- 任何“已支持四态”的结论，都只能表示“共核标准已统一”，不能表示“宿主实现完全复用”。

## 8. 使用方式

- 设计与实现冲突时，先修正文档，再改代码。
- 每个 Step 完成后必须同步回写受影响章节。
- `README.md`、`docs/架构/`、`docs/step/`、`docs/release/` 必须形成同一条事实链。

## 9. 总体结论

`sdkwork-terminal` 的正确方向不是做“单套代码硬套四态”，而是做“Windows Terminal 级交互体验 + Rust 终端内核 + 平台显式适配 + 多形态共核交付”的专业 terminal 产品。
