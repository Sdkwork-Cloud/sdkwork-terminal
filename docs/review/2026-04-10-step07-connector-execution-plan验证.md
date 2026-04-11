# 2026-04-10 Step07 Connector Execution Plan 验证

## 范围

- Step 07 是否已补齐“preflight 之后的执行层视图”
- 当前主机是否能明确区分 executable entries 与 skipped entries
- `ready-only` 是否只为 ready targets 落模板并保留 skipped 清单
- README/smoke 文档是否已同步新命令

## 结论

- 根因是上一轮虽已有 `preflight`、`batch plan` 与 `batch template writer`，但还缺“当前主机究竟现在该执行哪些 target”的合并视图，导致 field smoke 仍需人工判断。
- 修复后，`node tools/smoke/connector-interactive-probe.mjs --print-execution-plan --platform windows-desktop` 已可直接输出当前主机的可执行矩阵。
- 修复后，`node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform windows-desktop --output-dir %TEMP%/sdkwork-terminal-ready-only-cli --ready-only` 只落出 `windows-desktop:ssh` 模板，并把 `docker-exec / kubernetes-exec` 放入 skipped 清单。
- 当前 Windows 主机的真实结果是：
  - `windows-desktop:ssh`: executable now
  - `windows-desktop:docker-exec`: skipped，Docker daemon 不可用
  - `windows-desktop:kubernetes-exec`: skipped，`kubectl current-context` 未设置

## 已验证命令

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --print-execution-plan --platform windows-desktop`
- `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform windows-desktop --output-dir %TEMP%/sdkwork-terminal-ready-only-cli --ready-only`

## 仍需继续

- 在具备 Docker daemon 与 Kubernetes context 的主机上继续执行 Step 07 实机 smoke。
- 继续补齐 `ssh / docker-exec / kubernetes-exec` 的实机 reattach/recovery 归档。
- `remote-runtime` 仍未具备 live attach/input/stream/recovery 主链。
