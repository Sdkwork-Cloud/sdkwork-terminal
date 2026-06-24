# Step 12 - Install、Deploy、Release、Upgrade 与 Rollback 落地

## 1. Step Card

| 项 | 内容 |
| --- | --- |
| 执行模式 | 串行主导，局部并行 |
| 前置 | `02`、`10`、`11` |
| 主写入范围 | `deployments/desktop/`、`deployments/docker/`、`deployments/k8s/`、`tools/release/`、`tools/smoke/`、`src-tauri/`、CI/release pipeline |
| 执行输入 | `docs/架构/04`、`11`、`12`、`16` |
| 本步非目标 | 不新增业务功能；不以手工打包代替正式发布链 |
| 最小输出 | 目标三元组构建链、签名/公证链、Server/Docker/K8s 交付链、升级/回滚链 |

## 2. 设计

- Desktop 按目标三元组分别产生产物与 updater 元数据。
- Server 按 `Ubuntu Server x64 / arm64` 产生产物与 service/容器脚本。
- Docker/K8s 只包装 `server`，不复制 terminal 业务实现。
- 发布链必须统一生成 `release-manifest.json`、SBOM、校验和、签名/公证结果与已知限制。

## 3. 实施落地规划

1. 建立 `Windows / Ubuntu / macOS` 的目标三元组构建与产物命名规则。
2. 建立 Windows 安装包签名、macOS 签名/公证、Ubuntu `deb/AppImage` 构建链。
3. 建立 `Ubuntu Server x64 / arm64` 二进制、Docker 多架构镜像、Helm Chart 构建链。
4. 统一生成 `release-manifest.json`、SBOM、校验和、升级兼容矩阵。
5. 建立安装、启动、升级、回滚 smoke 与失败恢复流程。

## 4. 测试计划

- Desktop P0 平台安装与启动 smoke
- Desktop P1 平台安装与启动 smoke
- macOS 签名/公证校验
- Server `x64 / arm64` 启动与 API smoke
- Docker `linux/amd64`、`linux/arm64` 镜像 smoke
- Helm render / install / upgrade / rollback smoke
- updater、preflight、rollback 测试

## 5. 结果验证

- 所有目标三元组都有独立、可运行、可追溯的发布物。
- Desktop/Server/Docker/K8s 共用同一套 release metadata，而不是各写一套说明。
- 升级失败时能够有证据地回滚，不把用户留在半升级状态。

## 6. 检查点

- `CP12-1`：目标三元组构建链成立。
- `CP12-2`：Desktop 安装包与 updater 基线成立。
- `CP12-3`：macOS 签名与公证链成立。
- `CP12-4`：Server / Docker / K8s 交付链成立。
- `CP12-5`：升级与回滚 smoke 通过。

## 7. 串并行策略

- 必须串行：release manifest、版本/通道策略、签名/公证政策、回滚策略。
- 可并行：
  - `12-A` Windows / Ubuntu / macOS Desktop packaging
  - `12-B` Server binary + Docker
  - `12-C` Helm/K8s
  - `12-D` release metadata / SBOM / checksum
  - `12-E` install/upgrade/rollback verification
- `release-manifest.json`、通道策略、签名/公证政策只能单 owner 收口。

## 8. 风险与回滚

- 风险：不同交付形态出现不同配置语义、不同版本真相、不同回滚逻辑。
- 回滚：统一回收到同一 release manifest、同一配置模型、同一 smoke 标准。

## 9. 完成定义

- 目标三元组发布物、签名/公证、Server/Docker/K8s、升级/回滚全部可执行。
- release 证据链可以直接支撑 `beta / stable` 决策。
- 不再依赖人工解释“这一版到底支持哪些平台/架构”。

## 10. 下一步准入条件

- Step 13 只能在本步交付链与回滚链真实可运行后进入总集成与发布就绪阶段。