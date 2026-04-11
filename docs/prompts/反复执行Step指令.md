# 反复执行 Step 指令

## 用法

- 反复输入同一段提示词。
- 每轮都必须基于仓库当前真实状态继续，不允许重置思路。
- 禁止空转；必须直接落地代码、测试、文档与 release 记录。

## 可重复输入提示词

```md
你是 `sdkwork-terminal` 的持续实施总控 agent。基于仓库真实状态，循环执行 `docs/step/00-13`，直到交付可商业化发布的跨平台 Terminal 应用。禁止只给计划，必须直接实现、验证、回写文档。

执行基线：
1. 先对齐 `README.md`、`docs/架构/*`、`docs/step/*`、`docs/release/*`。
2. 若代码与文档冲突，先修正文档，再继续实现。
3. 严守边界：`terminal-first`、`session-first`、AI 仅以原生 CLI 托管、`docker/k8s` 仅是 `server` 包装。
4. 不要无故改 `package.json`、`tauri.conf.json`、版本号；只有真实能力增量且 release 证据齐全时才更新 release 文档。

每轮固定闭环：
1. 审计：判断当前 `Wave / Step / 阻塞点 / 风险 / 回退点`，核对代码、测试、脚本、`git status`、`docs/release`。
2. 决策：只做当前最阻塞主链；用户可感知阻断优先级最高：
   - `terminal 无法输入 / 无法启动 / tabs-header-terminal 形态错误`
   - `Step 05-06`：terminal / PTY / replay / recovery
   - `Step 07-08`：connector / AI CLI host
   - `Step 09-12`：辅助层、server、发布、交付
3. 根因排查：若出现阻断，必须沿真实热路径排查，禁止猜修：
   - `xterm onData -> desktop bridge -> Tauri IPC -> Rust PTY writer -> shell echo -> runtime event/replay -> xterm writeRaw`
4. 批量实现：先完成当前 Step 主链代码，再做该 Step 检查点；不要边做边切下一 Step。
5. 批量验证：按“最小证据 -> 检查点 -> 完成定义”验证；失败就留在当前 Step 修复。
6. 文档回写：同步更新受影响的 `docs/架构/*`、`docs/step/*`、`docs/prompts/*`、`docs/release/*`。
7. 发布记录：只记录真实事实；若有真实能力增量，更新 `docs/release/CHANGELOG.md` 与当日 release note。
8. 自回归：检查是否破坏以下硬约束：
   - 首页必须仍是 `顶部 tabs/custom header + 剩余区域 terminal stage`
   - tabs 少时 `+ / dropdown` 跟随 tabs；空间不足时才 dock 右侧
   - Desktop 必须是真 PTY terminal，不得退回伪输入框
   - 首屏挂载后 terminal 必须可聚焦、可输入
   - runtime `binding` 期间的原始按键不能丢失
   - terminal stage 必须 full-bleed，无无意义 padding / 白边
   - search / copy / paste / resize / scrollback / tab 切换不能回退
9. 继续前进：只有当前 Step 达到完成定义，才允许进入下一 Step；否则继续当前 Step。

执行策略：
- 串行优先：`00 01 02 03 04 13`
- 波次并行思维、单线程落地：`05-06`、`07-08`、`09-11`
- 严禁并行改这些共享核心：`contracts / protocol / events / errors / session model / release-manifest / signing policy`

每轮输出必须包含：
- 当前 `Wave / Step`
- 本轮已完成事项与改动文件
- 验证结果
- 文档回写结果
- release / changelog 更新结果
- 剩余差距
- 下一轮最优动作

只有全部满足才允许停止：
- `docs/step/00-13` 全部达到完成定义
- `docs/step/93`、`95`、`97` 全部通过
- `docs/release` 完成日期与版本管理
- `desktop / server / docker / k8s` 都具备可构建、可验证、可升级、可回滚证据
- 产品、功能、性能、交互、发布达到商业化交付标准
否则继续下一轮。
```

## 2026-04-10 补充硬约束

- Desktop shell bootstrap failure 只允许自动重试 `1` 次，禁止无限重试或假恢复。
- `binding / retrying` 期间的所有 xterm 原始输入都必须进入 `runtimePendingInput`，`running` 后再顺序 flush 到真实 PTY。
- `retrying` 必须是显式 terminal 状态，不得退回假 prompt、假输入框或业务页占位。
- 自动重试耗尽后必须在 terminal overlay 明确提示 exhausted，并提供同 tab `Restart shell`。
- 对 `failed` 启动失败 tab 执行 `Restart shell` 时，若存在 queued input，不得丢失。
- tab 菜单 `Copy` 必须优先走当前 viewport selection handler；只有 viewport 未挂载时，才允许回退到 shell snapshot。
- `Ctrl/Cmd + Shift + A` 必须真实执行 viewport `selectAll()`；禁止实现成只恢复 focus 的空动作。
- terminal viewport 菜单中的 `Select all` 必须与快捷键共享同一条 `selectAll()` 语义。
- `Ctrl+Insert / Shift+Insert` 必须与 `Ctrl/Cmd + Shift + C/V` 共享同一条 terminal clipboard 语义。
- `runtimeContentTruncated` 只能是元数据；禁止把截断提示文本直接注入 `runtimeTerminalContent` 或其他 raw VT 输出流。
- clipboard paste 必须优先走 xterm driver 原生 `paste(...)`，禁止把剪贴板文本直接绕过 terminal 注入 `onViewportInput(...)`。
## 2026-04-10 Supplement - Binary Input Guardrails

- `xterm.onBinary` is part of the same desktop terminal hot path; it must not be dropped, downgraded, or silently coerced through `writeSessionInput(string)`.
- Any non-UTF-8 xterm binary payload must go through a bytes-safe path:
  `onBinary -> writeSessionInputBytes -> Tauri IPC -> Rust write_input_bytes -> PTY`.
- `binding / retrying` pending input must preserve mixed `text / binary / text` order; a flat string buffer is not sufficient.

## 2026-04-10 Supplement - OSC Title Guardrails

- `OSC 0 / 2` title updates are part of the real terminal behavior set; do not replace them with fake React-only title logic.
- The only accepted path is:
  `PTY output -> runtime replay -> xterm writeRaw -> xterm onTitleChange -> tab title update`.
- Ignore blank title payloads, and keep launch-title fallback semantics on manual restart.

## 2026-04-10 Supplement - Terminal Fidelity Smoke Guardrails

- For remaining Step 05 `TUI / CJK / IME / OSC / alternate screen / mouse-reporting` gaps, prefer repository smoke harnesses over narrative claims.
- If a behavior cannot yet be fully automated, first add a repeatable smoke entrypoint under `tools/smoke/`, then add `report-template` and `review-template` outputs, and update `docs/review` with exact commands and remaining manual assertions.

## 2026-04-10 Supplement - Desktop Session Detach Guardrails

- `desktop_session_attach / detach / reattach` are part of the Step 06 desktop truth loop; do not leave them trapped in Rust-only `SessionRuntime`.
- Host teardown must best-effort `detach` still-live attachments; do not silently drop the UI handle and leave `sessionIndex.attachments` stale.
- A detached session receiving background output must remain `Detached` until a new attachment is truly created; replay/output append is not a substitute for reattach.

## 2026-04-10 Supplement - Session Center Product Guardrails

- Session Center must enter as a terminal-first `overlay / drawer / palette` from shell chrome; do not reintroduce dashboard/home surfaces.
- Current desktop interactive `Reattach` must only be exposed for sessions that already have a real desktop live path: `local-shell / ssh / docker-exec / kubernetes-exec`.
- `remote-runtime` may stay visible in Session Center truth/read-model data, but must not present fake interactive reattach before its live attach/input/stream path exists.

## 2026-04-10 Supplement - Connector Smoke Guardrails

- `tools/smoke/connector-interactive-probe.mjs` is the repository-owned Step 07 smoke entry for `ssh / docker-exec / kubernetes-exec` live terminal, Session Center reattach, and restart/recover evidence.
- Before any Step 07 field smoke wave, run `node tools/smoke/connector-interactive-probe.mjs --print-preflight --platform <platform>` and treat blocked targets as environment blockers, not as fake product regressions.
- Do not claim Step 07 connector closure from Docker/Kubernetes launch-only notes; archive report/review results per connector target.
- Prefer `node tools/smoke/connector-interactive-probe.mjs --print-execution-plan --platform <platform>` immediately after preflight so executable entries, skipped entries, and current-host blockers are explicit before any field assignment.
- Prefer `node tools/smoke/connector-interactive-probe.mjs --print-batch-plan` before real-machine evidence collection so platform-target smoke jobs run in parallel while Step/release closeout stays serial.
- Prefer `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform <platform> --output-dir <dir>` before field execution so report/review skeletons are generated in batches instead of hand-written.
- Prefer `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform <platform> --output-dir <dir> --ready-only` when the current host is partially blocked and only ready targets should enter the active field-smoke wave.

## 2026-04-10 Supplement - Session Tags Truth Guardrails

- `SessionDescriptor.tags` is the authority for `profile:*` / `resource:*` / session truth metadata; do not collapse it into `modeTags`.
- `modeTags` only describes runtime mode such as `cli-native`; `Session Center`、`reattach intent`、`desktop bridge projection` 必须优先消费真实 `tags`。
- 旧快照缺失 `tags` 时只允许读侧兼容回退到 `modeTags`，不得反向写回 runtime，也不得以之替代新的显式 `tags` 写链。

## 2026-04-10 Supplement - Desktop Rust Host Test Guardrails

- If the `src-tauri` Rust unit-test binary on Windows fails with `STATUS_ENTRYPOINT_NOT_FOUND`, treat it as a host-loader blocker, not as automatic proof that the current Step logic is wrong or green.
- In that case, move desktop truth-loop logic down into a shared pure Rust crate first, preferably `sdkwork-terminal-control-plane`, verify behavior there with `cargo test`, and keep `src-tauri` as a thin bridge verified by `cargo check`.
- Do not report `cargo test --no-run` or a crashing `src-tauri` test harness as behavior evidence; the limitation must be written back into `docs/review` and `docs/release`.

## 2026-04-10 Supplement - Recovery Matrix Guardrails

- Before claiming Step 06 `CP06-5` is closed, first update or consume `tools/smoke/session-recovery-probe.mjs`.
- Platform recovery support must be backed by repository-owned `--report-template` and `--review-template` artifacts for `windows-desktop / ubuntu-desktop / macos-desktop / ubuntu-server`.
- Do not replace the recovery matrix with narrative claims or scattered shell transcripts.

## 2026-04-10 Supplement - Runtime-Node Recovery Guardrails

- Before claiming `ubuntu-server` recovery is closed, first ensure `crates/sdkwork-terminal-runtime-node` owns a real `SessionRuntime` bootstrap and recovery diagnostics snapshot; desktop-only SQLite proof is insufficient.
- The accepted Step 06 server truth loop is:
  `runtime-node bootstrap -> session-runtime.sqlite3 -> persisted session index/replay/ack recovery -> runtime-node diagnostics`.
- `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture` is mandatory evidence for this loop; do not defer it to Step 10 broker/runtime-node orchestration work.

## 2026-04-10 Supplement - Remote Runtime Web Bridge Guardrails

- Before claiming any `remote-runtime` progress, first keep it on a dedicated `remote-api` request path; do not route it through `createConnectorSessionLaunchRequest(...)`, `desktop_connector_session_create`, or any `system-cli` launch-plan fallback.
- The accepted Step 07 remote-runtime foundation loop is:
  `resource target -> createRemoteRuntimeSessionCreateRequest -> createWebRuntimeBridgeClient -> publicApi /sessions -> publicApi /replays -> runtimeStream /attach`.
- Finish this foundation slice before wiring `apps/web -> ShellApp`; do not skip directly from read-models to fake live terminal UI.
- `tests/resource-center.test.ts` and `tests/web-runtime-bridge.test.ts` are mandatory evidence for this slice before any further remote-runtime UI or server-host claims.
## 2026-04-10 Supplement - Remote Runtime Web Shell Binding Guardrails

- After the foundation slice lands, the next accepted loop is:
  `apps/web env -> createWebRuntimeBridgeClient -> ShellApp(webRuntimeClient, webRuntimeTarget) -> tab.runtimeBootstrap(remote-runtime) -> createRemoteRuntimeSession -> replay/input/resize/terminate`.
- If `webRuntimeTarget` is configured, the first web tab and all new web tabs must enter a runtime-backed terminal stage; do not keep the product on the fake prompt path.
- If runtime target configuration is absent, prompt fallback is allowed, but it must remain an explicit configuration fallback instead of being described as real `remote-runtime`.
- This slice does not close `CP07-5`; `runtime-node host attach/input/stream/recovery` and reviewed recovery evidence are still mandatory before claiming Step 07 closure.

## 2026-04-10 Supplement - Runtime-Node Host Core Guardrails

- After the web shell binding slice, the next accepted loop is:
  `RemoteRuntimeSessionCreateRequest -> RuntimeNodeHost.create_remote_runtime_session -> SessionRuntime + PTY -> replay/input/input-bytes/resize/terminate -> output/warning/exit -> sqlite recovery`.
- Keep `RuntimeNodeHost` as a pure Rust shared host; do not skip straight to ad-hoc HTTP handlers that duplicate session truth or embed broker logic.
- `crates/sdkwork-terminal-pty-runtime` terminate semantics are now part of the same truth loop; do not regress them back to sessions stuck in `Stopping` without `Exit`.
- This slice still does not close `CP07-5`; the remaining accepted loop is:
  `publicApi /sessions + /replays + runtimeStream /attach thin wrapper -> web smoke -> reviewed recovery evidence`.
