import type { TerminalSnapshot, TerminalViewport } from "@sdkwork/terminal-core";
import {
  DEFAULT_TERMINAL_VIEWPORT,
  type TerminalLine,
  type TerminalSelectionRange,
} from "@sdkwork/terminal-core";
import {
  createTerminalViewAdapter,
  type TerminalViewAdapter,
} from "@sdkwork/terminal-infrastructure";
import type {
  ConnectorSessionLaunchRequest,
  RemoteRuntimeSessionCreateRequest,
} from "@sdkwork/terminal-types";

export type TerminalShellMode = "desktop" | "web";
export type TerminalShellProfile = "powershell" | "bash" | "shell";
export type TerminalShellRuntimeState =
  | "idle"
  | "binding"
  | "retrying"
  | "running"
  | "exited"
  | "failed";

export type TerminalShellRuntimeBootstrap =
  | {
      kind: "local-shell";
    }
  | {
      kind: "connector";
      request: ConnectorSessionLaunchRequest;
    }
  | {
      kind: "remote-runtime";
      request: RemoteRuntimeSessionCreateRequest;
    };

export type TerminalShellRuntimeBootstrapRequest =
  | {
      kind: "local-shell";
      request: {
        profile: TerminalShellProfile;
        workingDirectory: string;
        cols: number;
        rows: number;
      };
    }
  | {
      kind: "connector";
      request: ConnectorSessionLaunchRequest & {
        cols: number;
        rows: number;
      };
    }
  | {
      kind: "remote-runtime";
      request: RemoteRuntimeSessionCreateRequest & {
        cols: number;
        rows: number;
      };
    };

const MAX_RUNTIME_TERMINAL_CONTENT_BYTES = 4 * 1024 * 1024;

export interface TerminalShellReplayEntry {
  sequence: number;
  kind: "output" | "marker" | "state" | "warning" | "exit";
  payload: string;
  occurredAt: string;
}

export type TerminalShellPendingRuntimeInput =
  | {
      kind: "text";
      data: string;
    }
  | {
      kind: "binary";
      inputBytes: number[];
    };

export interface TerminalShellTabState {
  id: string;
  baseTitle: string;
  title: string;
  profile: TerminalShellProfile;
  runtimeBootstrap: TerminalShellRuntimeBootstrap;
  targetLabel: string;
  commandText: string;
  commandCursor: number;
  commandHistory: string[];
  historyIndex: number;
  searchQuery: string;
  copiedText: string;
  workingDirectory: string;
  invokedProgram: string;
  lastExitCode: number | null;
  runtimeSessionId: string | null;
  runtimeAttachmentId: string | null;
  runtimeCursor: string | null;
  runtimeState: TerminalShellRuntimeState;
  runtimeBootstrapAttempts: number;
  runtimeBootstrapLastError: string | null;
  runtimePendingInput: string;
  runtimePendingInputQueue: TerminalShellPendingRuntimeInput[];
  runtimeStreamStarted: boolean;
  runtimeTerminalContent: string;
  runtimeContentTruncated: boolean;
  adapter: TerminalViewAdapter;
}

export interface TerminalShellState {
  mode: TerminalShellMode;
  activeTabId: string;
  nextTabIndex: number;
  tabs: TerminalShellTabState[];
}

export interface TerminalShellTabSnapshot {
  id: string;
  title: string;
  profile: TerminalShellProfile;
  runtimeBootstrap: TerminalShellRuntimeBootstrap;
  targetLabel: string;
  commandText: string;
  commandCursor: number;
  searchQuery: string;
  copiedText: string;
  workingDirectory: string;
  invokedProgram: string;
  lastExitCode: number | null;
  runtimeSessionId: string | null;
  runtimeAttachmentId: string | null;
  runtimeCursor: string | null;
  runtimeState: TerminalShellRuntimeState;
  runtimeBootstrapAttempts: number;
  runtimeBootstrapLastError: string | null;
  runtimePendingInput: string;
  runtimePendingInputQueue: TerminalShellPendingRuntimeInput[];
  runtimeStreamStarted: boolean;
  runtimeTerminalContent: string;
  runtimeContentTruncated: boolean;
  active: boolean;
  closable: boolean;
  snapshot: TerminalSnapshot;
}

export interface TerminalShellSnapshot {
  mode: TerminalShellMode;
  tabs: TerminalShellTabSnapshot[];
  activeTab: TerminalShellTabSnapshot;
}

const terminalShellTabSnapshotCache = new WeakMap<
  TerminalShellTabState,
  Map<string, TerminalShellTabSnapshot>
>();
const terminalShellSnapshotCache = new WeakMap<
  TerminalShellState,
  TerminalShellSnapshot
>();

export interface TerminalShellLayoutContract {
  kind: "windows-terminal";
  primarySurface: "terminal-tab-stage";
  tabRoles: ["tablist", "tab", "tabpanel"];
  headerChrome: ["tablist", "new-tab-button", "profile-menu"];
  secondaryPanels: [];
}

export interface OpenTerminalShellTabOptions {
  title?: string;
  profile?: TerminalShellProfile;
  targetLabel?: string;
  commandText?: string;
  searchQuery?: string;
  viewport?: TerminalViewport;
  runtimeBootstrap?: TerminalShellRuntimeBootstrap;
}

