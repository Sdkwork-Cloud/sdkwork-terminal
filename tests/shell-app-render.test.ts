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
  const launchProfilesSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "launch-profiles.ts"),
    "utf8",
  );
  const profileMenuSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "profile-menu.tsx"),
    "utf8",
  );
  const launchProjectDialogsSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "launch-project-dialogs.tsx"),
    "utf8",
  );
  const terminalHeaderSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "terminal-header.tsx"),
    "utf8",
  );
  const shellChromeStateSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-chrome-state.ts"),
    "utf8",
  );
  const shellContractSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-contract.ts"),
    "utf8",
  );
  const terminalOverlaysSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "terminal-overlays.tsx"),
    "utf8",
  );
  const terminalLaunchUiSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "terminal-launch-ui.tsx"),
    "utf8",
  );
  const launchControllerSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "launch-controller.ts"),
    "utf8",
  );
  const terminalTabActionsSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "terminal-tab-actions.ts"),
    "utf8",
  );
  const shellActionHandlersSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-action-handlers.ts"),
    "utf8",
  );
  const shellProfileMenuBridgeSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-profile-menu-bridge.ts"),
    "utf8",
  );
  const shellOverlayStateSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-overlay-state.ts"),
    "utf8",
  );
  const shellRuntimeResourcesSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-runtime-resources.ts"),
    "utf8",
  );
  const shellAppStateSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-app-state.ts"),
    "utf8",
  );
  const shellStateBridgeSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-state-bridge.ts"),
    "utf8",
  );
  const shellRuntimeBridgeSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-runtime-bridge.ts"),
    "utf8",
  );
  const desktopTerminalSurfaceSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "desktop-terminal-surface.ts"),
    "utf8",
  );
  const terminalPanelStackSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "terminal-panel-stack.tsx"),
    "utf8",
  );
  const terminalTabStripSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "terminal-tab-strip.tsx"),
    "utf8",
  );
  const terminalOverlayStackSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "terminal-overlay-stack.tsx"),
    "utf8",
  );
  const launchFlowSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "launch-flow.ts"),
    "utf8",
  );
  const runtimeDerivedStateSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "runtime-derived-state.ts"),
    "utf8",
  );
  const runtimeOrchestrationSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "runtime-orchestration.ts"),
    "utf8",
  );
  const profileMenuControllerSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "profile-menu-controller.ts"),
    "utf8",
  );
  const runtimeEffectsSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "runtime-effects.ts"),
    "utf8",
  );
  const shellGlobalShortcutsSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-global-shortcuts.ts"),
    "utf8",
  );
  const shellUiEffectsSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-ui-effects.ts"),
    "utf8",
  );
  const shellLayoutSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-layout.ts"),
    "utf8",
  );
  const modelSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "model.ts"),
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
  assert.match(terminalTabStripSource, /role="tablist"/);
  assert.match(terminalTabStripSource, /props\.tabs\.map\(\(tab\) =>/);
  assert.match(terminalPanelStackSource, /role="tabpanel"/);
  assert.match(terminalPanelStackSource, /id=\{`terminal-panel-\$\{tab\.id\}`\}/);
  assert.match(terminalPanelStackSource, /active=\{tab\.active\}/);
  assert.match(terminalTabStripSource, /data-slot="terminal-header-leading"/);
  assert.match(terminalTabStripSource, /data-slot="terminal-header-trailing"/);
  assert.match(terminalTabStripSource, /data-slot="terminal-header-chrome"/);
  assert.match(terminalTabStripSource, /data-slot="terminal-tab-close"/);
  assert.match(terminalTabStripSource, /data-tauri-drag-region/);
  assert.match(source, /shouldDockTabActionsToTrailing/);
  assert.match(source, /from "\.\/terminal-tab-strip\.tsx";/);
  assert.match(
    terminalTabStripSource,
    /headerDragSpacerStyle\(props\.shouldDockTabActionsToTrailing\)/,
  );
  assert.match(
    terminalTabStripSource,
    /style=\{tabShellStyle\(\s*active,\s*closeVisible,\s*props\.shouldDockTabActionsToTrailing,?\s*\)\}/,
  );
  assert.match(source, /from "\.\/shell-chrome-state\.ts";/);
  assert.doesNotMatch(source, /from "\.\/terminal-overlays\.tsx";/);
  assert.match(shellAppStateSource, /from "\.\/launch-flow\.ts";/);
  assert.match(shellAppStateSource, /from "\.\/runtime-derived-state\.ts";/);
  assert.match(source, /from "\.\/shell-layout\.ts";/);
  assert.match(source, /from "\.\/shell-action-handlers\.ts";/);
  assert.match(source, /from "\.\/shell-overlay-state\.ts";/);
  assert.match(source, /from "\.\/shell-profile-menu-bridge\.ts";/);
  assert.match(shellAppStateSource, /from "\.\/shell-state-bridge\.ts";/);
  assert.match(source, /from "\.\/shell-app-state\.ts";/);
  assert.match(source, /from "\.\/shell-runtime-bridge\.ts";/);
  assert.match(source, /from "\.\/desktop-terminal-surface\.ts";/);
  assert.match(source, /from "\.\/shell-contract\.ts";/);
  assert.match(source, /from "\.\/shell-global-shortcuts\.ts";/);
  assert.match(source, /from "\.\/terminal-overlay-stack\.tsx";/);
  assert.match(source, /from "\.\/terminal-panel-stack\.tsx";/);
  assert.match(source, /from "\.\/terminal-tab-strip\.tsx";/);
  assert.doesNotMatch(source, /function TabHeaderActions\(/);
  assert.doesNotMatch(source, /function DesktopWindowControls\(/);
  assert.doesNotMatch(source, /function tabShellStyle\(/);
  assert.doesNotMatch(source, /function resolveLaunchProfile\(/);
  assert.doesNotMatch(source, /function updateShellState\(/);
  assert.doesNotMatch(source, /function updateShellStateDeferred\(/);
  assert.match(source, /export type \{[\s\S]*ShellAppProps,[\s\S]*ShellAppDesktopRuntimeClient,[\s\S]*ShellAppWebRuntimeClient,[\s\S]*ShellLaunchProfile,[\s\S]*ShellConnectorSessionLaunchRequest,[\s\S]*ShellRemoteRuntimeSessionCreateRequest,[\s\S]*ShellRuntimeSessionReplaySnapshot,[\s\S]*ShellAppWorkingDirectoryPickerRequest,[\s\S]*\} from "\.\/shell-contract\.ts";/);
  assert.match(shellContractSource, /export interface ShellAppProps \{/);
  assert.match(shellContractSource, /export interface ShellAppDesktopRuntimeClient \{/);
  assert.match(shellContractSource, /export interface ShellAppWebRuntimeClient \{/);
  assert.match(shellContractSource, /export type ShellLaunchProfile = TerminalShellProfile;/);
  assert.match(shellContractSource, /export interface ShellConnectorSessionLaunchRequest \{/);
  assert.match(shellContractSource, /export interface ShellRemoteRuntimeSessionCreateRequest \{/);
  assert.match(shellContractSource, /webRuntimeClient\?: ShellAppWebRuntimeClient;/);
  assert.match(shellContractSource, /createRemoteRuntimeSession: \(/);
  assert.match(shellContractSource, /webRuntimeTarget\?:/);
  assert.match(shellContractSource, /executeLocalShellCommand\?: \(/);
  assert.doesNotMatch(source, /export interface ShellAppProps \{/);
  assert.doesNotMatch(source, /export interface ShellAppDesktopRuntimeClient \{/);
  assert.doesNotMatch(source, /export interface ShellAppWebRuntimeClient \{/);
  assert.doesNotMatch(source, /export interface ShellConnectorSessionLaunchRequest \{/);
  assert.doesNotMatch(source, /export interface ShellRemoteRuntimeSessionCreateRequest \{/);
  assert.doesNotMatch(source, /props\.tab\.runtimeBootstrap\.kind === "remote-runtime"/);
  assert.doesNotMatch(
    source,
    /const showLivePrompt = props\.mode === "web" && !usesRuntimeTerminalStream/,
  );
  assert.match(runtimeEffectsSource, /shouldUseTerminalShellFallbackMode/);
  assert.match(modelSource, /export function shouldUseTerminalShellRuntimeStream/);
  assert.match(modelSource, /viewportMeasured: boolean;/);
  assert.match(runtimeOrchestrationSource, /resolveTerminalShellRuntimeClientKind/);
  assert.match(source, /from "\.\/shell-runtime-resources\.ts";/);
  assert.doesNotMatch(source, /import \{ createRuntimeTabControllerStore \} from "\.\/runtime-tab-controller-store\.ts";/);
  assert.match(shellGlobalShortcutsSource, /isTerminalNewTabShortcut/);
  assert.match(shellGlobalShortcutsSource, /isTerminalCloseTabShortcut/);
  assert.match(shellGlobalShortcutsSource, /resolveTerminalTabSwitchShortcutDirection/);
  assert.match(shellGlobalShortcutsSource, /shouldIgnoreTerminalAppShortcutTarget/);
  assert.match(terminalTabActionsSource, /readTerminalClipboardText/);
  assert.match(terminalTabActionsSource, /writeTerminalClipboardText/);
  assert.match(shellContractSource, /clipboardProvider\?: TerminalClipboardProvider;/);
  assert.doesNotMatch(source, /navigator\.clipboard/);
  assert.match(source, /const runtimeResources = useShellRuntimeResources\(\{/);
  assert.match(source, /const overlayState = useShellOverlayState\(\{/);
  assert.match(source, /const shellAppState = useShellAppState\(\{/);
  assert.match(source, /const chromeState = useShellChromeState\(\{/);
  assert.match(shellRuntimeResourcesSource, /const runtimeControllerStoreRef = useRef\(createRuntimeTabControllerStore\(\)\);/);
  assert.match(shellRuntimeResourcesSource, /function registerViewportCopyHandler\(/);
  assert.match(shellRuntimeResourcesSource, /function registerViewportPasteHandler\(/);
  assert.match(shellAppStateSource, /export function useShellAppState\(/);
  assert.match(shellAppStateSource, /createTerminalShellState/);
  assert.match(shellAppStateSource, /getTerminalShellSnapshot/);
  assert.match(shellAppStateSource, /createRuntimeDerivedState/);
  assert.match(shellAppStateSource, /createShellStateBridge/);
  assert.match(shellAppStateSource, /const \[shellState,\s*setShellState\] = useState<TerminalShellState>\(\(\) =>/);
  assert.match(shellAppStateSource, /const snapshot = getTerminalShellSnapshot\(shellState\);/);
  assert.match(shellAppStateSource, /const latestSnapshotRef = useRef<TerminalShellSnapshot \| null>\(snapshot\);/);
  assert.match(shellAppStateSource, /const runtimeDerivedState = createRuntimeDerivedState\(snapshot\.tabs\);/);
  assert.match(shellAppStateSource, /const retryingTabsEffectKey = runtimeDerivedState\.retryingTabsEffectKey;/);
  assert.match(shellAppStateSource, /const runtimeBootstrapEffectKey = runtimeDerivedState\.runtimeBootstrapEffectKey;/);
  assert.match(shellAppStateSource, /const runtimePendingInputEffectKey = runtimeDerivedState\.runtimePendingInputEffectKey;/);
  assert.match(shellAppStateSource, /const snapshotTabById = runtimeDerivedState\.snapshotTabById;/);
  assert.match(shellAppStateSource, /const shellStateBridge = createShellStateBridge\(\{/);
  assert.match(shellAppStateSource, /const launchProjectResolutionRequestIdRef = useRef\(0\);/);
  assert.match(shellChromeStateSource, /export function useShellChromeState\(/);
  assert.match(shellChromeStateSource, /const \[hoveredTabId,\s*setHoveredTabId\] = useState<string \| null>\(null\);/);
  assert.match(shellChromeStateSource, /const \[canScrollLeft,\s*setCanScrollLeft\] = useState\(false\);/);
  assert.match(shellChromeStateSource, /const \[canScrollRight,\s*setCanScrollRight\] = useState\(false\);/);
  assert.match(shellChromeStateSource, /const \[headerLayoutMetrics,\s*setHeaderLayoutMetrics\] = useState<HeaderLayoutMetrics>\(\{/);
  assert.match(shellChromeStateSource, /const headerLeadingRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(shellChromeStateSource, /const headerChromeRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(shellChromeStateSource, /const profileMenuRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(shellChromeStateSource, /const contextMenuRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(shellChromeStateSource, /const tabScrollRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.match(shellChromeStateSource, /const shouldDockTabActionsToTrailing = shouldDockTerminalTabActions\(\{/);
  assert.match(shellChromeStateSource, /useShellUiEffects\(\{/);
  assert.match(shellChromeStateSource, /from "\.\/terminal-header\.tsx";/);
  assert.match(shellChromeStateSource, /from "\.\/shell-ui-effects\.ts";/);
  assert.doesNotMatch(source, /const \[hoveredTabId,\s*setHoveredTabId\] = useState<string \| null>\(null\);/);
  assert.doesNotMatch(source, /const \[canScrollLeft,\s*setCanScrollLeft\] = useState\(false\);/);
  assert.doesNotMatch(source, /const \[canScrollRight,\s*setCanScrollRight\] = useState\(false\);/);
  assert.doesNotMatch(source, /const \[headerLayoutMetrics,\s*setHeaderLayoutMetrics\] = useState<HeaderLayoutMetrics>\(\{/);
  assert.doesNotMatch(source, /const headerLeadingRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.doesNotMatch(source, /const headerChromeRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.doesNotMatch(source, /const profileMenuRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.doesNotMatch(source, /const contextMenuRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.doesNotMatch(source, /const tabScrollRef = useRef<HTMLDivElement \| null>\(null\);/);
  assert.doesNotMatch(source, /const shouldDockTabActionsToTrailing = shouldDockTerminalTabActions\(\{/);
  assert.match(
    shellOverlayStateSource,
    /const launchProfiles =\s*args\.mode === "desktop"\s*\?\s*\[\.\.\.DESKTOP_LAUNCH_PROFILES,\s*\.\.\.desktopWslLaunchProfiles\]\s*:\s*WEB_LAUNCH_PROFILES;/,
  );
  assert.match(shellOverlayStateSource, /from "\.\/launch-profiles\.ts";/);
  assert.doesNotMatch(source, /from "\.\/profile-menu\.tsx";/);
  assert.match(shellOverlayStateSource, /const wslLaunchProfiles = launchProfiles\.filter\(\(entry\) => entry\.group === "wsl"\);/);
  assert.match(
    shellRuntimeBridgeSource,
    /void args\.runtimeControllerStoreRef\.current\.syncTabs\(\s*args\.snapshot\.tabs\.map\(\(tab\) => tab\.id\),\s*\);/,
  );
  assert.match(runtimeEffectsSource, /void args\.runtimeControllerStore\.disposeAll\(\);/);
  assert.match(source, /<TerminalPanelStack/);
  assert.match(source, /<TerminalOverlayStack/);
  assert.match(terminalPanelStackSource, /const MemoTerminalStage = memo\(function TerminalStage/);
  assert.match(terminalPanelStackSource, /runtimeController: RuntimeTabController;/);
  assert.match(terminalPanelStackSource, /return props\.mode === "web" && showLivePrompt \? \(/);
  assert.match(terminalPanelStackSource, /<FallbackTerminalStage/);
  assert.match(terminalPanelStackSource, /<RuntimeTerminalStage/);
  assert.match(
    terminalPanelStackSource,
    /runtimeController=\{props\.runtimeControllerStore\.getOrCreate\(tab\.id\)\}/,
  );
  assert.match(terminalPanelStackSource, /clipboardProvider=\{props\.clipboardProvider\}/);
  assert.match(terminalPanelStackSource, /resolveTerminalStageBehavior/);
  assert.match(
    terminalPanelStackSource,
    /const\s*\{\s*showLivePrompt,\s*showBootstrapOverlay,\s*\}\s*=\s*resolveTerminalStageBehavior\(\{\s*mode: props\.mode,\s*runtimeBootstrap: props\.tab\.runtimeBootstrap,\s*runtimeSessionId: props\.tab\.runtimeSessionId,\s*runtimeState: props\.tab\.runtimeState,\s*runtimeStreamStarted: props\.tab\.runtimeStreamStarted,\s*\}\);/,
  );
  assert.match(terminalPanelStackSource, /import \{ RuntimeTerminalStage \} from "\.\/runtime-terminal-stage\.tsx";/);
  assert.match(terminalPanelStackSource, /import \{ FallbackTerminalStage \} from "\.\/fallback-terminal-stage\.tsx";/);
  assert.match(terminalPanelStackSource, /import type \{ RuntimeTabController \} from "\.\/runtime-tab-controller\.ts";/);
  assert.doesNotMatch(source, /const MemoTerminalStage = memo\(function TerminalStage/);
  assert.doesNotMatch(source, /function TerminalStage\(props:/);
  assert.doesNotMatch(source, /createRuntimeTabController\(/);
  assert.doesNotMatch(source, /createXtermViewportDriver/);
  assert.doesNotMatch(source, /hiddenInputRef/);
  assert.doesNotMatch(source, /driverRef/);
  assert.doesNotMatch(source, /runtimeControllerRef/);
  assert.doesNotMatch(source, /measureViewportRef/);
  assert.match(shellLayoutSource, /padding:\s*"6px 0 0 8px"/);
  assert.doesNotMatch(source, /100dvh/);
  assert.match(shellLayoutSource, /const rootStyle: CSSProperties = \{[\s\S]*height: "100%"/);
  assert.match(shellLayoutSource, /const shellStyle: CSSProperties = \{[\s\S]*height: "100%"/);
  assert.match(terminalHeaderSource, /data-slot="terminal-window-controls"/);
  assert.match(terminalHeaderSource, /New terminal tab/);
  assert.match(terminalHeaderSource, /Open terminal profile menu/);
  assert.match(terminalHeaderSource, /Minimize window/);
  assert.match(terminalHeaderSource, /Maximize window/);
  assert.match(terminalHeaderSource, /Close window/);
  assert.match(terminalHeaderSource, /resolveTerminalTabActionInlineWidth/);
  assert.match(terminalHeaderSource, /measureTerminalTabStripContentWidth/);
  assert.match(terminalHeaderSource, /export const TERMINAL_HEADER_RESERVE_WIDTH = 40;/);
  assert.match(terminalHeaderSource, /export const TERMINAL_HEADER_ACTION_FALLBACK_WIDTH = 60;/);
  assert.match(terminalHeaderSource, /export function syncTabScrollState\(/);
  assert.match(terminalHeaderSource, /export function scrollTabs\(/);
  assert.match(terminalHeaderSource, /export function measureTerminalHeaderLayoutMetrics\(/);
  assert.match(
    terminalHeaderSource,
    /export function tabShellStyle\(\s*active: boolean,\s*hovered: boolean,\s*docked: boolean,\s*\)/,
  );
  assert.match(terminalHeaderSource, /flex:\s*docked \? "1 0 0" : "0 0 auto"/);
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
    terminalHeaderSource,
    /boxShadow:\s*active \? "0 0 0 1px rgba\(255, 255, 255, 0\.02\) inset" : "none"/,
  );
  assert.match(
    terminalHeaderSource,
    /transition:\s*"background 120ms ease, color 120ms ease, box-shadow 120ms ease"/,
  );
  assert.match(terminalTabStripSource, /Scroll terminal tabs left/);
  assert.match(terminalTabStripSource, /Scroll terminal tabs right/);
  assert.match(terminalLaunchUiSource, /Shells/);
  assert.match(launchProfilesSource, /group:\s*"wsl"/);
  assert.match(launchProfilesSource, /WSL_DISCOVERY_COMMAND = "wsl\.exe --list --quiet"/);
  assert.match(launchProfilesSource, /HIDDEN_WSL_DISTRIBUTIONS = new Set\(\["docker-desktop", "docker-desktop-data"\]\)/);
  assert.match(shellProfileMenuBridgeSource, /useRef/);
  assert.match(shellProfileMenuBridgeSource, /const wslDiscoveryPromiseRef = useRef<Promise<void> \| null>\(null\);/);
  assert.match(shellProfileMenuBridgeSource, /const wslDiscoveryLastSuccessAtRef = useRef\(0\);/);
  assert.doesNotMatch(source, /const wslDiscoveryPromiseRef = useRef<Promise<void> \| null>\(null\);/);
  assert.doesNotMatch(source, /const wslDiscoveryLastSuccessAtRef = useRef\(0\);/);
  assert.match(shellOverlayStateSource, /const \[desktopWslDiscoveryStatus,\s*setDesktopWslDiscoveryStatus\] = useState<\s*ProfileMenuDescriptor \| null\s*>\(null\);/);
  assert.match(launchProfilesSource, /Windows Subsystem for Linux/);
  assert.match(launchProfilesSource, /replace\(\/\\u0000\/g,\s*""\)/);
  assert.match(launchProfilesSource, /command:\s*\["wsl\.exe", "-d", distributionName\]/);
  assert.match(terminalLaunchUiSource, /title="WSL"/);
  assert.match(shellProfileMenuBridgeSource, /void refreshDesktopWslLaunchProfiles\(\{ force: false \}\);/);
  assert.match(launchProfilesSource, /title = args\.hasCachedProfiles \? "WSL discovery stale" : "WSL unavailable"/);
  assert.match(profileMenuControllerSource, /export async function refreshDesktopWslLaunchProfiles\(/);
  assert.match(profileMenuControllerSource, /const hasCachedWslProfiles = args\.desktopWslLaunchProfiles\.length > 0;/);
  assert.match(profileMenuControllerSource, /let discoverySucceeded = false;/);
  assert.match(profileMenuControllerSource, /args\.setDesktopWslDiscoveryStatus\(null\);/);
  assert.match(profileMenuControllerSource, /if \(discoverySucceeded\) \{\s*args\.wslDiscoveryLastSuccessAtRef\.current = Date\.now\(\);\s*\}/);
  assert.match(profileMenuControllerSource, /export function scheduleProfileMenuBackgroundRefresh\(/);
  assert.match(profileMenuControllerSource, /export function toggleProfileMenu\(/);
  assert.doesNotMatch(source, /async function refreshDesktopWslLaunchProfiles\(/);
  assert.doesNotMatch(source, /function scheduleProfileMenuBackgroundRefresh\(/);
  assert.doesNotMatch(source, /function toggleProfileMenu\(\)/);
  assert.match(shellProfileMenuBridgeSource, /function toggleProfileMenu\(\)\s*\{\s*toggleProfileMenuController\(/);
  assert.match(shellProfileMenuBridgeSource, /function updateProfileMenuPosition\(\)\s*\{\s*updateProfileMenuPositionController\(/);
  assert.match(
    shellProfileMenuBridgeSource,
    /function refreshDesktopWslLaunchProfiles\(refreshArgs: \{ force\?: boolean \} = \{\}\)\s*\{\s*return refreshDesktopWslLaunchProfilesController\(/,
  );
  assert.doesNotMatch(shellProfileMenuBridgeSource, /wslDiscoveryPromiseRef: MutableRefObjectLike<Promise<void> \| null>;/);
  assert.doesNotMatch(shellProfileMenuBridgeSource, /wslDiscoveryLastSuccessAtRef: MutableRefObjectLike<number>;/);
  assert.match(shellStateBridgeSource, /export type UpdateShellState = \(/);
  assert.match(shellStateBridgeSource, /export function createShellStateBridge\(/);
  assert.match(shellStateBridgeSource, /function updateShellStateDeferred\(/);
  assert.match(shellStateBridgeSource, /function handleViewportResize\(/);
  assert.match(shellOverlayStateSource, /export function useShellOverlayState\(/);
  assert.match(shellOverlayStateSource, /function handleSelectSessionCenter\(\)/);
  assert.match(terminalLaunchUiSource, /AI CLI/);
  assert.match(launchProfilesSource, /Codex CLI/);
  assert.match(launchProfilesSource, /Claude Code/);
  assert.match(launchProfilesSource, /Gemini CLI/);
  assert.match(launchProfilesSource, /OpenCode CLI/);
  assert.match(terminalTabStripSource, /onContextMenu/);
  assert.match(terminalTabStripSource, /onMouseEnter/);
  assert.match(terminalTabStripSource, /onMouseLeave/);
  assert.match(terminalOverlaysSource, /Close other tabs/);
  assert.match(terminalOverlaysSource, /Close tabs to the right/);
  assert.match(terminalOverlaysSource, /Duplicate tab/);
  assert.match(terminalTabActionsSource, /appendTerminalShellPendingRuntimeInput/);
  assert.match(terminalTabActionsSource, /applyTerminalShellPromptInput/);
  assert.match(runtimeEffectsSource, /consumeTerminalShellPendingRuntimeInput/);
  assert.match(source, /runtimePendingInput/);
  assert.match(runtimeEffectsSource, /runtimeAttachmentId/);
  assert.match(runtimeEffectsSource, /runtimeBootstrapAttempts/);
  assert.match(runtimeEffectsSource, /consumeTerminalShellPendingRuntimeInput\(/);
  assert.match(runtimeEffectsSource, /shouldAutoRetryTerminalShellBootstrap/);
  assert.match(runtimeEffectsSource, /queueTerminalShellTabRuntimeBootstrapRetry/);
  assert.match(runtimeEffectsSource, /queueTerminalShellTabBootstrapCommand/);
  assert.match(runtimeEffectsSource, /resolveTerminalShellRuntimeBootstrapRequestFromTab/);
  assert.match(source, /snapshot: shellAppState\.snapshot,/);
  assert.match(source, /activeTab: shellAppState\.activeTab,/);
  assert.match(source, /runtimeDerivedState: shellAppState\.runtimeDerivedState,/);
  assert.match(source, /retryingTabsEffectKey: shellAppState\.retryingTabsEffectKey,/);
  assert.match(source, /runtimeBootstrapEffectKey: shellAppState\.runtimeBootstrapEffectKey,/);
  assert.match(source, /runtimePendingInputEffectKey: shellAppState\.runtimePendingInputEffectKey,/);
  assert.match(source, /latestSnapshotRef: shellAppState\.latestSnapshotRef,/);
  assert.doesNotMatch(source, /function handleRuntimeReplayByTabId\(/);
  assert.match(shellRuntimeBridgeSource, /function handleRuntimeReplayByTabId\(/);
  assert.match(shellRuntimeBridgeSource, /applyTerminalShellReplayEntries\(current,\s*tabId,\s*replay\)/);
  assert.match(source, /onRuntimeReplayApplied=\{runtimeBridge\.handleRuntimeReplayByTabId\}/);
  assert.match(terminalPanelStackSource, /onRuntimeReplayApplied=\{\(replay\) =>/);
  assert.match(terminalPanelStackSource, /props\.onRuntimeReplayApplied\(tab\.id,\s*replay\)/);
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
  assert.match(shellStateBridgeSource, /function updateShellState\(\s*update: \(current: TerminalShellState\) => TerminalShellState,\s*\)\s*\{\s*args\.setShellState\(\(current\) => update\(current\)\);\s*\}/);
  assert.match(shellStateBridgeSource, /function updateShellStateDeferred\(\s*update: \(current: TerminalShellState\) => TerminalShellState,\s*\)\s*\{\s*startTransition\(\(\) => \{\s*args\.setShellState\(\(current\) => update\(current\)\);\s*\}\);\s*\}/);
  assert.match(runtimeEffectsSource, /resumeTerminalShellTabRuntimeBootstrap/);
  assert.match(terminalTabActionsSource, /preservePendingInput:\s*tab\.runtimeState === "failed"/);
  assert.match(runtimeEffectsSource, /shouldFlushTerminalRuntimeInputQueue/);
  assert.match(runtimeEffectsSource, /export function clearRuntimeBootstrapRetryTimer\(/);
  assert.match(runtimeEffectsSource, /export function dispatchLiveRuntimeInput\(/);
  assert.match(runtimeEffectsSource, /export function cleanupRuntimeEffects\(/);
  assert.match(runtimeEffectsSource, /export function syncRetryingRuntimeTabs\(/);
  assert.match(runtimeEffectsSource, /export function processRuntimeBootstrapCandidates\(/);
  assert.match(runtimeEffectsSource, /for \(const tab of args\.runtimeDerivedState\.runtimeBootstrapCandidateTabs\) \{/);
  assert.match(runtimeEffectsSource, /export function flushPendingRuntimeInputs\(/);
  assert.doesNotMatch(source, /function clearRuntimeBootstrapRetryTimer\(tabId: string\)/);
  assert.doesNotMatch(source, /function dispatchLiveRuntimeInput\(args: \{/);
  assert.match(
    shellRuntimeBridgeSource,
    /function clearRuntimeBootstrapRetryTimer\(tabId: string\)\s*\{\s*clearRuntimeBootstrapRetryTimerController\(/,
  );
  assert.match(
    shellRuntimeBridgeSource,
    /function dispatchLiveRuntimeInput\(dispatchArgs: \{[\s\S]*dispatchLiveRuntimeInputController\(/,
  );
  assert.match(source, /clearRuntimeBootstrapRetryTimer: runtimeBridge\.clearRuntimeBootstrapRetryTimer/);
  assert.match(source, /dispatchLiveRuntimeInput: runtimeBridge\.dispatchLiveRuntimeInput/);
  assert.doesNotMatch(source, /const runtimeBindingEffectKey = createRuntimeBindingEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const retryingTabsEffectKey = createRetryingTabsEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const runtimeBootstrapEffectKey = createRuntimeBootstrapEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const runtimePendingInputEffectKey = createRuntimePendingInputEffectKey\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const \[shellState,\s*setShellState\] = useState<TerminalShellState>\(\(\) =>/);
  assert.doesNotMatch(source, /const snapshot = getTerminalShellSnapshot\(shellState\);/);
  assert.doesNotMatch(source, /const latestSnapshotRef = useRef<TerminalShellSnapshot \| null>\(snapshot\);/);
  assert.doesNotMatch(source, /const runtimeDerivedState = createRuntimeDerivedState\(snapshot\.tabs\);/);
  assert.doesNotMatch(source, /const snapshotTabById = runtimeDerivedState\.snapshotTabById;/);
  assert.doesNotMatch(source, /const launchProjectResolutionRequestIdRef = useRef\(0\);/);
  assert.doesNotMatch(source, /const shellStateBridge = createShellStateBridge\(\{/);
  assert.match(source, /onRegisterViewportCopyHandler=\{runtimeResources\.registerViewportCopyHandler\}/);
  assert.match(source, /onRegisterViewportPasteHandler=\{runtimeResources\.registerViewportPasteHandler\}/);
  assert.match(source, /runtimeControllerStore=\{runtimeResources\.runtimeControllerStore\}/);
  assert.match(shellRuntimeResourcesSource, /viewportCopyHandlersRef/);
  assert.match(shellRuntimeResourcesSource, /viewportPasteHandlersRef/);
  assert.match(source, /onViewportTitleChange=\{shellAppState\.shellStateBridge\.handleViewportTitleChange\}/);
  assert.match(source, /onRuntimeError=\{shellAppState\.shellStateBridge\.handleRuntimeError\}/);
  assert.match(source, /onSearchQueryChange=\{shellAppState\.shellStateBridge\.handleSearchQueryChange\}/);
  assert.match(source, /onSearchSelectMatch=\{shellAppState\.shellStateBridge\.handleSearchSelectMatch\}/);
  assert.match(source, /onViewportResize=\{shellAppState\.shellStateBridge\.handleViewportResize\}/);
  assert.match(terminalPanelStackSource, /props\.onRegisterViewportCopyHandler\(tab\.id,\s*handler\)/);
  assert.match(terminalPanelStackSource, /props\.onRegisterViewportPasteHandler\(tab\.id,\s*handler\)/);
  assert.match(terminalPanelStackSource, /props\.onRuntimeError\(tab\.id,\s*message\)/);
  assert.match(terminalPanelStackSource, /props\.onSearchQueryChange\(tab\.id,\s*query\)/);
  assert.match(terminalPanelStackSource, /props\.onSearchSelectMatch\(tab\.id\)/);
  assert.match(terminalPanelStackSource, /props\.onViewportResize\(tab\.id,\s*viewport\)/);
  assert.match(shellStateBridgeSource, /resizeTerminalShellTab/);
  assert.match(shellStateBridgeSource, /function resolveTabSnapshotById\(tabId: string\)\s*\{\s*return args\.snapshotTabById\.get\(tabId\) \?\? null;\s*\}/);
  assert.match(runtimeDerivedStateSource, /export function createRuntimeDerivedState\(/);
  assert.match(
    shellGlobalShortcutsSource,
    /if \(event\.defaultPrevented \|\| shouldIgnoreTerminalAppShortcutTarget\(event\.target\)\) \{\s*return;\s*\}/,
  );
  assert.match(runtimeDerivedStateSource, /const runtimeDerivedStateCache = new WeakMap</);
  assert.match(runtimeDerivedStateSource, /const cachedDerivedState = runtimeDerivedStateCache\.get\(tabs\);/);
  assert.match(runtimeDerivedStateSource, /if \(cachedDerivedState\) \{\s*return cachedDerivedState;\s*\}/);
  assert.match(runtimeDerivedStateSource, /const snapshotTabById = new Map<string,\s*TerminalShellSnapshot\["tabs"\]\[number\]>\(\);/);
  assert.match(runtimeDerivedStateSource, /const runtimeBootstrapCandidateTabs: TerminalShellSnapshot\["tabs"\] = \[\];/);
  assert.match(runtimeDerivedStateSource, /const runtimePendingInputTabs: TerminalShellSnapshot\["tabs"\] = \[\];/);
  assert.match(runtimeDerivedStateSource, /snapshotTabById\.set\(tab\.id,\s*tab\);/);
  assert.match(runtimeDerivedStateSource, /runtimeDerivedStateCache\.set\(tabs,\s*nextDerivedState\);/);
  assert.match(source, /const shellActionHandlers = createShellActionHandlers\(\{/);
  assert.match(source, /resolveTabSnapshotById,/);
  assert.match(source, /resolveActiveViewport: \(\) =>/);
  assert.match(source, /onOpenNewTab=\{shellActionHandlers\.handleOpenNewTab\}/);
  assert.match(source, /onOpenTabContextMenu=\{shellActionHandlers\.openTabContextMenu\}/);
  assert.match(source, /onViewportInput=\{shellActionHandlers\.handleViewportInputByTabId\}/);
  assert.match(source, /onRestartRuntime=\{shellActionHandlers\.handleRestartRuntimeTabById\}/);
  assert.match(source, /onSelectLaunchEntry=\{shellActionHandlers\.openLaunchEntry\}/);
  assert.match(source, /onSelectConnectorEntry=\{shellActionHandlers\.openDesktopConnectorEntry\}/);
  assert.match(source, /onSelectSessionCenter=\{overlayState\.handleSelectSessionCenter\}/);
  assert.match(source, /onCancelLaunchProjectFlow=\{shellActionHandlers\.cancelLaunchProjectFlow\}/);
  assert.match(source, /onLaunchEntryInWorkingDirectory=\{shellActionHandlers\.launchEntryInWorkingDirectory\}/);
  assert.match(source, /onPickWorkingDirectoryForEntry=\{shellActionHandlers\.pickWorkingDirectoryForEntry\}/);
  assert.match(source, /onContextMenuCopy=\{shellActionHandlers\.handleContextMenuCopy\}/);
  assert.match(source, /onContextMenuPaste=\{shellActionHandlers\.handleContextMenuPaste\}/);
  assert.match(source, /onCloseTab=\{shellActionHandlers\.handleCloseTab\}/);
  assert.match(source, /onCloseOtherTabs=\{shellActionHandlers\.handleCloseOtherTabs\}/);
  assert.match(source, /onCloseTabsToRight=\{shellActionHandlers\.handleCloseTabsToRight\}/);
  assert.match(source, /onDuplicateTab=\{shellActionHandlers\.handleDuplicateTab\}/);
  assert.match(source, /launchProjectFlowState=\{overlayState\.launchProjectFlowState\}/);
  assert.match(source, /setLaunchProjectFlowState=\{overlayState\.setLaunchProjectFlowState\}/);
  assert.match(terminalOverlayStackSource, /<TerminalProfileMenu/);
  assert.match(terminalOverlayStackSource, /<TerminalLaunchProjectFlowOverlays/);
  assert.match(terminalOverlayStackSource, /<TerminalTabContextMenu/);
  assert.match(terminalOverlayStackSource, /createLaunchProjectCollectionEvent/);
  assert.match(
    terminalOverlayStackSource,
    /const canManageRecentLaunchProjects =\s*props\.launchProjectFlowState\?\.kind === "selecting"\s*&&\s*props\.launchProjectFlowState\.source === "recent";/,
  );
  assert.match(
    terminalOverlayStackSource,
    /props\.setLaunchProjectFlowState\(\(current\) => \{\s*if \(!current \|\| current\.kind !== "selecting"\) \{\s*return current;\s*\}/,
  );
  assert.match(
    terminalOverlayStackSource,
    /candidate\.path\.toLowerCase\(\) !== project\.path\.toLowerCase\(\)/,
  );
  assert.match(
    terminalOverlayStackSource,
    /onSelectProject=\{\(state,\s*project\) => \{\s*props\.onCancelLaunchProjectFlow\(\);/,
  );
  assert.match(
    terminalOverlayStackSource,
    /onSelectWorkingDirectory=\{async \(state\) => \{\s*const launchEntry = state\.entry;\s*props\.onCancelLaunchProjectFlow\(\);/,
  );
  assert.match(shellActionHandlersSource, /function handleCloseTab\(tabId: string\)\s*\{\s*closeTerminalShellTabWithRuntime\(/);
  assert.match(shellActionHandlersSource, /function handleCloseOtherTabs\(tabId: string\)\s*\{\s*closeOtherTerminalShellTabsWithRuntime\(/);
  assert.match(shellActionHandlersSource, /function handleCloseTabsToRight\(tabId: string\)\s*\{\s*closeTerminalShellTabsToRightWithRuntime\(/);
  assert.match(shellActionHandlersSource, /function handleDuplicateTab\(tabId: string\)\s*\{\s*duplicateTerminalShellTabEntry\(/);
  assert.match(shellActionHandlersSource, /function handleRestartRuntimeTabById\(tabId: string\)\s*\{\s*restartTerminalShellTabRuntimeWithCleanup\(/);
  assert.match(shellActionHandlersSource, /function handleViewportInputByTabId\([\s\S]*routeTerminalViewportInputByTabId\(/);
  assert.match(shellActionHandlersSource, /function openTabContextMenu\([\s\S]*resolveTerminalTabContextMenu\(/);
  assert.match(terminalTabActionsSource, /export function resolveTerminalTabContextMenu\(/);
  assert.match(terminalTabActionsSource, /export function copyTerminalTabContextMenuSelection\(/);
  assert.match(terminalTabActionsSource, /export function pasteTerminalTabContextMenuSelection\(/);
  assert.match(terminalTabActionsSource, /export function closeTerminalShellTabWithRuntime\(/);
  assert.match(terminalTabActionsSource, /export function closeOtherTerminalShellTabsWithRuntime\(/);
  assert.match(terminalTabActionsSource, /export function closeTerminalShellTabsToRightWithRuntime\(/);
  assert.match(terminalTabActionsSource, /export function duplicateTerminalShellTabEntry\(/);
  assert.match(terminalTabActionsSource, /export function restartTerminalShellTabRuntimeWithCleanup\(/);
  assert.match(terminalTabActionsSource, /export function routeTerminalViewportInputByTabId\(/);
  assert.match(terminalTabActionsSource, /export function openDefaultTerminalShellTab\(/);
  assert.match(terminalTabActionsSource, /detectDefaultDesktopProfile\(\)/);
  assert.match(terminalTabActionsSource, /resolveTabOpenOptions\(\{/);
  assert.match(terminalTabActionsSource, /openTerminalShellTab\(/);
  assert.match(
    terminalTabActionsSource,
    /applyTerminalShellPromptInput\(current,\s*args\.tabId,\s*args\.inputEvent\.data\)/,
  );
  assert.match(
    terminalTabActionsSource,
    /appendTerminalShellPendingRuntimeInput\(current,\s*tab\.id,\s*pendingInput\)/,
  );
  assert.match(
    terminalTabActionsSource,
    /writeTerminalClipboardText\(targetTab\.copiedText,\s*args\.clipboardProvider\)/,
  );
  assert.match(terminalTabActionsSource, /readTerminalClipboardText\(args\.clipboardProvider\)/);
  assert.match(terminalTabActionsSource, /const menuWidth = args\.menuWidth \?\? 196;/);
  assert.match(terminalTabActionsSource, /if \(tabIndex < 0\) \{\s*return;\s*\}/);
  assert.doesNotMatch(source, /applyTerminalShellPromptInput\(current,\s*tab\.id,\s*inputEvent\.data\)/);
  assert.match(source, /useShellGlobalKeyboardShortcuts\(\{/);
  assert.match(source, /headerChromeRef: chromeState\.headerChromeRef,/);
  assert.match(source, /hoveredTabId=\{chromeState\.hoveredTabId\}/);
  assert.match(source, /canScrollLeft=\{chromeState\.canScrollLeft\}/);
  assert.match(source, /canScrollRight=\{chromeState\.canScrollRight\}/);
  assert.match(source, /shouldDockTabActionsToTrailing=\{chromeState\.shouldDockTabActionsToTrailing\}/);
  assert.match(source, /headerLeadingRef=\{chromeState\.headerLeadingRef\}/);
  assert.match(source, /headerChromeRef=\{chromeState\.headerChromeRef\}/);
  assert.match(source, /tabScrollRef=\{chromeState\.tabScrollRef\}/);
  assert.match(source, /setCanScrollLeft=\{chromeState\.setCanScrollLeft\}/);
  assert.match(source, /setCanScrollRight=\{chromeState\.setCanScrollRight\}/);
  assert.match(source, /onSetHoveredTabId=\{chromeState\.setHoveredTabId\}/);
  assert.match(source, /profileMenuRef=\{chromeState\.profileMenuRef\}/);
  assert.match(source, /contextMenuRef=\{chromeState\.contextMenuRef\}/);
  assert.doesNotMatch(source, /useShellUiEffects\(\{/);
  assert.doesNotMatch(source, /document\.addEventListener\("keydown"/);
  assert.doesNotMatch(source, /document\.addEventListener\("mousedown"/);
  assert.doesNotMatch(source, /new ResizeObserver/);
  assert.doesNotMatch(source, /scrollIntoView\(\{/);
  assert.match(shellGlobalShortcutsSource, /export function useShellGlobalKeyboardShortcuts\(/);
  assert.match(shellGlobalShortcutsSource, /document\.addEventListener\("keydown", handleGlobalKeyDown\)/);
  assert.match(shellGlobalShortcutsSource, /document\.removeEventListener\("keydown", handleGlobalKeyDown\)/);
  assert.match(shellGlobalShortcutsSource, /openDefaultTerminalShellTab\(\{/);
  assert.match(shellUiEffectsSource, /export function useShellUiEffects\(/);
  assert.match(shellUiEffectsSource, /document\.addEventListener\("mousedown", handlePointerDown\)/);
  assert.match(shellUiEffectsSource, /document\.removeEventListener\("mousedown", handlePointerDown\)/);
  assert.match(shellUiEffectsSource, /const resizeObserver = new ResizeObserver\(\(\) => \{/);
  assert.match(shellUiEffectsSource, /activeElement\.scrollIntoView\(\{/);
  assert.match(shellUiEffectsSource, /window\.addEventListener\("resize", syncProfileMenuPosition\)/);
  assert.match(shellUiEffectsSource, /window\.addEventListener\("scroll", syncProfileMenuPosition, true\)/);
  assert.doesNotMatch(source, /function runTabCommandById\(/);
  assert.doesNotMatch(source, /const pendingTabIdsRef = useRef<Set<string>>\(new Set\(\)\);/);
  assert.doesNotMatch(source, /pendingTabIdsRef\.current\.delete\(tab\.id\);/);
  assert.doesNotMatch(source, /runTerminalShellCommand,/);
  assert.doesNotMatch(source, /submitTerminalShellCommand,/);
  assert.match(shellContractSource, /subscribeSessionEvents/);
  assert.match(shellContractSource, /detachSessionAttachment/);
  assert.match(shellContractSource, /acknowledgeSessionAttachment/);
  assert.match(shellContractSource, /sessionCenterEnabled\?: boolean;/);
  assert.match(shellContractSource, /sessionCenterOpen\?: boolean;/);
  assert.match(shellContractSource, /onToggleSessionCenter\?: \(\) => void;/);
  assert.match(shellContractSource, /desktopSessionReattachIntent\?: DesktopSessionReattachIntent \| null;/);
  assert.match(shellContractSource, /desktopConnectorSessionIntent\?: DesktopConnectorSessionIntent \| null;/);
  assert.match(shellContractSource, /desktopConnectorEntries\?: DesktopConnectorLaunchEntry\[];/);
  assert.match(shellContractSource, /onLaunchDesktopConnectorEntry\?: \(entryId: string\) => void;/);
  assert.match(shellContractSource, /export interface ShellWorkingDirectoryPickerOptions \{/);
  assert.match(shellContractSource, /export type ShellAppWorkingDirectoryPickerRequest = ShellWorkingDirectoryPickerOptions;/);
  assert.match(shellContractSource, /onPickWorkingDirectory\?: \(\s*options: ShellWorkingDirectoryPickerOptions,\s*\) => Promise<string \| null>;/);
  assert.match(shellContractSource, /onBeforeProfileMenuOpen\?: \(\) => void;/);
  assert.match(shellContractSource, /onRemoveLaunchProject\?: \(event: TerminalLaunchProjectRemovalEvent\) => void \| Promise<void>;/);
  assert.match(shellContractSource, /onClearLaunchProjects\?: \(event: TerminalLaunchProjectCollectionEvent\) => void \| Promise<void>;/);
  assert.match(launchProfilesSource, /requiresWorkingDirectoryPicker:\s*true/);
  assert.match(launchProfilesSource, /Choose folder and open Codex in a local terminal tab/);
  assert.match(source, /props\.onPickWorkingDirectory/);
  assert.match(launchFlowSource, /title:\s*`Choose working directory for \$\{entry\.label\}`/);
  assert.ok(
    shellOverlayStateSource.includes(
      "const [profileMenuStatus, setProfileMenuStatus] = useState<ProfileMenuDescriptor | null>(null);",
    ),
  );
  assert.match(launchFlowSource, /title:\s*`\$\{entry\.label\} launch failed`/);
  assert.match(launchFlowSource, /subtitle:\s*`Working directory selection failed\. \$\{message\}`/);
  assert.match(launchControllerSource, /args\.setProfileMenuOpen\(true\);/);
  assert.match(terminalLaunchUiSource, /slot="terminal-profile-menu-status"/);
  assert.match(terminalLaunchUiSource, /slot="terminal-wsl-discovery-status"/);
  assert.match(profileMenuSource, /data-slot=\{props\.slot\}/);
  assert.match(terminalLaunchUiSource, /Session Center/);
  assert.match(terminalLaunchUiSource, /Connectors/);
  assert.match(shellOverlayStateSource, /Reconnect detached shell sessions/);
  assert.match(shellOverlayStateSource, /args\.onToggleSessionCenter\?\.\(\)/);
  assert.match(terminalLaunchUiSource, /props\.connectorEntries\?\.length/);
  assert.match(source, /onLaunchDesktopConnectorEntry:\s*props\.onLaunchDesktopConnectorEntry/);
  assert.match(launchControllerSource, /args\.onLaunchDesktopConnectorEntry\?\.\(args\.entry\.targetId\)/);
  assert.match(source, /onBeforeProfileMenuOpen:\s*props\.onBeforeProfileMenuOpen/);
  assert.match(profileMenuControllerSource, /args\.onBeforeProfileMenuOpen\?\.\(\)/);
  assert.match(runtimeEffectsSource, /attachmentId:\s*session\.attachmentId/);
  assert.match(runtimeEffectsSource, /attachmentId:\s*tab\.runtimeAttachmentId/);
  assert.match(runtimeEffectsSource, /void args\.desktopRuntimeClient\?\.detachSessionAttachment\?\.\(/);
  assert.match(launchControllerSource, /bindTerminalShellSessionRuntime\(next,\s*next\.activeTabId,\s*\{/);
  assert.match(launchControllerSource, /export function applyDesktopSessionReattachIntent\(/);
  assert.match(launchControllerSource, /export function applyDesktopConnectorIntent\(/);
  assert.match(launchControllerSource, /export function cancelLaunchProjectFlow\(/);
  assert.match(launchControllerSource, /export async function resolveLaunchProjectsForEntry\(/);
  assert.match(launchControllerSource, /export async function pickWorkingDirectoryForEntry\(/);
  assert.match(launchControllerSource, /export async function openLaunchEntry\(/);
  assert.match(launchControllerSource, /export function openDesktopConnectorEntry\(/);
  assert.match(launchControllerSource, /createLaunchProjectActivationEvent/);
  assert.match(launchControllerSource, /resolveLaunchEntryOpenOptions/);
  assert.match(launchControllerSource, /createLaunchProjectLookupFailureStatus/);
  assert.match(launchControllerSource, /createWorkingDirectoryPickerFailureStatus/);
  assert.match(shellActionHandlersSource, /function launchEntryInWorkingDirectory\([\s\S]*launchEntryInWorkingDirectoryController\(/);
  assert.match(shellActionHandlersSource, /function cancelLaunchProjectFlow\(\)\s*\{\s*cancelLaunchProjectFlowController\(/);
  assert.match(shellActionHandlersSource, /async function pickWorkingDirectoryForEntry\([\s\S]*pickWorkingDirectoryForEntryController\(/);
  assert.match(shellActionHandlersSource, /async function openLaunchEntry\([\s\S]*openLaunchEntryController\(/);
  assert.match(shellActionHandlersSource, /function openDesktopConnectorEntry\([\s\S]*openDesktopConnectorEntryController\(/);
  assert.doesNotMatch(source, /function launchEntryInWorkingDirectory\(/);
  assert.doesNotMatch(source, /function cancelLaunchProjectFlow\(/);
  assert.doesNotMatch(source, /async function resolveLaunchProjectsForEntry\(/);
  assert.doesNotMatch(source, /async function pickWorkingDirectoryForEntry\(/);
  assert.doesNotMatch(source, /async function openLaunchEntry\(/);
  assert.doesNotMatch(source, /function openDesktopConnectorEntry\(/);
  assert.doesNotMatch(source, /function handleOpenNewTab\(/);
  assert.doesNotMatch(source, /function openTabContextMenu\(/);
  assert.doesNotMatch(source, /function handleContextMenuCopy\(/);
  assert.doesNotMatch(source, /function handleContextMenuPaste\(/);
  assert.doesNotMatch(source, /function handleCloseTab\(/);
  assert.doesNotMatch(source, /function handleCloseOtherTabs\(/);
  assert.doesNotMatch(source, /function handleCloseTabsToRight\(/);
  assert.doesNotMatch(source, /function handleDuplicateTab\(/);
  assert.doesNotMatch(source, /function handleRestartRuntimeTabById\(/);
  assert.doesNotMatch(source, /function handleViewportInputByTabId\(/);
  assert.match(launchFlowSource, /export function createLaunchProjectActivationEvent/);
  assert.match(launchFlowSource, /export function createLaunchProjectCollectionEvent/);
  assert.match(launchFlowSource, /export function createLaunchProjectResolutionRequest/);
  assert.match(launchFlowSource, /export function createWebRuntimeBootstrapFromTarget/);
  assert.match(launchFlowSource, /export function resolveTabOpenOptions/);
  assert.match(launchFlowSource, /export function resolveLaunchEntryOpenOptions/);
  assert.match(launchFlowSource, /export function createLaunchProjectLookupFailureStatus/);
  assert.match(launchFlowSource, /export function createWorkingDirectoryPickerFailureStatus/);
  assert.match(shellContractSource, /createConnectorInteractiveSession/);
  assert.match(shellContractSource, /createLocalProcessSession/);
  assert.match(shellContractSource, /writeSessionInput/);
  assert.match(shellContractSource, /writeSessionInputBytes/);
  assert.match(shellContractSource, /resizeSession/);
  assert.match(shellContractSource, /terminateSession/);
  assert.match(source, /props\.desktopConnectorSessionIntent/);
  assert.match(
    terminalOverlayStackSource,
    /canManageRecentLaunchProjects && props\.onRemoveLaunchProject/,
  );
  assert.match(
    terminalOverlayStackSource,
    /canManageRecentLaunchProjects && props\.onClearLaunchProjects/,
  );
  assert.match(launchProjectDialogsSource, /Clear recent/);
  assert.match(launchProjectDialogsSource, /Remove/);
  assert.match(launchControllerSource, /runtimeBootstrap:\s*\{\s*kind:\s*"connector"/);
  assert.match(launchFlowSource, /runtimeBootstrap:\s*\{\s*kind:\s*"local-process"/);
  assert.match(runtimeOrchestrationSource, /args\.request\.kind === "connector"/);
  assert.match(runtimeOrchestrationSource, /args\.request\.kind === "local-process"/);
  assert.match(
    runtimeEffectsSource,
    /const tabRuntimeBootstrapRequest = resolveTerminalShellRuntimeBootstrapRequestFromTab\(\s*tab,\s*tab\.snapshot\.viewport,\s*\);/,
  );
  assert.match(runtimeDerivedStateSource, /tab\.viewportMeasured,/);
  assert.match(
    runtimeDerivedStateSource,
    /tab\.viewportMeasured\s*&&\s*\(tab\.runtimeState === "retrying"\s*\|\|\s*\(!tab\.runtimeSessionId && tab\.runtimeState === "idle"\)\)/,
  );
  assert.doesNotMatch(source, /tab\.snapshot\.viewport\.cols > 20 \? tab\.snapshot\.viewport\.cols : 120/);
  assert.doesNotMatch(source, /tab\.snapshot\.viewport\.rows > 5 \? tab\.snapshot\.viewport\.rows : 32/);
  assert.match(terminalPanelStackSource, /<MemoTerminalStage/);
  assert.match(source, /<TerminalPanelStack/);
  assert.match(terminalPanelStackSource, /tabId=\{tab\.id\}/);
  assert.match(
    source,
    /const \{\s*desktopRuntimeAvailable,\s*desktopSessionReattachIntent\s*\}\s*=\s*useDesktopTerminalSurfaceLaunchBridge\(/,
  );
  assert.match(source, /style=\{desktopTerminalSurfaceContainerStyle\}/);
  assert.doesNotMatch(source, /const handledLaunchRequestKeyRef = useRef<string \| number \| null>\(null\);/);
  assert.match(desktopTerminalSurfaceSource, /export const desktopTerminalSurfaceContainerStyle: CSSProperties = \{/);
  assert.match(desktopTerminalSurfaceSource, /background:\s*TERMINAL_SURFACE_BACKGROUND,/);
  assert.match(desktopTerminalSurfaceSource, /export function useDesktopTerminalSurfaceLaunchBridge</);
  assert.match(desktopTerminalSurfaceSource, /const handledLaunchRequestKeyRef = useRef<string \| number \| null>\(null\);/);
  assert.match(desktopTerminalSurfaceSource, /const requestSequenceRef = useRef\(0\);/);
  assert.match(desktopTerminalSurfaceSource, /createLocalProcessSession\(/);
  assert.match(desktopTerminalSurfaceSource, /createLocalShellSession\(/);
  assert.match(
    desktopTerminalSurfaceSource,
    /setDesktopSessionReattachIntent\(\{\s*requestId:\s*`terminal-request:\$\{String\(launchRequestKey\)\}:\$\{requestSequenceRef\.current\}`,/,
  );
  assert.match(terminalTabActionsSource, /return args\.contextMenu\?\.tabId \?\? args\.activeTabId;/);
  assert.match(
    terminalTabActionsSource,
    /const copyHandler = args\.viewportCopyHandlersRef\.current\.get\(targetTabId\);/,
  );
  assert.match(terminalTabActionsSource, /if \(copyHandler\) \{\s*void copyHandler\(\);\s*return;\s*\}/);
  assert.match(
    terminalTabActionsSource,
    /void writeTerminalClipboardText\(targetTab\.copiedText,\s*args\.clipboardProvider\);/,
  );
  assert.match(
    terminalTabActionsSource,
    /void readTerminalClipboardText\(args\.clipboardProvider\)\.then\(\(text\) => \{/,
  );
  assert.match(terminalHeaderSource, /chromeButtonStyle\(props\.profileMenuOpen\)/);
  assert.match(shellActionHandlersSource, /viewport:\s*args\.activeTab\.snapshot\.viewport/);
  assert.match(runtimeOrchestrationSource, /remote runtime tabs are only supported in web mode/);
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
    /async function writeRuntimeInput\(/,
  );
  assert.match(runtimeOrchestrationSource, /export async function writeRuntimeInput\(/);
  assert.match(runtimeOrchestrationSource, /export function resolveTabRuntimeClient\(/);
  assert.match(runtimeOrchestrationSource, /export function isRuntimeCapableTab\(/);
  assert.match(runtimeOrchestrationSource, /export function createRuntimeBootstrapRequest\(/);
  assert.match(runtimeOrchestrationSource, /export function resolveRuntimeUnavailableMessage\(/);
  assert.match(runtimeOrchestrationSource, /export const DESKTOP_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT = 1;/);
  assert.match(runtimeOrchestrationSource, /export const DESKTOP_RUNTIME_BOOTSTRAP_RETRY_DELAY_MS = 220;/);
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
  assert.match(terminalOverlaysSource, /export function resolveProfileMenuPosition/);
  assert.match(terminalOverlaysSource, /export function ConnectorCatalogStatusMenuItem/);
  assert.match(terminalOverlaysSource, /export const TerminalTabContextMenu = forwardRef/);
  assert.match(terminalOverlaysSource, /Copy selection/);
  assert.match(terminalOverlaysSource, /Paste/);
  assert.match(terminalOverlaysSource, /Connectors unavailable/);
  assert.match(terminalLaunchUiSource, /LaunchProjectResolvingDialog/);
  assert.match(terminalLaunchUiSource, /LaunchProjectPickerDialog/);
  assert.match(terminalLaunchUiSource, /flowState\.kind === "resolving"/);
});

test("shell app keeps header tabs charcoal and terminal surface near-black", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const shellLayoutSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "shell-layout.ts"),
    "utf8",
  );
  const terminalHeaderSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-shell", "src", "terminal-header.tsx"),
    "utf8",
  );
  const infrastructureSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-infrastructure", "src", "index.ts"),
    "utf8",
  );

  assert.match(shellLayoutSource, /const TERMINAL_CHROME_BACKGROUND = "#16181b";/);
  assert.match(terminalHeaderSource, /const TERMINAL_ACTIVE_TAB_BACKGROUND = "#1f2329";/);
  assert.match(terminalHeaderSource, /export const TERMINAL_SURFACE_BACKGROUND = "#050607";/);
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
