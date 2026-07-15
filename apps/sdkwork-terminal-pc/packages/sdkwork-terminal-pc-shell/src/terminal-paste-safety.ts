export type TerminalPasteSafetyReason =
  | "multiple-lines"
  | "control-sequence";

export interface TerminalPasteSafetyAllowedDecision {
  readonly kind: "allow";
}

export interface TerminalPasteSafetyConfirmationDecision {
  readonly kind: "confirmation-required";
  readonly reasons: readonly TerminalPasteSafetyReason[];
  readonly lineCount: number;
  readonly controlCharacterCount: number;
}

export type TerminalPasteSafetyDecision =
  | TerminalPasteSafetyAllowedDecision
  | TerminalPasteSafetyConfirmationDecision;

const allowedTerminalPasteDecision: TerminalPasteSafetyAllowedDecision = {
  kind: "allow",
};

function countTerminalLineBreaks(text: string) {
  return text.match(/\r\n|[\r\n\u2028\u2029]/gu)?.length ?? 0;
}

function countTerminalControlCharacters(text: string) {
  // Newlines are classified separately so the confirmation describes the actual risk.
  return text.match(/[\u0000-\u0009\u000B-\u000C\u000E-\u001F\u007F-\u009F]/gu)?.length ?? 0;
}

/**
 * Classifies terminal paste text without retaining or exposing the pasted content.
 * Line breaks and C0/C1 controls can execute commands or alter terminal state.
 */
export function resolveTerminalPasteSafetyDecision(
  text: string,
): TerminalPasteSafetyDecision {
  const lineBreakCount = countTerminalLineBreaks(text);
  const controlCharacterCount = countTerminalControlCharacters(text);
  const reasons: TerminalPasteSafetyReason[] = [];

  if (lineBreakCount > 0) {
    reasons.push("multiple-lines");
  }

  if (controlCharacterCount > 0) {
    reasons.push("control-sequence");
  }

  if (reasons.length === 0) {
    return allowedTerminalPasteDecision;
  }

  return {
    kind: "confirmation-required",
    reasons,
    lineCount: text.length === 0 ? 0 : lineBreakCount + 1,
    controlCharacterCount,
  };
}
