# 2026-04-09 Step07 Session Draft 审计

## 结论

- Step 07 已从“资源状态展示”推进到“资源目标可派生 Session 创建请求”。

## 核心事实

- `packages/sdkwork-terminal-types/` 已新增 `SessionCreateDraft`。
- `packages/sdkwork-terminal-resources/` 已可针对 launchable target 生成 Session draft。
- blocked target 不会返回创建请求。

## 证据

- `tests/resource-center.test.ts`

## 风险

- 当前只是派生创建请求，尚未真正调用 runtime 执行外部 connector。
