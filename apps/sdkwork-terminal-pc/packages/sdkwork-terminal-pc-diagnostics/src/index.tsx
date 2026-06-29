import { useI18n } from "@sdkwork/terminal-pc-i18n";
import { SurfaceCard } from "@sdkwork/terminal-pc-ui";

export function DiagnosticsPanel() {
  const { t } = useI18n();
  return (
    <SurfaceCard title={t("diagnostics.title")}>
      <ul style={{ margin: 0, paddingLeft: 18, color: "#c8d2df" }}>
        <li>{t("diagnostics.trace")} / {t("diagnostics.metric")} / {t("diagnostics.bundle")}</li>
        <li>{t("diagnostics.smokeEvidence")} / {t("diagnostics.releaseEvidence")} / {t("diagnostics.reviewEvidence")}</li>
      </ul>
    </SurfaceCard>
  );
}
