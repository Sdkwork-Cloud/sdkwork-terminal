import { useEffect, type RefObject } from "react";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
import { focusTerminalSearchInput } from "./terminal-stage-shared";

const TERMINAL_VIEWPORT_METRICS_EVENT = "sdkwork-terminal:viewport-metrics-changed";

export interface UseTerminalViewportPresentationEffectsArgs {
  viewportContextMenuOpen: boolean;
  contextMenuRef: RefObject<HTMLDivElement | null>;
  dismissViewportContextMenu: () => void;
  searchOverlayOpen: boolean;
  searchInput: HTMLInputElement | null;
  fontSize: number;
  stageKey: string;
  active: boolean;
  applyFontSize: (fontSize: number) => void;
  triggerViewportMeasurement: () => Promise<boolean> | boolean;
  focusViewport: () => Promise<void> | void;
}

export function useTerminalViewportPresentationEffects(
  args: UseTerminalViewportPresentationEffectsArgs,
) {
  useEffect(() => {
    if (!args.viewportContextMenuOpen) {
      return;
    }

    const dismissViewportContextMenu = (event: MouseEvent) => {
      if (args.contextMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      args.dismissViewportContextMenu();
    };
    const dismissViewportContextMenuFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      args.dismissViewportContextMenu();
    };

    document.addEventListener("mousedown", dismissViewportContextMenu);
    document.addEventListener("keydown", dismissViewportContextMenuFromKeyboard);
    return () => {
      document.removeEventListener("mousedown", dismissViewportContextMenu);
      document.removeEventListener("keydown", dismissViewportContextMenuFromKeyboard);
    };
  }, [args.contextMenuRef, args.dismissViewportContextMenu, args.viewportContextMenuOpen]);

  useEffect(() => {
    if (!args.active) {
      return;
    }

    runTerminalTaskBestEffort(async () => {
      args.applyFontSize(args.fontSize);
      await args.triggerViewportMeasurement();
    });
  }, [args.active, args.applyFontSize, args.fontSize, args.stageKey, args.triggerViewportMeasurement]);

  useEffect(() => {
    if (!args.active || args.searchOverlayOpen) {
      return;
    }

    runTerminalTaskBestEffort(async () => {
      await args.triggerViewportMeasurement();
      await args.focusViewport();
    });
  }, [
    args.active,
    args.focusViewport,
    args.searchOverlayOpen,
    args.stageKey,
    args.triggerViewportMeasurement,
  ]);

  useEffect(() => {
    if (!args.active || typeof document === "undefined" || !("fonts" in document)) {
      return;
    }

    let cancelled = false;
    const documentFonts = document.fonts;
    const syncViewportToLoadedFonts = () => {
      if (cancelled) {
        return;
      }

      runTerminalTaskBestEffort(async () => {
        await args.triggerViewportMeasurement();
        if (!cancelled && !args.searchOverlayOpen) {
          await args.focusViewport();
        }
      });
    };

    runTerminalTaskBestEffort(async () => {
      await documentFonts.ready;
      syncViewportToLoadedFonts();
    });

    const handleLoadingDone = () => {
      syncViewportToLoadedFonts();
    };
    documentFonts.addEventListener?.("loadingdone", handleLoadingDone);

    return () => {
      cancelled = true;
      documentFonts.removeEventListener?.("loadingdone", handleLoadingDone);
    };
  }, [
    args.active,
    args.focusViewport,
    args.searchOverlayOpen,
    args.stageKey,
    args.triggerViewportMeasurement,
  ]);

  useEffect(() => {
    if (!args.active || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    let cancelled = false;
    const syncViewportToForeground = () => {
      if (cancelled || args.searchOverlayOpen) {
        return;
      }

      runTerminalTaskBestEffort(async () => {
        await args.triggerViewportMeasurement();
        if (
          !cancelled &&
          document.visibilityState !== "hidden" &&
          !args.searchOverlayOpen
        ) {
          await args.focusViewport();
        }
      });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncViewportToForeground();
      }
    };

    window.addEventListener("focus", syncViewportToForeground);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", syncViewportToForeground);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    args.active,
    args.focusViewport,
    args.searchOverlayOpen,
    args.stageKey,
    args.triggerViewportMeasurement,
  ]);

  useEffect(() => {
    if (!args.active || typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    let animationFrameHandle: number | null = null;
    const cancelPendingViewportMetricsSync = () => {
      if (animationFrameHandle === null) {
        return;
      }

      window.cancelAnimationFrame(animationFrameHandle);
      animationFrameHandle = null;
    };
    const syncViewportMetrics = () => {
      if (cancelled) {
        return;
      }

      cancelPendingViewportMetricsSync();
      animationFrameHandle = window.requestAnimationFrame(() => {
        animationFrameHandle = null;
        if (cancelled) {
          return;
        }

        runTerminalTaskBestEffort(
          args.triggerViewportMeasurement,
        );
      });
    };

    window.addEventListener("resize", syncViewportMetrics);
    window.addEventListener(TERMINAL_VIEWPORT_METRICS_EVENT, syncViewportMetrics);
    window.visualViewport?.addEventListener("resize", syncViewportMetrics);

    return () => {
      cancelled = true;
      cancelPendingViewportMetricsSync();
      window.removeEventListener("resize", syncViewportMetrics);
      window.removeEventListener(TERMINAL_VIEWPORT_METRICS_EVENT, syncViewportMetrics);
      window.visualViewport?.removeEventListener("resize", syncViewportMetrics);
    };
  }, [
    args.active,
    args.stageKey,
    args.triggerViewportMeasurement,
  ]);

  useEffect(() => {
    if (!args.active || !args.searchOverlayOpen) {
      return;
    }

    focusTerminalSearchInput(args.searchInput);
  }, [args.active, args.searchInput, args.searchOverlayOpen, args.stageKey]);
}
