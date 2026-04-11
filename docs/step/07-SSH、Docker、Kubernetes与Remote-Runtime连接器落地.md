# Step 07 - SSH、Docker、Kubernetes 与 Remote Runtime 连接器落地

## 1. Step Card

| 项 | 内容 |
| --- | --- |
| 执行模式 | 波次并行 |
| 前置 | `03` `04` `06` |
| 主写入范围 | `packages/sdkwork-terminal-resources/` `packages/sdkwork-terminal-infrastructure/` `packages/sdkwork-terminal-shell/` `apps/desktop/` `crates/sdkwork-terminal-resource-connectors/` `crates/sdkwork-terminal-control-plane/` `crates/sdkwork-terminal-pty-runtime/` `src-tauri/` |
| 最小输出 | `ExecutionTarget` 主链、三平台工具链矩阵、interactive connector session、remote runtime 基线 |
| 非目标 | 不做 AI 语义抽象；不让 Resource Center 取代 terminal-first 主界面；不把 launch/probe/read 误报成完整 interactive terminal |

## 2. 当前真实状态

已完成基线：

- `ExecutionTarget`、connector health、transport、launch/probe request 已冻结。
- Resource Center 已具备 target/read-model、launch/probe request 派生与 desktop bridge。
- `sdkwork-terminal-pty-runtime` 已支持显式 `program + args` 的 PTY bootstrap。
- `sdkwork-terminal-control-plane` 已冻结 shared interactive connector truth loop：  
  `connect preflight -> session admission -> attachment -> PTY spawn -> launch resolution / spawn-failure replay`。
- `src-tauri` 与 `@sdkwork/terminal-infrastructure` 已提供 `desktop_connector_session_create / createConnectorInteractiveSession(...)`。
- `@sdkwork/terminal-shell` 已新增 tab 级 `runtimeBootstrap`，desktop Shell tab 现可按 tab 事实在  
  `createLocalShellSession(...)` 与 `createConnectorInteractiveSession(...)` 之间分支。
- connector interactive session 已可被 ShellApp 承接为顶部 live terminal tab。
- `src-tauri` 与 `@sdkwork/terminal-infrastructure` 已提供 `desktop_execution_target_catalog / executionTargets()`，`apps/desktop` 可通过 `loadDesktopResourceCenterSnapshot(...)` 构造当前桌面 Resource Center snapshot。
- 顶部 shell dropdown `Connectors` 已改为消费当前 snapshot，并把 `connector launch intent` 正式注入 ShellApp；`SSH / Docker / Kubernetes` 已具备从产品入口直达 live terminal tab 的主链。
- `apps/desktop/src/connector-shell.ts` 已把默认 connector launch intent 的 `requestId` 收口为 action 级一次性值；同一 target 从顶栏重复打开时不再被 ShellApp 的 request 去重保护吞掉。
- `crates/sdkwork-terminal-resource-connectors` 已补齐真实 host/config/health discovery baseline：  
  `SSH=SDKWORK_TERMINAL_SSH_AUTHORITY + ~/.ssh/config 多 Host`、`Docker=SDKWORK_TERMINAL_DOCKER_AUTHORITY + docker ps 多运行容器`、`Kubernetes=SDKWORK_TERMINAL_KUBERNETES_AUTHORITY + current-context + 多 pod`、`Remote Runtime=SDKWORK_TERMINAL_REMOTE_RUNTIME_AUTHORITY`
- `src-tauri::desktop_execution_target_catalog` 现已消费 discovery 结果而非静态默认 catalog；`apps/desktop` 现会在首次加载与每次打开顶部 profile/connectors dropdown 前刷新 snapshot，形成桌面端 catalog refresh baseline。
- desktop terminal 输入热路径已覆盖 `idle / binding / retrying` 排队；bootstrap 期间不再直接丢输入。

仍未闭环：

- `remote-runtime` 已完成 request model、web shell binding 与 runtime-node host core，但 `publicApi / runtimeStream` 的真实 HTTP/SSE 宿主包装、web 手工 smoke 与 recovery review 证据仍未闭环。
- `ssh / docker-exec / kubernetes-exec` 已打通桌面端 interactive reattach 入口，但跨主机 reconnect/recovery 与实机证据仍未闭环。
- connector 级 attach / reconnect / recovery 仍未形成跨目标统一闭环。
- 当前 inventory 已扩展到多 SSH host / 多 container / 多 pod 枚举，并补齐了显式 authority 优先与去重基线；跨平台排序策略与更深层 authority 打分仍可继续打磨。

