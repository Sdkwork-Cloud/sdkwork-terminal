# 2026-04-09 Step07 Desktop Session Replay Bridge 验证

## 验证目标

- 桌面端可通过 `desktop_session_replay_slice` 读取 runtime 中指定 session 的 bounded replay 片段。
- `Session Center` 可在保持 runtime truth 边界不变的前提下，消费只读 replay evidence。
- launch / exec probe 产生的真实 session 除进入 `SessionsPanel` 外，还能显示最小 replay 摘要。

## 验证结果

- `packages/sdkwork-terminal-infrastructure/src/index.ts` 已新增 `sessionReplay` bridge。
- `src-tauri/src/lib.rs` 已新增 `desktop_session_replay_slice`，并可把 `SessionRuntime::replay` 映射为桌面快照。
- `apps/desktop/src/session-center.ts` 已把 `desktop_session_index / desktop_session_replay_slice` 串成 Session Center 读链。
- `packages/sdkwork-terminal-sessions/src/model.ts` 已把 replay slice 投影为 session 级 preview，`packages/sdkwork-terminal-sessions/src/index.tsx` 已展示只读 replay 摘要。
- 当前能力仍是 bounded replay read，不代表 interactive attach、实时 streaming 或 replay cursor 控制已落地。

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## 结论

当前 Step 07 已从“desktop session index bridge”推进到“desktop session replay slice bridge”子阶段。桌面资源动作创建的真实 session 不仅可进入 Session Center，还可显示只读 replay evidence；但 interactive attach / replay cursor / streaming 仍未完成。
