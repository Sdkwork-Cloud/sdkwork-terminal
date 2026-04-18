import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("runtime terminal stage owns the xterm host and runtime controller lifecycle", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "runtime-terminal-stage.tsx",
    ),
    "utf8",
  );

  assert.match(source, /export function RuntimeTerminalStage/);
  assert.match(source, /import \{ TerminalViewportSurface \} from "\.\/terminal-viewport-surface\.tsx";/);
  assert.match(source, /import \{ useTerminalHostSurface \} from "\.\/terminal-host-surface\.ts";/);
  assert.match(source, /import \{ TerminalRuntimeStatusOverlay \} from "\.\/terminal-runtime-status-overlay\.tsx";/);
  assert.match(source, /import \{ createTerminalRuntimeStatusViewModel \} from "\.\/terminal-runtime-status\.ts";/);
  assert.match(source, /import \{ useRuntimeTerminalSessionBinding \} from "\.\/terminal-runtime-session-binding\.ts";/);
  assert.match(source, /import \{ useTerminalViewportChrome \} from "\.\/terminal-viewport-chrome\.ts";/);
  assert.match(source, /controller:\s*RuntimeTabController/);
  assert.match(source, /const \{\s*handleRuntimeHostAttachFailure,\s*resetRuntimeSessionBinding,\s*\} = useRuntimeTerminalSessionBinding\(\{/);
  assert.match(source, /const \{\s*hostStatus,\s*triggerViewportMeasurement,\s*\} = useTerminalHostSurface\(\{/);
  assert.match(source, /const runtimeStatusViewModel = createTerminalRuntimeStatusViewModel\(\{/);
  assert.match(source, /const \{\s*stageContainerProps,\s*viewportSurfaceProps,\s*\} = useTerminalViewportChrome\(\{/);
  assert.match(source, /await runtimeController\.attachHost\(hostElement\);/);
  assert.match(source, /resetRuntimeSessionBinding\(\);/);
  assert.match(source, /await runtimeController\.detachHost\(\);/);
  assert.match(source, /onAttachFailure: handleRuntimeHostAttachFailure,/);
  assert.match(source, /readyDetail: "Attaching the xterm host, measuring the viewport, and restoring focus\.",/);
  assert.match(source, /<TerminalViewportSurface/);
  assert.match(source, /\{\.\.\.stageContainerProps\}/);
  assert.match(source, /\{\.\.\.viewportSurfaceProps\}/);
  assert.match(source, /<TerminalRuntimeStatusOverlay/);
  assert.match(source, /hostDataSlot="terminal-runtime-host"/);
  assert.match(source, /hostStatus=\{hostStatus\}/);
  assert.doesNotMatch(source, /import \{ createTerminalHostStatusDescriptor, createTerminalHostStatusViewModel \} from "\.\/terminal-host-status\.ts";/);
  assert.doesNotMatch(source, /import \{ useTerminalHostLifecycle \} from "\.\/terminal-host-lifecycle\.ts";/);
  assert.doesNotMatch(source, /import \{ createTerminalViewportInteractionHandlers \} from "\.\/terminal-viewport-interaction-handlers\.ts";/);
  assert.doesNotMatch(source, /import \{ useTerminalViewportPresentationEffects \} from "\.\/terminal-viewport-presentation-effects\.ts";/);
  assert.doesNotMatch(source, /createTerminalViewportActions/);
  assert.doesNotMatch(source, /registerTerminalViewportClipboardHandlers/);
  assert.doesNotMatch(source, /const \[searchOverlayOpen, setSearchOverlayOpen\] = useState\(false\);/);
  assert.doesNotMatch(source, /const \[viewportContextMenu, setViewportContextMenu\] = useState<\{ x: number; y: number \} \| null>\(null\);/);
  assert.doesNotMatch(source, /const \[fontSize, setFontSize\] = useState\(14\);/);
  assert.doesNotMatch(source, /const searchInputRef = useRef<HTMLInputElement \| null>\(null\);/);
  assert.doesNotMatch(source, /const latestInputHandlerRef = useRef\(props\.onViewportInput\);/);
  assert.doesNotMatch(source, /const latestTitleHandlerRef = useRef\(props\.onViewportTitleChange\);/);
  assert.doesNotMatch(source, /const latestReplayAppliedHandlerRef = useRef\(props\.onRuntimeReplayApplied\);/);
  assert.doesNotMatch(source, /const latestRuntimeErrorHandlerRef = useRef\(onRuntimeError\);/);
  assert.doesNotMatch(source, /const boundSessionKeyRef = useRef<string \| null>\(null\);/);
  assert.doesNotMatch(source, /const runtimeStatusIsRetrying =/);
  assert.doesNotMatch(source, /const runtimeAutoRetryExhausted =/);
  assert.doesNotMatch(source, /const showRuntimeStatus =/);
  assert.doesNotMatch(source, /const runtimeStatusTitle =/);
  assert.doesNotMatch(source, /const runtimeStatusDetail =/);
  assert.doesNotMatch(source, /async function copySelectionToClipboard\(\)/);
  assert.doesNotMatch(source, /async function pasteClipboardIntoTerminal\(\)/);
  assert.doesNotMatch(source, /async function selectAllTerminalViewport\(\)/);
  assert.doesNotMatch(source, /function openTerminalSearch\(\)/);
  assert.doesNotMatch(source, /const VIEWPORT_MEASURE_RETRY_LIMIT = 6;/);
  assert.doesNotMatch(source, /const VIEWPORT_MEASURE_RETRY_DELAY_MS = 32;/);
  assert.doesNotMatch(source, /const measureViewport = async \(\): Promise<boolean> => \{/);
  assert.doesNotMatch(source, /const ensureViewportMeasured = async \(\): Promise<boolean> => \{/);
  assert.doesNotMatch(source, /new ResizeObserver/);
  assert.doesNotMatch(source, /document\.addEventListener\("mousedown", dismissViewportContextMenu\);/);
  assert.doesNotMatch(source, /const documentFonts = document\.fonts;/);
  assert.doesNotMatch(source, /documentFonts\.addEventListener\?\.\("loadingdone", handleLoadingDone\);/);
  assert.doesNotMatch(source, /function closeTerminalSearch\(\)/);
  assert.doesNotMatch(source, /function handleTerminalStageKeyDownCapture/);
  assert.doesNotMatch(source, /Copy <span style=\{shortcutHintStyle\}>/);
  assert.doesNotMatch(source, /Paste <span style=\{shortcutHintStyle\}>/);
  assert.doesNotMatch(source, /resolveTerminalViewportShortcutHint\("copy"\)/);
  assert.doesNotMatch(source, /contextMenuDividerStyle/);
  assert.doesNotMatch(source, /createViewportContextMenuStyle/);
  assert.doesNotMatch(source, /shortcutHintStyle/);
  assert.doesNotMatch(source, /viewportContextMenuItemStyle/);
  assert.match(source, /data-slot="terminal-bootstrap-overlay"/);
  assert.doesNotMatch(source, /data-slot="terminal-host-status"/);
  assert.doesNotMatch(source, /<TerminalSearchOverlay/);
  assert.doesNotMatch(source, /function handleSearchInputChange/);
  assert.doesNotMatch(source, /function handleSearchInputKeyDown/);
  assert.doesNotMatch(source, /aria-label="Open terminal search"/);
  assert.doesNotMatch(source, /createRuntimeTabController/);
  assert.doesNotMatch(source, /runtimeControllerRef/);
  assert.doesNotMatch(source, /MAX_PASTE_LENGTH/);
  assert.doesNotMatch(source, /navigator\.clipboard/);
  assert.doesNotMatch(source, /Ctrl\+Shift\+C/);
  assert.doesNotMatch(source, /Ctrl\+Shift\+V/);
  assert.doesNotMatch(source, /Ctrl\+Shift\+A/);
  assert.doesNotMatch(source, /Ctrl\+Shift\+F/);
  assert.doesNotMatch(source, /onRegisterRuntimeController/);
  assert.doesNotMatch(source, /data-slot="terminal-live-prompt"/);
  assert.doesNotMatch(source, /textarea/);
});

test("fallback terminal stage owns the textarea prompt path and transcript viewport", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "fallback-terminal-stage.tsx",
    ),
    "utf8",
  );

  assert.match(source, /export function FallbackTerminalStage/);
  assert.match(source, /import \{ TerminalViewportSurface \} from "\.\/terminal-viewport-surface\.tsx";/);
  assert.match(source, /import \{ useTerminalHostSurface \} from "\.\/terminal-host-surface\.ts";/);
  assert.match(source, /import \{\s*createTerminalHiddenInputBridge,\s*focusTerminalHiddenInput,\s*\} from "\.\/terminal-hidden-input-bridge\.ts";/);
  assert.match(source, /import \{ useTerminalViewportChrome \} from "\.\/terminal-viewport-chrome\.ts";/);
  assert.match(source, /createXtermViewportDriver/);
  assert.match(source, /const hiddenInputBridge = createTerminalHiddenInputBridge\(\{/);
  assert.match(source, /const \{\s*hostStatus,\s*triggerViewportMeasurement,\s*\} = useTerminalHostSurface\(\{/);
  assert.match(source, /const \{\s*fontSize,\s*stageContainerProps,\s*viewportSurfaceProps,\s*\} = useTerminalViewportChrome\(\{/);
  assert.match(source, /readyDetail: "Attaching the xterm host, rendering transcript content, and restoring focus\.",/);
  assert.match(source, /data-slot="terminal-hidden-input"/);
  assert.match(source, /data-slot="terminal-live-prompt"/);
  assert.doesNotMatch(source, /data-slot="terminal-host-status"/);
  assert.doesNotMatch(source, /<TerminalSearchOverlay/);
  assert.doesNotMatch(source, /function handleSearchInputChange/);
  assert.doesNotMatch(source, /function handleSearchInputKeyDown/);
  assert.doesNotMatch(source, /aria-label="Open terminal search"/);
  assert.match(source, /onInput=\{hiddenInputBridge\.handleHiddenInput\}/);
  assert.match(source, /onCompositionStart=\{hiddenInputBridge\.handleCompositionStart\}/);
  assert.match(source, /onCompositionEnd=\{hiddenInputBridge\.handleCompositionEnd\}/);
  assert.match(source, /onKeyDown=\{hiddenInputBridge\.handleHiddenInputKeyDown\}/);
  assert.match(source, /await driver\.render\(props\.tab\.snapshot\);/);
  assert.match(source, /<TerminalViewportSurface/);
  assert.match(source, /\{\.\.\.stageContainerProps\}/);
  assert.match(source, /\{\.\.\.viewportSurfaceProps\}/);
  assert.match(source, /hostStatus=\{hostStatus\}/);
  assert.match(source, /onClearTerminal=\{\(\) => \{/);
  assert.match(source, /void driver\.reset\(\);/);
  assert.match(source, /focusTerminalHiddenInput\(hiddenInputRef\.current\);/);
  assert.doesNotMatch(source, /import \{ createTerminalHostStatusDescriptor, createTerminalHostStatusViewModel \} from "\.\/terminal-host-status\.ts";/);
  assert.doesNotMatch(source, /import \{ useTerminalHostLifecycle \} from "\.\/terminal-host-lifecycle\.ts";/);
  assert.doesNotMatch(source, /import \{ createTerminalViewportInteractionHandlers \} from "\.\/terminal-viewport-interaction-handlers\.ts";/);
  assert.doesNotMatch(source, /import \{ useTerminalViewportPresentationEffects \} from "\.\/terminal-viewport-presentation-effects\.ts";/);
  assert.doesNotMatch(source, /createTerminalViewportActions/);
  assert.doesNotMatch(source, /registerTerminalViewportClipboardHandlers/);
  assert.doesNotMatch(source, /const \[searchOverlayOpen, setSearchOverlayOpen\] = useState\(false\);/);
  assert.doesNotMatch(source, /const \[viewportContextMenu, setViewportContextMenu\] = useState<\{ x: number; y: number \} \| null>\(null\);/);
  assert.doesNotMatch(source, /const searchInputRef = useRef<HTMLInputElement \| null>\(null\);/);
  assert.doesNotMatch(source, /function handleHiddenInput\(/);
  assert.doesNotMatch(source, /function handleCompositionEnd\(/);
  assert.doesNotMatch(source, /function handleHiddenInputKeyDown\(/);
  assert.doesNotMatch(source, /async function copySelectionToClipboard\(\)/);
  assert.doesNotMatch(source, /async function pasteClipboardIntoTerminal\(\)/);
  assert.doesNotMatch(source, /async function selectAllTerminalViewport\(\)/);
  assert.doesNotMatch(source, /function openTerminalSearch\(\)/);
  assert.doesNotMatch(source, /const VIEWPORT_MEASURE_RETRY_LIMIT = 6;/);
  assert.doesNotMatch(source, /const VIEWPORT_MEASURE_RETRY_DELAY_MS = 32;/);
  assert.doesNotMatch(source, /const measureViewport = async \(\): Promise<boolean> => \{/);
  assert.doesNotMatch(source, /const ensureViewportMeasured = async \(\): Promise<boolean> => \{/);
  assert.doesNotMatch(source, /new ResizeObserver/);
  assert.doesNotMatch(source, /document\.addEventListener\("mousedown", dismissViewportContextMenu\);/);
  assert.doesNotMatch(source, /const documentFonts = document\.fonts;/);
  assert.doesNotMatch(source, /documentFonts\.addEventListener\?\.\("loadingdone", handleLoadingDone\);/);
  assert.doesNotMatch(source, /function closeTerminalSearch\(\)/);
  assert.doesNotMatch(source, /function handleTerminalStageKeyDownCapture/);
  assert.doesNotMatch(source, /Copy <span style=\{shortcutHintStyle\}>/);
  assert.doesNotMatch(source, /Paste <span style=\{shortcutHintStyle\}>/);
  assert.doesNotMatch(source, /resolveTerminalViewportShortcutHint\("copy"\)/);
  assert.doesNotMatch(source, /contextMenuDividerStyle/);
  assert.doesNotMatch(source, /createViewportContextMenuStyle/);
  assert.doesNotMatch(source, /shortcutHintStyle/);
  assert.doesNotMatch(source, /viewportContextMenuItemStyle/);
  assert.doesNotMatch(source, /MAX_PASTE_LENGTH/);
  assert.doesNotMatch(source, /navigator\.clipboard/);
  assert.doesNotMatch(source, /Ctrl\+Shift\+C/);
  assert.doesNotMatch(source, /Ctrl\+Shift\+V/);
  assert.doesNotMatch(source, /Ctrl\+Shift\+A/);
  assert.doesNotMatch(source, /Ctrl\+Shift\+F/);
  assert.doesNotMatch(source, /createRuntimeTabController/);
  assert.doesNotMatch(source, /data-slot="terminal-runtime-status"/);
});
