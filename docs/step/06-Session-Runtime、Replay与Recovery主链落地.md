# Step 06 - Session Runtime、Replay 与 Recovery 主链落地

## 1. Step Card

| 项 | 内容 |
| --- | --- |
| 执行模式 | 波次并行 |
| 前置 | `03`、`04`、`05` |
| 主写入范围 | `packages/sdkwork-terminal-sessions/`、`packages/sdkwork-terminal-contracts/`、`crates/sdkwork-terminal-session-runtime/`、`crates/sdkwork-terminal-replay-store/`、`crates/sdkwork-terminal-control-plane/`、`crates/sdkwork-terminal-config/` |
| 执行输入 | `docs/架构/06`、`09`、`10` |
| 本步非目标 | 不完成所有远程 target；不完成完整 Server Mode；不把 replay read 误判为实时恢复 |
| 最小输出 | Session 一等实体、attach/detach/reattach、replay、recovery、持久化索引与平台恢复证据 |

## 2. 设计

- Session 生命周期由 `session-runtime` 统一持有。
- `Attach` 不转移 Session 所有权。
- `Replay` 与 `Reattach` 分离。
- `Recovery` 依赖 `launchIntent + persisted index + ack + cursor`。
- Desktop 与 Server 共享 Session 模型，但恢复实现可按宿主差异不同。

## 3. 实施落地规划

1. 实现 Session 状态机与 ownership 模型。
2. 建立 Session 索引、tag、lastAck、exit metadata、platform metadata。
3. 建立 Replay 片段模型与冷热分层。
4. 打通 `Attach / Detach / Reattach / Replay / Terminate`。
5. 打通 Desktop 的崩溃恢复与 UI 重建恢复。
6. 为 `Windows / Ubuntu / macOS` 建立最小恢复证据，为 `Ubuntu Server` 建立 node/session 恢复证据。

## 4. 测试计划

- Session 状态机单元测试
- `Attach / Detach / Reattach` 集成测试
- Replay 基础测试
- UI 关闭后 Session 持续存在 smoke
- Windows / Ubuntu / macOS Session 恢复 smoke
- Ubuntu Server session recovery smoke

## 5. 结果验证

- 宿主 UI 卸载不等于 Session 丢失；显式 `Close tab` 若被产品定义为结束任务，则仍属于 `Terminate`。
- 可重新附着到正在运行的 Session。
- 可查看历史回放。
- Recovery 证据明确区分 Desktop 与 Server，但共享同一 Session 语义。

最小证据：

- 状态机测试结果
- reattach/replay/recovery smoke
- 持久化索引清单
- 平台恢复矩阵
- 回滚说明

能力兑现：

- 兑现 `docs/架构/06` 的 Session 一等实体、Attach/Detach/Reattach/Replay/Recovery 语义。
- 兑现 `docs/架构/09`、`10` 的权威状态、恢复与可靠性要求。

架构回写：

- `docs/架构/06-终端会话、运行目标与协议设计.md`
- `docs/架构/09-数据、状态与配置治理设计.md`
- `docs/架构/10-性能、可靠性与可观测性设计.md`

## 6. 检查点

- `CP06-1`：Session 状态机成立。
- `CP06-2`：Attach/Detach/Reattach 可用。
- `CP06-3`：Replay 基础版可用。
- `CP06-4`：Session 真相与 UI 分离得到验证。
- `CP06-5`：`Windows / Ubuntu / macOS / Ubuntu Server` 恢复口径建立并有最小证据。

## 7. 串并行策略

- 必须串行：Session 状态机、ownership 模型、replay 片段结构、持久化索引模型。
- 可并行：
  - `06-A` session-runtime
  - `06-B` replay-store / gap recovery
  - `06-C` SQLite / server-side index
  - `06-D` Session Center 读链与验证
- `state machine`、`launchIntent`、`ack/cursor` 字段只能单 owner 收口。

## 8. 风险与回滚

