import type {
  TerminalCloseConfirmationDescription,
  TerminalCloseConfirmationMessages,
} from "../../../../terminal-interaction-messages.ts";

function describeTerminalCloseConfirmation(
  args: TerminalCloseConfirmationDescription,
) {
  const sessionPhrase =
    args.runningSessionCount === 1
      ? "这会停止 shell 会话及其中运行的所有进程。"
      : `这会停止 ${args.runningSessionCount} 个 shell 会话及其中运行的所有进程。`;
  const otherTabPhrase =
    args.otherTabCount > 0 ? `还会关闭 ${args.otherTabCount} 个额外标签页。` : "";

  return `${sessionPhrase}${otherTabPhrase}`;
}

export const terminalCloseConfirmationMessagesZhCN: TerminalCloseConfirmationMessages = {
  title: (runningSessionCount) =>
    runningSessionCount === 1
      ? "关闭正在运行的终端？"
      : `关闭 ${runningSessionCount} 个正在运行的终端？`,
  description: describeTerminalCloseConfirmation,
  confirmActionLabel: (tabCount) =>
    tabCount === 1 ? "关闭并停止会话" : `关闭 ${tabCount} 个标签页并停止会话`,
  cancelActionLabel: "保持打开",
};