export interface TerminalShellExecutionResult {
  profile: string;
  commandText: string;
  workingDirectory: string;
  invokedProgram: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface BindTerminalShellSessionRuntimeOptions {
  sessionId: string;
  attachmentId?: string | null;
  cursor?: string | null;
  workingDirectory?: string;
  invokedProgram?: string;
  targetLabel?: string;
}

export interface ApplyTerminalShellReplayOptions {
  nextCursor: string;
  entries: TerminalShellReplayEntry[];
}

export interface ApplyTerminalShellReplayBatchOptions
  extends ApplyTerminalShellReplayOptions {
  tabId: string;
}

export function shouldUseTerminalShellFallbackMode(args: {
  mode: TerminalShellMode;
  runtimeBootstrap: Pick<TerminalShellRuntimeBootstrap, "kind">;
  runtimeSessionId: string | null;
}) {
  return (
    args.mode === "web" &&
    args.runtimeBootstrap.kind === "local-shell" &&
    !shouldUseTerminalShellRuntimeStream(args)
  );
}

export function shouldUseTerminalShellRuntimeStream(args: {
  mode: TerminalShellMode;
  runtimeBootstrap: Pick<TerminalShellRuntimeBootstrap, "kind">;
  runtimeSessionId: string | null;
}) {
  return (
    args.mode === "desktop" ||
    args.runtimeBootstrap.kind !== "local-shell" ||
    Boolean(args.runtimeSessionId)
  );
}

export function resolveTerminalShellRuntimeClientKind(args: {
  mode: TerminalShellMode;
  runtimeBootstrap: Pick<TerminalShellRuntimeBootstrap, "kind">;
}): "desktop" | "web" | null {
  if (args.runtimeBootstrap.kind === "remote-runtime") {
    return args.mode === "web" ? "web" : null;
  }

  return args.mode === "desktop" ? "desktop" : null;
}

export function resolveTerminalStageBehavior(args: {
  mode: TerminalShellMode;
  runtimeBootstrap: Pick<TerminalShellRuntimeBootstrap, "kind">;
  runtimeSessionId: string | null;
  runtimeState: TerminalShellRuntimeState;
  runtimeStreamStarted: boolean;
}) {
  const usesRuntimeTerminalStream = shouldUseTerminalShellRuntimeStream({
    mode: args.mode,
    runtimeBootstrap: args.runtimeBootstrap,
    runtimeSessionId: args.runtimeSessionId,
  });
  const showLivePrompt = shouldUseTerminalShellFallbackMode({
    mode: args.mode,
    runtimeBootstrap: args.runtimeBootstrap,
    runtimeSessionId: args.runtimeSessionId,
  });
  const showBootstrapOverlay =
    args.mode === "desktop" &&
    (args.runtimeState === "binding" || args.runtimeState === "retrying") &&
    !args.runtimeStreamStarted;

  return {
    usesRuntimeTerminalStream,
    showLivePrompt,
    showBootstrapOverlay,
  };
}

function createTabId(index: number) {
  return `tab-${String(index).padStart(4, "0")}`;
}

function cloneConnectorSessionLaunchRequest(
  request: ConnectorSessionLaunchRequest,
): ConnectorSessionLaunchRequest {
  return {
    workspaceId: request.workspaceId,
    target: request.target,
    authority: request.authority,
    command: [...request.command],
    modeTags: [...request.modeTags],
    tags: [...request.tags],
  };
}

function cloneRemoteRuntimeSessionCreateRequest(
  request: RemoteRuntimeSessionCreateRequest,
): RemoteRuntimeSessionCreateRequest {
  return {
    workspaceId: request.workspaceId,
    target: request.target,
    authority: request.authority,
    command: [...request.command],
    workingDirectory: request.workingDirectory,
    cols: request.cols,
    rows: request.rows,
    modeTags: [...request.modeTags],
    tags: [...request.tags],
  };
}

function cloneTerminalShellRuntimeBootstrap(
  runtimeBootstrap: TerminalShellRuntimeBootstrap,
): TerminalShellRuntimeBootstrap {
  if (runtimeBootstrap.kind === "connector") {
    return {
      kind: "connector",
      request: cloneConnectorSessionLaunchRequest(runtimeBootstrap.request),
    };
  }

  if (runtimeBootstrap.kind === "remote-runtime") {
    return {
      kind: "remote-runtime",
      request: cloneRemoteRuntimeSessionCreateRequest(runtimeBootstrap.request),
    };
  }

  return {
    kind: "local-shell",
  };
}

function resolveNextTabIndex(tabs: TerminalShellTabState[]) {
  const highestIndex = tabs.reduce((maxValue, tab) => {
    const parsed = Number.parseInt(tab.id.replace("tab-", ""), 10);
    return Number.isNaN(parsed) ? maxValue : Math.max(maxValue, parsed);
  }, 0);

  return highestIndex + 1;
}

function getNodeProcess() {
  if (typeof globalThis !== "object" || !("process" in globalThis)) {
    return undefined;
  }

  return (globalThis as typeof globalThis & {
    process?: {
      cwd?: () => string;
      platform?: string;
    };
  }).process;
}

function defaultProfileForMode(mode: TerminalShellMode): TerminalShellProfile {
  if (mode !== "desktop") {
    return "bash";
  }
  if (typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent)) {
    return "powershell";
  }
  if (getNodeProcess()?.platform === "win32") {
    return "powershell";
  }
  return "bash";
}

function defaultTitle(profile: TerminalShellProfile, index: number) {
  if (profile === "powershell") {
    return index === 1 ? "PowerShell" : `PowerShell ${index}`;
  }

  if (profile === "bash") {
    return index === 1 ? "bash" : `bash ${index}`;
  }

  return index === 1 ? "shell" : `shell ${index}`;
}

function defaultTargetLabel(mode: TerminalShellMode, profile: TerminalShellProfile) {
  if (profile === "powershell") {
    return mode === "desktop" ? "local pwsh / desktop host" : "pwsh / remote";
  }

  if (profile === "bash") {
    return mode === "desktop" ? "local bash / login shell" : "bash / remote";
  }

  return mode === "desktop" ? "local shell" : "remote shell";
}

function resolveHomeDirectory(): string {
  const proc = getNodeProcess();
  if (proc) {
    const env = (globalThis as typeof globalThis & {
      process?: {
        env?: Record<string, string | undefined>;
      };
    }).process?.env;
    if (env) {
      const home = env.HOME || env.USERPROFILE || env.HOMEPATH;
      if (home) {
        return home;
      }
    }
  }

  if (typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent)) {
    return "C:\\Users";
  }

  return "/home";
}

function defaultWorkingDirectory(mode: TerminalShellMode) {
  if (mode === "desktop") {
    if (typeof getNodeProcess()?.cwd === "function") {
      return getNodeProcess()!.cwd!();
    }
    return resolveHomeDirectory();
  }
  return resolveHomeDirectory();
}

function defaultInvokedProgram(
  mode: TerminalShellMode,
  profile: TerminalShellProfile,
) {
  if (profile === "powershell") {
    return mode === "desktop" ? "powershell" : "pwsh";
  }

  if (profile === "bash") {
    return "bash";
  }

  if (mode === "desktop") {
    if (typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent)) {
      return "powershell";
    }
    return "sh";
  }

  return "sh";
}

