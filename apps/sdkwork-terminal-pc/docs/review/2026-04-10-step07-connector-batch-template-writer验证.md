# 2026-04-10 Step07 Connector Batch Template Writer 验证

## 范围

- Step 07 connector batch matrix 是否仍只能打印 JSON，不能直接产出模板文件
- 仓库内是否已有批量 report/review skeleton 落盘能力
- CLI 与测试是否覆盖模板文件写出路径

## 结论

- 根因是上一轮虽已具备批量执行矩阵，但实机 smoke 前仍需人工创建 report/review 文件，导致 Step 07 归档前置工作仍偏手工。
- 修复后，`node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform ubuntu-desktop --output-dir <dir>` 已可直接写出当前平台全部 connector 的 JSON report 与 markdown review 模板。
- 该能力只负责生成 skeleton，不会误报实机 smoke 已完成。

## 已验证命令

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform ubuntu-desktop --output-dir $env:TEMP/sdkwork-terminal-connector-batch-manual`

## 仍需继续

- 继续基于已写出的模板文件完成 `ssh / docker-exec / kubernetes-exec` 的实机 smoke 填写与 review。
- `remote-runtime` 仍未具备 live attach/input/stream/recovery 主链。
