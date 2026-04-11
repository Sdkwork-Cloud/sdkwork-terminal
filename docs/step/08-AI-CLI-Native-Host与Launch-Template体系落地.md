# Step 08 - AI CLI Native Host 与 Launch Template 体系落地

## 1. Step Card

| 项 | 内容 |
| --- | --- |
| 执行模式 | 波次并行 |
| 前置 | `05`、`06`、`07` |
| 主写入范围 | `packages/sdkwork-terminal-ai-cli/`、`packages/sdkwork-terminal-contracts/`、`crates/sdkwork-terminal-ai-cli-host/`、`crates/sdkwork-terminal-session-runtime/` |
| 执行输入 | `docs/架构/04`、`06`、`07`、`17` |
| 本步非目标 | 不做 AI 语义抽象；不把 CLI 包装成另一套聊天产品；不把二进制探测结果误判为平台完成 |
| 最小输出 | `Codex / Claude Code / Gemini / OpenCode` 的发现、版本、认证状态、Launch Template、Session 托管与平台矩阵证据 |

## 2. 设计

- 每个 CLI 单独 adapter。
- 平台只负责发现、启动、托管、恢复、观测。
- `cli-native` 作为 Session 标签，而非单独协议层。
- CLI 发现与启动必须显式考虑 `Windows / Ubuntu / macOS` 的 shell、PATH、工作目录、认证与安装位置差异。

## 3. 实施落地规划

1. 冻结 CLI Adapter 接口。
2. 冻结 Launch Template 模型：工作目录、参数、环境变量白名单、目标环境、模板来源。
3. 建立二进制发现、版本查询、认证状态检查。
4. 打通本地与远程 target 上的 CLI Session。
5. 将 CLI Session 纳入统一 Session Center、历史、恢复、诊断与回放链。
6. 为 Desktop 三平台与 Ubuntu Server 建立 CLI 发现/启动/恢复证据。

## 4. 测试计划

- adapter 单元测试
- CLI 发现与版本测试
- 本地 CLI 启动 smoke
- 远程 / 容器 / K8s CLI 启动 smoke
- CLI 恢复与退出码记录 smoke
- `Windows / Ubuntu / macOS` CLI discovery matrix
- `Ubuntu Server x64 / arm64` remote CLI smoke

## 5. 结果验证

- 工作台可正确发现已安装 CLI。
- 可使用模板启动 CLI Session。
- CLI Session 与普通 Session 共用历史、恢复、诊断。
- 平台差异不会被伪装成“统一 CLI 行为”。发现不到、认证异常、路径异常都能有结构化诊断。

最小证据：

- CLI 发现/版本结果
- 本地/远程启动 smoke
- Launch Template 清单
- 平台发现矩阵
- 回滚说明

能力兑现：

- 兑现 `docs/架构/04` 的“CLI 原生接入、按 adapter 可插拔扩展、不做语义抽象”的技术路线。
- 兑现 `docs/架构/07` 的 AI CLI 原生托管边界。
- 兑现 `docs/架构/06`、`17` 中 `cli-native` Session 与 Launch Template 语义。

架构回写：

- `docs/架构/04-技术选型与可插拔策略.md`
- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/07-终端工作台与 CLI 原生集成设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`

## 6. 检查点

- `CP08-1`：CLI Adapter 接口冻结。
- `CP08-2`：四类 CLI 发现、版本、认证状态链可用。
- `CP08-3`：Desktop 本地 CLI 启动链可用。
- `CP08-4`：远程 / 容器 / K8s CLI 启动链可用。
- `CP08-5`：`Windows / Ubuntu / macOS / Ubuntu Server` CLI 托管证据建立。

## 7. 串并行策略

- 必须串行：CLI Adapter 接口、Launch Template 模型、平台发现字段。
- 可并行：
  - `08-A` Codex / Claude Code
  - `08-B` Gemini / OpenCode
  - `08-C` discovery / diag / auth state
  - `08-D` template host / session integration
  - `08-E` verification
- `CLI adapter contract`、`Launch Template schema`、`diagnostic field` 只能单 owner 收口。

## 8. 风险与回滚

- 风险：为了兼容 CLI 差异而引入统一语义层，或为了省事忽略平台差异。
- 回滚：回收到“每 CLI 独立 adapter + 统一托管模型 + 平台显式诊断”的边界。

## 9. 完成定义

- AI CLI Native Host 主链成立。
- 四类 CLI 都已纳入统一 Session/Recovery/Diagnostics 体系。
- 平台支持声明以真实发现/启动/恢复证据为准，而非以 adapter 代码存在为准。

## 10. 下一步准入条件

- `09` 只能在本步的 CLI 托管、Session 语义与平台矩阵稳定后整合 AI CLI 工作流。
