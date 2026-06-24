# Step 03 - API、IPC 与 Runtime Stream 契约冻结

## 1. Step Card

| 项 | 内容 |
| --- | --- |
| 执行模式 | 强串行 |
| 前置 | `00`、`02` |
| 主写入范围 | `packages/sdkwork-terminal-contracts/`、`packages/sdkwork-terminal-types/`、`packages/sdkwork-terminal-infrastructure/`、`crates/sdkwork-terminal-protocol/`、`crates/sdkwork-terminal-config/` |
| 执行输入 | `docs/架构/06`、`16`、`17` |
| 本步非目标 | 不实现业务处理逻辑；不在本步承诺热路径已完整打通 |
| 最小输出 | Desktop IPC、本地 Runtime Channel、Public/Manage/Internal API、Runtime Stream 的统一契约与平台边界 |

## 2. 设计

- IPC 只承载粗粒度宿主能力。
- 本地 Runtime Channel 承载终端热路径。
- `Public / Manage / Internal / Runtime Stream` 各自有唯一职责。
- 契约必须显式写出 Desktop 与 Server 的共享层与差异层。
- 平台支持声明必须包含 `platformFamily`、`cpuArch`、`targetType` 或等价字段，不允许模糊描述。

## 3. 实施落地规划

1. 冻结路径前缀：
   - `/terminal/api/v1/*`
   - `/terminal/manage/v1/*`
   - `/terminal/internal/v1/*`
   - `/terminal/stream/v1/*`
2. 冻结 Desktop IPC 命令与 Local Runtime Namespace。
3. 冻结 Windows `Named Pipe`、Ubuntu/macOS `Unix Domain Socket` 的本地热路径契约语义。
4. 定义错误体字段：`code / message / traceId / retryable / details`
5. 定义 Runtime Stream 事件族：
   - `session.state`
   - `session.output`
   - `session.marker`
   - `session.warning`
   - `session.exit`
   - `session.replay.ready`
6. 建立 TS/Rust 双侧 schema、快照与一致性测试。

## 4. 测试计划

- 契约快照测试
- TS/Rust DTO 一致性测试
- API path 与错误体结构测试
- Runtime Stream 事件族 schema 测试
- Desktop IPC / Local Runtime Namespace 稳定性测试

## 5. 结果验证

- 后续 Step 可以只依赖稳定 contracts/protocol 开发。
- Desktop、Server、daemon、Web Console 不再重复定义协议。
- 热路径与控制面入口已经在契约层分离，后续无法再偷懒混写。

最小证据：

- 契约快照结果
- TS/Rust 一致性结果
- schema 清单
- Desktop/Server 入口矩阵
- 回滚说明

能力兑现：

- 兑现 `docs/架构/06` 的 Session/消息/事件契约。
- 兑现 `docs/架构/16`、`17` 的 API / IPC / Runtime Stream 主入口标准。

架构回写：

- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/16-API体系与契约设计.md`
- `docs/架构/17-能力到API与IPC调用矩阵.md`

## 6. 检查点

- `CP03-1`：Desktop IPC、本地 Runtime、Server API、Runtime Stream 分层冻结。
- `CP03-2`：错误体、事件族、命名空间冻结。
- `CP03-3`：Windows `Named Pipe` / Ubuntu-macOS `Unix Domain Socket` 契约语义冻结。
- `CP03-4`：TS/Rust 契约一致性通过。

## 7. 串并行策略

- 必须串行：协议面、命名空间、错误体、事件族、平台字段。
- 可并行：
  - `03-A` TS contracts / clients
  - `03-B` Rust protocol / schema
  - `03-C` stream 事件与快照测试
- `path prefix`、`runtime namespace`、`platformFamily / cpuArch` 字段只能单 owner 收口。

## 8. 风险与回滚

- 风险：后续实现绕开 contracts 直接拼协议，或把热路径重新塞进粗粒度 IPC。
- 回滚：以 contracts/protocol 为唯一源，删除散落重复定义。

## 9. 完成定义

- 所有实现入口已具备统一契约基线。
- 平台差异与共享层边界已经在协议层显式化。
- 后续 Step 不能再以“实现时再看平台”作为理由拖延。

## 10. 下一步准入条件

- `04` 只能在本步冻结的契约基础上打通桌面最小运行时闭环。
