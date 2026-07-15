import type { TerminalInteractionMessages } from "../terminal-interaction-messages.ts";
import { terminalCloseConfirmationMessagesEnUS } from "./en-US/device/shell/terminal-close-confirmation.ts";
import { terminalPasteConfirmationMessagesEnUS } from "./en-US/device/shell/terminal-paste-confirmation.ts";
import { terminalSearchOverlayMessagesEnUS } from "./en-US/device/shell/terminal-search-overlay.ts";
import { terminalTabStripMessagesEnUS } from "./en-US/device/shell/terminal-tab-strip.ts";
import { terminalViewportContextMenuMessagesEnUS } from "./en-US/device/shell/terminal-viewport-context-menu.ts";
import { webRuntimeUnavailableMessagesEnUS } from "./en-US/device/shell/web-runtime-unavailable.ts";
import { terminalCloseConfirmationMessagesZhCN } from "./zh-CN/device/shell/terminal-close-confirmation.ts";
import { terminalPasteConfirmationMessagesZhCN } from "./zh-CN/device/shell/terminal-paste-confirmation.ts";
import { terminalSearchOverlayMessagesZhCN } from "./zh-CN/device/shell/terminal-search-overlay.ts";
import { terminalTabStripMessagesZhCN } from "./zh-CN/device/shell/terminal-tab-strip.ts";
import { terminalViewportContextMenuMessagesZhCN } from "./zh-CN/device/shell/terminal-viewport-context-menu.ts";
import { webRuntimeUnavailableMessagesZhCN } from "./zh-CN/device/shell/web-runtime-unavailable.ts";

export { terminalClipboardFeedbackMessagesEnUS } from "./en-US/device/shell/clipboard-feedback.ts";
export { terminalClipboardFeedbackMessagesZhCN } from "./zh-CN/device/shell/clipboard-feedback.ts";
export { terminalCloseConfirmationMessagesEnUS } from "./en-US/device/shell/terminal-close-confirmation.ts";
export { terminalPasteConfirmationMessagesEnUS } from "./en-US/device/shell/terminal-paste-confirmation.ts";
export { terminalSearchOverlayMessagesEnUS } from "./en-US/device/shell/terminal-search-overlay.ts";
export { terminalTabStripMessagesEnUS } from "./en-US/device/shell/terminal-tab-strip.ts";
export { terminalViewportContextMenuMessagesEnUS } from "./en-US/device/shell/terminal-viewport-context-menu.ts";
export { webRuntimeUnavailableMessagesEnUS } from "./en-US/device/shell/web-runtime-unavailable.ts";
export { terminalCloseConfirmationMessagesZhCN } from "./zh-CN/device/shell/terminal-close-confirmation.ts";
export { terminalPasteConfirmationMessagesZhCN } from "./zh-CN/device/shell/terminal-paste-confirmation.ts";
export { terminalSearchOverlayMessagesZhCN } from "./zh-CN/device/shell/terminal-search-overlay.ts";
export { terminalTabStripMessagesZhCN } from "./zh-CN/device/shell/terminal-tab-strip.ts";
export { terminalViewportContextMenuMessagesZhCN } from "./zh-CN/device/shell/terminal-viewport-context-menu.ts";
export { webRuntimeUnavailableMessagesZhCN } from "./zh-CN/device/shell/web-runtime-unavailable.ts";

export const terminalInteractionMessagesEnUS: Required<TerminalInteractionMessages> = {
  search: terminalSearchOverlayMessagesEnUS,
  pasteConfirmation: terminalPasteConfirmationMessagesEnUS,
  closeConfirmation: terminalCloseConfirmationMessagesEnUS,
  tabStrip: terminalTabStripMessagesEnUS,
  viewportContextMenu: terminalViewportContextMenuMessagesEnUS,
};

export const terminalInteractionMessagesZhCN: Required<TerminalInteractionMessages> = {
  search: terminalSearchOverlayMessagesZhCN,
  pasteConfirmation: terminalPasteConfirmationMessagesZhCN,
  closeConfirmation: terminalCloseConfirmationMessagesZhCN,
  tabStrip: terminalTabStripMessagesZhCN,
  viewportContextMenu: terminalViewportContextMenuMessagesZhCN,
};
