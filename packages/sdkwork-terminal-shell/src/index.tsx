import "@xterm/xterm/css/xterm.css";
import {
  type DesktopRuntimeBridgeClient,
  type WebRuntimeBridgeClient,
  createXtermViewportDriver,
  type RuntimeSessionReplaySnapshot,
  type RuntimeSessionStreamEvent,
  type TerminalViewportInput,
} from "@sdkwork/terminal-infrastructure";
import {
  applyTerminalShellReplayBatches,
  applyTerminalShellReplayEntries,
  applyTerminalShellExecutionFailure,
  applyTerminalShellExecutionResult,
  appendTerminalShellCommandText,
  appendTerminalShellPendingRuntimeInput,
  activateTerminalShellTab,
  backspaceTerminalShellCommandText,
  bindTerminalShellSessionRuntime,
  canQueueTerminalShellRuntimeInput,
  clearTerminalShellRuntimeContent,
  consumeTerminalShellPendingRuntimeInput,
  closeTerminalShellTab,
  closeTerminalShellTabsExcept,
  closeTerminalShellTabsToRight,
  createTerminalShellState,
  deleteTerminalShellCommandForward,
  duplicateTerminalShellTab,
  getTerminalShellSnapshot,
  markTerminalShellSessionRuntimeBinding,
  measureTerminalTabStripContentWidth,
  moveTerminalShellCommandCursor,
  openTerminalShellTab,
  queueTerminalShellTabBootstrapCommand,
  queueTerminalShellTabRuntimeBootstrapRetry,
  recallNextTerminalShellCommand,
  recallPreviousTerminalShellCommand,
  resolveTerminalShellRuntimeClientKind,
  resolveTerminalShellRuntimeBootstrapRequestFromTab,
  resolveTerminalStageBehavior,
  resumeTerminalShellTabRuntimeBootstrap,
  restartTerminalShellTabRuntime,
  resolveTerminalTabActionInlineWidth,
  resizeTerminalShellTab,
  runTerminalShellCommand,
  selectTerminalShellMatch,
  setTerminalShellCommandText,
  setTerminalShellTabTitle,
  setTerminalShellSearchQuery,
  shouldUseTerminalShellFallbackMode,
  shouldUseTerminalShellRuntimeStream,
  shouldAutoRetryTerminalShellBootstrap,
  shouldDockTerminalTabActions,
  submitTerminalShellCommand,
  type OpenTerminalShellTabOptions,
  type TerminalShellPendingRuntimeInput,
  type TerminalShellProfile,
  type TerminalShellSnapshot,
  type TerminalShellState,
} from "./model";
import {
  createTerminalRuntimeInputPreview,
  shouldBypassTerminalRuntimeInputQueue,
  resolveTerminalRuntimePollInterval,
  shouldFlushTerminalRuntimeInputQueue,
} from "./runtime";
import type { TerminalViewport } from "@sdkwork/terminal-core";
import type {
  ConnectorSessionLaunchRequest,
  RemoteRuntimeSessionCreateRequest,
} from "@sdkwork/terminal-types";
import {
  memo,
  startTransition,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

interface LaunchProfileDefinition {
  id: string;
  group: "shell" | "cli";
  profile: TerminalShellProfile;
  label: string;
  subtitle: string;
  accent: string;
  openOptions?: OpenTerminalShellTabOptions;
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
  profile: TerminalShellProfile;
  title: string;
  targetLabel: string;
}

export interface DesktopConnectorSessionIntent {
  requestId: string;
  profile: TerminalShellProfile;
  title: string;
  targetLabel: string;
  request: ConnectorSessionLaunchRequest;
}

export interface DesktopConnectorLaunchEntry {
  targetId: string;
  label: string;
  subtitle: string;
  accent: string;
}

export interface WebRuntimeTarget {
  workspaceId: string;
  authority: string;
  target: RemoteRuntimeSessionCreateRequest["target"];
  workingDirectory?: string;
  modeTags?: RemoteRuntimeSessionCreateRequest["modeTags"];
  tags?: string[];
}

interface TabContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

interface HeaderLayoutMetrics {
  leadingWidth: number;
  tabListWidth: number;
  actionWidth: number;
}

interface RuntimeSessionBinding {
  tabId: string;
  attachmentId?: string | null;
  cursor?: string;
}

interface QueuedRuntimeReplayBatch {
  sessionId: string;
  tabId: string;
  nextCursor: string;
  entries: Parameters<typeof applyTerminalShellReplayEntries>[2]["entries"];
  maxSequence: number;
}

type SharedRuntimeClient = {
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
};

const TERMINAL_HEADER_RESERVE_WIDTH = 40;
const TERMINAL_HEADER_ACTION_FALLBACK_WIDTH = 60;
const DESKTOP_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT = 1;
const DESKTOP_RUNTIME_BOOTSTRAP_RETRY_DELAY_MS = 220;

function detectDefaultDesktopProfile(): TerminalShellProfile {
  if (typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent)) {
    return "powershell";
  }
  return "bash";
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
    subtitle: "POSIX login shell",
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
    profile: "bash",
    label: "Codex CLI",
    subtitle: "Open Codex in a local terminal tab",
    accent: "#2563eb",
    openOptions: {
      profile: "bash",
      title: "Codex",
      commandText: "codex",
      targetLabel: "codex / local cli",
    },
  },
  {
    id: "claude-code",
    group: "cli",
    profile: "bash",
    label: "Claude Code",
    subtitle: "Open Claude Code in a local terminal tab",
    accent: "#ea580c",
    openOptions: {
      profile: "bash",
      title: "Claude Code",
      commandText: "claude",
      targetLabel: "claude / local cli",
    },
  },
  {
    id: "gemini-cli",
    group: "cli",
    profile: "bash",
    label: "Gemini CLI",
    subtitle: "Open Gemini CLI in a local terminal tab",
    accent: "#1d4ed8",
    openOptions: {
      profile: "bash",
      title: "Gemini CLI",
      commandText: "gemini",
      targetLabel: "gemini / local cli",
    },
  },
  {
    id: "opencode-cli",
    group: "cli",
    profile: "bash",
    label: "OpenCode CLI",
    subtitle: "Open OpenCode in a local terminal tab",
    accent: "#059669",
    openOptions: {
      profile: "bash",
      title: "OpenCode",
      commandText: "opencode",
      targetLabel: "opencode / local cli",
    },
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

export function ShellApp(props: {
  mode: "desktop" | "web";
  desktopRuntimeClient?: Pick<
    DesktopRuntimeBridgeClient,
    | "detachSessionAttachment"
    | "createConnectorInteractiveSession"
    | "createLocalShellSession"
    | "writeSessionInput"
    | "writeSessionInputBytes"
    | "acknowledgeSessionAttachment"
    | "resizeSession"
    | "terminateSession"
    | "sessionReplay"
    | "subscribeSessionEvents"
  >;
  webRuntimeClient?: Pick<
    WebRuntimeBridgeClient,
    | "createRemoteRuntimeSession"
    | "writeSessionInput"
    | "writeSessionInputBytes"
    | "resizeSession"
    | "terminateSession"
    | "sessionReplay"
    | "subscribeSessionEvents"
  >;
  webRuntimeTarget?: WebRuntimeTarget;
  desktopWindowController?: DesktopWindowController;
  sessionCenterEnabled?: boolean;
  sessionCenterOpen?: boolean;
  onToggleSessionCenter?: () => void;
  desktopSessionReattachIntent?: DesktopSessionReattachIntent | null;
  desktopConnectorSessionIntent?: DesktopConnectorSessionIntent | null;
  desktopConnectorEntries?: DesktopConnectorLaunchEntry[];
  onLaunchDesktopConnectorEntry?: (entryId: string) => void;
  onBeforeProfileMenuOpen?: () => void;
}) {
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
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(null);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [headerLayoutMetrics, setHeaderLayoutMetrics] = useState<HeaderLayoutMetrics>({
    leadingWidth: 0,
    tabListWidth: 0,
    actionWidth: TERMINAL_HEADER_ACTION_FALLBACK_WIDTH,
  });
  const headerLeadingRef = useRef<HTMLDivElement | null>(null);
  const headerChromeRef = useRef<HTMLDivElement | null>(null);
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
  const runtimeSessionBindingsRef = useRef<Map<string, RuntimeSessionBinding>>(new Map());
  const runtimeSessionUnlistenRef = useRef<
    Map<string, () => void | Promise<void>>
  >(new Map());
  const runtimeSubscriptionFailureSessionIdsRef = useRef<Set<string>>(new Set());
  const runtimeSessionReplayInFlightRef = useRef<Set<string>>(new Set());
  const runtimeInputWriteChainsRef = useRef<Map<string, Promise<void>>>(new Map());
  const runtimeReplayBatchRef = useRef<Map<string, QueuedRuntimeReplayBatch>>(new Map());
  const runtimeReplayFlushHandleRef = useRef<number | null>(null);
  const runtimeReplayFlushHandleKindRef = useRef<"raf" | "timeout" | null>(null);
  const launchProfiles =
    props.mode === "desktop" ? DESKTOP_LAUNCH_PROFILES : WEB_LAUNCH_PROFILES;
  const snapshot = getTerminalShellSnapshot(shellState);
  const activeTab = snapshot.activeTab;
  const isDesktopShell = props.mode === "desktop";
  const pendingTabIdsRef = useRef<Set<string>>(new Set());
  const runtimeDerivedState = createRuntimeDerivedState(snapshot.tabs);
  const runtimeBindingEffectKey = runtimeDerivedState.runtimeBindingEffectKey;
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

  function resolveTabSnapshotById(tabId: string) {
    return snapshotTabById.get(tabId) ?? null;
  }

  function toggleProfileMenu() {
    setContextMenu(null);
    if (!profileMenuOpen) {
      props.onBeforeProfileMenuOpen?.();
    }
    setProfileMenuOpen((current) => !current);
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
    return () => {
      mountedRef.current = false;
      for (const binding of runtimeSessionBindingsRef.current.values()) {
        if (!binding.attachmentId) {
          continue;
        }

        void desktopRuntimeClientRef.current?.detachSessionAttachment?.({
          attachmentId: binding.attachmentId,
        });
      }
      for (const timer of runtimeBootstrapRetryTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      runtimeBootstrapRetryTimersRef.current.clear();
      viewportCopyHandlersRef.current.clear();
      viewportPasteHandlersRef.current.clear();
      for (const unlisten of runtimeSessionUnlistenRef.current.values()) {
        void unlisten();
      }
      runtimeSessionUnlistenRef.current.clear();
      runtimeSessionBindingsRef.current.clear();
      runtimeSubscriptionFailureSessionIdsRef.current.clear();
      runtimeSessionReplayInFlightRef.current.clear();
      runtimeInputWriteChainsRef.current.clear();
      runtimeReplayBatchRef.current.clear();
      clearQueuedDesktopRuntimeReplayFlush();
    };
  }, []);

  useEffect(() => {
    const nextBindings = new Map<string, RuntimeSessionBinding>();

    for (const tab of runtimeDerivedState.runtimeBootstrapCandidateTabs) {
      if (
        !tab.runtimeSessionId ||
        (tab.runtimeState !== "running" && tab.runtimeState !== "binding")
      ) {
        continue;
      }

      nextBindings.set(tab.runtimeSessionId, {
        tabId: tab.id,
        attachmentId: tab.runtimeAttachmentId ?? undefined,
        cursor: tab.runtimeCursor ?? undefined,
      });
    }

    runtimeSessionBindingsRef.current = nextBindings;
  }, [runtimeBindingEffectKey]);

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

  function updateRuntimeSessionCursor(sessionId: string, nextCursor: string) {
    const binding = runtimeSessionBindingsRef.current.get(sessionId);
    if (!binding) {
      return;
    }

    runtimeSessionBindingsRef.current.set(sessionId, {
      ...binding,
      cursor: nextCursor,
    });
  }

  async function acknowledgeDesktopRuntimeSessionAttachment(args: {
    sessionId: string;
    sequence: number;
  }) {
    if (!props.desktopRuntimeClient) {
      return;
    }

    const binding = runtimeSessionBindingsRef.current.get(args.sessionId);
    if (!binding?.attachmentId || args.sequence <= 0) {
      return;
    }

    try {
      const attachment = await props.desktopRuntimeClient.acknowledgeSessionAttachment({
        attachmentId: binding.attachmentId,
        sequence: args.sequence,
      });
      if (!mountedRef.current) {
        return;
      }

      runtimeSessionBindingsRef.current.set(args.sessionId, {
        ...binding,
        attachmentId: attachment.attachmentId,
        cursor: attachment.cursor,
      });
    } catch {
      // Attachment ack is best-effort; replay application must stay hot-path safe.
    }
  }

  function applyDesktopRuntimeReplay(
    sessionId: string,
    tabId: string,
    nextCursor: string,
    entries: Parameters<typeof applyTerminalShellReplayEntries>[2]["entries"],
  ) {
    if (entries.length === 0) {
      return;
    }

    updateRuntimeSessionCursor(sessionId, nextCursor);
    updateShellStateDeferred((current) =>
      applyTerminalShellReplayEntries(current, tabId, {
        nextCursor,
        entries,
      }),
    );
  }

  function clearQueuedDesktopRuntimeReplayFlush() {
    const handle = runtimeReplayFlushHandleRef.current;
    const kind = runtimeReplayFlushHandleKindRef.current;
    if (handle == null || kind == null) {
      return;
    }

    if (kind === "raf" && typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(handle);
    } else {
      window.clearTimeout(handle);
    }

    runtimeReplayFlushHandleRef.current = null;
    runtimeReplayFlushHandleKindRef.current = null;
  }

  function flushQueuedDesktopRuntimeReplay() {
    runtimeReplayFlushHandleRef.current = null;
    runtimeReplayFlushHandleKindRef.current = null;

    const batches = Array.from(runtimeReplayBatchRef.current.values());
    runtimeReplayBatchRef.current.clear();
    if (!mountedRef.current || batches.length === 0) {
      return;
    }

    updateShellStateDeferred((current) =>
      applyTerminalShellReplayBatches(current, batches),
    );

    if (props.mode === "desktop") {
      for (const batch of batches) {
        if (batch.maxSequence <= 0) {
          continue;
        }

        void acknowledgeDesktopRuntimeSessionAttachment({
          sessionId: batch.sessionId,
          sequence: batch.maxSequence,
        });
      }
    }
  }

  function scheduleQueuedDesktopRuntimeReplayFlush() {
    if (runtimeReplayFlushHandleRef.current != null) {
      return;
    }

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      runtimeReplayFlushHandleKindRef.current = "raf";
      runtimeReplayFlushHandleRef.current = window.requestAnimationFrame(() => {
        void flushQueuedDesktopRuntimeReplay();
      });
      return;
    }

    runtimeReplayFlushHandleKindRef.current = "timeout";
    runtimeReplayFlushHandleRef.current = window.setTimeout(() => {
      void flushQueuedDesktopRuntimeReplay();
    }, 16);
  }

  function queueDesktopRuntimeReplay(
    sessionId: string,
    tabId: string,
    nextCursor: string,
    entry: Parameters<typeof applyTerminalShellReplayEntries>[2]["entries"][number],
  ) {
    updateRuntimeSessionCursor(sessionId, nextCursor);

    const existing = runtimeReplayBatchRef.current.get(sessionId);
    if (existing && existing.tabId === tabId) {
      existing.nextCursor = nextCursor;
      existing.entries.push(entry);
      existing.maxSequence = Math.max(existing.maxSequence, entry.sequence);
    } else {
      runtimeReplayBatchRef.current.set(sessionId, {
        sessionId,
        tabId,
        nextCursor,
        entries: [entry],
        maxSequence: entry.sequence,
      });
    }

    scheduleQueuedDesktopRuntimeReplayFlush();
  }

  async function catchUpRuntimeSession(sessionId: string) {
    if (!mountedRef.current) {
      return;
    }

    if (runtimeSessionReplayInFlightRef.current.has(sessionId)) {
      return;
    }

    const binding = runtimeSessionBindingsRef.current.get(sessionId);
    if (!binding) {
      return;
    }

    const tab = resolveTabSnapshotById(binding.tabId);
    if (!tab) {
      return;
    }

    const runtimeClient = resolveTabRuntimeClient(tab);
    if (!runtimeClient) {
      return;
    }

    runtimeSessionReplayInFlightRef.current.add(sessionId);
    try {
      const replay = await runtimeClient.sessionReplay(sessionId, {
        fromCursor: binding.cursor,
        limit: 64,
      });
      if (!mountedRef.current) {
        return;
      }

      if (replay.entries.length === 0) {
        updateRuntimeSessionCursor(sessionId, replay.nextCursor);
        return;
      }

      applyDesktopRuntimeReplay(sessionId, binding.tabId, replay.nextCursor, replay.entries);
      const latestReplayEntry = replay.entries[replay.entries.length - 1];
      if (latestReplayEntry && props.mode === "desktop") {
        void acknowledgeDesktopRuntimeSessionAttachment({
          sessionId,
          sequence: latestReplayEntry.sequence,
        });
      }
    } catch {
      // Avoid spamming the terminal surface with replay repair noise.
    } finally {
      runtimeSessionReplayInFlightRef.current.delete(sessionId);
    }
  }

  useEffect(() => {
    for (const tab of runtimeDerivedState.runtimePendingInputTabs) {
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
    const subscribeSessionEvents =
      props.mode === "desktop"
        ? props.desktopRuntimeClient?.subscribeSessionEvents
        : props.webRuntimeClient?.subscribeSessionEvents;

    if (!subscribeSessionEvents) {
      for (const unlisten of runtimeSessionUnlistenRef.current.values()) {
        void unlisten();
      }
      runtimeSessionUnlistenRef.current.clear();
      runtimeSubscriptionFailureSessionIdsRef.current.clear();
      return;
    }

    const desiredSessionIds = new Set(runtimeSessionBindingsRef.current.keys());

    for (const [sessionId, unlisten] of runtimeSessionUnlistenRef.current.entries()) {
      if (desiredSessionIds.has(sessionId)) {
        continue;
      }

      void unlisten();
      runtimeSessionUnlistenRef.current.delete(sessionId);
      runtimeSubscriptionFailureSessionIdsRef.current.delete(sessionId);
    }

    for (const [sessionId] of runtimeSessionBindingsRef.current.entries()) {
      if (runtimeSessionUnlistenRef.current.has(sessionId)) {
        continue;
      }

      void subscribeSessionEvents(sessionId, (event) => {
          if (!mountedRef.current) {
            return;
          }

          const binding = runtimeSessionBindingsRef.current.get(event.sessionId);
          if (!binding) {
            return;
          }

          queueDesktopRuntimeReplay(event.sessionId, binding.tabId, event.nextCursor, event.entry);
        })
        .then((unlisten) => {
          if (!mountedRef.current || !runtimeSessionBindingsRef.current.has(sessionId)) {
            void unlisten();
            return;
          }

          runtimeSubscriptionFailureSessionIdsRef.current.delete(sessionId);
          runtimeSessionUnlistenRef.current.set(sessionId, unlisten);
          void catchUpRuntimeSession(sessionId);
        })
        .catch((err) => {
          console.error("[sdkwork-terminal] subscribe to session events failed for", sessionId, err);
          if (!mountedRef.current) {
            return;
          }

          const binding = runtimeSessionBindingsRef.current.get(sessionId);
          if (!binding) {
            return;
          }

          runtimeSubscriptionFailureSessionIdsRef.current.add(sessionId);
          void catchUpRuntimeSession(sessionId);
        });
    }
  }, [props.desktopRuntimeClient, props.mode, props.webRuntimeClient, runtimeBindingEffectKey]);

  useEffect(() => {
    const runtimeClient =
      props.mode === "desktop" ? props.desktopRuntimeClient : props.webRuntimeClient;
    if (!runtimeClient) {
      return;
    }

    let cancelled = false;

    const pollRuntimeSessions = () => {
      for (const [sessionId] of runtimeSessionBindingsRef.current.entries()) {
        void catchUpRuntimeSession(sessionId).then(() => {
          if (cancelled) {
            return;
          }
        });
      }
    };

    pollRuntimeSessions();
    let timer = 0;

    const scheduleNextPoll = () => {
      const pollInterval = resolveTerminalRuntimePollInterval({
        supportsSubscription: Boolean(runtimeClient.subscribeSessionEvents),
        boundSessionCount: runtimeSessionBindingsRef.current.size,
        subscribedSessionCount: runtimeSessionUnlistenRef.current.size,
        failedSubscriptionCount: runtimeSubscriptionFailureSessionIdsRef.current.size,
      });

      timer = window.setTimeout(() => {
        pollRuntimeSessions();
        if (!cancelled) {
          scheduleNextPoll();
        }
      }, pollInterval);
    };

    scheduleNextPoll();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [props.desktopRuntimeClient, props.mode, props.webRuntimeClient, runtimeBindingEffectKey]);

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
    function handlePointerDown(event: MouseEvent) {
      if (!headerChromeRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }

      if (!contextMenuRef.current?.contains(event.target as Node)) {
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
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;

      if (ctrl && shift && event.key === "T") {
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

      if (ctrl && !shift && event.key === "w") {
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

      if (ctrl && event.key === "Tab") {
        event.preventDefault();
        const currentIdx = snapshot.tabs.findIndex((t) => t.id === activeTab.id);
        if (currentIdx < 0) {
          return;
        }
        const nextIdx = shift
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

  function openLaunchEntry(entry: LaunchProfileDefinition) {
    setProfileMenuOpen(false);
    setContextMenu(null);
    updateShellState((current) =>
      openTerminalShellTab(
        current,
        resolveTabOpenOptions({
          ...(entry.openOptions ?? { profile: entry.profile }),
          viewport: activeTab.snapshot.viewport,
        }),
      ),
    );
  }

  function openDesktopConnectorEntry(entry: DesktopConnectorLaunchEntry) {
    setProfileMenuOpen(false);
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

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      const targetTab = snapshot.tabs.find((tab) => tab.id === targetTabId) ?? activeTab;
      const selectionText = targetTab.copiedText;
      if (selectionText.length > 0) {
        void navigator.clipboard.writeText(selectionText);
      }
    } catch {
      // Clipboard access is best-effort
    }
  }

  function handleContextMenuPaste() {
    const targetTabId = contextMenu?.tabId ?? activeTab.id;
    setContextMenu(null);
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      void navigator.clipboard.readText().then((text) => {
        if (text.length === 0) {
          return;
        }
        const MAX_PASTE_LENGTH = 32768;
        const safeText = text.length > MAX_PASTE_LENGTH ? text.slice(0, MAX_PASTE_LENGTH) : text;
        const pasteHandler = viewportPasteHandlersRef.current.get(targetTabId);
        if (pasteHandler) {
          void pasteHandler(safeText);
          return;
        }

        handleViewportInputByTabId(targetTabId, {
          kind: "text",
          data: safeText,
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

    pendingTabIdsRef.current.delete(tab.id);
    updateShellState((current) =>
      restartTerminalShellTabRuntime(current, tab.id, {
        preservePendingInput: tab.runtimeState === "failed",
      }),
    );
  }

  async function runTabCommandById(tabId: string) {
    const tab = resolveTabSnapshotById(tabId);
    if (!tab) {
      return;
    }

    if (pendingTabIdsRef.current.has(tab.id)) {
      return;
    }

    const runtimeClient = resolveTabRuntimeClient(tab);
    if (!runtimeClient || !tab.runtimeSessionId) {
      if (
        !shouldUseTerminalShellFallbackMode({
          mode: props.mode,
          runtimeBootstrap: tab.runtimeBootstrap,
          runtimeSessionId: tab.runtimeSessionId,
        })
      ) {
        return;
      }

      updateShellState((current) => runTerminalShellCommand(current, tab.id));
      return;
    }

    updateShellState((current) => submitTerminalShellCommand(current, tab.id));
    pendingTabIdsRef.current.add(tab.id);

    try {
      await runtimeClient.writeSessionInput({
        sessionId: tab.runtimeSessionId,
        input: `${tab.commandText}\r`,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      updateShellState((current) =>
        applyTerminalShellExecutionFailure(current, tab.id, message),
      );
    } finally {
      pendingTabIdsRef.current.delete(tab.id);
    }
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

    const data = inputEvent.data;
    if (data === "\r") {
      void runTabCommandById(tab.id);
      return;
    }

    if (data === "\u007F" || data === "\b") {
      updateShellState((current) => backspaceTerminalShellCommandText(current, tab.id));
      return;
    }

    if (data === "\u0003") {
      updateShellState((current) => {
        const next = setTerminalShellCommandText(current, tab.id, "");
        const targetTab = next.tabs.find((t) => t.id === tab.id);
        if (targetTab) {
          targetTab.adapter.writeOutput("^C");
          targetTab.adapter.search(targetTab.searchQuery);
        }
        return next;
      });
      return;
    }

    if (data === "\u0015") {
      updateShellState((current) => {
        const next = setTerminalShellCommandText(current, tab.id, "");
        const targetTab = next.tabs.find((t) => t.id === tab.id);
        if (targetTab && tab.commandText.length > 0) {
          targetTab.adapter.writeOutput("^U");
          targetTab.adapter.search(targetTab.searchQuery);
        }
        return next;
      });
      return;
    }

    if (data === "\u000c") {
      return;
    }

    if (data === "\u001b[D") {
      updateShellState((current) => moveTerminalShellCommandCursor(current, tab.id, "left"));
      return;
    }

    if (data === "\u001b[C") {
      updateShellState((current) => moveTerminalShellCommandCursor(current, tab.id, "right"));
      return;
    }

    if (data === "\u001b[H") {
      updateShellState((current) => moveTerminalShellCommandCursor(current, tab.id, "home"));
      return;
    }

    if (data === "\u001b[F") {
      updateShellState((current) => moveTerminalShellCommandCursor(current, tab.id, "end"));
      return;
    }

    if (data === "\u001b[1~") {
      updateShellState((current) => moveTerminalShellCommandCursor(current, tab.id, "home"));
      return;
    }

    if (data === "\u001b[4~") {
      updateShellState((current) => moveTerminalShellCommandCursor(current, tab.id, "end"));
      return;
    }

    if (data === "\u001b[3~") {
      updateShellState((current) => deleteTerminalShellCommandForward(current, tab.id));
      return;
    }

    if (data === "\u001b[A") {
      updateShellState((current) =>
        recallPreviousTerminalShellCommand(current, tab.id),
      );
      return;
    }

    if (data === "\u001b[B") {
      updateShellState((current) => recallNextTerminalShellCommand(current, tab.id));
      return;
    }

    if (isPrintableViewportInput(data)) {
      const safeChunk = data.replace(/[\r\n].*/s, "");
      if (safeChunk.length > 0) {
        updateShellState((current) => appendTerminalShellCommandText(current, tab.id, safeChunk));
      }
    }
  }

  return (
    <main data-shell-layout="terminal-tabs" style={rootStyle}>
      <style>{terminalViewportChromeCss}</style>
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

                {profileMenuOpen ? (
                  <div role="menu" aria-label="Terminal profiles" style={profileMenuStyle}>
                    <ProfileMenuSection
                      title="Shells"
                      entries={launchProfiles.filter((entry) => entry.group === "shell")}
                      onSelect={openLaunchEntry}
                    />
                    <ProfileMenuDivider />
                    <ProfileMenuSection
                      title="AI CLI"
                      entries={launchProfiles.filter((entry) => entry.group === "cli")}
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
                    {props.sessionCenterEnabled && props.onToggleSessionCenter ? (
                      <>
                        <ProfileMenuDivider />
                        <button
                          type="button"
                          role="menuitem"
                          data-slot="terminal-session-center-trigger"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            props.onToggleSessionCenter?.();
                          }}
                          style={profileMenuItemStyle}
                        >
                          <ProfileGlyph accent="#38bdf8" label="Session Center" />
                          <span style={profileMenuTextStyle}>
                            <span style={profileMenuLabelStyle}>Session Center</span>
                            <span style={profileMenuSubtitleStyle}>
                              Reconnect detached shell sessions
                            </span>
                          </span>
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
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

                {profileMenuOpen ? (
                  <div role="menu" aria-label="Terminal profiles" style={profileMenuStyle}>
                    <ProfileMenuSection
                      title="Shells"
                      entries={launchProfiles.filter((entry) => entry.group === "shell")}
                      onSelect={openLaunchEntry}
                    />
                    <ProfileMenuDivider />
                    <ProfileMenuSection
                      title="AI CLI"
                      entries={launchProfiles.filter((entry) => entry.group === "cli")}
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
                    {props.sessionCenterEnabled && props.onToggleSessionCenter ? (
                      <>
                        <ProfileMenuDivider />
                        <button
                          type="button"
                          role="menuitem"
                          data-slot="terminal-session-center-trigger"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            props.onToggleSessionCenter?.();
                          }}
                          style={profileMenuItemStyle}
                        >
                          <ProfileGlyph accent="#38bdf8" label="Session Center" />
                          <span style={profileMenuTextStyle}>
                            <span style={profileMenuLabelStyle}>Session Center</span>
                            <span style={profileMenuSubtitleStyle}>
                              Reconnect detached shell sessions
                            </span>
                          </span>
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null}
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
                onRestartRuntime={() => handleRestartRuntimeTabById(tab.id)}
                onClearRuntimeContent={() =>
                  updateShellState((current) =>
                    clearTerminalShellRuntimeContent(current, tab.id),
                  )
                }
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

function TerminalStage(props: {
  mode: "desktop" | "web";
  tabId: string;
  tab: TerminalShellSnapshot["activeTab"];
  active: boolean;
  onViewportInput: (input: TerminalViewportInput) => void;
  onRegisterViewportCopyHandler: (
    handler: (() => Promise<void>) | null,
  ) => void;
  onRegisterViewportPasteHandler: (
    handler: ((text: string) => Promise<void>) | null,
  ) => void;
  onViewportTitleChange: (title: string) => void;
  onRestartRuntime: () => void;
  onClearRuntimeContent?: () => void;
  onSearchQueryChange: (query: string) => void;
  onSearchSelectMatch: () => void;
  onViewportResize: (viewport: TerminalViewport) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const hiddenInputRef = useRef<HTMLTextAreaElement | null>(null);
  const driverRef = useRef<ReturnType<typeof createXtermViewportDriver> | null>(null);
  if (!driverRef.current) {
    driverRef.current = createXtermViewportDriver();
  }
  const driver = driverRef.current;
  const latestViewportRef = useRef(props.tab.snapshot.viewport);
  const latestResizeHandlerRef = useRef(props.onViewportResize);
  const latestActiveRef = useRef(props.active);
  const latestInputHandlerRef = useRef(props.onViewportInput);
  const latestTitleHandlerRef = useRef(props.onViewportTitleChange);
  const latestSnapshotRef = useRef(props.tab.snapshot);
  const latestRuntimeTerminalContentRef = useRef(props.tab.runtimeTerminalContent);
  const measureViewportRef = useRef<(() => Promise<void>) | null>(null);
  const renderedRuntimeContentRef = useRef("");
  const runtimeContentSyncActiveRef = useRef(props.active);
  const queuedRuntimeAppendRef = useRef("");
  const runtimeAppendFlushHandleRef = useRef<number | null>(null);
  const wasRuntimeTerminalRef = useRef(false);
  const wasContentTruncatedRef = useRef(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [viewportContextMenu, setViewportContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [fontSize, setFontSize] = useState(14);
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
  const latestStageBehaviorRef = useRef({
    usesRuntimeTerminalStream,
    showLivePrompt,
    showBootstrapOverlay,
  });
  const hasAttachedRef = useRef(false);
  const attachViewportRef = useRef<(() => Promise<void>) | null>(null);
  const attachPromiseRef = useRef<Promise<void> | null>(null);
  const runtimeStatusIsRetrying =
    props.tab.runtimeState === "retrying" ||
    (props.tab.runtimeState === "binding" && props.tab.runtimeBootstrapAttempts > 1);
  const runtimeAutoRetryExhausted =
    props.tab.runtimeState === "failed" &&
    props.tab.runtimeBootstrapAttempts > DESKTOP_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT;
  const showRuntimeStatus =
    usesRuntimeTerminalStream &&
    (props.tab.runtimeState === "retrying" ||
     props.tab.runtimeState === "exited" ||
     props.tab.runtimeState === "failed" ||
     ((!showBootstrapOverlay) &&
      (props.tab.runtimeState === "binding" ||
       props.tab.runtimePendingInput.length > 0 ||
       props.tab.runtimePendingInputQueue.length > 0)));
  const runtimeStatusTitle =
    runtimeStatusIsRetrying ? "Retrying shell" :
    props.tab.runtimeState === "binding" ? "Starting shell" :
    props.tab.runtimeState === "exited" ? "Shell exited" :
    props.tab.runtimeState === "failed" ? "Shell failed" :
    "Input queued";
  const bootstrapStatusTitle =
    runtimeStatusIsRetrying ? "Retrying shell" :
    props.tab.runtimeState === "binding" ? "Starting shell" :
    "Preparing shell";
  const runtimeStatusDetail =
    runtimeStatusIsRetrying
      ? props.tab.runtimeBootstrapLastError
        ? `Previous launch failed: ${props.tab.runtimeBootstrapLastError}. Retrying automatically.`
        : "Previous launch failed. Retrying automatically."
      : props.tab.runtimeState === "binding"
      ? `${props.tab.title} attached to ${props.tab.targetLabel}`
      : props.tab.runtimeState === "exited"
        ? `Process exited${props.tab.lastExitCode != null ? ` with code ${props.tab.lastExitCode}` : ""}. Close this tab or open a new one.`
        : props.tab.runtimeState === "failed"
          ? runtimeAutoRetryExhausted
            ? "Automatic retry was exhausted. Restart shell to try again."
            : "Session failed to start. Restart shell to try again."
          : `${describePendingRuntimeInput(
              props.tab.runtimePendingInputQueue,
              props.tab.runtimePendingInput,
            )} waiting for PTY write`;
  const bootstrapStatusDetail = runtimeStatusIsRetrying
    ? runtimeStatusDetail
    : `${props.tab.title} attached to ${props.tab.targetLabel}`;

  function clearQueuedRuntimeAppendFlush() {
    if (runtimeAppendFlushHandleRef.current == null) {
      return;
    }

    if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(runtimeAppendFlushHandleRef.current);
    } else {
      window.clearTimeout(runtimeAppendFlushHandleRef.current);
    }
    runtimeAppendFlushHandleRef.current = null;
  }

  async function flushQueuedRuntimeAppend() {
    runtimeAppendFlushHandleRef.current = null;
    const queuedAppend = queuedRuntimeAppendRef.current;
    queuedRuntimeAppendRef.current = "";
    if (queuedAppend.length === 0) {
      return;
    }

    await driver.writeRaw(queuedAppend);
  }

  function scheduleQueuedRuntimeAppendFlush() {
    if (runtimeAppendFlushHandleRef.current != null) {
      return;
    }

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      runtimeAppendFlushHandleRef.current = window.requestAnimationFrame(() => {
        void flushQueuedRuntimeAppend();
      });
      return;
    }

    runtimeAppendFlushHandleRef.current = window.setTimeout(() => {
      void flushQueuedRuntimeAppend();
    }, 16);
  }

  useEffect(() => {
    latestViewportRef.current = props.tab.snapshot.viewport;
  }, [props.tab.snapshot.viewport.cols, props.tab.snapshot.viewport.rows]);

  useEffect(() => {
    latestResizeHandlerRef.current = props.onViewportResize;
  }, [props.onViewportResize]);

  useEffect(() => {
    latestActiveRef.current = props.active;
  }, [props.active]);

  useEffect(() => {
    latestInputHandlerRef.current = props.onViewportInput;
  }, [props.onViewportInput]);

  useEffect(() => {
    latestTitleHandlerRef.current = props.onViewportTitleChange;
  }, [props.onViewportTitleChange]);

  useEffect(() => {
    latestSnapshotRef.current = props.tab.snapshot;
  }, [props.tab.snapshot]);

  useEffect(() => {
    latestRuntimeTerminalContentRef.current = props.tab.runtimeTerminalContent;
  }, [props.tab.runtimeTerminalContent]);

  useEffect(() => {
    latestStageBehaviorRef.current = {
      usesRuntimeTerminalStream,
      showLivePrompt,
      showBootstrapOverlay,
    };
  }, [showBootstrapOverlay, showLivePrompt, usesRuntimeTerminalStream]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const hostElement = host;

    let cancelled = false;

    const measureViewport = async () => {
      if (!latestActiveRef.current) {
        return;
      }
      const measuredViewport = await driver.measureViewport();
      if (cancelled || !measuredViewport) {
        return;
      }

      const currentViewport = latestViewportRef.current;
      if (
        currentViewport.cols === measuredViewport.cols &&
        currentViewport.rows === measuredViewport.rows
      ) {
        return;
      }

      latestResizeHandlerRef.current(measuredViewport);
    };
    measureViewportRef.current = measureViewport;
    attachViewportRef.current = async () => {
      if (hasAttachedRef.current) {
        return;
      }
      if (attachPromiseRef.current) {
        await attachPromiseRef.current;
        return;
      }

      const attachPromise = (async () => {
        const stageBehavior = latestStageBehaviorRef.current;

        await driver.attach(hostElement);
        driver.setRuntimeMode(stageBehavior.usesRuntimeTerminalStream);
        driver.setDisableStdin(stageBehavior.showLivePrompt);
        driver.setCursorVisible(!stageBehavior.showBootstrapOverlay);
        await driver.setTitleListener(latestTitleHandlerRef.current);
        await driver.setInputListener(latestInputHandlerRef.current);
        if (cancelled) {
          return;
        }

        if (stageBehavior.usesRuntimeTerminalStream) {
          const nextRuntimeContent = latestRuntimeTerminalContentRef.current;
          clearQueuedRuntimeAppendFlush();
          queuedRuntimeAppendRef.current = "";
          renderedRuntimeContentRef.current = nextRuntimeContent;
          await driver.writeRaw(nextRuntimeContent, true);
        } else {
          clearQueuedRuntimeAppendFlush();
          queuedRuntimeAppendRef.current = "";
          renderedRuntimeContentRef.current = "";
          await driver.render(latestSnapshotRef.current);
        }
        if (cancelled) {
          return;
        }

        hasAttachedRef.current = true;
        if (latestActiveRef.current) {
          await measureViewport();
          if (latestStageBehaviorRef.current.showLivePrompt) {
            hiddenInputRef.current?.focus();
          } else {
            await driver.focus();
          }
        }
      })();

      attachPromiseRef.current = attachPromise;
      try {
        await attachPromise;
      } finally {
        if (attachPromiseRef.current === attachPromise) {
          attachPromiseRef.current = null;
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      void measureViewport();
    });
    resizeObserver.observe(hostElement);

    return () => {
      cancelled = true;
      hasAttachedRef.current = false;
      clearQueuedRuntimeAppendFlush();
      queuedRuntimeAppendRef.current = "";
      attachViewportRef.current = null;
      attachPromiseRef.current = null;
      measureViewportRef.current = null;
      resizeObserver.disconnect();
      driver.dispose();
    };
  }, []);

  useEffect(() => {
    if (hasAttachedRef.current || !props.active) {
      return;
    }

    void attachViewportRef.current?.();
  }, [props.active, props.tab.id]);

  useEffect(() => {
    const switchedRuntimeMode =
      wasRuntimeTerminalRef.current !== usesRuntimeTerminalStream;
    wasRuntimeTerminalRef.current = usesRuntimeTerminalStream;
    const becameActive = props.active && !runtimeContentSyncActiveRef.current;
    runtimeContentSyncActiveRef.current = props.active;

    if (!props.active) {
      clearQueuedRuntimeAppendFlush();
      queuedRuntimeAppendRef.current = "";
      return;
    }

    if (usesRuntimeTerminalStream) {
      const nextContent = props.tab.runtimeTerminalContent;
      const previousContent = renderedRuntimeContentRef.current;
      const justTruncated = props.tab.runtimeContentTruncated && !wasContentTruncatedRef.current;
      wasContentTruncatedRef.current = props.tab.runtimeContentTruncated;

      if (nextContent === previousContent && !justTruncated) {
        return;
      }

      if (switchedRuntimeMode || becameActive || justTruncated || !nextContent.startsWith(previousContent)) {
        clearQueuedRuntimeAppendFlush();
        queuedRuntimeAppendRef.current = "";
        renderedRuntimeContentRef.current = nextContent;
        void driver.writeRaw(nextContent, true);
        return;
      }

      if (nextContent.length > previousContent.length) {
        const appendedContent = nextContent.slice(previousContent.length);
        renderedRuntimeContentRef.current = nextContent;
        queuedRuntimeAppendRef.current += appendedContent;
        scheduleQueuedRuntimeAppendFlush();
      }
      return;
    }

    clearQueuedRuntimeAppendFlush();
    queuedRuntimeAppendRef.current = "";
    renderedRuntimeContentRef.current = "";
    void driver.render(props.tab.snapshot);
  }, [
    props.active,
    props.tab.id,
    props.tab.snapshot,
    props.tab.runtimeTerminalContent,
    usesRuntimeTerminalStream,
  ]);

  useEffect(() => {
    driver.setRuntimeMode(usesRuntimeTerminalStream);
    driver.setDisableStdin(showLivePrompt);
  }, [showLivePrompt, usesRuntimeTerminalStream]);

  useEffect(() => {
    driver.setCursorVisible(!showBootstrapOverlay);
  }, [showBootstrapOverlay]);

  useEffect(() => {
    void driver.setTitleListener(props.onViewportTitleChange);
  }, [props.onViewportTitleChange]);

  useEffect(() => {
    void driver.setInputListener(props.onViewportInput);
  }, [props.onViewportInput]);

  useEffect(() => {
    props.onRegisterViewportCopyHandler(async () => {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }

      try {
        const selectedText = await driver.getSelection();
        if (selectedText.length === 0) {
          return;
        }

        await navigator.clipboard.writeText(selectedText);
      } catch {
        // Clipboard access is best-effort in browser and desktop shells.
      }
    });

    return () => {
      props.onRegisterViewportCopyHandler(null);
    };
  }, [props.onRegisterViewportCopyHandler, props.tab.id]);

  useEffect(() => {
    props.onRegisterViewportPasteHandler(async (text) => {
      if (showLivePrompt) {
        props.onViewportInput({ kind: "text", data: text });
        hiddenInputRef.current?.focus();
      } else {
        await driver.paste(text);
        await driver.focus();
      }
    });

    return () => {
      props.onRegisterViewportPasteHandler(null);
    };
  }, [props.onRegisterViewportPasteHandler, props.onViewportInput, props.tab.id, showLivePrompt]);

  useEffect(() => {
    if (!viewportContextMenu) {
      return;
    }

    function dismissViewportContextMenu(event: MouseEvent) {
      setViewportContextMenu(null);
    }

    document.addEventListener("mousedown", dismissViewportContextMenu);
    return () => {
      document.removeEventListener("mousedown", dismissViewportContextMenu);
    };
  }, [viewportContextMenu]);

  useEffect(() => {
    void driver.search(props.tab.searchQuery);
  }, [props.tab.id, props.tab.searchQuery]);

  useEffect(() => {
    driver.setFontSize(fontSize);
    void measureViewportRef.current?.();
  }, [fontSize]);

  useEffect(() => {
    void measureViewportRef.current?.();
  }, [props.active, props.tab.id]);

  useEffect(() => {
    if (!props.active || searchOverlayOpen) {
      return;
    }

    void (async () => {
      await measureViewportRef.current?.();
      focusTerminalInput();
    })();
  }, [
    props.active,
    props.tab.id,
    searchOverlayOpen,
    showBootstrapOverlay,
    showLivePrompt,
    usesRuntimeTerminalStream,
  ]);

  useEffect(() => {
    if (!props.active || !searchOverlayOpen) {
      return;
    }

    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [props.active, props.tab.id, searchOverlayOpen]);

  async function copySelectionToClipboard() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      const selectedText = await driver.getSelection();
      if (selectedText.length === 0) {
        return;
      }

      await navigator.clipboard.writeText(selectedText);
    } catch {
      // Clipboard access is best-effort in browser and desktop shells.
    }
  }

  async function pasteClipboardIntoTerminal() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      const pastedText = await navigator.clipboard.readText();
      if (pastedText.length === 0) {
        return;
      }

      const MAX_PASTE_LENGTH = 32768;
      const safeText = pastedText.length > MAX_PASTE_LENGTH
        ? pastedText.slice(0, MAX_PASTE_LENGTH)
        : pastedText;

      if (showLivePrompt) {
        props.onViewportInput({ kind: "text", data: safeText });
        hiddenInputRef.current?.focus();
      } else {
        await driver.paste(safeText);
        await driver.focus();
      }
    } catch {
      // Clipboard access is best-effort in browser and desktop shells.
    }
  }

  async function selectAllTerminalViewport() {
    await driver.selectAll();
  }

  function openTerminalSearch() {
    setSearchOverlayOpen(true);
  }

  function handleHiddenInput(event: React.FormEvent<HTMLTextAreaElement>) {
    const target = event.target as HTMLTextAreaElement;
    const value = target.value;
    target.value = "";
    if (value.length > 0) {
      props.onViewportInput({ kind: "text", data: value });
    }
  }

  function handleCompositionEnd(event: React.CompositionEvent<HTMLTextAreaElement>) {
    const target = event.target as HTMLTextAreaElement;
    const value = target.value;
    target.value = "";
    if (value.length > 0) {
      props.onViewportInput({ kind: "text", data: value });
    }
  }

  function handleHiddenInputKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\r" });
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u007F" });
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u001b[D" });
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u001b[C" });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u001b[A" });
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u001b[B" });
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u001b[H" });
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u001b[F" });
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u001b[3~" });
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\t" });
      return;
    }
    if (event.ctrlKey && event.key === "c") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u0003" });
      return;
    }
    if (event.ctrlKey && event.key === "u") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u0015" });
      return;
    }
    if (event.ctrlKey && event.key === "l") {
      event.preventDefault();
      props.onViewportInput({ kind: "text", data: "\u000c" });
      return;
    }
  }

  function focusTerminalInput() {
    if (showLivePrompt) {
      hiddenInputRef.current?.focus();
    } else {
      void driver.focus();
    }
  }

  function closeTerminalSearch() {
    setSearchOverlayOpen(false);
    focusTerminalInput();
  }

  function handleSearchInputChange(event: ChangeEvent<HTMLInputElement>) {
    props.onSearchQueryChange(event.target.value);
  }

  function handleSearchInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeTerminalSearch();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      props.onSearchSelectMatch();
      void driver.search(props.tab.searchQuery);
    }
  }

  function handleTerminalStageKeyDownCapture(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!props.active) {
      return;
    }

    const target = event.target;
    const searchInputActive = target === searchInputRef.current;
    if (isTerminalSearchShortcut(event)) {
      event.preventDefault();
      openTerminalSearch();
      return;
    }

    if (searchInputActive) {
      return;
    }

    if (isTerminalCopyShortcut(event) || isTerminalInsertCopyShortcut(event)) {
      event.preventDefault();
      void copySelectionToClipboard();
      return;
    }

    if (isTerminalPasteShortcut(event) || isTerminalInsertPasteShortcut(event)) {
      event.preventDefault();
      void pasteClipboardIntoTerminal();
      return;
    }

    if (isTerminalSelectAllShortcut(event)) {
      event.preventDefault();
      void selectAllTerminalViewport();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && (event.key === "=" || event.key === "+")) {
      event.preventDefault();
      setFontSize((prev) => Math.min(prev + 1, 32));
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "-") {
      event.preventDefault();
      setFontSize((prev) => Math.max(prev - 1, 8));
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "0") {
      event.preventDefault();
      setFontSize(14);
      return;
    }
  }

  return (
    <div
      data-terminal-stage-id={props.tab.id}
      style={terminalStageStyle}
      onKeyDownCapture={handleTerminalStageKeyDownCapture}
      onClick={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest('[data-slot="terminal-search-overlay"]')
        ) {
          return;
        }

        if (showLivePrompt) {
          hiddenInputRef.current?.focus();
        } else {
          void driver.focus();
        }
      }}
    >
      {showLivePrompt ? (
        <textarea
          ref={hiddenInputRef}
          data-slot="terminal-hidden-input"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Terminal input"
          onInput={handleHiddenInput}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleHiddenInputKeyDown}
          style={hiddenInputStyle}
        />
      ) : null}
      {searchOverlayOpen ? (
        <div data-slot="terminal-search-overlay" style={terminalSearchOverlayStyle}>
          <div style={terminalSearchPanelStyle}>
            <input
              ref={searchInputRef}
              type="text"
              data-slot="terminal-search-input"
              aria-label="Open terminal search"
              placeholder="Search terminal output"
              value={props.tab.searchQuery}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchInputKeyDown}
              style={terminalSearchInputStyle}
            />
            <button
              type="button"
              aria-label="Close terminal search"
              title="Close terminal search"
              onClick={() => closeTerminalSearch()}
              style={terminalSearchCloseButtonStyle}
            >
              <CloseGlyph />
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={hostRef}
        style={terminalViewportStyle}
        onContextMenu={(event) => {
          event.preventDefault();
          setViewportContextMenu({ x: event.clientX, y: event.clientY });
        }}
      />

      {showBootstrapOverlay ? (
        <div data-slot="terminal-bootstrap-overlay" style={terminalBootstrapOverlayStyle}>
          <div style={terminalBootstrapStatusStyle}>{bootstrapStatusTitle}</div>
          <div style={terminalBootstrapDetailStyle}>{bootstrapStatusDetail}</div>
          <div style={terminalBootstrapPromptPlaceholderStyle}>
            Shell is starting. Input and cursor rendering stay on the real PTY surface.
          </div>
        </div>
      ) : null}

      {showRuntimeStatus ? (
        <div data-slot="terminal-runtime-status" style={terminalRuntimeStatusStyle}>
          <div style={
            props.tab.runtimeState === "exited" || props.tab.runtimeState === "failed"
              ? terminalRuntimeStatusTitleWarningStyle
              : terminalRuntimeStatusTitleStyle
          }>{runtimeStatusTitle}</div>
          <div style={terminalRuntimeStatusDetailStyle}>{runtimeStatusDetail}</div>
          {props.tab.runtimePendingInput.length > 0 ||
          props.tab.runtimePendingInputQueue.length > 0 ? (
            <div style={terminalRuntimeStatusPendingStyle}>
              {`Input queued: ${previewRuntimePendingInput(
                props.tab.runtimePendingInputQueue,
                props.tab.runtimePendingInput,
              )}`}
            </div>
          ) : null}
          {props.tab.runtimeState === "exited" || props.tab.runtimeState === "failed" ? (
            <div style={terminalRuntimeStatusActionRowStyle}>
              <button
                type="button"
                data-slot="terminal-runtime-restart"
                aria-label="Restart shell"
                title="Restart shell"
                onClick={() => {
                  props.onRestartRuntime();
                  void driver.focus();
                }}
                style={terminalRuntimeStatusActionButtonStyle}
              >
                Restart shell
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showLivePrompt ? (
        <div data-slot="terminal-live-prompt" style={promptBarStyle}>
          <span style={{...promptPrefixStyle, fontSize}}>{buildPromptPrefix(props.tab)}</span>
          <span style={{...promptTextStyle, fontSize, lineHeight: 1.25, flex: "none"}}>{props.tab.commandText.slice(0, props.tab.commandCursor)}</span>
          <span aria-hidden="true" style={{...promptCaretStyle, height: fontSize * 1.25}} />
          <span style={{...promptTextStyle, fontSize, lineHeight: 1.25, flex: 1}}>{props.tab.commandText.slice(props.tab.commandCursor)}</span>
        </div>
      ) : null}

      {viewportContextMenu ? (
        <div
          role="menu"
          aria-label="Terminal actions"
          style={{
            position: "fixed",
            left: viewportContextMenu.x,
            top: viewportContextMenu.y,
            zIndex: 9999,
            minWidth: 180,
            padding: "4px 0",
            background: TERMINAL_MENU_BACKGROUND,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            fontSize: 13,
            color: "#e4e4e7",
          }}
          onClick={() => setViewportContextMenu(null)}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { void copySelectionToClipboard(); }}
            style={viewportContextMenuItemStyle}
          >
            Copy  <span style={shortcutHintStyle}>Ctrl+Shift+C</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { void pasteClipboardIntoTerminal(); }}
            style={viewportContextMenuItemStyle}
          >
            Paste  <span style={shortcutHintStyle}>Ctrl+Shift+V</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { void selectAllTerminalViewport(); }}
            style={viewportContextMenuItemStyle}
          >
            Select all  <span style={shortcutHintStyle}>Ctrl+Shift+A</span>
          </button>
          <div style={contextMenuDividerStyle} />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void driver.reset();
              renderedRuntimeContentRef.current = "";
              if (usesRuntimeTerminalStream) {
                props.onClearRuntimeContent?.();
              }
              void driver.focus();
            }}
            style={viewportContextMenuItemStyle}
          >
            Clear Terminal
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { openTerminalSearch(); }}
            style={viewportContextMenuItemStyle}
          >
            Find  <span style={shortcutHintStyle}>Ctrl+Shift+F</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

const MemoTerminalStage = memo(TerminalStage, (previousProps, nextProps) => {
  return (
    previousProps.mode === nextProps.mode &&
    previousProps.tabId === nextProps.tabId &&
    previousProps.active === nextProps.active &&
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

function buildPromptPrefix(tab: TerminalShellSnapshot["activeTab"]) {
  const cwdLabel = summarizeWorkingDirectory(tab.workingDirectory);

  if (tab.profile === "powershell") {
    return `PS ${cwdLabel}>`;
  }

  if (tab.profile === "bash") {
    return `${cwdLabel} $`;
  }

  return `${cwdLabel} >`;
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

function describePendingRuntimeInput(
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

function previewRuntimePendingInput(
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

function summarizeWorkingDirectory(value: string) {
  const normalized = value.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.at(-1) ?? normalized;
}

function isPrintableViewportInput(data: string) {
  if (data.length === 0 || data.startsWith("\u001b") || data === "\r") {
    return false;
  }
  const code = data.codePointAt(0);
  return code !== undefined && code >= 0x20;
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
  runtimeBindingEffectKey: string;
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

  const runtimeBindingParts: string[] = [];
  const retryingTabIds: string[] = [];
  const runtimeBootstrapParts: string[] = [];
  const runtimePendingInputParts: string[] = [];
  const snapshotTabById = new Map<string, TerminalShellSnapshot["tabs"][number]>();
  const runtimeBootstrapCandidateTabs: TerminalShellSnapshot["tabs"] = [];
  const runtimePendingInputTabs: TerminalShellSnapshot["tabs"] = [];

  for (const tab of tabs) {
    snapshotTabById.set(tab.id, tab);
    runtimeBindingParts.push(
      joinTerminalEffectKey([
        tab.id,
        tab.runtimeSessionId,
        tab.runtimeState,
        tab.runtimeAttachmentId,
      ]),
    );
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
    runtimeBindingEffectKey: runtimeBindingParts.join("\u001d"),
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

function isTerminalSearchShortcut(event: ReactKeyboardEvent<HTMLElement>) {
  return (
    (event.ctrlKey || event.metaKey) &&
    event.shiftKey &&
    event.key.toLowerCase() === "f"
  );
}

function isTerminalCopyShortcut(event: ReactKeyboardEvent<HTMLElement>) {
  return (
    (event.ctrlKey || event.metaKey) &&
    event.shiftKey &&
    event.key.toLowerCase() === "c"
  );
}

function isTerminalPasteShortcut(event: ReactKeyboardEvent<HTMLElement>) {
  return (
    (event.ctrlKey || event.metaKey) &&
    event.shiftKey &&
    event.key.toLowerCase() === "v"
  );
}

function isTerminalInsertCopyShortcut(event: ReactKeyboardEvent<HTMLElement>) {
  return event.ctrlKey && !event.shiftKey && !event.metaKey && event.key === "Insert";
}

function isTerminalInsertPasteShortcut(event: ReactKeyboardEvent<HTMLElement>) {
  return event.shiftKey && !event.ctrlKey && !event.metaKey && event.key === "Insert";
}

function isTerminalSelectAllShortcut(event: ReactKeyboardEvent<HTMLElement>) {
  return (
    (event.ctrlKey || event.metaKey) &&
    event.shiftKey &&
    event.key.toLowerCase() === "a"
  );
}

const TERMINAL_CHROME_BACKGROUND = "#16181b";
const TERMINAL_ACTIVE_TAB_BACKGROUND = "#1f2329";
const TERMINAL_SURFACE_BACKGROUND = "#050607";
const TERMINAL_MENU_BACKGROUND = "rgba(22, 24, 27, 0.98)";
const TERMINAL_SEARCH_BACKGROUND = "rgba(22, 24, 27, 0.96)";
const TERMINAL_STATUS_BACKGROUND = "rgba(18, 20, 24, 0.92)";
const TERMINAL_STATUS_BUTTON_BACKGROUND = "rgba(33, 36, 41, 0.94)";
const TERMINAL_SCROLLBAR_THUMB = "rgba(82, 82, 91, 0.72)";
const TERMINAL_SCROLLBAR_THUMB_HOVER = "rgba(113, 113, 122, 0.9)";

const terminalViewportChromeCss = `
[data-shell-layout="terminal-tabs"] [role="tablist"]::-webkit-scrollbar {
  display: none;
}

[data-shell-layout="terminal-tabs"] .xterm,
[data-shell-layout="terminal-tabs"] .xterm-viewport {
  height: 100%;
}

[data-shell-layout="terminal-tabs"] .xterm {
  background: ${TERMINAL_SURFACE_BACKGROUND};
}

[data-shell-layout="terminal-tabs"] .xterm .xterm-helper-textarea {
  position: fixed !important;
  left: -9999px !important;
  top: -9999px !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  pointer-events: none !important;
  caret-color: transparent;
}

[data-shell-layout="terminal-tabs"] .xterm-viewport {
  background: ${TERMINAL_SURFACE_BACKGROUND};
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: ${TERMINAL_SCROLLBAR_THUMB} transparent;
}

[data-shell-layout="terminal-tabs"] .xterm-viewport::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

[data-shell-layout="terminal-tabs"] .xterm-viewport::-webkit-scrollbar-track {
  background: transparent;
}

[data-shell-layout="terminal-tabs"] .xterm-viewport::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: ${TERMINAL_SCROLLBAR_THUMB};
  background-clip: padding-box;
}

[data-shell-layout="terminal-tabs"] .xterm-viewport:hover::-webkit-scrollbar-thumb {
  background: ${TERMINAL_SCROLLBAR_THUMB_HOVER};
  background-clip: padding-box;
}

[data-shell-layout="terminal-tabs"] .xterm-viewport::-webkit-scrollbar-corner {
  background: transparent;
}

[data-shell-layout="terminal-tabs"] [data-slot="terminal-header-chrome"] button:hover,
[data-shell-layout="terminal-tabs"] [data-slot="terminal-tab-close"]:hover,
[data-shell-layout="terminal-tabs"] [data-slot="terminal-window-controls"] button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fafafa;
}

[data-shell-layout="terminal-tabs"] [data-slot="terminal-window-controls"] button[data-intent="danger"]:hover {
  background: #c42b1c;
  color: #ffffff;
}

[data-shell-layout="terminal-tabs"] [data-slot="terminal-runtime-restart"]:hover {
  background: rgba(51, 65, 85, 0.96);
  border-color: rgba(148, 163, 184, 0.4);
}

@keyframes terminal-prompt-caret-blink {
  0%, 100% { opacity: 0.92; }
  50% { opacity: 0; }
}

[data-shell-layout="terminal-tabs"] [data-slot="terminal-live-prompt"] [aria-hidden] {
  animation: terminal-prompt-caret-blink 1.06s step-end infinite;
}
`;

const rootStyle: CSSProperties = {
  width: "100%",
  minHeight: "100dvh",
  height: "100dvh",
  overflow: "hidden",
  background: TERMINAL_CHROME_BACKGROUND,
  color: "#d4d4d8",
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

const shellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minHeight: "100dvh",
  height: "100dvh",
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

const profileMenuStyle: CSSProperties = {
  position: "absolute",
  top: "100%",
  right: 0,
  zIndex: 20,
  display: "grid",
  gap: 6,
  minWidth: 280,
  padding: 6,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: TERMINAL_MENU_BACKGROUND,
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
};

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

const viewportContextMenuItemStyle: CSSProperties = {
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

const shortcutHintStyle: CSSProperties = {
  color: "#71717a",
  fontSize: 11,
  marginLeft: 16,
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

const terminalStageStyle: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minHeight: 0,
  height: "100%",
  background: TERMINAL_SURFACE_BACKGROUND,
};

const terminalViewportStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  background: TERMINAL_SURFACE_BACKGROUND,
  padding: 0,
};

const hiddenInputStyle: CSSProperties = {
  position: "absolute",
  left: 0,
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
  zIndex: -1,
  pointerEvents: "none",
};

const promptBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 0,
  minHeight: 34,
  padding: "4px 0",
  background: TERMINAL_SURFACE_BACKGROUND,
};

const promptPrefixStyle: CSSProperties = {
  paddingRight: 8,
  color: "#16c60c",
  fontSize: 14,
  whiteSpace: "nowrap",
};

const promptTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  color: "#fafafa",
  fontSize: 14,
  lineHeight: 1.25,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", \"JetBrains Mono\", \"Fira Code\", Consolas, \"Courier New\", monospace",
};

const promptCaretStyle: CSSProperties = {
  width: 9,
  height: 16,
  marginLeft: 1,
  marginRight: 1,
  background: "#f5f7fb",
  opacity: 0.92,
  flex: "none",
  alignSelf: "center",
};

const terminalBootstrapOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 8,
  display: "grid",
  alignContent: "start",
  gap: 4,
  padding: "8px 0 0 8px",
  background: "transparent",
  pointerEvents: "none",
};

const terminalBootstrapStatusStyle: CSSProperties = {
  color: "#d4d4d8",
  fontSize: 12,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

const terminalBootstrapDetailStyle: CSSProperties = {
  color: "#71717a",
  fontSize: 11,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const terminalBootstrapPromptRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  minHeight: 20,
};

const terminalBootstrapPromptTextStyle: CSSProperties = {
  color: "#fafafa",
  lineHeight: 1.25,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", \"JetBrains Mono\", \"Fira Code\", Consolas, \"Courier New\", monospace",
};

const terminalBootstrapPromptPlaceholderStyle: CSSProperties = {
  color: "#52525b",
  fontSize: 12,
  lineHeight: 1.25,
  fontFamily: "\"Cascadia Code\", \"Cascadia Mono\", Consolas, monospace",
};

const terminalSearchOverlayStyle: CSSProperties = {
  position: "absolute",
  top: 10,
  right: 12,
  zIndex: 12,
  pointerEvents: "auto",
};

const terminalRuntimeStatusStyle: CSSProperties = {
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

const terminalRuntimeStatusTitleStyle: CSSProperties = {
  color: "#e2e8f0",
  fontSize: 12,
};

const terminalRuntimeStatusTitleWarningStyle: CSSProperties = {
  color: "#f97316",
  fontSize: 12,
};

const terminalRuntimeStatusDetailStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const terminalRuntimeStatusPendingStyle: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 11,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const terminalRuntimeStatusActionRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
  pointerEvents: "auto",
};

const terminalRuntimeStatusActionButtonStyle: CSSProperties = {
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

const terminalSearchPanelStyle: CSSProperties = {
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

const terminalSearchInputStyle: CSSProperties = {
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

const terminalSearchCloseButtonStyle: CSSProperties = {
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
