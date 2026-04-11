# 2026-04-10 Step 06 Session Center Overlay Reattach 验证

## 目标

- 验证桌面端已存在真实可达的 Session Center 产品入口。
- 验证重连动作使用 `desktop_session_reattach` 真写链，而不是假恢复或本地伪造状态。
- 验证首页仍保持 `tabs/custom header + terminal stage`，未回退成 dashboard/home。

## 结果

- 通过：`apps/desktop/src/App.tsx` 已接入 `DesktopSessionCenterOverlay`、`loadDesktopSessionCenterSnapshot(...)` 与 `client.reattachSession({ sessionId })`。
- 通过：`packages/sdkwork-terminal-shell/src/index.tsx` 已在 shell dropdown 提供 `Session Center` 菜单项，并消费外部 reattach intent，在成功后打开新的 runtime-backed tab。
- 通过：`apps/desktop/src/session-center-shell.ts` 已把 desktop interactive reattach 明确限制为 `target=local-shell`。
- 通过：首页形态仍是 terminal-first；Session Center 只以 overlay 进入。

## 执行命令

- `node --experimental-strip-types --test tests/desktop-session-reattach.test.ts tests/shell-app-render.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `pnpm dev`

## 证据摘要

- 新增 `desktop-session-reattach` 测试，冻结 desktop reattach gating 与 intent 映射。
- `shell-app-render` 已冻结 shell chrome 中的 Session Center 入口、overlay 接线与 reattach intent 消费。
- `pnpm typecheck` 通过，说明 desktop app 与 shell package 的新增接线未引入 TS 结构性错误。
- `pnpm dev` 冒烟启动未出现立即崩溃。

## 约束

- 当前验证范围只覆盖 desktop + `local-shell` interactive reattach。
- `src-tauri` 本轮无新增 Rust 行为改动，采用 `cargo check` 作为回归确认。
