# sdkwork-terminal

## 2026-04-10 Supplement - Step 07 Runtime-Node Host Core

- `crates/sdkwork-terminal-runtime-node/src/host.rs` 现已新增 `RuntimeNodeHost`、`RemoteRuntimeSessionCreateRequest`、session/replay/input/resize/terminate snapshots 与 `RuntimeNodeStreamEvent`，把 `remote-runtime / server-runtime-node` 的 server-side 宿主真逻辑下沉到纯 Rust crate。
- `RuntimeNodeHost` 现已组合 `SessionRuntime + LocalShellSessionRuntime + stream fanout`，闭合 `create session -> attach -> PTY spawn -> replay/state -> input / input-bytes / resize / terminate -> output / warning / exit -> sqlite recovery` 主链。
- `crates/sdkwork-terminal-pty-runtime` 的 `terminate_session()` 现已在退出前摘除 session handle，并把 Windows `os error 6 / 1460` 视为 best-effort close，让显式命令 PTY 在 terminate 后能够继续排空 `Exit` 事件，而不是卡死在 `Stopping`。
- `remote-runtime` 的 accepted Step 07 顺序现已推进到：`request model + web bridge` 已完成 -> `apps/web shell binding` 已完成 -> `runtime-node host core` 已完成。
- `CP07-5` 仍未关闭：`publicApi / runtimeStream` 的真实 HTTP/SSE 薄宿主、web 手工 smoke 与 reviewed recovery 证据仍然缺失。

### Verified

```bash
cargo test --manifest-path crates/sdkwork-terminal-pty-runtime/Cargo.toml -- --nocapture
cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture
```

## 2026-04-10 Supplement - Step 07 Web Shell Runtime Binding

- `apps/web/src/App.tsx` 现已显式创建 `createWebRuntimeBridgeClient(...)`，并读取 `VITE_TERMINAL_RUNTIME_BASE_URL / WORKSPACE_ID / AUTHORITY / TARGET / WORKING_DIRECTORY` 生成 `webRuntimeTarget` 后传入 `ShellApp`。
- `packages/sdkwork-terminal-shell/src/model.ts` 与 `packages/sdkwork-terminal-shell/src/index.tsx` 现已把 `remote-runtime` 纳入 tab 级 `runtimeBootstrap` 真相；desktop 与 web 共用 `session-first` 的 `bootstrap / replay / input / resize / terminate / subscribe` 主链。
- web 首 tab 与新 tab 在存在 `webRuntimeTarget` 时会进入真实 runtime-backed terminal stage；只有缺失运行目标配置时才允许回退到 prompt fallback。
- desktop-only 边界保持不变：`detachSessionAttachment / acknowledgeSessionAttachment / remote-runtime 禁止 desktop interactive reattach` 没有被放宽。
- 本轮只闭合了 `apps/web -> ShellApp` 的接线，不代表 `remote-runtime` recovery 完成；`runtime-node host / attach / stream / recovery` 仍需后续 Step 07 证据闭环。

### Verified

```bash
node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/resource-center.test.ts tests/web-runtime-bridge.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts
pnpm typecheck
pnpm build
```

`sdkwork-terminal` 是一款面向专业开发者、DevOps、平台工程师与 AI Coding 高阶用户的跨平台 Terminal 平台。产品目标不是“再做一个能打开命令行的窗口”，而是对标 `Windows Terminal` 的产品完成度、吸收 `VS Code Terminal` 的工作流整合能力、参考 `WezTerm / Zellij` 的工程与会话理念，构建可商业化交付的“`desktop / server` 双主态 + `docker / k8s` 两包装 + 共核但不全共享”的专业 terminal 产品。

## 1. 产品定位

- `terminal-first`：Terminal 是主产品，不是 IDE 附属面板。
- `session-first`：Session 是一等实体，窗口与标签页只是 attachment。
- `cli-native`：原生托管 `Codex / Claude Code / Gemini / OpenCode` 等 CLI，不做统一语义抽象。
- `server-ready`：桌面端从 Day 1 预留 `server mode`，`docker / k8s` 只是 `server` 的交付包装，不是第二套业务实现。
- `shared-core-not-shared-host`：共享 `Session / Replay / ExecutionTarget / CLI Launch Contract`，不共享桌面宿主、Server 宿主与交付链实现。

