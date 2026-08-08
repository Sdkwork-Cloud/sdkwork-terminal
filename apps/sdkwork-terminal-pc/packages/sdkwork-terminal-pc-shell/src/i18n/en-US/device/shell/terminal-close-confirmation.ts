import type {
  TerminalCloseConfirmationDescription,
  TerminalCloseConfirmationMessages,
} from "../../../../terminal-interaction-messages";

function describeTerminalCloseConfirmation(
  args: TerminalCloseConfirmationDescription,
) {
  const sessionPhrase =
    args.runningSessionCount === 1
      ? "This stops the shell session and any process running in it."
      : `This stops ${args.runningSessionCount} shell sessions and any processes running in them.`;
  const otherTabPhrase =
    args.otherTabCount > 0
      ? ` It also closes ${args.otherTabCount} ${
          args.otherTabCount === 1 ? "additional tab" : "additional tabs"
        }.`
      : "";

  return `${sessionPhrase}${otherTabPhrase}`;
}

export const terminalCloseConfirmationMessagesEnUS: TerminalCloseConfirmationMessages = {
  title: (runningSessionCount) =>
    runningSessionCount === 1
      ? "Close running terminal?"
      : `Close ${runningSessionCount} running terminals?`,
  description: describeTerminalCloseConfirmation,
  confirmActionLabel: (tabCount) =>
    tabCount === 1
      ? "Close and stop session"
      : `Close ${tabCount} tabs and stop sessions`,
  cancelActionLabel: "Keep open",
};
