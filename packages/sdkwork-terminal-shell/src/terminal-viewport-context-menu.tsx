import type { Ref } from "react";
import {
  contextMenuDividerStyle,
  createViewportContextMenuStyle,
  resolveTerminalViewportShortcutHint,
  shortcutHintStyle,
  viewportContextMenuItemStyle,
} from "./terminal-stage-shared.ts";

export interface TerminalViewportContextMenuProps {
  menuRef?: Ref<HTMLDivElement>;
  menu: {
    x: number;
    y: number;
  };
  onRequestClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onFind: () => void;
  onClearTerminal?: () => void;
}

function renderViewportActionButton(args: {
  label: string;
  shortcut?: "copy" | "paste" | "selectAll" | "find";
  onSelect: () => void;
  onRequestClose: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        args.onSelect();
        args.onRequestClose();
      }}
      style={viewportContextMenuItemStyle}
    >
      {args.label}
      {args.shortcut ? (
        <span style={shortcutHintStyle}>{resolveTerminalViewportShortcutHint(args.shortcut)}</span>
      ) : null}
    </button>
  );
}

export function TerminalViewportContextMenu(props: TerminalViewportContextMenuProps) {
  const clearTerminalItems: JSX.Element[] = [];
  if (props.onClearTerminal) {
    clearTerminalItems.push(
      <div key="clear-divider" style={contextMenuDividerStyle} />,
      renderViewportActionButton({
        label: "Clear Terminal",
        onSelect: props.onClearTerminal,
        onRequestClose: props.onRequestClose,
      }),
    );
  } else {
    clearTerminalItems.push(
      <div key="find-divider" style={contextMenuDividerStyle} />,
    );
  }

  return (
    <div
      ref={props.menuRef}
      role="menu"
      aria-label="Terminal actions"
      style={createViewportContextMenuStyle(props.menu)}
    >
      {renderViewportActionButton({
        label: "Copy",
        shortcut: "copy",
        onSelect: props.onCopy,
        onRequestClose: props.onRequestClose,
      })}
      {renderViewportActionButton({
        label: "Paste",
        shortcut: "paste",
        onSelect: props.onPaste,
        onRequestClose: props.onRequestClose,
      })}
      {renderViewportActionButton({
        label: "Select all",
        shortcut: "selectAll",
        onSelect: props.onSelectAll,
        onRequestClose: props.onRequestClose,
      })}
      {clearTerminalItems}
      {renderViewportActionButton({
        label: "Find",
        shortcut: "find",
        onSelect: props.onFind,
        onRequestClose: props.onRequestClose,
      })}
    </div>
  );
}
