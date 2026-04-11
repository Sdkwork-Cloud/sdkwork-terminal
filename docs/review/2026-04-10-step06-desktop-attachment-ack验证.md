# 2026-04-10 Step 06 Desktop Attachment Ack 验证

## 核对范围

- Desktop bridge 是否暴露 attachment ack 能力。
- runtime-backed tab 是否保存 attachment identity。
- live event 与 replay catch-up 消费后，是否存在 attachment ack 回写链。

## 结果

- `packages/sdkwork-terminal-infrastructure` 已新增 `acknowledgeSessionAttachment(...)`，并路由到 `desktop_session_attachment_acknowledge`。
- `src-tauri` 已新增 `desktop_session_attachment_acknowledge` 命令，并桥接到 `SessionRuntime::acknowledge(...)`。
- `packages/sdkwork-terminal-shell` 已为 runtime-backed tab 保存 `runtimeAttachmentId`。
- shell 在消费 live event 与 replay catch-up 后，会把最新 sequence 回写到 attachment ack。
- `tests/desktop-runtime-bridge.test.ts`、`tests/shell-tabs.test.ts`、`tests/shell-app-render.test.ts` 已锁定 bridge、tab state 与热路径接线。

## 验证命令

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/desktop-session-center.test.ts tests/session-center.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 结论

- Step 06 的 attachment ack 已从 Rust 内核推进到 desktop bridge 与 shell 热路径，不再只停留在底层能力存在、桌面消费链缺失的状态。
- 当前仍未引入 Session Center reattach UI，本轮只收口 attachment ack 真相回写，不误报为完整 reattach 产品闭环。
