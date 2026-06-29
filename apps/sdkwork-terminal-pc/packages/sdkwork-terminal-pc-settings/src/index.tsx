import { useI18n } from "@sdkwork/terminal-pc-i18n";
import { SurfaceCard } from "@sdkwork/terminal-pc-ui";

export function SettingsPanel() {
  const { t } = useI18n();
  return (
    <SurfaceCard title={t("settings.title")}>
      <p style={{ margin: 0, color: "#c8d2df" }}>{t("settings.persistence")}</p>
    </SurfaceCard>
  );
}