function createSeedLines(
  mode: TerminalShellMode,
  profile: TerminalShellProfile,
  title: string,
  runtimeBootstrap: TerminalShellRuntimeBootstrap,
) {
  if (
    !shouldUseTerminalShellFallbackMode({
      mode,
      runtimeBootstrap,
      runtimeSessionId: null,
    })
  ) {
    return [];
  }

  if (profile === "powershell") {
    return [
      "Windows PowerShell",
      "Copyright (C) Microsoft Corporation. All rights reserved.",
      "",
      "Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows",
      "",
    ];
  }

  if (profile === "bash") {
    return [
      `${title} session attached`,
      "remote bash environment ready",
      "",
      "help -> status, pwd, whoami, clear",
    ];
  }

  return [
    `${title} attached`,
    "remote shell ready",
    "",
    "help -> status, pwd, whoami, clear",
  ];
}

function createTerminalShellTab(
  mode: TerminalShellMode,
  index: number,
  options: OpenTerminalShellTabOptions = {},
): TerminalShellTabState {
  const profile = options.profile ?? defaultProfileForMode(mode);
  const runtimeBootstrap = cloneTerminalShellRuntimeBootstrap(
    options.runtimeBootstrap ?? {
      kind: "local-shell",
    },
  );
  const title = options.title ?? defaultTitle(profile, index);
  const targetLabel = options.targetLabel ?? defaultTargetLabel(mode, profile);
  const initialInvokedProgram =
    runtimeBootstrap.kind === "connector" || runtimeBootstrap.kind === "remote-runtime"
      ? runtimeBootstrap.request.command[0] ?? defaultInvokedProgram(mode, profile)
      : defaultInvokedProgram(mode, profile);
  const adapter = createTerminalViewAdapter({
    viewport: options.viewport ?? DEFAULT_TERMINAL_VIEWPORT,
    scrollbackLimit: 512,
  });

  adapter.writeOutput(
    createSeedLines(mode, profile, title, runtimeBootstrap).join("\n"),
  );
  adapter.search(options.searchQuery ?? "");

  return {
    id: createTabId(index),
    baseTitle: title,
    title,
    profile,
    runtimeBootstrap,
    targetLabel,
    commandText: options.commandText ?? "",
    commandCursor: (options.commandText ?? "").length,
    commandHistory: [],
    historyIndex: 0,
    searchQuery: options.searchQuery ?? "",
    copiedText: "",
    workingDirectory: defaultWorkingDirectory(mode),
    invokedProgram: initialInvokedProgram,
    lastExitCode: null,
    runtimeSessionId: null,
    runtimeAttachmentId: null,
    runtimeCursor: null,
    runtimeState: "idle",
    runtimeBootstrapAttempts: 0,
    runtimeBootstrapLastError: null,
    runtimePendingInput: "",
    runtimePendingInputQueue: [],
    runtimeStreamStarted: false,
    runtimeTerminalContent: "",
    runtimeContentTruncated: false,
    adapter,
  };
}

function createTerminalViewAdapterFromLines(options: {
  lines: TerminalLine[];
  viewport: TerminalViewport;
  scrollbackLimit: number;
  searchQuery: string;
  selection: TerminalSelectionRange | null;
}) {
  const adapter = createTerminalViewAdapter({
    viewport: options.viewport,
    scrollbackLimit: options.scrollbackLimit,
    lines: options.lines,
  });

  adapter.search(options.searchQuery);

  if (options.selection) {
    adapter.select(options.selection);
  }

  return adapter;
}

function cloneTerminalShellTab(
  index: number,
  source: TerminalShellTabState,
): TerminalShellTabState {
  const snapshot = source.adapter.getSnapshot();

  return {
    id: createTabId(index),
    baseTitle: source.title,
    title: source.title,
    profile: source.profile,
    runtimeBootstrap: cloneTerminalShellRuntimeBootstrap(source.runtimeBootstrap),
    targetLabel: source.targetLabel,
    commandText: source.commandText,
    commandCursor: source.commandCursor,
    commandHistory: [...source.commandHistory],
    historyIndex: source.historyIndex,
    searchQuery: source.searchQuery,
    copiedText: source.copiedText,
    workingDirectory: source.workingDirectory,
    invokedProgram: source.invokedProgram,
    lastExitCode: source.lastExitCode,
    runtimeSessionId: null,
    runtimeAttachmentId: null,
    runtimeCursor: null,
    runtimeState: "idle",
    runtimeBootstrapAttempts: 0,
    runtimeBootstrapLastError: null,
    runtimePendingInput: "",
    runtimePendingInputQueue: [],
    runtimeStreamStarted: source.runtimeStreamStarted,
    runtimeTerminalContent: source.runtimeTerminalContent,
    runtimeContentTruncated: source.runtimeContentTruncated,
    adapter: createTerminalViewAdapterFromLines({
      lines: snapshot.lines,
      viewport: snapshot.viewport,
      scrollbackLimit: snapshot.scrollbackLimit,
      searchQuery: source.searchQuery,
      selection: snapshot.selection,
    }),
  };
}

function withTab(
  state: TerminalShellState,
  tabId: string,
  update: (tab: TerminalShellTabState) => TerminalShellTabState,
) {
  const tabIndex = getTabIndexOrThrow(state, tabId);
  const currentTab = state.tabs[tabIndex]!;
  const nextTab = update(currentTab);
  if (nextTab === currentTab) {
    return state;
  }

  const tabs = state.tabs.slice();
  tabs[tabIndex] = nextTab;
  return {
    ...state,
    tabs,
  };
}

function getTabIndexOrThrow(state: TerminalShellState, tabId: string) {
  const tabIndex = state.tabs.findIndex((entry) => entry.id === tabId);
  if (tabIndex < 0) {
    throw new Error(`Unknown terminal shell tab ${tabId}`);
  }

  return tabIndex;
}

function getTabOrThrow(state: TerminalShellState, tabId: string) {
  return state.tabs[getTabIndexOrThrow(state, tabId)]!;
}

