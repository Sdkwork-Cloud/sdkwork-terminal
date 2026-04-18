import test from "node:test";
import assert from "node:assert/strict";

import { MAX_TERMINAL_PASTE_LENGTH } from "../packages/sdkwork-terminal-shell/src/terminal-clipboard.ts";
import {
  createTerminalViewportActions,
  isTerminalCopyShortcut,
  isTerminalSearchShortcut,
  isTerminalPasteShortcut,
  isTerminalSelectAllShortcut,
  isTerminalNewTabShortcut,
  isTerminalCloseTabShortcut,
  resolveTerminalViewportShortcutHint,
  resolveTerminalTabSwitchShortcutDirection,
  resolveTerminalViewportFontSizeShortcutAction,
  resolveTerminalTextareaInputSequence,
  focusTerminalSearchInput,
  registerTerminalViewportClipboardHandlers,
  resolveNextTerminalViewportFontSize,
  shouldIgnoreTerminalAppShortcutTarget,
  shouldIgnoreTerminalViewportInteractionTarget,
} from "../packages/sdkwork-terminal-shell/src/terminal-stage-shared.ts";
import { createTerminalViewportInteractionHandlers } from "../packages/sdkwork-terminal-shell/src/terminal-viewport-interaction-handlers.ts";

function createShortcutEvent(overrides: Partial<{
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}> = {}) {
  return {
    key: "",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  };
}

function createShortcutTarget(overrides: Partial<{
  tagName: string;
  isContentEditable: boolean;
  role: string | null;
  closestResult: unknown;
  closest: (selector: string) => unknown;
}> = {}) {
  const role = overrides.role ?? null;
  return {
    tagName: "DIV",
    isContentEditable: false,
    getAttribute(name: string) {
      if (name === "role") {
        return role;
      }
      return null;
    },
    closest() {
      if (typeof overrides.closest === "function") {
        return overrides.closest(...arguments);
      }
      return overrides.closestResult ?? null;
    },
    ...overrides,
  };
}

test("terminal viewport shortcuts ignore Alt-modified key chords", () => {
  assert.equal(
    isTerminalSearchShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, altKey: true, key: "f" }),
    ),
    false,
  );
  assert.equal(
    isTerminalCopyShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, altKey: true, key: "c" }),
    ),
    false,
  );
  assert.equal(
    isTerminalPasteShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, altKey: true, key: "v" }),
    ),
    false,
  );
  assert.equal(
    isTerminalSelectAllShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, altKey: true, key: "a" }),
    ),
    false,
  );
});

test("terminal viewport shortcuts follow platform copy paste search conventions", () => {
  assert.equal(
    isTerminalSearchShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "f" }),
    ),
    true,
  );
  assert.equal(
    isTerminalCopyShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "c" }),
    ),
    true,
  );
  assert.equal(
    isTerminalPasteShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "v" }),
    ),
    true,
  );
  assert.equal(
    isTerminalSelectAllShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "a" }),
    ),
    true,
  );
  assert.equal(
    isTerminalSearchShortcut(
      createShortcutEvent({ metaKey: true, key: "f" }),
    ),
    true,
  );
  assert.equal(
    isTerminalCopyShortcut(
      createShortcutEvent({ metaKey: true, key: "c" }),
    ),
    true,
  );
  assert.equal(
    isTerminalPasteShortcut(
      createShortcutEvent({ metaKey: true, key: "v" }),
    ),
    true,
  );
  assert.equal(
    isTerminalSelectAllShortcut(
      createShortcutEvent({ metaKey: true, key: "a" }),
    ),
    true,
  );
  assert.equal(
    isTerminalCopyShortcut(
      createShortcutEvent({ ctrlKey: true, key: "c" }),
    ),
    false,
  );
  assert.equal(
    isTerminalPasteShortcut(
      createShortcutEvent({ ctrlKey: true, key: "v" }),
    ),
    false,
  );
  assert.equal(
    isTerminalSearchShortcut(
      createShortcutEvent({ ctrlKey: true, key: "f" }),
    ),
    false,
  );
  assert.equal(
    isTerminalSelectAllShortcut(
      createShortcutEvent({ ctrlKey: true, key: "a" }),
    ),
    false,
  );
});

