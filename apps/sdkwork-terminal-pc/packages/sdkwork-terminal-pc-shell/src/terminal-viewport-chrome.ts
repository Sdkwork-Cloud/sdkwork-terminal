import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from "react";
import type { TerminalSearchRequest } from "@sdkwork/terminal-pc-infrastructure";
import type {
  TerminalClipboardProvider,
} from "./terminal-clipboard";
import type { TerminalClipboardFeedbackReporter } from "./terminal-clipboard-feedback";
import type {
  TerminalInteractionMessages,
  TerminalPasteConfirmationMessages,
  TerminalSearchOverlayMessages,
  TerminalViewportContextMenuMessages,
} from "./terminal-interaction-messages";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary";
import { useStableCallback } from "./terminal-react-stability";
import {
  createTerminalViewportActions,
  registerTerminalViewportClipboardHandlers,
  type TerminalViewportActions,
} from "./terminal-stage-shared";
import type { TerminalPasteSafetyConfirmationDecision } from "./terminal-paste-safety";
import { createTerminalViewportInteractionHandlers } from "./terminal-viewport-interaction-handlers";
import { useTerminalViewportPresentationEffects } from "./terminal-viewport-presentation-effects";
import type { TerminalSearchStatus } from "./terminal-search-overlay.tsx";

export interface UseTerminalViewportChromeArgs {
  active: boolean;
  stageKey: string;
  clipboardProvider?: TerminalClipboardProvider;
  onClipboardFeedback?: TerminalClipboardFeedbackReporter;
  terminalInteractionMessages?: Pick<
    TerminalInteractionMessages,
    "search" | "pasteConfirmation" | "viewportContextMenu"
  >;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSelectMatch: () => void;
  onRegisterViewportCopyHandler: (
    handler: (() => Promise<void>) | null,
  ) => void;
  onRegisterViewportPasteHandler: (
    handler: ((text: string) => Promise<void>) | null,
  ) => void;
  readSelection: () => Promise<string>;
  pasteTextIntoTerminal: (text: string) => Promise<void>;
  focusViewport: () => Promise<void> | void;
  selectAllTerminalViewport: () => Promise<void>;
  applyFontSize: (fontSize: number) => void;
  triggerViewportMeasurement: () => Promise<boolean> | boolean;
  runSearch: (
    query: string,
    request?: TerminalSearchRequest,
  ) => Promise<boolean | null> | boolean | null;
}

export interface TerminalViewportChromeResult {
  fontSize: number;
  stageContainerProps: {
    onKeyDownCapture: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
    onCopyCapture: (event: ReactClipboardEvent<HTMLDivElement>) => void;
    onCutCapture: (event: ReactClipboardEvent<HTMLDivElement>) => void;
    onPasteCapture: (event: ReactClipboardEvent<HTMLDivElement>) => void;
    onClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  };
  viewportSurfaceProps: {
    contextMenuRef: Ref<HTMLDivElement>;
    searchOverlayOpen: boolean;
    searchInputRef: Ref<HTMLInputElement>;
    searchMessages?: TerminalSearchOverlayMessages;
    searchQuery: string;
    searchStatus: TerminalSearchStatus;
    onSearchQueryChange: (query: string) => void;
    onSearchPrevious: () => void;
    onSearchClose: () => void;
    onSearchSubmit: () => void;
    onOpenViewportContextMenu: (menu: { x: number; y: number }) => void;
    viewportContextMenu: { x: number; y: number } | null;
    viewportContextMenuMessages?: TerminalViewportContextMenuMessages;
    onDismissViewportContextMenu: () => void;
    onRestoreViewportFocus: () => Promise<void> | void;
    pasteConfirmation: {
      decision: TerminalPasteSafetyConfirmationDecision;
      onConfirm: () => void;
      onCancel: () => void;
    } | null;
    pasteConfirmationMessages?: TerminalPasteConfirmationMessages;
    viewportActions: Pick<
      TerminalViewportActions,
      | "copySelectionToClipboard"
      | "pasteClipboardIntoTerminal"
      | "selectAllTerminalViewport"
      | "openTerminalSearch"
    >;
  };
}

interface PendingTerminalPasteConfirmation {
  resolve: (confirmed: boolean) => void;
}

