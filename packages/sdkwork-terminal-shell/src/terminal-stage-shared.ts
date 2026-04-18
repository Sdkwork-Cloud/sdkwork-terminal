import type { TerminalViewport } from "@sdkwork/terminal-core";
import type {
  RuntimeSessionReplaySnapshot,
  RuntimeSessionStreamEvent,
  TerminalViewportInput,
} from "@sdkwork/terminal-infrastructure";
import type {
  CSSProperties,
} from "react";
import {
  readTerminalClipboardText,
  splitTerminalClipboardPaste,
  writeTerminalClipboardText,
  type TerminalClipboardProvider,
} from "./terminal-clipboard.ts";
import {
  type TerminalShellPendingRuntimeInput,
  type TerminalShellSnapshot,
} from "./model.ts";
import { createTerminalRuntimeInputPreview } from "./runtime.ts";

const TERMINAL_SURFACE_BACKGROUND = "#050607";
const TERMINAL_MENU_BACKGROUND = "rgba(22, 24, 27, 0.98)";
const TERMINAL_SEARCH_BACKGROUND = "rgba(22, 24, 27, 0.96)";
const TERMINAL_STATUS_BACKGROUND = "rgba(18, 20, 24, 0.92)";
const TERMINAL_STATUS_BUTTON_BACKGROUND = "rgba(33, 36, 41, 0.94)";
const TERMINAL_STAGE_INSET = "5px";

export type SharedRuntimeClient = {
  sessionReplay: (
    sessionId: string,
    request?: {
      fromCursor?: string;
      limit?: number;
    },
  ) => Promise<RuntimeSessionReplaySnapshot>;
  writeSessionInput: (request: {
    sessionId: string;
    input: string;
  }) => Promise<{
    sessionId: string;
    acceptedBytes: number;
  }>;
  writeSessionInputBytes: (request: {
    sessionId: string;
    inputBytes: number[];
  }) => Promise<{
    sessionId: string;
    acceptedBytes: number;
  }>;
  resizeSession: (request: {
    sessionId: string;
    cols: number;
    rows: number;
  }) => Promise<{
    sessionId: string;
    cols: number;
    rows: number;
  }>;
  terminateSession: (sessionId: string) => Promise<{
    sessionId: string;
    state: string;
  }>;
  subscribeSessionEvents?: (
    sessionId: string,
    listener: (event: RuntimeSessionStreamEvent) => void,
  ) => Promise<() => void | Promise<void>>;
  acknowledgeSessionAttachment?: (request: {
    attachmentId: string;
    sequence: number;
  }) => Promise<unknown>;
};

export type TerminalStageTab = TerminalShellSnapshot["tabs"][number];

export interface TerminalStageBaseProps {
  tab: TerminalStageTab;
  active: boolean;
  clipboardProvider?: TerminalClipboardProvider;
  onViewportInput: (input: TerminalViewportInput) => void;
  onRegisterViewportCopyHandler: (
    handler: (() => Promise<void>) | null,
  ) => void;
  onRegisterViewportPasteHandler: (
    handler: ((text: string) => Promise<void>) | null,
  ) => void;
  onViewportTitleChange: (title: string) => void;
  onSearchQueryChange: (query: string) => void;
  onSearchSelectMatch: () => void;
  onViewportResize: (viewport: TerminalViewport) => void;
}

export type TerminalShortcutKeyEvent = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

export type TerminalShortcutPlatform = "mac" | "windows" | "linux";
export type TerminalViewportShortcutAction =
  | "copy"
  | "paste"
  | "selectAll"
  | "find";
export type TerminalViewportFontSizeShortcutAction =
  | "increase"
  | "decrease"
  | "reset";

const TERMINAL_VIEWPORT_SHORTCUT_HINTS: Record<
  Exclude<TerminalShortcutPlatform, "mac">,
  Record<TerminalViewportShortcutAction, string>
> = {
  windows: {
    copy: "Ctrl+Shift+C",
    paste: "Ctrl+Shift+V",
    selectAll: "Ctrl+Shift+A",
    find: "Ctrl+Shift+F",
  },
  linux: {
    copy: "Ctrl+Shift+C",
    paste: "Ctrl+Shift+V",
    selectAll: "Ctrl+Shift+A",
    find: "Ctrl+Shift+F",
  },
};

