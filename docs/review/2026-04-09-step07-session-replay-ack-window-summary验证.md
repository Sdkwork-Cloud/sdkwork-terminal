# 2026-04-09 Step07 Session Replay Ack Window Summary 验证

## 验证目标

- Session Center 不只显示 bounded replay transcript、replay status、replay cursor、cursor drift、ack lag、latest state、health、latest warning、latest exit、freshness、timeline gap、sequence gap、timeline、mix 与 evidence，还能显式表达 replay ack window summary。
- loaded replay 必须在 attachment 存在且 replay window 可比较时，读出 ack 位点位于窗口之前、窗口内还是窗口之后的只读事实。
- 该能力保持只读边界，不冒充 replay cursor control、interactive attach 或实时 streaming。

## 验证结果

- `packages/sdkwork-terminal-sessions/src/model.ts` 已新增 `replayAckWindow` 与 `summarizeSessionReplayAckWindow`。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已显示 replay ack window summary 文本。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已覆盖 replay ack window summary。
- 当前能力仍是 replay read + ack window summary，不代表 replay cursor control、interactive attach 或实时 streaming 已落地。

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## 结论

当前 Step 07 已从“Session Center replay ack lag summary”推进到“Session Center replay ack window summary”子阶段。桌面资源动作创建的真实 session 现在不仅可显示 bounded recent replay lines、replay unavailable 诊断、cursor 窗口摘要、cursor drift 摘要、ack lag 摘要、ack window 摘要、latest state 摘要、health 摘要、latest warning 摘要、latest exit 摘要、freshness 摘要、timeline gap 摘要、sequence gap 摘要、时间窗口摘要、事件分布摘要与 warning / exit 证据摘要；但 interactive attach / replay cursor control / streaming 仍未完成。
