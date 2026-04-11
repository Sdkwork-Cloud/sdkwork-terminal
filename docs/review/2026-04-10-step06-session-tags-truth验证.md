# 2026-04-10 Step 06 Session Tags Truth 验证

## 核对范围

- `SessionDescriptor.tags` 是否进入共享 TS 合约与 runtime contract snapshot。
- desktop `session_index / attach / detach / reattach` 是否保留真实 `tags`。
- `Session Center / reattach intent` 是否优先消费真实 `tags`，且仅对旧快照缺失 `tags` 做兼容回退。

## 结果

- `packages/sdkwork-terminal-types` 已把 `tags` 固化到 `SessionDescriptor`。
- `packages/sdkwork-terminal-contracts` 与 `tests/fixtures/runtime-contract.snapshot.json` 已把 `tags` 写入 `sessionDescriptorFields`。
- `src-tauri/src/lib.rs` 的 `DesktopSessionDescriptorSnapshot` 与 `map_session_descriptor_snapshot(...)` 已保留 `session.tags`。
- `packages/sdkwork-terminal-sessions/src/model.ts` 已优先读取真实 `session.tags`，仅在旧快照无 `tags` 时回退到 `modeTags`。
- `apps/desktop/src/session-center-shell.ts` 已用真实 session tags 解析 `profile:powershell` 等 reattach profile 标签。

## 验证命令

- `node --experimental-strip-types --test tests/runtime-contracts.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 结论

- Step 06 的 desktop Session truth loop 已补齐 `tags` 元数据平面，`Session Center` 不再把 `profile:*`、`resource:*` 标签塌缩成 `cli-native`。
- 当前仍保留旧快照兼容回退，但该回退仅用于读侧稳定性，不改变 runtime 显式输出 `tags` 的主标准。
