# 2026-04-10 Terminal Insert Shortcuts 验证

## 变更目标

- 对齐 Windows Terminal 习惯快捷键，补齐 `Ctrl+Insert` 复制与 `Shift+Insert` 粘贴。
- 保证新增快捷键不引入新的 clipboard 分叉，而是复用现有真实 terminal 复制/粘贴链路。

## 核对结论

- `tests/shell-app-render.test.ts`
  - 已新增 `isTerminalInsertCopyShortcut(...)`、`isTerminalInsertPasteShortcut(...)` 断言。
  - 已新增 `Ctrl+Insert / Shift+Insert` 与现有 copy/paste 主判断合流的断言。
- `packages/sdkwork-terminal-shell/src/index.tsx`
  - `Ctrl+Insert` 已复用 `copySelectionToClipboard()`。
  - `Shift+Insert` 已复用 `pasteClipboardIntoTerminal()`。
  - 仍保持统一 terminal clipboard 语义，没有新增绕过 xterm 的路径。

## 验证命令

- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`

## 结果

- 上述命令均已通过。
- 本轮未改 Rust / Tauri PTY 热路径，因此未追加 `cargo` 侧验证。
