import { extractErrorMessage } from "@sdkwork/terminal-commons";
import type { TerminalViewport } from "@sdkwork/terminal-core";
import {
  bindTerminalShellSessionRuntime,
  openTerminalShellTab,
  type TerminalShellProfile,
} from "./model";
import type { LaunchProfileDefinition } from "./launch-profiles.ts";
import {
  createLaunchProjectActivationEvent,
  createLaunchProjectLookupFailureStatus,
  createLaunchProjectResolutionRequest,
  createWorkingDirectoryPickerFailureStatus,
  createWorkingDirectoryPickerRequest,
  resolveLaunchEntryOpenOptions,
  type LaunchFlowMode,
  type LaunchProjectFlowState,
  type LaunchWebRuntimeTarget,
  type LaunchWorkingDirectorySelection,
} from "./launch-flow.ts";
import {
  normalizeLaunchProjectCollection,
  resolveLaunchProjectNameFromPath,
  type TerminalLaunchProject,
  type TerminalLaunchProjectActivationEvent,
  type TerminalLaunchProjectCollection,
  type TerminalLaunchProjectResolutionRequest,
} from "./launch-projects.ts";
import type { ProfileMenuDescriptor } from "./profile-menu.tsx";
import type {
  ProfileMenuPosition,
  TerminalTabContextMenuState,
} from "./terminal-overlays.tsx";
import type { UpdateShellState } from "./shell-state-bridge.ts";

interface MutableRefObjectLike<T> {
  current: T;
}

interface DesktopSessionReattachIntentLike {
  requestId: string;
  sessionId: string;
  attachmentId: string;
  cursor: string;
  profile: TerminalShellProfile;
  title: string;
  targetLabel: string;
}

interface DesktopConnectorSessionIntentLike {
  requestId: string;
  profile: TerminalShellProfile;
  title: string;
  targetLabel: string;
  request: {
    workspaceId: string;
    target: "ssh" | "docker-exec" | "kubernetes-exec";
    authority: string;
    command: string[];
    modeTags: ("cli-native")[];
    tags: string[];
  };
}

interface DesktopConnectorLaunchEntryLike {
  targetId: string;
}

interface LaunchProjectResolver {
  (
    request: TerminalLaunchProjectResolutionRequest,
  ):
    | Promise<TerminalLaunchProjectCollection | readonly TerminalLaunchProject[] | null | undefined>
    | TerminalLaunchProjectCollection
    | readonly TerminalLaunchProject[]
    | null
    | undefined;
}

interface WorkingDirectoryPickerOptionsLike {
  defaultPath?: string | null;
  title?: string;
}

export function applyDesktopSessionReattachIntent(args: {
  mode: LaunchFlowMode;
  intent: DesktopSessionReattachIntentLike | null | undefined;
  activeViewport: TerminalViewport;
  handledIntentIdRef: MutableRefObjectLike<string | null>;
  setProfileMenuOpen: (open: boolean) => void;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  updateShellState: UpdateShellState;
}) {
  const intent = args.intent;
  if (args.mode !== "desktop" || !intent) {
    return false;
  }

  if (args.handledIntentIdRef.current === intent.requestId) {
    return false;
  }

  args.handledIntentIdRef.current = intent.requestId;
  args.setProfileMenuOpen(false);
  args.setContextMenu(null);
  args.updateShellState((current) => {
    const next = openTerminalShellTab(current, {
      profile: intent.profile,
      title: intent.title,
      targetLabel: intent.targetLabel,
      viewport: args.activeViewport,
    });

    return bindTerminalShellSessionRuntime(next, next.activeTabId, {
      sessionId: intent.sessionId,
      attachmentId: intent.attachmentId,
      cursor: intent.cursor,
    });
  });
  return true;
}

export function applyDesktopConnectorIntent(args: {
  mode: LaunchFlowMode;
  intent: DesktopConnectorSessionIntentLike | null | undefined;
  activeViewport: TerminalViewport;
  handledIntentIdRef: MutableRefObjectLike<string | null>;
  setProfileMenuOpen: (open: boolean) => void;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  updateShellState: UpdateShellState;
}) {
  const intent = args.intent;
  if (args.mode !== "desktop" || !intent) {
    return false;
  }

  if (args.handledIntentIdRef.current === intent.requestId) {
    return false;
  }

  args.handledIntentIdRef.current = intent.requestId;
  args.setProfileMenuOpen(false);
  args.setContextMenu(null);
  args.updateShellState((current) =>
    openTerminalShellTab(current, {
      profile: intent.profile,
      title: intent.title,
      targetLabel: intent.targetLabel,
      viewport: args.activeViewport,
      runtimeBootstrap: {
        kind: "connector",
        request: intent.request,
      },
    }),
  );
  return true;
}

