import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type Ref,
} from "react";
import type {
  TerminalClipboardProvider,
} from "./terminal-clipboard.ts";
import { useStableCallback } from "./terminal-react-stability.ts";
import {
  createTerminalViewportActions,
  registerTerminalViewportClipboardHandlers,
  type TerminalViewportActions,
} from "./terminal-stage-shared.ts";
import { createTerminalViewportInteractionHandlers } from "./terminal-viewport-interaction-handlers.ts";
import { useTerminalViewportPresentationEffects } from "./terminal-viewport-presentation-effects.ts";

export interface UseTerminalViewportChromeArgs {
  active: boolean;
  stageKey: string;
  clipboardProvider?: TerminalClipboardProvider;
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
  runSearch: (query: string) => Promise<void> | void;
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
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    onSearchClose: () => void;
    onSearchSubmit: () => void;
    onOpenViewportContextMenu: (menu: { x: number; y: number }) => void;
    viewportContextMenu: { x: number; y: number } | null;
    onDismissViewportContextMenu: () => void;
    viewportActions: Pick<
      TerminalViewportActions,
      | "copySelectionToClipboard"
      | "pasteClipboardIntoTerminal"
      | "selectAllTerminalViewport"
      | "openTerminalSearch"
    >;
  };
}

export function useTerminalViewportChrome(
  args: UseTerminalViewportChromeArgs,
): TerminalViewportChromeResult {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [viewportContextMenu, setViewportContextMenu] = useState<{ x: number; y: number } | null>(null);
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

  const viewportActions = createTerminalViewportActions({
    clipboardProvider: args.clipboardProvider,
    readSelection,
    pasteTextIntoTerminal,
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
    void runSearch(args.searchQuery);
  }, [args.searchQuery, args.stageKey, runSearch]);

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
      searchQuery: args.searchQuery,
      onSearchQueryChange: args.onSearchQueryChange,
      onSearchClose: closeTerminalSearch,
      onSearchSubmit: () => {
        args.onSearchSelectMatch();
        void runSearch(args.searchQuery);
      },
      onOpenViewportContextMenu: openViewportContextMenu,
      viewportContextMenu,
      onDismissViewportContextMenu: dismissViewportContextMenu,
      viewportActions,
    },
  };
}