const TERMINAL_MAC_VIEWPORT_SHORTCUT_HINTS: Record<
  TerminalViewportShortcutAction,
  string
> = {
  copy: "Cmd+C",
  paste: "Cmd+V",
  selectAll: "Cmd+A",
  find: "Cmd+F",
};

function resolveNavigatorPlatformLabel() {
  if (typeof navigator === "undefined") {
    return "";
  }

  const nav = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };

  return nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? "";
}

export function detectTerminalShortcutPlatform(
  platformLabel?: string | null,
): TerminalShortcutPlatform {
  const normalized = (platformLabel ?? resolveNavigatorPlatformLabel()).toLowerCase();
  if (
    normalized.includes("mac") ||
    normalized.includes("iphone") ||
    normalized.includes("ipad") ||
    normalized.includes("ios")
  ) {
    return "mac";
  }

  if (normalized.includes("linux") || normalized.includes("x11")) {
    return "linux";
  }

  return "windows";
}

export function resolveTerminalViewportShortcutHint(
  action: TerminalViewportShortcutAction,
  platform?: TerminalShortcutPlatform,
) {
  const resolvedPlatform = platform ?? detectTerminalShortcutPlatform();
  if (resolvedPlatform === "mac") {
    return TERMINAL_MAC_VIEWPORT_SHORTCUT_HINTS[action];
  }

  return TERMINAL_VIEWPORT_SHORTCUT_HINTS[resolvedPlatform][action];
}

export function resolveTerminalViewportFontSizeShortcutAction(
  event: TerminalShortcutKeyEvent,
): TerminalViewportFontSizeShortcutAction | null {
  if (event.ctrlKey === event.metaKey || event.altKey) {
    return null;
  }

  if (event.key === "=" || event.key === "+") {
    return "increase";
  }

  if (!event.shiftKey && event.key === "-") {
    return "decrease";
  }

  if (!event.shiftKey && event.key === "0") {
    return "reset";
  }

  return null;
}

export function resolveNextTerminalViewportFontSize(
  current: number,
  action: TerminalViewportFontSizeShortcutAction,
) {
  if (action === "increase") {
    return Math.min(current + 1, 32);
  }

  if (action === "decrease") {
    return Math.max(current - 1, 8);
  }

  return 14;
}

export function focusTerminalSearchInput(
  input: Pick<HTMLInputElement, "focus" | "select"> | null,
) {
  input?.focus();
  input?.select();
}

export interface TerminalViewportActions {
  copySelectionToClipboard: () => Promise<void>;
  pasteTextIntoTerminal: (text: string) => Promise<void>;
  pasteClipboardIntoTerminal: () => Promise<void>;
  selectAllTerminalViewport: () => Promise<void>;
  openTerminalSearch: () => void;
}

export interface CreateTerminalViewportActionsArgs {
  clipboardProvider?: TerminalClipboardProvider;
  readSelection: () => Promise<string>;
  pasteTextIntoTerminal: (text: string) => Promise<void>;
  focusTerminalViewport: () => Promise<void> | void;
  selectAllTerminalViewport: () => Promise<void>;
  searchOverlayOpen: boolean;
  setSearchOverlayOpen: (open: boolean) => void;
  searchInput: Pick<HTMLInputElement, "focus" | "select"> | null;
}

export function createTerminalViewportActions(
  args: CreateTerminalViewportActionsArgs,
): TerminalViewportActions {
  async function copySelectionToClipboard() {
    const selectedText = await args.readSelection();
    await writeTerminalClipboardText(selectedText, args.clipboardProvider);
  }

  async function pasteTextIntoTerminal(text: string) {
    const chunks = splitTerminalClipboardPaste(text);
    if (chunks.length === 0) {
      return;
    }

    for (const chunk of chunks) {
      await args.pasteTextIntoTerminal(chunk);
    }
    await args.focusTerminalViewport();
  }

  async function pasteClipboardIntoTerminal() {
    const pastedText = await readTerminalClipboardText(args.clipboardProvider);
    await pasteTextIntoTerminal(pastedText);
  }

  async function selectAllTerminalViewport() {
    await args.selectAllTerminalViewport();
  }

  function openTerminalSearch() {
    if (args.searchOverlayOpen) {
      focusTerminalSearchInput(args.searchInput);
      return;
    }

    args.setSearchOverlayOpen(true);
  }

  return {
    copySelectionToClipboard,
    pasteTextIntoTerminal,
    pasteClipboardIntoTerminal,
    selectAllTerminalViewport,
    openTerminalSearch,
  };
}

