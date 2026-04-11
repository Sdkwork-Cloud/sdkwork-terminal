# 2026-04-10 Step 07 Connector Interactive Smoke Baseline 验证

## 验证目标

确认 Step 07 `CP07-4` 已具备仓库级 `docker-exec / kubernetes-exec` live terminal smoke 入口，并且共享 Rust 控制面对 Docker/Kubernetes interactive bootstrap 已有自动化覆盖。

## 结果

- 通过：`tools/smoke/connector-interactive-probe.mjs` 可输出 shared smoke plan、JSON report template 与 markdown review template。
- 通过：`tools/smoke/connector-interactive-probe.ps1` 已作为 Windows 快捷包装入口落地。
- 通过：`tests/connector-interactive-probe.test.ts` 已验证 probe 文件存在、CLI 输出正确且 README 已记录入口。
- 通过：`crates/sdkwork-terminal-control-plane` 已补齐 `docker-exec / kubernetes-exec` interactive bootstrap 覆盖，确认共享 truth loop 不再只对 SSH 有证据。

## 执行命令

- `node --experimental-strip-types --test tests/connector-interactive-probe.test.ts`
- `cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture`

## 结论

本轮可确认 Step 07 `CP07-4` 已具备仓库级 smoke baseline。下一步必须收集实机 `docker-exec / kubernetes-exec` report/review 归档，并继续完成 connector 级 attach/reconnect/recovery 闭环。
