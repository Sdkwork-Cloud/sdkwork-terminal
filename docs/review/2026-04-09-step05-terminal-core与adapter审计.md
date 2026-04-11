# 2026-04-09 Step05 Terminal Core 与 Adapter 审计

## 结论

- Step 05 已达到 `L4`
- `terminal-core + xterm adapter + workbench terminal pane` 主链成立

## 核心事实

- `packages/sdkwork-terminal-core/` 提供终端状态模型、search、selection、scrollback
- `packages/sdkwork-terminal-infrastructure/` 提供稳定 adapter 与 xterm driver
- `packages/sdkwork-terminal-workbench/` 提供 terminal stage 模型
- `crates/sdkwork-terminal-terminal-core/` 提供 Rust 侧终端核心语义基线

## 证据

- `node --experimental-strip-types --test tests/terminal-core-workbench.test.ts`
- `pnpm typecheck`
- `pnpm build`
- `cargo test --workspace`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 风险

- PTY 热路径、Shell Integration、复杂 Unicode / IME 矩阵仍待后续阶段补齐。
