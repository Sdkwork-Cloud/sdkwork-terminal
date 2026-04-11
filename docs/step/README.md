# sdkwork-terminal 分步实施计划索引

## 1. 文档定位

本目录是 [`/docs/架构/`](../架构/README.md) 的执行层，用来把“专业跨平台 terminal”的架构标准拆成可实施、可并行、可验证、可回滚的 Step 体系。

## 2. 适用范围

- `apps/desktop`
- `apps/web`
- `packages/sdkwork-terminal-*`
- `crates/sdkwork-terminal-*`
- `src-tauri/`
- `deployments/`
- `tools/`
- `docs/release/`

## 3. 核心执行结论

- 不是“四态全共享”，而是“共核层 + 平台适配层 + 交付装配层”。
- `desktop` 与 `server` 是双主态；`docker / k8s` 只包装 `server`。
- 首页必须始终保持 terminal-first：顶部 tabs/header，下方 terminal stage。
- 任何 Step 都必须显式回答 `Windows / Ubuntu / macOS` 与 `x64 / arm64` 的实现、测试与发布口径。

## 4. 关联架构基线

执行时必须优先对齐以下文档：

- [`01-产品设计与需求范围`](../架构/01-产品设计与需求范围.md)
- [`02-架构标准与总体设计`](../架构/02-架构标准与总体设计.md)
- [`04-技术选型与可插拔策略`](../架构/04-技术选型与可插拔策略.md)
- [`06-终端会话、运行目标与协议设计`](../架构/06-终端会话、运行目标与协议设计.md)
- [`08-渲染、兼容性与终端体验设计`](../架构/08-渲染、兼容性与终端体验设计.md)
- [`11-安全、测试与质量治理`](../架构/11-安全、测试与质量治理.md)
- [`12-安装、部署、发布与商业化交付标准`](../架构/12-安装、部署、发布与商业化交付标准.md)
- [`16-API体系与契约设计`](../架构/16-API体系与契约设计.md)
- [`17-能力到API与IPC调用矩阵`](../架构/17-能力到API与IPC调用矩阵.md)

## 5. 总体执行顺序

| Step | 主题 | 模式 | 核心输出 | 平台重点 |
| --- | --- | --- | --- | --- |
| `00` | 总实施原则与门禁 | 强串行 | 平台矩阵、证据口径、支持声明规则 | 三平台双架构规则冻结 |
| `01` | 现状基线冻结与差距审计 | 强串行 | 真实现状、缺口、风险清单 | 缺口按平台/架构分栏 |
| `02` | workspace/packages/crates/Tauri 骨架 | 串行主导 | 包结构、平台边界、目标三元组骨架 | `src-tauri`、Server、release tooling 分层 |
| `03` | API、IPC 与 stream 契约冻结 | 强串行 | 控制面/热路径契约 | `invoke` 与 stream 分离 |
| `04` | Desktop Host 与本地桥接 | 强串行 | 桌面宿主、窗口、权限、桥接 | Windows/macOS/Ubuntu 宿主差异 |
| `05` | Terminal Core 与渲染交互 | 波次并行 | tabs/header、terminal kernel、renderer adapter | `ConPTY / POSIX PTY` 与 shell/TUI/CJK |
| `06` | Session / Replay / Recovery | 波次并行 | Session 真相、replay、恢复 | 桌面三平台恢复、`ubuntu-server` recovery 基线与持久化 |
| `07` | SSH / Docker / K8s / Remote Runtime | 波次并行 | 连接器、资源目标、attach/recovery | 桌面三平台工具链 + Ubuntu Server |
| `08` | AI CLI Native Host | 波次并行 | 原生 CLI 托管、模板、恢复 | Codex/Claude Code/Gemini/OpenCode |
| `09` | Workbench 辅助面 | 波次并行 | Session Center/Settings/Diagnostics 等辅助面 | 不得破坏 terminal-first 首页 |
| `10` | Server Mode / Broker / Runtime Node | 波次并行 | 远程 session 托管主链 | Ubuntu Server x64/arm64 |
| `11` | Persistence / Observability / Security / Test Matrix | 波次并行 | 质量体系与矩阵自动化 | P0/P1 目标证据 |
| `12` | Install / Deploy / Release / Upgrade / Rollback | 串行主导 | 安装包、镜像、Helm、发布链 | 目标三元组、签名、公证、回滚 |
| `13` | 集成收口与发布就绪 | 强串行 | RC 决策、残余风险、下一轮 backlog | 总矩阵与最终支持声明 |

## 6. 波次划分

- Wave A：`00-04`，先冻结规则、边界、契约、桌面宿主。
- Wave B：`05-08`，构建真正的 terminal 内核、session 主链、连接器与 AI CLI 托管。
- Wave C：`09-11`，完善辅助工作台、Server Mode、质量与安全体系。
- Wave D：`12-13`，完成交付、发布、升级、回滚与总验收。

## 7. 每个 Step 的硬性内容

每个 Step 文档都必须包含：

- Step Card：执行模式、前置、主写入范围、输入、非目标、最小输出。
- 设计：共核层与平台适配层的边界。
- 实施落地规划：目录、模块、接口、脚本、证据归属。
- 测试计划：单元、契约、集成、兼容、发布 smoke。
- 结果验证：能力兑现、最小证据、回滚口径。
- 检查点：至少包含设计完成、落地完成、测试通过、证据齐全。
- 串并行策略：明确哪些能并行，哪些必须单 owner 串行收口。
- 架构回写：受影响章节必须回写。

## 8. 跨平台硬门禁

- 没有目标三元组证据，就没有平台支持声明。
- `P0` 未通过，不得进入正式发布；`P1` 未通过，不得宣称“全平台全架构完成”。
- `docker / k8s` 只能证明 `server` 可交付，不能证明桌面 terminal 可用。
- 任何 Step 若破坏“顶部 tabs + 终端窗口”的主心智，视为架构回退。

## 9. 推荐执行路径

`00-04 强串行 -> 05/06/07/08 波次并行 -> 09/10/11 波次并行 -> 12 串行主导 + 局部并行 -> 13 强串行收口`

## 10. 每个 Step 完成五件套

1. 代码/脚本已落地。
2. 测试与 smoke 已通过。
3. 受影响架构文档已回写。
4. `docs/review/` 与 `docs/release/` 证据已补齐。
5. 残余风险、回滚路径与下一步准入条件已写明。

缺任意一项，都不得宣称该 Step 完成。
