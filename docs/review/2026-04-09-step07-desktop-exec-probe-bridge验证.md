# 2026-04-09 Step07 Desktop Exec Probe Bridge 验证

## 验证目标

- `ResourcesPanel` 可在桌面端直接对 launchable system-cli target 发起 bounded exec probe。
- 桌面组合层可把 `ResourceCenter target` 收口为 `desktop_connector_exec_probe` 请求，并返回结构化 `replay / exit` 结果。
- exec probe 成功 / 失败都能投影为统一摘要证据。
- 资源动作模型可准确表达 launch / exec probe 双动作与 pending 标签。

## 验证结果

- `packages/sdkwork-terminal-resources/src/model.ts` 已新增 exec probe request、资源动作描述与 exec probe 成功 / 失败摘要能力。
- `packages/sdkwork-terminal-resources/src/index.tsx` 已支持 launch / exec probe 双动作，并能根据当前动作显示 `Launching... / Probing... / Retry ...`。
- `apps/desktop/src/resource-launch.ts` 与 `apps/desktop/src/App.tsx` 已把 `ResourcesPanel -> desktop_connector_exec_probe -> exec probe summary` 串成桌面最小闭环。
- exec probe 成功时可返回 `output + exit`；失败时可返回 `warning + exit`，并收口为结构化摘要。
- 当前能力仍是 bounded `connect + exec` probe，不代表实时 attach / streaming 已落地。

## 最小证据

- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resources-panel.test.ts`
- `cargo test -p sdkwork-terminal-session-runtime`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `pnpm typecheck`
- `pnpm build`

## 结论

当前 Step 07 已从“desktop resource launch loop”推进到“desktop exec probe bridge”子阶段。该闭环已让桌面资源面板可直接触发 bounded exec probe 并显示结构化结果，但仍未完成远程 interactive exec / attach 与 Remote Runtime 主链。
