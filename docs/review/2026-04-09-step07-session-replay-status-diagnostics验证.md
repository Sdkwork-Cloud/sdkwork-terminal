# 2026-04-09 Step07 Session Replay Status Diagnostics 验证

## 验证目标

- Session Center 不只显示 bounded replay transcript，还能显式表达 replay window 摘要。
- `desktop_session_replay_slice` 读取失败时，Session Center 必须显示 `replay unavailable` 诊断，而不是伪装成空 replay。
- 该能力保持只读边界，不冒充 interactive attach、实时 streaming 或 replay cursor 控制。

## 验证结果

- `packages/sdkwork-terminal-sessions/src/model.ts` 已新增 `replayFailures`、`replayStatus` 与 `summarizeSessionReplayStatus`。
- `apps/desktop/src/session-center.ts` 已把 replay 读取失败映射为结构化 failure，再交由 Session snapshot 投影。
- `packages/sdkwork-terminal-sessions/src/index.tsx` 已显示 replay status 文本，和 transcript 列表并存。
- `tests/session-center.test.ts`、`tests/desktop-session-center.test.ts` 与 `tests/sessions-panel.test.ts` 已覆盖 loaded / unavailable 两类 replay status。
- 当前能力仍是 replay read + diagnostics，不代表 interactive attach、实时 streaming 或 replay cursor 控制已落地。

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/sessions-panel.test.ts`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`

## 结论

当前 Step 07 已从“Session Center bounded replay transcript projection”推进到“Session Center replay status diagnostics”子阶段。桌面资源动作创建的真实 session 现在不仅可显示 bounded recent replay lines，还可明确显示 replay window 与 replay unavailable 诊断；但 interactive attach / replay cursor / streaming 仍未完成。