function getCommandOutput(
  command: string,
  state: TerminalShellState,
  tab: TerminalShellTabState,
) {
  const normalized = command.trim().toLowerCase();

  if (normalized === "help") {
    return "help -> status, pwd, whoami, clear";
  }

  if (normalized === "status") {
    return `${tab.targetLabel} | ${state.mode} mode | viewport stable`;
  }

  if (normalized === "pwd") {
    return state.mode === "desktop"
      ? (typeof getNodeProcess()?.cwd === "function" ? getNodeProcess()!.cwd!() : resolveHomeDirectory())
      : resolveHomeDirectory();
  }

  if (normalized === "whoami") {
    return state.mode === "desktop" ? "sdkwork-terminal\\operator" : "sdkwork-terminal";
  }

  if (normalized === "clear") {
    return "clear is reserved for the PTY phase; transcript retained in this prototype";
  }

  return `executed ${command.trim() || "blank-command"}`;
}

function createSnapshot(
  state: TerminalShellState,
  tab: TerminalShellTabState,
): TerminalShellTabSnapshot {
  const active = tab.id === state.activeTabId;
  const closable = state.tabs.length > 1;
  const cacheKey = `${active ? "1" : "0"}:${closable ? "1" : "0"}`;
  const cachedSnapshots = terminalShellTabSnapshotCache.get(tab);
  const cachedSnapshot = cachedSnapshots?.get(cacheKey);
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  const nextSnapshot: TerminalShellTabSnapshot = {
    id: tab.id,
    title: tab.title,
    profile: tab.profile,
    runtimeBootstrap: cloneTerminalShellRuntimeBootstrap(tab.runtimeBootstrap),
    targetLabel: tab.targetLabel,
    commandText: tab.commandText,
    commandCursor: tab.commandCursor,
    searchQuery: tab.searchQuery,
    copiedText: tab.copiedText,
    workingDirectory: tab.workingDirectory,
    invokedProgram: tab.invokedProgram,
    lastExitCode: tab.lastExitCode,
    runtimeSessionId: tab.runtimeSessionId,
    runtimeAttachmentId: tab.runtimeAttachmentId,
    runtimeCursor: tab.runtimeCursor,
    runtimeState: tab.runtimeState,
    runtimeBootstrapAttempts: tab.runtimeBootstrapAttempts,
    runtimeBootstrapLastError: tab.runtimeBootstrapLastError,
    runtimePendingInput: tab.runtimePendingInput,
    runtimePendingInputQueue: tab.runtimePendingInputQueue.map((entry) =>
      entry.kind === "text"
        ? {
            kind: "text" as const,
            data: entry.data,
          }
        : {
            kind: "binary" as const,
            inputBytes: [...entry.inputBytes],
          }
    ),
    runtimeStreamStarted: tab.runtimeStreamStarted,
    runtimeTerminalContent: tab.runtimeTerminalContent,
    runtimeContentTruncated: tab.runtimeContentTruncated,
    active,
    closable,
    snapshot: tab.adapter.getSnapshot(),
  };

  const tabCache = cachedSnapshots ?? new Map<string, TerminalShellTabSnapshot>();
  tabCache.set(cacheKey, nextSnapshot);
  if (!cachedSnapshots) {
    terminalShellTabSnapshotCache.set(tab, tabCache);
  }

  return nextSnapshot;
}

export function createTerminalShellState(options: {
  mode?: TerminalShellMode;
  initialTabOptions?: OpenTerminalShellTabOptions;
} = {}): TerminalShellState {
  const mode = options.mode ?? "desktop";
  const firstTab = createTerminalShellTab(mode, 1, options.initialTabOptions);

  return {
    mode,
    activeTabId: firstTab.id,
    nextTabIndex: 2,
    tabs: [firstTab],
  };
}

export function getTerminalShellLayoutContract(): TerminalShellLayoutContract {
  return {
    kind: "windows-terminal",
    primarySurface: "terminal-tab-stage",
    tabRoles: ["tablist", "tab", "tabpanel"],
    headerChrome: ["tablist", "new-tab-button", "profile-menu"],
    secondaryPanels: [],
  };
}

export function getTerminalShellSnapshot(
  state: TerminalShellState,
): TerminalShellSnapshot {
  const cachedSnapshot = terminalShellSnapshotCache.get(state);
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  const tabs = state.tabs.map((tab) => createSnapshot(state, tab));
  const activeTab = tabs.find((tab) => tab.active) ?? tabs[0];

  if (!activeTab) {
    throw new Error("Terminal shell snapshot requires at least one tab");
  }

  const nextSnapshot = {
    mode: state.mode,
    tabs,
    activeTab,
  };

  terminalShellSnapshotCache.set(state, nextSnapshot);
  return nextSnapshot;
}

export function openTerminalShellTab(
  state: TerminalShellState,
  options: OpenTerminalShellTabOptions = {},
): TerminalShellState {
  const nextTab = createTerminalShellTab(state.mode, state.nextTabIndex, options);

  return {
    ...state,
    activeTabId: nextTab.id,
    nextTabIndex: state.nextTabIndex + 1,
    tabs: [...state.tabs, nextTab],
  };
}

export function activateTerminalShellTab(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  getTabOrThrow(state, tabId);
  return {
    ...state,
    activeTabId: tabId,
  };
}

export function closeTerminalShellTab(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  if (state.tabs.length === 1) {
    return state;
  }

  const closeIndex = state.tabs.findIndex((tab) => tab.id === tabId);
  if (closeIndex < 0) {
    return state;
  }

  const tabs = state.tabs.filter((tab) => tab.id !== tabId);
  const fallbackTab =
    tabs[Math.max(0, closeIndex - 1)] ?? tabs[0];

  return {
    ...state,
    activeTabId: state.activeTabId === tabId ? fallbackTab.id : state.activeTabId,
    nextTabIndex: resolveNextTabIndex(tabs),
    tabs,
  };
}

export function duplicateTerminalShellTab(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  const source = getTabOrThrow(state, tabId);
  const nextTab = cloneTerminalShellTab(state.nextTabIndex, source);

  return {
    ...state,
    activeTabId: nextTab.id,
    nextTabIndex: state.nextTabIndex + 1,
    tabs: [...state.tabs, nextTab],
  };
}

export function closeTerminalShellTabsExcept(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  const keepTab = getTabOrThrow(state, tabId);

  return {
    ...state,
    activeTabId: keepTab.id,
    nextTabIndex: resolveNextTabIndex([keepTab]),
    tabs: [keepTab],
  };
}

export function closeTerminalShellTabsToRight(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId);
  if (tabIndex < 0) {
    return state;
  }

  const tabs = state.tabs.slice(0, tabIndex + 1);
  const activeTabId = tabs.some((tab) => tab.id === state.activeTabId)
    ? state.activeTabId
    : tabId;

  return {
    ...state,
    activeTabId,
    nextTabIndex: resolveNextTabIndex(tabs),
    tabs,
  };
}