export function launchEntryInWorkingDirectory(args: {
  entry: LaunchProfileDefinition;
  selection?: LaunchWorkingDirectorySelection;
  mode: LaunchFlowMode;
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  resolveActiveViewport: () => TerminalViewport;
  onLaunchProjectActivated?: (event: TerminalLaunchProjectActivationEvent) => void;
  updateShellState: UpdateShellState;
}) {
  const activationEvent = args.selection
    ? createLaunchProjectActivationEvent(args.entry, args.selection)
    : null;
  if (activationEvent) {
    args.onLaunchProjectActivated?.(activationEvent);
  }

  args.updateShellState((current) =>
    openTerminalShellTab(
      current,
      resolveLaunchEntryOpenOptions({
        mode: args.mode,
        webRuntimeTarget: args.webRuntimeTarget,
        entry: args.entry,
        viewport: args.resolveActiveViewport(),
        selection: args.selection,
      }),
    ),
  );
}

export function cancelLaunchProjectFlow(args: {
  launchProjectResolutionRequestIdRef: MutableRefObjectLike<number>;
  setLaunchProjectFlowState: (state: LaunchProjectFlowState | null) => void;
}) {
  args.launchProjectResolutionRequestIdRef.current += 1;
  args.setLaunchProjectFlowState(null);
}

export async function resolveLaunchProjectsForEntry(args: {
  entry: LaunchProfileDefinition;
  activeWorkingDirectory: string;
  launchProjects?: readonly TerminalLaunchProject[];
  resolveLaunchProjects?: LaunchProjectResolver;
}) {
  if (!args.resolveLaunchProjects) {
    return normalizeLaunchProjectCollection(args.launchProjects, {
      source: "provided",
      sourceLabel: "Provided projects",
    });
  }

  const resolvedProjects = await args.resolveLaunchProjects({
    ...createLaunchProjectResolutionRequest(args.entry, args.activeWorkingDirectory),
  });

  if (resolvedProjects == null) {
    return normalizeLaunchProjectCollection(args.launchProjects, {
      source: "provided",
      sourceLabel: "Provided projects",
    });
  }

  return normalizeLaunchProjectCollection(resolvedProjects, {
    source: "resolver",
    sourceLabel: "Resolved projects",
  });
}

export async function pickWorkingDirectoryForEntry(args: {
  entry: LaunchProfileDefinition;
  activeWorkingDirectory: string;
  mode: LaunchFlowMode;
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  onPickWorkingDirectory?: (
    options: WorkingDirectoryPickerOptionsLike,
  ) => Promise<string | null>;
  mountedRef: MutableRefObjectLike<boolean>;
  resolveActiveViewport: () => TerminalViewport;
  onLaunchProjectActivated?: (event: TerminalLaunchProjectActivationEvent) => void;
  updateShellState: UpdateShellState;
  updateProfileMenuPosition: () => void;
  setProfileMenuStatus: (status: ProfileMenuDescriptor | null) => void;
  setProfileMenuOpen: (open: boolean) => void;
}) {
  try {
    const selectedWorkingDirectory = args.onPickWorkingDirectory
      ? await args.onPickWorkingDirectory(
          createWorkingDirectoryPickerRequest(args.entry, args.activeWorkingDirectory),
        )
      : args.activeWorkingDirectory;

    if (!args.mountedRef.current) {
      return;
    }

    const normalizedWorkingDirectory = selectedWorkingDirectory?.trim();
    if (!normalizedWorkingDirectory) {
      return;
    }

    launchEntryInWorkingDirectory({
      entry: args.entry,
      selection: {
        projectName: resolveLaunchProjectNameFromPath(normalizedWorkingDirectory),
        source: "directory-picker",
        sourceLabel: "Selected folder",
        workingDirectory: normalizedWorkingDirectory,
      },
      mode: args.mode,
      webRuntimeTarget: args.webRuntimeTarget,
      resolveActiveViewport: args.resolveActiveViewport,
      onLaunchProjectActivated: args.onLaunchProjectActivated,
      updateShellState: args.updateShellState,
    });
  } catch (error) {
    console.error("[sdkwork-terminal] working directory picker failed", error);
    if (!args.mountedRef.current) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    args.updateProfileMenuPosition();
    args.setProfileMenuStatus(createWorkingDirectoryPickerFailureStatus(args.entry, message));
    args.setProfileMenuOpen(true);
  }
}