export function registerTerminalViewportClipboardHandlers(args: {
  onRegisterViewportCopyHandler: (
    handler: (() => Promise<void>) | null,
  ) => void;
  onRegisterViewportPasteHandler: (
    handler: ((text: string) => Promise<void>) | null,
  ) => void;
  viewportActions: Pick<
    TerminalViewportActions,
    "copySelectionToClipboard" | "pasteTextIntoTerminal"
  >;
}) {
  args.onRegisterViewportCopyHandler(args.viewportActions.copySelectionToClipboard);
  args.onRegisterViewportPasteHandler(args.viewportActions.pasteTextIntoTerminal);

  return () => {
    args.onRegisterViewportCopyHandler(null);
    args.onRegisterViewportPasteHandler(null);
  };
}

function hasTerminalCtrlShiftShortcut(
  event: TerminalShortcutKeyEvent,
  key: string,
) {
  return (
    event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    event.shiftKey &&
    event.key.toLowerCase() === key
  );
}

function hasTerminalMetaShortcut(
  event: TerminalShortcutKeyEvent,
  key: string,
) {
  return (
    !event.ctrlKey &&
    event.metaKey &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === key
  );
}

export function buildPromptPrefix(tab: TerminalStageTab) {
  const cwdLabel = summarizeWorkingDirectory(tab.workingDirectory);

  if (tab.profile === "powershell") {
    return `PS ${cwdLabel}>`;
  }

  if (tab.profile === "bash") {
    return `${cwdLabel} $`;
  }

  return `${cwdLabel} >`;
}

function summarizeWorkingDirectory(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }

  const usesBackslash = trimmed.includes("\\");
  const separator = usesBackslash ? "\\" : "/";
  const normalized = usesBackslash ? trimmed.replace(/\//g, "\\") : trimmed.replace(/\\/g, "/");
  const rootMatch = usesBackslash
    ? normalized.match(/^[A-Za-z]:\\/u)
    : normalized.startsWith("/")
      ? ["/"]
      : null;
  const root = rootMatch?.[0] ?? "";
  const withoutRoot = root ? normalized.slice(root.length) : normalized;
  const parts = withoutRoot
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return root || normalized;
  }

  if (parts.length <= 2) {
    return root ? `${root}${parts.join(separator)}` : parts.join(separator);
  }

  const suffix = parts.slice(-2).join(separator);
  if (root) {
    return `${root}...${separator}${suffix}`;
  }

  return `${separator}...${separator}${suffix}`;
}

function describeRuntimePendingInput(input: string) {
  const unit = input.length === 1 ? "char" : "chars";
  return `${input.length} ${unit}`;
}

function countRuntimePendingInputBytes(input: string) {
  return new TextEncoder().encode(input).length;
}

function normalizeRuntimePendingInputText(input: string) {
  return input
    .replace(/\r/g, "<Enter>")
    .replace(/\n/g, "<LF>")
    .replace(/\t/g, "<Tab>")
    .replace(/\u001b/g, "<Esc>");
}

export function describePendingRuntimeInput(
  queue: TerminalShellPendingRuntimeInput[],
  fallbackInput: string,
) {
  if (queue.length === 0) {
    return describeRuntimePendingInput(fallbackInput);
  }

  const hasBinaryInput = queue.some((entry) => entry.kind === "binary");
  if (hasBinaryInput) {
    const totalBytes = queue.reduce((total, entry) => {
      if (entry.kind === "binary") {
        return total + entry.inputBytes.length;
      }

      return total + countRuntimePendingInputBytes(entry.data);
    }, 0);
    return `${totalBytes} ${totalBytes === 1 ? "byte" : "bytes"}`;
  }

  const totalChars = queue.reduce((total, entry) => {
    if (entry.kind === "binary") {
      return total + entry.inputBytes.length;
    }

    return total + entry.data.length;
  }, 0);
  const unit = totalChars === 1 ? "char" : "chars";
  return `${totalChars} ${unit}`;
}