## 2. 产品边界

### 2.1 明确要做

- 专业级本地终端、多标签、多窗格、多工作区。
- Session 创建、Attach、Detach、Reattach、Replay、Recovery。
- 统一运行目标：`local-shell / ssh / docker-exec / kubernetes-exec / remote-runtime / server-runtime-node`。
- AI Coding CLI 原生发现、启动、托管、诊断、恢复。
- 桌面端、Web Console、Server Mode 的共核架构。

### 2.2 明确不做

- 不在本产品里抽象 `Codex / Claude Code / Gemini / OpenCode` 的统一语义协议。
- 不把产品做成 IDE 替代品。
- 不为 `docker / k8s` 维护独立业务主链。
- 不让 UI 本地缓存成为 Session 真相源。

## 3. 行业对标

| 维度 | 对标对象 | 取长目标 |
| --- | --- | --- |
| 产品设计 | `Windows Terminal` | 主舞台设计、Profile、标签页、窗格、专业终端心智 |
| 工作流整合 | `VS Code Terminal` | Shell Integration、工作区联动、远程工作流整合 |
| 工程质量 | `WezTerm` | 终端工程严谨性、远程能力、稳定性 |
| 会话模型 | `Zellij` | Session / Layout / Recovery 思维 |
| 平台能力 | `Tauri` | `Rust backend + React workbench` 跨平台桌面能力 |

## 4. 交付形态

- `Desktop Mode`：个人与单机专业工作流主形态。
- `Server Mode`：团队化、自托管、集中治理主形态。
- `Docker`：`server` 的镜像化交付包装。
- `Kubernetes`：`server` 的集群化交付包装。

## 5. 核心能力版图

| 能力域 | 标准 |
| --- | --- |
| Terminal Core | 输入、输出、Resize、Selection、Search、Scrollback、回放基础能力 |
| Session Runtime | Session 生命周期、Attach/Detach/Reattach、Replay、Recovery |
| Resource Connectors | Local、SSH、Docker、Kubernetes、Remote Runtime 统一模型 |
| AI CLI Native Host | CLI 发现、版本、鉴权状态、启动模板、日志、退出码、恢复 |
| Workbench | Shell、Session Center、Resources、Settings、Diagnostics |
| Server Mode | Public API、Manage API、Internal API、Broker、Runtime Node |
| Governance | Persistence、Observability、Security、Testing、Release、Rollback |

## 6. 技术架构

### 6.1 前端与桌面宿主

- 桌面工作台：`Tauri 2 + React + TypeScript + Vite`
- Web 工作台：共享 `packages/` 能力层
- `src-tauri`：薄宿主，负责窗口、IPC、打包与本地桥接

### 6.2 Rust 运行时内核

- `sdkwork-terminal-terminal-core`：终端核心语义
- `sdkwork-terminal-session-runtime`：Session 真相与运行时生命周期
- `sdkwork-terminal-replay-store`：Replay 片段与回放读链
- `sdkwork-terminal-resource-connectors`：运行目标连接器
- `sdkwork-terminal-ai-cli-host`：AI CLI 原生托管
- `sdkwork-terminal-control-plane / runtime-node`：Server Mode 控制面与执行节点；其中 `control-plane` 也承载桌面端共享宿主真逻辑，例如 SessionRuntime SQLite bootstrap 与恢复入口

### 6.3 数据与状态

- 本地配置：`config.toml`
- 本地运行状态与索引：`SQLite`
- 服务端持久化：`PostgreSQL + Redis + Object Storage`

## 7. 工程组织

```text
apps/sdkwork-terminal
|- apps/
|  |- desktop
|  |- web
|- packages/
|  |- sdkwork-terminal-xxx
|- crates/
|  |- sdkwork-terminal-xxx
|- src-tauri/
|- docs/
|  |- 架构/
|  |- step/
|  |- review/
|  |- release/
|  |- prompts/
|- tests/
```

### 7.1 命名规范

- 目录名：`packages/sdkwork-terminal-xxx`
- `package.json.name`：`@sdkwork/terminal-xxx`
- crate 名：`sdkwork-terminal-xxx`
- 桌面分包遵循 `sdkwork-terminal-xxx` 模式，与 `claw-studio` 的 workspace 规范对齐

