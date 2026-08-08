import type { TerminalInteractionMessages } from "../terminal-interaction-messages";
import { terminalCloseConfirmationMessagesEnUS } from "./en-US/device/shell/terminal-close-confirmation";
import { terminalPasteConfirmationMessagesEnUS } from "./en-US/device/shell/terminal-paste-confirmation";
import { terminalSearchOverlayMessagesEnUS } from "./en-US/device/shell/terminal-search-overlay";
import { terminalTabStripMessagesEnUS } from "./en-US/device/shell/terminal-tab-strip";
import { terminalViewportContextMenuMessagesEnUS } from "./en-US/device/shell/terminal-viewport-context-menu";
import { webRuntimeUnavailableMessagesEnUS } from "./en-US/device/shell/web-runtime-unavailable";
import { terminalCloseConfirmationMessagesZhCN } from "./zh-CN/device/shell/terminal-close-confirmation";
import { terminalPasteConfirmationMessagesZhCN } from "./zh-CN/device/shell/terminal-paste-confirmation";
import { terminalSearchOverlayMessagesZhCN } from "./zh-CN/device/shell/terminal-search-overlay";
import { terminalTabStripMessagesZhCN } from "./zh-CN/device/shell/terminal-tab-strip";
import { terminalViewportContextMenuMessagesZhCN } from "./zh-CN/device/shell/terminal-viewport-context-menu";
import { webRuntimeUnavailableMessagesZhCN } from "./zh-CN/device/shell/web-runtime-unavailable";

export { terminalClipboardFeedbackMessagesEnUS } from "./en-US/device/shell/clipboard-feedback";
export { terminalClipboardFeedbackMessagesZhCN } from "./zh-CN/device/shell/clipboard-feedback";
export { terminalCloseConfirmationMessagesEnUS } from "./en-US/device/shell/terminal-close-confirmation";
export { terminalPasteConfirmationMessagesEnUS } from "./en-US/device/shell/terminal-paste-confirmation";
export { terminalSearchOverlayMessagesEnUS } from "./en-US/device/shell/terminal-search-overlay";
export { terminalTabStripMessagesEnUS } from "./en-US/device/shell/terminal-tab-strip";
export { terminalViewportContextMenuMessagesEnUS } from "./en-US/device/shell/terminal-viewport-context-menu";
export { webRuntimeUnavailableMessagesEnUS } from "./en-US/device/shell/web-runtime-unavailable";
export { terminalCloseConfirmationMessagesZhCN } from "./zh-CN/device/shell/terminal-close-confirmation";
export { terminalPasteConfirmationMessagesZhCN } from "./zh-CN/device/shell/terminal-paste-confirmation";
export { terminalSearchOverlayMessagesZhCN } from "./zh-CN/device/shell/terminal-search-overlay";
export { terminalTabStripMessagesZhCN } from "./zh-CN/device/shell/terminal-tab-strip";
export { terminalViewportContextMenuMessagesZhCN } from "./zh-CN/device/shell/terminal-viewport-context-menu";
export { webRuntimeUnavailableMessagesZhCN } from "./zh-CN/device/shell/web-runtime-unavailable";

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
