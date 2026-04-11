# Step 05 - Terminal Core 与渲染交互基线落地

## 1. Step Card

| 项 | 内容 |
| --- | --- |
| 波次 | `Wave B` 主链 |
| 前置 | `02 / 03 / 04` |
| 主写范围 | `packages/sdkwork-terminal-shell`、`packages/sdkwork-terminal-infrastructure`、`crates/sdkwork-terminal-pty-runtime`、`src-tauri` |
| 目标 | 做成真实 terminal 的最小专业闭环，而不是伪输入框 |
| 非目标 | 不在本步完成全部 remote connector / server mode / 商业发行 |

## 2. 本步完成定义

- 首页稳定保持 `顶部 tabs/custom header + 剩余区域 terminal stage`。
- Desktop tab 绑定真实 PTY session，输入不再依赖 HTML input。
- Rust PTY 层具备 create / write / resize / terminate / event pump。
- xterm 层具备 focus、search、selection、copy/paste、scrollbar 收口。
- 发生“无法输入/无法启动/切 tab 失真”时，先修阻断主链，再做视觉 polish。

## 3. 当前已落地事实

### 3.1 Rust / 宿主

- `sdkwork-terminal-pty-runtime` 已落地 `LocalShellSessionRuntime`。
- `src-tauri` 已暴露 `desktop_local_shell_session_create / input / resize / terminate`。
- `cargo test -p sdkwork-terminal-pty-runtime --test local_shell_session_runtime` 已通过，说明 Rust 交互式 shell session 主链基本可用。

### 3.2 前端 / 终端壳层

- 页面已回归 terminal-first，只保留 tabs、自定义 header、window controls 与 terminal stage。
- xterm driver 已补 `search()`、`getSelection()`、`measureViewport()`。
- terminal stage 已补 `Ctrl/Cmd + Shift + F/C/V`，并支持 terminal search overlay。
- xterm viewport 滚动条已收口为专业终端风格。
- 本轮已修复首屏挂载后的 focus 风险：attach 完成后主动聚焦 active terminal，降低“terminal 无法输入”的概率。
- 本轮继续修复 runtime `binding` 期间按键丢失问题：Desktop raw input 先缓存到 tab attachment，待 session `running` 后再顺序冲刷到 Rust PTY。
- 本轮继续把 Desktop 启动空窗期产品化：当 runtime 仍在 `binding` 或存在待冲刷输入时，terminal stage 以原生 overlay 呈现 `Starting shell / Input queued`，不再让用户看到无反馈黑屏。
- 本轮继续把 Desktop 失败后恢复链路产品化：`failed / exited` overlay 新增 `Restart shell`，支持同 tab 原位清理状态并重新拉起真实 PTY session。
- 本轮补齐 Desktop 默认 profile 的平台兜底：`navigator` 不可用时改由宿主平台判断，Windows 主机不再误回落为 `bash`。
- 本轮补齐 xterm Unicode provider 的显式激活：前端改为直接锁定 `Unicode 11`，避免类型漂移导致 `pnpm typecheck` 失败，并为后续 CJK/宽字符验证保留一致基线。

## 4. 本步关键设计

### 4.1 真终端输入链

```text
xterm onData
  -> writeSessionInput(...)
  -> Tauri IPC
  -> Rust PTY writer
  -> shell echo / output event
  -> replay/event bridge
  -> xterm writeRaw
```

约束：

- React 不持有输入真相。
- Desktop 不得退回假 prompt。
- 焦点是输入链的一部分，不是纯 UI 细节。

### 4.2 状态边界

- `sdkwork-terminal-shell`：tabs、header、panel、overlay、active viewport。
- `sdkwork-terminal-infrastructure`：xterm driver 与 desktop bridge client。
- `sdkwork-terminal-pty-runtime`：writer / resize / child lifecycle / output pump。
- `sdkwork-terminal-session-runtime`：cursor、replay、恢复证据。

## 5. 检查点

- `CP05-1`：terminal-first 页面形态无回退。
- `CP05-2`：Desktop tab 能启动真实本地 shell session。
- `CP05-3`：xterm 获取焦点后可输入、复制、粘贴、搜索、resize。
- `CP05-3A`：新 tab 启动期早输入的按键不能直接丢失。
- `CP05-3B`：新 tab 启动空窗期必须有终端原生状态反馈，不能表现为无反馈黑屏。
- `CP05-3C`：`failed / exited` tab 必须可原位恢复，不能只能提示不能恢复。
- `CP05-4`：tabs/header/window controls 与滚动条达到产品化基线。
- `CP05-5`：Rust PTY 与前端桥接有测试证据，不只靠人工猜测。

## 6. 并串行策略

### 必须串行

- terminal input hot path
- session runtime / cursor / replay 契约
- xterm driver 能力边界
- tabs/header 布局规则

### 可并行

- source-level regression test
- Rust PTY 交互测试
- typecheck / build / cargo check
- 文档回写与 release note

## 7. 当前差距

- `Windows / Ubuntu / macOS` 人工 smoke 证据未闭环。
- TUI、IME、CJK、bracketed paste、OSC 仍未完成矩阵验证。
- Desktop 自动恢复策略与跨平台恢复证据仍需继续闭环。

## 8. 下一步建议

## 2026-04-10 本轮收口

### 已补齐

