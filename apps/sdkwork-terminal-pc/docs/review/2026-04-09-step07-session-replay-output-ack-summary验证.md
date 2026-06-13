# 2026-04-09 Step07 Session Replay Output Ack Summary 验证

## 验证目标

- Session Center 不只显示 bounded replay transcript、replay status、replay cursor、cursor drift、ack lag、ack window、window coverage、latest state、latest output、output lag、output freshness、health、latest warning、latest exit、freshness、timeline gap、sequence gap、timeline、mix 与 evidence，还能显式表达 replay output ack summary。
- loaded replay 必须只根据 `lastAckSequence` 与 latest output sequence 读出 output ack 摘要，而不是伪造 interactive attach、实时 streaming 或 replay cursor control。
- 该能力保持只读边界，不冒充 interactive attach、replay cursor control 或实时 streaming。

## 验证结果

- `packages/sdkwork-terminal-sessions/src/model.ts` 已新增 `replayOutputAck` 与 `summarizeSessionReplayOutputAck`。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已显示 replay output ack summary 文本。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已覆盖 replay output ack summary。
- 当前能力仍是 replay read + output ack summary，不代表 interactive attach、replay cursor control 或实时 streaming 已落地。

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## 结论

当前 Step 07 已从“Session Center replay output lag summary”推进到“Session Center replay output ack summary”子阶段。桌面资源动作创建的真实 session 现在不仅可显示 bounded recent replay lines、replay unavailable 诊断、cursor 窗口摘要、cursor drift 摘要、ack lag 摘要、ack window 摘要、window coverage 摘要、latest state 摘要、latest output 摘要、output lag 摘要、output ack 摘要、output freshness 摘要、health 摘要、latest warning 摘要、latest exit 摘要、freshness 摘要、timeline gap 摘要、sequence gap 摘要、时间窗口摘要、事件分布摘要与 warning / exit 证据摘要；但 interactive attach / replay cursor control / streaming 仍未完成。
