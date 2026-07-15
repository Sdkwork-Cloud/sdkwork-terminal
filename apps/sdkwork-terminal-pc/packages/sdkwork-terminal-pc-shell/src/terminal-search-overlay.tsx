import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
} from "react";
import { terminalSearchOverlayMessagesEnUS } from "./i18n/en-US/device/shell/terminal-search-overlay.ts";
import type { TerminalSearchOverlayMessages } from "./terminal-interaction-messages.ts";
import {
  terminalSearchActionGroupStyle,
  terminalSearchCloseButtonStyle,
  terminalSearchInputStyle,
  terminalSearchNavigationButtonStyle,
  terminalSearchNoMatchStatusStyle,
  terminalSearchOverlayStyle,
  terminalSearchPanelStyle,
  terminalSearchStatusStyle,
} from "./terminal-stage-shared";

export type TerminalSearchStatus = "idle" | "match" | "no-match";

export interface TerminalSearchOverlayProps {
  inputRef?: Ref<HTMLInputElement>;
  messages?: TerminalSearchOverlayMessages;
  query: string;
  status: TerminalSearchStatus;
  onQueryChange: (query: string) => void;
  onPrevious: () => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function TerminalSearchOverlay(props: TerminalSearchOverlayProps) {
  const messages = props.messages ?? terminalSearchOverlayMessagesEnUS;

  function handleSearchInputChange(event: ChangeEvent<HTMLInputElement>) {
    props.onQueryChange(event.target.value);
  }

  function handleSearchInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
      return;
    }

    if (event.key === "F3") {
      event.preventDefault();
      if (event.shiftKey) {
        props.onPrevious();
      } else {
        props.onSubmit();
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        props.onPrevious();
      } else {
        props.onSubmit();
      }
    }
  }

  const statusLabel =
    props.status === "match"
      ? messages.matchFoundStatus
      : props.status === "no-match"
        ? messages.noMatchesStatus
        : "";

  return (
    <div data-slot="terminal-search-overlay" style={terminalSearchOverlayStyle}>
      <div style={terminalSearchPanelStyle}>
        <input
          ref={props.inputRef}
          type="text"
          data-slot="terminal-search-input"
          aria-label={messages.inputAriaLabel}
          placeholder={messages.inputPlaceholder}
          value={props.query}
          onChange={handleSearchInputChange}
          onKeyDown={handleSearchInputKeyDown}
          style={terminalSearchInputStyle}
        />
        <span
          data-slot="terminal-search-status"
          role="status"
          aria-live="polite"
          style={
            props.status === "no-match"
              ? terminalSearchNoMatchStatusStyle
              : terminalSearchStatusStyle
          }
        >
          {statusLabel}
        </span>
        <div style={terminalSearchActionGroupStyle}>
          <button
            type="button"
            aria-label={messages.previousMatchAriaLabel}
            title={messages.previousMatchTitle}
            onClick={() => props.onPrevious()}
            style={terminalSearchNavigationButtonStyle}
          >
            {messages.previousActionLabel}
          </button>
          <button
            type="button"
            aria-label={messages.nextMatchAriaLabel}
            title={messages.nextMatchTitle}
            onClick={() => props.onSubmit()}
            style={terminalSearchNavigationButtonStyle}
          >
            {messages.nextActionLabel}
          </button>
        </div>
        <button
          type="button"
          aria-label={messages.closeAriaLabel}
          title={messages.closeTitle}
          onClick={() => props.onClose()}
          style={terminalSearchCloseButtonStyle}
        >
          <span aria-hidden="true">x</span>
        </button>
      </div>
    </div>
  );
}

