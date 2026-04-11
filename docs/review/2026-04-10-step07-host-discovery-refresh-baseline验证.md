# 2026-04-10 Step 07 Host Discovery Refresh Baseline 验证

## 目标

- 验证 Step 07 已从静态 connector catalog 进入真实 host/config/health discovery baseline。
- 验证桌面顶部 profile/connectors dropdown 打开前会刷新 `resourceCenterSnapshot`。

## 结果

### 通过

- `cargo test --manifest-path crates/sdkwork-terminal-resource-connectors/Cargo.toml -- --nocapture`
  - 18/18 通过
  - 覆盖：
    - SSH/Docker/Kubernetes/Remote Runtime discovery baseline
    - 缺失 CLI / 缺失 authority / 缺失 pod/container 时的 `health + sessionLaunchable`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/shell-app-render.test.ts`
  - 31/31 通过
  - 覆盖：
    - desktop bridge `executionTargets()`
    - resource snapshot loader
    - shell 顶部 `Connectors` 菜单
    - `onBeforeProfileMenuOpen` 与桌面刷新接线
- `pnpm typecheck`
  - 通过
- `pnpm build`
  - web/desktop 均通过
- `cargo check --manifest-path src-tauri/Cargo.toml`
  - 通过

### 受限

- `cargo test --manifest-path src-tauri/Cargo.toml desktop_execution_target_catalog_uses_discovered_connector_targets -- --nocapture`
  - 当前 Windows 主机执行失败：`STATUS_ENTRYPOINT_NOT_FOUND`
  - 结论：
    - 这是宿主 Rust test binary loader 限制
    - 不是 Step 07 discovery 业务链失败证据
    - 本轮 accepted evidence 仍以共享 Rust crate 测试 + `src-tauri cargo check` + TypeScript 测试为准

## 评估

- `CP07-1`
  - 保持通过；contract/transport/health/read-model 未回退
- `CP07-2`
  - discovery baseline 通过，但跨平台矩阵证据仍未补齐
- `CP07-3`
  - SSH interactive 主链保持推进，且顶部产品入口现在消费真实 discovery snapshot
- `CP07-4`
  - 未完成
- `CP07-5`
  - 未完成

## 结论

- 本轮关闭的是 `Step 07 / host discovery + desktop catalog refresh baseline` 子问题。
- Step 07 总体仍未完成；下一优先级应回到 `session-first` 写接口命名、Docker/Kubernetes interactive 闭环、多目标 inventory 深化与 Remote Runtime recovery。