## 8. 当前真实进度

- `Step 00-04`：已落地
  - workspace / packages / crates / `src-tauri` 骨架成立
  - API / IPC / Runtime Stream 契约冻结
  - `Tauri Host -> Local Session Daemon -> Desktop Runtime Bridge` 最小主链成立
- `Step 05`：已落地
  - `terminal-core + xterm adapter + workbench terminal pane` 基线成立
  - 输入、输出、Resize、Selection、Search、Scrollback 基线路径已验证
  - `packages/sdkwork-terminal-shell` 已从 dashboard/workbench 原型收口为 `Windows Terminal` 风格桌面壳：顶部 custom header + `tab strip`、中部 active terminal stage；`Sessions / Resources / AI CLI / Settings / Diagnostics` 只能通过 drawer / overlay / palette 作为辅助层接入，不能占据首页主舞台
  - `apps/web` 当前已直接复用 `@sdkwork/terminal-shell`，证明 Host/Shell/Feature 分层没有被桌面宿主反向污染
  - Desktop Shell 的 `Run` 已接通真实本地 one-shot shell 执行链：`ShellApp -> desktop_local_shell_exec -> sdkwork-terminal-shell-integration -> sdkwork-terminal-pty-runtime`，当前 tab 可回填 `stdout / stderr / exitCode / workingDirectory / invokedProgram`
  - Desktop 本地 tab 已接通真实 PTY interactive session：`create / input / input-bytes / resize / terminate / replay / retry / restart` 主链均有 Rust 与 TypeScript 证据；当前剩余缺口已转为 remote connector interactive host，而不是本地 shell 假终端问题
- `Step 06`：已落地
  - Session Runtime、Attach/Detach/Reattach、Replay、SQLite 索引主链已建立
  - `sdkwork-terminal-control-plane` 已冻结桌面端共享 `SessionRuntime` bootstrap：统一负责 `session-runtime.sqlite3` 路径约定、目录创建与 `SessionRuntime::with_sqlite` 初始化，`src-tauri` 仅保留 app-local-data 路径解析与 IPC 薄桥接
  - `sdkwork-terminal-runtime-node` 已新增服务端共享 bootstrap：`create_runtime_node_session_runtime(...)` 统一收口 `hostMode=server`、`platformFamily / cpuArch / runtimeLocation / storageSurface` 诊断快照，并复用 `SessionRuntime::with_sqlite` 恢复 `Ubuntu Server` 持久化 session index / replay / ack 真相
  - `cargo test -p sdkwork-terminal-control-plane` 已补齐桌面端 SQLite 恢复最小证据：桌面端重启后可恢复 persisted session index 与 replay transcript
  - `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture` 已补齐 `Ubuntu Server` 恢复最小证据：runtime-node 重建后可恢复 persisted session index、replay transcript 与 `lastAckSequence`
  - `tools/smoke/session-recovery-probe.mjs` 与 `session-recovery-probe.ps1` 已固化 `Windows desktop / Ubuntu desktop / macOS desktop / Ubuntu Server` 的恢复矩阵、JSON report template 与 markdown review template，作为 `CP06-5` 的仓库级 smoke 入口
  - `src-tauri` 与 `@sdkwork/terminal-infrastructure` 已新增 `desktop_session_attach / detach / reattach`，desktop bridge 不再只有 replay 读链，没有 Session 写链
  - `@sdkwork/terminal-shell` 在宿主卸载时会 best-effort `detach` 仍存活的 attachment；显式 `Close tab / Restart shell` 仍属于产品级 `terminate`
  - `sdkwork-terminal-session-runtime` 已修正 detached consistency：无活跃 attachment 的 Session 即使继续收到后台 output，也不会被错误抬回 `Running`
  - `apps/desktop` 已新增 terminal-first `Session Center` overlay：入口位于 shell dropdown，不引入 dashboard/home 页面；对 `local-shell` detached session 可执行真实 `desktop_session_reattach -> 新 tab 绑定 -> replay catch-up -> live subscription`，非 `local-shell` 当前仅保持会话真相与 replay 只读可见
  - `cargo test --workspace` 现已作为 Rust 工作区标准验证门；`src-tauri` 保持薄宿主边界并通过 `test = false` 避免无业务断言的 Tauri cdylib harness 进入单测矩阵，桌面行为证据继续下沉到共享 Rust crates 与 TypeScript bridge 测试
