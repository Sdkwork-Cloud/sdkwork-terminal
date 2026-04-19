import type { ReactElement } from "react";

export type TerminalClipboardProvider = {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
};

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

export interface SessionCenterReplayDiagnostics {
  totalSessions: number;
  loadedReplayCount: number;
  deferredReplayCount: number;
  unavailableReplayCount: number;
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

export function ShellApp(props: ShellAppProps): ReactElement;