function previewRuntimePendingInputFromText(input: string) {
  const normalized = normalizeRuntimePendingInputText(input);
  const collapsed = normalized.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) {
    return describeRuntimePendingInput(input);
  }
  if (collapsed.length <= 56) {
    return collapsed;
  }
  return `${collapsed.slice(0, 53)}...`;
}

export function previewRuntimePendingInput(
  queue: TerminalShellPendingRuntimeInput[],
  fallbackInput: string,
) {
  const preview = createTerminalRuntimeInputPreview({
    queue,
    fallbackInput,
  });
  const normalized = [
    ...preview.submittedLines.map((line) => line.trim()),
    preview.currentLine.trim(),
    preview.hasBinaryInput ? "<binary input queued>" : "",
  ]
    .filter((entry) => entry.length > 0)
    .join(" ");
  const collapsed = normalized.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) {
    return queue.length === 0
      ? previewRuntimePendingInputFromText(fallbackInput)
      : describePendingRuntimeInput(queue, fallbackInput);
  }
  if (collapsed.length <= 56) {
    return collapsed;
  }
  return `${collapsed.slice(0, 53)}...`;
}

export function isTerminalSearchShortcut(
  event: TerminalShortcutKeyEvent,
) {
  return (
    hasTerminalCtrlShiftShortcut(event, "f") ||
    hasTerminalMetaShortcut(event, "f")
  );
}

export function isTerminalCopyShortcut(
  event: TerminalShortcutKeyEvent,
) {
  return (
    hasTerminalCtrlShiftShortcut(event, "c") ||
    hasTerminalMetaShortcut(event, "c")
  );
}

export function isTerminalPasteShortcut(
  event: TerminalShortcutKeyEvent,
) {
  return (
    hasTerminalCtrlShiftShortcut(event, "v") ||
    hasTerminalMetaShortcut(event, "v")
  );
}

export function isTerminalInsertCopyShortcut(
  event: TerminalShortcutKeyEvent,
) {
  return (
    event.ctrlKey &&
    !event.shiftKey &&
    !event.metaKey &&
    !event.altKey &&
    event.key === "Insert"
  );
}

export function isTerminalInsertPasteShortcut(
  event: TerminalShortcutKeyEvent,
) {
  return (
    event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    event.key === "Insert"
  );
}

export function isTerminalSelectAllShortcut(
  event: TerminalShortcutKeyEvent,
) {
  return (
    hasTerminalCtrlShiftShortcut(event, "a") ||
    hasTerminalMetaShortcut(event, "a")
  );
}

export function resolveTerminalTextareaInputSequence(
  event: TerminalShortcutKeyEvent,
) {
  if (event.key === "Enter") {
    return "\r";
  }

  if (event.key === "Backspace") {
    return "\u007F";
  }

  if (event.key === "ArrowLeft") {
    return "\u001b[D";
  }

  if (event.key === "ArrowRight") {
    return "\u001b[C";
  }

  if (event.key === "ArrowUp") {
    return "\u001b[A";
  }

  if (event.key === "ArrowDown") {
    return "\u001b[B";
  }

  if (event.key === "Home") {
    return "\u001b[H";
  }

  if (event.key === "End") {
    return "\u001b[F";
  }

  if (event.key === "Delete") {
    return "\u001b[3~";
  }

  if (event.key === "Tab") {
    return "\t";
  }

  if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
    const normalizedKey = event.key.toLowerCase();
    if (normalizedKey === "a") {
      return "\u0001";
    }
    if (normalizedKey === "c") {
      return "\u0003";
    }
    if (normalizedKey === "d") {
      return "\u0004";
    }
    if (normalizedKey === "e") {
      return "\u0005";
    }
    if (normalizedKey === "k") {
      return "\u000b";
    }
    if (normalizedKey === "l") {
      return "\u000c";
    }
    if (normalizedKey === "u") {
      return "\u0015";
    }
  }

  return null;
}

export function isTerminalNewTabShortcut(
  event: TerminalShortcutKeyEvent,
) {
  return (
    hasTerminalCtrlShiftShortcut(event, "t") ||
    hasTerminalMetaShortcut(event, "t")
  );
}

export function isTerminalCloseTabShortcut(
  event: TerminalShortcutKeyEvent,
) {
  return (
    hasTerminalCtrlShiftShortcut(event, "w") ||
    hasTerminalMetaShortcut(event, "w")
  );
}

