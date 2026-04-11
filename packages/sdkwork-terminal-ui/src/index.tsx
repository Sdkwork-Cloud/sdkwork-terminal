import type { PropsWithChildren, ReactNode } from "react";

const shellStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(62, 102, 255, 0.16), transparent 36%), #0d1117",
  color: "#f5f7fb",
  fontFamily:
    "\"IBM Plex Sans\", \"Segoe UI\", \"PingFang SC\", sans-serif",
};

export function AppFrame(props: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <main style={shellStyle}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 48px" }}>
        <header style={{ marginBottom: 28 }}>
          <p style={{ margin: 0, color: "#7bdff6", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            sdkwork terminal
          </p>
          <h1 style={{ margin: "10px 0 8px", fontSize: 38 }}>{props.title}</h1>
          <p style={{ margin: 0, color: "#95a3b8", maxWidth: 860 }}>{props.subtitle}</p>
        </header>
        {props.children}
      </div>
    </main>
  );
}

export function SurfaceCard(props: PropsWithChildren<{ title: string; accent?: ReactNode }>) {
  return (
    <section
      style={{
        background: "rgba(20, 26, 36, 0.92)",
        border: "1px solid rgba(123, 223, 246, 0.12)",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 18px 44px rgba(0, 0, 0, 0.22)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{props.title}</h2>
        {props.accent}
      </div>
      {props.children}
    </section>
  );
}

export function MetricPill(props: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div style={{ fontSize: 12, color: "#95a3b8", marginBottom: 4 }}>{props.label}</div>
      <div style={{ fontWeight: 700 }}>{props.value}</div>
    </div>
  );
}

export function StatusBadge(
  props: { label: string; tone?: "info" | "success" | "warning" | "danger" },
) {
  const background =
    props.tone === "success"
      ? "rgba(90, 214, 160, 0.14)"
      : props.tone === "warning"
        ? "rgba(255, 196, 92, 0.14)"
        : props.tone === "danger"
          ? "rgba(255, 107, 129, 0.16)"
        : "rgba(123, 223, 246, 0.14)";
  const color =
    props.tone === "success"
      ? "#7ce5b1"
      : props.tone === "warning"
        ? "#ffd479"
        : props.tone === "danger"
          ? "#ff8a9f"
        : "#7bdff6";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background,
        border: `1px solid ${background}`,
        color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {props.label}
    </span>
  );
}

export function ActionButton(
  props: PropsWithChildren<{
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
  }>,
) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: props.active
          ? "1px solid rgba(123, 223, 246, 0.54)"
          : "1px solid rgba(255, 255, 255, 0.08)",
        background: props.active
          ? "rgba(123, 223, 246, 0.12)"
          : "rgba(255, 255, 255, 0.04)",
        color: "#f5f7fb",
        fontWeight: 700,
        cursor: props.disabled ? "not-allowed" : "pointer",
      }}
    >
      {props.children}
    </button>
  );
}

export function TerminalViewportFrame(
  props: PropsWithChildren<{ title: string; subtitle: string; accent?: ReactNode }>,
) {
  return (
    <section
      style={{
        borderRadius: 18,
        border: "1px solid rgba(123, 223, 246, 0.12)",
        background: "rgba(7, 12, 20, 0.96)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(255, 255, 255, 0.03)",
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>{props.title}</div>
          <div style={{ fontSize: 12, color: "#95a3b8" }}>{props.subtitle}</div>
        </div>
        {props.accent}
      </div>
      <div style={{ padding: 16 }}>{props.children}</div>
    </section>
  );
}
