import { useI18n } from "@sdkwork/terminal-pc-i18n";
import { SurfaceCard } from "@sdkwork/terminal-pc-ui";
import type {
  AiCliDiscoverySnapshot,
  AiCliBinaryDiscovery,
  AiCliKind,
} from "@sdkwork/terminal-pc-types";

const ALL_CLI_KINDS: AiCliKind[] = ["codex", "claude-code", "gemini", "opencode"];

const CLI_KIND_KEYS: Record<AiCliKind, string> = {
  codex: "aiCli.codex",
  "claude-code": "aiCli.claudeCode",
  gemini: "aiCli.gemini",
  opencode: "aiCli.openCode",
};

interface AiCliPanelProps {
  discoverySnapshot?: AiCliDiscoverySnapshot | null;
  onRefresh?: () => void;
  onLaunch?: (cliKind: AiCliKind) => void;
}

export function AiCliPanel(props: AiCliPanelProps) {
  const { discoverySnapshot, onRefresh, onLaunch } = props;
  const { t } = useI18n();
  const discoveries = discoverySnapshot?.discoveries ?? [];

  return (
    <SurfaceCard title={t("aiCli.title")}>
      <p style={{ marginTop: 0, color: "#c8d2df" }}>{t("aiCli.description")}</p>
      {discoverySnapshot && (
        <div style={{ fontSize: 12, color: "#71717a", marginBottom: 12 }}>
          {t("aiCli.platformInfo", {
            platform: discoverySnapshot.platformFamily,
            arch: discoverySnapshot.cpuArch,
            time: new Date(discoverySnapshot.checkedAt).toLocaleTimeString(),
          })}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ALL_CLI_KINDS.map((kind) => {
          const discovery = discoveries.find((d) => d.cliKind === kind);
          return (
            <AiCliEntry
              key={kind}
              kind={kind}
              discovery={discovery}
              onLaunch={onLaunch}
            />
          );
        })}
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          style={{
            marginTop: 12,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#d4d4d8",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {t("aiCli.refresh")}
        </button>
      )}
    </SurfaceCard>
  );
}

function AiCliEntry(props: {
  kind: AiCliKind;
  discovery?: AiCliBinaryDiscovery;
  onLaunch?: (cliKind: AiCliKind) => void;
}) {
  const { kind, discovery, onLaunch } = props;
  const { t } = useI18n();
  const found = discovery?.found ?? false;
  const version = discovery?.version ?? null;
  const authState = discovery?.authState;
  const authLabel = authState?.authenticated
    ? t("aiCli.authenticated")
    : t("aiCli.notAuthenticated");
  const statusText = found
    ? t("aiCli.versionAuth", {
        version: version ?? t("aiCli.unknownVersion"),
        auth: authLabel,
      })
    : t("aiCli.notFound");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: found ? "#22c55e" : "#ef4444",
          }}
        />
        <div>
          <div style={{ color: "#fafafa", fontSize: 14, fontWeight: 500 }}>
            {t(CLI_KIND_KEYS[kind])}
          </div>
          <div style={{ color: "#71717a", fontSize: 12 }}>{statusText}</div>
        </div>
      </div>
      {found && onLaunch && (
        <button
          onClick={() => onLaunch(kind)}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid rgba(56, 189, 248, 0.3)",
            background: "rgba(56, 189, 248, 0.1)",
            color: "#38bdf8",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {t("aiCli.launch")}
        </button>
      )}
    </div>
  );
}