## 3. 设计边界

- `ExecutionTarget` 是统一目标语义，connector 只承载底层差异。
- ShellApp 负责 terminal-first 承接，不负责资源发现。
- Resource Center 负责 target 发现、诊断、launch intent；Session Center 负责运行真相、replay、恢复。
- Desktop 先走本地 CLI/系统工具链；Docker/K8s 是 server/remote 扩展，不是独立产品模式。

## 4. 本轮收口

### 已完成

- Shell model 新增 tab 级 `runtimeBootstrap`，支持 `local-shell | connector`。
- ShellApp 新增 connector bootstrap 分支，可直接走 `createConnectorInteractiveSession(...)`。
- connector tab 的 bootstrap 请求可跨 restart / duplicate 保持一致。
- connector/live runtime 成功绑定后，tab 会吸收真实 `workingDirectory / invokedProgram`。
- desktop 输入在 `idle / binding / retrying` 阶段统一进入 pending queue，运行后按顺序 flush。
- desktop bridge 新增 `executionTargets()`，桌面端现可先加载 Resource Center snapshot，再据此派生 shell dropdown `Connectors` 菜单。
- `apps/desktop` 已把顶部 `Connectors` 正式产品入口接入 ShellApp；`findDesktopConnectorTargetById(...)` 改为消费当前 snapshot，不再回退到模块静态快照。
- `apps/desktop/src/connector-shell.ts` 现已对每次 connector launch intent 生成 one-shot `requestId`，修复同一 `SSH / Docker / Kubernetes` target 从顶栏连续打开只生效一次的问题。
- `apps/desktop/src/session-center-shell.ts` 与 `apps/desktop/src/DesktopSessionCenterOverlay.tsx` 已把 desktop interactive reattach 从 `local-shell only` 扩展到 `ssh / docker-exec / kubernetes-exec`，并保持 `remote-runtime` 只读。
- `sdkwork-terminal-resource-connectors` 已把 connector catalog 从默认演示目录推进到真实 discovery：host CLI、SSH config 多 Host、Docker 多运行容器、Kubernetes current-context + 多 pod 与 remote-runtime authority 配置都会直接影响 `health / sessionLaunchable / authority`。
- `apps/desktop` 已新增“打开顶部 profile/connectors dropdown 前先刷新 snapshot”的产品逻辑，桌面 header 不再长期缓存旧 catalog。
- `packages/sdkwork-terminal-infrastructure`、`packages/sdkwork-terminal-shell` 与 `src-tauri` 已把 desktop terminal 写入/订阅链路统一收口到 `session-first`：`writeSessionInput / writeSessionInputBytes / resizeSession / terminateSession / subscribeSessionEvents` 对应 `desktop_session_input / desktop_session_input_bytes / desktop_session_resize / desktop_session_terminate`，并保留 host 侧 local-shell 兼容桥接别名。
- `crates/sdkwork-terminal-control-plane` 已补齐 `docker-exec / kubernetes-exec` interactive bootstrap 自动化覆盖，确认共享 truth loop 现已对 `ssh / docker-exec / kubernetes-exec` 全部产出 `Running + attachment + invokedProgram/args + replay state` 证据。
- `tools/smoke/connector-interactive-probe.mjs` 与 `connector-interactive-probe.ps1` 已落地，现可统一生成 `ssh / docker-exec / kubernetes-exec` 的 live terminal、Session Center reattach 与 restart/recovery 仓库级 smoke 计划、JSON report template 与 markdown review template。
- `tools/smoke/connector-interactive-probe.mjs --print-preflight` 已可直接审计当前主机的 `ssh / docker-exec / kubernetes-exec` readiness，并显式给出 `tool missing / daemon blocked / context missing / authority missing` 等阻塞原因。
- `tools/smoke/connector-interactive-probe.mjs --print-batch-plan` 已可输出三平台三目标批量执行矩阵，显式区分“platform-target 实机 smoke 可并行”和“Step/release closeout 必须串行”的执行边界。
- `tools/smoke/connector-interactive-probe.mjs --write-batch-templates` 已可直接落出当前平台或当前过滤范围内的 report/review 模板文件，供实机 smoke 分发、填写与归档。
- `tools/smoke/connector-interactive-probe.mjs --print-execution-plan --platform <platform>` 已可把 preflight 与 batch matrix 合并为当前主机执行视图，直接给出 executable entries、skipped entries 与 `skipReason`。
- `tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform <platform> --output-dir <dir> --ready-only` 已可只为当前主机 ready targets 生成模板，避免把 blocked targets 带入本轮实机 smoke 分发。
- `crates/sdkwork-terminal-runtime-node/src/host.rs` 已新增 `RuntimeNodeHost`，以纯 Rust 方式组合 `SessionRuntime + LocalShellSessionRuntime + runtime stream fanout`，真实承接 `remote-runtime / server-runtime-node` 的 `create / replay / input / input-bytes / resize / terminate / output / warning / exit / sqlite recovery` 主链。
- `crates/sdkwork-terminal-pty-runtime` 已补齐显式命令 PTY 的 terminate closeout：terminate 时会摘除 session handle，并将 Windows `os error 6 / 1460` 收口为 best-effort close，避免 host 会话永久卡在 `Stopping`。

