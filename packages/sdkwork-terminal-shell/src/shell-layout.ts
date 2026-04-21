import type { CSSProperties } from "react";
import { TERMINAL_SURFACE_BACKGROUND } from "./terminal-header.tsx";

export const TERMINAL_CHROME_BACKGROUND = "#16181b";

export const rootStyle: CSSProperties = {
  width: "100%",
  minHeight: "100%",
  height: "100%",
  overflow: "hidden",
  background: TERMINAL_CHROME_BACKGROUND,
  color: "#d4d4d8",
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

export const shellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minHeight: "100%",
  height: "100%",
  background: TERMINAL_CHROME_BACKGROUND,
};

export const tabStripStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "stretch",
  minHeight: 38,
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  background: TERMINAL_CHROME_BACKGROUND,
  overflowX: "hidden",
  overflowY: "visible",
};

export const headerLeadingStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  minWidth: 0,
  flex: 1,
  padding: "6px 0 0 8px",
};

export const headerTrailingStyle: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  justifyContent: "flex-end",
  flex: "none",
  minWidth: 0,
};

export const panelStackStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  background: TERMINAL_SURFACE_BACKGROUND,
  position: "relative",
  overflow: "hidden",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)",
};

export function panelStyle(active: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    minHeight: 0,
    background: TERMINAL_SURFACE_BACKGROUND,
    visibility: active ? "visible" : "hidden",
    opacity: active ? 1 : 0,
    pointerEvents: active ? "auto" : "none",
  };
}
