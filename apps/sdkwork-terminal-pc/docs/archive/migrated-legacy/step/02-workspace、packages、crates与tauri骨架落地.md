# Step 02 - Workspace、Packages、Crates 与 Tauri 骨架落地

## 1. Step Card

| 项 | 内容 |
| --- | --- |
| 执行模式 | 串行主导，波次内可并行 |
| 前置 | `00`、`01` |
| 主写入范围 | `apps/`、`packages/`、`crates/`、`src-tauri/`、`deployments/`、`tools/` |
| 执行输入 | `docs/架构/02`、`03`、`04`、`12`、`15` |
| 本步非目标 | 不实现完整终端能力；不实现完整 Server Mode；不做平台能力假支持 |
| 最小输出 | 目录命名、宿主边界、平台适配骨架、目标三元组发布骨架 |

## 2. 设计

- `apps/desktop` 只承载桌面入口，`src-tauri/` 只承载桌面宿主、窗口、权限、sidecar 与桥接。
- `apps/web` 只承载 Web Console/预览壳层，不承载桌面 PTY 或本地窗口职责。
- `packages/sdkwork-terminal-xxx` 只提供前端公共面；`package.json.name` 必须为 `@sdkwork/terminal-xxx`。
- `crates/` 承载 Rust 共核与平台适配能力；平台适配必须显式分出 `windows / posix / server` 责任边界，可以是独立 crate，也可以是明确子模块，但不能散落在 UI 与 `src-tauri` 中。
- 目标三元组发布骨架必须从本步开始建立，不允许后期补救式命名。

## 3. 实施落地规划

1. 冻结 root workspace、`pnpm workspace`、`cargo workspace`、根脚本与基础配置。
2. 冻结 `packages/sdkwork-terminal-xxx` 与 `@sdkwork/terminal-xxx` 命名规范。
3. 建立桌面 Host、Web Host、共核 packages、Rust runtime crates 的目录边界。
4. 为 `Windows / POSIX / Server` 建立平台适配骨架或清晰的预留位置。
5. 建立目标三元组构建骨架、sidecar 命名规则与 release 目录结构。
6. 确保 `pnpm dev` 与桌面最小壳可启动，避免“文档支持跨平台，工程却起不来”。

## 4. 测试计划

- `pnpm install`
- `pnpm typecheck`
- `pnpm build`
- `cargo fmt --check`
- `cargo check --workspace`
- Tauri 最小启动 smoke
- 目标三元组配置 dry-run：验证发布命名、sidecar 命名与产物路径符合标准

## 5. 结果验证

- 工程目录能清楚区分共核层、平台适配层、交付装配层。
- `src-tauri` 不再被视为“万能业务层”。
- 新增 package/crate 时不会再破坏命名规范与导出边界。
- 发布链已经具备承载 `Windows / Ubuntu / macOS / Ubuntu Server` 与 `x64 / arm64` 的最小工程骨架。

## 6. 检查点

- `CP02-1`：workspace、package、crate 命名规范冻结。
- `CP02-2`：Desktop Host / Web Host / Rust Runtime 边界冻结。
- `CP02-3`：平台适配骨架建立，`windows / posix / server` 责任可追踪。
- `CP02-4`：目标三元组、sidecar 与发布目录命名规则冻结。
- `CP02-5`：`pnpm dev` 与桌面最小壳可启动。

## 7. 串并行策略

- 必须串行：根 workspace、命名规范、宿主边界、目标三元组命名。
- 可并行：
  - `02-A` packages 公共面骨架
  - `02-B` crates 共核与平台适配骨架
  - `02-C` deploy/tools/release 目录与脚本骨架
  - `02-D` 结构测试与校验脚本
- `package 命名`、`平台适配主目录`、`release 目录命名` 只能单 owner 收口。

## 8. 风险与回滚

- 风险：用一个桌面宿主目录承载所有平台/服务端逻辑，后期无法真正跨平台。
- 回滚：保留 root workspace，回退错误的包边界与发布命名，再按本 Step 重新收口。

## 9. 完成定义

- 目录结构能够支撑双主态、两包装交付。
- `pnpm dev`、workspace 校验和最小桌面壳全部通过。
- 后续 Step 可以在稳定边界上实现真正的终端能力。

## 10. 下一步准入条件

- Step 03 只能在本步冻结的目录与命名边界上继续定义 API、IPC 与 stream 契约。