### 仍未完成

- `ssh / docker-exec / kubernetes-exec` 已具备桌面启动与重连入口，但跨主机 reconnect/recovery 证据仍未闭环。
- Remote Runtime 仍缺 `publicApi / runtimeStream` 真 HTTP/SSE 宿主包装、web 手工 smoke 与 reviewed recovery 证据，`CP07-5` 仍未关闭。
- 多目标 inventory 已落地；更细粒度排序、打分与跨平台 authority 选择策略仍需继续打磨。

## 5. 检查点

- `CP07-1`：connector contract、错误体、状态机已冻结。
- `CP07-2`：三平台 `ssh / docker / kubectl` 工具链矩阵通过。
- `CP07-3`：SSH interactive session 主链通过。  
  当前状态：已推进到 `shared bootstrap + desktop IPC + execution target catalog + top dropdown product entry + ShellApp live tab bootstrap`。
- `CP07-4`：Docker/Kubernetes interactive exec 主链通过。  
  当前状态：已完成共享 control-plane 覆盖与仓库级 smoke baseline，仍缺实机 report/review 归档与 connector 级 attach/reconnect/recovery 闭环。
- `CP07-5`：Remote Runtime + recovery 基线通过。  
  当前状态：未完成。

## 6. 自动化证据

- `tests/desktop-runtime-bridge.test.ts`
- `tests/desktop-resource-launch.test.ts`
- `tests/resource-center.test.ts`
- `tests/shell-tabs.test.ts`
- `tests/shell-app-render.test.ts`
- `tests/connector-interactive-probe.test.ts`
- `tests/web-runtime-bridge.test.ts`
- `cargo test --manifest-path crates/sdkwork-terminal-resource-connectors/Cargo.toml -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-pty-runtime/Cargo.toml -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture`
- `node tools/smoke/connector-interactive-probe.mjs --print-plan`
- `node tools/smoke/connector-interactive-probe.mjs --print-preflight --platform windows-desktop`
- `node tools/smoke/connector-interactive-probe.mjs --print-execution-plan --platform windows-desktop`
- `node tools/smoke/connector-interactive-probe.mjs --print-batch-plan`
- `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform ubuntu-desktop --output-dir tmp/connector-batch`
- `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform windows-desktop --output-dir tmp/connector-batch-ready --ready-only`

## 2026-04-10 Supplement - Remote Runtime Web Bridge Slice

- 本轮已补齐 `remote-runtime` 的仓库内专用请求建模：`createRemoteRuntimeSessionCreateRequest(...)` 只接受 `remote-api` target，不再走 `createConnectorSessionLaunchRequest(...)`。
- 本轮已补齐 web/runtime-node 基础设施客户端：`createWebRuntimeBridgeClient(...)` 已覆盖 `create session / replay / input / binary input / resize / terminate / runtime stream subscribe`。
- 本轮尚未把该 client 接入 `apps/web -> ShellApp` 真终端主链，也未补齐 server-side runtime-node host；因此 `CP07-5` 仍未关闭。
- 后续顺序固定为：
  `request model + web bridge` 已完成 ->
  `apps/web shell binding` ->
  `runtime-node host attach/input/stream` ->
  `recovery evidence + review artifacts`。

