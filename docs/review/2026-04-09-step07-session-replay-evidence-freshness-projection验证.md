# 2026-04-09 Step07 Session Replay Evidence Freshness Projection 验证

## 验证目标

- Session Center 不只显示 bounded replay transcript、replay status、cursor、ack、state/output、health、warning/exit、evidence 与 evidence ack，还能显式表达 replay evidence freshness projection。
- loaded replay 必须只根据 latest warning/exit evidence 与 `observedAt` 的关系，直接给出 `fresh / aging / stale` 只读摘要，而不是伪造 interactive attach、实时 streaming 或 replay cursor control。
- 该能力保持 bounded replay 读侧边界，不扩展新的 host / protocol / runtime 写链。

## 验证结果

- `packages/sdkwork-terminal-sessions/src/model.ts` 已新增 `replayEvidenceFreshness` 与 `summarizeSessionReplayEvidenceFreshness`。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已显示 replay evidence freshness 文本。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已覆盖 replay evidence freshness。
- 当前能力仍是 replay read + evidence freshness projection，不代表 interactive attach、replay cursor control 或实时 streaming 已落地。

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## 结论

当前 Step 07 已从“Session Center replay evidence ack summary”推进到“Session Center replay evidence freshness projection”子阶段。桌面资源动作创建的真实 session 现在不仅可显示 bounded recent replay lines、replay unavailable 诊断、cursor 窗口摘要、cursor drift 摘要、ack lag 摘要、ack window 摘要、window coverage 摘要、latest state 摘要、state lag 摘要、state freshness 摘要、state ack 摘要、state/output 差值摘要、latest output 摘要、output lag 摘要、output ack 摘要、output freshness 摘要、health 摘要、latest warning 摘要、latest exit 摘要、freshness 摘要、timeline gap 摘要、sequence gap 摘要、时间窗口摘要、事件分布摘要、warning / exit 证据摘要与 evidence ack 摘要，还可直接读出 latest evidence 的 freshness；但 interactive attach / replay cursor control / streaming 仍未完成。