export function setTerminalShellCommandText(
  state: TerminalShellState,
  tabId: string,
  commandText: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => ({
    ...tab,
    commandText,
    commandCursor: commandText.length,
  }));
}

export function setTerminalShellTabTitle(
  state: TerminalShellState,
  tabId: string,
  title: string,
): TerminalShellState {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  if (normalizedTitle.length === 0) {
    return state;
  }

  return withTab(state, tabId, (tab) => {
    if (tab.title === normalizedTitle) {
      return tab;
    }

    return {
      ...tab,
      title: normalizedTitle,
    };
  });
}

export function appendTerminalShellCommandText(
  state: TerminalShellState,
  tabId: string,
  chunk: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    const before = tab.commandText.slice(0, tab.commandCursor);
    const after = tab.commandText.slice(tab.commandCursor);
    const nextText = `${before}${chunk}${after}`;
    return {
      ...tab,
      commandText: nextText,
      commandCursor: tab.commandCursor + chunk.length,
    };
  });
}

export function backspaceTerminalShellCommandText(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    if (tab.commandCursor <= 0) {
      return tab;
    }
    const before = tab.commandText.slice(0, tab.commandCursor - 1);
    const after = tab.commandText.slice(tab.commandCursor);
    return {
      ...tab,
      commandText: `${before}${after}`,
      commandCursor: tab.commandCursor - 1,
    };
  });
}

export function moveTerminalShellCommandCursor(
  state: TerminalShellState,
  tabId: string,
  direction: "left" | "right" | "home" | "end",
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    let nextCursor = tab.commandCursor;
    if (direction === "left") {
      nextCursor = Math.max(0, tab.commandCursor - 1);
    } else if (direction === "right") {
      nextCursor = Math.min(tab.commandText.length, tab.commandCursor + 1);
    } else if (direction === "home") {
      nextCursor = 0;
    } else if (direction === "end") {
      nextCursor = tab.commandText.length;
    }
    return { ...tab, commandCursor: nextCursor };
  });
}

export function deleteTerminalShellCommandForward(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    if (tab.commandCursor >= tab.commandText.length) {
      return tab;
    }
    const before = tab.commandText.slice(0, tab.commandCursor);
    const after = tab.commandText.slice(tab.commandCursor + 1);
    return {
      ...tab,
      commandText: `${before}${after}`,
    };
  });
}

export function setTerminalShellSearchQuery(
  state: TerminalShellState,
  tabId: string,
  searchQuery: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => ({
    ...tab,
    searchQuery,
    copiedText: tab.copiedText,
    adapter: (() => {
      tab.adapter.search(searchQuery);
      return tab.adapter;
    })(),
  }));
}

export function runTerminalShellCommand(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  const tab = getTabOrThrow(state, tabId);
  const commandText = tab.commandText.trim() || "help";
  const nextState = submitTerminalShellCommand(state, tabId);

  return applyTerminalShellExecutionResult(nextState, tabId, {
    profile: tab.profile,
    commandText,
    workingDirectory: tab.workingDirectory,
    invokedProgram: tab.invokedProgram,
    exitCode: 0,
    stdout: getCommandOutput(commandText, state, tab),
    stderr: "",
  });
}

export function measureTerminalTabStripContentWidth(
  measurements: Array<{
    offsetLeft: number;
    width: number;
  }>,
): number {
  if (measurements.length === 0) {
    return 0;
  }

  const firstTab = measurements[0];
  const lastTab = measurements[measurements.length - 1];
  return Math.max(0, lastTab.offsetLeft + lastTab.width - firstTab.offsetLeft);
}

export function resolveTerminalTabActionInlineWidth(args: {
  leadingWidth: number;
  actionWidth: number;
  docked: boolean;
}): number {
  if (args.leadingWidth <= 0) {
    return 0;
  }

  if (!args.docked || args.actionWidth <= 0) {
    return args.leadingWidth;
  }

  return args.leadingWidth + args.actionWidth;
}

export function shouldDockTerminalTabActions(args: {
  mode: TerminalShellMode;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  leadingWidth?: number;
  tabListWidth?: number;
  actionWidth?: number;
  reserveWidth?: number;
}): boolean {
  if (args.mode !== "desktop") {
    return false;
  }

  if (args.canScrollLeft || args.canScrollRight) {
    return true;
  }

  if (
    typeof args.leadingWidth !== "number" ||
    typeof args.tabListWidth !== "number" ||
    typeof args.actionWidth !== "number"
  ) {
    return false;
  }

  if (args.leadingWidth <= 0 || args.tabListWidth <= 0 || args.actionWidth <= 0) {
    return false;
  }

  const reserveWidth = args.reserveWidth ?? 40;
  return args.tabListWidth + args.actionWidth + reserveWidth > args.leadingWidth;
}

export function submitTerminalShellCommand(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    const commandText = tab.commandText.trim();
    const commandHistory = commandText
      ? [...tab.commandHistory, commandText]
      : tab.commandHistory;
    tab.adapter.writeInput(commandText);
    tab.adapter.search(tab.searchQuery);

    return {
      ...tab,
      title: tab.baseTitle,
      commandText: "",
      commandCursor: 0,
      commandHistory,
      historyIndex: commandHistory.length,
      lastExitCode: null,
    };
  });
}

export function recallPreviousTerminalShellCommand(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    if (tab.commandHistory.length === 0 || tab.historyIndex <= 0) {
      return tab;
    }

    const historyIndex = tab.historyIndex - 1;
    const recalledText = tab.commandHistory[historyIndex] ?? tab.commandText;
    return {
      ...tab,
      commandText: recalledText,
      commandCursor: recalledText.length,
      historyIndex,
    };
  });
}

export function recallNextTerminalShellCommand(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    if (tab.commandHistory.length === 0) {
      return tab;
    }

    if (tab.historyIndex < tab.commandHistory.length - 1) {
      const historyIndex = tab.historyIndex + 1;
      const recalledText = tab.commandHistory[historyIndex] ?? tab.commandText;
      return {
        ...tab,
        commandText: recalledText,
        commandCursor: recalledText.length,
        historyIndex,
      };
    }

    if (tab.historyIndex === tab.commandHistory.length - 1) {
      return {
        ...tab,
        commandText: "",
        commandCursor: 0,
        historyIndex: tab.commandHistory.length,
      };
    }

    return tab;
  });
}

