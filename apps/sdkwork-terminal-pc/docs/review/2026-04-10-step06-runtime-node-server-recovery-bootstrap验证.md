# 2026-04-10 Step 06 Runtime-Node Server Recovery Bootstrap 验证

## 核对范围

- `sdkwork-terminal-runtime-node` 是否已拥有真实的 server-side `SessionRuntime` bootstrap，而不是空 crate 或 Step 10 预留占位。
- `ubuntu-server` 恢复证据是否已显式覆盖 `hostMode / platformFamily / cpuArch / runtimeLocation / storageSurface`。
- persisted `session index / replay / lastAckSequence` 是否能在 runtime-node 重建后恢复。
- recovery smoke probe 是否已把 runtime-node 自动化证据纳入 `ubuntu-server` 模板。

## 结果

- `crates/sdkwork-terminal-runtime-node/src/lib.rs` 已新增 `RuntimeNodeBootstrapConfig`、`RuntimeNodeRecoveryDiagnostics` 与 `create_runtime_node_session_runtime(...)`。
- 默认 server 诊断口径已冻结为 `hostMode=server`、`platformFamily=ubuntu-server`，并对 `cpuArch` 做 `x64 / arm64` 归一化。
- SQLite-backed runtime-node 测试已验证：session 创建、output 录制、attachment ack、detach 后，重建 runtime-node 仍可恢复 `session index / replay / lastAckSequence`。
- `tools/smoke/session-recovery-probe.mjs` 已把 runtime-node cargo test 纳入 automated evidence，并把 `ubuntu-server` 存储面明确为 `session-runtime.sqlite3 under runtime-node persistence root`。

## 验证命令

- `cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture`
- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `node --experimental-strip-types --test tests/session-recovery-probe.test.ts tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`

## 结论

- Step 06 的 `ubuntu-server` recovery 已不再只有文档和 smoke 模板，仓库内已经存在真实的 `runtime-node` Rust bootstrap/test 证据。
- 当前仍不能声称 server mode 已完成；本轮只证明 shared Session truth loop 已可在 server-side runtime rebuild 后恢复，后续 broker/runtime-node orchestration 继续留在 Step 10。
