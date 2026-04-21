import {
  measureTerminalTabStripContentWidth,
  resolveTerminalTabActionInlineWidth,
} from "./model";
import { useEffect, useState, type CSSProperties } from "react";

const TERMINAL_ACTIVE_TAB_BACKGROUND = "#1f2329";
export const TERMINAL_SURFACE_BACKGROUND = "#050607";
export const TERMINAL_HEADER_RESERVE_WIDTH = 40;
export const TERMINAL_HEADER_ACTION_FALLBACK_WIDTH = 60;

export interface HeaderLayoutMetrics {
  leadingWidth: number;
  tabListWidth: number;
  actionWidth: number;
}

export const headerChromeStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 2,
  marginLeft: 2,
  marginBottom: 1,
  flex: "none",
  borderRadius: 8,
};

export function headerDragSpacerStyle(docked: boolean): CSSProperties {
  if (docked) {
    return {
      flex: "none",
      width: 0,
      minWidth: 0,
    };
  }

  return {
    flex: 1,
    minWidth: 16,
  };
}

export function tabListStyle(docked: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-end",
    gap: 2,
    flex: docked ? 1 : "none",
    minWidth: 0,
    overflowX: "auto",
    scrollbarWidth: "none",
  };
}

export const tabScrollButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 32,
  marginBottom: 1,
  border: "none",
  background: "transparent",
  color: "#71717a",
  cursor: "pointer",
  borderRadius: 6,
  flex: "none",
};

export function syncTabScrollState(
  container: HTMLDivElement | null,
  setLeft: (value: boolean) => void,
  setRight: (value: boolean) => void,
) {
  if (!container) {
    setLeft(false);
    setRight(false);
    return;
  }

  setLeft(container.scrollLeft > 0);
  setRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 2);
}

export function scrollTabs(
  container: HTMLDivElement | null,
  direction: "left" | "right",
) {
  if (!container) {
    return;
  }

  const delta = direction === "left" ? -220 : 220;
  container.scrollBy({ left: delta, behavior: "smooth" });
}

export function measureTerminalHeaderLayoutMetrics(args: {
  container: HTMLDivElement;
  leading: HTMLDivElement;
  chrome: HTMLElement | null;
  docked: boolean;
}): HeaderLayoutMetrics {
  const actionWidth =
    args.chrome?.getBoundingClientRect().width ?? TERMINAL_HEADER_ACTION_FALLBACK_WIDTH;
  const tabMeasurements = Array.from(args.container.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .map((child) => ({
      offsetLeft: child.offsetLeft,
      width: child.offsetWidth,
    }));

  return {
    leadingWidth: resolveTerminalTabActionInlineWidth({
      leadingWidth: args.leading.clientWidth,
      actionWidth,
      docked: args.docked,
    }),
    tabListWidth: measureTerminalTabStripContentWidth(tabMeasurements),
    actionWidth,
  };
}

export const activeTabAccentStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 2,
  background: "#6b7280",
};

export const activeTabBottomMaskStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: -1,
  height: 1,
  background: TERMINAL_SURFACE_BACKGROUND,
};

export const tabButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
  minWidth: 0,
  height: "100%",
  padding: "0 12px",
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};

export const tabTitleStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 12,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
};

export const tabExitedIndicatorStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#f97316",
  opacity: 0.8,
  flex: "none",
};

function chromeButtonStyle(active = false): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "none",
    background: active ? "rgba(255, 255, 255, 0.08)" : "transparent",
    color: active ? "#fafafa" : "#a1a1aa",
    cursor: "pointer",
    borderRadius: 6,
  };
}

export function tabShellStyle(
  active: boolean,
  hovered: boolean,
  docked: boolean,
): CSSProperties {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flex: docked ? "1 0 0" : "0 0 auto",
    minWidth: 140,
    maxWidth: 240,
    height: 32,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    background: active
      ? TERMINAL_ACTIVE_TAB_BACKGROUND
      : hovered
        ? "rgba(255, 255, 255, 0.05)"
        : "transparent",
    color: active ? "#fafafa" : "#a1a1aa",
    boxShadow: active ? "0 0 0 1px rgba(255, 255, 255, 0.02) inset" : "none",
    transition: "background 120ms ease, color 120ms ease, box-shadow 120ms ease",
  };
}