- `Step 07`：进行中
  - 已完成 `ExecutionTargetDescriptor`、connector health/transport、Resource Center 派生模型、Session draft、connector launch request / exec probe request、resource action descriptors、runtime launch intent 持久化、Rust connector launch/diag/close plan，以及 runner 执行抽象
  - 已同步 `runtime-contract snapshot`
  - 已完成 system runner smoke 与真实 SSH / Docker / Kubernetes toolchain smoke
  - 已打通 `system-cli target -> connector launch request -> Rust launch plan` 最小桥接
  - connector-backed Session 已可在 runtime 中以 `Starting` 状态持久化启动意图，便于后续 connect / exec 主链与 recovery 收口
  - connector-backed Session 在 attach / output 期间保持 `Starting` 真相，新增 `resolve_connector_launch` 将启动结果显式收口到 `Running / Failed`，并写入 replay `state / warning` 证据
  - `src-tauri` 已新增 `launch_connector_session_from_request` 组合桥接：可将 protocol launch request 串接到 CLI launch plan、connect phase 与 runtime launch resolution
  - `src-tauri` 已暴露 `desktop_connector_launch` 与 `desktop_connector_exec_probe`，`@sdkwork/terminal-infrastructure` 可通过 desktop bridge client 分别发起 connector launch 与 bounded connect + exec probe
  - `apps/desktop` 与 `ResourcesPanel` 已接通桌面 UI 路径：可直接对 launchable system-cli target 发起 connector launch 与 exec probe，并展示结构化结果、失败、退出码与 output/warning 证据
  - `sdkwork-terminal-pty-runtime` 已补齐显式命令 PTY bootstrap：`create_process_session(...)` 可直接承载 `ssh / docker exec / kubectl exec` 一类 system-cli interactive 进程，不再被 `shell profile` 限死
  - `sdkwork-terminal-control-plane` 已新增共享编排 `create_interactive_connector_session(...)`：统一负责 `connect preflight -> Session admission -> attachment create -> PTY spawn -> launch resolution / spawn failure replay`
- `src-tauri` 与 `@sdkwork/terminal-infrastructure` 已新增 `desktop_connector_session_create` / `createConnectorInteractiveSession(...)`，桌面宿主现在可返回 `session + attachment + invokedProgram + replay state` 的交互式连接器启动快照
- `@sdkwork/terminal-shell` 现已具备 tab 级 `runtimeBootstrap` 分支：desktop Shell tab 可按真实 tab 事实在 `createLocalShellSession(...)` 与 `createConnectorInteractiveSession(...)` 之间切换，connector interactive session 已可被承接为顶部 live terminal tab
  - `src-tauri` 与 `@sdkwork/terminal-infrastructure` 已新增 `desktop_execution_target_catalog` / `executionTargets()`；`apps/desktop` 现通过 `loadDesktopResourceCenterSnapshot(...)` 将 desktop bridge 执行目标目录投影成 Resource Center snapshot，并以该 snapshot 动态驱动顶栏 dropdown `Connectors`
  - `apps/desktop` 已将顶部 `Connectors` 正式产品入口接入 ShellApp：当前可从自定义 header dropdown 直接启动 `SSH / Docker / Kubernetes` live terminal tab；菜单项不再在模块加载期固化为静态常量
  - `apps/desktop/src/connector-shell.ts` 已把 connector launch intent 默认 `requestId` 收口为 action 级一次性值，而不是 target 级稳定值；同一 `SSH / Docker / Kubernetes` 目标现在可从顶栏重复打开多个 live terminal tab，不再被前端去重保护误吞
  - `crates/sdkwork-terminal-resource-connectors` 已把 connector catalog 从默认演示目录推进到真实 host/config/health discovery baseline：  
  `SSH=SDKWORK_TERMINAL_SSH_AUTHORITY + ~/.ssh/config 多 Host`、`Docker=SDKWORK_TERMINAL_DOCKER_AUTHORITY + docker ps 多运行容器`、`Kubernetes=SDKWORK_TERMINAL_KUBERNETES_AUTHORITY + current-context + 多 pod`、`Remote Runtime=SDKWORK_TERMINAL_REMOTE_RUNTIME_AUTHORITY`
