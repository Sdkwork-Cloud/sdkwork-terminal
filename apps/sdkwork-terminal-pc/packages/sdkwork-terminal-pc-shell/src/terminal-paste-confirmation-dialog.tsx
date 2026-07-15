import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { terminalPasteConfirmationMessagesEnUS } from "./i18n/en-US/device/shell/terminal-paste-confirmation.ts";
import type { TerminalPasteConfirmationMessages } from "./terminal-interaction-messages.ts";
import type { TerminalPasteSafetyConfirmationDecision } from "./terminal-paste-safety.ts";

const pasteConfirmationBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(5, 6, 7, 0.72)",
  backdropFilter: "blur(4px)",
};

const pasteConfirmationDialogStyle: CSSProperties = {
  width: "min(440px, calc(100vw - 32px))",
  display: "grid",
  gap: 12,
  padding: "20px",
  border: "1px solid rgba(245, 158, 11, 0.28)",
  borderRadius: 8,
  background: "rgba(22, 24, 27, 0.98)",
  boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
};

const pasteConfirmationTitleStyle: CSSProperties = {
  fontSize: 14,
  color: "#fafafa",
};

const pasteConfirmationDetailStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: "#d4d4d8",
};

const pasteConfirmationHintStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: "#a1a1aa",
};

const pasteConfirmationActionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 4,
};

const pasteConfirmationCancelButtonStyle: CSSProperties = {
  minWidth: 88,
  padding: "8px 14px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 6,
  background: "transparent",
  color: "#d4d4d8",
  cursor: "pointer",
};

const pasteConfirmationSubmitButtonStyle: CSSProperties = {
  minWidth: 112,
  padding: "8px 14px",
  border: "1px solid rgba(245, 158, 11, 0.4)",
  borderRadius: 6,
  background: "rgba(180, 83, 9, 0.86)",
  color: "#fff7ed",
  cursor: "pointer",
};

export interface TerminalPasteConfirmationDialogProps {
  decision: TerminalPasteSafetyConfirmationDecision;
  messages?: TerminalPasteConfirmationMessages;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TerminalPasteConfirmationDialog(
  props: TerminalPasteConfirmationDialogProps,
) {
  const titleId = useId();
  const detailId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const messages = props.messages ?? terminalPasteConfirmationMessagesEnUS;
  const description = messages.description({
    lineCount: props.decision.reasons.includes("multiple-lines")
      ? props.decision.lineCount
      : undefined,
    controlCharacterCount: props.decision.reasons.includes("control-sequence")
      ? props.decision.controlCharacterCount
      : undefined,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      props.onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [props.onCancel]);

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const cancelButton = cancelButtonRef.current;
    const confirmButton = confirmButtonRef.current;
    if (!cancelButton || !confirmButton) {
      return;
    }

    if (event.shiftKey && document.activeElement === cancelButton) {
      event.preventDefault();
      confirmButton.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === confirmButton) {
      event.preventDefault();
      cancelButton.focus();
    }
  }

  return (
    <div
      data-slot="terminal-paste-confirmation"
      role="presentation"
      onClick={props.onCancel}
      style={pasteConfirmationBackdropStyle}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detailId}
        onKeyDown={handleDialogKeyDown}
        onClick={(event) => {
          event.stopPropagation();
        }}
        style={pasteConfirmationDialogStyle}
      >
        <strong id={titleId} style={pasteConfirmationTitleStyle}>
          {messages.title}
        </strong>
        <p id={detailId} style={pasteConfirmationDetailStyle}>
          {description}
        </p>
        <p style={pasteConfirmationHintStyle}>
          {messages.privacyHint}
        </p>
        <div style={pasteConfirmationActionsStyle}>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={props.onCancel}
            style={pasteConfirmationCancelButtonStyle}
          >
            {messages.cancelActionLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={props.onConfirm}
            style={pasteConfirmationSubmitButtonStyle}
          >
            {messages.confirmActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
