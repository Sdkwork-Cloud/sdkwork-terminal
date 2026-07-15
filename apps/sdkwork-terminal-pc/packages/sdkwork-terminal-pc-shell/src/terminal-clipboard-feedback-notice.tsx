import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  terminalClipboardFeedbackMessagesEnUS,
} from "./i18n/index.ts";
import type {
  TerminalClipboardFeedbackKind,
  TerminalClipboardFeedbackMessages,
  TerminalClipboardFeedbackReporter,
} from "./terminal-clipboard-feedback.ts";

const TERMINAL_CLIPBOARD_FEEDBACK_DURATION_MS = 3600;

const terminalClipboardFeedbackStyle: CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: 16,
  zIndex: 70,
  width: "min(420px, calc(100vw - 32px))",
  minHeight: 36,
  display: "grid",
  placeItems: "center",
  padding: "8px 12px",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: 6,
  background: "rgba(22, 24, 27, 0.98)",
  boxShadow: "0 16px 32px rgba(0, 0, 0, 0.32)",
  color: "#f4f4f5",
  fontSize: 12,
  lineHeight: 1.4,
  textAlign: "center",
  pointerEvents: "none",
  transform: "translateX(-50%)",
};

interface TerminalClipboardFeedbackNoticeState {
  sequence: number;
  message: string;
}

export interface UseTerminalClipboardFeedbackResult {
  feedback: TerminalClipboardFeedbackNoticeState | null;
  reportClipboardFeedback: TerminalClipboardFeedbackReporter;
}

export function useTerminalClipboardFeedback(
  messages: TerminalClipboardFeedbackMessages | undefined,
): UseTerminalClipboardFeedbackResult {
  const messagesRef = useRef(messages ?? terminalClipboardFeedbackMessagesEnUS);
  const sequenceRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feedback, setFeedback] = useState<TerminalClipboardFeedbackNoticeState | null>(null);

  useEffect(() => {
    messagesRef.current = messages ?? terminalClipboardFeedbackMessagesEnUS;
  }, [messages]);

  const clearFeedbackTimer = useCallback(() => {
    if (dismissTimerRef.current === null) {
      return;
    }

    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = null;
  }, []);

  useEffect(() => clearFeedbackTimer, [clearFeedbackTimer]);

  const reportClipboardFeedback = useCallback<TerminalClipboardFeedbackReporter>((kind) => {
    clearFeedbackTimer();
    sequenceRef.current += 1;
    setFeedback({
      sequence: sequenceRef.current,
      message:
        messagesRef.current[kind] ?? terminalClipboardFeedbackMessagesEnUS[kind],
    });
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      setFeedback(null);
    }, TERMINAL_CLIPBOARD_FEEDBACK_DURATION_MS);
  }, [clearFeedbackTimer]);

  return {
    feedback,
    reportClipboardFeedback,
  };
}

export function TerminalClipboardFeedbackNotice(props: {
  feedback: TerminalClipboardFeedbackNoticeState | null;
}) {
  return (
    <div
      data-slot="terminal-clipboard-feedback"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        ...terminalClipboardFeedbackStyle,
        opacity: props.feedback ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
    >
      {props.feedback ? (
        <span key={props.feedback.sequence}>{props.feedback.message}</span>
      ) : null}
    </div>
  );
}
