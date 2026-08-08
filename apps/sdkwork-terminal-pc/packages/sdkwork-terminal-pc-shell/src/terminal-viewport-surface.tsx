import type { Ref } from "react";
import {
  terminalViewportStyle,
  type TerminalViewportActions,
} from "./terminal-stage-shared";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary";
import { TerminalHostStatusOverlay } from "./terminal-host-status-overlay.tsx";
import { TerminalPasteConfirmationDialog } from "./terminal-paste-confirmation-dialog.tsx";
import {
  TerminalSearchOverlay,
  type TerminalSearchStatus,
} from "./terminal-search-overlay.tsx";
import { TerminalViewportContextMenu } from "./terminal-viewport-context-menu.tsx";
import type {
  TerminalPasteConfirmationMessages,
  TerminalSearchOverlayMessages,
  TerminalViewportContextMenuMessages,
} from "./terminal-interaction-messages";
import type { TerminalPasteSafetyConfirmationDecision } from "./terminal-paste-safety";

export interface TerminalViewportSurfaceProps {
  hostRef?: Ref<HTMLDivElement>;
  hostDataSlot?: string;
  contextMenuRef?: Ref<HTMLDivElement>;
  searchOverlayOpen: boolean;
  searchInputRef?: Ref<HTMLInputElement>;
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
  hostStatus: {
    title: string;
    detail: string;
    warning?: boolean;
    onRetry?: () => void;
  } | null;
  onClearTerminal?: () => void;
}

export function TerminalViewportSurface(props: TerminalViewportSurfaceProps) {
  return (
    <>
      {props.searchOverlayOpen ? (
        <TerminalSearchOverlay
          inputRef={props.searchInputRef}
          messages={props.searchMessages}
          query={props.searchQuery}
          status={props.searchStatus}
          onQueryChange={props.onSearchQueryChange}
          onPrevious={props.onSearchPrevious}
          onClose={props.onSearchClose}
          onSubmit={props.onSearchSubmit}
        />
      ) : null}

      <div
        ref={props.hostRef}
        data-slot={props.hostDataSlot}
        style={terminalViewportStyle}
        onContextMenu={(event) => {
          event.preventDefault();
          props.onOpenViewportContextMenu({ x: event.clientX, y: event.clientY });
        }}
      />

      {props.hostStatus ? (
        <TerminalHostStatusOverlay
          title={props.hostStatus.title}
          detail={props.hostStatus.detail}
          warning={props.hostStatus.warning}
          onRetry={props.hostStatus.onRetry}
        />
      ) : null}

      {props.viewportContextMenu ? (
        <TerminalViewportContextMenu
          menuRef={props.contextMenuRef}
          menu={props.viewportContextMenu}
          messages={props.viewportContextMenuMessages}
          onRequestClose={props.onDismissViewportContextMenu}
          onRestoreFocus={props.onRestoreViewportFocus}
          onCopy={() => {
            runTerminalTaskBestEffort(
              props.viewportActions.copySelectionToClipboard,
            );
          }}
          onPaste={() => {
            runTerminalTaskBestEffort(
              props.viewportActions.pasteClipboardIntoTerminal,
            );
          }}
          onSelectAll={() => {
            runTerminalTaskBestEffort(
              props.viewportActions.selectAllTerminalViewport,
            );
          }}
          onFind={() => { props.viewportActions.openTerminalSearch(); }}
          onClearTerminal={props.onClearTerminal}
        />
      ) : null}

      {props.pasteConfirmation ? (
        <TerminalPasteConfirmationDialog
          decision={props.pasteConfirmation.decision}
          messages={props.pasteConfirmationMessages}
          onConfirm={props.pasteConfirmation.onConfirm}
          onCancel={props.pasteConfirmation.onCancel}
        />
      ) : null}
    </>
  );
}

