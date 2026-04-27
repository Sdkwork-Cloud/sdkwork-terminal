import {
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { shouldDockTerminalTabActions } from "./model";
import {
  type HeaderLayoutMetrics,
  TERMINAL_HEADER_ACTION_FALLBACK_WIDTH,
  TERMINAL_HEADER_RESERVE_WIDTH,
} from "./terminal-header.tsx";
import { useShellUiEffects } from "./shell-ui-effects.ts";
import type {
  ProfileMenuPosition,
  TerminalTabContextMenuState,
} from "./terminal-overlays.tsx";

export interface UseShellChromeStateArgs {
  mode: "desktop" | "web";
  activeTabId: string;
  tabCount: number;
  profileMenuOpen: boolean;
  contextMenu: TerminalTabContextMenuState | null;
  desktopWslLaunchProfileCount: number;
  updateProfileMenuPosition: () => void;
  setProfileMenuOpen: Dispatch<SetStateAction<boolean>>;
  setProfileMenuPosition: Dispatch<SetStateAction<ProfileMenuPosition | null>>;
  setContextMenu: Dispatch<SetStateAction<TerminalTabContextMenuState | null>>;
}

export interface ShellChromeState {
  hoveredTabId: string | null;
  setHoveredTabId: Dispatch<SetStateAction<string | null>>;
  canScrollLeft: boolean;
  setCanScrollLeft: Dispatch<SetStateAction<boolean>>;
  canScrollRight: boolean;
  setCanScrollRight: Dispatch<SetStateAction<boolean>>;
  shouldDockTabActionsToTrailing: boolean;
  headerLeadingRef: MutableRefObject<HTMLDivElement | null>;
  headerChromeRef: MutableRefObject<HTMLDivElement | null>;
  profileMenuRef: MutableRefObject<HTMLDivElement | null>;
  contextMenuRef: MutableRefObject<HTMLDivElement | null>;
  tabScrollRef: MutableRefObject<HTMLDivElement | null>;
}

export function useShellChromeState(args: UseShellChromeStateArgs): ShellChromeState {
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [headerLayoutMetrics, setHeaderLayoutMetrics] = useState<HeaderLayoutMetrics>({
    leadingWidth: 0,
    tabListWidth: 0,
    actionWidth: TERMINAL_HEADER_ACTION_FALLBACK_WIDTH,
  });
  const headerLeadingRef = useRef<HTMLDivElement | null>(null);
  const headerChromeRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const tabScrollRef = useRef<HTMLDivElement | null>(null);
  const shouldDockTabActionsToTrailing = shouldDockTerminalTabActions({
    mode: args.mode,
    canScrollLeft,
    canScrollRight,
    leadingWidth: headerLayoutMetrics.leadingWidth,
    tabListWidth: headerLayoutMetrics.tabListWidth,
    actionWidth: headerLayoutMetrics.actionWidth,
    reserveWidth: TERMINAL_HEADER_RESERVE_WIDTH,
  });

  useShellUiEffects({
    profileMenuOpen: args.profileMenuOpen,
    desktopWslLaunchProfileCount: args.desktopWslLaunchProfileCount,
    shouldDockTabActionsToTrailing,
    contextMenu: args.contextMenu,
    updateProfileMenuPosition: args.updateProfileMenuPosition,
    headerChromeRef,
    profileMenuRef,
    contextMenuRef,
    tabScrollRef,
    headerLeadingRef,
    setProfileMenuOpen: args.setProfileMenuOpen,
    setProfileMenuPosition: args.setProfileMenuPosition,
    setContextMenu: args.setContextMenu,
    setCanScrollLeft,
    setCanScrollRight,
    setHeaderLayoutMetrics,
    activeTabId: args.activeTabId,
    tabCount: args.tabCount,
  });

  return {
    hoveredTabId,
    setHoveredTabId,
    canScrollLeft,
    setCanScrollLeft,
    canScrollRight,
    setCanScrollRight,
    shouldDockTabActionsToTrailing,
    headerLeadingRef,
    headerChromeRef,
    profileMenuRef,
    contextMenuRef,
    tabScrollRef,
  };
}
