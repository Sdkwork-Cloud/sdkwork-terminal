# 2026-04-10 Step07 Connector Preflight Audit 验证

## 范围

- Step 07 是否仍缺少仓库级主机 readiness 审计入口
- 当前主机是否能在进入实机 smoke 前直接识别 `ssh / docker-exec / kubernetes-exec` 的环境阻塞
- 测试与 CLI 是否覆盖 preflight 报告路径

## 结论

- 根因是上一轮虽已具备 batch plan 与 batch template writer，但还缺少进入实机 smoke 前的 readiness 审计，导致环境阻塞与产品问题容易被混淆。
- 修复后，`node tools/smoke/connector-interactive-probe.mjs --print-preflight --platform windows-desktop` 已可直接输出当前主机的 Step 07 preflight 报告。
- 当前 Windows 主机的真实结果是：
  - `ssh`: ready，存在 authority candidate
  - `docker-exec`: blocked，Docker daemon 未连通
  - `kubernetes-exec`: blocked，`kubectl current-context` 未设置

## 已验证命令

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --print-preflight --platform windows-desktop`

## 仍需继续

- 在具备 Docker daemon 与 Kubernetes context 的主机上继续执行 Step 07 实机 smoke。
- `remote-runtime` 仍未具备 live attach/input/stream/recovery 主链。