const TERMINAL_EDITABLE_TARGET_SELECTOR = [
  "input",
  "textarea",
  "select",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[role="textbox"]',
  '[role="searchbox"]',
  '[role="combobox"]',
].join(", ");

const TERMINAL_VIEWPORT_OWNED_TARGET_SELECTOR = [
  '[data-slot="terminal-hidden-input"]',
  ".xterm-helper-textarea",
].join(", ");

const TERMINAL_VIEWPORT_UI_TARGET_SELECTOR = [
  '[data-slot="terminal-search-overlay"]',
].join(", ");

function matchesShortcutTargetSelector(target: EventTarget | null, selector: string) {
  if (!target || typeof target !== "object" || !("closest" in target)) {
    return false;
  }

  const closest = target.closest;
  if (typeof closest !== "function") {
    return false;
  }

  return closest.call(target, selector) !== null;
}

function resolveShortcutTargetTagName(target: EventTarget | null) {
  if (!target || typeof target !== "object" || !("tagName" in target)) {
    return "";
  }

  const tagName = target.tagName;
  return typeof tagName === "string" ? tagName.toLowerCase() : "";
}

function resolveShortcutTargetRole(target: EventTarget | null) {
  if (!target || typeof target !== "object" || !("getAttribute" in target)) {
    return "";
  }

  const getAttribute = target.getAttribute;
  if (typeof getAttribute !== "function") {
    return "";
  }

  const role = getAttribute.call(target, "role");
  return typeof role === "string" ? role.toLowerCase() : "";
}

export function shouldIgnoreTerminalAppShortcutTarget(target: EventTarget | null) {
  if (!target || typeof target !== "object") {
    return false;
  }

  if ("isContentEditable" in target && target.isContentEditable) {
    return true;
  }

  const tagName = resolveShortcutTargetTagName(target);
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  const role = resolveShortcutTargetRole(target);
  if (role === "textbox" || role === "searchbox" || role === "combobox") {
    return true;
  }

  if (!("closest" in target) || typeof target.closest !== "function") {
    return false;
  }

  return target.closest(TERMINAL_EDITABLE_TARGET_SELECTOR) !== null;
}

export function shouldIgnoreTerminalViewportInteractionTarget(target: EventTarget | null) {
  if (matchesShortcutTargetSelector(target, TERMINAL_VIEWPORT_OWNED_TARGET_SELECTOR)) {
    return false;
  }

  if (matchesShortcutTargetSelector(target, TERMINAL_VIEWPORT_UI_TARGET_SELECTOR)) {
    return true;
  }

  return shouldIgnoreTerminalAppShortcutTarget(target);
}

export function resolveTerminalTabSwitchShortcutDirection(
  event: TerminalShortcutKeyEvent,
): "next" | "previous" | null {
  if (
    !event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.key !== "Tab"
  ) {
    return null;
  }

  return event.shiftKey ? "previous" : "next";
}

export function createViewportContextMenuStyle(args: {
  x: number;
  y: number;
}): CSSProperties {
  return {
    position: "fixed",
    left: args.x,
    top: args.y,
    zIndex: 9999,
    minWidth: 180,
    padding: "4px 0",
    background: TERMINAL_MENU_BACKGROUND,
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 6,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
    fontSize: 13,
    color: "#e4e4e7",
  };
}

export const contextMenuDividerStyle: CSSProperties = {
  height: 1,
  margin: "2px 6px",
  background: "rgba(255, 255, 255, 0.08)",
};

export const viewportContextMenuItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "6px 12px",
  border: "none",
  background: "none",
  color: "#e4e4e7",
  fontSize: 13,
  cursor: "pointer",
  textAlign: "left",
};

export const shortcutHintStyle: CSSProperties = {
  color: "#71717a",
  fontSize: 11,
  marginLeft: 16,
};

export const terminalStageStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: 5,
  width: "100%",
  minHeight: 0,
  height: "100%",
  padding: TERMINAL_STAGE_INSET,
  boxSizing: "border-box",
  background: TERMINAL_SURFACE_BACKGROUND,
};

export const terminalViewportStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  width: "100%",
  position: "relative",
  overflow: "hidden",
  boxSizing: "border-box",
  background: TERMINAL_SURFACE_BACKGROUND,
};

