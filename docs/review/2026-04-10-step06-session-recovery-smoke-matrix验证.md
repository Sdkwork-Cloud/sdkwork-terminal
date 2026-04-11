# 2026-04-10 Step 06 Session Recovery Smoke Matrix 验证

## 核对范围

- Step 06 `CP06-5` 是否已有仓库内可重复执行的恢复矩阵入口。
- 是否能统一生成 `Windows desktop / Ubuntu desktop / macOS desktop / Ubuntu Server` 的 report/review 模板。
- 新增 probe 是否没有打坏 desktop runtime bridge、Session Center 与 shell tabs 现有行为。
- `pnpm typecheck` 是否仍为绿灯。

## 结果

- `tools/smoke/session-recovery-probe.mjs` 已提供：
  - `--print-plan`
  - `--report-template`
  - `--review-template`
- probe 已冻结四类平台目标：`windows-desktop / ubuntu-desktop / macos-desktop / ubuntu-server`。
- `tests/session-recovery-probe.test.ts` 已覆盖模块入口、CLI 输出与 smoke README 文档化。
- `packages/sdkwork-terminal-shell/src/index.tsx` 中残留的 `entryType` 旧字段已修正为真实 replay 字段 `kind`，`pnpm typecheck` 已恢复通过。
- 既有 desktop runtime bridge、Session Center、reattach、shell tabs、terminal fidelity 测试在同一轮验证中保持全部通过。

## 验证命令

- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `node --experimental-strip-types --test tests/session-recovery-probe.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`

## 结论

- Step 06 已新增可复用的 recovery smoke matrix 能力，`CP06-5` 不再停留在散落文档和口头描述层面。
- 当前仍未直接证明四个平台都已实机通过，只是把验收入口、证据模板和统一口径做成了仓库能力；后续循环应继续基于该 probe 收集平台实证，而不是跳步声称完成。