export function applyTerminalShellExecutionResult(
  state: TerminalShellState,
  tabId: string,
  result: TerminalShellExecutionResult,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    const stdout = result.stdout.trim();
    const stderr = result.stderr.trim();
    const wroteStdout = stdout.length > 0;
    const wroteStderr = stderr.length > 0;

    if (wroteStdout) {
      tab.adapter.writeOutput(result.stdout);
    }

    if (wroteStderr) {
      tab.adapter.writeOutput(result.stderr);
    }

    if ((!wroteStdout && !wroteStderr) || result.exitCode !== 0) {
      tab.adapter.writeOutput(
        result.exitCode === 0
          ? "process exited without output"
          : `process exited with code ${result.exitCode}`,
      );
    }

    tab.adapter.search(tab.searchQuery);

    return {
      ...tab,
      workingDirectory: result.workingDirectory,
      invokedProgram: result.invokedProgram,
      lastExitCode: result.exitCode,
      runtimeState: tab.runtimeState === "idle" ? "idle" : tab.runtimeState,
    };
  });
}

export function applyTerminalShellExecutionFailure(
  state: TerminalShellState,
  tabId: string,
  message: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    tab.adapter.writeOutput(`local shell execution failed: ${message}`);
    tab.adapter.search(tab.searchQuery);

    return {
      ...tab,
      lastExitCode: -1,
      runtimeState: "failed",
      runtimeBootstrapLastError: message,
    };
  });
}

export function bindTerminalShellSessionRuntime(
  state: TerminalShellState,
  tabId: string,
  options: BindTerminalShellSessionRuntimeOptions,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    const snapshot = tab.adapter.getSnapshot();

    return {
      ...tab,
      runtimeSessionId: options.sessionId,
      runtimeAttachmentId: options.attachmentId ?? null,
      runtimeCursor: options.cursor ?? null,
      runtimeState: "running",
      runtimeBootstrapAttempts: 0,
      runtimeBootstrapLastError: null,
      runtimeStreamStarted: false,
      workingDirectory: options.workingDirectory ?? tab.workingDirectory,
      invokedProgram: options.invokedProgram ?? tab.invokedProgram,
      targetLabel: options.targetLabel ?? tab.targetLabel,
      adapter: createTerminalViewAdapterFromLines({
        lines: [],
        viewport: snapshot.viewport,
        scrollbackLimit: snapshot.scrollbackLimit,
        searchQuery: tab.searchQuery,
        selection: null,
      }),
    };
  });
}

export function restartTerminalShellTabRuntime(
  state: TerminalShellState,
  tabId: string,
  options: {
    preservePendingInput?: boolean;
  } = {},
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    const snapshot = tab.adapter.getSnapshot();

    return {
      ...tab,
      commandText: "",
      commandCursor: 0,
      searchQuery: "",
      copiedText: "",
      lastExitCode: null,
      runtimeSessionId: null,
      runtimeAttachmentId: null,
      runtimeCursor: null,
      runtimeState: "idle",
      runtimeBootstrapAttempts: 0,
      runtimeBootstrapLastError: null,
      runtimePendingInput: options.preservePendingInput ? tab.runtimePendingInput : "",
      runtimePendingInputQueue: options.preservePendingInput
        ? tab.runtimePendingInputQueue.map((entry) =>
            entry.kind === "text"
              ? {
                  kind: "text" as const,
                  data: entry.data,
                }
              : {
                  kind: "binary" as const,
                  inputBytes: [...entry.inputBytes],
              }
          )
        : [],
      runtimeStreamStarted: false,
      runtimeTerminalContent: "",
      runtimeContentTruncated: false,
      adapter: createTerminalViewAdapterFromLines({
        lines: [],
        viewport: snapshot.viewport,
        scrollbackLimit: snapshot.scrollbackLimit,
        searchQuery: "",
        selection: null,
      }),
    };
  });
}

export function appendTerminalShellPendingRuntimeInput(
  state: TerminalShellState,
  tabId: string,
  input: string | TerminalShellPendingRuntimeInput,
): TerminalShellState {
  const nextInput =
    typeof input === "string"
      ? ({
          kind: "text",
          data: input,
        } satisfies TerminalShellPendingRuntimeInput)
      : input;

  if (
    (nextInput.kind === "text" && nextInput.data.length === 0) ||
    (nextInput.kind === "binary" && nextInput.inputBytes.length === 0)
  ) {
    return state;
  }

  return withTab(state, tabId, (tab) => {
    const runtimePendingInputQueue = [...tab.runtimePendingInputQueue];
    const lastEntry = runtimePendingInputQueue.at(-1);

    if (nextInput.kind === "text") {
      if (lastEntry?.kind === "text") {
        runtimePendingInputQueue[runtimePendingInputQueue.length - 1] = {
          kind: "text",
          data: `${lastEntry.data}${nextInput.data}`,
        };
      } else {
        runtimePendingInputQueue.push({
          kind: "text",
          data: nextInput.data,
        });
      }

      return {
        ...tab,
        runtimePendingInput: `${tab.runtimePendingInput}${nextInput.data}`,
        runtimePendingInputQueue,
      };
    }

    if (lastEntry?.kind === "binary") {
      runtimePendingInputQueue[runtimePendingInputQueue.length - 1] = {
        kind: "binary",
        inputBytes: [...lastEntry.inputBytes, ...nextInput.inputBytes],
      };
    } else {
      runtimePendingInputQueue.push({
        kind: "binary",
        inputBytes: [...nextInput.inputBytes],
      });
    }

    return {
      ...tab,
      runtimePendingInputQueue,
    };
  });
}

export function queueTerminalShellTabBootstrapCommand(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  const tab = getTabOrThrow(state, tabId);
  if (tab.commandText.length === 0) {
    return state;
  }

  const nextState = appendTerminalShellPendingRuntimeInput(state, tabId, {
    kind: "text",
    data: `${tab.commandText}\r`,
  });

  return withTab(nextState, tabId, (currentTab) => ({
    ...currentTab,
    commandText: "",
    commandCursor: 0,
  }));
}