test("terminal app shortcuts follow platform tab management conventions", () => {
  assert.equal(
    isTerminalNewTabShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "t" }),
    ),
    true,
  );
  assert.equal(
    isTerminalCloseTabShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "W" }),
    ),
    true,
  );
  assert.equal(
    isTerminalNewTabShortcut(
      createShortcutEvent({ metaKey: true, key: "T" }),
    ),
    true,
  );
  assert.equal(
    isTerminalCloseTabShortcut(
      createShortcutEvent({ metaKey: true, key: "w" }),
    ),
    true,
  );
  assert.equal(
    isTerminalNewTabShortcut(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, altKey: true, key: "T" }),
    ),
    false,
  );
  assert.equal(
    isTerminalCloseTabShortcut(
      createShortcutEvent({ ctrlKey: true, altKey: true, shiftKey: true, key: "w" }),
    ),
    false,
  );
  assert.equal(
    isTerminalCloseTabShortcut(
      createShortcutEvent({ ctrlKey: true, key: "w" }),
    ),
    false,
  );
});

test("terminal app tab switch shortcut resolves next and previous directions", () => {
  assert.equal(
    resolveTerminalTabSwitchShortcutDirection(
      createShortcutEvent({ ctrlKey: true, key: "Tab" }),
    ),
    "next",
  );
  assert.equal(
    resolveTerminalTabSwitchShortcutDirection(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "Tab" }),
    ),
    "previous",
  );
  assert.equal(
    resolveTerminalTabSwitchShortcutDirection(
      createShortcutEvent({ ctrlKey: true, altKey: true, key: "Tab" }),
    ),
    null,
  );
  assert.equal(
    resolveTerminalTabSwitchShortcutDirection(
      createShortcutEvent({ metaKey: true, key: "Tab" }),
    ),
    null,
  );
});

test("terminal app shortcuts ignore editable targets and content-editable ancestors", () => {
  assert.equal(
    shouldIgnoreTerminalAppShortcutTarget(createShortcutTarget({ tagName: "INPUT" })),
    true,
  );
  assert.equal(
    shouldIgnoreTerminalAppShortcutTarget(createShortcutTarget({ tagName: "TEXTAREA" })),
    true,
  );
  assert.equal(
    shouldIgnoreTerminalAppShortcutTarget(createShortcutTarget({ role: "searchbox" })),
    true,
  );
  assert.equal(
    shouldIgnoreTerminalAppShortcutTarget(createShortcutTarget({ isContentEditable: true })),
    true,
  );
  assert.equal(
    shouldIgnoreTerminalAppShortcutTarget(createShortcutTarget({ closestResult: {} })),
    true,
  );
  assert.equal(
    shouldIgnoreTerminalAppShortcutTarget(createShortcutTarget({ tagName: "DIV" })),
    false,
  );
  assert.equal(shouldIgnoreTerminalAppShortcutTarget(null), false);
});

test("terminal viewport interaction targets preserve terminal-owned inputs and ignore search overlay ui", () => {
  assert.equal(
    shouldIgnoreTerminalViewportInteractionTarget(
      createShortcutTarget({
        tagName: "TEXTAREA",
        closest: (selector) => selector.includes("terminal-hidden-input") ? {} : null,
      }),
    ),
    false,
  );
  assert.equal(
    shouldIgnoreTerminalViewportInteractionTarget(
      createShortcutTarget({
        tagName: "TEXTAREA",
        closest: (selector) => selector.includes("xterm-helper-textarea") ? {} : null,
      }),
    ),
    false,
  );
  assert.equal(
    shouldIgnoreTerminalViewportInteractionTarget(
      createShortcutTarget({
        tagName: "INPUT",
        closest: (selector) => selector.includes("terminal-search-overlay") ? {} : null,
      }),
    ),
    true,
  );
  assert.equal(
    shouldIgnoreTerminalViewportInteractionTarget(
      createShortcutTarget({
        tagName: "BUTTON",
        closest: (selector) => selector.includes("terminal-search-overlay") ? {} : null,
      }),
    ),
    true,
  );
  assert.equal(
    shouldIgnoreTerminalViewportInteractionTarget(createShortcutTarget({ tagName: "INPUT" })),
    true,
  );
  assert.equal(
    shouldIgnoreTerminalViewportInteractionTarget(createShortcutTarget({ tagName: "DIV" })),
    false,
  );
});

test("terminal viewport font size shortcuts follow cross-platform zoom conventions", () => {
  assert.equal(
    resolveTerminalViewportFontSizeShortcutAction(
      createShortcutEvent({ ctrlKey: true, key: "=" }),
    ),
    "increase",
  );
  assert.equal(
    resolveTerminalViewportFontSizeShortcutAction(
      createShortcutEvent({ metaKey: true, shiftKey: true, key: "+" }),
    ),
    "increase",
  );
  assert.equal(
    resolveTerminalViewportFontSizeShortcutAction(
      createShortcutEvent({ ctrlKey: true, key: "-" }),
    ),
    "decrease",
  );
  assert.equal(
    resolveTerminalViewportFontSizeShortcutAction(
      createShortcutEvent({ metaKey: true, key: "0" }),
    ),
    "reset",
  );
  assert.equal(
    resolveTerminalViewportFontSizeShortcutAction(
      createShortcutEvent({ ctrlKey: true, altKey: true, key: "=" }),
    ),
    null,
  );
  assert.equal(
    resolveTerminalViewportFontSizeShortcutAction(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "0" }),
    ),
    null,
  );
});

