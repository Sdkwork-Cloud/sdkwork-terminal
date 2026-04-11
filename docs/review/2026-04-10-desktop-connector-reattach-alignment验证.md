# 2026-04-10 Desktop Connector Reattach Alignment 验证

## 范围

- Session Center 的 desktop interactive `Reattach` 是否仍被错误限制为 `local-shell`
- `ssh / docker-exec / kubernetes-exec` 重连 intent 是否仍退化成 `shell / Session`
- `remote-runtime` 是否继续保持只读，不暴露伪交互式重连
- 回归测试、类型检查、构建与 Rust bridge 校验是否通过

## 结论

- 根因不在 `desktop_session_reattach` IPC 或 Rust `SessionRuntime`，而在桌面产品层 `apps/desktop/src/session-center-shell.ts` 仍把可重连集合硬编码为 `local-shell`。
- 修复后，desktop interactive reattach 正式开放给 `local-shell / ssh / docker-exec / kubernetes-exec`，并继续显式排除 `remote-runtime`。
- connector reattach intent 已恢复 connector 语义：
  - `ssh -> profile=bash, title=SSH`
  - `docker-exec -> profile=bash, title=Docker`
  - `kubernetes-exec -> profile=bash, title=Kubernetes`
- Session Center disabled hint 已区分：
  - 已附着
  - 已退出
  - `remote-runtime` 尚未支持 desktop interactive reattach

## 已验证命令

- `node --experimental-strip-types --test tests/desktop-session-reattach.test.ts`
- `node --experimental-strip-types --test tests/desktop-session-reattach.test.ts tests/desktop-session-center.test.ts tests/desktop-runtime-bridge.test.ts tests/shell-app-render.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 仍需继续

- Step 07 的 `remote-runtime` live attach/recovery 仍未闭环。
- `ssh / docker-exec / kubernetes-exec` 的跨主机 reconnect/recovery 仍需实机 report/review 证据。
