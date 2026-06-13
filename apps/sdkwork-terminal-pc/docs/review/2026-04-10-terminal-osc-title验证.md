# 2026-04-10 Terminal OSC Title 验证

## 核对范围

- xterm viewport driver 是否暴露 title listener。
- terminal stage 是否把 viewport title 事件接回 shell tab 状态。
- shell model 是否忽略空标题，并保持重启后的标题回退策略。

## 结果

- `tests/terminal-view-driver.test.ts` 已锁定 `setTitleListener` 与 `terminal.onTitleChange(...)` 路径。
- `tests/shell-app-render.test.ts` 已锁定 `onViewportTitleChange` 和 `await driverRef.current.setTitleListener(props.onViewportTitleChange)` 接线。
- `tests/shell-tabs.test.ts` 已新增 `setTerminalShellTabTitle(...)` 行为验证，确认非空标题可更新，空白标题不会清空既有 tab 标题。

## 结论

- `OSC 0 / 2 -> xterm title event -> top tabs` 主链已具备回归保护。
- 当前仍需继续补 `alternate screen / IME / CJK / mouse-reporting` 的真实平台 smoke 证据。