- 风险：UI 缓存重新成为真相源，或 recovery 语义在 Desktop/Server 分叉。
- 回滚：所有状态读回统一从 `session-runtime` 或权威持久化索引获取。

## 9. 完成定义

- Session-first 主链正式成立。
- replay、reattach、recovery 的边界清晰且可测。
- 平台恢复证据已经建立，不再只停留在理论设计。

## 10. 下一步准入条件

- `07` 与 `08` 只能基于统一 Session 模型挂接运行目标和 AI CLI。

## 2026-04-10 Supplement - Desktop Attachment Ack Feedback

### Added Facts

- Desktop bridge now exposes `desktop_session_attachment_acknowledge`, so attachment ack is no longer trapped inside Rust-only `SessionRuntime`.
- `packages/sdkwork-terminal-shell` now persists `runtimeAttachmentId` on runtime-backed tabs and uses it after live event / replay catch-up application.
- The accepted desktop feedback loop is now:
  `session.output|warning|exit -> shell apply replay -> desktop_session_attachment_acknowledge -> sessionIndex.attachments.lastAckSequence / cursor`.

### New Checkpoint

- `CP06-3A`：Desktop local shell attachment ack must advance after replay/event consumption, so Session Center reads a converging `lastAckSequence / cursor` instead of a permanently stale startup attachment snapshot.

## 2026-04-10 Supplement - Desktop Attach/Detach/Reattach IPC

### Added Facts

- Desktop bridge now exposes `desktop_session_attach / detach / reattach`, and `@sdkwork/terminal-infrastructure` routes them as structured Session write operations.
- `packages/sdkwork-terminal-shell` now performs best-effort `detach` for still-live attachments during host teardown, instead of silently dropping the UI-side handle.
- `sdkwork-terminal-session-runtime` now keeps a no-attachment session in `Detached` even if background output continues to arrive, preventing detached-session state drift.

### New Checkpoint

- `CP06-2A`：desktop host must expose Session attach/detach/reattach write-chain entrypoints, and detached sessions must not drift back to `Running` solely because replay/output is still appended in the background.

## 2026-04-10 Supplement - Desktop Session Center Overlay

### Added Facts

- Desktop product now exposes a terminal-first `Session Center` overlay through shell header chrome instead of introducing a dashboard/home page.
- Successful desktop reattach now follows the concrete chain:
  `Session Center overlay -> desktop_session_reattach -> ShellApp open tab + bind runtime -> replay catch-up -> live subscription`.
- Current interactive reattach write chain is no longer limited to `target=local-shell`; Step 07 desktop product closure now exposes `local-shell / ssh / docker-exec / kubernetes-exec`, while `remote-runtime` stays read-only until its live host path lands.

### New Checkpoint

- `CP06-2B`：desktop user must have a product-visible overlay entry to inspect detached sessions and trigger real `local-shell` reattach without breaking the terminal-first shell surface.

## 2026-04-10 Supplement - Session Tags Truth Loop

### Added Facts

- `SessionDescriptor.tags` 现已从 Rust `SessionRuntime`、desktop snapshot、shared contracts/types 到 `Session Center / reattach intent` 端到端贯通。
- `modeTags` 与 `tags` 已显式分责：`modeTags` 只表达运行模式，`tags` 承载 `profile:*`、`resource:*` 等会话真相标签。
- `Session Center` 现在优先消费真实 `session.tags`；仅对旧快照缺失 `tags` 的兼容场景回退到 `modeTags`，避免历史测试夹具或旧索引直接击穿当前读链。

### New Checkpoint

- `CP06-2C`：desktop `session_index / attach / detach / reattach` 返回的 session descriptor 必须保留真实 `tags`，且 `Session Center / reattach intent` 必须能恢复 `profile:powershell`、`resource:ssh`、`resource:docker-exec` 等标签，不得统一塌缩成 `cli-native`。

## 2026-04-10 Supplement - Desktop SQLite Recovery Bootstrap

### Added Facts

