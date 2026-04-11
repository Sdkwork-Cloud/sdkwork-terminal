import { SurfaceCard } from "@sdkwork/terminal-ui";

const nativeCliHosts = ["Codex", "Claude Code", "Gemini", "OpenCode"];

export function AiCliPanel() {
  return (
    <SurfaceCard title="AI CLI Native Host">
      <p style={{ marginTop: 0, color: "#c8d2df" }}>
        集成边界冻结为 CLI 原生托管，不在当前产品中做语义抽象。
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {nativeCliHosts.map((item) => (
          <span
            key={item}
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              background: "rgba(123, 223, 246, 0.1)",
              border: "1px solid rgba(123, 223, 246, 0.2)",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </SurfaceCard>
  );
}
