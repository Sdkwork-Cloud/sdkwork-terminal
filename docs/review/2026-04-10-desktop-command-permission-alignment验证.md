# 2026-04-10 Desktop Bridge Command Permission Alignment 验证

## 范围

- `desktop_local_shell_session_create not allowed. Command not found` 根因核对
- Desktop bridge `snake_case` invoke 命令权限补齐
- 主窗口 capability 与手写权限集绑定验证

## 结论

- 根因不是 Rust command 缺失。`desktop_local_shell_session_create` 已在 `src-tauri/src/lib.rs` 中注册并进入 `invoke_handler`。
- 根因是 ACL 漂移。前端 invoke 使用 `snake_case`，而自动生成权限只覆盖 kebab-case，自定义 bridge 命令在运行时被权限层拒绝。
- 现在 `src-tauri/permissions/desktop-host.toml` 显式声明了 desktop bridge 的 `snake_case` 权限，`src-tauri/capabilities/default.json` 也已挂载 `desktop-host-commands`。
- `cargo check` 后生成的 `src-tauri/gen/schemas/acl-manifests.json` 已包含 `desktop-host-commands` 以及 `desktop_local_shell_session_create` 等 `snake_case` allow 条目。

## 已验证命令

- `node --experimental-strip-types --test tests/desktop-tauri-permissions.test.ts`
- `node --experimental-strip-types --test tests/desktop-tauri-permissions.test.ts tests/desktop-runtime-bridge.test.ts tests/shell-app-render.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm typecheck`
- `pnpm build`

## 仍需人工补证

- 重启一次 `pnpm dev` / Tauri dev 进程，确保旧的桌面宿主缓存被替换。
- 在桌面端新建本地 shell tab，验证首次 bootstrap 不再出现 `not allowed`。