- `sdkwork-terminal-control-plane` 已新增 `create_desktop_session_runtime(...)` 与 `DESKTOP_SESSION_RUNTIME_DB_FILE_NAME`，统一负责桌面端 `SessionRuntime` 的 SQLite 路径约定、目录创建与 `SessionRuntime::with_sqlite` 初始化。
- `src-tauri` 现已复用共享 Rust 控制面 bootstrap；桌面 host 只解析 `app_local_data_dir()` 并桥接到 `session-runtime.sqlite3`，不再保留私有平行初始化逻辑。
- `cargo test -p sdkwork-terminal-control-plane` 已补齐桌面端恢复最小证据：进程重建后可恢复 persisted session index 与 replay transcript。
- 当前 Windows 开发主机上的 `src-tauri` Rust 单测二进制依旧会命中 `STATUS_ENTRYPOINT_NOT_FOUND`；本轮因此将桌面恢复验证收口为“共享 Rust 控制面自动化测试 + `src-tauri cargo check` + desktop TypeScript bridge tests”。

### New Checkpoint

- `CP06-3B`：desktop Session SQLite bootstrap 必须位于共享 Rust 控制面，桌面 host 重启后能够恢复 `session index + replay`；若 `src-tauri` 原位单测受宿主加载限制阻塞，必须显式记录限制，并用共享 Rust crate 自动化测试证明恢复主链成立。

## 2026-04-10 Supplement - CP06-5 Recovery Smoke Matrix

### Added Facts

- `tools/smoke/session-recovery-probe.mjs` 与 `session-recovery-probe.ps1` 现已作为 Step 06 `CP06-5` 的仓库级 smoke 入口。
- probe 已冻结 `windows-desktop / ubuntu-desktop / macos-desktop / ubuntu-server` 四类恢复目标，并统一输出：
  - `--print-plan`
  - `--report-template`
  - `--review-template`
- probe 的最小检查项已固定为：
  - `persisted-index`
  - `replay-recovery`
  - `reattach-or-recover`
  - `attachment-ack-truth`
  - `platform-diagnostics`
- `tools/smoke/README.md` 已同步写回这些入口，避免 Step 06 的跨平台恢复证据继续停留在零散叙述。

### New Checkpoint

- `CP06-5A`：Step 06 在跨平台恢复证据未完全自动化前，必须先提供仓库内可重复执行的 recovery smoke matrix、JSON report template 与 markdown review template；没有这些模板时，不得声称 `Windows / Ubuntu / macOS / Ubuntu Server` 已建立统一恢复验收口径。

## 2026-04-10 Supplement - CP06-5 Runtime-Node Server Recovery Bootstrap

### Added Facts

- `crates/sdkwork-terminal-runtime-node` 已新增 `create_runtime_node_session_runtime(...)`、`RuntimeNodeBootstrapConfig` 与 `RuntimeNodeRecoveryDiagnostics`，用于冻结 Step 06 的 server-side recovery bootstrap。
- runtime-node bootstrap 现已显式记录 `hostMode=server`、`platformFamily=ubuntu-server` 默认值、归一化 `cpuArch`、`runtimeLocation` 与实际 `storageSurface`。
- `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture` 已补齐 `Ubuntu Server` 最小恢复证据：重建 runtime-node 后仍可恢复 persisted `session index / replay / lastAckSequence`。
- `tools/smoke/session-recovery-probe.mjs` 现已把 runtime-node cargo test 纳入 automated evidence，并将 `ubuntu-server` 存储面冻结为 `session-runtime.sqlite3 under runtime-node persistence root`。

### New Checkpoint

- `CP06-5B`：`Ubuntu Server` 恢复口径必须具备仓库内 `runtime-node` bootstrap/test 证据，明确证明 `hostMode / platformFamily / cpuArch / runtimeLocation / storageSurface` 与 persisted `session index / replay / ack` 在 server-side runtime rebuild 后仍然成立；桌面 SQLite 证据不得替代该检查点。