- `src-tauri::desktop_execution_target_catalog` 现已在每次调用时执行真实 discovery；`apps/desktop` 除首次加载外，也会在打开顶部 profile/connectors dropdown 前主动刷新 `resourceCenterSnapshot`，避免桌面 host 目标目录长期停留在陈旧快照
- desktop terminal 输入热路径已补齐 `idle / binding / retrying` 排队语义；连接器 tab 在 bootstrap 尚未完成前不再直接丢失原始输入
  - `src-tauri` 已暴露 `desktop_session_index` 与 `desktop_session_replay_slice`，`apps/desktop` 已可把 runtime session/attachment 快照、bounded replay transcript、replay status diagnostics、replay cursor metadata、replay cursor drift summary、replay ack lag summary、replay ack window summary、replay window coverage summary、replay latest state projection、replay state lag summary、replay state freshness projection、replay latest output projection、replay output lag summary、replay output ack summary、replay output freshness projection、replay health summary、replay latest warning projection、replay latest exit projection、replay freshness projection、replay timeline gap summary、replay sequence gap summary、replay timeline metadata、replay event mix metadata、replay warning/exit evidence digest、replay evidence ack summary 与 replay evidence freshness projection 投影到 `SessionsPanel`，让 launch/probe 后的真实 session 进入 Session Center，并展示当前可追溯的 recent replay lines、replay unavailable 诊断、cursor 窗口摘要、cursor drift 摘要、ack lag 摘要、ack window 摘要、window coverage 摘要、latest state 摘要、state lag 摘要、state freshness 摘要、latest output 摘要、output lag 摘要、output ack 摘要、output freshness 摘要、health 摘要、latest warning 摘要、latest exit 摘要、freshness 摘要、timeline gap 摘要、sequence gap 摘要、时间窗口摘要、事件分布摘要、warning/exit 证据摘要、evidence ack 摘要与 evidence freshness 摘要
  - `packages/sdkwork-terminal-sessions` 已新增 `replayStateAck` 与 `summarizeSessionReplayStateAck`，`SessionsPanel` 现可直接给出 attachment ack 相对 latest state 的 `lagging / aligned / covered` 只读摘要
  - `packages/sdkwork-terminal-sessions` 已新增 `replayStateOutputDelta` 与 `summarizeSessionReplayStateOutputDelta`，`SessionsPanel` 现可直接给出 latest state 与 latest output 的相对先后和差值摘要，帮助快速判断 `state-ahead / output-ahead` 读侧事实
  - `packages/sdkwork-terminal-sessions` 已新增 `replayEvidenceAck` 与 `summarizeSessionReplayEvidenceAck`，`SessionsPanel` 现可直接给出 attachment ack 相对 latest warning/exit evidence 的 `lagging / aligned / covered` 只读摘要
  - `packages/sdkwork-terminal-sessions` 已新增 `replayEvidenceFreshness` 与 `summarizeSessionReplayEvidenceFreshness`，`SessionsPanel` 现可直接给出 latest warning/exit evidence 相对 `observedAt` 的时效性摘要，帮助区分“整体 replay 仍新鲜”和“最近 warning/exit evidence 是否已经陈旧”
  - Rust protocol `ConnectorSessionLaunchRequest` 已可直接映射到 runtime `SessionCreateRequest`
  - 已新增 `connector_toolchain_smoke` example 与 `tools/smoke/connector-toolchain-smoke.ps1`
  - `crates/sdkwork-terminal-control-plane` 已补齐 `docker-exec / kubernetes-exec` interactive bootstrap 自动化覆盖，确认共享 truth loop 现已对 `ssh / docker-exec / kubernetes-exec` 建立自动化证据
  - 已新增 `tools/smoke/connector-interactive-probe.mjs` 与 `connector-interactive-probe.ps1`，用于生成 `ssh / docker-exec / kubernetes-exec` live terminal、Session Center reattach 与 restart/recovery 的仓库级 smoke 计划、report template 与 review template
  - `tools/smoke/connector-interactive-probe.mjs --print-batch-plan` 现可直接输出 `windows-desktop / ubuntu-desktop / macos-desktop x ssh / docker-exec / kubernetes-exec` 的批量执行矩阵，明确哪些实机证据可并行收集、哪些 Step/release 回写必须串行
  - `tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform ubuntu-desktop --output-dir <dir>` 现可一次性写出当前平台全部 connector 的 report/review 模板文件，降低实机 smoke 前的手工整理成本
  - `tools/smoke/connector-interactive-probe.mjs --print-preflight --platform windows-desktop` 现可审计当前主机的 connector smoke readiness，直接暴露 `command / daemon / context / authority` 阻塞点
  - `tools/smoke/connector-interactive-probe.mjs --print-execution-plan --platform windows-desktop` 现可把 preflight 与 batch plan 合并为当前主机执行视图，明确哪些 connector 现在可执行、哪些必须跳过
  - `tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform windows-desktop --output-dir <dir> --ready-only` 现可只为当前主机 ready targets 预生成 report/review 模板，并返回 skipped 清单
