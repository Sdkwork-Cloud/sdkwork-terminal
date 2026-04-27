import { forwardRef, type CSSProperties } from "react";
import {
  ProfileMenuStatusItem,
  type ProfileMenuDescriptor,
} from "./profile-menu.tsx";

const PROFILE_MENU_WIDTH = 280;
const PROFILE_MENU_VIEWPORT_INSET = 8;
const PROFILE_MENU_VERTICAL_OFFSET = 6;
const PROFILE_MENU_ESTIMATED_HEIGHT = 360;
const TERMINAL_MENU_BACKGROUND = "rgba(22, 24, 27, 0.98)";

export interface ProfileMenuPosition {
  top: number;
  left: number;
  maxHeight: number;
}

export interface TerminalTabContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

export interface ConnectorCatalogStatusLike {
  state: "empty" | "ready" | "stale" | "error";
  message?: string | null;
}

export function resolveProfileMenuPosition(anchor: HTMLElement | null): ProfileMenuPosition | null {
  if (!anchor || typeof window === "undefined") {
    return null;
  }

  const rect = anchor.getBoundingClientRect();
  const availableBelow =
    window.innerHeight - rect.bottom - PROFILE_MENU_VERTICAL_OFFSET - PROFILE_MENU_VIEWPORT_INSET;
  const availableAbove =
    rect.top - PROFILE_MENU_VERTICAL_OFFSET - PROFILE_MENU_VIEWPORT_INSET;
  const openAbove =
    availableBelow < Math.min(PROFILE_MENU_ESTIMATED_HEIGHT, availableAbove);
  const maxHeight = Math.max(1, openAbove ? availableAbove : availableBelow);
  const top = openAbove
    ? Math.max(
        PROFILE_MENU_VIEWPORT_INSET,
        rect.top - PROFILE_MENU_VERTICAL_OFFSET - maxHeight,
      )
    : Math.min(
        rect.bottom + PROFILE_MENU_VERTICAL_OFFSET,
        window.innerHeight - PROFILE_MENU_VIEWPORT_INSET - maxHeight,
      );
  const maxLeft = Math.max(
    PROFILE_MENU_VIEWPORT_INSET,
    window.innerWidth - PROFILE_MENU_WIDTH - PROFILE_MENU_VIEWPORT_INSET,
  );
  const left = Math.min(
    Math.max(PROFILE_MENU_VIEWPORT_INSET, rect.right - PROFILE_MENU_WIDTH),
    maxLeft,
  );

  return {
    top,
    left,
    maxHeight,
  };
}

function describeConnectorCatalogStatus(
  status: ConnectorCatalogStatusLike,
): ProfileMenuDescriptor {
  if (status.state === "stale") {
    return {
      title: "Connectors (stale)",
      subtitle: status.message
        ? `Using last known targets. ${status.message}`
        : "Using last known targets until runtime catalog refresh succeeds.",
      accent: "#f59e0b",
    };
  }

  if (status.state === "error") {
    return {
      title: "Connectors unavailable",
      subtitle: status.message ?? "Failed to load runtime catalog from desktop host.",
      accent: "#ef4444",
    };
  }

  return {
    title: "No connectors discovered",
    subtitle: status.message ?? "Runtime catalog is empty. Verify host discovery and permissions.",
    accent: "#94a3b8",
  };
}

export function ConnectorCatalogStatusMenuItem(props: {
  status: ConnectorCatalogStatusLike;
}) {
  const descriptor = describeConnectorCatalogStatus(props.status);

  return (
    <ProfileMenuStatusItem
      descriptor={descriptor}
      slot="terminal-connector-catalog-status"
    />
  );
}

function contextMenuStyle(menu: TerminalTabContextMenuState): CSSProperties {
  return {
    position: "fixed",
    top: menu.y,
    left: menu.x,
    zIndex: 40,
    display: "grid",
    gap: 2,
    minWidth: 196,
    maxHeight: "calc(100vh - 16px)",
    overflowY: "auto",
    padding: 6,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    background: TERMINAL_MENU_BACKGROUND,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
  };
}

function contextMenuItemStyle(disabled = false): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    padding: "10px 12px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: disabled ? "#71717a" : "#e4e4e7",
    cursor: disabled ? "default" : "pointer",
    textAlign: "left",
    fontSize: 12,
  };
}

const contextMenuDividerStyle: CSSProperties = {
  height: 1,
  margin: "2px 6px",
  background: "rgba(255, 255, 255, 0.08)",
};

export const TerminalTabContextMenu = forwardRef<HTMLDivElement, {
  menu: TerminalTabContextMenuState;
  onCopy: () => void;
  onPaste: () => void;
  canCloseTab: boolean;
  canCloseOtherTabs: boolean;
  canCloseTabsToRight: boolean;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseTabsToRight: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
}>(function TerminalTabContextMenu(props, ref) {
  return (
    <div
      ref={ref}
      data-slot="terminal-tab-context-menu"
      role="menu"
      aria-label="Terminal tab actions"
      style={contextMenuStyle(props.menu)}
    >
      <button
        type="button"
        role="menuitem"
        onClick={props.onCopy}
        style={contextMenuItemStyle()}
      >
        Copy selection
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={props.onPaste}
        style={contextMenuItemStyle()}
      >
        Paste
      </button>
      <div style={contextMenuDividerStyle} />
      <button
        type="button"
        role="menuitem"
        disabled={!props.canCloseTab}
        onClick={() => props.onCloseTab(props.menu.tabId)}
        style={contextMenuItemStyle(!props.canCloseTab)}
      >
        Close tab
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!props.canCloseOtherTabs}
        onClick={() => props.onCloseOtherTabs(props.menu.tabId)}
        style={contextMenuItemStyle(!props.canCloseOtherTabs)}
      >
        Close other tabs
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!props.canCloseTabsToRight}
        onClick={() => props.onCloseTabsToRight(props.menu.tabId)}
        style={contextMenuItemStyle(!props.canCloseTabsToRight)}
      >
        Close tabs to the right
      </button>
      <div style={contextMenuDividerStyle} />
      <button
        type="button"
        role="menuitem"
        onClick={() => props.onDuplicateTab(props.menu.tabId)}
        style={contextMenuItemStyle()}
      >
        Duplicate tab
      </button>
    </div>
  );
});
