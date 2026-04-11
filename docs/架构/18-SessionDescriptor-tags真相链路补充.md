# 18-SessionDescriptor-tags真相链路补充

## 1. 目标

冻结 `SessionDescriptor.tags` 的权威语义，避免 desktop bridge、Session Center、reattach intent 再次把真实会话标签压缩成 `modeTags`。

## 2. 规则

- `modeTags` 只表达运行模式，例如 `cli-native`。
- `tags` 承载真实会话标签，例如 `profile:powershell`、`resource:ssh`、`resource:docker-exec`。
- `desktop_session_index / attach / detach / reattach` 返回的 session descriptor 必须显式保留 `tags`。
- `Session Center / reattach intent` 必须优先消费真实 `tags`，不得把所有 session 统一解释成 `cli-native`。
- 仅对历史快照缺失 `tags` 的读侧兼容场景允许回退到 `modeTags`；该回退不得反向写回 runtime。

## 3. 当前落点

- `packages/sdkwork-terminal-types/src/index.ts`
- `packages/sdkwork-terminal-contracts/src/index.ts`
- `tests/fixtures/runtime-contract.snapshot.json`
- `src-tauri/src/lib.rs`
- `packages/sdkwork-terminal-sessions/src/model.ts`
- `apps/desktop/src/session-center-shell.ts`

## 4. 验收

- contract snapshot 含 `sessionDescriptorFields.tags`
- desktop session snapshot 含 `tags`
- Session Center 读侧可恢复 `profile:*` / `resource:*`
- reattach intent 可据 `profile:*` 正确映射 shell profile
- `pnpm typecheck`、`cargo check`、Step 06 相关测试全部通过
