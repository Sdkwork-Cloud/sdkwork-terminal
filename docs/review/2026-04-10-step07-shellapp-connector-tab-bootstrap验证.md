# 2026-04-10 Step 07 ShellApp Connector Tab Bootstrap 验证

## 范围

- Shell model 的 connector tab bootstrap 建模
- ShellApp 的 desktop connector interactive session 分支
- desktop bootstrap 期输入排队

## 已验证

- `node --experimental-strip-types --test tests/shell-tabs.test.ts`
  - 覆盖 connector bootstrap request 解析
  - 覆盖 connector bootstrap 在 restart / duplicate 后保持一致
  - 覆盖 `idle / binding / retrying / running / exited / failed` 的输入排队判定
- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
  - 锁定 `DesktopConnectorSessionIntent`
  - 锁定 ShellApp 对 `createConnectorInteractiveSession(...)` 的接线
  - 锁定 `runtimeBootstrap.kind === "connector"` 分支仍在 shell 主链
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
  - 回归验证 desktop bridge 的 `createConnectorInteractiveSession(...)`
- `pnpm typecheck`
  - desktop/web TypeScript 均通过

## 结论

- 本轮已完成 Step 07 的 ShellApp live-tab bootstrap 子阶段。
- 当前剩余问题不在 ShellApp 承接层，而在正式产品入口、Docker/Kubernetes 扩面与 Remote Runtime recovery。