test("focus terminal search input selects the active query when an input is present", () => {
  let focusCount = 0;
  let selectCount = 0;
  const input = {
    focus() {
      focusCount += 1;
    },
    select() {
      selectCount += 1;
    },
  } as Pick<HTMLInputElement, "focus" | "select">;

  focusTerminalSearchInput(input);
  focusTerminalSearchInput(null);

  assert.equal(focusCount, 1);
  assert.equal(selectCount, 1);
});

test("terminal textarea key translation covers baseline navigation and editing keys", () => {
  assert.equal(
    resolveTerminalTextareaInputSequence(createShortcutEvent({ key: "Enter" })),
    "\r",
  );
  assert.equal(
    resolveTerminalTextareaInputSequence(createShortcutEvent({ key: "Backspace" })),
    "\u007F",
  );
  assert.equal(
    resolveTerminalTextareaInputSequence(createShortcutEvent({ key: "ArrowLeft" })),
    "\u001b[D",
  );
  assert.equal(
    resolveTerminalTextareaInputSequence(createShortcutEvent({ key: "Delete" })),
    "\u001b[3~",
  );
});

test("terminal textarea key translation covers readline-style control chords", () => {
  assert.equal(
    resolveTerminalTextareaInputSequence(
      createShortcutEvent({ ctrlKey: true, key: "a" }),
    ),
    "\u0001",
  );
  assert.equal(
    resolveTerminalTextareaInputSequence(
      createShortcutEvent({ ctrlKey: true, key: "E" }),
    ),
    "\u0005",
  );
  assert.equal(
    resolveTerminalTextareaInputSequence(
      createShortcutEvent({ ctrlKey: true, key: "k" }),
    ),
    "\u000b",
  );
  assert.equal(
    resolveTerminalTextareaInputSequence(
      createShortcutEvent({ ctrlKey: true, key: "d" }),
    ),
    "\u0004",
  );
  assert.equal(
    resolveTerminalTextareaInputSequence(
      createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "A" }),
    ),
    null,
  );
});

test("terminal shortcut hints resolve to platform-specific labels", () => {
  assert.equal(resolveTerminalViewportShortcutHint("copy", "windows"), "Ctrl+Shift+C");
  assert.equal(resolveTerminalViewportShortcutHint("paste", "windows"), "Ctrl+Shift+V");
  assert.equal(resolveTerminalViewportShortcutHint("selectAll", "windows"), "Ctrl+Shift+A");
  assert.equal(resolveTerminalViewportShortcutHint("find", "windows"), "Ctrl+Shift+F");
  assert.equal(resolveTerminalViewportShortcutHint("copy", "mac"), "Cmd+C");
  assert.equal(resolveTerminalViewportShortcutHint("paste", "mac"), "Cmd+V");
  assert.equal(resolveTerminalViewportShortcutHint("selectAll", "mac"), "Cmd+A");
  assert.equal(resolveTerminalViewportShortcutHint("find", "mac"), "Cmd+F");
});

