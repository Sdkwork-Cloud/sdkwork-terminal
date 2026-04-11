# 2026-04-10 Step 07 Repeated Connector Launch Intents 验证

## 验证目标

确认顶部 `Connectors` 菜单对同一 target 的重复点击会生成新的 connector launch intent，请求不会再因为稳定 `requestId` 被 ShellApp 去重保护误吞。

## 结果

- 通过：`tests/desktop-resource-launch.test.ts` 已新增“同一 target 重复打开必须生成不同 `requestId`”断言。
- 通过：默认 connector launch intent 现按 action 级一次性规则生成 `requestId`；显式传入 `requestId` 时仍保持调用方控制。
- 通过：ShellApp render 与 desktop runtime bridge 回归测试未被该修复破坏。
- 通过：`pnpm build` 与 `cargo check --manifest-path src-tauri/Cargo.toml` 继续成立，说明桌面桥接与构建链未回归。

## 执行命令

- `node --experimental-strip-types --test tests/desktop-resource-launch.test.ts`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 结论

本轮可确认 Step 07 顶栏 connector product intent 已满足“重复动作必须生成新 `requestId`”的产品约束；下一阻塞点仍是 `CP07-4` 的 Docker/Kubernetes interactive exec 主链闭环。