export function consumeTerminalShellPendingRuntimeInput(
  state: TerminalShellState,
  tabId: string,
  input: string | TerminalShellPendingRuntimeInput,
): TerminalShellState {
  const consumedInput =
    typeof input === "string"
      ? ({
          kind: "text",
          data: input,
        } satisfies TerminalShellPendingRuntimeInput)
      : input;

  if (
    (consumedInput.kind === "text" && consumedInput.data.length === 0) ||
    (consumedInput.kind === "binary" && consumedInput.inputBytes.length === 0)
  ) {
    return state;
  }

  return withTab(state, tabId, (tab) => {
    if (
      tab.runtimePendingInput.length === 0 &&
      tab.runtimePendingInputQueue.length === 0
    ) {
      return tab;
    }

    const [head, ...tail] = tab.runtimePendingInputQueue;
    if (!head) {
      return {
        ...tab,
        runtimePendingInput:
          consumedInput.kind === "text" && tab.runtimePendingInput.startsWith(consumedInput.data)
            ? tab.runtimePendingInput.slice(consumedInput.data.length)
            : tab.runtimePendingInput,
      };
    }

    if (consumedInput.kind === "text" && head.kind === "text") {
      if (!head.data.startsWith(consumedInput.data)) {
        return tab;
      }

      const remaining = head.data.slice(consumedInput.data.length);
      return {
        ...tab,
        runtimePendingInput: tab.runtimePendingInput.startsWith(consumedInput.data)
          ? tab.runtimePendingInput.slice(consumedInput.data.length)
          : tab.runtimePendingInput.replace(consumedInput.data, ""),
        runtimePendingInputQueue:
          remaining.length > 0
            ? [
                {
                  kind: "text",
                  data: remaining,
                },
                ...tail,
              ]
            : tail,
      };
    }

    if (consumedInput.kind === "binary" && head.kind === "binary") {
      const headPrefix = head.inputBytes.slice(0, consumedInput.inputBytes.length);
      const matchesPrefix =
        headPrefix.length === consumedInput.inputBytes.length &&
        headPrefix.every((value, index) => value === consumedInput.inputBytes[index]);

      if (!matchesPrefix) {
        return tab;
      }

      const remaining = head.inputBytes.slice(consumedInput.inputBytes.length);
      return {
        ...tab,
        runtimePendingInputQueue:
          remaining.length > 0
            ? [
                {
                  kind: "binary",
                  inputBytes: remaining,
                },
                ...tail,
              ]
            : tail,
      };
    }

    return tab;
  });
}

export function markTerminalShellSessionRuntimeBinding(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => ({
    ...tab,
    runtimeState: "binding",
    runtimeBootstrapAttempts: tab.runtimeBootstrapAttempts + 1,
  }));
}

export function queueTerminalShellTabRuntimeBootstrapRetry(
  state: TerminalShellState,
  tabId: string,
  message: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    const snapshot = tab.adapter.getSnapshot();

    return {
      ...tab,
      copiedText: "",
      lastExitCode: null,
      runtimeSessionId: null,
      runtimeAttachmentId: null,
      runtimeCursor: null,
      runtimeState: "retrying",
      runtimeBootstrapLastError: message,
      runtimeStreamStarted: false,
      runtimeTerminalContent: "",
      runtimeContentTruncated: false,
      adapter: createTerminalViewAdapterFromLines({
        lines: [],
        viewport: snapshot.viewport,
        scrollbackLimit: snapshot.scrollbackLimit,
        searchQuery: tab.searchQuery,
        selection: null,
      }),
    };
  });
}

export function resumeTerminalShellTabRuntimeBootstrap(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    if (tab.runtimeState !== "retrying") {
      return tab;
    }

    return {
      ...tab,
      runtimeState: "idle",
    };
  });
}

export function shouldAutoRetryTerminalShellBootstrap(args: {
  attempt: number;
  maxAutoRetries: number;
}) {
  return args.attempt > 0 && args.attempt <= args.maxAutoRetries;
}

function clampRuntimeTerminalContent(content: string): {
  content: string;
  truncated: boolean;
} {
  if (content.length <= MAX_RUNTIME_TERMINAL_CONTENT_BYTES) {
    return { content, truncated: false };
  }

  const keepBytes = Math.floor(MAX_RUNTIME_TERMINAL_CONTENT_BYTES * 0.75);
  return {
    // Keep the retained payload VT-clean so tab restore does not inject
    // synthetic text into the real terminal byte stream.
    content: content.slice(content.length - keepBytes),
    truncated: true,
  };
}

function parseExitCode(payload: string): number | null {
  try {
    const value = JSON.parse(payload) as { exitCode?: number | null };
    return typeof value.exitCode === "number" ? value.exitCode : null;
  } catch {
    return null;
  }
}