export async function openLaunchEntry(args: {
  entry: LaunchProfileDefinition;
  mode: LaunchFlowMode;
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  activeWorkingDirectory: string;
  launchProjects?: readonly TerminalLaunchProject[];
  resolveLaunchProjects?: LaunchProjectResolver;
  onLaunchProjectActivated?: (event: TerminalLaunchProjectActivationEvent) => void;
  onPickWorkingDirectory?: (
    options: WorkingDirectoryPickerOptionsLike,
  ) => Promise<string | null>;
  mountedRef: MutableRefObjectLike<boolean>;
  launchProjectResolutionRequestIdRef: MutableRefObjectLike<number>;
  resolveActiveViewport: () => TerminalViewport;
  updateProfileMenuPosition: () => void;
  updateShellState: UpdateShellState;
  setProfileMenuStatus: (status: ProfileMenuDescriptor | null) => void;
  setProfileMenuOpen: (open: boolean) => void;
  setProfileMenuPosition: (position: ProfileMenuPosition | null) => void;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  setLaunchProjectFlowState: (state: LaunchProjectFlowState | null) => void;
}) {
  args.setProfileMenuStatus(null);
  args.setProfileMenuOpen(false);
  args.setProfileMenuPosition(null);
  args.setContextMenu(null);
  cancelLaunchProjectFlow({
    launchProjectResolutionRequestIdRef: args.launchProjectResolutionRequestIdRef,
    setLaunchProjectFlowState: args.setLaunchProjectFlowState,
  });

  if (args.entry.requiresWorkingDirectoryPicker) {
    const launchProjectResolutionRequestId =
      args.launchProjectResolutionRequestIdRef.current + 1;
    args.launchProjectResolutionRequestIdRef.current = launchProjectResolutionRequestId;
    let resolvedLaunchProjectCollection = normalizeLaunchProjectCollection(args.launchProjects, {
      source: "provided",
      sourceLabel: "Provided projects",
    });
    try {
      if (args.resolveLaunchProjects) {
        args.setLaunchProjectFlowState({
          kind: "resolving",
          entry: args.entry,
          sourceLabel: "Resolving projects",
        });
      }
      resolvedLaunchProjectCollection = await resolveLaunchProjectsForEntry({
        entry: args.entry,
        activeWorkingDirectory: args.activeWorkingDirectory,
        launchProjects: args.launchProjects,
        resolveLaunchProjects: args.resolveLaunchProjects,
      });
    } catch (error) {
      if (
        !args.mountedRef.current ||
        args.launchProjectResolutionRequestIdRef.current !== launchProjectResolutionRequestId
      ) {
        return;
      }

      args.setLaunchProjectFlowState(null);
      args.updateProfileMenuPosition();
      args.setProfileMenuStatus(
        createLaunchProjectLookupFailureStatus(
          args.entry,
          extractErrorMessage(error) || "Unable to resolve launch projects.",
        ),
      );
      args.setProfileMenuOpen(true);
      return;
    }

    if (
      !args.mountedRef.current ||
      args.launchProjectResolutionRequestIdRef.current !== launchProjectResolutionRequestId
    ) {
      return;
    }

    args.setLaunchProjectFlowState(null);

    if (resolvedLaunchProjectCollection.projects.length === 1) {
      const selectedProject = resolvedLaunchProjectCollection.projects[0]!;
      launchEntryInWorkingDirectory({
        entry: args.entry,
        selection: {
          projectName: selectedProject.name,
          source: resolvedLaunchProjectCollection.source,
          sourceLabel: resolvedLaunchProjectCollection.sourceLabel,
          workingDirectory: selectedProject.path,
          workspaceId: selectedProject.workspaceId,
          projectId: selectedProject.projectId,
        },
        mode: args.mode,
        webRuntimeTarget: args.webRuntimeTarget,
        resolveActiveViewport: args.resolveActiveViewport,
        onLaunchProjectActivated: args.onLaunchProjectActivated,
        updateShellState: args.updateShellState,
      });
      return;
    }

    if (resolvedLaunchProjectCollection.projects.length > 1) {
      args.setLaunchProjectFlowState({
        kind: "selecting",
        entry: args.entry,
        source: resolvedLaunchProjectCollection.source,
        sourceLabel: resolvedLaunchProjectCollection.sourceLabel,
        projects: resolvedLaunchProjectCollection.projects,
      });
      return;
    }

    await pickWorkingDirectoryForEntry({
      entry: args.entry,
      activeWorkingDirectory: args.activeWorkingDirectory,
      mode: args.mode,
      webRuntimeTarget: args.webRuntimeTarget,
      onPickWorkingDirectory: args.onPickWorkingDirectory,
      mountedRef: args.mountedRef,
      resolveActiveViewport: args.resolveActiveViewport,
      onLaunchProjectActivated: args.onLaunchProjectActivated,
      updateShellState: args.updateShellState,
      updateProfileMenuPosition: args.updateProfileMenuPosition,
      setProfileMenuStatus: args.setProfileMenuStatus,
      setProfileMenuOpen: args.setProfileMenuOpen,
    });
    return;
  }

  launchEntryInWorkingDirectory({
    entry: args.entry,
    mode: args.mode,
    webRuntimeTarget: args.webRuntimeTarget,
    resolveActiveViewport: args.resolveActiveViewport,
    onLaunchProjectActivated: args.onLaunchProjectActivated,
    updateShellState: args.updateShellState,
  });
}

export function openDesktopConnectorEntry(args: {
  entry: DesktopConnectorLaunchEntryLike;
  setProfileMenuOpen: (open: boolean) => void;
  setProfileMenuPosition: (position: ProfileMenuPosition | null) => void;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  onLaunchDesktopConnectorEntry?: (entryId: string) => void;
}) {
  args.setProfileMenuOpen(false);
  args.setProfileMenuPosition(null);
  args.setContextMenu(null);
  args.onLaunchDesktopConnectorEntry?.(args.entry.targetId);
}
