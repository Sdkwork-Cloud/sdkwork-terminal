# 2026-04-10 Step07 Connector Batch Smoke Matrix 验证

## 范围

- Step 07 connector smoke 是否仍只能逐个 `platform + target` 手工组织
- 仓库内是否已有标准化批量矩阵输出入口
- 是否已明确哪些 smoke 可以并行、哪些文档回写必须串行
- 测试与 CLI 输出是否已覆盖新矩阵能力

## 结论

- 根因是现有 `connector-interactive-probe` 虽然能输出单个 report/review 模板，但还缺少面向三平台三目标的批量执行矩阵，导致 Step 07 实机证据采集仍偏手工。
- 修复后，`node tools/smoke/connector-interactive-probe.mjs --print-batch-plan` 已可直接输出：
  - `windows-desktop / ubuntu-desktop / macos-desktop`
  - `ssh / docker-exec / kubernetes-exec`
  - 每个 `platform-target` 条目的 `reportCommand / reviewCommand / suggestedArtifacts`
  - 并行执行分组与串行回写约束
- 新矩阵能力不会误报 Step 07 完成；它只负责加速真实 smoke 归档。

## 已验证命令

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --print-plan`
- `node tools/smoke/connector-interactive-probe.mjs --print-batch-plan`

## 仍需继续

- 继续基于 batch plan 产出 `ssh / docker-exec / kubernetes-exec` 的实机 report/review 归档。
- `remote-runtime` 仍未具备 live attach/input/stream/recovery 主链。
