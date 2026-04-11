# 2026-04-10 Step 07 Session-First Runtime Write Surface 验证

## 验证目标

确认桌面 terminal 写入/订阅链路已从 `local-shell` 语义收口到 `session-first`，并且不破坏现有 connector/live-tab 行为。

## 结果

- 通过：desktop bridge client 已暴露 `writeSessionInput / writeSessionInputBytes / resizeSession / terminateSession / subscribeSessionEvents`。
- 通过：ShellApp 源码已不再消费 `writeLocalShellInput* / resizeLocalShellSession / terminateLocalShellSession / subscribeLocalShellSessionEvents`。
- 通过：Tauri host 已注册 `desktop_session_input / desktop_session_input_bytes / desktop_session_resize / desktop_session_terminate`，并补齐 capability/permission。
- 通过：connector catalog、resource center、ShellApp 渲染与 session write 热路径回归全部为绿。

## 执行命令

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `node --experimental-strip-types --test tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 结论

本轮可确认 Step 07 的 desktop `session-first` 写接口命名已落地，后续应继续推进 Docker/Kubernetes interactive 扩面、Remote Runtime recovery 与多目标 inventory。
