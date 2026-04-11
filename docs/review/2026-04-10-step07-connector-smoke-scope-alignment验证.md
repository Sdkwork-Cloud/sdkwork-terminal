# 2026-04-10 Step07 Connector Smoke Scope Alignment 验证

## 范围

- `connector-interactive-probe` 是否仍被文档误写为仅覆盖 `docker-exec / kubernetes-exec`
- Step 07 当前 smoke 证据是否已明确包含 `ssh` live terminal
- Session Center reattach 与 restart/recovery 是否已进入同一仓库级 smoke 入口
- 下一轮动作是否仍正确收敛在实机 report/review，而不是跳到 `remote-runtime`

## 结论

- 根因是 Step 07 文档层仍残留“Docker/Kubernetes-only smoke baseline”表述，和现有 `tools/smoke/connector-interactive-probe.mjs` 的真实范围不一致。
- 对齐后，仓库基线现已明确：
  - `ssh / docker-exec / kubernetes-exec` 共用同一个 connector smoke 入口
  - smoke 不只验证 live terminal create，还包含 Session Center reattach 与 restart/recovery 检查项
  - 下一轮最优动作仍是补齐三类 connector 的实机 report/review 归档，而不是提前宣称 Step 07 完成

## 已验证命令

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `node tools/smoke/connector-interactive-probe.mjs --print-plan`

## 仍需继续

- Step 07 的 `ssh / docker-exec / kubernetes-exec` 仍缺实机 report/review 归档。
- `remote-runtime` 仍未具备 live attach/input/stream/recovery 主链。
