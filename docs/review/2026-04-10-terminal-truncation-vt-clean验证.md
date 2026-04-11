# 2026-04-10 Terminal Truncation VT Clean 验证

## 变更目标

- 修复 `runtimeContentTruncated` 通过人工 marker 污染 `runtimeTerminalContent` 的问题。
- 确保 runtime 截断仍保留元数据，但不破坏真实 VT/TUI 恢复语义。

## 核对结论

- `tests/shell-tabs.test.ts`
  - 已新增大体量 replay 截断测试。
  - 已显式禁止 `"[...output truncated...]"` 出现在 `runtimeTerminalContent` 中。
  - 已验证截断后尾部仍保留真实 ANSI / alternate-screen 序列。
- `packages/sdkwork-terminal-shell/src/model.ts`
  - 截断逻辑已改为仅保留真实 PTY tail。
  - `runtimeContentTruncated` 仍作为元数据保留，没有被删除。

## 验证命令

- `node --experimental-strip-types --test tests/shell-tabs.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`

## 结果

- 上述命令均已通过。
- 本轮未修改 Rust / Tauri PTY 热路径，因此未追加 `cargo` 侧验证。