function parseReplayCursor(cursor: string | null): number | null {
  if (!cursor) {
    return null;
  }

  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyTerminalShellReplayToTab(
  mode: TerminalShellMode,
  tab: TerminalShellTabState,
  replay: ApplyTerminalShellReplayOptions,
): TerminalShellTabState {
  const currentCursor = parseReplayCursor(tab.runtimeCursor);
  const nextCursorValue = parseReplayCursor(replay.nextCursor);
  let hasReplayAdvance = false;

  for (const entry of replay.entries) {
    if (currentCursor !== null && entry.sequence <= currentCursor) {
      continue;
    }

    hasReplayAdvance = true;
    break;
  }

  if (
    !hasReplayAdvance &&
    (nextCursorValue === null ||
      currentCursor === null ||
      nextCursorValue <= currentCursor)
  ) {
    return tab;
  }

  let lastExitCode = tab.lastExitCode;
  let runtimeState = tab.runtimeState;
  let runtimeStreamStarted = tab.runtimeStreamStarted;
  let runtimeTerminalContent = tab.runtimeTerminalContent;
  const runtimeOutputChunks: string[] = [];
  const usesRuntimeTerminalStream = shouldUseTerminalShellRuntimeStream({
    mode,
    runtimeBootstrap: tab.runtimeBootstrap,
    runtimeSessionId: tab.runtimeSessionId,
  });

  for (const entry of replay.entries) {
    if (currentCursor !== null && entry.sequence <= currentCursor) {
      continue;
    }

    runtimeStreamStarted = true;
    if (entry.kind === "output" || entry.kind === "marker" || entry.kind === "warning") {
      if (!usesRuntimeTerminalStream) {
        tab.adapter.writeOutput(entry.payload);
      }
      runtimeOutputChunks.push(entry.payload);
      if (entry.kind === "warning") {
        runtimeState = "failed";
      }
      continue;
    }

    if (entry.kind === "exit") {
      lastExitCode = parseExitCode(entry.payload);
      runtimeState = "exited";
      if (!usesRuntimeTerminalStream) {
        tab.adapter.writeOutput(
          lastExitCode === null
            ? "shell session exited"
            : `shell session exited with code ${lastExitCode}`,
        );
      }
      runtimeOutputChunks.push(
        lastExitCode === null
          ? "\r\n[shell session exited]\r\n"
          : `\r\n[shell session exited with code ${lastExitCode}]\r\n`,
      );
    }
  }

  if (runtimeOutputChunks.length > 0) {
    runtimeTerminalContent += runtimeOutputChunks.join("");
  }

  const clamped = clampRuntimeTerminalContent(runtimeTerminalContent);

  if (!usesRuntimeTerminalStream) {
    tab.adapter.search(tab.searchQuery);
  }

  return {
    ...tab,
    runtimeCursor:
      nextCursorValue === null ||
      (currentCursor !== null && nextCursorValue < currentCursor)
        ? tab.runtimeCursor
        : replay.nextCursor,
    runtimeState,
    runtimeStreamStarted,
    runtimeTerminalContent: clamped.content,
    runtimeContentTruncated: tab.runtimeContentTruncated || clamped.truncated,
    lastExitCode,
  };
}

export function applyTerminalShellReplayEntries(
  state: TerminalShellState,
  tabId: string,
  replay: ApplyTerminalShellReplayOptions,
): TerminalShellState {
  return withTab(state, tabId, (tab) =>
    applyTerminalShellReplayToTab(state.mode, tab, replay),
  );
}

export function applyTerminalShellReplayBatches(
  state: TerminalShellState,
  batches: ApplyTerminalShellReplayBatchOptions[],
): TerminalShellState {
  if (batches.length === 0) {
    return state;
  }

  let tabs: TerminalShellTabState[] | null = null;
  const tabIndexes = new Map<string, number>();

  for (const batch of batches) {
    const tabIndex = (() => {
      const cached = tabIndexes.get(batch.tabId);
      if (typeof cached === "number") {
        return cached;
      }

      const nextIndex = getTabIndexOrThrow(state, batch.tabId);
      tabIndexes.set(batch.tabId, nextIndex);
      return nextIndex;
    })();
    const currentTab = (tabs ?? state.tabs)[tabIndex]!;
    const nextTab = applyTerminalShellReplayToTab(state.mode, currentTab, batch);

    if (nextTab === currentTab) {
      continue;
    }

    if (!tabs) {
      tabs = state.tabs.slice();
    }
    tabs[tabIndex] = nextTab;
  }

  if (!tabs) {
    return state;
  }

  return {
    ...state,
    tabs,
  };
}

export function clearTerminalShellRuntimeContent(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => ({
    ...tab,
    runtimeTerminalContent: "",
    runtimeContentTruncated: false,
  }));
}

export function resizeTerminalShellTab(
  state: TerminalShellState,
  tabId: string,
  viewport: TerminalViewport,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    const currentViewport = tab.adapter.getSnapshot().viewport;
    if (
      currentViewport.cols === viewport.cols &&
      currentViewport.rows === viewport.rows
    ) {
      return tab;
    }

    tab.adapter.resize(viewport);
    return {
      ...tab,
    };
  });
}

export function selectTerminalShellMatch(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => {
    const match = tab.adapter.getSnapshot().matches[0];
    if (!match) {
      return tab;
    }

    const selection: TerminalSelectionRange = {
      startLine: match.lineIndex,
      startColumn: match.startColumn,
      endLine: match.lineIndex,
      endColumn: match.endColumn,
    };
    const snapshot = tab.adapter.select(selection);

    return {
      ...tab,
      copiedText: snapshot.selectedText,
    };
  });
}

export function copyTerminalShellSelection(
  state: TerminalShellState,
  tabId: string,
): TerminalShellState {
  return withTab(state, tabId, (tab) => ({
    ...tab,
    copiedText: tab.adapter.copySelection(),
  }));
}

export function resolveTerminalShellTabRuntimeBootstrapRequest(
  state: TerminalShellState,
  tabId: string,
  viewport: TerminalViewport,
): TerminalShellRuntimeBootstrapRequest {
  return resolveTerminalShellRuntimeBootstrapRequestFromTab(
    getTabOrThrow(state, tabId),
    viewport,
  );
}

export function resolveTerminalShellRuntimeBootstrapRequestFromTab(
  tab: Pick<
    TerminalShellTabState | TerminalShellTabSnapshot,
    "profile" | "workingDirectory" | "runtimeBootstrap"
  >,
  viewport: TerminalViewport,
): TerminalShellRuntimeBootstrapRequest {

  if (tab.runtimeBootstrap.kind === "connector") {
    return {
      kind: "connector",
      request: {
        ...cloneConnectorSessionLaunchRequest(tab.runtimeBootstrap.request),
        cols: viewport.cols,
        rows: viewport.rows,
      },
    };
  }

  if (tab.runtimeBootstrap.kind === "remote-runtime") {
    return {
      kind: "remote-runtime",
      request: {
        ...cloneRemoteRuntimeSessionCreateRequest(tab.runtimeBootstrap.request),
        cols: viewport.cols,
        rows: viewport.rows,
      },
    };
  }

  return {
    kind: "local-shell",
    request: {
      profile: tab.profile,
      workingDirectory: tab.workingDirectory,
      cols: viewport.cols,
      rows: viewport.rows,
    },
  };
}

export function canQueueTerminalShellRuntimeInput(
  tab: Pick<TerminalShellTabState, "runtimeSessionId" | "runtimeState">
    | Pick<TerminalShellTabSnapshot, "runtimeSessionId" | "runtimeState">,
) {
  if (tab.runtimeState === "exited" || tab.runtimeState === "failed") {
    return false;
  }

  if (tab.runtimeSessionId) {
    return tab.runtimeState === "running" || tab.runtimeState === "binding";
  }

  return (
    tab.runtimeState === "idle"
    || tab.runtimeState === "binding"
    || tab.runtimeState === "retrying"
  );
}
