# Step 09 - Workbench、Session Center、Resources、Settings 与 Diagnostics 落地

## 1. 目标与范围

目标：

- 完成桌面工作台主体验。
- 落地 `Workbench / Sessions / Resources / Settings / Diagnostics` 五大 Feature 包。
- 保持首页始终为 `顶部 tabs/custom header + terminal stage`，辅助域不得演变为 dashboard。

非目标：

- 不在本步落地完整服务端治理。

## 2. 架构对齐

- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/07-终端工作台与 CLI 原生集成设计.md`
- `docs/架构/08-渲染、兼容性与终端体验设计.md`
- `docs/架构/15-桌面分包集成、组件化与验收基线.md`

## 3. 写入范围

创建或修改：

- `packages/sdkwork-terminal-workbench/`
- `packages/sdkwork-terminal-sessions/`
- `packages/sdkwork-terminal-resources/`
- `packages/sdkwork-terminal-settings/`
- `packages/sdkwork-terminal-diagnostics/`
- `packages/sdkwork-terminal-shell/`
- `packages/sdkwork-terminal-ui/`

## 4. 设计

- `shell` 负责全局布局、导航与命令面板。
- Feature 包各自负责本域页面、服务与状态。
- Diagnostics 独立于业务 Feature，避免问题排查依赖业务页面。
- `Sessions / Resources / AI CLI / Settings / Diagnostics` 默认以 drawer、overlay、palette 或 modal 方式接入，不能侵占首页主舞台。
- 多窗格仅指 terminal stage 内的 pane/split，不指首页多卡片或多业务面板并列。

## 5. 实施落地规划

- 建立 custom header、tabs、pane/split 与 terminal stage 主布局。
- 建立 Session Center 与 History / Replay 入口。
- 建立 Resource Center 与目标管理。
- 建立 Settings：Profile、Theme、Keybinding、终端偏好。
- 建立 Diagnostics：日志、Trace 摘要、诊断包导出。
- 建立 command palette、search overlay 与辅助 drawer 的按需唤起路径，默认保持收起。

## 6. 测试计划

- UI 组件与路由测试
- Feature 服务测试
- 命令面板与快捷键 smoke
- 多窗格、多标签、drawer/overlay 唤起与收起 smoke
- 首页无 dashboard 回归 smoke

## 7. 结果验证

- Workbench 具备专业 terminal 工作台形态，而不是 dashboard。
- 用户能从同一 terminal 工作台进入 Session、Resources、CLI、Settings、Diagnostics，且默认主舞台不被替换。

最小证据：

- 路由/交互测试结果 + 多标签/多窗格/命令面板/overlay smoke + 首页无 dashboard 回归证据 + 目录清单 + 回滚说明

能力兑现：

- 兑现 `docs/架构/05`、`07` 的工作台信息架构和核心业务流程。
- 兑现 `docs/架构/08` 的终端体验、键盘流与导航一致性要求。
- 兑现 `docs/架构/15` 的 Feature 分包可复用与不穿透要求。

架构回写：

- `docs/架构/05-功能架构与核心业务流程.md`
- `docs/架构/07-终端工作台与 CLI 原生集成设计.md`
- `docs/架构/08-渲染、兼容性与终端体验设计.md`
- `docs/架构/15-桌面分包集成、组件化与验收基线.md`

快速执行建议：

- 串行先完成 Shell 主布局、custom header、terminal stage、主路由、命令面板。
- 共享契约不可并行改动项：Shell 主布局、首页形态约束、全局命令体系、导航模型、UI token。
- 并行车道：
  - `09-A` Session Center
  - `09-B` Resources
  - `09-C` Settings
  - `09-D` Diagnostics
  - `09-E` UI 基础组件 / token
- 收口顺序：先 Shell 首页主链，再各 feature 并行，再统一键盘流、overlay 行为与导航 smoke。

## 8. 检查点

- `CP09-1`：Shell 布局主链成立。
- `CP09-2`：Session Center 可用。
- `CP09-3`：Resources / Settings / Diagnostics 可用。
- `CP09-4`：多标签/多窗格/命令面板 smoke 通过。
- `CP09-5`：首页仍保持 tabs/header + terminal stage，无 dashboard 回归。

## 9. 串并行策略

- 串行：Shell 布局、custom header、主路由、全局命令体系、首页形态约束。
- 可并行：
  - Session Center
  - Resource Center
  - Settings
  - Diagnostics
  - UI 基础组件
- 多子 agent 推荐拆分：`shell / feature / ui / verification`

## 10. 风险与回滚

- 风险：Feature 之间互相穿透、共享巨型 store。
- 风险：辅助面板膨胀为首页主舞台，重新把 terminal 应用做成 dashboard。
- 回滚：以包根导出和 domain store 拆分为边界重构。

## 11. 完成定义

- 桌面工作台主体验成立。
- 多标签 / 多窗格 / 命令面板 / drawer-overlay 已贯通。
- Session / Resources / CLI / Settings / Diagnostics 五域可从单工作台进入，且不替换 terminal 主舞台。
- 关键键盘流与导航 smoke 通过。
- 目标等级：`L4`

## 12. 下一步准入条件

- `10` 可在稳定桌面工作台基础上扩展 Server Mode。