- 远程目标的 ShellApp/tab 级接入已落地到动态产品入口；desktop bridge / ShellApp / Tauri IPC 已统一收口到 `session-first` 写接口：`writeSessionInput / writeSessionInputBytes / resizeSession / terminateSession / subscribeSessionEvents`；当前剩余缺口集中在 `ssh / docker-exec / kubernetes-exec` 的实机 reattach/recovery 证据、多目标 connector inventory 深化与 Remote Runtime live attach/recovery 路由
- `Step 08`：待执行
  - AI CLI Native Host

## 9. 开发与验证

### 9.1 前端

```bash
pnpm install
pnpm dev
pnpm dev:web
pnpm typecheck
pnpm build
pnpm verify
pnpm verify:typescript-probes
pnpm verify:terminal-runtime
pnpm tauri:build
node --test tests/workspace-structure.test.mjs
node --experimental-strip-types --test tests/runtime-contracts.test.ts
node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts
node --experimental-strip-types --test tests/desktop-resource-launch.test.ts
node --experimental-strip-types --test tests/desktop-session-center.test.ts
node --experimental-strip-types --test tests/connector-interactive-probe.test.ts
node --experimental-strip-types --test tests/web-runtime-bridge.test.ts
node --experimental-strip-types --test tests/session-recovery-probe.test.ts
node --experimental-strip-types --test tests/resources-panel.test.ts
node --experimental-strip-types --test tests/terminal-core-workbench.test.ts
```

- `pnpm dev`：从 workspace 根目录启动 Tauri 桌面应用。
- `pnpm dev:web`：只启动 Web/Vite 工作台。
- `pnpm tauri:build`：从 workspace 根目录发起桌面打包。
- `127.0.0.1:1420` 需要空闲；若端口已被占用，先停止旧的 Vite/Tauri dev 进程。

### 9.2 Rust

```bash
cargo test --workspace
cargo test -p sdkwork-terminal-control-plane
cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture
cargo check --manifest-path src-tauri/Cargo.toml
cargo run -p sdkwork-terminal-resource-connectors --example connector_toolchain_smoke
node tools/smoke/connector-interactive-probe.mjs --print-plan
node tools/smoke/connector-interactive-probe.mjs --print-preflight --platform windows-desktop
node tools/smoke/connector-interactive-probe.mjs --print-execution-plan --platform windows-desktop
node tools/smoke/connector-interactive-probe.mjs --print-batch-plan
node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform ubuntu-desktop --output-dir tmp/connector-batch
node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform windows-desktop --output-dir tmp/connector-batch-ready --ready-only
```

## 2026-04-10 Supplement - Step 07 Remote Runtime Web Bridge

