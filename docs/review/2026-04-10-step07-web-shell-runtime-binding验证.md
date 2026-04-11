# 2026-04-10 Step 07 Web Shell Runtime Binding 验证

## 范围

- `apps/web` 是否已通过 `createWebRuntimeBridgeClient(...)` 接入真实 runtime bridge。
- `ShellApp` 是否已具备 `remote-runtime` 的 tab 级 bootstrap 真相，而不是把 web 统一降级成伪 prompt。
- desktop `detach / attachment-ack / remote-runtime 禁止 reattach` 边界是否仍然保持不变。

## 结论

- 修复前，`apps/web` 只渲染 `<ShellApp mode="web" />`，仓库虽然已有 `createWebRuntimeBridgeClient(...)`，但产品入口没有真实接线，web 端仍停留在伪 prompt。
- 修复后，`apps/web/src/App.tsx` 已显式创建 `createWebRuntimeBridgeClient(...)`，并通过 `VITE_TERMINAL_RUNTIME_*` 环境变量生成 `webRuntimeTarget` 后传入 `ShellApp`。
- 修复后，`packages/sdkwork-terminal-shell/src/model.ts` 已把 `remote-runtime` 纳入 tab 级 `runtimeBootstrap` 真相；`ShellApp` 已能沿 `createRemoteRuntimeSession -> replay -> input -> resize -> terminate -> subscribe` 主链执行。
- 修复后，web 在配置 `webRuntimeTarget` 时，首 tab 与新 tab 都会进入 runtime-backed terminal stage；只有缺失运行目标配置时，才允许回退到显式 prompt fallback。
- 修复后，desktop 仍仅对本地/connector 路径保留 `detachSessionAttachment / acknowledgeSessionAttachment`，`remote-runtime` 仍未被错误提升为 desktop interactive reattach 目标。

## 已验证命令

- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/resource-center.test.ts tests/web-runtime-bridge.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts`
- `pnpm typecheck`
- `pnpm build`

## 仍需继续

- 补齐 `runtime-node` host/API 的真实 attach/input/stream/recovery 闭环。
- 形成 `remote-runtime` recovery 的 report/review 证据，之后才能关闭 `CP07-5`。
