# 2026-04-09 Step07 Session Replay Timeline Metadata 验证

## 验证目标

- Session Center 不只显示 bounded replay transcript、replay status 与 replay cursor，还能显式表达 replay 时间窗口摘要。
- loaded replay 必须可读出 `firstOccurredAt / lastOccurredAt / entryCount` 的只读投影。
- 该能力保持只读边界，不冒充 replay cursor 控制、interactive attach 或实时 streaming。

## 验证结果

- `packages/sdkwork-terminal-sessions/src/model.ts` 已新增 `replayTimeline` 与 `summarizeSessionReplayTimeline`。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已显示 replay timeline metadata 文本。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已覆盖 replay timeline projection。
- 当前能力仍是 replay read + timeline metadata，不代表 replay cursor control、interactive attach 或实时 streaming 已落地。

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## 结论

当前 Step 07 已从“Session Center replay cursor metadata”推进到“Session Center replay timeline metadata”子阶段。桌面资源动作创建的真实 session 现在不仅可显示 bounded recent replay lines、replay unavailable 诊断与 cursor 窗口摘要，还可明确显示 replay 时间窗口摘要；但 interactive attach / replay cursor control / streaming 仍未完成。
