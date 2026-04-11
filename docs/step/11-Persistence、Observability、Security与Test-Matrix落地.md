# Step 11 - Persistence、Observability、Security 与 Test Matrix 落地

## 1. Step Card

| 项 | 内容 |
| --- | --- |
| 执行模式 | 波次并行 |
| 前置 | `06`、`07`、`10` |
| 主写入范围 | `crates/sdkwork-terminal-config/`、`crates/sdkwork-terminal-observability/`、`crates/sdkwork-terminal-control-plane/`、`tools/benchmarks/`、`tools/smoke/`、`tools/compat/`、CI/release 脚本 |
| 执行输入 | `docs/架构/09`、`10`、`11`、`12` |
| 本步非目标 | 不新增终端业务能力；不跳过平台证据直接发布 |
| 最小输出 | 配置/存储/观测/安全基线，P0/P1 测试矩阵与证据链 |

## 2. 设计

- Desktop 以 `SQLite + 系统凭证库 + 本地诊断包` 为基线。
- Server 以 `PostgreSQL + Redis + Object Storage + Audit Log + mTLS` 为基线。
- Trace 字段、错误语义、diagnostics 摘要在 Desktop/Server 之间共享。
- 测试矩阵必须按 `平台 x 架构 x Shell/TUI x Connector/CLI x 发布形态` 组织，而不是只按模块组织。

## 3. 实施落地规划

1. 完成配置 schema、迁移、Desktop/Server 配置投影链。
2. 完成本地持久化与服务端存储适配器。
3. 完成 tracing、metrics、logs、diagnostic bundle。
4. 完成凭证库、token、audit、secret redaction 安全基线。
5. 建立 `P0 / P1` 原生矩阵与自动化 smoke/compat/benchmark 入口。

## 4. 测试计划

- 配置迁移与兼容性测试
- SQLite / PostgreSQL / Redis / Object Storage 适配测试
- trace/log/metric/diagnostic bundle 测试
- 凭证库、权限、审计与脱敏测试
- `Windows / Ubuntu / macOS / Ubuntu Server` 的 `P0 / P1` 兼容矩阵测试
- shell/TUI/CJK/IME/connector/AI CLI 回归测试

## 5. 结果验证

- 关键状态可持久、可检索、可审计。
- 出问题时能够导出统一 diagnostics bundle 并追踪到 session/connector/host 维度。
- `P0 / P1` 目标矩阵具备自动化执行与结果归档能力。
- 任何平台支持声明都能追溯到本步产出的矩阵证据。

## 6. 检查点

- `CP11-1`：配置与存储链成立。
- `CP11-2`：观测链与 diagnostics bundle 成立。
- `CP11-3`：凭证、安全、审计基线成立。
- `CP11-4`：`P0` 平台矩阵自动化可执行。
- `CP11-5`：`P1` 扩展矩阵结果可追溯归档。

## 7. 串并行策略

- 必须串行：配置 schema、trace fields、audit schema、矩阵命名规则。
- 可并行：
  - `11-A` persistence
  - `11-B` observability
  - `11-C` security
  - `11-D` compat/benchmark/matrix tooling
  - `11-E` diagnostics bundle
- `trace fields`、`secret redaction`、`matrix 命名规则` 只能单 owner 收口。

## 8. 风险与回滚

- 风险：模块各自埋点、各自存状态、各自定义平台支持，形成多套真相。
- 回滚：统一退回共核配置模型、trace 字段、证据目录与矩阵定义。

## 9. 完成定义

- 系统进入“可持久、可观测、可审计、可验证”的状态。
- `P0` 自动化矩阵可作为 release 阻塞门禁，`P1` 矩阵可作为全平台完成门禁。
- Desktop/Server/Release 的证据链已经打通。

## 10. 下一步准入条件

- Step 12 只能在本步矩阵与安全基线成立后推进安装、部署、发布、升级与回滚。