import type {
  ClipboardEvent as ReactClipboardEvent,
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
} from "react";
import {
  isTerminalCopyShortcut,
  isTerminalInsertCopyShortcut,
  isTerminalInsertPasteShortcut,
  isTerminalPasteShortcut,
  isTerminalSearchShortcut,
  isTerminalSelectAllShortcut,
  resolveNextTerminalViewportFontSize,
  resolveTerminalViewportFontSizeShortcutAction,
  shouldIgnoreTerminalViewportInteractionTarget,
  type TerminalViewportActions,
} from "./terminal-stage-shared.ts";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";

export interface CreateTerminalViewportInteractionHandlersArgs {
  active: boolean;
  viewportActions: Pick<
    TerminalViewportActions,
    | "copySelectionToClipboard"
    | "pasteTextIntoTerminal"
    | "pasteClipboardIntoTerminal"
    | "selectAllTerminalViewport"
    | "openTerminalSearch"
  >;
  searchOverlayOpen: boolean;
  setSearchOverlayOpen: (open: boolean) => void;
  setFontSize: Dispatch<SetStateAction<number>>;
  triggerViewportMeasurement: () => Promise<boolean> | boolean;
  focusViewport: () => Promise<void> | void;
}

export function createTerminalViewportInteractionHandlers(
  args: CreateTerminalViewportInteractionHandlersArgs,
) {
  function closeTerminalSearch() {
    args.setSearchOverlayOpen(false);
    runTerminalTaskBestEffort(async () => {
      await args.triggerViewportMeasurement();
      await args.focusViewport();
    });
  }

  function handleTerminalStageKeyDownCapture(
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (!args.active) {
      return;
    }

    const target = event.target;
    if (shouldIgnoreTerminalViewportInteractionTarget(target)) {
      return;
    }

    if (args.searchOverlayOpen && event.key === "Escape") {
      event.preventDefault();
      closeTerminalSearch();
      return;
    }

    if (isTerminalSearchShortcut(event)) {
      event.preventDefault();
      args.viewportActions.openTerminalSearch();
      return;
    }

    if (isTerminalCopyShortcut(event) || isTerminalInsertCopyShortcut(event)) {
      event.preventDefault();
      runTerminalTaskBestEffort(
        args.viewportActions.copySelectionToClipboard,
      );
      return;
    }

    if (isTerminalPasteShortcut(event) || isTerminalInsertPasteShortcut(event)) {
      event.preventDefault();
      runTerminalTaskBestEffort(
        args.viewportActions.pasteClipboardIntoTerminal,
      );
      return;
    }

    if (isTerminalSelectAllShortcut(event)) {
      event.preventDefault();
      runTerminalTaskBestEffort(
        args.viewportActions.selectAllTerminalViewport,
      );
      return;
    }

    const fontSizeAction = resolveTerminalViewportFontSizeShortcutAction(event);
    if (fontSizeAction === null) {
      return;
    }

    event.preventDefault();
    args.setFontSize((previous) => resolveNextTerminalViewportFontSize(previous, fontSizeAction));
  }

  function handleTerminalStageClick(
    event: ReactMouseEvent<HTMLDivElement>,
  ) {
    if (shouldIgnoreTerminalViewportInteractionTarget(event.target)) {
      return;
    }

    runTerminalTaskBestEffort(args.focusViewport);
  }

  function handleTerminalStageCopyCapture(
    event: ReactClipboardEvent<HTMLDivElement>,
  ) {
    if (!args.active) {
      return;
    }

    if (shouldIgnoreTerminalViewportInteractionTarget(event.target)) {
      return;
    }

    event.preventDefault();
    runTerminalTaskBestEffort(
      args.viewportActions.copySelectionToClipboard,
    );
  }

  function handleTerminalStagePasteCapture(
    event: ReactClipboardEvent<HTMLDivElement>,
  ) {
    if (!args.active) {
      return;
    }

    if (shouldIgnoreTerminalViewportInteractionTarget(event.target)) {
      return;
    }

    event.preventDefault();
    const pastedText = event.clipboardData.getData("text");
    if (pastedText.length > 0) {
      runTerminalTaskBestEffort(() =>
        args.viewportActions.pasteTextIntoTerminal(pastedText),
      );
      return;
    }

    runTerminalTaskBestEffort(
      args.viewportActions.pasteClipboardIntoTerminal,
    );
  }

  function handleTerminalStageCutCapture(
    event: ReactClipboardEvent<HTMLDivElement>,
  ) {
    if (!args.active) {
      return;
    }

    if (shouldIgnoreTerminalViewportInteractionTarget(event.target)) {
      return;
    }

    event.preventDefault();
    runTerminalTaskBestEffort(
      args.viewportActions.copySelectionToClipboard,
    );
  }

  return {
    closeTerminalSearch,
    handleTerminalStageKeyDownCapture,
    handleTerminalStageClick,
    handleTerminalStageCopyCapture,
    handleTerminalStageCutCapture,
    handleTerminalStagePasteCapture,
  };
}
