# 07-终端工作台与 CLI 原生集成设计

## 1. 目标

定义桌面工作台的信息架构、终端主舞台标准、AI CLI 原生集成边界，以及后续 `Step 08-09` 的工作台收口原则。核心要求是：首页始终保持 `顶部 tabs/custom header + 剩余区域 terminal stage`。

## 2. 当前事实

- `Step 05` 已建立最小终端主舞台：
  - `packages/sdkwork-terminal-core/` 提供终端状态模型
  - `packages/sdkwork-terminal-infrastructure/` 提供稳定 adapter 与 xterm driver
  - `packages/sdkwork-terminal-workbench/` 提供 terminal stage 模型与 pane
- `packages/sdkwork-terminal-shell/` 当前已按 `Windows Terminal` 主形态收口为：
  - 顶部 custom header + `tab strip`
  - 剩余区域 active terminal `tabpanel`
  - `Sessions / Resources / AI CLI / Settings / Diagnostics` 只能以下沉 drawer、overlay 或 command palette 入口存在，不能占据首页主舞台
- Desktop Shell 当前已可通过 `desktop_local_shell_exec` 发起本地 one-shot shell 执行，并把 `stdout / stderr / exitCode / workingDirectory / invokedProgram` 回填到当前 tab。
- 当前 AI CLI Native Host 仍停留在架构冻结态，真实落地在 `Step 08`。
- 当前工作台重点是“终端主舞台成立”，不是“AI CLI 功能已完成”。

## 3. 工作台信息架构

```text
App Shell
|- Custom Header
|  |- Shell Tabs
|  |- New Tab / Profile / Tab Actions
|  |- Window Controls
|- Terminal Stage
|  |- Active Terminal Session
|  |- Optional Split Pane
|- Overlay / Drawer Layer (closed by default)
   |- Command Palette
   |- Search / Find
   |- Sessions
   |- Resources
   |- AI CLI
   |- Settings
   |- Diagnostics
```

## 4. 设计原则

- `terminal-first`：主舞台永远优先展示 Session，而不是卡片式入口页。
- `session-first`：工作台围绕 Session 组织，标签页、窗格、抽屉都只是 Session 的视图。
- `keyboard-first`：命令面板、切换、布局管理必须优先服务键盘操作。
- `high-density`：对标专业终端，不走大卡片和过度留白路线。
- `drawer-not-homepage`：抽屉、面板、设置、诊断都只能是辅助层，不能演变为首页主布局。
- `ai-cli-as-session`：AI CLI 以原生命令行 Session 方式进入 terminal stage，不做独立首页工作台。

## 5. CLI 原生集成边界

### 5.1 支持对象

- `Codex`
- `Claude Code`
- `Gemini`
- `OpenCode`

### 5.2 平台职责

- 发现二进制
- 读取版本
- 检查认证状态
- 解析启动模板
- 托管工作目录、环境变量、目标执行位置
- 记录启动日志、退出码、诊断信息
- 提供 Session 级恢复、回放与审计入口
- 以 tab/pane 中的原生命令行 Session 呈现运行结果

### 5.3 明确非目标

- 不统一不同 CLI 的 Prompt 语义
- 不重写不同 CLI 的命令协议
- 不把 CLI 包装成另一个聊天产品

## 6. Launch Template 标准

每个 CLI Launch Template 至少包含：

- `cliKind`
- `displayName`
- `workdir`
- `args`
- `envAllowlist`
- `executionTarget`
- `profileRef`
- `recoveryPolicy`
- `sessionTags`

## 7. 当前实现与后续落点

### 7.1 已落地

- Terminal Stage 已通过稳定 adapter 与 workbench 解耦。
- Workbench 当前可操作输入、输出、Resize、Selection、Search、Scrollback。
- Shell 层已经消费稳定 bridge 描述，而不是直接依赖 xterm 内部对象。
- Desktop Shell 已改为 top tabs + active terminal stage 的终端优先布局，不再以 card grid 作为首页主舞台。
- Desktop Shell 已可把当前 tab 的命令经 Tauri IPC 交给 Rust 本地执行链，并回填结构化执行结果。

### 7.2 待落地

- 持久 PTY / ConPTY / interactive local tab session
- `Step 08`：CLI native host、launch template、CLI 诊断
- `Step 09`：在不破坏 terminal-first 首页的前提下，收口资源、设置、诊断、命令面板与辅助抽屉

## 8. 评估标准

| 项目 | 标准 | 当前结论 |
| --- | --- | --- |
| 终端主舞台 | 对标 Windows Terminal 的专业主舞台表达 | `L4` |
| 首页约束 | 首页始终保持 tabs/header + terminal stage，辅助能力默认收起 | `L4` |
| Workbench 与渲染解耦 | Workbench 只依赖 adapter，不依赖 xterm 内部 | `L4` |
| Desktop Local Shell | 当前 tab 可执行 one-shot 本地 shell 并回填结构化结果 | `L3` |
| AI CLI Native Host | CLI 原生托管、恢复、诊断、目标执行 | `L1`，待 `Step 08` |
