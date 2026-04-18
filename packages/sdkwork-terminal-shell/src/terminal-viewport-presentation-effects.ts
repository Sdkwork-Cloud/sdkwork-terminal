import { useEffect, type RefObject } from "react";
import { focusTerminalSearchInput } from "./terminal-stage-shared";

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

    document.addEventListener("mousedown", dismissViewportContextMenu);
    return () => {
      document.removeEventListener("mousedown", dismissViewportContextMenu);
    };
  }, [args.contextMenuRef, args.dismissViewportContextMenu, args.viewportContextMenuOpen]);

  useEffect(() => {
    if (!args.active) {
      return;
    }

    void (async () => {
      args.applyFontSize(args.fontSize);
      await args.triggerViewportMeasurement();
    })();
  }, [args.active, args.applyFontSize, args.fontSize, args.stageKey, args.triggerViewportMeasurement]);

  useEffect(() => {
    if (!args.active || args.searchOverlayOpen) {
      return;
    }

    void (async () => {
      await args.triggerViewportMeasurement();
      await args.focusViewport();
    })();
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

      void (async () => {
        await args.triggerViewportMeasurement();
        if (!cancelled && !args.searchOverlayOpen) {
          await args.focusViewport();
        }
      })();
    };

    void documentFonts.ready.then(() => {
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
    if (!args.active || !args.searchOverlayOpen) {
      return;
    }

    focusTerminalSearchInput(args.searchInput);
  }, [args.active, args.searchInput, args.searchOverlayOpen, args.stageKey]);
}
