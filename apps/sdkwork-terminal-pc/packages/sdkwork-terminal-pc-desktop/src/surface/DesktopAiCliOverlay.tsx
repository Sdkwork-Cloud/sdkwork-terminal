import { useEffect, useRef, type CSSProperties } from "react";

import { AiCliPanel } from "@sdkwork/terminal-pc-ai-cli";
import type { AiCliDiscoverySnapshot, AiCliKind } from "@sdkwork/terminal-pc-types";

interface DesktopAiCliOverlayProps {
  open: boolean;
  loading: boolean;
  launching: boolean;
  error: string | null;
  discoverySnapshot: AiCliDiscoverySnapshot | null;
  onClose: () => void;
  onRefresh: () => void;
  onLaunch: (cliKind: AiCliKind) => void;
}

export function DesktopAiCliOverlay(props: DesktopAiCliOverlayProps) {
  const { open, loading, launching, error, discoverySnapshot, onClose, onRefresh, onLaunch } =
    props;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !launching) {
        onClose();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, launching, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI CLI launcher"
      tabIndex={-1}
      ref={dialogRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !launching) {
          onClose();
        }
      }}
      style={backdropStyle}
    >
      <div style={dialogStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600, color: "#e5e7eb" }}>AI CLI Launcher</span>
          <button
            type="button"
            aria-label="Close AI CLI launcher"
            disabled={launching}
            onClick={onClose}
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        {loading && <p style={hintStyle}>Discovering installed AI CLIs…</p>}
        {error && <p style={errorStyle}>{error}</p>}
        {!loading && (
          <AiCliPanel
            discoverySnapshot={discoverySnapshot}
            onRefresh={onRefresh}
            onLaunch={launching ? undefined : onLaunch}
          />
        )}
      </div>
    </div>
  );
}

const backdropStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(9, 13, 20, 0.72)",
  backdropFilter: "blur(2px)",
};

const dialogStyle: CSSProperties = {
  width: "min(560px, calc(100vw - 48px))",
  maxHeight: "min(70vh, 640px)",
  overflowY: "auto",
  background: "#111827",
  border: "1px solid #2b3444",
  borderRadius: 12,
  padding: 16,
  color: "#c8d2df",
  boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const closeButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#9ca3af",
  fontSize: 20,
  lineHeight: 1,
  cursor: "pointer",
  padding: "2px 8px",
  borderRadius: 6,
};

const hintStyle: CSSProperties = { color: "#9ca3af", fontSize: 13 };

const errorStyle: CSSProperties = { color: "#f87171", fontSize: 13 };
