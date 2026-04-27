import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTerminalViewportInteractionHandlers } from "../packages/sdkwork-terminal-shell/src/terminal-viewport-interaction-handlers.ts";

function createTerminalInteractionHandlers(
  overrides: Partial<Parameters<typeof createTerminalViewportInteractionHandlers>[0]> = {},
) {
  return createTerminalViewportInteractionHandlers({
    active: true,
    viewportActions: {
      copySelectionToClipboard: async () => {},
      pasteTextIntoTerminal: async () => {},
      pasteClipboardIntoTerminal: async () => {},
      selectAllTerminalViewport: async () => {},
      openTerminalSearch() {},
    },
    searchOverlayOpen: false,
    setSearchOverlayOpen() {},
    setFontSize() {},
    triggerViewportMeasurement: async () => true,
    focusViewport: async () => {},
    ...overrides,
  });
}

function createTerminalShortcutEvent(
  overrides: Record<string, unknown>,
) {
  return {
    key: "",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    target: null,
    preventDefault() {},
    ...overrides,
  } as never;
}

test("shared terminal viewport interaction handlers centralize search close, key shortcuts, and click focus", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-viewport-interaction-handlers.ts",
    ),
    "utf8",
  );

  assert.match(source, /export interface CreateTerminalViewportInteractionHandlersArgs/);
  assert.match(source, /active: boolean;/);
  assert.match(source, /viewportActions: Pick</);
  assert.match(source, /setSearchOverlayOpen: \(open: boolean\) => void;/);
  assert.match(source, /setFontSize: Dispatch<SetStateAction<number>>;/);
  assert.match(source, /triggerViewportMeasurement: \(\) => Promise<boolean> \| boolean;/);
  assert.match(source, /focusViewport: \(\) => Promise<void> \| void;/);
  assert.match(source, /export function createTerminalViewportInteractionHandlers/);
  assert.match(source, /function closeTerminalSearch\(\)/);
  assert.match(source, /await args\.triggerViewportMeasurement\(\);/);
  assert.match(source, /await args\.focusViewport\(\);/);
  assert.match(source, /function handleTerminalStageKeyDownCapture/);
  assert.match(source, /function handleTerminalStageCopyCapture/);
  assert.match(source, /function handleTerminalStageCutCapture/);
  assert.match(source, /function handleTerminalStagePasteCapture/);
  assert.match(source, /if \(!args\.active\) \{\s*return;\s*\}/);
  assert.match(source, /if \(isTerminalSearchShortcut\(event\)\) \{/);
  assert.match(source, /if \(shouldIgnoreTerminalViewportInteractionTarget\(target\)\) \{\s*return;\s*\}/);
  assert.match(source, /if \(isTerminalCopyShortcut\(event\) \|\| isTerminalInsertCopyShortcut\(event\)\) \{/);
  assert.match(source, /if \(isTerminalPasteShortcut\(event\) \|\| isTerminalInsertPasteShortcut\(event\)\) \{/);
  assert.match(source, /if \(isTerminalSelectAllShortcut\(event\)\) \{/);
  assert.match(source, /const fontSizeAction = resolveTerminalViewportFontSizeShortcutAction\(event\);/);
  assert.match(source, /args\.setFontSize\(\(previous\) => resolveNextTerminalViewportFontSize\(previous,\s*fontSizeAction\)\);/);
  assert.match(source, /import \{ runTerminalTaskBestEffort \} from "\.\/terminal-async-boundary\.ts";/);
  assert.match(
    source,
    /runTerminalTaskBestEffort\(\s*args\.viewportActions\.copySelectionToClipboard,\s*\);/,
  );
  assert.match(source, /handleTerminalStageCutCapture/);
  assert.match(source, /const pastedText = event\.clipboardData\.getData\("text"\);/);
  assert.match(
    source,
    /runTerminalTaskBestEffort\(\(\) =>\s*args\.viewportActions\.pasteTextIntoTerminal\(pastedText\),\s*\);/,
  );
  assert.match(
    source,
    /runTerminalTaskBestEffort\(\s*args\.viewportActions\.pasteClipboardIntoTerminal,\s*\);/,
  );
  assert.match(source, /function handleTerminalStageClick/);
  assert.match(source, /if \(shouldIgnoreTerminalViewportInteractionTarget\(event\.target\)\) \{\s*return;\s*\}/);
  assert.match(source, /runTerminalTaskBestEffort\(args\.focusViewport\);/);
});

test("terminal viewport shortcut actions contain async action failures", async () => {
  const unhandledRejections: unknown[] = [];
  const handleUnhandledRejection = (cause: unknown) => {
    unhandledRejections.push(cause);
  };
  const handlers = createTerminalInteractionHandlers({
    viewportActions: {
      copySelectionToClipboard: async () => {
        throw new Error("copy failed");
      },
      pasteTextIntoTerminal: async () => {},
      pasteClipboardIntoTerminal: async () => {},
      selectAllTerminalViewport: async () => {},
      openTerminalSearch() {},
    },
  });

  process.on("unhandledRejection", handleUnhandledRejection);
  try {
    handlers.handleTerminalStageKeyDownCapture(
      createTerminalShortcutEvent({
        key: "C",
        ctrlKey: true,
        shiftKey: true,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(unhandledRejections, []);
  } finally {
    process.off("unhandledRejection", handleUnhandledRejection);
  }
});

test("terminal viewport click focus contains synchronous focus throws", () => {
  const handlers = createTerminalInteractionHandlers({
    focusViewport() {
      throw new Error("focus threw");
    },
  });

  assert.doesNotThrow(() => {
    handlers.handleTerminalStageClick({
      target: null,
    } as never);
  });
});

test("terminal viewport search close contains measurement failures", async () => {
  const unhandledRejections: unknown[] = [];
  const handleUnhandledRejection = (cause: unknown) => {
    unhandledRejections.push(cause);
  };
  const handlers = createTerminalInteractionHandlers({
    triggerViewportMeasurement: async () => {
      throw new Error("measure failed");
    },
    searchOverlayOpen: true,
  });

  process.on("unhandledRejection", handleUnhandledRejection);
  try {
    handlers.closeTerminalSearch();

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(unhandledRejections, []);
  } finally {
    process.off("unhandledRejection", handleUnhandledRejection);
  }
});
