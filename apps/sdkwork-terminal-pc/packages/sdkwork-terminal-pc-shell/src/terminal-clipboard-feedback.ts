import type {
  TerminalClipboardReadOutcome,
  TerminalClipboardWriteOutcome,
} from "./terminal-clipboard";

export type TerminalClipboardFeedbackKind =
  | "copy-success"
  | "copy-empty"
  | "paste-empty"
  | "unavailable"
  | "denied"
  | "failed";

export type TerminalClipboardFeedbackMessages = Readonly<
  Record<TerminalClipboardFeedbackKind, string>
>;

export type TerminalClipboardFeedbackReporter = (
  kind: TerminalClipboardFeedbackKind,
) => void;

type TerminalClipboardFeedbackOperation = "copy" | "paste";
type TerminalClipboardFeedbackOutcome =
  | TerminalClipboardReadOutcome["kind"]
  | TerminalClipboardWriteOutcome["kind"];

export function resolveTerminalClipboardFeedbackKind(args: {
  operation: TerminalClipboardFeedbackOperation;
  outcome: TerminalClipboardFeedbackOutcome;
}): TerminalClipboardFeedbackKind | null {
  if (args.outcome === "success") {
    return args.operation === "copy" ? "copy-success" : null;
  }

  if (args.outcome === "empty") {
    return args.operation === "copy" ? "copy-empty" : "paste-empty";
  }

  return args.outcome;
}
