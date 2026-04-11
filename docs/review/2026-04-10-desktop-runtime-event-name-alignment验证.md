# 2026-04-10 Desktop Runtime Event Name Alignment 验证

## 范围

- `listen` 报错 `Event name must include only alphanumeric characters, -, /, :, _`
- Desktop runtime `subscribeSessionEvents` 与 Rust `emit` 命名一致性
- 回归测试与构建验证

## 结论

- 根因不是 session 订阅逻辑缺失，而是 desktop event bus 名称使用了带 `.` 的 topic。
- 旧路径为：
  - 前端 `listen("sdkwork-terminal.runtime.v1.session.output")`
  - Rust `emit("sdkwork-terminal.runtime.v1.session.output")`
- Tauri `listen(...)` 不接受包含 `.` 的事件名，因此前端在建立订阅前就被参数校验拦截。
- 现已统一改为 Tauri-safe 命名：
  - `sdkwork-terminal:runtime:v1:session:output`
  - `sdkwork-terminal:runtime:v1:session:warning`
  - `sdkwork-terminal:runtime:v1:session:exit`
- 前后端现已对齐，desktop runtime hot path 不再依赖非法事件名。

## 已验证命令

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 仍需人工补证

- 重启一次 `pnpm dev` / Tauri desktop host。
- 在桌面端新建或 reattach 一个 live session，确认控制台不再出现 `subscribe to session events failed ... invalid args event for command listen`。
