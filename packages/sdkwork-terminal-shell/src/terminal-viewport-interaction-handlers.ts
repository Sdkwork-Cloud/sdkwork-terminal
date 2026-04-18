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
    void (async () => {
      await args.triggerViewportMeasurement();
      await args.focusViewport();
    })();
  }

  function handleTerminalStageKeyDownCapture(
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (!args.active) {
      return;
    }

    const target = event.target;
    if (isTerminalSearchShortcut(event)) {
      event.preventDefault();
      args.viewportActions.openTerminalSearch();
      return;
    }

    if (shouldIgnoreTerminalViewportInteractionTarget(target)) {
      return;
    }

    if (isTerminalCopyShortcut(event) || isTerminalInsertCopyShortcut(event)) {
      event.preventDefault();
      void args.viewportActions.copySelectionToClipboard();
      return;
    }

    if (isTerminalPasteShortcut(event) || isTerminalInsertPasteShortcut(event)) {
      event.preventDefault();
      void args.viewportActions.pasteClipboardIntoTerminal();
      return;
    }

    if (isTerminalSelectAllShortcut(event)) {
      event.preventDefault();
      void args.viewportActions.selectAllTerminalViewport();
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

    void args.focusViewport();
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
    void args.viewportActions.copySelectionToClipboard();
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
      void args.viewportActions.pasteTextIntoTerminal(pastedText);
      return;
    }

    void args.viewportActions.pasteClipboardIntoTerminal();
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
    void args.viewportActions.copySelectionToClipboard();
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
