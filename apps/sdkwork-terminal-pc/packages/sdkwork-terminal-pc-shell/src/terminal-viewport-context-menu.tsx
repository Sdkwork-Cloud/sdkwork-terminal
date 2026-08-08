import {
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type Ref,
} from "react";
import {
  contextMenuDividerStyle,
  createViewportContextMenuStyle,
  resolveTerminalViewportShortcutHint,
  shortcutHintStyle,
  viewportContextMenuItemStyle,
} from "./terminal-stage-shared";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary";
import {
  focusFirstTerminalMenuItem,
  moveTerminalMenuFocus,
  resolveTerminalMenuKeyboardAction,
} from "./terminal-menu-keyboard";
import { terminalViewportContextMenuMessagesEnUS } from "./i18n/en-US/device/shell/terminal-viewport-context-menu";
import type { TerminalViewportContextMenuMessages } from "./terminal-interaction-messages";

export interface TerminalViewportContextMenuProps {
  menuRef?: Ref<HTMLDivElement>;
  messages?: TerminalViewportContextMenuMessages;
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
  onRestoreFocus: () => Promise<void> | void;
}

function renderViewportActionButton(args: {
  key?: string;
  label: string;
  shortcut?: "copy" | "paste" | "selectAll" | "find";
  onSelect: () => void;
  onRequestClose: () => void;
  onRestoreFocus: () => Promise<void> | void;
}) {
  return (
    <button
      key={args.key}
      type="button"
      role="menuitem"
      tabIndex={-1}
      onClick={() => {
        args.onSelect();
        args.onRequestClose();
        runTerminalTaskBestEffort(args.onRestoreFocus);
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
  const messages = props.messages ?? terminalViewportContextMenuMessagesEnUS;

  useEffect(() => {
    const menu =
      props.menuRef && typeof props.menuRef === "object"
        ? props.menuRef.current
        : null;
    if (!menu || typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      focusFirstTerminalMenuItem(menu);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [props.menuRef]);

  function closeMenuAndRestoreFocus() {
    props.onRequestClose();
    runTerminalTaskBestEffort(props.onRestoreFocus);
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const action = resolveTerminalMenuKeyboardAction(event.key);
    if (!action) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (action === "close") {
      closeMenuAndRestoreFocus();
      return;
    }

    moveTerminalMenuFocus({
      container: event.currentTarget,
      action,
    });
  }

  const clearTerminalItems: ReactElement[] = [];
  if (props.onClearTerminal) {
    clearTerminalItems.push(
      <div key="clear-divider" style={contextMenuDividerStyle} />,
      renderViewportActionButton({
        key: "clear-action",
        label: messages.clearTerminalActionLabel,
        onSelect: props.onClearTerminal,
        onRequestClose: props.onRequestClose,
        onRestoreFocus: props.onRestoreFocus,
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
      data-slot="terminal-viewport-context-menu"
      role="menu"
      aria-label={messages.menuAriaLabel}
      onKeyDown={handleMenuKeyDown}
      style={createViewportContextMenuStyle(props.menu)}
    >
      {renderViewportActionButton({
        label: messages.copyActionLabel,
        shortcut: "copy",
        onSelect: props.onCopy,
        onRequestClose: props.onRequestClose,
        onRestoreFocus: props.onRestoreFocus,
      })}
      {renderViewportActionButton({
        label: messages.pasteActionLabel,
        shortcut: "paste",
        onSelect: props.onPaste,
        onRequestClose: props.onRequestClose,
        onRestoreFocus: props.onRestoreFocus,
      })}
      {renderViewportActionButton({
        label: messages.selectAllActionLabel,
        shortcut: "selectAll",
        onSelect: props.onSelectAll,
        onRequestClose: props.onRequestClose,
        onRestoreFocus: props.onRestoreFocus,
      })}
      {clearTerminalItems}
      {renderViewportActionButton({
        label: messages.findActionLabel,
        shortcut: "find",
        onSelect: props.onFind,
        onRequestClose: props.onRequestClose,
        onRestoreFocus: props.onRestoreFocus,
      })}
    </div>
  );
}

