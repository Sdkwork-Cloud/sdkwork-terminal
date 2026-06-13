# 2026-04-10 Step 06 Desktop SQLite Recovery Bootstrap 验证

## 核对范围

- 桌面端 `SessionRuntime` SQLite bootstrap 是否已收口到共享 Rust 控制面。
- 桌面端重建后是否能恢复 persisted `session index + replay`。
- `src-tauri` 是否仅保留路径解析与桥接接线，而不再复制平行 SQLite 初始化逻辑。
- 当前 Windows 主机上的 `src-tauri` Rust 单测限制是否被真实记录。

## 结果

- `crates/sdkwork-terminal-control-plane` 已新增 `create_desktop_session_runtime(...)` 与 `DESKTOP_SESSION_RUNTIME_DB_FILE_NAME`，统一封装桌面端 `session-runtime.sqlite3` bootstrap。
- `src-tauri/src/lib.rs` 的 `create_session_runtime(...)` 现已直接复用共享控制面 bootstrap；`resolve_session_runtime_db_path(...)` 只负责把 Tauri `app_local_data_dir()` 映射到 `session-runtime.sqlite3`。
- `cargo test -p sdkwork-terminal-control-plane` 已验证桌面端在 SQLite 持久化后能够恢复 session index 与 replay transcript。
- `cargo test --manifest-path src-tauri/Cargo.toml desktop_host_snapshot_matches_contract_namespaces -- --nocapture` 在当前 Windows 主机仍失败于 `STATUS_ENTRYPOINT_NOT_FOUND`，说明受阻的是 Tauri 宿主测试二进制加载，而不是本轮 Session recovery 业务断言。

## 验证命令

- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts`
- `pnpm typecheck`
- `cargo test --manifest-path src-tauri/Cargo.toml desktop_host_snapshot_matches_contract_namespaces -- --nocapture`

## 结论

- Step 06 的桌面 SQLite 恢复 bootstrap 已形成更稳的架构闭环：共享 Rust crate 持有真逻辑，`src-tauri` 保持薄桥接。
- 当前仍存在的差距不是 Session recovery 设计缺失，而是本机 Windows/Tauri Rust 单测宿主加载限制；后续若要补齐 `src-tauri` 原位自动化，需要单独解决该宿主问题，而不是回退共享控制面方案。