## 7. 完成定义

满足以下条件后，Step 07 才能关闭：

- ShellApp 能从正式产品入口打开 `ssh / docker-exec / kubernetes-exec` live terminal tab；`remote-runtime` 仍停留在 discovery/read-model 阶段。
- connector session 具备 create / attach / replay / input / resize / terminate / reconnect / recovery 闭环。
- 三平台工具链矩阵与 Ubuntu Server `x64 / arm64` 证据齐备。
- Resource Center、Session Center、ShellApp 三者边界清晰且无伪交互。

## 8. 下一轮最优动作

1. 先基于 `connector-interactive-probe --print-preflight` 与 `--print-execution-plan` 审计各主机 readiness/可执行矩阵，再用 `--write-batch-templates --ready-only` 只为 ready targets 生成本轮模板；多主机全量分发时再结合 `--print-batch-plan` 组织 `ssh / docker-exec / kubernetes-exec` 的三平台并行实机 smoke，并归档 live terminal、Session Center reattach 与 restart/recovery report/review。
2. 继续补齐 `ssh / docker-exec / kubernetes-exec` 的 reconnect/recovery 实机 report/review 证据，关闭 connector attach/reconnect/recovery 产品闭环。
3. 在现有 `RuntimeNodeHost` 之上补齐 `publicApi / runtimeStream` 薄宿主、web 手工 smoke 与 recovery review 证据，再关闭 `CP07-5`。
## 2026-04-10 Supplement - Web Shell Runtime Binding Slice

- 本轮已补齐 `apps/web -> ShellApp` 的正式接线：`apps/web/src/App.tsx` 现在会创建 `createWebRuntimeBridgeClient(...)`，并把 `VITE_TERMINAL_RUNTIME_*` 解析后的 `webRuntimeTarget` 传入 `ShellApp`。
- `ShellApp` 现在接受 `webRuntimeClient` 与 `webRuntimeTarget`，tab 级 `runtimeBootstrap` 已扩展为 `local-shell | connector | remote-runtime`；web 首 tab 与新 tab 在存在目标配置时会直接进入 `remote-runtime` 主链。
- `ShellApp` 的 bootstrap、replay、input、resize、terminate、subscribe 已收口为 desktop/web 共用的 session client 热路径；desktop-only 的 `detach / attachment-ack` 仍保持专属。
- `CP07-5` 仍未关闭：当前只完成了 web shell binding，不代表 `runtime-node host attach/input/stream/recovery` 已落地，也不代表 `remote-runtime` recovery 证据已齐全。

## 2026-04-10 Supplement - Runtime-Node Host Core Slice

- 本轮已在 `crates/sdkwork-terminal-runtime-node/src/host.rs` 落地 `RuntimeNodeHost`、`RemoteRuntimeSessionCreateRequest` 与完整 server-side snapshots/events，accepted truth loop 为：  
  `createRemoteRuntimeSession -> SessionRuntime.create+attach -> LocalShellSessionRuntime.create_process_session -> runtime replay/state -> input/input-bytes/resize/terminate -> output/warning/exit -> sqlite recovery`。
- `RuntimeNodeHost` 当前作为纯 Rust 共享宿主存在，不提前把 `axum/warp` 或 broker 编排塞进 Step 07；后续 `publicApi / runtimeStream` 只允许做薄包装，不得复制第二套 Session 模型。
- `crates/sdkwork-terminal-pty-runtime` 已补齐 terminate closeout，确保显式命令 PTY 在 Windows 下不会因 `os error 6 / 1460` 长期卡住，`runtime-node` recovery 测试现已能看到真实 `Exit` 收口。
- `CP07-5` 仍未关闭：当前只闭合了 runtime-node host core，不代表 web 已通过真实 HTTP/SSE 宿主访问它，也不代表 `remote-runtime` recovery review 证据已齐全。

### 本轮验证

- `cargo test --manifest-path crates/sdkwork-terminal-pty-runtime/Cargo.toml -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture`

### 本轮验证

- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/resource-center.test.ts tests/web-runtime-bridge.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts`
- `pnpm typecheck`
- `pnpm build`
