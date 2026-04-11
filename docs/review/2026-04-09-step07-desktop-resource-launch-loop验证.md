# 2026-04-09 Step07 Desktop Resource Launch Loop 验证

## 验证目标

- `ResourcesPanel` 可在桌面端直接对 launchable system-cli target 发起 connector launch。
- 桌面组合层可把 `ResourceCenter target` 收口为 `desktop_connector_launch` 请求，并返回结构化结果。
- launch 成功/失败都能投影为统一摘要证据。
- workspace package alias 在 `tsc` 与 Vite 构建链上保持一致。

## 验证结果

- `packages/sdkwork-terminal-resources/src/model.ts` 已新增 launch summary / status 结构与成功、失败摘要生成能力。
- `packages/sdkwork-terminal-resources/src/index.tsx` 已新增 launch action、launching 状态与结构化结果面板。
- `packages/sdkwork-terminal-shell/src/index.tsx` 已可透传 resources 组合能力。
- `apps/desktop/src/App.tsx` 与 `apps/desktop/src/resource-launch.ts` 已把 `ResourcesPanel -> desktop_connector_launch -> launch summary` 串成桌面最小闭环。
- `vite.workspace-alias.ts`、`apps/web/vite.config.ts` 与 `apps/desktop/vite.config.ts` 已对齐 workspace alias。
- 非 launchable target 不会误触发 IPC，而是返回结构化失败摘要。

## 最小证据

- `node --experimental-strip-types --test tests/resource-center.test.ts`
- `node --experimental-strip-types --test tests/desktop-resource-launch.test.ts`
- `node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts`
- `pnpm typecheck`
- `pnpm build`

## 结论

当前 Step 07 已从“desktop IPC launch bridge”推进到“desktop resource launch loop”子阶段。该闭环已让桌面资源面板可直接触发 connector launch 并显示结构化结果，但仍只覆盖 connect phase，尚未完成远程 exec / attach 与 Remote Runtime 主链。
