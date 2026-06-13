# 2026-04-10 Terminal Select All 验证

## 变更目标

- 修复 `Ctrl/Cmd + Shift + A` 只有快捷键壳、没有真实 terminal 全选行为的问题。
- 让 terminal selection 继续收口到 viewport-first 语义，而不是退化成 focus-only 伪交互。

## 核对结论

- `tests/terminal-view-driver.test.ts`
  - 已新增 `selectAll()` 接口、实现与 `terminal.selectAll()` 调用断言。
- `tests/shell-app-render.test.ts`
  - 已新增 `driverRef.current.selectAll()` 路径断言。
  - 已显式禁止旧的 `Ctrl/Cmd + Shift + A -> focus()` 伪实现回归。
  - 已新增 terminal viewport 菜单 `Select all` 可见性断言。
- `packages/sdkwork-terminal-infrastructure/src/index.ts`
  - `XtermViewportDriver` 已暴露 `selectAll()`，并直接调用原生 xterm API。
- `packages/sdkwork-terminal-shell/src/index.tsx`
  - terminal stage 键盘链路已将 `Ctrl/Cmd + Shift + A` 切换为真实 `selectAll()` 调用。
  - terminal viewport 右键菜单已补齐 `Select all` 入口，并复用同一动作。

## 验证命令

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`

## 结果

- 上述命令均已通过。
- 本轮未触碰 Rust / Tauri PTY 热路径，因此未追加 `cargo` 侧验证。