export function useTerminalViewportChrome(
  args: UseTerminalViewportChromeArgs,
): TerminalViewportChromeResult {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchRequestSequenceRef = useRef(0);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const pendingPasteConfirmationRef = useRef<PendingTerminalPasteConfirmation | null>(null);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [searchStatus, setSearchStatus] = useState<TerminalSearchStatus>("idle");
  const [viewportContextMenu, setViewportContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [pasteConfirmation, setPasteConfirmation] =
    useState<TerminalPasteSafetyConfirmationDecision | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const readSelection = useStableCallback(args.readSelection);
  const pasteTextIntoTerminal = useStableCallback(args.pasteTextIntoTerminal);
  const focusViewport = useStableCallback(args.focusViewport);
  const selectAllTerminalViewport = useStableCallback(args.selectAllTerminalViewport);
  const applyFontSize = useStableCallback(args.applyFontSize);
  const triggerViewportMeasurement = useStableCallback(args.triggerViewportMeasurement);
  const runSearch = useStableCallback(args.runSearch);
  const dismissViewportContextMenu = useStableCallback(() => {
    setViewportContextMenu(null);
  });
  const openViewportContextMenu = useStableCallback((menu: { x: number; y: number }) => {
    setViewportContextMenu(menu);
  });
  const settlePasteConfirmation = useStableCallback((confirmed: boolean) => {
    const pending = pendingPasteConfirmationRef.current;
    if (!pending) {
      return;
    }

    pendingPasteConfirmationRef.current = null;
    setPasteConfirmation(null);
    pending.resolve(confirmed);
  });
  const requestPasteConfirmation = useStableCallback(
    (decision: TerminalPasteSafetyConfirmationDecision): Promise<boolean> => {
      if (pendingPasteConfirmationRef.current) {
        return Promise.resolve(false);
      }

      return new Promise((resolve) => {
        pendingPasteConfirmationRef.current = {
          resolve,
        };
        setPasteConfirmation(decision);
      });
    },
  );
  const runTerminalSearch = useStableCallback((request?: TerminalSearchRequest) => {
    const sequence = searchRequestSequenceRef.current + 1;
    searchRequestSequenceRef.current = sequence;
    if (!args.active || args.searchQuery.trim().length === 0) {
      setSearchStatus("idle");
      return;
    }

    runTerminalTaskBestEffort(
      async () => {
        const found = await runSearch(args.searchQuery, request);
        if (found === null) {
          return;
        }
        if (searchRequestSequenceRef.current === sequence) {
          setSearchStatus(found ? "match" : "no-match");
        }
      },
      undefined,
      {
        source: "terminal search",
      },
    );
  });

  useEffect(() => {
    if (!args.active) {
      settlePasteConfirmation(false);
    }
  }, [args.active, settlePasteConfirmation]);

  useEffect(() => {
    return () => {
      const pending = pendingPasteConfirmationRef.current;
      if (!pending) {
        return;
      }

      pendingPasteConfirmationRef.current = null;
      pending.resolve(false);
    };
  }, [args.stageKey]);

  const viewportActions = createTerminalViewportActions({
    clipboardProvider: args.clipboardProvider,
    onClipboardFeedback: args.onClipboardFeedback,
    readSelection,
    pasteTextIntoTerminal,
    confirmTerminalPaste: requestPasteConfirmation,
    focusTerminalViewport: focusViewport,
    selectAllTerminalViewport,
    searchOverlayOpen,
    setSearchOverlayOpen,
    searchInput: searchInputRef.current,
  });

  useEffect(() => {
    return registerTerminalViewportClipboardHandlers({
      onRegisterViewportCopyHandler: args.onRegisterViewportCopyHandler,
      onRegisterViewportPasteHandler: args.onRegisterViewportPasteHandler,
      viewportActions,
    });
  }, [
    args.clipboardProvider,
    args.onRegisterViewportCopyHandler,
    args.onRegisterViewportPasteHandler,
    args.stageKey,
  ]);

  useEffect(() => {
    searchRequestSequenceRef.current += 1;
    setSearchStatus("idle");
  }, [args.stageKey]);

  useEffect(() => {
    runTerminalSearch({
      direction: "next",
      incremental: true,
    });
  }, [args.searchQuery, args.stageKey, runTerminalSearch]);

  useTerminalViewportPresentationEffects({
    viewportContextMenuOpen: viewportContextMenu !== null,
    contextMenuRef,
    dismissViewportContextMenu,
    searchOverlayOpen,
    searchInput: searchInputRef.current,
    fontSize,
    stageKey: args.stageKey,
    active: args.active,
    applyFontSize,
    triggerViewportMeasurement,
    focusViewport,
  });

  const {
    closeTerminalSearch,
    handleTerminalStageClick,
    handleTerminalStageKeyDownCapture,
    handleTerminalStageCopyCapture,
    handleTerminalStageCutCapture,
    handleTerminalStagePasteCapture,
  } = createTerminalViewportInteractionHandlers({
    active: args.active,
    viewportActions,
    searchOverlayOpen,
    setSearchOverlayOpen,
    setFontSize,
    triggerViewportMeasurement,
    focusViewport,
  });

  return {
    fontSize,
    stageContainerProps: {
      onKeyDownCapture: handleTerminalStageKeyDownCapture,
      onCopyCapture: handleTerminalStageCopyCapture,
      onCutCapture: handleTerminalStageCutCapture,
      onPasteCapture: handleTerminalStagePasteCapture,
      onClick: handleTerminalStageClick,
    },
    viewportSurfaceProps: {
      contextMenuRef,
      searchOverlayOpen,
      searchInputRef,
      searchMessages: args.terminalInteractionMessages?.search,
      searchQuery: args.searchQuery,
      searchStatus,
      onSearchQueryChange: args.onSearchQueryChange,
      onSearchPrevious: () => {
        runTerminalSearch({
          direction: "previous",
        });
      },
      onSearchClose: closeTerminalSearch,
      onSearchSubmit: () => {
        args.onSearchSelectMatch();
        runTerminalSearch({
          direction: "next",
        });
      },
      onOpenViewportContextMenu: openViewportContextMenu,
      viewportContextMenu,
      viewportContextMenuMessages:
        args.terminalInteractionMessages?.viewportContextMenu,
      onDismissViewportContextMenu: dismissViewportContextMenu,
      onRestoreViewportFocus: focusViewport,
      pasteConfirmation: pasteConfirmation
        ? {
            decision: pasteConfirmation,
            onConfirm: () => {
              settlePasteConfirmation(true);
            },
            onCancel: () => {
              settlePasteConfirmation(false);
            },
          }
        : null,
      pasteConfirmationMessages:
        args.terminalInteractionMessages?.pasteConfirmation,
      viewportActions,
    },
  };
}

