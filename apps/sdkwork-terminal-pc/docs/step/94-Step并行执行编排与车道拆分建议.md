# Step 并行执行编排与车道拆分建议

## 1. 总原则

最快且风险可控的执行方式是：

`强串行主脊柱 + 波次内按写入范围并行 + 独立平台验证车道 + 单 owner 集成收口`

## 2. 必须串行的主脊柱

- `00`：没有规则，不能并行。
- `01`：没有真实差距，不能并行。
- `02`：没有稳定骨架，不能并行。
- `03`：没有统一契约，不能并行。
- `04`：没有桌面宿主与热路径分离，不能大规模并行。
- `13`：最终发布结论只能最后统一收口。

## 3. 推荐车道

| 车道 | 负责 Step | 主写范围 | 角色 |
| --- | --- | --- | --- |
| `S` 主脊柱 | `00-04`、`13` | 架构、Step、contracts、protocol、host bridge | 架构 / 集成 owner |
| `K` Kernel | `05-06` | terminal kernel、session runtime、replay/store | Rust runtime owner |
| `P` Platform | `05`、`11`、`12` | `ConPTY`、`POSIX PTY`、权限、凭证、平台发布脚本 | 平台适配 owner |
| `C` Connector / CLI | `07-08` | connector runtime、AI CLI host、launch template | connector / CLI owner |
| `W` Workbench | `05`、`09` | shell、custom header、tabs、terminal stage、辅助面板 | frontend shell owner |
| `R` Server | `10-12` | broker、runtime node、server packaging | server owner |
| `G` Governance / Release | `11-12` | test matrix、release metadata、SBOM、rollback | quality / release owner |
| `V` Verification | 贯穿全程 | compat、smoke、benchmark、review、evidence | verification owner |

## 4. 波次编排

### 4.1 Wave B：`05-08`

- `K1`：terminal kernel / search / scrollback / replay primitives
- `P1`：Windows `ConPTY` 与 POSIX PTY 平台 smoke
- `W1`：custom header/tabs/window controls/terminal stage / renderer adapter
- `C1`：SSH / Docker / Kubernetes connectors
- `C2`：AI CLI Native Host
- `V1`：shell/TUI/CJK/IME/connector 验证

### 4.2 Wave C：`09-11`

- `W2`：Session Center / Settings / Diagnostics 等辅助面与 overlay/drawer 收口
- `R1`：Server Mode / Broker / Runtime Node
- `G1`：persistence / observability / security
- `V2`：平台矩阵、弱网、恢复、审计、benchmark

### 4.3 Wave D：`12`

- `P2`：Desktop packaging / updater
- `R2`：Server binary / Docker / Helm
- `G2`：release manifest / SBOM / checksum / rollback
- `V3`：installer / upgrade / rollback / deploy verification

## 5. 硬约束

- 不允许两个车道主写同一高风险契约文件。
- `contracts / protocol / errors / session state machine / release-manifest.json / 目标三元组命名` 只能单 owner 维护。
- `packages/sdkwork-terminal-xxx` 命名、`@sdkwork/terminal-xxx` 包名、首页 `tabs/custom header + terminal stage` 约束只能单 owner 收口。
- 验证车道尽量只写测试、脚本、review/release 证据，不和实现车道混写核心实现。
- 每个波次结束前必须冻结新需求，只允许修复缺陷与补齐证据。

## 6. 禁止并行的事项

- 并行修改 `ExecutionTarget` 主模型。
- 并行修改 `Session` 状态机与 replay 事件语义。
- 并行修改 `PtyBackendPort`、热路径 stream 协议。
- 并行修改 `release-manifest`、签名/公证策略、通道策略。
- 在接口未冻结前，让 UI、Desktop Host、Server 各自发明私有字段。
- 并行改动首页主布局、header/tabs 行为与辅助面挂载规则。
- 并行引入不符合 `sdkwork-terminal-xxx` / `@sdkwork/terminal-xxx` 的目录或包名。

## 7. 最快完整执行打法

1. 先完成主脊柱 `00-04`。
2. 用 `K + P + W + C + V` 跑完 Wave B。
3. 再用 `W + R + G + V` 跑完 Wave C。
4. 最后用 `P + R + G + V` 收口 Wave D。
5. 所有结论统一回到 `13` 由单 owner 做 RC 决策。
6. 每个波次结束前由 `W + V` 联合确认“terminal-first 首页未回归”。

## 8. 结论

并行的前提不是“人多”，而是“共享契约少、写入边界清楚、平台责任明确、验证车道独立”。没有这些前提，terminal 项目的并行只会把平台差异和发布差异放大成系统性风险。