- Desktop shell bootstrap failure 新增自动重试一次，避免瞬时启动失败直接把 tab 留在死状态。
- shell runtime 新增显式 `retrying` 语义，overlay 文案可区分 `Starting shell / Retrying shell / Shell failed / Shell exited`。
- `binding / retrying` 期间继续输入时，原始输入统一进入 `runtimePendingInput`，不因尚未建立 `sessionId` 或中途重试而丢失。
- `failed` tab 的 `Restart shell` 改为对启动失败场景保留 queued input，保证人工恢复后仍可把之前输入刷回真实 PTY。

### 新增检查点

- `CP05-3D`：Desktop bootstrap failure 只能自动重试一次，不能无限重试。
- `CP05-3E`：`binding / retrying` 期间继续输入不得丢失，session `running` 后必须顺序 flush。
- `CP05-3F`：自动重试耗尽后 overlay 必须提示 exhausted，并允许同 tab `Restart shell` 保留 queued input。

### 2026-04-10 粘贴链路补充

- `CP05-3G`：clipboard paste 必须优先走 xterm 原生 `paste(...)`，不能直接把文本喂给 `onViewportInput(...)`。
- `CP05-3H`：tab 菜单、terminal 菜单、快捷键三条粘贴入口必须统一语义。
- `CP05-3I`：粘贴链路修改后不得破坏现有 raw input、queued input、focus、search、copy 能力。
- `CP05-3J`：tab 菜单 `Copy` 必须优先读取当前 xterm viewport 的实时 selection，不得默认读取陈旧 `copiedText` 快照。
- `CP05-3K`：tab 菜单、terminal viewport 菜单、快捷键三条复制入口必须共享同一条 viewport-first 语义；仅在 viewport 未挂载时才允许回退到 snapshot。
- `CP05-3L`：`Ctrl/Cmd + Shift + A` 必须真实执行 terminal viewport `selectAll()`，不能退化成仅重新 focus。
- `CP05-3M`：terminal viewport 右键菜单必须提供 `Select all`，并与快捷键共享同一条 `selectAll()` 语义。
- `CP05-3N`：`Ctrl+Insert / Shift+Insert` 必须与 `Ctrl/Cmd + Shift + C/V` 共享同一条复制/粘贴语义，不能因平台差异退回浏览器默认行为。
- `CP05-3O`：`runtimeContentTruncated` 只能作为元数据存在；截断后的 `runtimeTerminalContent` 仍必须保持纯原始 PTY payload，不能注入人工 marker。

1. 先补 Desktop 真终端人工 smoke：创建 tab、输入字符、Enter、复制粘贴、切 tab、resize。
2. 再补平台矩阵：Windows / Ubuntu / macOS。
3. 完成后再进入 `Step 06` 的 replay / recovery 深化，而不是提前扩散到其它面板。
## 2026-04-10 Supplement - Binary Input Closeout

### Added Facts

- `packages/sdkwork-terminal-infrastructure` now subscribes to both `xterm.onData` and `xterm.onBinary`.
- `packages/sdkwork-terminal-shell` now keeps ordered pending runtime input chunks, so mixed `text / binary / text` input is flushed to the PTY in original order.
- `packages/sdkwork-terminal-infrastructure` now exposes `writeSessionInputBytes(...)` as the canonical desktop raw-byte write surface, while preserving local-shell compatibility aliases.
- `src-tauri` and `sdkwork-terminal-pty-runtime` now expose `desktop_session_input_bytes` and `write_input_bytes(...)`, keeping xterm binary payloads out of UTF-8 string coercion.

### New Checkpoint

- `CP05-3P`: non-UTF-8 xterm binary input reaches the real PTY with byte fidelity, and queued `binding / retrying` flush keeps mixed text/binary ordering intact.

## 2026-04-10 Supplement - OSC Title Sync

### Added Facts

- `packages/sdkwork-terminal-infrastructure` now exposes `setTitleListener(...)` on the xterm viewport driver and listens to `terminal.onTitleChange(...)`.
- `packages/sdkwork-terminal-shell` now feeds viewport title changes back into the tab model, so desktop runtime tabs can reflect shell/TUI title changes in the top header.
- `packages/sdkwork-terminal-shell/src/model.ts` now ignores blank title payloads and restores a restarted runtime tab to its base launch title before the next live terminal title arrives.

### New Checkpoint

- `CP05-3Q`: `OSC 0 / 2` driven xterm title changes can update top tabs through the real viewport path, blank titles do not wipe valid tab labels, and restart does not leave a stale runtime title behind.

## 2026-04-10 Supplement - Terminal Fidelity Smoke Harness

### Added Facts

- Repository now includes `tools/smoke/terminal-fidelity-probe.mjs`, a real-terminal smoke harness for `OSC title / alternate screen / bracketed paste / mouse-reporting / CJK`.
- Windows wrapper `tools/smoke/terminal-fidelity-probe.ps1` is provided so the same probe can be launched quickly on the current workstation baseline.
- The probe also exposes `--print-plan` and `--sample-analysis`, so non-interactive verification can assert the harness contract without faking terminal UI behavior.
- The probe now also exposes `--report-template --platform <platform> --shell <shell>`, so Step 05 platform smoke can be archived into a structured evidence template instead of ad-hoc notes.
- The probe now also exposes `--review-template --platform <platform> --shell <shell>`, so platform smoke can start from a markdown checklist covering `OSC / alternate screen / mouse-reporting / IME / tab-focus-resize`.

### New Checkpoint

- `CP05-3R`: repository provides a repeatable terminal fidelity smoke entrypoint for `OSC / alternate screen / bracketed paste / mouse-reporting / CJK`, with both JSON archival template and markdown review checklist, and that harness itself has regression coverage.
