import type {
  TerminalPasteConfirmationDescription,
  TerminalPasteConfirmationMessages,
} from "../../../../terminal-interaction-messages.ts";

function describeTerminalPasteSafety(args: TerminalPasteConfirmationDescription) {
  const details: string[] = [];

  if (args.lineCount !== undefined) {
    details.push(`${args.lineCount} ${args.lineCount === 1 ? "line" : "lines"}`);
  }

  if (args.controlCharacterCount !== undefined) {
    details.push(
      `${args.controlCharacterCount} terminal control ${
        args.controlCharacterCount === 1 ? "character" : "characters"
      }`,
    );
  }

  return details.join(" and ") || "terminal control input";
}

export const terminalPasteConfirmationMessagesEnUS: TerminalPasteConfirmationMessages = {
  title: "Review terminal paste",
  description: (args) =>
    `The clipboard contains ${describeTerminalPasteSafety(args)}. Pasting it can execute multiple commands or send terminal control input.`,
  privacyHint:
    "The clipboard contents are not shown here. Confirm only after reviewing the source.",
  cancelActionLabel: "Cancel",
  confirmActionLabel: "Paste anyway",
};
