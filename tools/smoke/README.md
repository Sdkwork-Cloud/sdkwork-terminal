# smoke 目录

- 放置 step 级最小 smoke 命令。
- 当前阶段提供 workspace、desktop host、terminal fidelity、session recovery 与 connector toolchain 的仓库级 smoke 入口。
- `connector-toolchain-smoke.ps1` 用于执行 SSH / Docker / Kubernetes CLI toolchain smoke。
- `connector-interactive-probe.mjs` 用于输出 Step 07 `ssh / docker-exec / kubernetes-exec` live terminal 与 reattach/recovery smoke 计划、execution plan、结构化 report template 与 markdown review template。
- `connector-interactive-probe.ps1` 是 Windows 侧的快捷包装入口，可直接转发到 `connector-interactive-probe.mjs`。
- `terminal-fidelity-probe.mjs` 用于执行真实 terminal fidelity smoke，覆盖 `OSC` title、`alternate screen`、`bracketed paste`、`mouse-reporting` 与 `CJK` 样例。
- `session-recovery-probe.mjs` 用于输出 Step 06 `Session Runtime / Replay / Recovery` 的跨平台 smoke 矩阵、结构化 report template 与 markdown review template，覆盖 `Windows desktop / Ubuntu desktop / macOS desktop / Ubuntu Server`。
- Windows 可直接执行 `powershell -ExecutionPolicy Bypass -File tools/smoke/terminal-fidelity-probe.ps1`，跨平台可执行 `node tools/smoke/terminal-fidelity-probe.mjs`。
- Windows 可直接执行 `powershell -ExecutionPolicy Bypass -File tools/smoke/session-recovery-probe.ps1`，跨平台可执行 `node tools/smoke/session-recovery-probe.mjs --print-plan`。
- Windows 可直接执行 `powershell -ExecutionPolicy Bypass -File tools/smoke/connector-interactive-probe.ps1 docker-exec`，跨平台可执行 `node tools/smoke/connector-interactive-probe.mjs --print-plan`。
- `node tools/smoke/connector-interactive-probe.mjs --print-preflight --platform windows-desktop` 可输出当前主机的 Step 07 preflight 报告，判断 `ssh / docker-exec / kubernetes-exec` 哪些 target 真实可跑、哪些因 daemon/context/authority 缺失而阻塞。
- `node tools/smoke/connector-interactive-probe.mjs --print-batch-plan` 可输出 `windows-desktop / ubuntu-desktop / macos-desktop x ssh / docker-exec / kubernetes-exec` 的批量执行矩阵，明确哪些实机 smoke 可并行执行、哪些 Step/release 回写必须串行。
- `node tools/smoke/connector-interactive-probe.mjs --print-execution-plan --platform windows-desktop` 可把当前主机 preflight 与批量执行矩阵合并，直接标出 executable entries、skipped entries 与当前 host lane 的执行顺序。
- `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform ubuntu-desktop --output-dir tmp/connector-batch` 可一次性落出当前平台全部 connector 的 report/review 模板文件，便于实机 smoke 前分发与归档。
- `node tools/smoke/connector-interactive-probe.mjs --write-batch-templates --platform windows-desktop --output-dir tmp/connector-batch-ready --ready-only` 可只为当前主机已 ready 的 connector 落模板，并把 blocked/tool-only targets 放入 skipped 清单。
- `node tools/smoke/terminal-fidelity-probe.mjs --report-template --platform windows --shell powershell` 可输出结构化 smoke report 模板，供 `Windows / Ubuntu / macOS` 实机归档使用。
- `node tools/smoke/terminal-fidelity-probe.mjs --review-template --platform windows --shell powershell` 可输出 markdown review 模板，供人工复核 `OSC` title、`alternate screen`、`mouse-reporting`、IME 与 `tab/focus/resize` 结果。
- `node tools/smoke/session-recovery-probe.mjs --report-template --platform windows-desktop --host-mode desktop --cpu-arch x64` 可输出结构化恢复 smoke report 模板，记录 `persisted index / replay recovery / reattach-or-recover / attachment ack / platform diagnostics`。
- `node tools/smoke/session-recovery-probe.mjs --review-template --platform ubuntu-server --host-mode server --cpu-arch x64` 可输出 markdown recovery review 模板，固化桌面 `session-runtime.sqlite3` 路径约束、server `session-runtime.sqlite3` persistence root 约束与 `Ubuntu Server` 恢复证据清单。
- `node tools/smoke/connector-interactive-probe.mjs --report-template --platform ubuntu-desktop --target docker-exec --shell bash` 可输出结构化 live terminal report 模板，覆盖 `interactive create / live input echo / resize / replay-and-exit / session-center-reattach / restart-and-recover / multi-tab repeat launch`。
- `node tools/smoke/connector-interactive-probe.mjs --review-template --platform macos-desktop --target kubernetes-exec --shell zsh` 可输出 markdown review 模板，固化 `ssh / docker-exec / kubernetes-exec` 的产品入口、真实 live terminal、Session Center reattach 与 recovery 证据检查项。

## Windows release launch probe

- `windows-release-launch-probe.mjs` verifies the packaged Windows desktop host after `pnpm tauri:build`.
- `pnpm verify:terminal-runtime` runs the critical xterm/TUI/runtime-controller regression lane before release packaging.
- `pnpm verify:windows-release -- --target x86_64-pc-windows-msvc` is the standard local runtime-plus-build-plus-launch verification lane for packaged Windows releases.
- `pnpm smoke:windows-release-launch -- --target x86_64-pc-windows-msvc` is the standard local entrypoint for the same verification flow.
- `node tools/smoke/windows-release-launch-probe.mjs --print-plan` prints the release launch smoke plan.
- `node tools/smoke/windows-release-launch-probe.mjs --report-template --target x86_64-pc-windows-msvc` prints a structured report template for the chosen target.
- `node tools/smoke/windows-release-launch-probe.mjs --review-template --target x86_64-pc-windows-msvc` prints the matching markdown review template.
- `node tools/smoke/windows-release-launch-probe.mjs --inspect-launch --assert-passed --target x86_64-pc-windows-msvc --startup-delay-ms 6000` launches the packaged app, captures the process tree, and fails fast if any release checks regress.
- The probe checks the PE GUI subsystem, ensures no `WindowsTerminal.exe` or `wt.exe` process is spawned, and verifies that any `conhost.exe` child process stays `--headless`.
- `.github/workflows/release-reusable.yml` runs this probe for every Windows desktop release job before bundle collection.
