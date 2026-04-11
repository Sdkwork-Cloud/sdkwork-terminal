import { SurfaceCard } from "@sdkwork/terminal-ui";

export function SettingsPanel() {
  return (
    <SurfaceCard title="Settings">
      <p style={{ margin: 0, color: "#c8d2df" }}>
        配置策略冻结为 `config.toml + SQLite` 双层模型，后续在此接入 Profile、Theme、Keybinding 与诊断配置。
      </p>
    </SurfaceCard>
  );
}