- `packages/sdkwork-terminal-resources/src/model.ts` 新增 `createRemoteRuntimeSessionCreateRequest(...)`，显式为 `remote-runtime` 生成 `remote-api` 专用请求，不再错误复用 `system-cli` connector launch request。
- `packages/sdkwork-terminal-types/src/index.ts` 新增 `RemoteRuntimeSessionCreateRequest`，收口 `workspaceId / target / authority / command / workingDirectory / cols / rows / modeTags / tags` 字段。
- `packages/sdkwork-terminal-infrastructure/src/index.ts` 新增 `createWebRuntimeBridgeClient(...)`，固定 web/runtime-node 侧控制面与流面主链：
  `POST publicApi /sessions -> GET publicApi /replays -> EventSource runtimeStream /attach -> session input/resize/terminate`。
- 该增量只完成 `remote-runtime` 请求建模和 web bridge 基础设施；`apps/web` 的 ShellApp 真正接线、服务端 runtime-node host、attach/recovery 闭环仍未完成，Step 07 继续保持打开。

### Verified

```bash
node --experimental-strip-types --test tests/resource-center.test.ts tests/web-runtime-bridge.test.ts
node --experimental-strip-types --test tests/runtime-contracts.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/web-runtime-bridge.test.ts
```

## 10. 文档索引

- 产品与架构总基线：`docs/架构/`
- 分步实施与验收：`docs/step/`
- 审计与复盘：`docs/review/`
- 版本与变更：`docs/release/`
- 循环执行提示词：`docs/prompts/反复执行Step指令.md`

## 11. 当前结论

当前最优路线已经冻结为：

`Windows Terminal 级产品设计 + VS Code Terminal 级工作流整合 + WezTerm/Zellij 级工程方法 + Tauri/React 桌面工作台 + Rust Session/Terminal Core + CLI Native Host + Server Mode 共核架构`

后续工作重点不是重新选型，而是严格按 `docs/step/00-13` 将该路线压实为可测试、可回滚、可发布、可商业化交付的真实工程能力。

## 2026-04-10 Supplement - Session Tags Truth

- `SessionDescriptor.tags` 已从 Rust `SessionRuntime`、desktop bridge、shared contracts/types 到 `Session Center / reattach intent` 全链路贯通。
- `modeTags` 只表达运行模式；`tags` 才是 `profile:*`、`resource:*` 等会话真相标签面。
- `Session Center` 与 desktop reattach 现在优先消费真实 `tags`，仅对旧快照缺失 `tags` 的读侧兼容场景保留 `modeTags` 回退。

## 2026-04-10 Supplement - Desktop SQLite Recovery Bootstrap

- 桌面端 `SessionRuntime` 的 SQLite bootstrap 已下沉到 `sdkwork-terminal-control-plane`，不再由 `src-tauri` 私有维护一套重复初始化逻辑。
- 桌面端持久化数据库文件名冻结为 `session-runtime.sqlite3`，路径位于 Tauri `app_local_data_dir()` 下。
- `cargo test --workspace` 是当前 Rust 工作区标准验证门；`src-tauri` 仅保留薄宿主桥接与 `cargo check` 接线证据，恢复行为必须由共享 Rust crates 与桌面 bridge 测试证明。

## 2026-04-10 Supplement - Session Recovery Smoke Matrix

- `tools/smoke/session-recovery-probe.mjs --print-plan` 现已提供 Step 06 `CP06-5` 的恢复矩阵计划，覆盖 `windows-desktop / ubuntu-desktop / macos-desktop / ubuntu-server`。
- `--report-template` 与 `--review-template` 可生成结构化归档模板，统一记录 `persisted index / replay recovery / reattach-or-recover / attachment ack / platform diagnostics`。
- 当前跨平台恢复支持仍必须靠真实 smoke 证据声明；在没有对应 report/review 产物前，不得笼统声称某个平台已完成恢复能力验收。

## 2026-04-10 Supplement - Runtime-Node Server Recovery Bootstrap

- `sdkwork-terminal-runtime-node` 当前在 Step 06 只负责 server-side recovery baseline，不提前承担 Step 10 的 broker/runtime-node 编排职责。
- 允许的最小 server truth loop 已冻结为：
  `runtime-node bootstrap -> session-runtime.sqlite3 -> persisted session index/replay/ack recovery -> recovery diagnostics snapshot`。
- `Ubuntu Server` 恢复证据现在必须同时包含仓库内 smoke probe 模板和 `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture` 的自动化结果；桌面 SQLite 证据不能替代 server-side recovery 证据。