test("terminal viewport actions centralize clipboard, search, and selection behavior", async () => {
  const clipboardWrites: string[] = [];
  const pastedTexts: string[] = [];
  const focusLog: string[] = [];
  let searchOverlayOpen = false;

  const clipboardProvider = {
    async readText() {
      return "clipboard payload";
    },
    async writeText(text: string) {
      clipboardWrites.push(text);
    },
  };

  const searchInput = {
    focus() {
      focusLog.push("search-focus");
    },
    select() {
      focusLog.push("search-select");
    },
  };

  const closedActions = createTerminalViewportActions({
    clipboardProvider,
    readSelection: async () => "selected output",
    pasteTextIntoTerminal: async (text) => {
      pastedTexts.push(text);
    },
    focusTerminalViewport: async () => {
      focusLog.push("viewport-focus");
    },
    selectAllTerminalViewport: async () => {
      focusLog.push("select-all");
    },
    searchOverlayOpen,
    setSearchOverlayOpen(next) {
      searchOverlayOpen = next;
    },
    searchInput,
  });

  await closedActions.copySelectionToClipboard();
  await closedActions.pasteClipboardIntoTerminal();
  await closedActions.selectAllTerminalViewport();
  closedActions.openTerminalSearch();

  assert.deepEqual(clipboardWrites, ["selected output"]);
  assert.deepEqual(pastedTexts, ["clipboard payload"]);
  assert.equal(searchOverlayOpen, true);
  assert.deepEqual(focusLog, ["viewport-focus", "select-all"]);

  const reopenedActions = createTerminalViewportActions({
    clipboardProvider,
    readSelection: async () => "selected output",
    pasteTextIntoTerminal: async () => {},
    focusTerminalViewport: () => {},
    selectAllTerminalViewport: async () => {},
    searchOverlayOpen,
    setSearchOverlayOpen(next) {
      searchOverlayOpen = next;
    },
    searchInput,
  });

  reopenedActions.openTerminalSearch();
  assert.deepEqual(focusLog, [
    "viewport-focus",
    "select-all",
    "search-focus",
    "search-select",
  ]);

  const oversizedActions = createTerminalViewportActions({
    clipboardProvider,
    readSelection: async () => "selected output",
    pasteTextIntoTerminal: async (text) => {
      pastedTexts.push(text);
    },
    focusTerminalViewport: async () => {
      focusLog.push("viewport-focus");
    },
    selectAllTerminalViewport: async () => {},
    searchOverlayOpen,
    setSearchOverlayOpen(next) {
      searchOverlayOpen = next;
    },
    searchInput,
  });

  await oversizedActions.pasteTextIntoTerminal("x".repeat(MAX_TERMINAL_PASTE_LENGTH + 64));
  assert.equal(pastedTexts.at(-1)?.length, MAX_TERMINAL_PASTE_LENGTH);
});

test("terminal viewport clipboard registration delegates copy and paste handlers and cleans up", async () => {
  let registeredCopyHandler: (() => Promise<void>) | null = null;
  let registeredPasteHandler: ((text: string) => Promise<void>) | null = null;
  const actionLog: string[] = [];

  const cleanup = registerTerminalViewportClipboardHandlers({
    onRegisterViewportCopyHandler(handler) {
      registeredCopyHandler = handler;
    },
    onRegisterViewportPasteHandler(handler) {
      registeredPasteHandler = handler;
    },
    viewportActions: {
      copySelectionToClipboard: async () => {
        actionLog.push("copy");
      },
      pasteTextIntoTerminal: async (text) => {
        actionLog.push(`paste:${text}`);
      },
    },
  });

  await registeredCopyHandler?.();
  await registeredPasteHandler?.("from-shell-app");

  assert.deepEqual(actionLog, ["copy", "paste:from-shell-app"]);

  cleanup();
  assert.equal(registeredCopyHandler, null);
  assert.equal(registeredPasteHandler, null);
});

test("terminal viewport font size stepper clamps zoom range and resets to baseline", () => {
  assert.equal(resolveNextTerminalViewportFontSize(14, "increase"), 15);
  assert.equal(resolveNextTerminalViewportFontSize(32, "increase"), 32);
  assert.equal(resolveNextTerminalViewportFontSize(14, "decrease"), 13);
  assert.equal(resolveNextTerminalViewportFontSize(8, "decrease"), 8);
  assert.equal(resolveNextTerminalViewportFontSize(21, "reset"), 14);
});

