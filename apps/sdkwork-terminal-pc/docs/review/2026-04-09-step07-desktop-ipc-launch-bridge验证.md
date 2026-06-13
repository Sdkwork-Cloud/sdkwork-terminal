# 2026-04-09 Step07 Desktop IPC Launch Bridge 验证

## 验证目标

- `src-tauri` 可通过 Tauri command 暴露 connector launch
- `packages/sdkwork-terminal-infrastructure` 可通过 desktop bridge client 调用该命令
- launch 结果可返回 session 快照与 replay 证据

## 验证结果

- `src-tauri/src/lib.rs` 已新增：
  - `DesktopConnectorLaunchSnapshot`
  - `DesktopReplayEntrySnapshot`
  - `DesktopRuntimeState::launch_connector_session`
  - `desktop_connector_launch`
- `packages/sdkwork-terminal-infrastructure/src/index.ts` 已新增：
  - `DesktopConnectorLaunchSnapshot`
  - `DesktopReplayEntrySnapshot`
  - `launchConnectorSession`
- desktop IPC 现可把 `ConnectorSessionLaunchRequest` 发送到宿主，并返回：
  - session 基本元数据
  - 当前状态
  - replay entry 证据

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`

## 结论

当前 Step 07 已从“host connect bridge”推进到“desktop IPC launch bridge”子阶段。该 IPC 仍只覆盖 connect phase，尚未扩展到 exec phase 与 Remote Runtime，因此 Step 07 仍未完成。
