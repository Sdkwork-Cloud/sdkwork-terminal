import { type TerminalViewportInput } from "@sdkwork/terminal-infrastructure";
import {
  applyTerminalShellReplayEntries,
  applyTerminalShellExecutionFailure,
  applyTerminalShellExecutionResult,
  applyTerminalShellPromptInput,
  appendTerminalShellPendingRuntimeInput,
  activateTerminalShellTab,
  bindTerminalShellSessionRuntime,
  canQueueTerminalShellRuntimeInput,
  consumeTerminalShellPendingRuntimeInput,
  closeTerminalShellTab,
  closeTerminalShellTabsExcept,
  closeTerminalShellTabsToRight,
  createTerminalShellState,
  duplicateTerminalShellTab,
  getTerminalShellSnapshot,
  markTerminalShellSessionRuntimeBinding,
  measureTerminalTabStripContentWidth,
  openTerminalShellTab,
  queueTerminalShellTabBootstrapCommand,
  queueTerminalShellTabRuntimeBootstrapRetry,
  resolveTerminalShellRuntimeClientKind,
  resolveTerminalShellRuntimeBootstrapRequestFromTab,
  resolveTerminalStageBehavior,
  resumeTerminalShellTabRuntimeBootstrap,
  restartTerminalShellTabRuntime,
  resolveTerminalTabActionInlineWidth,
  resizeTerminalShellTab,
  selectTerminalShellMatch,
  setTerminalShellTabTitle,
  setTerminalShellSearchQuery,
  shouldUseTerminalShellFallbackMode,
  shouldUseTerminalShellRuntimeStream,
  shouldAutoRetryTerminalShellBootstrap,
  shouldDockTerminalTabActions,
  type OpenTerminalShellTabOptions,
  type TerminalShellPendingRuntimeInput,
  type TerminalShellProfile,
  type TerminalShellSnapshot,
  type TerminalShellState,
} from "./model";
import {
  shouldBypassTerminalRuntimeInputQueue,
  shouldFlushTerminalRuntimeInputQueue,
} from "./runtime";
import {
  summarizeSessionCenterMenuSubtitle,
  type SessionCenterReplayDiagnostics,
} from "./session-center-status";
import { RuntimeTerminalStage } from "./runtime-terminal-stage.tsx";
import { FallbackTerminalStage } from "./fallback-terminal-stage.tsx";
import { createRuntimeTabControllerStore } from "./runtime-tab-controller-store.ts";
import type { RuntimeTabController } from "./runtime-tab-controller.ts";
import {
  readTerminalClipboardText,
  type TerminalClipboardProvider,
  writeTerminalClipboardText,
} from "./terminal-clipboard.ts";
import {
  isTerminalCloseTabShortcut,
  isTerminalNewTabShortcut,
  resolveTerminalTabSwitchShortcutDirection,
  shouldIgnoreTerminalAppShortcutTarget,
  type SharedRuntimeClient,
} from "./terminal-stage-shared.ts";
import type { TerminalViewport } from "@sdkwork/terminal-core";
import {
  memo,
  startTransition,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

export type { TerminalClipboardProvider } from "./terminal-clipboard.ts";
export type ShellAppMode = "desktop" | "web";
export type ShellLaunchProfile = "powershell" | "bash" | "shell";
export type ShellExecutionModeTag = "cli-native";
export type ShellConnectorSessionTarget = "ssh" | "docker-exec" | "kubernetes-exec";
export type ShellRemoteRuntimeTarget = "remote-runtime" | "server-runtime-node";
export type ShellRuntimeReplayEntryKind =
  | "output"
  | "marker"
  | "state"
  | "warning"
  | "exit";
export type ShellRuntimeStreamEntryKind = Extract<
  ShellRuntimeReplayEntryKind,
  "output" | "warning" | "exit"
>;

export interface ShellConnectorSessionLaunchRequest {
  workspaceId: string;
  target: ShellConnectorSessionTarget;
  authority: string;
  command: string[];
  modeTags: ShellExecutionModeTag[];
  tags: string[];
}

export interface ShellRemoteRuntimeSessionCreateRequest {
  workspaceId: string;
  target: ShellRemoteRuntimeTarget;
  authority: string;
  command: string[];
  workingDirectory?: string;
  cols?: number;
  rows?: number;
  modeTags: ShellExecutionModeTag[];
  tags: string[];
}

export interface ShellRuntimeReplayEntry {
  sequence: number;
  kind: ShellRuntimeReplayEntryKind;
  payload: string;
  occurredAt: string;
}

export interface ShellRuntimeSessionReplayRequest {
  fromCursor?: string;
  limit?: number;
}

export interface ShellRuntimeSessionReplaySnapshot {
  sessionId: string;
  fromCursor: string | null;
  nextCursor: string;
  hasMore: boolean;
  entries: ShellRuntimeReplayEntry[];
}

export interface ShellRuntimeSessionInputRequest {
  sessionId: string;
  input: string;
}

export interface ShellRuntimeSessionInputBytesRequest {
  sessionId: string;
  inputBytes: number[];
}

export interface ShellRuntimeSessionInputSnapshot {
  sessionId: string;
  acceptedBytes: number;
}

export interface ShellRuntimeSessionResizeRequest {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface ShellRuntimeSessionResizeSnapshot {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface ShellRuntimeSessionTerminateSnapshot {
  sessionId: string;
  state: string;
}

export interface ShellRuntimeStreamEvent {
  sessionId: string;
  nextCursor: string;
  entry: ShellRuntimeReplayEntry & {
    kind: ShellRuntimeStreamEntryKind;
  };
}

export interface ShellRuntimeInteractiveSessionSnapshot {
  sessionId: string;
  attachmentId: string;
  cursor: string | null;
  workingDirectory: string;
  invokedProgram: string;
}

export interface ShellSessionAttachmentAcknowledgeRequest {
  attachmentId: string;
  sequence: number;
}

export interface ShellDesktopLocalShellExecutionRequest {
  profile: ShellLaunchProfile;
  commandText: string;
  workingDirectory?: string;
}

export interface ShellDesktopLocalShellExecutionResult {
  profile: string;
  commandText: string;
  workingDirectory: string;
  invokedProgram: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ShellDesktopLocalShellSessionCreateRequest {
  profile: ShellLaunchProfile;
  workingDirectory?: string;
  cols?: number;
  rows?: number;
}

export interface ShellDesktopLocalProcessSessionCreateRequest {
  command: string[];
  workingDirectory?: string;
  cols?: number;
  rows?: number;
}

export interface ShellAppDesktopRuntimeClient {
  detachSessionAttachment?: (request: {
    attachmentId: string;
  }) => Promise<unknown>;
  createConnectorInteractiveSession: (
    request: ShellConnectorSessionLaunchRequest & {
      cols?: number;
      rows?: number;
    },
  ) => Promise<ShellRuntimeInteractiveSessionSnapshot>;
  executeLocalShellCommand?: (
    request: ShellDesktopLocalShellExecutionRequest,
  ) => Promise<ShellDesktopLocalShellExecutionResult>;
  createLocalProcessSession: (
    request: ShellDesktopLocalProcessSessionCreateRequest,
  ) => Promise<ShellRuntimeInteractiveSessionSnapshot>;
  createLocalShellSession: (
    request: ShellDesktopLocalShellSessionCreateRequest,
  ) => Promise<ShellRuntimeInteractiveSessionSnapshot>;
  writeSessionInput: (
    request: ShellRuntimeSessionInputRequest,
  ) => Promise<ShellRuntimeSessionInputSnapshot>;
  writeSessionInputBytes: (
    request: ShellRuntimeSessionInputBytesRequest,
  ) => Promise<ShellRuntimeSessionInputSnapshot>;
  acknowledgeSessionAttachment?: (
    request: ShellSessionAttachmentAcknowledgeRequest,
  ) => Promise<unknown>;
  resizeSession: (
    request: ShellRuntimeSessionResizeRequest,
  ) => Promise<ShellRuntimeSessionResizeSnapshot>;
  terminateSession: (
    sessionId: string,
  ) => Promise<ShellRuntimeSessionTerminateSnapshot>;
  sessionReplay: (
    sessionId: string,
    request?: ShellRuntimeSessionReplayRequest,
  ) => Promise<ShellRuntimeSessionReplaySnapshot>;
  subscribeSessionEvents?: (
    sessionId: string,
    listener: (event: ShellRuntimeStreamEvent) => void,
  ) => Promise<() => void | Promise<void>>;
}

export interface ShellAppWebRuntimeClient {
  createRemoteRuntimeSession: (
    request: ShellRemoteRuntimeSessionCreateRequest,
  ) => Promise<ShellRuntimeInteractiveSessionSnapshot>;
  writeSessionInput: (
    request: ShellRuntimeSessionInputRequest,
  ) => Promise<ShellRuntimeSessionInputSnapshot>;
  writeSessionInputBytes: (
    request: ShellRuntimeSessionInputBytesRequest,
  ) => Promise<ShellRuntimeSessionInputSnapshot>;
  resizeSession: (
    request: ShellRuntimeSessionResizeRequest,
  ) => Promise<ShellRuntimeSessionResizeSnapshot>;
  terminateSession: (
    sessionId: string,
  ) => Promise<ShellRuntimeSessionTerminateSnapshot>;
  sessionReplay: (
    sessionId: string,
    request?: ShellRuntimeSessionReplayRequest,
  ) => Promise<ShellRuntimeSessionReplaySnapshot>;
  subscribeSessionEvents?: (
    sessionId: string,
    listener: (event: ShellRuntimeStreamEvent) => void,
  ) => Promise<() => void | Promise<void>>;
}

export interface ShellWorkingDirectoryPickerOptions {
  defaultPath?: string | null;
  title?: string;
}

type LaunchProfileGroup = "shell" | "wsl" | "cli";

interface LaunchProfileDefinition {
  id: string;
  group: LaunchProfileGroup;
  profile: TerminalShellProfile;
  label: string;
  subtitle: string;
  accent: string;
  openOptions?: OpenTerminalShellTabOptions;
  requiresWorkingDirectoryPicker?: boolean;
}

export interface DesktopWindowController {
  isAvailable: () => Promise<boolean>;
  isMaximized: () => Promise<boolean>;
  subscribeMaximized: (listener: (maximized: boolean) => void) => Promise<() => void>;
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
}

export interface DesktopSessionReattachIntent {
  requestId: string;
  sessionId: string;
  attachmentId: string;
  cursor: string;
  profile: ShellLaunchProfile;
  title: string;
  targetLabel: string;
}

export interface DesktopConnectorSessionIntent {
  requestId: string;
  profile: ShellLaunchProfile;
  title: string;
  targetLabel: string;
  request: ShellConnectorSessionLaunchRequest;
}

export interface DesktopConnectorLaunchEntry {
  targetId: string;
  label: string;
  subtitle: string;
  accent: string;
}

export interface DesktopConnectorCatalogStatus {
  state: "empty" | "ready" | "stale" | "error";
  message?: string | null;
}

export interface WebRuntimeTarget {
  workspaceId: string;
  authority: string;
  target: ShellRemoteRuntimeTarget;
  workingDirectory?: string;
  modeTags?: ShellExecutionModeTag[];
  tags?: string[];
}

export interface ShellAppProps {
  mode: ShellAppMode;
  clipboardProvider?: TerminalClipboardProvider;
  desktopRuntimeClient?: ShellAppDesktopRuntimeClient;
  webRuntimeClient?: ShellAppWebRuntimeClient;
  webRuntimeTarget?: WebRuntimeTarget;
  desktopWindowController?: DesktopWindowController;
  sessionCenterEnabled?: boolean;
  sessionCenterOpen?: boolean;
  onToggleSessionCenter?: () => void;
  sessionCenterReplayDiagnostics?: SessionCenterReplayDiagnostics;
  desktopSessionReattachIntent?: DesktopSessionReattachIntent | null;
  desktopConnectorSessionIntent?: DesktopConnectorSessionIntent | null;
  desktopConnectorEntries?: DesktopConnectorLaunchEntry[];
  desktopConnectorCatalogStatus?: DesktopConnectorCatalogStatus;
  onLaunchDesktopConnectorEntry?: (entryId: string) => void;
  onPickWorkingDirectory?: (
    options: ShellWorkingDirectoryPickerOptions,
  ) => Promise<string | null>;
  onBeforeProfileMenuOpen?: () => void;
}

interface TabContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

interface ProfileMenuPosition {
  top: number;
  left: number;
  maxHeight: number;
}

interface ProfileMenuStatusDescriptor {
  title: string;
  subtitle: string;
  accent: string;
}

interface HeaderLayoutMetrics {
  leadingWidth: number;
  tabListWidth: number;
  actionWidth: number;
}

const TERMINAL_HEADER_RESERVE_WIDTH = 40;
const TERMINAL_HEADER_ACTION_FALLBACK_WIDTH = 60;
const DESKTOP_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT = 1;
const DESKTOP_RUNTIME_BOOTSTRAP_RETRY_DELAY_MS = 220;
const PROFILE_MENU_WIDTH = 280;
const PROFILE_MENU_VIEWPORT_INSET = 8;
const PROFILE_MENU_VERTICAL_OFFSET = 6;
const PROFILE_MENU_ESTIMATED_HEIGHT = 360;
const WSL_DISCOVERY_CACHE_TTL_MS = 30_000;
const WSL_DISCOVERY_COMMAND = "wsl.exe --list --quiet";
const WSL_PROFILE_ACCENTS = ["#22c55e", "#14b8a6", "#38bdf8", "#f97316"] as const;
const HIDDEN_WSL_DISTRIBUTIONS = new Set(["docker-desktop", "docker-desktop-data"]);

function detectDefaultDesktopProfile(): TerminalShellProfile {
  if (typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent)) {
    return "powershell";
  }
  return "bash";
}

function createDesktopCliLaunchOptions(
  title: string,
  command: string[],
  targetLabel: string,
): OpenTerminalShellTabOptions {
  return {
    profile: "shell",
    title,
    targetLabel,
    runtimeBootstrap: {
      kind: "local-process",
      request: {
        command,
      },
    },
  };
}

function createDesktopWslLaunchOptions(
  distributionName: string,
): OpenTerminalShellTabOptions {
  return {
    profile: "bash",
    title: distributionName,
    targetLabel: `${distributionName} / wsl`,
    runtimeBootstrap: {
      kind: "local-process",
      request: {
        command: ["wsl.exe", "-d", distributionName],
      },
    },
  };
}

function isWindowsDesktopHost() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /windows/i.test(`${navigator.userAgent} ${navigator.platform ?? ""}`);
}

function parseWslDistributionNames(stdout: string) {
  const discovered = new Set<string>();
  const entries: string[] = [];

  for (const rawLine of stdout.split(/\r?\n/u)) {
    const normalized = rawLine
      .replace(/\u0000/g, "")
      .replace(/^\uFEFF/u, "")
      .trim();
    const normalizedKey = normalized.toLowerCase();

    if (
      !normalized ||
      HIDDEN_WSL_DISTRIBUTIONS.has(normalizedKey) ||
      discovered.has(normalized)
    ) {
      continue;
    }

    discovered.add(normalized);
    entries.push(normalized);
  }

  return entries;
}

function resolveWslAccent(distributionName: string) {
  let hash = 0;
  for (let index = 0; index < distributionName.length; index += 1) {
    hash = (hash * 33 + distributionName.charCodeAt(index)) >>> 0;
  }

  return WSL_PROFILE_ACCENTS[hash % WSL_PROFILE_ACCENTS.length];
}

function createDesktopWslLaunchProfile(
  distributionName: string,
): LaunchProfileDefinition {
  return {
    id: `wsl-${encodeURIComponent(distributionName)}`,
    group: "wsl",
    profile: "bash",
    label: distributionName,
    subtitle: "Windows Subsystem for Linux",
    accent: resolveWslAccent(distributionName),
    openOptions: createDesktopWslLaunchOptions(distributionName),
  };
}

const DESKTOP_LAUNCH_PROFILES: LaunchProfileDefinition[] = [
  {
    id: "powershell",
    group: "shell",
    profile: "powershell",
    label: "PowerShell",
    subtitle: "Windows native shell",
    accent: "#3b82f6",
  },
  {
    id: "bash",
    group: "shell",
    profile: "bash",
    label: "bash",
    subtitle: "POSIX login shell (requires bash in PATH)",
    accent: "#f97316",
  },
  {
    id: "shell",
    group: "shell",
    profile: "shell",
    label: "Shell",
    subtitle: "Fallback command shell",
    accent: "#22c55e",
  },
  {
    id: "codex",
    group: "cli",
    profile: "shell",
    label: "Codex CLI",
    subtitle: "Choose folder and open Codex in a local terminal tab",
    accent: "#2563eb",
    openOptions: createDesktopCliLaunchOptions("Codex", ["codex"], "codex / local cli"),
    requiresWorkingDirectoryPicker: true,
  },
  {
    id: "claude-code",
    group: "cli",
    profile: "shell",
    label: "Claude Code",
    subtitle: "Choose folder and open Claude Code in a local terminal tab",
    accent: "#ea580c",
    openOptions: createDesktopCliLaunchOptions(
      "Claude Code",
      ["claude"],
      "claude / local cli",
    ),
    requiresWorkingDirectoryPicker: true,
  },
  {
    id: "gemini-cli",
    group: "cli",
    profile: "shell",
    label: "Gemini CLI",
    subtitle: "Choose folder and open Gemini CLI in a local terminal tab",
    accent: "#1d4ed8",
    openOptions: createDesktopCliLaunchOptions(
      "Gemini CLI",
      ["gemini"],
      "gemini / local cli",
    ),
    requiresWorkingDirectoryPicker: true,
  },
  {
    id: "opencode-cli",
    group: "cli",
    profile: "shell",
    label: "OpenCode CLI",
    subtitle: "Choose folder and open OpenCode in a local terminal tab",
    accent: "#059669",
    openOptions: createDesktopCliLaunchOptions(
      "OpenCode",
      ["opencode"],
      "opencode / local cli",
    ),
    requiresWorkingDirectoryPicker: true,
  },
];

const WEB_LAUNCH_PROFILES: LaunchProfileDefinition[] = [
  {
    id: "bash",
    group: "shell",
    profile: "bash",
    label: "bash",
    subtitle: "POSIX login shell",
    accent: "#f97316",
  },
  {
    id: "shell",
    group: "shell",
    profile: "shell",
    label: "Shell",
    subtitle: "Generic remote shell",
    accent: "#22c55e",
  },
  {
    id: "codex",
    group: "cli",
    profile: "bash",
    label: "Codex CLI",
    subtitle: "Open Codex in a shell tab",
    accent: "#2563eb",
    openOptions: {
      profile: "bash",
      title: "Codex",
      commandText: "codex",
      targetLabel: "codex / shell cli",
    },
  },
  {
    id: "claude-code",
    group: "cli",
    profile: "bash",
    label: "Claude Code",
    subtitle: "Open Claude Code in a shell tab",
    accent: "#ea580c",
    openOptions: {
      profile: "bash",
      title: "Claude Code",
      commandText: "claude",
      targetLabel: "claude / shell cli",
    },
  },
  {
    id: "gemini-cli",
    group: "cli",
    profile: "bash",
    label: "Gemini CLI",
    subtitle: "Open Gemini CLI in a shell tab",
    accent: "#1d4ed8",
    openOptions: {
      profile: "bash",
      title: "Gemini CLI",
      commandText: "gemini",
      targetLabel: "gemini / shell cli",
    },
  },
  {
    id: "opencode-cli",
    group: "cli",
    profile: "bash",
    label: "OpenCode CLI",
    subtitle: "Open OpenCode in a shell tab",
    accent: "#059669",
    openOptions: {
      profile: "bash",
      title: "OpenCode",
      commandText: "opencode",
      targetLabel: "opencode / shell cli",
    },
  },
];

function createWebRuntimeBootstrapFromTarget(
  target: WebRuntimeTarget | undefined,
  profile: TerminalShellProfile,
): OpenTerminalShellTabOptions["runtimeBootstrap"] | undefined {
  if (!target) {
    return undefined;
  }

  const command =
    profile === "bash"
      ? ["/bin/bash", "-l"]
      : ["/bin/sh"];

  return {
    kind: "remote-runtime",
    request: {
      workspaceId: target.workspaceId,
      target: target.target,
      authority: target.authority,
      command,
      workingDirectory: target.workingDirectory,
      modeTags: target.modeTags ?? ["cli-native"],
      tags: [...(target.tags ?? [])],
    },
  };
}

export function ShellApp(props: ShellAppProps) {
  const [shellState, setShellState] = useState<TerminalShellState>(() =>
    createTerminalShellState({
      mode: props.mode,
      initialTabOptions:
        props.mode === "web"
          ? {
              profile: "bash",
              runtimeBootstrap: createWebRuntimeBootstrapFromTarget(
                props.webRuntimeTarget,
                "bash",
              ),
            }
          : undefined,
    }),
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileMenuPosition, setProfileMenuPosition] = useState<ProfileMenuPosition | null>(null);
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(null);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [headerLayoutMetrics, setHeaderLayoutMetrics] = useState<HeaderLayoutMetrics>({
    leadingWidth: 0,
    tabListWidth: 0,
    actionWidth: TERMINAL_HEADER_ACTION_FALLBACK_WIDTH,
  });
  const [profileMenuStatus, setProfileMenuStatus] = useState<ProfileMenuStatusDescriptor | null>(
    null,
  );
  const [desktopWslLaunchProfiles, setDesktopWslLaunchProfiles] = useState<
    LaunchProfileDefinition[]
  >([]);
  const [desktopWslDiscoveryStatus, setDesktopWslDiscoveryStatus] = useState<
    ProfileMenuStatusDescriptor | null
  >(null);
  const headerLeadingRef = useRef<HTMLDivElement | null>(null);
  const headerChromeRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const tabScrollRef = useRef<HTMLDivElement | null>(null);
  const bootstrappingRuntimeTabIdsRef = useRef<Set<string>>(new Set());
  const runtimeBootstrapRetryTimersRef = useRef<Map<string, number>>(new Map());
  const viewportCopyHandlersRef = useRef<
    Map<string, () => Promise<void>>
  >(new Map());
  const viewportPasteHandlersRef = useRef<
    Map<string, (text: string) => Promise<void>>
  >(new Map());
  const flushingRuntimeInputTabIdsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const desktopRuntimeClientRef = useRef(props.desktopRuntimeClient);
  const webRuntimeClientRef = useRef(props.webRuntimeClient);
  const handledDesktopSessionReattachIntentIdRef = useRef<string | null>(null);
  const handledDesktopConnectorSessionIntentIdRef = useRef<string | null>(null);
  const runtimeInputWriteChainsRef = useRef<Map<string, Promise<void>>>(new Map());
  const runtimeControllerStoreRef = useRef(createRuntimeTabControllerStore());
  const wslDiscoveryPromiseRef = useRef<Promise<void> | null>(null);
  const wslDiscoveryLastSuccessAtRef = useRef(0);
  const launchProfiles =
    props.mode === "desktop"
      ? [...DESKTOP_LAUNCH_PROFILES, ...desktopWslLaunchProfiles]
      : WEB_LAUNCH_PROFILES;
  const shellLaunchProfiles = launchProfiles.filter((entry) => entry.group === "shell");
  const wslLaunchProfiles = launchProfiles.filter((entry) => entry.group === "wsl");
  const cliLaunchProfiles = launchProfiles.filter((entry) => entry.group === "cli");
  const defaultSessionCenterSubtitle = "Reconnect detached shell sessions";
  const sessionCenterMenuSubtitle = summarizeSessionCenterMenuSubtitle(
    props.sessionCenterReplayDiagnostics,
    defaultSessionCenterSubtitle,
  );
  const snapshot = getTerminalShellSnapshot(shellState);
  const latestSnapshotRef = useRef<TerminalShellSnapshot | null>(snapshot);
  const activeTab = snapshot.activeTab;
  const isDesktopShell = props.mode === "desktop";
  const runtimeDerivedState = createRuntimeDerivedState(snapshot.tabs);
  const retryingTabsEffectKey = runtimeDerivedState.retryingTabsEffectKey;
  const runtimeBootstrapEffectKey = runtimeDerivedState.runtimeBootstrapEffectKey;
  const runtimePendingInputEffectKey = runtimeDerivedState.runtimePendingInputEffectKey;
  const snapshotTabById = runtimeDerivedState.snapshotTabById;
  const shouldDockTabActionsToTrailing = shouldDockTerminalTabActions({
    mode: props.mode,
    canScrollLeft,
    canScrollRight,
    leadingWidth: headerLayoutMetrics.leadingWidth,
    tabListWidth: headerLayoutMetrics.tabListWidth,
    actionWidth: headerLayoutMetrics.actionWidth,
    reserveWidth: TERMINAL_HEADER_RESERVE_WIDTH,
  });

  function isRuntimeCapableTab(
    tab: Pick<TerminalShellSnapshot["activeTab"], "runtimeBootstrap">,
  ) {
    const runtimeClientKind = resolveTerminalShellRuntimeClientKind({
      mode: props.mode,
      runtimeBootstrap: tab.runtimeBootstrap,
    });

    if (runtimeClientKind === "desktop") {
      return Boolean(props.desktopRuntimeClient);
    }

    if (runtimeClientKind === "web") {
      return Boolean(props.webRuntimeClient);
    }

    return false;
  }

  function resolveTabRuntimeClient(
    tab: Pick<TerminalShellSnapshot["activeTab"], "runtimeBootstrap">,
  ): SharedRuntimeClient | null {
    const runtimeClientKind = resolveTerminalShellRuntimeClientKind({
      mode: props.mode,
      runtimeBootstrap: tab.runtimeBootstrap,
    });

    if (runtimeClientKind === "desktop") {
      return props.desktopRuntimeClient ?? null;
    }

    if (runtimeClientKind === "web") {
      return props.webRuntimeClient ?? null;
    }

    return null;
  }

  function createWebRuntimeBootstrap(
    profile: TerminalShellProfile,
  ): OpenTerminalShellTabOptions["runtimeBootstrap"] | undefined {
    return createWebRuntimeBootstrapFromTarget(props.webRuntimeTarget, profile);
  }

  function resolveTabOpenOptions(
    options: OpenTerminalShellTabOptions,
  ): OpenTerminalShellTabOptions {
    if (props.mode !== "web") {
      return options;
    }

    const profile = options.profile ?? "bash";
    return {
      ...options,
      runtimeBootstrap: options.runtimeBootstrap ?? createWebRuntimeBootstrap(profile),
    };
  }

  function applyWorkingDirectoryToOpenOptions(
    options: OpenTerminalShellTabOptions,
    workingDirectory: string,
  ): OpenTerminalShellTabOptions {
    if (options.runtimeBootstrap?.kind === "local-process") {
      return {
        ...options,
        workingDirectory,
        runtimeBootstrap: {
          kind: "local-process",
          request: {
            ...options.runtimeBootstrap.request,
            workingDirectory,
          },
        },
      };
    }

    if (options.runtimeBootstrap?.kind === "remote-runtime") {
      return {
        ...options,
        workingDirectory,
        runtimeBootstrap: {
          kind: "remote-runtime",
          request: {
            ...options.runtimeBootstrap.request,
            workingDirectory,
          },
        },
      };
    }

    return {
      ...options,
      workingDirectory,
    };
  }

  function resolveLaunchEntryOpenOptions(
    entry: LaunchProfileDefinition,
    workingDirectory?: string,
  ): OpenTerminalShellTabOptions {
    const currentActiveTab = latestSnapshotRef.current?.activeTab ?? activeTab;
    const baseOptions: OpenTerminalShellTabOptions = {
      ...(entry.openOptions ?? { profile: entry.profile }),
      viewport: currentActiveTab.snapshot.viewport,
    };
    const normalizedWorkingDirectory = workingDirectory?.trim();

    return resolveTabOpenOptions(
      normalizedWorkingDirectory
        ? applyWorkingDirectoryToOpenOptions(baseOptions, normalizedWorkingDirectory)
        : baseOptions,
    );
  }

  function resolveTabSnapshotById(tabId: string) {
    return snapshotTabById.get(tabId) ?? null;
  }

  async function refreshDesktopWslLaunchProfiles(force = false) {
    const desktopRuntimeClient = desktopRuntimeClientRef.current;
    const runLocalShellCommand = desktopRuntimeClient?.executeLocalShellCommand;
    if (
      props.mode !== "desktop" ||
      !isWindowsDesktopHost() ||
      !runLocalShellCommand
    ) {
      if (mountedRef.current) {
        setDesktopWslLaunchProfiles([]);
        setDesktopWslDiscoveryStatus(null);
      }
      return;
    }

    const now = Date.now();
    if (
      !force &&
      now - wslDiscoveryLastSuccessAtRef.current < WSL_DISCOVERY_CACHE_TTL_MS
    ) {
      return;
    }

    if (wslDiscoveryPromiseRef.current) {
      return wslDiscoveryPromiseRef.current;
    }

    const hasCachedWslProfiles = desktopWslLaunchProfiles.length > 0;
    let discoverySucceeded = false;
    const discoveryPromise = (async () => {
      try {
        const result = await runLocalShellCommand({
          profile: "powershell",
          commandText: WSL_DISCOVERY_COMMAND,
        });

        if (!mountedRef.current) {
          return;
        }

        if (result.exitCode !== 0) {
          if (!hasCachedWslProfiles) {
            setDesktopWslLaunchProfiles([]);
          }
          setDesktopWslDiscoveryStatus({
            title: hasCachedWslProfiles ? "WSL discovery stale" : "WSL unavailable",
            subtitle: hasCachedWslProfiles
              ? `Showing last known distributions until discovery succeeds again. Command exited with code ${result.exitCode}.`
              : `Failed to query WSL distributions. Command exited with code ${result.exitCode}.`,
            accent: hasCachedWslProfiles ? "#f59e0b" : "#ef4444",
          });
          return;
        }

        setDesktopWslLaunchProfiles(
          parseWslDistributionNames(result.stdout).map(createDesktopWslLaunchProfile),
        );
        setDesktopWslDiscoveryStatus(null);
        discoverySucceeded = true;
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        console.warn("[sdkwork-terminal] WSL discovery failed", error);
        if (!hasCachedWslProfiles) {
          setDesktopWslLaunchProfiles([]);
        }
        setDesktopWslDiscoveryStatus({
          title: hasCachedWslProfiles ? "WSL discovery stale" : "WSL unavailable",
          subtitle: hasCachedWslProfiles
            ? `Showing last known distributions. ${message}`
            : `Failed to discover WSL distributions. ${message}`,
          accent: hasCachedWslProfiles ? "#f59e0b" : "#ef4444",
        });
      }
    })();

    wslDiscoveryPromiseRef.current = discoveryPromise;
    void discoveryPromise.finally(() => {
      if (discoverySucceeded) {
        wslDiscoveryLastSuccessAtRef.current = Date.now();
      }
      if (wslDiscoveryPromiseRef.current === discoveryPromise) {
        wslDiscoveryPromiseRef.current = null;
      }
    });
    return discoveryPromise;
  }

  function updateProfileMenuPosition() {
    setProfileMenuPosition(resolveProfileMenuPosition(headerChromeRef.current));
  }

  function scheduleProfileMenuBackgroundRefresh() {
    const refresh = () => {
      props.onBeforeProfileMenuOpen?.();
      void refreshDesktopWslLaunchProfiles();
    };

    if (typeof queueMicrotask === "function") {
      queueMicrotask(refresh);
      return;
    }

    window.setTimeout(refresh, 0);
  }

  function toggleProfileMenu() {
    setContextMenu(null);
    if (!profileMenuOpen) {
      setProfileMenuStatus(null);
      updateProfileMenuPosition();
      setProfileMenuOpen(true);
      scheduleProfileMenuBackgroundRefresh();
      return;
    }

    setProfileMenuPosition(null);
    setProfileMenuOpen(false);
  }

  function clearRuntimeBootstrapRetryTimer(tabId: string) {
    const timer = runtimeBootstrapRetryTimersRef.current.get(tabId);
    if (timer == null) {
      return;
    }

    window.clearTimeout(timer);
    runtimeBootstrapRetryTimersRef.current.delete(tabId);
  }

  async function writeRuntimeInput(
    client: SharedRuntimeClient,
    sessionId: string,
    input: TerminalShellPendingRuntimeInput,
  ) {
    if (input.kind === "binary") {
      await client.writeSessionInputBytes({
        sessionId,
        inputBytes: input.inputBytes,
      });
      return;
    }

    await client.writeSessionInput({
      sessionId,
      input: input.data,
    });
  }

  function dispatchLiveRuntimeInput(args: {
    tabId: string;
    sessionId: string;
    client: SharedRuntimeClient;
    input: TerminalShellPendingRuntimeInput;
  }) {
    const previousWrite = runtimeInputWriteChainsRef.current.get(args.tabId) ?? Promise.resolve();
    let nextWrite: Promise<void>;
    nextWrite = previousWrite
      .catch(() => {})
      .then(() => writeRuntimeInput(args.client, args.sessionId, args.input))
      .catch((cause) => {
        if (!mountedRef.current) {
          return;
        }

        const message = cause instanceof Error ? cause.message : String(cause);
        updateShellStateDeferred((current) =>
          applyTerminalShellExecutionFailure(current, args.tabId, message),
        );
      })
      .finally(() => {
        if (runtimeInputWriteChainsRef.current.get(args.tabId) === nextWrite) {
          runtimeInputWriteChainsRef.current.delete(args.tabId);
        }
      });

    runtimeInputWriteChainsRef.current.set(args.tabId, nextWrite);
  }

  useEffect(() => {
    desktopRuntimeClientRef.current = props.desktopRuntimeClient;
  }, [props.desktopRuntimeClient]);

  useEffect(() => {
    webRuntimeClientRef.current = props.webRuntimeClient;
  }, [props.webRuntimeClient]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    updateProfileMenuPosition();
  }, [desktopWslLaunchProfiles.length, profileMenuOpen]);

  useEffect(() => {
    latestSnapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const intent = props.desktopSessionReattachIntent;
    if (props.mode !== "desktop" || !intent) {
      return;
    }

    if (handledDesktopSessionReattachIntentIdRef.current === intent.requestId) {
      return;
    }

    handledDesktopSessionReattachIntentIdRef.current = intent.requestId;
    setProfileMenuOpen(false);
    setContextMenu(null);
    updateShellState((current) => {
      const next = openTerminalShellTab(current, {
        profile: intent.profile,
        title: intent.title,
        targetLabel: intent.targetLabel,
        viewport: activeTab.snapshot.viewport,
      });

      return bindTerminalShellSessionRuntime(next, next.activeTabId, {
        sessionId: intent.sessionId,
        attachmentId: intent.attachmentId,
        cursor: intent.cursor,
      });
    });
  }, [activeTab.snapshot.viewport, props.desktopSessionReattachIntent, props.mode]);

  useEffect(() => {
    const intent = props.desktopConnectorSessionIntent;
    if (props.mode !== "desktop" || !intent) {
      return;
    }

    if (handledDesktopConnectorSessionIntentIdRef.current === intent.requestId) {
      return;
    }

    handledDesktopConnectorSessionIntentIdRef.current = intent.requestId;
    setProfileMenuOpen(false);
    setContextMenu(null);
    updateShellState((current) =>
      openTerminalShellTab(current, {
        profile: intent.profile,
        title: intent.title,
        targetLabel: intent.targetLabel,
        viewport: activeTab.snapshot.viewport,
        runtimeBootstrap: {
          kind: "connector",
          request: intent.request,
        },
      }),
    );
  }, [activeTab.snapshot.viewport, props.desktopConnectorSessionIntent, props.mode]);

  useEffect(() => {
    void runtimeControllerStoreRef.current.syncTabs(snapshot.tabs.map((tab) => tab.id));
  }, [snapshot.tabs]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const latestSnapshot = latestSnapshotRef.current;
      for (const tab of latestSnapshot?.tabs ?? []) {
        if (!tab.runtimeAttachmentId) {
          continue;
        }

        void desktopRuntimeClientRef.current?.detachSessionAttachment?.({
          attachmentId: tab.runtimeAttachmentId,
        });
      }
      for (const timer of runtimeBootstrapRetryTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      runtimeBootstrapRetryTimersRef.current.clear();
      viewportCopyHandlersRef.current.clear();
      viewportPasteHandlersRef.current.clear();
      runtimeInputWriteChainsRef.current.clear();
      void runtimeControllerStoreRef.current.disposeAll();
    };
  }, []);

  useEffect(() => {
    const retryingTabIds = new Set(
      snapshot.tabs
        .filter((tab) => tab.runtimeState === "retrying")
        .map((tab) => tab.id),
    );

    for (const [tabId, timer] of runtimeBootstrapRetryTimersRef.current.entries()) {
      if (retryingTabIds.has(tabId)) {
        continue;
      }

      window.clearTimeout(timer);
      runtimeBootstrapRetryTimersRef.current.delete(tabId);
    }
  }, [retryingTabsEffectKey]);

  function handleRuntimeReplayByTabId(
    tabId: string,
    replay: {
      nextCursor: string;
      entries: Parameters<typeof applyTerminalShellReplayEntries>[2]["entries"];
    },
  ) {
    if (replay.entries.length === 0) {
      return;
    }

    updateShellStateDeferred((current) =>
      applyTerminalShellReplayEntries(current, tabId, replay),
    );
  }

  useEffect(() => {
    for (const tab of runtimeDerivedState.runtimeBootstrapCandidateTabs) {
      if (
        shouldUseTerminalShellFallbackMode({
          mode: props.mode,
          runtimeBootstrap: tab.runtimeBootstrap,
          runtimeSessionId: tab.runtimeSessionId,
        })
      ) {
        continue;
      }

      const runtimeClient = resolveTabRuntimeClient(tab);

      if (tab.runtimeState === "retrying") {
        if (runtimeBootstrapRetryTimersRef.current.has(tab.id)) {
          continue;
        }

        const retryTimer = window.setTimeout(() => {
          runtimeBootstrapRetryTimersRef.current.delete(tab.id);
          if (!mountedRef.current) {
            return;
          }

          updateShellStateDeferred((current) =>
            resumeTerminalShellTabRuntimeBootstrap(current, tab.id),
          );
        }, DESKTOP_RUNTIME_BOOTSTRAP_RETRY_DELAY_MS);

        runtimeBootstrapRetryTimersRef.current.set(tab.id, retryTimer);
        continue;
      }

      if (
        tab.runtimeSessionId ||
        tab.runtimeState !== "idle" ||
        bootstrappingRuntimeTabIdsRef.current.has(tab.id)
      ) {
        continue;
      }

      if (!runtimeClient) {
        updateShellStateDeferred((current) =>
          applyTerminalShellExecutionFailure(
            current,
            tab.id,
            tab.runtimeBootstrap.kind === "remote-runtime"
              ? props.mode === "web"
              ? "web remote runtime client is unavailable"
              : "remote runtime tabs are only supported in web mode"
              : tab.runtimeBootstrap.kind === "connector"
                ? "desktop connector runtime client is unavailable"
                : tab.runtimeBootstrap.kind === "local-process"
                  ? "desktop local process runtime client is unavailable"
                : "desktop shell runtime client is unavailable",
          ),
        );
        continue;
      }

      const nextBootstrapAttempt = tab.runtimeBootstrapAttempts + 1;
      const tabRuntimeBootstrapRequest = resolveTerminalShellRuntimeBootstrapRequestFromTab(
        tab,
        {
          cols: tab.snapshot.viewport.cols > 20 ? tab.snapshot.viewport.cols : 120,
          rows: tab.snapshot.viewport.rows > 5 ? tab.snapshot.viewport.rows : 32,
        },
      );
      bootstrappingRuntimeTabIdsRef.current.add(tab.id);
      clearRuntimeBootstrapRetryTimer(tab.id);
      updateShellStateDeferred((current) => markTerminalShellSessionRuntimeBinding(current, tab.id));
      let bootstrapRequest: Promise<{
        sessionId: string;
        attachmentId?: string | null;
        cursor?: string | null;
        workingDirectory: string;
        invokedProgram: string;
      }>;
      if (tabRuntimeBootstrapRequest.kind === "connector") {
        if (!props.desktopRuntimeClient) {
          bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
          updateShellStateDeferred((current) =>
            applyTerminalShellExecutionFailure(
              current,
              tab.id,
              "desktop connector runtime client is unavailable",
            ),
          );
          continue;
        }

        bootstrapRequest = props.desktopRuntimeClient.createConnectorInteractiveSession(
          tabRuntimeBootstrapRequest.request,
        );
      } else if (tabRuntimeBootstrapRequest.kind === "local-process") {
        if (!props.desktopRuntimeClient) {
          bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
          updateShellStateDeferred((current) =>
            applyTerminalShellExecutionFailure(
              current,
              tab.id,
              "desktop local process runtime client is unavailable",
            ),
          );
          continue;
        }

        bootstrapRequest = props.desktopRuntimeClient.createLocalProcessSession(
          tabRuntimeBootstrapRequest.request,
        );
      } else if (tabRuntimeBootstrapRequest.kind === "remote-runtime") {
        if (!props.webRuntimeClient) {
          bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
          updateShellStateDeferred((current) =>
            applyTerminalShellExecutionFailure(
              current,
              tab.id,
              "web remote runtime client is unavailable",
            ),
          );
          continue;
        }

        bootstrapRequest = props.webRuntimeClient.createRemoteRuntimeSession(
          tabRuntimeBootstrapRequest.request,
        );
      } else {
        if (!props.desktopRuntimeClient) {
          bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
          updateShellStateDeferred((current) =>
            applyTerminalShellExecutionFailure(
              current,
              tab.id,
              "desktop shell runtime client is unavailable",
            ),
          );
          continue;
        }

        bootstrapRequest = props.desktopRuntimeClient.createLocalShellSession(
          tabRuntimeBootstrapRequest.request,
        );
      }
      void bootstrapRequest
        .then((session) => {
          bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
          clearRuntimeBootstrapRetryTimer(tab.id);
          updateShellStateDeferred((current) => {
            const next = bindTerminalShellSessionRuntime(current, tab.id, {
              sessionId: session.sessionId,
              attachmentId: session.attachmentId,
              cursor: session.cursor,
              workingDirectory: session.workingDirectory,
              invokedProgram: session.invokedProgram,
            });
            return queueTerminalShellTabBootstrapCommand(next, tab.id);
          });
        })
        .catch((cause) => {
          console.error("[sdkwork-terminal] bootstrap session failed", cause);
          bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
          const message = cause instanceof Error ? cause.message : String(cause);

          if (
            shouldAutoRetryTerminalShellBootstrap({
              attempt: nextBootstrapAttempt,
              maxAutoRetries: DESKTOP_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT,
            })
          ) {
            updateShellStateDeferred((current) =>
              queueTerminalShellTabRuntimeBootstrapRetry(current, tab.id, message),
            );
            return;
          }

          updateShellStateDeferred((current) =>
            applyTerminalShellExecutionFailure(current, tab.id, message),
          );
        });
    }
  }, [props.desktopRuntimeClient, props.mode, props.webRuntimeClient, runtimeBootstrapEffectKey]);

  useEffect(() => {
    const runtimeClient = resolveTabRuntimeClient(activeTab);
    if (!runtimeClient || !activeTab.runtimeSessionId || activeTab.runtimeState === "exited") {
      return;
    }

    void runtimeClient.resizeSession({
      sessionId: activeTab.runtimeSessionId,
      cols: activeTab.snapshot.viewport.cols,
      rows: activeTab.snapshot.viewport.rows,
    });
  }, [
    activeTab.id,
    activeTab.runtimeSessionId,
    activeTab.runtimeState,
    activeTab.snapshot.viewport.cols,
    activeTab.snapshot.viewport.rows,
    props.desktopRuntimeClient,
    props.mode,
    props.webRuntimeClient,
  ]);

  useEffect(() => {
    for (const tab of snapshot.tabs) {
      const runtimeClient = resolveTabRuntimeClient(tab);
      if (
        !runtimeClient ||
        !tab.runtimeSessionId ||
        tab.runtimeState !== "running" ||
        tab.runtimePendingInputQueue.length === 0
      ) {
        flushingRuntimeInputTabIdsRef.current.delete(tab.id);
        continue;
      }

      if (flushingRuntimeInputTabIdsRef.current.has(tab.id)) {
        continue;
      }

      const nextPendingInput = tab.runtimePendingInputQueue[0];
      if (!nextPendingInput) {
        continue;
      }

      const flushInput =
        nextPendingInput.kind === "text" && tab.runtimePendingInputQueue.length === 1
          ? {
              kind: "text" as const,
              data: tab.runtimePendingInput,
            }
          : nextPendingInput;

      if (
        !shouldFlushTerminalRuntimeInputQueue({
          mode: props.mode,
          runtimeState: tab.runtimeState,
          runtimeSessionId: tab.runtimeSessionId,
          runtimeStreamStarted: tab.runtimeStreamStarted,
          input:
            flushInput.kind === "text"
              ? {
                  kind: "text",
                  data: flushInput.data,
                }
              : {
                  kind: "binary",
                  inputBytes: [...flushInput.inputBytes],
                },
        })
      ) {
        continue;
      }

      flushingRuntimeInputTabIdsRef.current.add(tab.id);
      const flushRequest = writeRuntimeInput(
        runtimeClient,
        tab.runtimeSessionId,
        flushInput,
      );

      void flushRequest
        .then(() => {
          if (!mountedRef.current) {
            return;
          }

          updateShellStateDeferred((current) =>
            consumeTerminalShellPendingRuntimeInput(
              current,
              tab.id,
              nextPendingInput.kind === "text" &&
                tab.runtimePendingInputQueue.length === 1
                ? tab.runtimePendingInput
                : nextPendingInput,
            ),
          );
        })
        .catch((cause) => {
          if (!mountedRef.current) {
            return;
          }

          const message = cause instanceof Error ? cause.message : String(cause);
          updateShellStateDeferred((current) =>
            applyTerminalShellExecutionFailure(current, tab.id, message),
          );
        })
        .finally(() => {
          flushingRuntimeInputTabIdsRef.current.delete(tab.id);
        });
    }
  }, [props.desktopRuntimeClient, props.mode, props.webRuntimeClient, runtimePendingInputEffectKey]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const syncProfileMenuPosition = () => {
      updateProfileMenuPosition();
    };

    syncProfileMenuPosition();
    window.addEventListener("resize", syncProfileMenuPosition);
    window.addEventListener("scroll", syncProfileMenuPosition, true);

    return () => {
      window.removeEventListener("resize", syncProfileMenuPosition);
      window.removeEventListener("scroll", syncProfileMenuPosition, true);
    };
  }, [profileMenuOpen, shouldDockTabActionsToTrailing]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !headerChromeRef.current?.contains(target) &&
        !profileMenuRef.current?.contains(target)
      ) {
        setProfileMenuOpen(false);
        setProfileMenuPosition(null);
      }

      if (!contextMenuRef.current?.contains(target)) {
        setContextMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || shouldIgnoreTerminalAppShortcutTarget(event.target)) {
        return;
      }

      const tabSwitchDirection = resolveTerminalTabSwitchShortcutDirection(event);

      if (isTerminalNewTabShortcut(event)) {
        event.preventDefault();
        updateShellState((current) =>
          openTerminalShellTab(
            current,
            resolveTabOpenOptions({
              profile: props.mode === "desktop" ? detectDefaultDesktopProfile() : "bash",
              viewport: activeTab.snapshot.viewport,
            }),
          ),
        );
        return;
      }

      if (isTerminalCloseTabShortcut(event)) {
        if (snapshot.tabs.length <= 1) {
          return;
        }
        event.preventDefault();
        const tabId = activeTab.id;
        const sessionId = activeTab.runtimeSessionId;
        const runtimeClient = resolveTabRuntimeClient(activeTab);
        if (sessionId && runtimeClient) {
          void runtimeClient.terminateSession(sessionId);
        }
        updateShellState((current) => closeTerminalShellTab(current, tabId));
        return;
      }

      if (tabSwitchDirection) {
        event.preventDefault();
        const currentIdx = snapshot.tabs.findIndex((t) => t.id === activeTab.id);
        if (currentIdx < 0) {
          return;
        }
        const nextIdx = tabSwitchDirection === "previous"
          ? (currentIdx - 1 + snapshot.tabs.length) % snapshot.tabs.length
          : (currentIdx + 1) % snapshot.tabs.length;
        updateShellState((current) =>
          activateTerminalShellTab(current, snapshot.tabs[nextIdx].id),
        );
        return;
      }

    }

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [
    activeTab.id,
    activeTab.snapshot.viewport,
    activeTab.runtimeSessionId,
    snapshot.tabs,
    props.mode,
    props.desktopRuntimeClient,
    props.webRuntimeClient,
    props.webRuntimeTarget,
  ]);

  useEffect(() => {
    syncTabScrollState(tabScrollRef.current, setCanScrollLeft, setCanScrollRight);

    const container = tabScrollRef.current;
    const leading = headerLeadingRef.current;
    if (!container || !leading) {
      return;
    }

    const syncHeaderLayout = () => {
      syncTabScrollState(container, setCanScrollLeft, setCanScrollRight);

      const tabMeasurements = Array.from(container.children)
        .filter((child): child is HTMLElement => child instanceof HTMLElement)
        .map((child) => ({
          offsetLeft: child.offsetLeft,
          width: child.offsetWidth,
        }));

      const nextMetrics: HeaderLayoutMetrics = {
        leadingWidth: resolveTerminalTabActionInlineWidth({
          leadingWidth: leading.clientWidth,
          actionWidth:
            headerChromeRef.current?.getBoundingClientRect().width ??
            TERMINAL_HEADER_ACTION_FALLBACK_WIDTH,
          docked: shouldDockTabActionsToTrailing,
        }),
        tabListWidth: measureTerminalTabStripContentWidth(tabMeasurements),
        actionWidth:
          headerChromeRef.current?.getBoundingClientRect().width ??
          TERMINAL_HEADER_ACTION_FALLBACK_WIDTH,
      };

      setHeaderLayoutMetrics((current) =>
        current.leadingWidth === nextMetrics.leadingWidth &&
        current.tabListWidth === nextMetrics.tabListWidth &&
        current.actionWidth === nextMetrics.actionWidth
          ? current
          : nextMetrics,
      );
    };

    syncHeaderLayout();

    const resizeObserver = new ResizeObserver(() => {
      syncHeaderLayout();
    });
    resizeObserver.observe(container);
    resizeObserver.observe(leading);
    if (headerChromeRef.current) {
      resizeObserver.observe(headerChromeRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [shouldDockTabActionsToTrailing, snapshot.tabs.length]);

  useEffect(() => {
    const container = tabScrollRef.current;
    if (!container) {
      return;
    }

    const activeElement = container.querySelector(
      `[data-terminal-tab-id="${activeTab.id}"]`,
    );
    if (activeElement instanceof HTMLElement) {
      activeElement.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
    }

    syncTabScrollState(container, setCanScrollLeft, setCanScrollRight);
  }, [activeTab.id, snapshot.tabs.length]);

  function updateShellState(
    update: (current: TerminalShellState) => TerminalShellState,
  ) {
    setShellState((current) => update(current));
  }

  function updateShellStateDeferred(
    update: (current: TerminalShellState) => TerminalShellState,
  ) {
    startTransition(() => {
      setShellState((current) => update(current));
    });
  }

  async function openLaunchEntry(entry: LaunchProfileDefinition) {
    setProfileMenuStatus(null);
    setProfileMenuOpen(false);
    setProfileMenuPosition(null);
    setContextMenu(null);

    let workingDirectory: string | undefined;
    if (entry.requiresWorkingDirectoryPicker) {
      try {
        const selectedWorkingDirectory = props.onPickWorkingDirectory
          ? await props.onPickWorkingDirectory({
              defaultPath: activeTab.workingDirectory,
              title: `Choose working directory for ${entry.label}`,
            })
          : activeTab.workingDirectory;

        if (!mountedRef.current) {
          return;
        }

        const normalizedWorkingDirectory = selectedWorkingDirectory?.trim();
        if (!normalizedWorkingDirectory) {
          return;
        }

        workingDirectory = normalizedWorkingDirectory;
      } catch (error) {
        console.error("[sdkwork-terminal] working directory picker failed", error);
        if (!mountedRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        updateProfileMenuPosition();
        setProfileMenuStatus({
          title: `${entry.label} launch failed`,
          subtitle: `Working directory selection failed. ${message}`,
          accent: "#ef4444",
        });
        setProfileMenuOpen(true);
        return;
      }
    }

    updateShellState((current) =>
      openTerminalShellTab(
        current,
        resolveLaunchEntryOpenOptions(entry, workingDirectory),
      ),
    );
  }

  function openDesktopConnectorEntry(entry: DesktopConnectorLaunchEntry) {
    setProfileMenuOpen(false);
    setProfileMenuPosition(null);
    setContextMenu(null);
    props.onLaunchDesktopConnectorEntry?.(entry.targetId);
  }

  function openTabContextMenu(
    event: ReactMouseEvent<HTMLDivElement>,
    tabId: string,
  ) {
    event.preventDefault();
    setProfileMenuOpen(false);

    const menuWidth = 196;
    const menuHeight = 156;
    const inset = 8;
    const maxX = Math.max(inset, window.innerWidth - menuWidth - inset);
    const maxY = Math.max(inset, window.innerHeight - menuHeight - inset);

    setContextMenu({
      tabId,
      x: Math.min(event.clientX, maxX),
      y: Math.min(event.clientY, maxY),
    });
  }

  function handleContextMenuCopy() {
    const targetTabId = contextMenu?.tabId ?? activeTab.id;
    setContextMenu(null);
    const copyHandler = viewportCopyHandlersRef.current.get(targetTabId);
    if (copyHandler) {
      void copyHandler();
      return;
    }

    try {
      const targetTab = snapshot.tabs.find((tab) => tab.id === targetTabId) ?? activeTab;
      const selectionText = targetTab.copiedText;
      void writeTerminalClipboardText(selectionText, props.clipboardProvider);
    } catch {
      // Clipboard access is best-effort
    }
  }

  function handleContextMenuPaste() {
    const targetTabId = contextMenu?.tabId ?? activeTab.id;
    setContextMenu(null);
    try {
      void readTerminalClipboardText(props.clipboardProvider).then((text) => {
        if (text.length === 0) {
          return;
        }
        const pasteHandler = viewportPasteHandlersRef.current.get(targetTabId);
        if (pasteHandler) {
          void pasteHandler(text);
          return;
        }

        handleViewportInputByTabId(targetTabId, {
          kind: "text",
          data: text,
        });
      });
    } catch {
      // Clipboard access is best-effort
    }
  }

  function handleCloseTab(tabId: string) {
    setContextMenu(null);
    const tab = snapshot.tabs.find((entry) => entry.id === tabId);
    const runtimeClient = tab ? resolveTabRuntimeClient(tab) : null;
    if (runtimeClient && tab?.runtimeSessionId && tab.runtimeState !== "exited") {
      void runtimeClient.terminateSession(tab.runtimeSessionId);
    }
    updateShellState((current) => closeTerminalShellTab(current, tabId));
  }

  function handleCloseOtherTabs(tabId: string) {
    setContextMenu(null);
    for (const tab of snapshot.tabs) {
      const runtimeClient = resolveTabRuntimeClient(tab);
      if (
        runtimeClient &&
        tab.id !== tabId &&
        tab.runtimeSessionId &&
        tab.runtimeState !== "exited"
      ) {
        void runtimeClient.terminateSession(tab.runtimeSessionId);
      }
    }
    updateShellState((current) => closeTerminalShellTabsExcept(current, tabId));
  }

  function handleCloseTabsToRight(tabId: string) {
    setContextMenu(null);
    const tabIndex = snapshot.tabs.findIndex((entry) => entry.id === tabId);
    for (const tab of snapshot.tabs.slice(tabIndex + 1)) {
      const runtimeClient = resolveTabRuntimeClient(tab);
      if (runtimeClient && tab.runtimeSessionId && tab.runtimeState !== "exited") {
        void runtimeClient.terminateSession(tab.runtimeSessionId);
      }
    }
    updateShellState((current) => closeTerminalShellTabsToRight(current, tabId));
  }

  function handleDuplicateTab(tabId: string) {
    setContextMenu(null);
    updateShellState((current) => duplicateTerminalShellTab(current, tabId));
  }

  function handleRestartRuntimeTabById(tabId: string) {
    const tab = resolveTabSnapshotById(tabId);
    if (!tab) {
      return;
    }

    bootstrappingRuntimeTabIdsRef.current.delete(tab.id);
    clearRuntimeBootstrapRetryTimer(tab.id);
    flushingRuntimeInputTabIdsRef.current.delete(tab.id);

    const runtimeClient = resolveTabRuntimeClient(tab);
    if (runtimeClient && tab.runtimeSessionId && tab.runtimeState !== "exited") {
      void runtimeClient.terminateSession(tab.runtimeSessionId).catch(
        () => {
          // Best-effort cleanup only. Restart should still proceed locally.
        },
      );
    }

    updateShellState((current) =>
      restartTerminalShellTabRuntime(current, tab.id, {
        preservePendingInput: tab.runtimeState === "failed",
      }),
    );
  }

  function handleViewportInputByTabId(
    tabId: string,
    inputEvent: TerminalViewportInput,
  ) {
    const tab = resolveTabSnapshotById(tabId);
    if (!tab) {
      return;
    }

    const runtimeClient = resolveTabRuntimeClient(tab);
    if (runtimeClient && isRuntimeCapableTab(tab)) {
      if (tab.runtimeState === "exited" || tab.runtimeState === "failed") {
        return;
      }

      const pendingInput: TerminalShellPendingRuntimeInput =
        inputEvent.kind === "binary"
          ? {
              kind: "binary",
              inputBytes: [...inputEvent.inputBytes],
            }
          : {
              kind: "text",
              data: inputEvent.data,
            };

      if (
        !flushingRuntimeInputTabIdsRef.current.has(tab.id) &&
        shouldBypassTerminalRuntimeInputQueue({
          runtimeState: tab.runtimeState,
          runtimeSessionId: tab.runtimeSessionId,
          runtimeStreamStarted: tab.runtimeStreamStarted,
          pendingInputCount: tab.runtimePendingInputQueue.length,
          input:
            pendingInput.kind === "text"
              ? {
                  kind: "text",
                  data: pendingInput.data,
                }
              : {
                  kind: "binary",
                  inputBytes: [...pendingInput.inputBytes],
                },
        })
      ) {
        dispatchLiveRuntimeInput({
          tabId: tab.id,
          sessionId: tab.runtimeSessionId!,
          client: runtimeClient,
          input: pendingInput,
        });
        return;
      }

      if (canQueueTerminalShellRuntimeInput(tab)) {
        updateShellState((current) =>
          appendTerminalShellPendingRuntimeInput(current, tab.id, pendingInput),
        );
        return;
      }

      return;
    }

    if (inputEvent.kind === "binary") {
      return;
    }

    updateShellState((current) =>
      applyTerminalShellPromptInput(current, tab.id, inputEvent.data),
    );
  }

  return (
    <main data-shell-layout="terminal-tabs" style={rootStyle}>
      <section style={shellStyle}>
        <div style={tabStripStyle}>
          <div
            ref={headerLeadingRef}
            data-slot="terminal-header-leading"
            {...(isDesktopShell ? { "data-tauri-drag-region": true } : {})}
            style={headerLeadingStyle}
          >
            {canScrollLeft ? (
              <button
                type="button"
                data-tauri-drag-region="false"
                aria-label="Scroll terminal tabs left"
                title="Scroll terminal tabs left"
                onClick={() => scrollTabs(tabScrollRef.current, "left")}
                style={tabScrollButtonStyle}
              >
                <ChevronGlyph direction="left" />
              </button>
            ) : null}

            <div
              ref={tabScrollRef}
              role="tablist"
              aria-label="Terminal tabs"
              onScroll={() =>
                syncTabScrollState(
                  tabScrollRef.current,
                  setCanScrollLeft,
                  setCanScrollRight,
                )
              }
              style={tabListStyle(shouldDockTabActionsToTrailing)}
            >
              {snapshot.tabs.map((tab) => {
                const active = tab.active;
                const closeVisible = active || hoveredTabId === tab.id;
                const profile = resolveLaunchProfile(launchProfiles, tab.profile);

                return (
                  <div
                    key={tab.id}
                    data-terminal-tab-id={tab.id}
                    data-tauri-drag-region="false"
                    onContextMenu={(event) => openTabContextMenu(event, tab.id)}
                    onMouseDown={(event) => {
                      if (event.button === 1 && tab.closable) {
                        event.preventDefault();
                        handleCloseTab(tab.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredTabId(tab.id)}
                    onMouseLeave={() =>
                      setHoveredTabId((current) => (current === tab.id ? null : current))
                    }
                    style={tabShellStyle(
                      active,
                      closeVisible,
                      shouldDockTabActionsToTrailing,
                    )}
                  >
                    {active ? <div style={activeTabAccentStyle} /> : null}
                    {active ? <div style={activeTabBottomMaskStyle} /> : null}
                    <button
                      id={`terminal-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-controls={`terminal-panel-${tab.id}`}
                      onClick={() =>
                        updateShellState((current) =>
                          activateTerminalShellTab(current, tab.id),
                        )
                      }
                      style={tabButtonStyle}
                    >
                      <ProfileGlyph accent={profile.accent} label={profile.label} />
                      <span style={tabTitleStyle}>{tab.title}</span>
                      {tab.runtimeState === "exited" ? (
                        <span aria-hidden="true" style={tabExitedIndicatorStyle} />
                      ) : null}
                    </button>
                    {tab.closable ? (
                      <button
                        type="button"
                        data-slot="terminal-tab-close"
                        aria-label={`Close ${tab.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCloseTab(tab.id);
                        }}
                        style={tabCloseButtonStyle(active, closeVisible)}
                      >
                        <CloseGlyph />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {canScrollRight ? (
              <button
                type="button"
                data-tauri-drag-region="false"
                aria-label="Scroll terminal tabs right"
                title="Scroll terminal tabs right"
                onClick={() => scrollTabs(tabScrollRef.current, "right")}
                style={tabScrollButtonStyle}
              >
                <ChevronGlyph direction="right" />
              </button>
            ) : null}

            {!shouldDockTabActionsToTrailing ? (
              <div
                ref={headerChromeRef}
                data-slot="terminal-header-chrome"
                style={headerChromeStyle}
              >
                <TabHeaderActions
                  profileMenuOpen={profileMenuOpen}
                  onOpenNewTab={() => {
                    setProfileMenuOpen(false);
                    setProfileMenuPosition(null);
                    setContextMenu(null);
                    updateShellState((current) =>
                      openTerminalShellTab(
                        current,
                        resolveTabOpenOptions({
                          profile: props.mode === "desktop" ? detectDefaultDesktopProfile() : "bash",
                          viewport: activeTab.snapshot.viewport,
                        }),
                      ),
                    );
                  }}
                  onToggleProfileMenu={toggleProfileMenu}
                />
              </div>
            ) : null}

            {isDesktopShell ? (
              <div
                data-tauri-drag-region
                style={headerDragSpacerStyle(shouldDockTabActionsToTrailing)}
              />
            ) : null}
          </div>

          <div
            data-slot="terminal-header-trailing"
            data-tauri-drag-region="false"
            style={headerTrailingStyle}
          >
            {shouldDockTabActionsToTrailing ? (
              <div
                ref={headerChromeRef}
                data-slot="terminal-header-chrome"
                style={headerChromeStyle}
              >
                <TabHeaderActions
                  profileMenuOpen={profileMenuOpen}
                  onOpenNewTab={() => {
                    setProfileMenuOpen(false);
                    setProfileMenuPosition(null);
                    setContextMenu(null);
                    updateShellState((current) =>
                      openTerminalShellTab(
                        current,
                        resolveTabOpenOptions({
                          profile: props.mode === "desktop" ? detectDefaultDesktopProfile() : "bash",
                          viewport: activeTab.snapshot.viewport,
                        }),
                      ),
                    );
                  }}
                  onToggleProfileMenu={toggleProfileMenu}
                />
              </div>
            ) : null}

            {isDesktopShell && props.desktopWindowController ? (
              <DesktopWindowControls controller={props.desktopWindowController} />
            ) : null}
          </div>
        </div>

        <div style={panelStackStyle}>
          {snapshot.tabs.map((tab) => (
            <div
              key={tab.id}
              id={`terminal-panel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`terminal-tab-${tab.id}`}
              aria-hidden={!tab.active}
              style={panelStyle(tab.active)}
            >
              <MemoTerminalStage
                mode={props.mode}
                tabId={tab.id}
                tab={tab}
                active={tab.active}
                clipboardProvider={props.clipboardProvider}
                runtimeController={runtimeControllerStoreRef.current.getOrCreate(tab.id)}
                runtimeClient={resolveTabRuntimeClient(tab)}
                onViewportInput={(data) => handleViewportInputByTabId(tab.id, data)}
                onRegisterViewportCopyHandler={(handler) => {
                  if (handler) {
                    viewportCopyHandlersRef.current.set(tab.id, handler);
                    return;
                  }

                  viewportCopyHandlersRef.current.delete(tab.id);
                }}
                onRegisterViewportPasteHandler={(handler) => {
                  if (handler) {
                    viewportPasteHandlersRef.current.set(tab.id, handler);
                    return;
                  }

                  viewportPasteHandlersRef.current.delete(tab.id);
                }}
                onViewportTitleChange={(title) =>
                  updateShellState((current) =>
                    setTerminalShellTabTitle(current, tab.id, title),
                  )
                }
                onRuntimeReplayApplied={(replay) =>
                  handleRuntimeReplayByTabId(tab.id, replay)
                }
                onRuntimeError={(message) =>
                  updateShellStateDeferred((current) =>
                    applyTerminalShellExecutionFailure(current, tab.id, message),
                  )
                }
                onRestartRuntime={() => handleRestartRuntimeTabById(tab.id)}
                onSearchQueryChange={(query) =>
                  updateShellState((current) =>
                    setTerminalShellSearchQuery(current, tab.id, query),
                  )
                }
                onSearchSelectMatch={() =>
                  updateShellState((current) =>
                    selectTerminalShellMatch(current, tab.id),
                  )
                }
                onViewportResize={(viewport) =>
                  updateShellState((current) =>
                    resizeTerminalShellTab(current, tab.id, viewport),
                  )
                }
              />
            </div>
          ))}
        </div>

        {profileMenuOpen && profileMenuPosition ? (
          <div
            ref={profileMenuRef}
            role="menu"
            aria-label="Terminal profiles"
            style={profileMenuStyle(profileMenuPosition)}
          >
            {profileMenuStatus ? (
              <>
                <ProfileMenuStatusItem
                  descriptor={profileMenuStatus}
                  slot="terminal-profile-menu-status"
                />
                <ProfileMenuDivider />
              </>
            ) : null}
            <ProfileMenuSection
              title="Shells"
              entries={shellLaunchProfiles}
              onSelect={openLaunchEntry}
            />
            {wslLaunchProfiles.length > 0 ? (
              <>
                <ProfileMenuDivider />
                <ProfileMenuSection
                  title="WSL"
                  entries={wslLaunchProfiles}
                  onSelect={openLaunchEntry}
                />
              </>
            ) : null}
            {desktopWslDiscoveryStatus ? (
              <>
                <ProfileMenuDivider />
                <ProfileMenuStatusItem
                  descriptor={desktopWslDiscoveryStatus}
                  slot="terminal-wsl-discovery-status"
                />
              </>
            ) : null}
            <ProfileMenuDivider />
            <ProfileMenuSection
              title="AI CLI"
              entries={cliLaunchProfiles}
              onSelect={openLaunchEntry}
            />
            {props.desktopConnectorEntries?.length && props.onLaunchDesktopConnectorEntry ? (
              <>
                <ProfileMenuDivider />
                <ConnectorProfileMenuSection
                  title="Connectors"
                  entries={props.desktopConnectorEntries}
                  onSelect={openDesktopConnectorEntry}
                />
              </>
            ) : null}
            {props.desktopConnectorCatalogStatus &&
            props.desktopConnectorCatalogStatus.state !== "ready" ? (
              <>
                <ProfileMenuDivider />
                <ConnectorCatalogStatusMenuItem
                  status={props.desktopConnectorCatalogStatus}
                />
              </>
            ) : null}
            {props.sessionCenterEnabled && props.onToggleSessionCenter ? (
              <>
                <ProfileMenuDivider />
                <button
                  type="button"
                  role="menuitem"
                  data-slot="terminal-session-center-trigger"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setProfileMenuPosition(null);
                    props.onToggleSessionCenter?.();
                  }}
                  style={profileMenuItemStyle}
                >
                  <ProfileGlyph accent="#38bdf8" label="Session Center" />
                  <span style={profileMenuTextStyle}>
                    <span style={profileMenuLabelStyle}>Session Center</span>
                    <span style={profileMenuSubtitleStyle}>{sessionCenterMenuSubtitle}</span>
                  </span>
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {contextMenu ? (
          <div
            ref={contextMenuRef}
            role="menu"
            aria-label="Terminal tab actions"
            style={contextMenuStyle(contextMenu)}
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleContextMenuCopy}
              style={contextMenuItemStyle}
            >
              Copy selection
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleContextMenuPaste}
              style={contextMenuItemStyle}
            >
              Paste
            </button>
            <div style={contextMenuDividerStyle} />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleCloseTab(contextMenu.tabId)}
              style={contextMenuItemStyle}
            >
              Close tab
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleCloseOtherTabs(contextMenu.tabId)}
              style={contextMenuItemStyle}
            >
              Close other tabs
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleCloseTabsToRight(contextMenu.tabId)}
              style={contextMenuItemStyle}
            >
              Close tabs to the right
            </button>
            <div style={contextMenuDividerStyle} />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleDuplicateTab(contextMenu.tabId)}
              style={contextMenuItemStyle}
            >
              Duplicate tab
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

const MemoTerminalStage = memo(function TerminalStage(stageProps: {
  mode: "desktop" | "web";
  tabId: string;
  tab: TerminalShellSnapshot["activeTab"];
  active: boolean;
  clipboardProvider?: TerminalClipboardProvider;
  runtimeController: RuntimeTabController;
  runtimeClient: SharedRuntimeClient | null;
  onViewportInput: (input: TerminalViewportInput) => void;
  onRegisterViewportCopyHandler: (
    handler: (() => Promise<void>) | null,
  ) => void;
  onRegisterViewportPasteHandler: (
    handler: ((text: string) => Promise<void>) | null,
  ) => void;
  onViewportTitleChange: (title: string) => void;
  onRuntimeReplayApplied?: (replay: {
    nextCursor: string;
    entries: Parameters<typeof applyTerminalShellReplayEntries>[2]["entries"];
  }) => void;
  onRuntimeError?: (message: string) => void;
  onRestartRuntime: () => void;
  onSearchQueryChange: (query: string) => void;
  onSearchSelectMatch: () => void;
  onViewportResize: (viewport: TerminalViewport) => void;
}) {
  const props = stageProps;
  const {
    usesRuntimeTerminalStream,
    showLivePrompt,
    showBootstrapOverlay,
  } = resolveTerminalStageBehavior({
    mode: props.mode,
    runtimeBootstrap: props.tab.runtimeBootstrap,
    runtimeSessionId: props.tab.runtimeSessionId,
    runtimeState: props.tab.runtimeState,
    runtimeStreamStarted: props.tab.runtimeStreamStarted,
  });

  return showLivePrompt ? (
    <FallbackTerminalStage
      tab={props.tab}
      active={props.active}
      clipboardProvider={props.clipboardProvider}
      onViewportInput={props.onViewportInput}
      onRegisterViewportCopyHandler={props.onRegisterViewportCopyHandler}
      onRegisterViewportPasteHandler={props.onRegisterViewportPasteHandler}
      onViewportTitleChange={props.onViewportTitleChange}
      onSearchQueryChange={props.onSearchQueryChange}
      onSearchSelectMatch={props.onSearchSelectMatch}
      onViewportResize={props.onViewportResize}
    />
  ) : (
    <RuntimeTerminalStage
      tab={props.tab}
      active={props.active}
      clipboardProvider={props.clipboardProvider}
      controller={props.runtimeController}
      runtimeClient={props.runtimeClient}
      showBootstrapOverlay={showBootstrapOverlay}
      onViewportInput={props.onViewportInput}
      onRegisterViewportCopyHandler={props.onRegisterViewportCopyHandler}
      onRegisterViewportPasteHandler={props.onRegisterViewportPasteHandler}
      onViewportTitleChange={props.onViewportTitleChange}
      onRuntimeReplayApplied={props.onRuntimeReplayApplied}
      onRuntimeError={props.onRuntimeError}
      onRestartRuntime={props.onRestartRuntime}
      onSearchQueryChange={props.onSearchQueryChange}
      onSearchSelectMatch={props.onSearchSelectMatch}
      onViewportResize={props.onViewportResize}
    />
  );
}, (previousProps, nextProps) => {
  return (
    previousProps.mode === nextProps.mode &&
    previousProps.tabId === nextProps.tabId &&
    previousProps.active === nextProps.active &&
    previousProps.clipboardProvider === nextProps.clipboardProvider &&
    previousProps.tab === nextProps.tab
  );
});

function ProfileMenuSection(props: {
  title: string;
  entries: LaunchProfileDefinition[];
  onSelect: (entry: LaunchProfileDefinition) => void;
}) {
  return (
    <div style={profileMenuSectionStyle}>
      <div style={profileMenuSectionTitleStyle}>{props.title}</div>
      {props.entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="menuitem"
          onClick={() => props.onSelect(entry)}
          style={profileMenuItemStyle}
        >
          <ProfileGlyph accent={entry.accent} label={entry.label} />
          <span style={profileMenuTextStyle}>
            <span style={profileMenuLabelStyle}>{entry.label}</span>
            <span style={profileMenuSubtitleStyle}>{entry.subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function ConnectorProfileMenuSection(props: {
  title: string;
  entries: DesktopConnectorLaunchEntry[];
  onSelect: (entry: DesktopConnectorLaunchEntry) => void;
}) {
  return (
    <div style={profileMenuSectionStyle}>
      <div style={profileMenuSectionTitleStyle}>{props.title}</div>
      {props.entries.map((entry) => (
        <button
          key={entry.targetId}
          type="button"
          role="menuitem"
          onClick={() => props.onSelect(entry)}
          style={profileMenuItemStyle}
        >
          <ProfileGlyph accent={entry.accent} label={entry.label} />
          <span style={profileMenuTextStyle}>
            <span style={profileMenuLabelStyle}>{entry.label}</span>
            <span style={profileMenuSubtitleStyle}>{entry.subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function describeConnectorCatalogStatus(
  status: DesktopConnectorCatalogStatus,
) {
  if (status.state === "stale") {
    return {
      title: "Connectors (stale)",
      subtitle: status.message
        ? `Using last known targets. ${status.message}`
        : "Using last known targets until runtime catalog refresh succeeds.",
      accent: "#f59e0b",
    };
  }

  if (status.state === "error") {
    return {
      title: "Connectors unavailable",
      subtitle: status.message ?? "Failed to load runtime catalog from desktop host.",
      accent: "#ef4444",
    };
  }

  return {
    title: "No connectors discovered",
    subtitle: status.message ?? "Runtime catalog is empty. Verify host discovery and permissions.",
    accent: "#94a3b8",
  };
}

function ConnectorCatalogStatusMenuItem(props: {
  status: DesktopConnectorCatalogStatus;
}) {
  const descriptor = describeConnectorCatalogStatus(props.status);

  return (
    <ProfileMenuStatusItem
      descriptor={descriptor}
      slot="terminal-connector-catalog-status"
    />
  );
}

function ProfileMenuStatusItem(props: {
  descriptor: ProfileMenuStatusDescriptor;
  slot: string;
}) {
  const { descriptor } = props;

  return (
    <div
      role="menuitem"
      aria-disabled="true"
      data-slot={props.slot}
      style={profileMenuStatusItemStyle}
    >
      <ProfileGlyph accent={descriptor.accent} label={descriptor.title} />
      <span style={profileMenuTextStyle}>
        <span style={profileMenuLabelStyle}>{descriptor.title}</span>
        <span style={profileMenuSubtitleStyle}>{descriptor.subtitle}</span>
      </span>
    </div>
  );
}

function ProfileMenuDivider() {
  return <div style={profileMenuDividerStyle} />;
}

function TabHeaderActions(props: {
  profileMenuOpen: boolean;
  onOpenNewTab: () => void;
  onToggleProfileMenu: () => void;
}) {
  return (
    <>
      <button
        type="button"
        data-tauri-drag-region="false"
        aria-label="New terminal tab"
        title="New terminal tab"
        onClick={props.onOpenNewTab}
        style={chromeButtonStyle()}
      >
        <PlusGlyph />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        aria-label="Open terminal profile menu"
        aria-haspopup="menu"
        aria-expanded={props.profileMenuOpen}
        onClick={props.onToggleProfileMenu}
        style={chromeButtonStyle(props.profileMenuOpen)}
      >
        <ChevronGlyph direction="down" />
      </button>
    </>
  );
}

function ProfileGlyph(props: {
  accent: string;
  label: string;
}) {
  return (
    <span aria-hidden="true" title={props.label} style={profileGlyphWrapStyle}>
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" style={profileGlyphStyle}>
        <rect
          x="1.5"
          y="2"
          width="13"
          height="10.5"
          rx="1.75"
          stroke={props.accent}
          strokeWidth="1.2"
        />
        <path
          d="M4.2 5.2L6.4 7.1L4.2 9"
          stroke={props.accent}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.4 9H11.4"
          stroke={props.accent}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function ChevronGlyph(props: {
  direction: "left" | "right" | "down";
}) {
  const path =
    props.direction === "left"
      ? "M10.5 3.5L5.5 8L10.5 12.5"
      : props.direction === "right"
        ? "M5.5 3.5L10.5 8L5.5 12.5"
        : "M3.5 6L8 10.5L12.5 6";

  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path
        d="M8 3.25V12.75M3.25 8H12.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MinimizeGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
      <path d="M3 8H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MaximizeGlyph(props: {
  maximized: boolean;
}) {
  if (!props.maximized) {
    return (
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
        <rect
          x="3.25"
          y="3.25"
          width="9.5"
          height="9.5"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
      <path
        d="M5.25 3.75H12.25V10.75M3.75 5.25H10.75V12.25H3.75V5.25Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DesktopWindowControls(props: {
  controller: DesktopWindowController;
}) {
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    async function bindWindowState() {
      if (!(await props.controller.isAvailable())) {
        if (active) {
          setAvailable(false);
          setIsWindowMaximized(false);
        }
        return;
      }

      try {
        const syncState = async () => {
          if (!active) {
            return;
          }

          setIsWindowMaximized(await props.controller.isMaximized());
        };

        await syncState();
        unsubscribe = await props.controller.subscribeMaximized((nextState) => {
          if (!active) {
            return;
          }

          setIsWindowMaximized(nextState);
        });

        if (active) {
          setAvailable(true);
        }
      } catch {
        if (active) {
          setAvailable(false);
          setIsWindowMaximized(false);
        }
      }
    }

    void bindWindowState();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [props.controller]);

  async function withWindowCommand(command: () => Promise<void>) {
    if (!available) {
      return;
    }

    await command();
    setIsWindowMaximized(await props.controller.isMaximized());
  }

  if (!available) {
    return null;
  }

  return (
    <div
      data-slot="terminal-window-controls"
      data-tauri-drag-region="false"
      style={windowControlsStyle}
    >
      <button
        type="button"
        data-tauri-drag-region="false"
        data-intent="default"
        aria-label="Minimize window"
        title="Minimize window"
        onClick={() => void withWindowCommand(props.controller.minimize)}
        style={windowControlButtonStyle()}
      >
        <MinimizeGlyph />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        data-intent="default"
        aria-label={isWindowMaximized ? "Restore window" : "Maximize window"}
        title={isWindowMaximized ? "Restore window" : "Maximize window"}
        onClick={() => void withWindowCommand(props.controller.toggleMaximize)}
        style={windowControlButtonStyle()}
      >
        <MaximizeGlyph maximized={isWindowMaximized} />
      </button>
      <button
        type="button"
        data-tauri-drag-region="false"
        data-intent="danger"
        aria-label="Close window"
        title="Close window"
        onClick={() => void withWindowCommand(props.controller.close)}
        style={windowControlButtonStyle("danger")}
      >
        <CloseGlyph />
      </button>
    </div>
  );
}

function resolveLaunchProfile(
  profiles: LaunchProfileDefinition[],
  profileId: TerminalShellProfile,
) {
  return (
    profiles.find(
      (entry) => entry.group === "shell" && entry.profile === profileId,
    ) ?? profiles[0]
  );
}

function joinTerminalEffectKey(parts: Array<string | number | boolean | null | undefined>) {
  return parts.map((part) => String(part ?? "")).join("\u001f");
}

function describeTerminalRuntimeBootstrapDependency(
  runtimeBootstrap: TerminalShellSnapshot["tabs"][number]["runtimeBootstrap"],
) {
  if (runtimeBootstrap.kind === "local-shell") {
    return "local-shell";
  }

  if (runtimeBootstrap.kind === "connector") {
    return joinTerminalEffectKey([
      "connector",
      runtimeBootstrap.request.workspaceId,
      runtimeBootstrap.request.target,
      runtimeBootstrap.request.authority,
      runtimeBootstrap.request.command.join("\u001e"),
      runtimeBootstrap.request.modeTags.join("\u001e"),
      runtimeBootstrap.request.tags.join("\u001e"),
    ]);
  }

  if (runtimeBootstrap.kind === "local-process") {
    return joinTerminalEffectKey([
      "local-process",
      runtimeBootstrap.request.workingDirectory,
      runtimeBootstrap.request.command.join("\u001e"),
    ]);
  }

  return joinTerminalEffectKey([
    "remote-runtime",
    runtimeBootstrap.request.workspaceId,
    runtimeBootstrap.request.target,
    runtimeBootstrap.request.authority,
    runtimeBootstrap.request.workingDirectory,
    runtimeBootstrap.request.command.join("\u001e"),
    runtimeBootstrap.request.modeTags.join("\u001e"),
    runtimeBootstrap.request.tags.join("\u001e"),
  ]);
}

function describeTerminalPendingRuntimeInputHead(
  queue: TerminalShellPendingRuntimeInput[],
) {
  const head = queue[0];
  if (!head) {
    return "";
  }

  if (head.kind === "text") {
    return joinTerminalEffectKey(["text", head.data]);
  }

  return joinTerminalEffectKey(["binary", head.inputBytes.join(",")]);
}

type RuntimeDerivedState = {
  snapshotTabById: Map<string, TerminalShellSnapshot["tabs"][number]>;
  runtimeBootstrapCandidateTabs: TerminalShellSnapshot["tabs"];
  runtimePendingInputTabs: TerminalShellSnapshot["tabs"];
  retryingTabsEffectKey: string;
  runtimeBootstrapEffectKey: string;
  runtimePendingInputEffectKey: string;
};

const runtimeDerivedStateCache = new WeakMap<
  TerminalShellSnapshot["tabs"],
  RuntimeDerivedState
>();

function createRuntimeDerivedState(
  tabs: TerminalShellSnapshot["tabs"],
) {
  const cachedDerivedState = runtimeDerivedStateCache.get(tabs);
  if (cachedDerivedState) {
    return cachedDerivedState;
  }

  const retryingTabIds: string[] = [];
  const runtimeBootstrapParts: string[] = [];
  const runtimePendingInputParts: string[] = [];
  const snapshotTabById = new Map<string, TerminalShellSnapshot["tabs"][number]>();
  const runtimeBootstrapCandidateTabs: TerminalShellSnapshot["tabs"] = [];
  const runtimePendingInputTabs: TerminalShellSnapshot["tabs"] = [];

  for (const tab of tabs) {
    snapshotTabById.set(tab.id, tab);
    if (tab.runtimeState === "retrying") {
      retryingTabIds.push(tab.id);
    }
    runtimeBootstrapParts.push(
      joinTerminalEffectKey([
        tab.id,
        tab.runtimeSessionId,
        tab.runtimeState,
        tab.runtimeBootstrapAttempts,
        tab.profile,
        tab.workingDirectory,
        tab.snapshot.viewport.cols,
        tab.snapshot.viewport.rows,
        describeTerminalRuntimeBootstrapDependency(tab.runtimeBootstrap),
      ]),
    );
    runtimePendingInputParts.push(
      joinTerminalEffectKey([
        tab.id,
        tab.runtimeSessionId,
        tab.runtimeState,
        tab.runtimeStreamStarted,
        tab.runtimePendingInputQueue.length,
        describeTerminalPendingRuntimeInputHead(tab.runtimePendingInputQueue),
      ]),
    );
    if (tab.runtimeState === "retrying" || (!tab.runtimeSessionId && tab.runtimeState === "idle")) {
      runtimeBootstrapCandidateTabs.push(tab);
    }
    if (
      tab.runtimeSessionId &&
      tab.runtimeState === "running" &&
      tab.runtimePendingInputQueue.length > 0
    ) {
      runtimePendingInputTabs.push(tab);
    }
  }

  const nextDerivedState: RuntimeDerivedState = {
    snapshotTabById,
    runtimeBootstrapCandidateTabs,
    runtimePendingInputTabs,
    retryingTabsEffectKey: retryingTabIds.join("\u001d"),
    runtimeBootstrapEffectKey: runtimeBootstrapParts.join("\u001d"),
    runtimePendingInputEffectKey: runtimePendingInputParts.join("\u001d"),
  };

  runtimeDerivedStateCache.set(tabs, nextDerivedState);
  return nextDerivedState;
}

function syncTabScrollState(
  container: HTMLDivElement | null,
  setLeft: (value: boolean) => void,
  setRight: (value: boolean) => void,
) {
  if (!container) {
    setLeft(false);
    setRight(false);
    return;
  }

  setLeft(container.scrollLeft > 0);
  setRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 2);
}

function scrollTabs(
  container: HTMLDivElement | null,
  direction: "left" | "right",
) {
  if (!container) {
    return;
  }

  const delta = direction === "left" ? -220 : 220;
  container.scrollBy({ left: delta, behavior: "smooth" });
}

const TERMINAL_CHROME_BACKGROUND = "#16181b";
const TERMINAL_ACTIVE_TAB_BACKGROUND = "#1f2329";
const TERMINAL_SURFACE_BACKGROUND = "#050607";
const TERMINAL_MENU_BACKGROUND = "rgba(22, 24, 27, 0.98)";

const rootStyle: CSSProperties = {
  width: "100%",
  minHeight: "100%",
  height: "100%",
  overflow: "hidden",
  background: TERMINAL_CHROME_BACKGROUND,
  color: "#d4d4d8",
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

const shellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minHeight: "100%",
  height: "100%",
  background: TERMINAL_CHROME_BACKGROUND,
};

const tabStripStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "stretch",
  minHeight: 38,
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  background: TERMINAL_CHROME_BACKGROUND,
  overflowX: "hidden",
  overflowY: "visible",
};

const headerLeadingStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  minWidth: 0,
  flex: 1,
  padding: "6px 0 0 8px",
};

const headerTrailingStyle: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  justifyContent: "flex-end",
  flex: "none",
  minWidth: 0,
};

function headerDragSpacerStyle(docked: boolean): CSSProperties {
  if (docked) {
    return {
      flex: "none",
      width: 0,
      minWidth: 0,
    };
  }

  return {
    flex: 1,
    minWidth: 16,
  };
}

function tabListStyle(docked: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-end",
    gap: 2,
    flex: docked ? 1 : "none",
    minWidth: 0,
    overflowX: "auto",
    scrollbarWidth: "none",
  };
}

const windowControlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  flex: "none",
};

const tabScrollButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 32,
  marginBottom: 1,
  border: "none",
  background: "transparent",
  color: "#71717a",
  cursor: "pointer",
  borderRadius: 6,
  flex: "none",
};

const activeTabAccentStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 2,
  background: "#6b7280",
};

const activeTabBottomMaskStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: -1,
  height: 1,
  background: TERMINAL_SURFACE_BACKGROUND,
};

const tabButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
  minWidth: 0,
  height: "100%",
  padding: "0 12px",
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};

const tabTitleStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 12,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
};

const tabExitedIndicatorStyle: CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "#f97316",
  opacity: 0.8,
  flex: "none",
};

const headerChromeStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 2,
  marginLeft: 2,
  marginBottom: 1,
  flex: "none",
  borderRadius: 8,
};

function chromeButtonStyle(active = false): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "none",
    background: active ? "rgba(255, 255, 255, 0.08)" : "transparent",
    color: active ? "#fafafa" : "#a1a1aa",
    cursor: "pointer",
    borderRadius: 6,
  };
}

function windowControlButtonStyle(intent: "default" | "danger" = "default"): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 46,
    height: "100%",
    minHeight: 38,
    border: "none",
    background: "transparent",
    color: intent === "danger" ? "#d4d4d8" : "#a1a1aa",
    cursor: "pointer",
  };
}

function resolveProfileMenuPosition(anchor: HTMLElement | null): ProfileMenuPosition | null {
  if (!anchor || typeof window === "undefined") {
    return null;
  }

  const rect = anchor.getBoundingClientRect();
  const availableBelow =
    window.innerHeight - rect.bottom - PROFILE_MENU_VERTICAL_OFFSET - PROFILE_MENU_VIEWPORT_INSET;
  const availableAbove =
    rect.top - PROFILE_MENU_VERTICAL_OFFSET - PROFILE_MENU_VIEWPORT_INSET;
  const openAbove =
    availableBelow < Math.min(PROFILE_MENU_ESTIMATED_HEIGHT, availableAbove);
  const maxHeight = Math.max(1, openAbove ? availableAbove : availableBelow);
  const top = openAbove
    ? Math.max(
        PROFILE_MENU_VIEWPORT_INSET,
        rect.top - PROFILE_MENU_VERTICAL_OFFSET - maxHeight,
      )
    : Math.min(
        rect.bottom + PROFILE_MENU_VERTICAL_OFFSET,
        window.innerHeight - PROFILE_MENU_VIEWPORT_INSET - maxHeight,
      );
  const maxLeft = Math.max(
    PROFILE_MENU_VIEWPORT_INSET,
    window.innerWidth - PROFILE_MENU_WIDTH - PROFILE_MENU_VIEWPORT_INSET,
  );
  const left = Math.min(
    Math.max(PROFILE_MENU_VIEWPORT_INSET, rect.right - PROFILE_MENU_WIDTH),
    maxLeft,
  );

  return {
    top,
    left,
    maxHeight,
  };
}

function profileMenuStyle(menu: ProfileMenuPosition): CSSProperties {
  return {
    position: "fixed",
    top: menu.top,
    left: menu.left,
    zIndex: 60,
    maxHeight: menu.maxHeight,
    overflowY: "auto",
    overscrollBehavior: "contain",
    display: "grid",
    gap: 6,
    minWidth: PROFILE_MENU_WIDTH,
    maxWidth: `min(${PROFILE_MENU_WIDTH}px, calc(100vw - ${PROFILE_MENU_VIEWPORT_INSET * 2}px))`,
    padding: 6,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: TERMINAL_MENU_BACKGROUND,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
  };
}

const profileMenuSectionStyle: CSSProperties = {
  display: "grid",
  gap: 2,
};

const profileMenuSectionTitleStyle: CSSProperties = {
  padding: "4px 10px",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#71717a",
};

const profileMenuDividerStyle: CSSProperties = {
  height: 1,
  background: "rgba(255, 255, 255, 0.08)",
};

const profileMenuItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  padding: "10px 12px",
  border: "none",
  background: "transparent",
  color: "#e4e4e7",
  cursor: "pointer",
  textAlign: "left",
};

const profileMenuStatusItemStyle: CSSProperties = {
  ...profileMenuItemStyle,
  cursor: "default",
  opacity: 0.92,
};

const profileMenuTextStyle: CSSProperties = {
  display: "grid",
  minWidth: 0,
};

const profileMenuLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#fafafa",
};

const profileMenuSubtitleStyle: CSSProperties = {
  fontSize: 11,
  color: "#71717a",
};

const profileGlyphWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 14,
  height: 14,
  flex: "none",
};

function contextMenuStyle(menu: TabContextMenuState): CSSProperties {
  return {
    position: "fixed",
    top: menu.y,
    left: menu.x,
    zIndex: 40,
    display: "grid",
    gap: 2,
    minWidth: 196,
    padding: 6,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    background: TERMINAL_MENU_BACKGROUND,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
  };
}

const contextMenuItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  padding: "10px 12px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#e4e4e7",
  cursor: "pointer",
  textAlign: "left",
  fontSize: 12,
};

const contextMenuDividerStyle: CSSProperties = {
  height: 1,
  margin: "2px 6px",
  background: "rgba(255, 255, 255, 0.08)",
};

const panelStackStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  background: TERMINAL_SURFACE_BACKGROUND,
  position: "relative",
  overflow: "hidden",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.02)",
};

function panelStyle(active: boolean): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    minHeight: 0,
    background: TERMINAL_SURFACE_BACKGROUND,
    visibility: active ? "visible" : "hidden",
    opacity: active ? 1 : 0,
    pointerEvents: active ? "auto" : "none",
  };
}

function tabShellStyle(
  active: boolean,
  hovered: boolean,
  docked: boolean,
): CSSProperties {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flex: docked ? "1 0 0" : "0 0 auto",
    minWidth: 140,
    maxWidth: 240,
    height: 32,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    background: active
      ? TERMINAL_ACTIVE_TAB_BACKGROUND
      : hovered
        ? "rgba(255, 255, 255, 0.05)"
        : "transparent",
    color: active ? "#fafafa" : "#a1a1aa",
    boxShadow: active ? "0 0 0 1px rgba(255, 255, 255, 0.02) inset" : "none",
    transition: "background 120ms ease, color 120ms ease, box-shadow 120ms ease",
  };
}

function tabCloseButtonStyle(active: boolean, visible: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    marginRight: 6,
    border: "none",
    borderRadius: 4,
    background: "transparent",
    color: active ? "#d4d4d8" : "#71717a",
    cursor: "pointer",
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 120ms ease",
  };
}

const profileGlyphStyle: CSSProperties = {
  display: "block",
  flex: "none",
};
