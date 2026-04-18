import {
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
} from "react";
import {
  terminalSearchCloseButtonStyle,
  terminalSearchInputStyle,
  terminalSearchOverlayStyle,
  terminalSearchPanelStyle,
} from "./terminal-stage-shared";

export interface TerminalSearchOverlayProps {
  inputRef?: Ref<HTMLInputElement>;
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function TerminalSearchOverlay(props: TerminalSearchOverlayProps) {
  function handleSearchInputChange(event: ChangeEvent<HTMLInputElement>) {
    props.onQueryChange(event.target.value);
  }

  function handleSearchInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      props.onSubmit();
    }
  }

  return (
    <div data-slot="terminal-search-overlay" style={terminalSearchOverlayStyle}>
      <div style={terminalSearchPanelStyle}>
        <input
          ref={props.inputRef}
          type="text"
          data-slot="terminal-search-input"
          aria-label="Terminal search"
          placeholder="Search terminal output"
          value={props.query}
          onChange={handleSearchInputChange}
          onKeyDown={handleSearchInputKeyDown}
          style={terminalSearchInputStyle}
        />
        <button
          type="button"
          aria-label="Close terminal search"
          title="Close terminal search"
          onClick={() => props.onClose()}
          style={terminalSearchCloseButtonStyle}
        >
          <span aria-hidden="true">x</span>
        </button>
      </div>
    </div>
  );
}
