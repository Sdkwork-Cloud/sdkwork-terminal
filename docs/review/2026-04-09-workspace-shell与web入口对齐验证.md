# 2026-04-09 Workspace / Shell / Web 入口对齐验证

## 结论

- workspace 命名规范与当前工程目录一致。
- `apps/desktop` 与 `apps/web` 已共同复用 `@sdkwork/terminal-shell`，符合“共核但不全共享”的前端分层要求。
- 当前桌面 shell 首页已满足 `tabs/custom header + terminal stage` 的主舞台约束。

## 当前事实

- `packages/` 目录均采用 `packages/sdkwork-terminal-xxx`。
- `apps/desktop/package.json` 与 `apps/web/package.json` 分别命名为 `@sdkwork/terminal-desktop`、`@sdkwork/terminal-web`。
- `apps/desktop/src/App.tsx` 通过 `ShellApp mode=\"desktop\"` 复用共享 shell，并注入桌面 window controller 与 runtime bridge。
- `apps/web/src/App.tsx` 通过 `ShellApp mode=\"web\"` 直接复用共享 shell。
- `packages/sdkwork-terminal-shell/src/index.tsx` 已实现 custom header、tabs、window controls、terminal stage、tab context menu、profile menu 与终端输入主链。

## 证据

- `pnpm typecheck`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts tests/shell-tabs.test.ts tests/terminal-view-driver.test.ts`

## 风险

- 当前 `ShellApp` 仍以 one-shot local command execute 与前端 prototype 状态模型为主，不等同于完整 interactive PTY session 主链。
- `apps/web` 虽已复用共享 shell，但尚未进入 `Server Mode / Broker / Runtime Node` 的真实接入阶段。
