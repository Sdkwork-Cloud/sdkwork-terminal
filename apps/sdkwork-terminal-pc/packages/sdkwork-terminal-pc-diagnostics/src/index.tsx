import { SurfaceCard } from "@sdkwork/terminal-pc-ui";

export function DiagnosticsPanel() {
  return (
    <SurfaceCard title="Diagnostics">
      <ul style={{ margin: 0, paddingLeft: 18, color: "#c8d2df" }}>
        <li>保留 trace / metric / diag bundle 的落点�?/li>
        <li>当前仅建�?smoke、release �?review 证据入口�?/li>
      </ul>
    </SurfaceCard>
  );
}

