# 2026-04-10 Step05 Terminal UI Polish 验证

## 范围

- terminal search overlay
- clipboard copy / paste
- xterm viewport 滚动条样式
- tabs/custom header + terminal stage 首页约束

## 代码事实

- `packages/sdkwork-terminal-infrastructure/src/index.ts`
  - `XtermViewportDriver` 已提供 `search()`、`getSelection()`
- `packages/sdkwork-terminal-shell/src/index.tsx`
  - 已提供 search overlay
  - 已提供 `Ctrl/Cmd + Shift + C / V / F`
  - 已提供 xterm 滚动条样式收口
  - 首页仍保持 `tabs/custom header + terminal stage`

## 验证命令

- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts`
- `node --experimental-strip-types --test tests/terminal-viewport-render-plan.test.ts tests/terminal-core-workbench.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/desktop-runtime-bridge.test.ts tests/terminal-view-driver.test.ts`
- `pnpm typecheck`
- `pnpm build`

## 结果

- 终端 UI 主形态未回退
- Desktop PTY 原始终端渲染链未回退
- search / copy / paste 主链已建立
- 滚动条产品样式已开始收口

## 剩余差距

- 仍缺跨 `Windows / Ubuntu / macOS` 的真实手工 smoke 证据
- 仍缺更完整的 `TUI / CJK / IME / bracketed paste` 组合验证
