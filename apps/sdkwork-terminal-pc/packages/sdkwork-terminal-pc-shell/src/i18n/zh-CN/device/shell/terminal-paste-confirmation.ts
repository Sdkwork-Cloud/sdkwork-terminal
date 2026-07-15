import type {
  TerminalPasteConfirmationDescription,
  TerminalPasteConfirmationMessages,
} from "../../../../terminal-interaction-messages.ts";

function describeTerminalPasteSafety(args: TerminalPasteConfirmationDescription) {
  const details: string[] = [];

  if (args.lineCount !== undefined) {
    details.push(`${args.lineCount} 行`);
  }

  if (args.controlCharacterCount !== undefined) {
    details.push(`${args.controlCharacterCount} 个终端控制字符`);
  }

  return details.join("和") || "终端控制输入";
}

export const terminalPasteConfirmationMessagesZhCN: TerminalPasteConfirmationMessages = {
  title: "检查终端粘贴内容",
  description: (args) =>
    `剪贴板包含${describeTerminalPasteSafety(args)}。粘贴可能会执行多条命令或发送终端控制输入。`,
  privacyHint: "此处不会显示剪贴板内容。仅在确认来源安全后继续。",
  cancelActionLabel: "取消",
  confirmActionLabel: "仍要粘贴",
};
