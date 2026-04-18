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
  const shellStyles = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-app.css"),
    "utf8",
  );
  const dashboardLabels = ["Resources", "Sessions", "Settings", "Diagnostics"];

  assert.doesNotMatch(source, /@xterm\/xterm\/css\/xterm\.css/);
  assert.doesNotMatch(source, /import "\.\/shell-app\.css";/);
  assert.doesNotMatch(source, /useInsertionEffect,/);
  assert.doesNotMatch(source, /useTerminalDocumentStyles\(\);/);
  assert.doesNotMatch(source, /<style>\{xtermCss\}<\/style>/);
  assert.doesNotMatch(source, /<style>\{terminalViewportChromeCss\}<\/style>/);
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
  assert.match(source, /export interface ShellAppProps \{/);
  assert.match(source, /export type ShellAppDesktopRuntimeClient = Pick</);
  assert.match(source, /export type ShellAppWebRuntimeClient = Pick</);
  assert.match(source, /webRuntimeClient\?: ShellAppWebRuntimeClient;/);
  assert.match(source, /"createRemoteRuntimeSession"/);
  assert.match(source, /webRuntimeTarget\?:/);
  assert.match(source, /"executeLocalShellCommand"/);
  assert.doesNotMatch(source, /props\.tab\.runtimeBootstrap\.kind === "remote-runtime"/);
  assert.doesNotMatch(
    source,
    /const showLivePrompt = props\.mode === "web" && !usesRuntimeTerminalStream/,
  );
  assert.match(source, /shouldUseTerminalShellFallbackMode/);
  assert.match(source, /shouldUseTerminalShellRuntimeStream/);
  assert.match(source, /resolveTerminalShellRuntimeClientKind/);
  assert.match(source, /resolveTerminalStageBehavior/);
  assert.match(source, /import \{ RuntimeTerminalStage \} from "\.\/runtime-terminal-stage\.tsx";/);
  assert.match(source, /import \{ FallbackTerminalStage \} from "\.\/fallback-terminal-stage\.tsx";/);
  assert.match(source, /import \{ createRuntimeTabControllerStore \} from "\.\/runtime-tab-controller-store\.ts";/);
  assert.match(source, /import type \{ RuntimeTabController \} from "\.\/runtime-tab-controller\.ts";/);
  assert.match(source, /isTerminalNewTabShortcut/);
  assert.match(source, /isTerminalCloseTabShortcut/);
  assert.match(source, /resolveTerminalTabSwitchShortcutDirection/);
  assert.match(source, /shouldIgnoreTerminalAppShortcutTarget/);
  assert.match(source, /readTerminalClipboardText/);
  assert.match(source, /writeTerminalClipboardText/);
  assert.match(source, /clipboardProvider\?: TerminalClipboardProvider;/);
  assert.doesNotMatch(source, /navigator\.clipboard/);
  assert.match(
    source,
    /const\s*\{\s*usesRuntimeTerminalStream,\s*showLivePrompt,\s*showBootstrapOverlay,\s*\}\s*=\s*resolveTerminalStageBehavior\(\{\s*mode: props\.mode,\s*runtimeBootstrap: props\.tab\.runtimeBootstrap,\s*runtimeSessionId: props\.tab\.runtimeSessionId,\s*runtimeState: props\.tab\.runtimeState,\s*runtimeStreamStarted: props\.tab\.runtimeStreamStarted,\s*\}\);/,
  );
  assert.match(source, /const runtimeControllerStoreRef = useRef\(createRuntimeTabControllerStore\(\)\);/);
  assert.match(
    source,
    /const launchProfiles =\s*props\.mode === "desktop"\s*\?\s*\[\.\.\.DESKTOP_LAUNCH_PROFILES,\s*\.\.\.desktopWslLaunchProfiles\]\s*:\s*WEB_LAUNCH_PROFILES;/,
  );
  assert.match(source, /const wslLaunchProfiles = launchProfiles\.filter\(\(entry\) => entry\.group === "wsl"\);/);
  assert.match(source, /void runtimeControllerStoreRef\.current\.syncTabs\(snapshot\.tabs\.map\(\(tab\) => tab\.id\)\);/);
  assert.match(source, /void runtimeControllerStoreRef\.current\.disposeAll\(\);/);
  assert.match(source, /const MemoTerminalStage = memo\(function TerminalStage/);
  assert.match(source, /runtimeController: RuntimeTabController;/);
  assert.match(source, /return showLivePrompt \? \(/);
  assert.match(source, /<FallbackTerminalStage/);
  assert.match(source, /<RuntimeTerminalStage/);
  assert.match(source, /runtimeController=\{runtimeControllerStoreRef\.current\.getOrCreate\(tab\.id\)\}/);
  assert.match(source, /clipboardProvider=\{props\.clipboardProvider\}/);
  assert.doesNotMatch(source, /function TerminalStage\(props:/);
  assert.doesNotMatch(source, /createRuntimeTabController\(/);
  assert.doesNotMatch(source, /createXtermViewportDriver/);
  assert.doesNotMatch(source, /hiddenInputRef/);
  assert.doesNotMatch(source, /driverRef/);
  assert.doesNotMatch(source, /runtimeControllerRef/);
  assert.doesNotMatch(source, /measureViewportRef/);
  assert.match(source, /padding:\s*"6px 0 0 8px"/);
  assert.doesNotMatch(source, /100dvh/);
  assert.match(source, /const rootStyle: CSSProperties = \{[\s\S]*height: "100%"/);
  assert.match(source, /const shellStyle: CSSProperties = \{[\s\S]*height: "100%"/);
  assert.match(shellStyles, /\[data-shell-layout="terminal-tabs"\] \.xterm,\s*\r?\n\[data-shell-layout="terminal-tabs"\] \.xterm-viewport \{\s*height: 100%;\s*\}/);
  assert.match(shellStyles, /\[data-shell-layout="terminal-tabs"\] \.xterm \{[\s\S]*width:\s*100%;[\s\S]*background:\s*#050607;/);
  assert.match(shellStyles, /\.xterm-viewport::\-webkit-scrollbar/);
  assert.match(shellStyles, /\.xterm-viewport::\-webkit-scrollbar-thumb/);
  assert.match(
    shellStyles,
    /\.xterm \.xterm-helpers \{\s*position:\s*absolute;\s*top:\s*0;\s*z-index:\s*5;\s*\}/,
  );
  assert.match(
    shellStyles,
    /\.xterm \.xterm-helper-textarea \{\s*padding:\s*0;\s*border:\s*0;\s*margin:\s*0;[\s\S]*position:\s*absolute;[\s\S]*opacity:\s*0;[\s\S]*left:\s*-9999em;[\s\S]*top:\s*0;[\s\S]*width:\s*0;[\s\S]*height:\s*0;[\s\S]*z-index:\s*-5;[\s\S]*white-space:\s*nowrap;[\s\S]*overflow:\s*hidden;[\s\S]*resize:\s*none;[\s\S]*caret-color:\s*transparent(?: !important)?;\s*\}/,
  );
  assert.match(
    shellStyles,
    /\.xterm \.xterm-screen \{\s*position:\s*relative;\s*\}/,
  );
  assert.match(
    shellStyles,
    /\.xterm \.xterm-screen canvas \{\s*position:\s*absolute;\s*left:\s*0;\s*top:\s*0;\s*\}/,
  );
  assert.match(
    shellStyles,
    /\.xterm-viewport \{[\s\S]*position:\s*absolute;[\s\S]*right:\s*0;[\s\S]*left:\s*0;[\s\S]*top:\s*0;[\s\S]*bottom:\s*0;[\s\S]*overflow-y:\s*scroll;[\s\S]*cursor:\s*default;[\s\S]*scrollbar-gutter:\s*stable;[\s\S]*scrollbar-width:\s*thin;/,
  );
  assert.match(shellStyles, /scrollbar-width:\s*thin/);
  assert.match(shellStyles, /scrollbar-gutter:\s*stable/);
  assert.match(shellStyles, /width:\s*8px;/);
  assert.match(shellStyles, /height:\s*8px;/);
  assert.match(shellStyles, /scrollbar-color:\s*rgba\(82,\s*82,\s*91,\s*0\.72\)\s+transparent;/);
  assert.match(shellStyles, /background:\s*rgba\(82,\s*82,\s*91,\s*0\.72\);/);
  assert.match(shellStyles, /background:\s*rgba\(113,\s*113,\s*122,\s*0\.9\);/);
  assert.match(shellStyles, /button:hover \{\s*background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\);\s*color:\s*#fafafa;\s*\}/);
  assert.match(shellStyles, /button\[data-intent="danger"\]:hover \{\s*background:\s*#c42b1c;\s*color:\s*#ffffff;\s*\}/);
  assert.match(
    source,
    /boxShadow:\s*active \? "0 0 0 1px rgba\(255, 255, 255, 0\.02\) inset" : "none"/,
  );
  assert.match(
    source,
    /transition:\s*"background 120ms ease, color 120ms ease, box-shadow 120ms ease"/,
  );
  assert.match(source, /Scroll terminal tabs left/);
  assert.match(source, /Scroll terminal tabs right/);
  assert.match(source, /Shells/);
  assert.match(source, /group:\s*"wsl"/);
  assert.match(source, /WSL_DISCOVERY_COMMAND = "wsl\.exe --list --quiet"/);
  assert.match(source, /HIDDEN_WSL_DISTRIBUTIONS = new Set\(\["docker-desktop", "docker-desktop-data"\]\)/);
  assert.match(source, /interface ProfileMenuStatusDescriptor \{/);
  assert.match(source, /const wslDiscoveryLastSuccessAtRef = useRef\(0\);/);
  assert.match(source, /const \[desktopWslDiscoveryStatus,\s*setDesktopWslDiscoveryStatus\] = useState<\s*ProfileMenuStatusDescriptor \| null\s*>\(null\);/);
  assert.match(source, /Windows Subsystem for Linux/);
  assert.match(source, /replace\(\/\\u0000\/g,\s*""\)/);
  assert.match(source, /command:\s*\["wsl\.exe", "-d", distributionName\]/);
  assert.match(source, /title="WSL"/);
  assert.match(source, /void refreshDesktopWslLaunchProfiles\(\);/);
  assert.match(source, /const hasCachedWslProfiles = desktopWslLaunchProfiles\.length > 0;/);
  assert.match(source, /let discoverySucceeded = false;/);
  assert.match(source, /title:\s*hasCachedWslProfiles \? "WSL discovery stale" : "WSL unavailable"/);
  assert.match(source, /discoverySucceeded = true;/);
  assert.match(source, /setDesktopWslDiscoveryStatus\(null\);/);
  assert.match(source, /if \(discoverySucceeded\) \{\s*wslDiscoveryLastSuccessAtRef\.current = Date\.now\(\);\s*\}/);
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
  assert.match(source, /appendTerminalShellPendingRuntimeInput/);
  assert.match(source, /applyTerminalShellPromptInput/);
  assert.match(source, /consumeTerminalShellPendingRuntimeInput/);
  assert.match(source, /runtimePendingInput/);
  assert.match(source, /runtimeAttachmentId/);
  assert.match(source, /runtimeBootstrapAttempts/);
  assert.match(source, /consumeTerminalShellPendingRuntimeInput\(/);
  assert.match(source, /shouldAutoRetryTerminalShellBootstrap/);
  assert.match(source, /queueTerminalShellTabRuntimeBootstrapRetry/);
  assert.match(source, /queueTerminalShellTabBootstrapCommand/);
  assert.match(source, /resolveTerminalShellRuntimeBootstrapRequestFromTab/);
  assert.match(source, /const runtimeDerivedState = createRuntimeDerivedState\(snapshot\.tabs\);/);
  assert.match(source, /const retryingTabsEffectKey = runtimeDerivedState\.retryingTabsEffectKey;/);
  assert.match(source, /const runtimeBootstrapEffectKey = runtimeDerivedState\.runtimeBootstrapEffectKey;/);
  assert.match(source, /const runtimePendingInputEffectKey = runtimeDerivedState\.runtimePendingInputEffectKey;/);
  assert.match(source, /const snapshotTabById = runtimeDerivedState\.snapshotTabById;/);
  assert.match(source, /for \(const tab of runtimeDerivedState\.runtimeBootstrapCandidateTabs\) \{/);
  assert.match(source, /function handleRuntimeReplayByTabId\(/);
  assert.match(source, /applyTerminalShellReplayEntries\(current,\s*tabId,\s*replay\)/);
  assert.match(source, /onRuntimeReplayApplied=\{\(replay\) =>/);
  assert.match(source, /handleRuntimeReplayByTabId\(tab\.id,\s*replay\)/);
  assert.doesNotMatch(source, /runtimeTerminalContent/);
  assert.doesNotMatch(source, /runtimeContentTruncated/);
  assert.doesNotMatch(source, /driver\.writeRaw\(nextContent,\s*true\)/);
  assert.doesNotMatch(source, /MAX_PASTE_LENGTH/);
  assert.doesNotMatch(source, /renderedRuntimeContentRef/);
  assert.doesNotMatch(source, /const runtimeContentSyncActiveRef = useRef\(props\.active\);/);
  assert.doesNotMatch(source, /const queuedRuntimeAppendRef = useRef\(""\);/);
  assert.doesNotMatch(source, /const runtimeAppendFlushHandleRef = useRef<number \| null>\(null\);/);
  assert.doesNotMatch(source, /function clearQueuedRuntimeAppendFlush\(\)/);
  assert.doesNotMatch(source, /function flushQueuedRuntimeAppend\(\)/);
  assert.doesNotMatch(source, /function scheduleQueuedRuntimeAppendFlush\(\)/);
  assert.doesNotMatch(source, /runtimeSessionUnlistenRef/);
  assert.doesNotMatch(source, /runtimeSubscriptionFailureSessionIdsRef/);
  assert.doesNotMatch(source, /runtimeSessionReplayInFlightRef/);
  assert.doesNotMatch(source, /runtimeReplayBatchRef/);
  assert.doesNotMatch(source, /runtimeReplayFlushHandleRef/);
  assert.doesNotMatch(source, /runtimeReplayFlushHandleKindRef/);
  assert.doesNotMatch(source, /runtimeTerminalControllersRef/);
  assert.doesNotMatch(source, /registerRuntimeTerminalController/);
  assert.doesNotMatch(source, /queueDesktopRuntimeReplay/);
  assert.doesNotMatch(source, /flushQueuedDesktopRuntimeReplay/);
  assert.doesNotMatch(source, /catchUpRuntimeSession/);
  assert.match(source, /function updateShellState\(\s*update: \(current: TerminalShellState\) => TerminalShellState,\s*\)\s*\{\s*setShellState\(\(current\) => update\(current\)\);\s*\}/);
  assert.match(source, /function updateShellStateDeferred\(\s*update: \(current: TerminalShellState\) => TerminalShellState,\s*\)\s*\{\s*startTransition\(\(\) => \{\s*setShellState\(\(current\) => update\(current\)\);\s*\}\);\s*\}/);
  assert.match(source, /resumeTerminalShellTabRuntimeBootstrap/);
  assert.match(source, /preservePendingInput:\s*tab\.runtimeState === "failed"/);
  assert.match(source, /shouldFlushTerminalRuntimeInputQueue/);
  assert.doesNotMatch(source, /const runtimeBindingEffectKey = createRuntimeBindingEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const retryingTabsEffectKey = createRetryingTabsEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const runtimeBootstrapEffectKey = createRuntimeBootstrapEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const runtimePendingInputEffectKey = createRuntimePendingInputEffectKey\(snapshot\.tabs\);/);
  assert.match(source, /viewportCopyHandlersRef/);
  assert.match(source, /viewportPasteHandlersRef/);
  assert.match(source, /onRegisterViewportCopyHandler/);
  assert.match(source, /onViewportTitleChange/);
  assert.match(source, /onViewportResize/);
  assert.match(source, /resizeTerminalShellTab/);
  assert.match(source, /measureTerminalTabStripContentWidth/);
  assert.match(source, /function resolveTabSnapshotById\(tabId: string\)\s*\{\s*return snapshotTabById\.get\(tabId\) \?\? null;\s*\}/);
  assert.match(source, /function createRuntimeDerivedState\(/);
  assert.match(source, /if \(event\.defaultPrevented \|\| shouldIgnoreTerminalAppShortcutTarget\(event\.target\)\) \{\s*return;\s*\}/);
  assert.match(source, /const runtimeDerivedStateCache = new WeakMap</);
  assert.match(source, /const cachedDerivedState = runtimeDerivedStateCache\.get\(tabs\);/);
  assert.match(source, /if \(cachedDerivedState\) \{\s*return cachedDerivedState;\s*\}/);
  assert.match(source, /const snapshotTabById = new Map<string,\s*TerminalShellSnapshot\["tabs"\]\[number\]>\(\);/);
  assert.match(source, /const runtimeBootstrapCandidateTabs: TerminalShellSnapshot\["tabs"\] = \[\];/);
  assert.match(source, /const runtimePendingInputTabs: TerminalShellSnapshot\["tabs"\] = \[\];/);
  assert.match(source, /snapshotTabById\.set\(tab\.id,\s*tab\);/);
  assert.match(source, /runtimeDerivedStateCache\.set\(tabs,\s*nextDerivedState\);/);
  assert.match(source, /function handleViewportInputByTabId\(/);
  assert.match(source, /updateShellState\(\(current\) =>\s*applyTerminalShellPromptInput\(current,\s*tab\.id,\s*inputEvent\.data\),\s*\);/);
  assert.doesNotMatch(source, /function runTabCommandById\(/);
  assert.doesNotMatch(source, /const pendingTabIdsRef = useRef<Set<string>>\(new Set\(\)\);/);
  assert.doesNotMatch(source, /pendingTabIdsRef\.current\.delete\(tab\.id\);/);
  assert.doesNotMatch(source, /runTerminalShellCommand,/);
  assert.doesNotMatch(source, /submitTerminalShellCommand,/);
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
  assert.match(source, /export interface ShellWorkingDirectoryPickerOptions \{/);
  assert.match(source, /onPickWorkingDirectory\?: \(\s*options: ShellWorkingDirectoryPickerOptions,\s*\) => Promise<string \| null>;/);
  assert.match(source, /onBeforeProfileMenuOpen\?: \(\) => void;/);
  assert.match(source, /requiresWorkingDirectoryPicker:\s*true/);
  assert.match(source, /Choose folder and open Codex in a local terminal tab/);
  assert.match(source, /props\.onPickWorkingDirectory/);
  assert.match(source, /title:\s*`Choose working directory for \$\{entry\.label\}`/);
  assert.match(source, /const \[profileMenuStatus,\s*setProfileMenuStatus\] = useState<ProfileMenuStatusDescriptor \| null>\(\s*null,\s*\);/);
  assert.match(source, /title:\s*`\$\{entry\.label\} launch failed`/);
  assert.match(source, /subtitle:\s*`Working directory selection failed\. \$\{message\}`/);
  assert.match(source, /setProfileMenuOpen\(true\);/);
  assert.match(source, /slot="terminal-profile-menu-status"/);
  assert.match(source, /slot="terminal-wsl-discovery-status"/);
  assert.match(source, /data-slot=\{props\.slot\}/);
  assert.match(source, /Session Center/);
  assert.match(source, /Connectors/);
  assert.match(source, /Reconnect detached shell sessions/);
  assert.match(source, /props\.onToggleSessionCenter\?\.\(\)/);
  assert.match(source, /props\.desktopConnectorEntries\?\.length/);
  assert.match(source, /props\.onLaunchDesktopConnectorEntry\?\.\(entry\.targetId\)/);
  assert.match(source, /props\.onBeforeProfileMenuOpen\?\.\(\)/);
  assert.match(source, /attachmentId:\s*session\.attachmentId/);
  assert.match(source, /attachmentId:\s*tab\.runtimeAttachmentId/);
  assert.match(source, /void desktopRuntimeClientRef\.current\?\.detachSessionAttachment\?\.\(/);
  assert.match(source, /bindTerminalShellSessionRuntime\(next,\s*next\.activeTabId,\s*\{/);
  assert.match(source, /createConnectorInteractiveSession/);
  assert.match(source, /createLocalProcessSession/);
  assert.match(source, /writeSessionInput/);
  assert.match(source, /writeSessionInputBytes/);
  assert.match(source, /resizeSession/);
  assert.match(source, /terminateSession/);
  assert.match(source, /props\.desktopConnectorSessionIntent/);
  assert.match(source, /runtimeBootstrap:\s*\{\s*kind:\s*"connector"/);
  assert.match(source, /runtimeBootstrap:\s*\{\s*kind:\s*"local-process"/);
  assert.match(source, /tabRuntimeBootstrapRequest\.kind === "connector"/);
  assert.match(source, /tabRuntimeBootstrapRequest\.kind === "local-process"/);
  assert.match(source, /const tabRuntimeBootstrapRequest = resolveTerminalShellRuntimeBootstrapRequestFromTab\(/);
  assert.match(source, /<MemoTerminalStage/);
  assert.match(source, /tabId=\{tab\.id\}/);
  assert.match(source, /const targetTabId = contextMenu\?\.tabId \?\? activeTab\.id;/);
  assert.match(source, /const copyHandler = viewportCopyHandlersRef\.current\.get\(targetTabId\);/);
  assert.match(source, /if \(copyHandler\) \{\s*void copyHandler\(\);\s*return;\s*\}/);
  assert.match(source, /void writeTerminalClipboardText\(selectionText,\s*props\.clipboardProvider\);/);
  assert.match(source, /void readTerminalClipboardText\(props\.clipboardProvider\)\.then\(\(text\) => \{/);
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
  assert.ok(permissions.includes("core:webview:allow-set-webview-focus"));
  assert.ok(permissions.includes("core:webview:allow-set-webview-zoom"));
});

test("desktop app mounts a shell-first surface with session center overlay", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "apps", "desktop", "src", "App.tsx"),
    "utf8",
  );

  assert.match(source, /from "@sdkwork\/terminal-shell\/integration"/);
  assert.match(source, /<DesktopShellApp/);
  assert.match(source, /<DesktopSessionCenterOverlay/);
  assert.match(source, /@tauri-apps\/api\/app/);
  assert.match(source, /@tauri-apps\/api\/event/);
  assert.match(source, /@tauri-apps\/api\/webview/);
  assert.match(source, /createDesktopRuntimeBridgeClient\([\s\S]*invoke\(command, args\)[\s\S]*listen[\s\S]*\)/);
  assert.match(source, /const DESKTOP_VIEWPORT_METRICS_EVENT = "sdkwork-terminal:viewport-metrics-changed";/);
  assert.match(source, /const PACKAGED_DESKTOP_BUNDLE_TYPES = new Set\(\[/);
  assert.match(source, /PACKAGED_DESKTOP_BUNDLE_TYPES\.has\(await getBundleType\(\)\)/);
  assert.match(source, /await resolveCurrentWebview\(\)\.setZoom\(1\);/);
  assert.match(source, /scheduleViewportMetricsDispatch\(\);/);
  assert.match(source, /currentWindow\.onScaleChanged\(\(\) => \{/);
  assert.match(source, /currentWindow\.onFocusChanged\(\(\{ payload: focused \}\) => \{/);
  assert.doesNotMatch(source, /await currentWebview\.setFocus\(\);/);
  assert.match(source, /const desktopClipboardProvider = useRef\(\{\s*readText: \(\) => client\.readClipboardText\(\),\s*writeText: \(text: string\) => client\.writeClipboardText\(text\),\s*\}\)\.current;/);
  assert.match(source, /clipboardProvider=\{desktopClipboardProvider\}/);
  assert.match(
    source,
    /desktopRuntimeClient=\{client\}/,
  );
  assert.match(source, /loadDesktopSessionCenterSnapshot/);
  assert.match(source, /loadDesktopResourceCenterSnapshot/);
  assert.match(source, /resolveQueuedSessionCenterRefreshAction/);
  assert.match(source, /createDesktopConnectorMenuEntries/);
  assert.match(source, /createDesktopConnectorSessionIntent/);
  assert.match(source, /createDesktopSessionReattachIntent/);
  assert.match(source, /client\.reattachSession\(\{\s*sessionId\s*\}\)/);
  assert.match(source, /const \[resourceCenterSnapshot, setResourceCenterSnapshot\]/);
  assert.match(source, /const resourceCatalogStateRef = useRef<DesktopResourceCatalogState>\(initialResourceCatalogState\);/);
  assert.match(source, /const resourceCatalogRefreshRequestIdRef = useRef\(0\);/);
  assert.match(source, /const resourceCatalogRefreshInFlightRef = useRef\(false\);/);
  assert.match(source, /const resourceCatalogRefreshPendingRef = useRef\(false\);/);
  assert.match(source, /const sessionCenterRefreshRequestIdRef = useRef\(0\);/);
  assert.match(source, /const sessionCenterRefreshInFlightRef = useRef\(false\);/);
  assert.match(
    source,
    /const sessionCenterRefreshActiveActionRef = useRef<SessionReplayPreloadAction \| null>\(null\);/,
  );
  assert.match(
    source,
    /const sessionCenterRefreshPendingActionRef = useRef<SessionReplayPreloadAction \| null>\(null\);/,
  );
  assert.match(source, /const sessionCenterOpenRef = useRef\(sessionCenterOpen\);/);
  assert.match(source, /const sessionCenterSnapshotRef = useRef<DesktopSessionCenterSnapshot \| null>\(null\);/);
  assert.match(
    source,
    /function closeSessionCenter\(\) \{\s*sessionCenterOpenRef\.current = false;\s*sessionCenterRefreshPendingActionRef\.current = null;\s*setSessionCenterOpen\(false\);\s*\}/,
  );
  assert.match(source, /sessionCenterOpenRef\.current = sessionCenterOpen;/);
  assert.match(
    source,
    /if \(!sessionCenterOpen\) \{\s*sessionCenterRefreshPendingActionRef\.current = null;\s*return;\s*\}/,
  );
  assert.match(source, /const sessionReplayPreloadLimitRef = useRef\(DEFAULT_SESSION_REPLAY_PRELOAD_LIMIT\);/);
  assert.match(source, /const sessionCenterLoadingRef = useRef\(false\);/);
  assert.match(
    source,
    /if \(sessionCenterRefreshInFlightRef\.current\) \{\s*sessionCenterRefreshPendingActionRef\.current = resolveQueuedSessionCenterRefreshAction\(\{\s*current: sessionCenterRefreshPendingActionRef\.current,\s*next: action,\s*active: sessionCenterRefreshActiveActionRef\.current,\s*\}\);\s*return;\s*\}/,
  );
  assert.match(source, /sessionCenterRefreshInFlightRef\.current = true;/);
  assert.match(source, /sessionCenterRefreshActiveActionRef\.current = action;/);
  assert.match(
    source,
    /if \(action === "load-more" && sessionCenterLoadingRef\.current\) \{\s*return;\s*\}/,
  );
  assert.match(
    source,
    /if \(action === "load-more" && deferredReplayCount <= 0\) \{\s*return;\s*\}/,
  );
  assert.match(source, /loadDesktopSessionCenterSnapshot\(client,\s*\{\s*replayPreloadLimit: sessionReplayPreloadLimitRef\.current,\s*\}\)/);
  assert.match(source, /sessionCenterSnapshotRef\.current = nextSnapshot;/);
  assert.match(source, /deferredReplayCount > 0/);
  assert.match(source, /if \(refreshRequestId !== resourceCatalogRefreshRequestIdRef\.current\) \{\s*return;\s*\}/);
  assert.match(
    source,
    /if \(resourceCatalogRefreshInFlightRef\.current\) \{\s*resourceCatalogRefreshPendingRef\.current = true;\s*return;\s*\}/,
  );
  assert.match(source, /const resourceCatalogLastSuccessAtRef = useRef\(0\);/);
  assert.match(source, /resourceCatalogRefreshInFlightRef\.current = true;/);
  assert.match(
    source,
    /resourceCatalogLastSuccessAtRef\.current > 0/,
  );
  assert.match(source, /let resourceCatalogRefreshSucceeded = false;/);
  assert.match(source, /resourceCatalogRefreshSucceeded = true;/);
  assert.match(
    source,
    /if \(resourceCatalogRefreshSucceeded\) \{\s*resourceCatalogLastSuccessAtRef\.current = Date\.now\(\);\s*\}/,
  );
  assert.match(
    source,
    /resourceCatalogRefreshInFlightRef\.current = false;\s*if \(resourceCatalogRefreshPendingRef\.current\) \{\s*resourceCatalogRefreshPendingRef\.current = false;\s*void refreshResourceCenterSnapshot\(true\);\s*\}/,
  );
  assert.match(source, /if \(refreshRequestId !== sessionCenterRefreshRequestIdRef\.current\) \{\s*return;\s*\}/);
  assert.match(
    source,
    /if \(refreshRequestId === sessionCenterRefreshRequestIdRef\.current\) \{\s*setSessionCenterLoading\(false\);\s*sessionCenterLoadingRef\.current = false;\s*\}/,
  );
  assert.match(source, /sessionCenterRefreshInFlightRef\.current = false;/);
  assert.match(source, /sessionCenterRefreshActiveActionRef\.current = null;/);
  assert.match(source, /const pendingAction = sessionCenterRefreshPendingActionRef\.current;/);
  assert.match(
    source,
    /if \(!sessionCenterOpenRef\.current\) \{\s*sessionCenterRefreshPendingActionRef\.current = null;\s*\}/,
  );
  assert.match(
    source,
    /else if \(pendingAction\) \{\s*sessionCenterRefreshPendingActionRef\.current = null;\s*void refreshSessionCenterSnapshot\(pendingAction\);\s*\}/,
  );
  assert.match(source, /await loadDesktopResourceCenterSnapshot\(client\)/);
  assert.match(source, /closeSessionCenter\(\);\s*await refreshSessionCenterSnapshot\(\);/);
  assert.match(source, /createDesktopConnectorMenuEntries\(resourceCenterSnapshot\)/);
  assert.match(source, /findDesktopConnectorTargetById\(entryId,\s*resourceCenterSnapshot\)/);
  assert.match(source, /onBeforeProfileMenuOpen=\{\(\) => \{\s*void refreshResourceCenterSnapshot\(\);\s*\}\}/);
  assert.match(source, /desktopConnectorEntries=/);
  assert.match(source, /desktopConnectorSessionIntent=/);
  assert.match(source, /onLaunchDesktopConnectorEntry=\{\(entryId\) =>/);
  assert.match(source, /sessionCenterEnabled/);
  assert.match(
    source,
    /setSessionCenterOpen\(\(current\) => \{\s*const next = !current;\s*sessionCenterOpenRef\.current = next;\s*if \(!next\) \{\s*sessionCenterRefreshPendingActionRef\.current = null;\s*\}\s*return next;\s*\}\);/,
  );
  assert.match(source, /onToggleSessionCenter/);
  assert.match(source, /onClose=\{closeSessionCenter\}/);
  assert.match(source, /desktopSessionReattachIntent=/);
  assert.doesNotMatch(source, /setTerminalClipboardProvider/);
  assert.doesNotMatch(source, /clearTerminalClipboardProvider/);
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

test("web app mounts the public web shell wrapper through a dedicated runtime bridge", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "apps", "web", "src", "App.tsx"),
    "utf8",
  );

  assert.match(source, /createWebRuntimeBridgeClient/);
  assert.match(source, /@sdkwork\/terminal-infrastructure/);
  assert.match(source, /@sdkwork\/terminal-shell\/integration/);
  assert.match(source, /WebShellApp/);
  assert.match(source, /createBrowserClipboardProvider/);
  assert.match(source, /createWebRuntimeTargetFromEnvironment/);
  assert.match(source, /VITE_TERMINAL_RUNTIME_BASE_URL/);
  assert.match(source, /VITE_TERMINAL_RUNTIME_WORKSPACE_ID/);
  assert.match(source, /VITE_TERMINAL_RUNTIME_AUTHORITY/);
  assert.match(source, /const webClipboardProvider = useMemo\(\(\) => createBrowserClipboardProvider\(\), \[\]\);/);
  assert.match(source, /const webRuntimeTarget = useMemo\(\s*\(\) => createWebRuntimeTargetFromEnvironment\(import\.meta\.env\),/);
  assert.match(source, /clipboardProvider=\{webClipboardProvider\}/);
  assert.match(source, /webRuntimeClient=/);
  assert.match(source, /webRuntimeTarget=/);
  assert.doesNotMatch(source, /navigator\.clipboard/);
  assert.doesNotMatch(source, /return <ShellApp mode="web" \/>;/);
});
