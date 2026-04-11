# Step 04 - Desktop Host、本地 Daemon 与 Runtime 桥接重构

## 1. 目标与范围

目标：

- 打通桌面端的最小主链：`Tauri Host -> Local Session Daemon -> Runtime Bridge`。
- 建立桌面最小可运行闭环，为后续终端和 Session 主链提供落点。

非目标：

- 不在本步完成完整 Terminal 体验。
- 不在本步实现完整 Connector 或 Server Mode。

## 2. 架构对齐

- `docs/架构/02-架构标准与总体设计.md`
- `docs/架构/03-模块规划与边界.md`
- `docs/架构/10-性能、可靠性与可观测性设计.md`
- `docs/架构/16-API体系与契约设计.md`

## 3. 写入范围

创建或修改：

- `apps/desktop/`
- `src-tauri/`
- `packages/sdkwork-terminal-infrastructure/`
- `crates/sdkwork-terminal-session-runtime/`
- `crates/sdkwork-terminal-observability/`

## 4. 设计

- Tauri Host 只做窗口、系统能力、桥接引导。
- Local Session Daemon 单独持有 Session/Runtime 所有权。
- UI 进程通过本地桥接连接 daemon，不直接持有运行时真相。
- Host 必须显式处理 `Windows / Ubuntu / macOS` 的窗口、权限、桥接端点与本地运行目录差异，不能用单一桌面假设覆盖三平台。

## 5. 实施落地规划

- 建立 Host 启动流程：启动窗口 -> 确认 daemon -> 建立 bridge -> 就绪状态。
- 建立 daemon 生命周期：start / health / stop / reconnect。
- 建立最小健康与诊断接口。
- 打通桌面壳对 daemon 的连接检查与错误提示。
- 冻结 Windows Named Pipe、Ubuntu/macOS Unix Domain Socket 的桥接端点规范与错误诊断口径。

## 6. 测试计划

- Tauri 启动 smoke
- daemon 启停 smoke
- 桥接重连 smoke
- 崩溃后恢复 smoke
- `Windows / Ubuntu / macOS` 三平台 host bootstrap smoke

## 7. 结果验证

- 桌面端可稳定起壳并连到本地 daemon。
- daemon 断连、启动失败、桥接失败有明确状态与错误。

最小证据：

- Host/daemon/bridge smoke 结果 + 健康检查结果 + 关键目录清单 + 回滚说明

能力兑现：

- 兑现 `docs/架构/02` 的 `desktop -> host + local daemon` 共核起点。
- 兑现 `docs/架构/10` 的本地 bridge 健康、重连、恢复与最小观测要求。
- 兑现 `docs/架构/16` 的 Desktop Bridge IPC 与 Local Runtime Channel 分层。

架构回写：

- `docs/架构/02-架构标准与总体设计.md`
- `docs/架构/10-性能、可靠性与可观测性设计.md`
- `docs/架构/16-API体系与契约设计.md`

快速执行建议：

- 串行先完成 Host 启动链、daemon 启动链、bridge 握手链。
- 并行车道：
  - `04-A` Tauri Host
  - `04-B` local daemon lifecycle
  - `04-C` infrastructure bridge client + health UI
- 收口顺序：先 daemon health，再 host bootstrap，再 UI smoke。

## 8. 检查点

- `CP04-1`：Host / daemon 职责分离完成。
- `CP04-2`：本地 bridge 建立成功。
- `CP04-3`：健康检查与错误呈现可用。
- `CP04-4`：`Windows / Ubuntu / macOS` 桌面最小主链 smoke 通过。

## 9. 串并行策略

- 串行：Host 启动链、daemon 启动链、bridge 初始化链。
- 可并行：
  - observability 基础
  - 桥接 client 抽象
  - 诊断占位页

## 10. 风险与回滚

- 风险：把业务逻辑继续堆进 `src-tauri`。
- 回滚：将业务逻辑回收至 `packages/*` 或 `crates/*`，`src-tauri` 仅保留桥接。

## 11. 完成定义

- 桌面端最小运行时闭环成立。
- 目标等级：`L3`

## 12. 下一步准入条件

- `05` 可在稳定 Host/daemon 主链上接入 terminal-core 与 adapter。
