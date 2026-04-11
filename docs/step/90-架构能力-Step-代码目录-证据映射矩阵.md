# 架构能力-Step-代码目录-证据映射矩阵

## 1. 使用原则

- 任一 step 完成前，必须同时回答四个问题：兑现了什么能力、落到了哪些目录、拿什么证据证明、当前等级是多少。
- 只有“代码 + 测试 + 证据 + 回写”同时成立，才允许把能力标记为已落地。

## 2. 核心映射

| 能力 | 对应架构章节 | 主 Step | 主要目录 | 最小证据 | 当前状态 |
| --- | --- | --- | --- | --- | --- |
| Workspace / Host / Shell / Foundation 分层 | `02` `03` `15` | `02` `09` | `apps/` `packages/` `src-tauri/` | workspace 结构测试、包边界检查 | `Step 02 已落地` |
| API / IPC / Runtime Stream 契约 | `16` `17` | `03` `10` | `packages/sdkwork-terminal-contracts/` `crates/sdkwork-terminal-protocol/` | 契约快照测试、路由路径测试 | `Step 03 已落地` |
| Desktop Host + Local Session Daemon | `02` `10` `16` | `04` | `apps/desktop/` `src-tauri/` `crates/sdkwork-terminal-session-runtime/` | daemon lifecycle 测试、desktop bridge 测试、cargo check | `Step 04 已达 L3` |
| Terminal Core + Adapter | `07` `08` `10` | `05` | `packages/sdkwork-terminal-core/` `packages/sdkwork-terminal-infrastructure/` `packages/sdkwork-terminal-workbench/` `crates/sdkwork-terminal-terminal-core/` | terminal core 测试、adapter/workbench smoke、build/typecheck | `Step 05 已达 L4` |
| Session / Replay / Recovery | `06` `09` `10` | `06` | `packages/sdkwork-terminal-sessions/` `crates/sdkwork-terminal-session-runtime/` `crates/sdkwork-terminal-replay-store/` `crates/sdkwork-terminal-control-plane/` `crates/sdkwork-terminal-runtime-node/` `crates/sdkwork-terminal-config/` | 状态机测试、reattach/replay 测试、desktop SQLite recovery 测试、runtime-node server recovery 测试、recovery smoke matrix | `Step 06 已达 L4` |
| ExecutionTarget / Connectors | `05` `06` `17` | `07` | `packages/sdkwork-terminal-resources/` `packages/sdkwork-terminal-infrastructure/` `packages/sdkwork-terminal-shell/` `apps/desktop/` `crates/sdkwork-terminal-protocol/` `crates/sdkwork-terminal-resource-connectors/` `crates/sdkwork-terminal-session-runtime/` `crates/sdkwork-terminal-control-plane/` `crates/sdkwork-terminal-pty-runtime/` `src-tauri/` `tools/smoke/` | contract snapshot、resource center 测试、session draft/launch request/exec probe request 测试、resource action 测试、desktop bridge client catalog/launch/interactive-create/exec probe/session index/session replay 测试、desktop resource center loader / launch / exec probe 测试、desktop session center loader 测试、session replay transcript formatter / status formatter / cursor formatter / cursor-drift formatter / ack-lag formatter / ack-window formatter / window-coverage formatter / latest-state formatter / state-lag formatter / state-freshness formatter / state-ack formatter / state-output-delta formatter / latest-output formatter / output-lag formatter / output-ack formatter / output-freshness formatter / health formatter / latest-warning formatter / latest-exit formatter / freshness formatter / gap formatter / sequence-gap formatter / timeline formatter / mix formatter / evidence formatter / evidence-ack formatter / evidence-freshness formatter 测试、connector catalog/launch plan/request bridge 单测、connector discovery 单测、protocol -> runtime admission 测试、runtime launch intent 持久化测试、launch resolution 测试、control-plane interactive connector bootstrap 测试、PTY explicit command spawn 测试、host connect bridge / interactive-create bridge / exec probe / session index / session replay 测试、runner smoke、toolchain smoke example/script、connector interactive smoke probe / report-review template、shell connector bootstrap / idle-input queue / profile-menu refresh 测试 | `Step 07 进行中：CP07-1 已冻结；真实 host/config/health discovery、desktop dropdown refresh baseline、session-first 写接口与 CP07-4 smoke baseline 已落地。仍缺实机 Docker/Kubernetes report/review、多目标 inventory 深化与 Remote Runtime recovery 收口。` |
| AI CLI Native Host | `07` `17` | `08` | `packages/sdkwork-terminal-ai-cli/` `crates/sdkwork-terminal-ai-cli-host/` | CLI 发现、版本、鉴权状态、启动模板验证 | `未开始` |
| Workbench 主体体验 | `07` `08` `15` | `09` | `packages/sdkwork-terminal-shell/` `packages/sdkwork-terminal-*/` | 顶部 tabs/custom header、terminal stage、多标签、多窗格、Session Center、Resources、Settings、Diagnostics、overlay/drawer 与无 dashboard 回归 smoke | `未开始` |
| Server Mode | `02` `10` `16` `17` | `10` | `apps/web/` `crates/sdkwork-terminal-control-plane/` `crates/sdkwork-terminal-runtime-node/` | public/manage/internal/runtime-stream 验证、broker/node smoke | `未开始` |
| Persistence / Observability / Security / Test Matrix | `09` `10` `11` | `11` | `crates/sdkwork-terminal-config/` `crates/sdkwork-terminal-observability/` `tools/` | trace/log/metric、恢复演练、安全与测试矩阵 | `未开始` |
| Install / Deploy / Release / Rollback | `12` `16` | `12` | `deployments/` `tools/release/` `src-tauri/` | 打包、镜像、helm、升级/回滚验证 | `未开始` |
| 发布就绪与总收口 | `13` `14` `17` | `13` | `docs/step/` `docs/review/` `docs/release/` `tools/smoke/` | 总验收、总兼容矩阵、发布评审结论 | `未开始` |

