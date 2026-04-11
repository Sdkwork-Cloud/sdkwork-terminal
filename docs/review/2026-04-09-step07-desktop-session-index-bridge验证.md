# 2026-04-09 Step07 Desktop Session Index Bridge 验证

## 验证目标

- 桌面端可通过 `desktop_session_index` 读取 runtime 中的真实 session / attachment 快照。
- `Session Center` 可消费该快照，而不是继续展示 demo 数据。
- launch / exec probe 后创建的 session 能自动进入 `SessionsPanel`。

## 验证结果

- `packages/sdkwork-terminal-infrastructure/src/index.ts` 已新增 `sessionIndex` bridge。
- `src-tauri/src/lib.rs` 已新增 `desktop_session_index`，并可把 `SessionRuntime::list_sessions / list_attachments` 映射为桌面快照。
- `apps/desktop/src/session-center.ts` 与 `apps/desktop/src/App.tsx` 已把 `desktop_session_index -> Session Center snapshot` 串成桌面读链。
- `packages/sdkwork-terminal-shell/src/index.tsx` 已支持透传真实 `sessions` snapshot。
- 当前能力仍是 Session Center 读链投影，不代表 attach / detach / replay 操作入口已落地。

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `pnpm typecheck`
- `pnpm build`

## 结论

当前 Step 07 已从“desktop exec probe bridge”推进到“desktop session index bridge”子阶段。桌面资源动作创建的真实 session 已可进入 Session Center，但 interactive attach / replay / streaming 仍未完成。
