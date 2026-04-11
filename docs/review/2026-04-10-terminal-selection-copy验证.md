# 2026-04-10 Terminal Selection Copy 验证

## 变更目标

- 修复 tab 菜单 `Copy` 默认读取 `activeTab.copiedText` 的旧路径。
- 统一 tab 菜单、viewport、快捷键的 terminal clipboard 语义，确保优先依赖真实 xterm selection / paste 能力。

## 核对结论

- `tests/shell-app-render.test.ts`
  - 已新增 `viewportCopyHandlersRef`、`onRegisterViewportCopyHandler`、`copyHandler` 路径断言。
  - 已显式禁止旧实现 `const selectionText = activeTab.copiedText;` 继续作为 tab 菜单默认主路径。
- `packages/sdkwork-terminal-shell/src/index.tsx`
  - shell 容器已按 tab 注册/清理 viewport copy handler。
  - `handleContextMenuCopy()` 已先解析目标 tab，再优先走 `viewportCopyHandlersRef.current.get(targetTabId)`。
  - snapshot fallback 仍保留，但仅作为 viewport 未挂载时的兜底。
- `TerminalStage`
  - copy handler 已通过 `driverRef.current.getSelection()` 获取实时 selection。
  - clipboard 写入逻辑保持 best-effort，不改变 paste、focus、search 现有链路。

## 验证命令

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `pnpm dev`
  - 超时前未见立即启动失败。

## 结果

- 上述命令均已通过。
- 本轮没有修改 Rust / Tauri runtime 热路径，因此未追加 `cargo` 侧验证。
