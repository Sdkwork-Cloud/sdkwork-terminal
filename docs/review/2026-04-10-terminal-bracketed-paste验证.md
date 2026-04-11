# 2026-04-10 Terminal Bracketed Paste 验证

## 范围

- xterm driver 原生 paste 能力
- terminal 内快捷键粘贴
- tab 级菜单粘贴
- 直接注入 `onViewportInput(...)` 的回归风险

## 结论

- 终端粘贴主路径现已改为优先走 xterm 原生 `paste(...)`，不再把剪贴板文本直接塞入 terminal 输入回调。
- 该调整更接近真实 terminal，对 bracketed paste 语义更安全。
- tab 级菜单与 terminal 内快捷键粘贴已统一到 xterm driver 主路径，减少语义分叉。

## 已验证命令

- `node --experimental-strip-types --test tests/terminal-view-driver.test.ts tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-view-driver.test.ts tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `pnpm dev`
  - 命令在约 `34s` timeout 时被截断，未见立即启动失败输出。

## 仍需人工补证

- bash / zsh / PowerShell 中的多行粘贴
- vim / tmux / less 等 TUI 下的 bracketed paste
- Windows / Ubuntu / macOS 三平台实机剪贴板行为
