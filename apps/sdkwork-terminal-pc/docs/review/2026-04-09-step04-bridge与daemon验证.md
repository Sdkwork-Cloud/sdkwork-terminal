# Step 04 bridge 与 daemon 验证

## 验证命令

- `pnpm install`
- `cargo test -p sdkwork-terminal-session-runtime`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `cargo test --workspace`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 结果摘要

- `LocalSessionDaemon` 生命周期测试通过，`start / reconnect / stop / fail` 可重复验证。
- Desktop bridge 测试通过，前端 `invoke` 调用与 readiness 判定逻辑成立。
- `pnpm typecheck` 与 Rust workspace 构建全部恢复为绿色。

## 修复记录

- 修复 runtime bridge 类型未按 `mode` 缩窄导致的前端类型失败。
- 修复 `src-tauri` 缺失协议 crate 依赖问题。
- 修复 Tauri command 直接堆在根模块产生的宏冲突，改为 `commands` 子模块收口。

## 风险与下一步

- 当前 bridge 只覆盖粗粒度控制，不覆盖 PTY 数据面。
- 下一串行窗口应进入 `Step 05`，在稳定 host/daemon 基线上接入 terminal-core 与渲染交互主链。
