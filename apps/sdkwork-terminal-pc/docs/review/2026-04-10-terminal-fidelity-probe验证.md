# 2026-04-10 Terminal Fidelity Probe 验证

## 核对范围

- 仓库是否存在可重复执行的 terminal fidelity smoke 入口。
- probe 是否覆盖 `OSC title / alternate screen / bracketed paste / mouse-reporting / CJK`。
- probe 是否具备非交互校验能力，避免只能靠口头描述。

## 结果

- 已新增 `tools/smoke/terminal-fidelity-probe.mjs`。
- 已新增 Windows 包装入口 `tools/smoke/terminal-fidelity-probe.ps1`。
- `tests/terminal-fidelity-probe.test.ts` 已锁定 VT probe plan、输入分析器与 smoke README 文档入口。
- `node tools/smoke/terminal-fidelity-probe.mjs --print-plan` 可输出结构化 probe 计划。
- `node tools/smoke/terminal-fidelity-probe.mjs --sample-analysis` 可输出 bracketed paste 与 mouse-reporting 的示例分析结果。
- `node tools/smoke/terminal-fidelity-probe.mjs --report-template --platform ubuntu --shell bash` 可输出结构化 smoke report 模板，便于后续三平台归档。
- `node tools/smoke/terminal-fidelity-probe.mjs --review-template --platform windows --shell powershell` 可输出 markdown review 模板，便于人工复核 `OSC / alternate screen / mouse-reporting / IME / tab-focus-resize`。

## 结论

- Step 05 现已具备仓库级 terminal fidelity smoke 抓手，不再只剩文档性“待人工验证”描述。
- 下一轮应优先使用该 probe 在 `Windows / Ubuntu / macOS` 上执行真实 tab 内 smoke，并同时归档 JSON report 与 markdown review 结果。
