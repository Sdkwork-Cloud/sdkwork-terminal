import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shell app keeps a tab header and a terminal-first body", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "index.tsx"),
    "utf8",
  );
  const dashboardLabels = ["Resources", "Sessions", "Settings", "Diagnostics"];

  assert.match(source, /@xterm\/xterm\/css\/xterm\.css/);
  assert.match(source, /data-shell-layout="terminal-tabs"/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /snapshot\.tabs\.map\(\(tab\) =>/);
  assert.match(source, /id=\{`terminal-panel-\$\{tab\.id\}`\}/);
  assert.match(source, /active=\{tab\.active\}/);
  assert.match(source, /data-slot="terminal-header-leading"/);
  assert.match(source, /data-slot="terminal-header-trailing"/);
  assert.match(source, /data-slot="terminal-header-chrome"/);
  assert.match(source, /data-slot="terminal-window-controls"/);
  assert.match(source, /data-slot="terminal-tab-close"/);
  assert.match(source, /data-slot="terminal-live-prompt"/);
  assert.match(source, /data-tauri-drag-region/);
  assert.match(source, /New terminal tab/);
  assert.match(source, /Open terminal profile menu/);
  assert.match(source, /Minimize window/);
  assert.match(source, /Maximize window/);
  assert.match(source, /Close window/);
  assert.match(source, /shouldDockTabActionsToTrailing/);
  assert.match(source, /resolveTerminalTabActionInlineWidth/);
  assert.match(source, /headerDragSpacerStyle\(shouldDockTabActionsToTrailing\)/);
  assert.match(
    source,
    /style=\{tabShellStyle\(\s*active,\s*closeVisible,\s*shouldDockTabActionsToTrailing,?\s*\)\}/,
  );
  assert.match(
    source,
    /function tabShellStyle\(\s*active: boolean,\s*hovered: boolean,\s*docked: boolean,\s*\)/,
  );
  assert.match(source, /flex:\s*docked \? "1 0 0" : "0 0 auto"/);
  assert.match(source, /webRuntimeClient\?: Pick</);
  assert.match(source, /"createRemoteRuntimeSession"/);
  assert.match(source, /webRuntimeTarget\?:/);
  assert.doesNotMatch(source, /props\.tab\.runtimeBootstrap\.kind === "remote-runtime"/);
  assert.doesNotMatch(
    source,
    /const showLivePrompt = props\.mode === "web" && !usesRuntimeTerminalStream/,
  );
  assert.match(source, /shouldUseTerminalShellFallbackMode/);
  assert.match(source, /shouldUseTerminalShellRuntimeStream/);
  assert.match(source, /resolveTerminalShellRuntimeClientKind/);
  assert.match(source, /resolveTerminalStageBehavior/);
  assert.match(
    source,
    /const\s*\{\s*usesRuntimeTerminalStream,\s*showLivePrompt,\s*showBootstrapOverlay,\s*\}\s*=\s*resolveTerminalStageBehavior\(\{\s*mode: props\.mode,\s*runtimeBootstrap: props\.tab\.runtimeBootstrap,\s*runtimeSessionId: props\.tab\.runtimeSessionId,\s*runtimeState: props\.tab\.runtimeState,\s*runtimeStreamStarted: props\.tab\.runtimeStreamStarted,\s*\}\);/,
  );
  assert.match(
    source,
    /!\s*shouldUseTerminalShellFallbackMode\(\{\s*mode: props\.mode,\s*runtimeBootstrap: tab\.runtimeBootstrap,\s*runtimeSessionId: tab\.runtimeSessionId,\s*\}\)/,
  );
  assert.match(source, /padding:\s*0/);
  assert.match(source, /padding:\s*"6px 0 0 8px"/);
  assert.match(source, /Scroll terminal tabs left/);
  assert.match(source, /Scroll terminal tabs right/);
  assert.match(source, /Shells/);
  assert.match(source, /AI CLI/);
  assert.match(source, /Codex CLI/);
  assert.match(source, /Claude Code/);
  assert.match(source, /Gemini CLI/);
  assert.match(source, /OpenCode CLI/);
  assert.match(source, /onContextMenu/);
  assert.match(source, /onMouseEnter/);
  assert.match(source, /onMouseLeave/);
  assert.match(source, /Close other tabs/);
  assert.match(source, /Close tabs to the right/);
  assert.match(source, /Duplicate tab/);
  assert.match(source, /setInputListener/);
  assert.match(source, /measureViewport/);
  assert.match(source, /const latestActiveRef = useRef\(props\.active\);/);
  assert.match(source, /const hasAttachedRef = useRef\(false\);/);
  assert.match(
    source,
    /if \(hasAttachedRef\.current \|\| !props\.active\) \{\s*return;\s*\}/,
  );
  assert.match(source, /hasAttachedRef\.current = true;/);
  assert.match(source, /latestActiveRef\.current = props\.active;/);
  assert.match(source, /if \(!latestActiveRef\.current\) \{\s*return;\s*\}/);
  assert.match(source, /driver\.setCursorVisible\(!showBootstrapOverlay\);/);
  assert.match(source, /await driver\.focus\(\);/);
  assert.match(source, /appendTerminalShellPendingRuntimeInput/);
  assert.match(source, /consumeTerminalShellPendingRuntimeInput/);
  assert.match(source, /runtimePendingInput/);
  assert.match(source, /runtimeAttachmentId/);
  assert.match(source, /runtimeBootstrapAttempts/);
  assert.match(source, /runtimeBootstrapLastError/);
  assert.match(source, /consumeTerminalShellPendingRuntimeInput\(/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /navigator\.clipboard\.readText/);
  assert.match(source, /data-slot="terminal-bootstrap-overlay"/);
  assert.match(source, /data-slot="terminal-search-overlay"/);
  assert.match(source, /data-slot="terminal-search-input"/);
  assert.match(source, /data-slot="terminal-runtime-status"/);
  assert.match(source, /props\.tab\.runtimeState === "binding"/);
  assert.match(source, /props\.tab\.runtimeState === "retrying"/);
  assert.match(source, /props\.tab\.runtimeState === "exited"/);
  assert.match(source, /props\.tab\.runtimeState === "failed"/);
  assert.match(source, /props\.tab\.runtimePendingInput\.length > 0/);
  assert.match(source, /Starting shell/);
  assert.match(source, /Retrying shell/);
  assert.match(source, /Shell exited/);
  assert.match(source, /Shell failed/);
  assert.match(source, /Input queued/);
  assert.match(source, /Restart shell/);
  assert.match(source, /shouldAutoRetryTerminalShellBootstrap/);
  assert.match(source, /queueTerminalShellTabRuntimeBootstrapRetry/);
  assert.match(source, /queueTerminalShellTabBootstrapCommand/);
  assert.match(source, /resolveTerminalShellRuntimeBootstrapRequestFromTab/);
  assert.match(source, /const runtimeDerivedState = createRuntimeDerivedState\(snapshot\.tabs\);/);
  assert.match(source, /const runtimeBindingEffectKey = runtimeDerivedState\.runtimeBindingEffectKey;/);
  assert.match(source, /const retryingTabsEffectKey = runtimeDerivedState\.retryingTabsEffectKey;/);
  assert.match(source, /const runtimeBootstrapEffectKey = runtimeDerivedState\.runtimeBootstrapEffectKey;/);
  assert.match(source, /const runtimePendingInputEffectKey = runtimeDerivedState\.runtimePendingInputEffectKey;/);
  assert.match(source, /const snapshotTabById = runtimeDerivedState\.snapshotTabById;/);
  assert.match(source, /for \(const tab of runtimeDerivedState\.runtimeBootstrapCandidateTabs\) \{/);
  assert.match(source, /for \(const tab of runtimeDerivedState\.runtimePendingInputTabs\) \{/);
  assert.match(source, /function queueDesktopRuntimeReplay\(/);
  assert.match(source, /function flushQueuedDesktopRuntimeReplay\(/);
  assert.match(source, /window\.requestAnimationFrame\(\(\) => \{\s*void flushQueuedDesktopRuntimeReplay\(\);\s*\}\)/);
  assert.match(source, /const batches = Array\.from\(runtimeReplayBatchRef\.current\.values\(\)\);/);
  assert.match(source, /applyTerminalShellReplayBatches,/);
  assert.match(source, /updateShellStateDeferred\(\(current\) =>\s*applyTerminalShellReplayBatches\(current,\s*batches\),\s*\);/);
  assert.match(source, /queueDesktopRuntimeReplay\(event\.sessionId,\s*binding\.tabId,\s*event\.nextCursor,\s*event\.entry\);/);
  assert.match(source, /const runtimeSessionReplayInFlightRef = useRef<Set<string>>\(new Set\(\)\);/);
  assert.match(source, /if \(runtimeSessionReplayInFlightRef\.current\.has\(sessionId\)\) \{\s*return;\s*\}/);
  assert.match(source, /runtimeSessionReplayInFlightRef\.current\.add\(sessionId\);/);
  assert.match(source, /runtimeSessionReplayInFlightRef\.current\.delete\(sessionId\);/);
  assert.match(source, /const runtimeContentSyncActiveRef = useRef\(props\.active\);/);
  assert.match(source, /const queuedRuntimeAppendRef = useRef\(""\);/);
  assert.match(source, /const runtimeAppendFlushHandleRef = useRef<number \| null>\(null\);/);
  assert.match(source, /function clearQueuedRuntimeAppendFlush\(\)/);
  assert.match(source, /function flushQueuedRuntimeAppend\(\)/);
  assert.match(source, /function scheduleQueuedRuntimeAppendFlush\(\)/);
  assert.match(source, /queuedRuntimeAppendRef\.current \+= appendedContent;/);
  assert.match(source, /window\.requestAnimationFrame\(\(\) => \{\s*void flushQueuedRuntimeAppend\(\);\s*\}\)/);
  assert.match(source, /const becameActive = props\.active && !runtimeContentSyncActiveRef\.current;/);
  assert.match(source, /runtimeContentSyncActiveRef\.current = props\.active;/);
  assert.match(source, /if \(!props\.active\) \{\s*clearQueuedRuntimeAppendFlush\(\);\s*queuedRuntimeAppendRef\.current = "";\s*return;\s*\}/);
  assert.match(source, /switchedRuntimeMode \|\| becameActive \|\| justTruncated \|\| !nextContent\.startsWith\(previousContent\)/);
  assert.match(source, /clearQueuedRuntimeAppendFlush\(\);\s*queuedRuntimeAppendRef\.current = "";\s*renderedRuntimeContentRef\.current = nextContent;\s*void driver\.writeRaw\(nextContent, true\);/);
  assert.match(source, /queuedRuntimeAppendRef\.current \+= appendedContent;\s*scheduleQueuedRuntimeAppendFlush\(\);/);
  assert.match(source, /function updateShellState\(\s*update: \(current: TerminalShellState\) => TerminalShellState,\s*\)\s*\{\s*setShellState\(\(current\) => update\(current\)\);\s*\}/);
  assert.match(source, /function updateShellStateDeferred\(\s*update: \(current: TerminalShellState\) => TerminalShellState,\s*\)\s*\{\s*startTransition\(\(\) => \{\s*setShellState\(\(current\) => update\(current\)\);\s*\}\);\s*\}/);
  assert.match(source, /function applyDesktopRuntimeReplay\([\s\S]*updateShellStateDeferred\(\(current\) =>/);
  assert.match(source, /resumeTerminalShellTabRuntimeBootstrap/);
  assert.match(source, /preservePendingInput:\s*tab\.runtimeState === "failed"/);
  assert.match(source, /Automatic retry was exhausted/);
  assert.match(source, /Retrying automatically/);
  assert.match(source, /resolveTerminalRuntimePollInterval/);
  assert.match(source, /shouldFlushTerminalRuntimeInputQueue/);
  assert.match(source, /runtimeSubscriptionFailureSessionIdsRef/);
  assert.match(source, /runtimeSessionReplayInFlightRef\.current\.clear\(\);/);
  assert.doesNotMatch(source, /const runtimeBindingEffectKey = createRuntimeBindingEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const retryingTabsEffectKey = createRetryingTabsEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const runtimeBootstrapEffectKey = createRuntimeBootstrapEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const runtimePendingInputEffectKey = createRuntimePendingInputEffectKey\(snapshot\.tabs\);/);
  assert.match(source, /viewportCopyHandlersRef/);
  assert.match(source, /viewportPasteHandlersRef/);
  assert.match(source, /onRegisterViewportCopyHandler/);
  assert.match(
    source,
    /\}, \[props\.onRegisterViewportPasteHandler, props\.onViewportInput, props\.tab\.id, showLivePrompt\]\);/,
  );
  assert.match(
    source,
    /if \(!props\.active \|\| searchOverlayOpen\) \{\s*return;\s*\}/,
  );
  assert.match(
    source,
    /void \(async \(\) => \{\s*await measureViewportRef\.current\?\.\(\);\s*focusTerminalInput\(\);\s*\}\)\(\);/,
  );
  assert.match(
    source,
    /\}, \[\s*props\.active,\s*props\.tab\.id,\s*searchOverlayOpen,\s*showBootstrapOverlay,\s*showLivePrompt,\s*usesRuntimeTerminalStream,\s*\]\);/,
  );
  assert.match(source, /onViewportTitleChange/);
  assert.match(source, /Open terminal search/);
  assert.match(source, /Close terminal search/);
  assert.match(source, /Select all\s+<span style=\{shortcutHintStyle\}>Ctrl\+Shift\+A<\/span>/);
  assert.match(source, /\.xterm-viewport::\-webkit-scrollbar/);
  assert.match(source, /\.xterm-viewport::\-webkit-scrollbar-thumb/);
  assert.match(source, /\.xterm \.xterm-helper-textarea \{\s*position:\s*fixed !important;\s*left:\s*-9999px !important;\s*top:\s*-9999px !important;\s*width:\s*1px !important;\s*height:\s*1px !important;\s*opacity:\s*0 !important;\s*pointer-events:\s*none !important;\s*caret-color:\s*transparent;\s*\}/);
  assert.match(source, /scrollbar-width:\s*thin/);
  assert.match(source, /scrollbar-gutter:\s*stable/);
  assert.match(source, /width:\s*8px;/);
  assert.match(source, /height:\s*8px;/);
  assert.match(source, /const TERMINAL_SCROLLBAR_THUMB = "rgba\(82, 82, 91, 0\.72\)";/);
  assert.match(source, /const TERMINAL_SCROLLBAR_THUMB_HOVER = "rgba\(113, 113, 122, 0\.9\)";/);
  assert.match(source, /button:hover \{\s*background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\);\s*color:\s*#fafafa;\s*\}/);
  assert.match(source, /button\[data-intent="danger"\]:hover \{\s*background:\s*#c42b1c;\s*color:\s*#ffffff;\s*\}/);
  assert.match(
    source,
    /boxShadow:\s*active \? "0 0 0 1px rgba\(255, 255, 255, 0\.02\) inset" : "none"/,
  );
  assert.match(
    source,
    /transition:\s*"background 120ms ease, color 120ms ease, box-shadow 120ms ease"/,
  );
  assert.match(source, /onViewportResize/);
  assert.match(source, /resizeTerminalShellTab/);
  assert.match(source, /measureTerminalTabStripContentWidth/);
  assert.match(source, /const MemoTerminalStage = memo\(TerminalStage,/);
  assert.match(source, /function resolveTabSnapshotById\(tabId: string\)\s*\{\s*return snapshotTabById\.get\(tabId\) \?\? null;\s*\}/);
  assert.match(source, /function createRuntimeDerivedState\(/);
  assert.match(source, /const runtimeDerivedStateCache = new WeakMap</);
  assert.match(source, /const cachedDerivedState = runtimeDerivedStateCache\.get\(tabs\);/);
  assert.match(source, /if \(cachedDerivedState\) \{\s*return cachedDerivedState;\s*\}/);
  assert.match(source, /const snapshotTabById = new Map<string,\s*TerminalShellSnapshot\["tabs"\]\[number\]>\(\);/);
  assert.match(source, /const runtimeBootstrapCandidateTabs: TerminalShellSnapshot\["tabs"\] = \[\];/);
  assert.match(source, /const runtimePendingInputTabs: TerminalShellSnapshot\["tabs"\] = \[\];/);
  assert.match(source, /snapshotTabById\.set\(tab\.id,\s*tab\);/);
  assert.match(source, /runtimeDerivedStateCache\.set\(tabs,\s*nextDerivedState\);/);
  assert.match(source, /function handleViewportInputByTabId\(/);
  assert.match(source, /function runTabCommandById\(/);
  assert.match(source, /const pendingTabIdsRef = useRef<Set<string>>\(new Set\(\)\);/);
  assert.match(source, /subscribeSessionEvents/);
  assert.match(source, /detachSessionAttachment/);
  assert.match(source, /acknowledgeSessionAttachment/);
  assert.match(source, /sessionCenterEnabled\?: boolean;/);
  assert.match(source, /sessionCenterOpen\?: boolean;/);
  assert.match(source, /onToggleSessionCenter\?: \(\) => void;/);
  assert.match(source, /desktopSessionReattachIntent\?: DesktopSessionReattachIntent \| null;/);
  assert.match(source, /desktopConnectorSessionIntent\?: DesktopConnectorSessionIntent \| null;/);
  assert.match(source, /desktopConnectorEntries\?: DesktopConnectorLaunchEntry\[];/);
  assert.match(source, /onLaunchDesktopConnectorEntry\?: \(entryId: string\) => void;/);
  assert.match(source, /onBeforeProfileMenuOpen\?: \(\) => void;/);
  assert.match(source, /Session Center/);
  assert.match(source, /Connectors/);
  assert.match(source, /Reconnect detached shell sessions/);
  assert.match(source, /props\.onToggleSessionCenter\?\.\(\)/);
  assert.match(source, /props\.desktopConnectorEntries\?\.length/);
  assert.match(source, /props\.onLaunchDesktopConnectorEntry\?\.\(entry\.targetId\)/);
  assert.match(source, /props\.onBeforeProfileMenuOpen\?\.\(\)/);
  assert.match(source, /attachmentId:\s*session\.attachmentId/);
  assert.match(source, /attachmentId:\s*binding\.attachmentId/);
  assert.match(source, /void desktopRuntimeClientRef\.current\?\.detachSessionAttachment\?\.\(/);
  assert.match(source, /bindTerminalShellSessionRuntime\(next,\s*next\.activeTabId,\s*\{/);
  assert.match(source, /createConnectorInteractiveSession/);
  assert.match(source, /writeSessionInput/);
  assert.match(source, /writeSessionInputBytes/);
  assert.match(source, /resizeSession/);
  assert.match(source, /terminateSession/);
  assert.match(source, /props\.desktopConnectorSessionIntent/);
  assert.match(source, /runtimeBootstrap:\s*\{\s*kind:\s*"connector"/);
  assert.match(source, /tabRuntimeBootstrapRequest\.kind === "connector"/);
  assert.match(source, /const tabRuntimeBootstrapRequest = resolveTerminalShellRuntimeBootstrapRequestFromTab\(/);
  assert.match(source, /<MemoTerminalStage/);
  assert.match(source, /tabId=\{tab\.id\}/);
  assert.match(source, /sequence:\s*batch\.maxSequence/);
  assert.match(source, /const driver = driverRef\.current;/);
  assert.match(source, /driver\.focus\(\)/);
  assert.match(source, /driver\.search\(props\.tab\.searchQuery\)/);
  assert.match(source, /driver\.getSelection\(\)/);
  assert.match(source, /driver\.selectAll\(\)/);
  assert.match(source, /driver\.paste\(safeText\)/);
  assert.match(source, /const driverRef = useRef<ReturnType<typeof createXtermViewportDriver> \| null>\(null\);/);
  assert.match(source, /if \(!driverRef\.current\) \{\s*driverRef\.current = createXtermViewportDriver\(\);\s*\}/);
  assert.match(source, /const latestTitleHandlerRef = useRef\(props\.onViewportTitleChange\);/);
  assert.match(source, /latestTitleHandlerRef\.current = props\.onViewportTitleChange;/);
  assert.match(source, /await driver\.setTitleListener\(latestTitleHandlerRef\.current\)/);
  assert.match(source, /function isTerminalInsertCopyShortcut\(event: ReactKeyboardEvent<HTMLElement>\)/);
  assert.match(source, /function isTerminalInsertPasteShortcut\(event: ReactKeyboardEvent<HTMLElement>\)/);
  assert.match(source, /if \(isTerminalCopyShortcut\(event\) \|\| isTerminalInsertCopyShortcut\(event\)\)/);
  assert.match(source, /if \(isTerminalPasteShortcut\(event\) \|\| isTerminalInsertPasteShortcut\(event\)\)/);
  assert.match(source, /event\.key === "Insert"/);
  assert.match(source, /const targetTabId = contextMenu\?\.tabId \?\? activeTab\.id;/);
  assert.match(source, /const copyHandler = viewportCopyHandlersRef\.current\.get\(targetTabId\);/);
  assert.match(source, /if \(copyHandler\) \{\s*void copyHandler\(\);\s*return;\s*\}/);
  assert.match(source, /chromeButtonStyle\(props\.profileMenuOpen\)/);
  assert.match(source, /viewport:\s*activeTab\.snapshot\.viewport/);
  assert.match(source, /remote runtime tabs are only supported in web mode/);
  assert.doesNotMatch(source, /props\.onViewportInput\(safeText\)/);
  assert.doesNotMatch(source, /function isWebRuntimeCapableTab/);
  assert.doesNotMatch(source, /writeLocalShellInput\(/);
  assert.doesNotMatch(source, /writeLocalShellInputBytes\(/);
  assert.doesNotMatch(source, /resizeLocalShellSession\(/);
  assert.doesNotMatch(source, /terminateLocalShellSession\(/);
  assert.doesNotMatch(source, /subscribeLocalShellSessionEvents/);
  assert.doesNotMatch(source, /const input = `\$\{boundTab\.commandText\}\\r`;/);
  assert.doesNotMatch(source, /resolveTerminalShellTabRuntimeBootstrapRequest\(\s*shellState,/);
  assert.doesNotMatch(
    source,
    /\}, \[props\.desktopRuntimeClient, props\.mode, props\.webRuntimeClient, shellState, snapshot\.tabs\]\);/,
  );
  assert.doesNotMatch(source, /const \[pendingTabIds, setPendingTabIds\] = useState<string\[]>\(\[\]\);/);
  assert.doesNotMatch(
    source,
    /\}, \[props\.desktopRuntimeClient, props\.mode, props\.webRuntimeClient, snapshot\.tabs\]\);/,
  );
  assert.doesNotMatch(
    source,
    /void writeRuntimeInput\(runtimeClient,\s*tab\.runtimeSessionId,\s*pendingInput\)/,
  );
  assert.doesNotMatch(source, /applyDesktopRuntimeReplay\(event\.sessionId,\s*binding\.tabId,\s*event\.nextCursor,\s*\[\s*event\.entry\s*\]\s*\)/);
  assert.doesNotMatch(source, /handleViewportInput\(activeTab,\s*safeText\)/);
  assert.doesNotMatch(source, /const selectionText = activeTab\.copiedText;/);
  assert.doesNotMatch(source, /if \(isRuntimeStream && isTerminalSelectAllShortcut\(event\)\) \{\s*event\.preventDefault\(\);\s*void driver\.focus\(\);\s*return;\s*\}/);
  assert.doesNotMatch(source, /const driverRef = useRef\(createXtermViewportDriver\(\)\);/);
  assert.doesNotMatch(source, /placeholder="Type a command"/);
  assert.doesNotMatch(source, /const TERMINAL_STAGE_INSET = 12/);
  assert.doesNotMatch(source, /const restoreActiveTab = async \(\) =>/);
  assert.doesNotMatch(source, /padding:\s*"0 16px 14px"/);
  assert.doesNotMatch(source, /Math\.max\(container\.scrollWidth,\s*container\.clientWidth\)/);
  assert.doesNotMatch(source, /Search transcript/);
  assert.doesNotMatch(source, /Visible transcript/);
  assert.doesNotMatch(source, /Terminal command input/);
  for (const label of dashboardLabels) {
    assert.doesNotMatch(source, new RegExp(`[\"'\`]${label}[\"'\`]`));
    assert.doesNotMatch(source, new RegExp(`>\\s*${label}\\s*<`));
  }
  assert.doesNotMatch(source, /drawerStyle/);
  assert.doesNotMatch(source, /DesktopHostStrip/);
  assert.doesNotMatch(source, /terminalMetaBarStyle/);
  assert.doesNotMatch(source, /脳/);
  assert.doesNotMatch(source, /鈻/);
});

test("shell app keeps header tabs charcoal and terminal surface near-black", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "index.tsx"),
    "utf8",
  );
  const infrastructureSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-infrastructure", "src", "index.ts"),
    "utf8",
  );

  assert.match(source, /const TERMINAL_CHROME_BACKGROUND = "#16181b";/);
  assert.match(source, /const TERMINAL_ACTIVE_TAB_BACKGROUND = "#1f2329";/);
  assert.match(source, /const TERMINAL_SURFACE_BACKGROUND = "#050607";/);
  assert.match(infrastructureSource, /background:\s*"#050607"/);
});

test("desktop shell host removes browser white edges", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const html = fs.readFileSync(
    path.join(rootDir, "apps", "desktop", "index.html"),
    "utf8",
  );

  assert.match(html, /html,\s*body,\s*#root\s*\{/);
  assert.match(html, /margin:\s*0/);
  assert.match(html, /background:\s*#0e0e11/);
  assert.match(html, /overflow:\s*hidden/);
});

test("desktop tauri window uses app-owned header chrome", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "src-tauri", "tauri.conf.json"),
    "utf8",
  );

  assert.match(source, /"decorations"\s*:\s*false/);
});

test("desktop tauri capability enables app-owned window controls", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const capability = JSON.parse(
    fs.readFileSync(
      path.join(rootDir, "src-tauri", "capabilities", "default.json"),
      "utf8",
    ),
  );
  const permissions = capability.permissions ?? [];

  assert.ok(permissions.includes("core:default"));
  assert.ok(permissions.includes("core:window:allow-minimize"));
  assert.ok(permissions.includes("core:window:allow-maximize"));
  assert.ok(permissions.includes("core:window:allow-unmaximize"));
  assert.ok(permissions.includes("core:window:allow-close"));
  assert.ok(permissions.includes("core:window:allow-toggle-maximize"));
});

test("desktop app mounts a shell-first surface with session center overlay", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "apps", "desktop", "src", "App.tsx"),
    "utf8",
  );

  assert.match(source, /<ShellApp/);
  assert.match(source, /<DesktopSessionCenterOverlay/);
  assert.match(source, /@tauri-apps\/api\/event/);
  assert.match(source, /createDesktopRuntimeBridgeClient\([\s\S]*invoke\(command, args\)[\s\S]*listen[\s\S]*\)/);
  assert.match(source, /loadDesktopSessionCenterSnapshot/);
  assert.match(source, /loadDesktopResourceCenterSnapshot/);
  assert.match(source, /createDesktopConnectorMenuEntries/);
  assert.match(source, /createDesktopConnectorSessionIntent/);
  assert.match(source, /createDesktopSessionReattachIntent/);
  assert.match(source, /client\.reattachSession\(\{\s*sessionId\s*\}\)/);
  assert.match(source, /const \[resourceCenterSnapshot, setResourceCenterSnapshot\]/);
  assert.match(source, /await loadDesktopResourceCenterSnapshot\(client\)/);
  assert.match(source, /createDesktopConnectorMenuEntries\(resourceCenterSnapshot\)/);
  assert.match(source, /findDesktopConnectorTargetById\(entryId,\s*resourceCenterSnapshot\)/);
  assert.match(source, /onBeforeProfileMenuOpen=\{\(\) => \{\s*void refreshResourceCenterSnapshot\(\);\s*\}\}/);
  assert.match(source, /desktopConnectorEntries=/);
  assert.match(source, /desktopConnectorSessionIntent=/);
  assert.match(source, /onLaunchDesktopConnectorEntry=\{\(entryId\) =>/);
  assert.match(source, /sessionCenterEnabled/);
  assert.match(source, /onToggleSessionCenter/);
  assert.match(source, /desktopSessionReattachIntent=/);
  assert.doesNotMatch(source, /@sdkwork\/terminal-resources/);
  assert.doesNotMatch(source, /desktopHost=/);
  assert.doesNotMatch(source, /resources=/);
  assert.doesNotMatch(source, /sessions=/);
});

test("desktop and web entrypoints avoid StrictMode around terminal runtime side effects", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const desktopMain = fs.readFileSync(
    path.join(rootDir, "apps", "desktop", "src", "main.tsx"),
    "utf8",
  );
  const webMain = fs.readFileSync(
    path.join(rootDir, "apps", "web", "src", "main.tsx"),
    "utf8",
  );

  assert.match(desktopMain, /ReactDOM\.createRoot\(document\.getElementById\("root"\)!\)\.render\(\s*<App \/>,\s*\);/);
  assert.match(webMain, /ReactDOM\.createRoot\(document\.getElementById\("root"\)!\)\.render\(\s*<App \/>,\s*\);/);
  assert.doesNotMatch(desktopMain, /StrictMode/);
  assert.doesNotMatch(webMain, /StrictMode/);
});

test("web app mounts ShellApp through a dedicated web runtime bridge", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "apps", "web", "src", "App.tsx"),
    "utf8",
  );

  assert.match(source, /createWebRuntimeBridgeClient/);
  assert.match(source, /@sdkwork\/terminal-infrastructure/);
  assert.match(source, /VITE_TERMINAL_RUNTIME_BASE_URL/);
  assert.match(source, /VITE_TERMINAL_RUNTIME_WORKSPACE_ID/);
  assert.match(source, /VITE_TERMINAL_RUNTIME_AUTHORITY/);
  assert.match(source, /webRuntimeClient=/);
  assert.match(source, /webRuntimeTarget=/);
  assert.doesNotMatch(source, /return <ShellApp mode="web" \/>;/);
});