export function tabCloseButtonStyle(active: boolean, visible: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    marginRight: 6,
    border: "none",
    borderRadius: 4,
    background: "transparent",
    color: active ? "#d4d4d8" : "#71717a",
    cursor: "pointer",
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 120ms ease",
  };
}

export function TabHeaderActions(props: {
  profileMenuOpen: boolean;
  onOpenNewTab: () => void;
  onToggleProfileMenu: () => void;
}) {
  return (
    <>
      <button
        type="button"
        data-tauri-drag-region="false"
        aria-label="New terminal tab"
        title="New terminal tab"
        onClick={props.onOpenNewTab}
        style={chromeButtonStyle()}
      >
        <PlusGlyph />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        aria-label="Open terminal profile menu"
        aria-haspopup="menu"
        aria-expanded={props.profileMenuOpen}
        onClick={props.onToggleProfileMenu}
        style={chromeButtonStyle(props.profileMenuOpen)}
      >
        <ChevronGlyph direction="down" />
      </button>
    </>
  );
}

export function ChevronGlyph(props: {
  direction: "left" | "right" | "down";
}) {
  const path =
    props.direction === "left"
      ? "M10.5 3.5L5.5 8L10.5 12.5"
      : props.direction === "right"
        ? "M5.5 3.5L10.5 8L5.5 12.5"
        : "M3.5 6L8 10.5L12.5 6";

  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path
        d="M8 3.25V12.75M3.25 8H12.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CloseGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MinimizeGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
      <path d="M3 8H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MaximizeGlyph(props: {
  maximized: boolean;
}) {
  if (!props.maximized) {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
        <rect
          x="3.25"
          y="3.25"
          width="9.5"
          height="9.5"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
      <path
        d="M5.25 3.75H12.25V10.75M3.75 5.25H10.75V12.25H3.75V5.25Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function windowControlButtonStyle(intent: "default" | "danger" = "default"): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 46,
    height: "100%",
    minHeight: 38,
    border: "none",
    background: "transparent",
    color: intent === "danger" ? "#d4d4d8" : "#a1a1aa",
    cursor: "pointer",
  };
}

const windowControlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  flex: "none",
};

interface WindowControllerLike {
  isAvailable: () => Promise<boolean>;
  isMaximized: () => Promise<boolean>;
  subscribeMaximized: (listener: (maximized: boolean) => void) => Promise<() => void>;
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
}

export function DesktopWindowControls(props: {
  controller: WindowControllerLike;
}) {
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    async function bindWindowState() {
      if (!(await props.controller.isAvailable())) {
        if (active) {
          setAvailable(false);
          setIsWindowMaximized(false);
        }
        return;
      }

      try {
        const syncState = async () => {
          if (!active) {
            return;
          }

          setIsWindowMaximized(await props.controller.isMaximized());
        };

        await syncState();
        unsubscribe = await props.controller.subscribeMaximized((nextState) => {
          if (!active) {
            return;
          }

          setIsWindowMaximized(nextState);
        });

        if (active) {
          setAvailable(true);
        }
      } catch {
        if (active) {
          setAvailable(false);
          setIsWindowMaximized(false);
        }
      }
    }

    void bindWindowState();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [props.controller]);

  async function withWindowCommand(command: () => Promise<void>) {
    if (!available) {
      return;
    }

    await command();
    setIsWindowMaximized(await props.controller.isMaximized());
  }

  if (!available) {
    return null;
  }

  return (
    <div
      data-slot="terminal-window-controls"
      data-tauri-drag-region="false"
      style={windowControlsStyle}
    >
      <button
        type="button"
        data-tauri-drag-region="false"
        data-intent="default"
        aria-label="Minimize window"
        title="Minimize window"
        onClick={() => void withWindowCommand(props.controller.minimize)}
        style={windowControlButtonStyle()}
      >
        <MinimizeGlyph />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        data-intent="default"
        aria-label={isWindowMaximized ? "Restore window" : "Maximize window"}
        title={isWindowMaximized ? "Restore window" : "Maximize window"}
        onClick={() => void withWindowCommand(props.controller.toggleMaximize)}
        style={windowControlButtonStyle()}
      >
        <MaximizeGlyph maximized={isWindowMaximized} />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        data-intent="danger"
        aria-label="Close window"
        title="Close window"
        onClick={() => void withWindowCommand(props.controller.close)}
        style={windowControlButtonStyle("danger")}
      >
        <CloseGlyph />
      </button>
    </div>
  );
}
