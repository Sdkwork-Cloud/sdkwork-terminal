import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { terminalCloseConfirmationMessagesEnUS } from "./i18n/en-US/device/shell/terminal-close-confirmation.ts";
import type { TerminalCloseConfirmationMessages } from "./terminal-interaction-messages.ts";
import type { TerminalCloseRequest } from "./terminal-close-guard.ts";

const closeConfirmationBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(0, 0, 0, 0.56)",
};

const closeConfirmationDialogStyle: CSSProperties = {
  display: "grid",
  gap: 14,
  width: "min(420px, 100%)",
  padding: 20,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 8,
  background: "#181a1e",
  boxShadow: "0 24px 64px rgba(0, 0, 0, 0.52)",
  color: "#f4f4f5",
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

const closeConfirmationTitleStyle: CSSProperties = {
  margin: 0,
  color: "#f8fafc",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0,
};

const closeConfirmationDescriptionStyle: CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: 12,
  lineHeight: 1.55,
};

const closeConfirmationActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

const closeConfirmationButtonStyle: CSSProperties = {
  minHeight: 30,
  padding: "0 12px",
  border: "1px solid rgba(255, 255, 255, 0.16)",
  borderRadius: 6,
  background: "#27272a",
  color: "#f4f4f5",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
};

const closeConfirmationDestructiveButtonStyle: CSSProperties = {
  ...closeConfirmationButtonStyle,
  borderColor: "rgba(248, 113, 113, 0.52)",
  background: "#991b1b",
};

function createCloseConfirmationCopy(
  request: TerminalCloseRequest,
  messages: TerminalCloseConfirmationMessages,
) {
  const runningSessionCount = request.runningTabIds.length;
  const tabCount = request.tabIds.length;
  const otherTabCount = tabCount - runningSessionCount;

  return {
    title: messages.title(runningSessionCount),
    description: messages.description({
      runningSessionCount,
      otherTabCount,
    }),
    confirmLabel: messages.confirmActionLabel(tabCount),
  };
}

export interface TerminalCloseConfirmationDialogProps {
  request: TerminalCloseRequest;
  messages?: TerminalCloseConfirmationMessages;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TerminalCloseConfirmationDialog(
  props: TerminalCloseConfirmationDialogProps,
) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const messages = props.messages ?? terminalCloseConfirmationMessagesEnUS;
  const copy = createCloseConfirmationCopy(props.request, messages);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onCancel();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const activeElement = document.activeElement;
    if (event.shiftKey && activeElement === cancelButtonRef.current) {
      event.preventDefault();
      confirmButtonRef.current?.focus();
      return;
    }

    if (!event.shiftKey && activeElement === confirmButtonRef.current) {
      event.preventDefault();
      cancelButtonRef.current?.focus();
    }
  }

  function handleBackdropMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      props.onCancel();
    }
  }

  return (
    <div
      data-slot="terminal-close-confirmation-backdrop"
      onMouseDown={handleBackdropMouseDown}
      style={closeConfirmationBackdropStyle}
    >
      <div
        data-slot="terminal-close-confirmation"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="terminal-close-confirmation-title"
        aria-describedby="terminal-close-confirmation-description"
        onKeyDown={handleKeyDown}
        style={closeConfirmationDialogStyle}
      >
        <h2 id="terminal-close-confirmation-title" style={closeConfirmationTitleStyle}>
          {copy.title}
        </h2>
        <p
          id="terminal-close-confirmation-description"
          style={closeConfirmationDescriptionStyle}
        >
          {copy.description}
        </p>
        <div style={closeConfirmationActionsStyle}>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={props.onCancel}
            style={closeConfirmationButtonStyle}
          >
            {messages.cancelActionLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={props.onConfirm}
            style={closeConfirmationDestructiveButtonStyle}
          >
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
