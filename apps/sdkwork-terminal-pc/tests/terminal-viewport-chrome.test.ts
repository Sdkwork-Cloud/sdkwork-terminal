import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal viewport chrome hook centralizes local viewport ui state and shared wiring", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-viewport-chrome.ts",
    ),
    "utf8",
  );

  assert.match(source, /export interface UseTerminalViewportChromeArgs/);
  assert.match(source, /import \{ runTerminalTaskBestEffort \} from "\.\/terminal-async-boundary\.ts";/);
  assert.match(source, /import \{ useStableCallback \} from "\.\/terminal-react-stability\.ts";/);
  assert.match(source, /active: boolean;/);
  assert.match(source, /stageKey: string;/);
  assert.match(source, /searchQuery: string;/);
  assert.match(source, /onSearchQueryChange: \(query: string\) => void;/);
  assert.match(source, /onSearchSelectMatch: \(\) => void;/);
  assert.match(source, /runSearch: \(query: string\) => Promise<void> \| void;/);
  assert.match(source, /readSelection: \(\) => Promise<string>;/);
  assert.match(source, /pasteTextIntoTerminal: \(text: string\) => Promise<void>;/);
  assert.match(source, /focusViewport: \(\) => Promise<void> \| void;/);
  assert.match(source, /selectAllTerminalViewport: \(\) => Promise<void>;/);
  assert.match(source, /applyFontSize: \(fontSize: number\) => void;/);
  assert.match(source, /triggerViewportMeasurement: \(\) => Promise<boolean> \| boolean;/);
  assert.match(source, /export function useTerminalViewportChrome/);
  assert.match(source, /const searchInputRef = useRef<HTMLInputElement \| null>\(null\);/);
  assert.match(source, /const contextMenuRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(source, /const \[searchOverlayOpen, setSearchOverlayOpen\] = useState\(false\);/);
  assert.match(source, /const \[viewportContextMenu, setViewportContextMenu\] = useState<\{ x: number; y: number \} \| null>\(null\);/);
  assert.match(source, /const \[fontSize, setFontSize\] = useState\(14\);/);
  assert.match(source, /const readSelection = useStableCallback\(args\.readSelection\);/);
  assert.match(source, /const pasteTextIntoTerminal = useStableCallback\(args\.pasteTextIntoTerminal\);/);
  assert.match(source, /const focusViewport = useStableCallback\(args\.focusViewport\);/);
  assert.match(source, /const selectAllTerminalViewport = useStableCallback\(args\.selectAllTerminalViewport\);/);
  assert.match(source, /const applyFontSize = useStableCallback\(args\.applyFontSize\);/);
  assert.match(source, /const triggerViewportMeasurement = useStableCallback\(args\.triggerViewportMeasurement\);/);
  assert.match(source, /const runSearch = useStableCallback\(args\.runSearch\);/);
  assert.match(source, /const dismissViewportContextMenu = useStableCallback\(\(\) => \{/);
  assert.match(source, /const openViewportContextMenu = useStableCallback\(\(menu: \{ x: number; y: number \}\) => \{/);
  assert.match(source, /const viewportActions = createTerminalViewportActions\(\{/);
  assert.match(source, /return registerTerminalViewportClipboardHandlers\(\{/);
  assert.match(source, /runTerminalTaskBestEffort\(\(\) => runSearch\(args\.searchQuery\)\);/);
  assert.match(source, /useTerminalViewportPresentationEffects\(\{/);
  assert.match(source, /applyFontSize,/);
  assert.match(source, /triggerViewportMeasurement,/);
  assert.match(source, /focusViewport,/);
  assert.match(source, /contextMenuRef,/);
  assert.match(source, /const \{\s*closeTerminalSearch,\s*handleTerminalStageClick,\s*handleTerminalStageKeyDownCapture,\s*handleTerminalStageCopyCapture,\s*handleTerminalStageCutCapture,\s*handleTerminalStagePasteCapture,\s*\} = createTerminalViewportInteractionHandlers\(\{/);
  assert.match(source, /stageContainerProps: \{/);
  assert.match(source, /onCopyCapture: handleTerminalStageCopyCapture,/);
  assert.match(source, /onCutCapture: handleTerminalStageCutCapture,/);
  assert.match(source, /onPasteCapture: handleTerminalStagePasteCapture,/);
  assert.match(source, /viewportSurfaceProps: \{/);
  assert.match(source, /contextMenuRef,/);
  assert.match(source, /onSearchSubmit: \(\) => \{/);
  assert.match(source, /args\.onSearchSelectMatch\(\);/);
  assert.doesNotMatch(source, /const latestReadSelectionRef = useRef/);
});
