import type { Ref } from "react";
import {
  terminalViewportStyle,
  type TerminalViewportActions,
} from "./terminal-stage-shared";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
import { TerminalHostStatusOverlay } from "./terminal-host-status-overlay.tsx";
import { TerminalSearchOverlay } from "./terminal-search-overlay.tsx";
import { TerminalViewportContextMenu } from "./terminal-viewport-context-menu.tsx";

export interface TerminalViewportSurfaceProps {
  hostRef?: Ref<HTMLDivElement>;
  hostDataSlot?: string;
  contextMenuRef?: Ref<HTMLDivElement>;
  searchOverlayOpen: boolean;
  searchInputRef?: Ref<HTMLInputElement>;
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
          query={props.searchQuery}
          onQueryChange={props.onSearchQueryChange}
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
          onRequestClose={props.onDismissViewportContextMenu}
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
    </>
  );
}
