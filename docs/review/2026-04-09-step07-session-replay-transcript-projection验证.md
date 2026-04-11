# 2026-04-09 Step07 Session Replay Transcript Projection 验证

## 验证目标

- Session Center snapshot 不只保留 replay preview，还保留 bounded replay slice 明细。
- `SessionsPanel` 可展示 recent replay lines，而不是只显示最新一条摘要。
- 该能力仍保持只读边界，不冒充 interactive attach、实时 streaming 或 replay cursor 控制。

## 验证结果

- `packages/sdkwork-terminal-sessions/src/model.ts` 已新增 `replaySlice` 保留与 `createSessionReplayHistoryLines`。
- `apps/desktop/src/session-center.ts` 读取到的 `desktop_session_replay_slice` 结果已完整进入 Session Center snapshot。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已展示 bounded replay history 列表。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已覆盖 replay slice 明细与 transcript formatter。
- 当前能力仍是 bounded transcript read，不代表 interactive attach、实时 streaming 或 replay cursor 控制已落地。

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## 结论

当前 Step 07 已从“desktop session replay slice bridge”推进到“Session Center bounded replay transcript projection”子阶段。桌面资源动作创建的真实 session 现在不仅可进入 Session Center，还可显示 bounded recent replay lines；但 interactive attach / replay cursor / streaming 仍未完成。