export const terminalHostStatusStyle: CSSProperties = {
  position: "absolute",
  left: 12,
  top: 12,
  zIndex: 11,
  display: "grid",
  gap: 3,
  maxWidth: "min(420px, calc(100% - 24px))",
  padding: "8px 10px",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: 8,
  background: TERMINAL_STATUS_BACKGROUND,
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.34)",
  color: "#d4d4d8",
  fontSize: 12,
  lineHeight: 1.4,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
  pointerEvents: "auto",
};

export const hiddenInputStyle: CSSProperties = {
  position: "absolute",
  left: "-9999em",
  top: 0,
  width: 0,
  height: 0,
  opacity: 0,
  border: "none",
  outline: "none",
  resize: "none",
  padding: 0,
  margin: 0,
  background: "transparent",
  color: "transparent",
  caretColor: "transparent",
  fontSize: 14,
  lineHeight: 1.25,
  fontFamily: "monospace",
  overflow: "hidden",
  whiteSpace: "pre",
  zIndex: -5,
  pointerEvents: "none",
};

export const promptBarStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  flex: "none",
  display: "flex",
  alignItems: "center",
  gap: 0,
  minHeight: 34,
  padding: "2px 5px 4px",
  boxSizing: "border-box",
  background: TERMINAL_SURFACE_BACKGROUND,
};

export const promptPrefixStyle: CSSProperties = {
  paddingRight: 8,
  color: "#16c60c",
  fontSize: 14,
  whiteSpace: "nowrap",
};

export const promptTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  color: "#fafafa",
  fontSize: 14,
  lineHeight: 1.25,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", \"JetBrains Mono\", \"Fira Code\", Consolas, \"Courier New\", monospace",
};

export const promptCaretStyle: CSSProperties = {
  width: 9,
  height: 16,
  marginLeft: 1,
  marginRight: 1,
  background: "#f5f7fb",
  opacity: 0.92,
  flex: "none",
  alignSelf: "center",
};

export const terminalBootstrapOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 8,
  display: "grid",
  alignContent: "start",
  gap: 4,
  padding: "10px 5px 0 5px",
  background: "transparent",
  pointerEvents: "none",
};

export const terminalBootstrapStatusStyle: CSSProperties = {
  color: "#d4d4d8",
  fontSize: 12,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

export const terminalBootstrapDetailStyle: CSSProperties = {
  color: "#71717a",
  fontSize: 11,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const terminalBootstrapPromptPlaceholderStyle: CSSProperties = {
  color: "#52525b",
  fontSize: 12,
  lineHeight: 1.25,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

export const terminalSearchOverlayStyle: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 12,
  zIndex: 12,
  pointerEvents: "auto",
};

export const terminalRuntimeStatusStyle: CSSProperties = {
  position: "absolute",
  left: 12,
  bottom: 12,
  zIndex: 10,
  display: "grid",
  gap: 3,
  maxWidth: "min(420px, calc(100% - 24px))",
  padding: "8px 10px",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  borderRadius: 8,
  background: TERMINAL_STATUS_BACKGROUND,
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.34)",
  color: "#d4d4d8",
  fontSize: 12,
  lineHeight: 1.4,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
  pointerEvents: "none",
};

export const terminalRuntimeStatusTitleStyle: CSSProperties = {
  color: "#e2e8f0",
  fontSize: 12,
};

export const terminalRuntimeStatusTitleWarningStyle: CSSProperties = {
  color: "#f97316",
  fontSize: 12,
};

export const terminalRuntimeStatusDetailStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const terminalRuntimeStatusPendingStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 11,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const terminalRuntimeStatusActionRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
  pointerEvents: "auto",
};

export const terminalRuntimeStatusActionButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 98,
  height: 26,
  padding: "0 10px",
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 6,
  background: TERMINAL_STATUS_BUTTON_BACKGROUND,
  color: "#f8fafc",
  cursor: "pointer",
  fontSize: 11,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

export const terminalSearchPanelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 280,
  padding: "8px 10px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 10,
  background: TERMINAL_SEARCH_BACKGROUND,
  boxShadow: "0 18px 36px rgba(0, 0, 0, 0.42)",
  backdropFilter: "blur(14px)",
};

export const terminalSearchInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 30,
  padding: "0 10px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.04)",
  color: "#fafafa",
  outline: "none",
  fontSize: 12,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

export const terminalSearchCloseButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#a1a1aa",
  cursor: "pointer",
};
