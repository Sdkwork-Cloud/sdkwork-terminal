import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { HeaderLayoutMetrics } from "./terminal-header.tsx";
import {
  measureTerminalHeaderLayoutMetrics,
  syncTabScrollState,
} from "./terminal-header.tsx";
import type {
  ProfileMenuPosition,
  TerminalTabContextMenuState,
} from "./terminal-overlays.tsx";

interface MutableRefObjectLike<T> {
  current: T;
}

export function useShellUiEffects(args: {
  profileMenuOpen: boolean;
  desktopWslLaunchProfileCount: number;
  shouldDockTabActionsToTrailing: boolean;
  updateProfileMenuPosition: () => void;
  headerChromeRef: MutableRefObjectLike<HTMLDivElement | null>;
  profileMenuRef: MutableRefObjectLike<HTMLDivElement | null>;
  contextMenuRef: MutableRefObjectLike<HTMLDivElement | null>;
  tabScrollRef: MutableRefObjectLike<HTMLDivElement | null>;
  headerLeadingRef: MutableRefObjectLike<HTMLDivElement | null>;
  setProfileMenuOpen: (open: boolean) => void;
  setProfileMenuPosition: (position: ProfileMenuPosition | null) => void;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  setCanScrollLeft: (value: boolean) => void;
  setCanScrollRight: (value: boolean) => void;
  setHeaderLayoutMetrics: Dispatch<SetStateAction<HeaderLayoutMetrics>>;
  activeTabId: string;
  tabCount: number;
}) {
  useEffect(() => {
    if (!args.profileMenuOpen) {
      return;
    }

    args.updateProfileMenuPosition();
  }, [args.desktopWslLaunchProfileCount, args.profileMenuOpen]);

  useEffect(() => {
    if (!args.profileMenuOpen) {
      return;
    }

    const syncProfileMenuPosition = () => {
      args.updateProfileMenuPosition();
    };

    syncProfileMenuPosition();
    window.addEventListener("resize", syncProfileMenuPosition);
    window.addEventListener("scroll", syncProfileMenuPosition, true);

    return () => {
      window.removeEventListener("resize", syncProfileMenuPosition);
      window.removeEventListener("scroll", syncProfileMenuPosition, true);
    };
  }, [args.profileMenuOpen, args.shouldDockTabActionsToTrailing]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !args.headerChromeRef.current?.contains(target) &&
        !args.profileMenuRef.current?.contains(target)
      ) {
        args.setProfileMenuOpen(false);
        args.setProfileMenuPosition(null);
      }

      if (!args.contextMenuRef.current?.contains(target)) {
        args.setContextMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    syncTabScrollState(args.tabScrollRef.current, args.setCanScrollLeft, args.setCanScrollRight);

    const container = args.tabScrollRef.current;
    const leading = args.headerLeadingRef.current;
    if (!container || !leading) {
      return;
    }

    const syncHeaderLayout = () => {
      syncTabScrollState(container, args.setCanScrollLeft, args.setCanScrollRight);
      const nextMetrics = measureTerminalHeaderLayoutMetrics({
        container,
        leading,
        chrome: args.headerChromeRef.current,
        docked: args.shouldDockTabActionsToTrailing,
      });

      args.setHeaderLayoutMetrics((current) =>
        current.leadingWidth === nextMetrics.leadingWidth &&
        current.tabListWidth === nextMetrics.tabListWidth &&
        current.actionWidth === nextMetrics.actionWidth
          ? current
          : nextMetrics,
      );
    };

    syncHeaderLayout();

    const resizeObserver = new ResizeObserver(() => {
      syncHeaderLayout();
    });
    resizeObserver.observe(container);
    resizeObserver.observe(leading);
    if (args.headerChromeRef.current) {
      resizeObserver.observe(args.headerChromeRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [args.shouldDockTabActionsToTrailing, args.tabCount]);

  useEffect(() => {
    const container = args.tabScrollRef.current;
    if (!container) {
      return;
    }

    const activeElement = container.querySelector(
      `[data-terminal-tab-id="${args.activeTabId}"]`,
    );
    if (activeElement instanceof HTMLElement) {
      activeElement.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
    }

    syncTabScrollState(container, args.setCanScrollLeft, args.setCanScrollRight);
  }, [args.activeTabId, args.tabCount]);
}