test("terminal viewport interaction handlers centralize search close, keyboard shortcuts, and stage click focus", async () => {
  let searchOverlayOpen = true;
  let fontSize = 14;
  const actionLog: string[] = [];

  const handlers = createTerminalViewportInteractionHandlers({
    active: true,
    viewportActions: {
      copySelectionToClipboard: async () => {
        actionLog.push("copy");
      },
      pasteTextIntoTerminal: async (text) => {
        actionLog.push(`native-paste:${text}`);
      },
      pasteClipboardIntoTerminal: async () => {
        actionLog.push("paste");
      },
      selectAllTerminalViewport: async () => {
        actionLog.push("select-all");
      },
      openTerminalSearch: () => {
        actionLog.push("open-search");
      },
    },
    setSearchOverlayOpen(next) {
      searchOverlayOpen = next;
    },
    setFontSize(next) {
      fontSize = typeof next === "function" ? next(fontSize) : next;
    },
    triggerViewportMeasurement: async () => {
      actionLog.push("measure");
      return true;
    },
    focusViewport: async () => {
      actionLog.push("focus");
    },
  });

  let prevented = false;
  handlers.handleTerminalStageKeyDownCapture({
    ...createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "f" }),
    target: createShortcutTarget({ tagName: "DIV" }),
    preventDefault() {
      prevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStageKeyDownCapture>[0]);

  let fontPrevented = false;
  handlers.handleTerminalStageKeyDownCapture({
    ...createShortcutEvent({ ctrlKey: true, key: "=" }),
    target: createShortcutTarget({ tagName: "DIV" }),
    preventDefault() {
      fontPrevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStageKeyDownCapture>[0]);

  let copyPrevented = false;
  handlers.handleTerminalStageKeyDownCapture({
    ...createShortcutEvent({ ctrlKey: true, shiftKey: true, key: "c" }),
    target: createShortcutTarget({ tagName: "DIV" }),
    preventDefault() {
      copyPrevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStageKeyDownCapture>[0]);

  let nativeCopyPrevented = false;
  handlers.handleTerminalStageCopyCapture({
    target: createShortcutTarget({
      tagName: "TEXTAREA",
      closest: (selector) => selector.includes("xterm-helper-textarea") ? {} : null,
    }),
    preventDefault() {
      nativeCopyPrevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStageCopyCapture>[0]);

  let searchCopyPrevented = false;
  handlers.handleTerminalStageCopyCapture({
    target: createShortcutTarget({
      tagName: "INPUT",
      closest: (selector) => selector.includes("terminal-search-overlay") ? {} : null,
    }),
    preventDefault() {
      searchCopyPrevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStageCopyCapture>[0]);

  let nativeCutPrevented = false;
  handlers.handleTerminalStageCutCapture({
    target: createShortcutTarget({
      tagName: "TEXTAREA",
      closest: (selector) => selector.includes("xterm-helper-textarea") ? {} : null,
    }),
    preventDefault() {
      nativeCutPrevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStageCutCapture>[0]);

  let searchCutPrevented = false;
  handlers.handleTerminalStageCutCapture({
    target: createShortcutTarget({
      tagName: "INPUT",
      closest: (selector) => selector.includes("terminal-search-overlay") ? {} : null,
    }),
    preventDefault() {
      searchCutPrevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStageCutCapture>[0]);

  let nativePastePrevented = false;
  handlers.handleTerminalStagePasteCapture({
    target: createShortcutTarget({
      tagName: "TEXTAREA",
      closest: (selector) => selector.includes("xterm-helper-textarea") ? {} : null,
    }),
    clipboardData: {
      getData(type: string) {
        return type === "text" ? "native paste" : "";
      },
    },
    preventDefault() {
      nativePastePrevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStagePasteCapture>[0]);

  let emptyPastePrevented = false;
  handlers.handleTerminalStagePasteCapture({
    target: createShortcutTarget({
      tagName: "TEXTAREA",
      closest: (selector) => selector.includes("xterm-helper-textarea") ? {} : null,
    }),
    clipboardData: {
      getData() {
        return "";
      },
    },
    preventDefault() {
      emptyPastePrevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStagePasteCapture>[0]);

  let searchPastePrevented = false;
  handlers.handleTerminalStagePasteCapture({
    target: createShortcutTarget({
      tagName: "INPUT",
      closest: (selector) => selector.includes("terminal-search-overlay") ? {} : null,
    }),
    clipboardData: {
      getData(type: string) {
        return type === "text" ? "search text" : "";
      },
    },
    preventDefault() {
      searchPastePrevented = true;
    },
  } as Parameters<typeof handlers.handleTerminalStagePasteCapture>[0]);

  handlers.handleTerminalStageClick({
    target: createShortcutTarget({ tagName: "DIV" }),
  } as Parameters<typeof handlers.handleTerminalStageClick>[0]);

  handlers.handleTerminalStageClick({
    target: createShortcutTarget({ tagName: "INPUT" }),
  } as Parameters<typeof handlers.handleTerminalStageClick>[0]);

  handlers.closeTerminalSearch();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  assert.equal(prevented, true);
  assert.equal(fontPrevented, true);
  assert.equal(copyPrevented, true);
  assert.equal(nativeCopyPrevented, true);
  assert.equal(searchCopyPrevented, false);
  assert.equal(nativeCutPrevented, true);
  assert.equal(searchCutPrevented, false);
  assert.equal(nativePastePrevented, true);
  assert.equal(emptyPastePrevented, true);
  assert.equal(searchPastePrevented, false);
  assert.equal(searchOverlayOpen, false);
  assert.equal(fontSize, 15);
  assert.deepEqual(actionLog, [
    "open-search",
    "copy",
    "copy",
    "copy",
    "native-paste:native paste",
    "paste",
    "focus",
    "measure",
    "focus",
  ]);
});