## 3. 架构章节到 Step 的主落点

| 架构章节 | 主落地 Step |
| --- | --- |
| `01` 产品设计与需求范围 | `00` `01` `13` |
| `02` 架构标准与总体设计 | `00` `03` `04` `10` `13` |
| `03` 模块规划与边界 | `01` `02` `07` `09` |
| `04` 技术选型与可插拔策略 | `01` `02` `07` `08` `10` `12` |
| `05` 功能架构与核心业务流程 | `07` `08` `09` |
| `06` 终端会话、运行目标与协议设计 | `03` `06` `07` `08` `10` |
| `07` 终端工作台与 CLI 原生集成设计 | `05` `08` `09` |
| `08` 渲染、兼容性与终端体验设计 | `05` `09` `13` |
| `09` 数据、状态与配置治理设计 | `06` `11` |
| `10` 性能、可靠性与可观测性设计 | `04` `05` `06` `10` `11` `13` |
| `11` 安全、测试与质量治理 | `11` `13` |
| `12` 安装、部署、发布与商业化交付标准 | `12` `13` |
| `13` 演进路线图与阶段评估 | `13` |
| `14` 综合评估矩阵与优先级清单 | `13` |
| `15` 桌面分包集成、组件化与验收基线 | `01` `02` `09` |
| `16` API 体系与契约设计 | `03` `10` `12` |
| `17` 能力到 API 与 IPC 调用矩阵 | `03` `07` `08` `10` `13` |

## 4. 结果规则

- Step 05 之后，Terminal Core 能力允许标记为 `L4`。
- Step 06 之后，Session / Replay / Recovery 允许标记为 `L4`。
- 任何能力如果缺少架构回写或 release 证据，只能标记为“部分兑现”。
