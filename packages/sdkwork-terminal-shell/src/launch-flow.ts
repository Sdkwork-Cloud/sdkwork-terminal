import type { TerminalViewport } from "@sdkwork/terminal-core";
import type { RemoteRuntimeSessionCreateRequest } from "@sdkwork/terminal-types";
import type { LaunchProfileDefinition } from "./launch-profiles.ts";
import {
  type NormalizedLaunchProject,
  resolveLaunchProjectNameFromPath,
  type TerminalLaunchProjectActivationEvent,
  type TerminalLaunchProjectCollectionEvent,
  type TerminalLaunchProjectResolutionRequest,
  type TerminalLaunchProjectSourceKind,
} from "./launch-projects.ts";
import type { OpenTerminalShellTabOptions, TerminalShellProfile } from "./model";
import type { ProfileMenuDescriptor } from "./profile-menu.tsx";

export type LaunchFlowMode = "desktop" | "web";

export interface LaunchWebRuntimeTarget {
  workspaceId: RemoteRuntimeSessionCreateRequest["workspaceId"];
  authority: RemoteRuntimeSessionCreateRequest["authority"];
  target: RemoteRuntimeSessionCreateRequest["target"];
  workingDirectory?: RemoteRuntimeSessionCreateRequest["workingDirectory"];
  modeTags?: RemoteRuntimeSessionCreateRequest["modeTags"];
  tags?: RemoteRuntimeSessionCreateRequest["tags"];
}

export interface LaunchWorkingDirectorySelection {
  projectName?: string | null;
  source?: TerminalLaunchProjectSourceKind;
  sourceLabel?: string | null;
  workingDirectory: string;
  workspaceId?: string | null;
  projectId?: string | null;
}

export interface LaunchProjectResolvingState {
  kind: "resolving";
  entry: LaunchProfileDefinition;
  sourceLabel: string | null;
}

export interface LaunchProjectPickerState {
  kind: "selecting";
  entry: LaunchProfileDefinition;
  source: TerminalLaunchProjectSourceKind;
  sourceLabel: string | null;
  projects: NormalizedLaunchProject[];
}

export type LaunchProjectFlowState =
  | LaunchProjectResolvingState
  | LaunchProjectPickerState;

export function createWebRuntimeBootstrapFromTarget(
  target: LaunchWebRuntimeTarget | undefined,
  profile: TerminalShellProfile,
): OpenTerminalShellTabOptions["runtimeBootstrap"] | undefined {
  if (!target) {
    return undefined;
  }

  const command = profile === "bash" ? ["/bin/bash", "-l"] : ["/bin/sh"];

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

export function resolveTabOpenOptions(args: {
  mode: LaunchFlowMode;
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  options: OpenTerminalShellTabOptions;
}): OpenTerminalShellTabOptions {
  if (args.mode !== "web") {
    return args.options;
  }

  const profile = args.options.profile ?? "bash";
  return {
    ...args.options,
    runtimeBootstrap:
      args.options.runtimeBootstrap ??
      createWebRuntimeBootstrapFromTarget(args.webRuntimeTarget, profile),
  };
}

function applyLaunchSelectionToOpenOptions(
  options: OpenTerminalShellTabOptions,
  selection: LaunchWorkingDirectorySelection,
): OpenTerminalShellTabOptions {
  if (options.runtimeBootstrap?.kind === "local-process") {
    return {
      ...options,
      workingDirectory: selection.workingDirectory,
      runtimeBootstrap: {
        kind: "local-process",
        request: {
          ...options.runtimeBootstrap.request,
          workingDirectory: selection.workingDirectory,
          workspaceId: selection.workspaceId ?? options.runtimeBootstrap.request.workspaceId ?? null,
          projectId: selection.projectId ?? options.runtimeBootstrap.request.projectId ?? null,
        },
      },
    };
  }

  if (options.runtimeBootstrap?.kind === "local-shell") {
    return {
      ...options,
      workingDirectory: selection.workingDirectory,
      runtimeBootstrap: {
        kind: "local-shell",
      },
    };
  }

  if (options.runtimeBootstrap?.kind === "remote-runtime") {
    return {
      ...options,
      workingDirectory: selection.workingDirectory,
      runtimeBootstrap: {
        kind: "remote-runtime",
        request: {
          ...options.runtimeBootstrap.request,
          workingDirectory: selection.workingDirectory,
        },
      },
    };
  }

  return {
    ...options,
    workingDirectory: selection.workingDirectory,
  };
}

export function resolveLaunchEntryOpenOptions(args: {
  mode: LaunchFlowMode;
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  entry: LaunchProfileDefinition;
  viewport: TerminalViewport;
  selection?: LaunchWorkingDirectorySelection;
}): OpenTerminalShellTabOptions {
  const baseOptions: OpenTerminalShellTabOptions = {
    ...(args.entry.openOptions ?? { profile: args.entry.profile }),
    viewport: args.viewport,
  };
  const normalizedWorkingDirectory = args.selection?.workingDirectory.trim();

  return resolveTabOpenOptions({
    mode: args.mode,
    webRuntimeTarget: args.webRuntimeTarget,
    options: normalizedWorkingDirectory
      ? applyLaunchSelectionToOpenOptions(baseOptions, {
          workingDirectory: normalizedWorkingDirectory,
          workspaceId: args.selection?.workspaceId ?? null,
          projectId: args.selection?.projectId ?? null,
        })
      : baseOptions,
  });
}

export function createLaunchProjectActivationEvent(
  entry: LaunchProfileDefinition,
  selection: LaunchWorkingDirectorySelection,
): TerminalLaunchProjectActivationEvent | null {
  if (!selection.workingDirectory) {
    return null;
  }

  return {
    entryId: entry.id,
    entryLabel: entry.label,
    group: entry.group,
    profile: entry.profile,
    source: selection.source ?? "directory-picker",
    sourceLabel: selection.sourceLabel ?? null,
    project: {
      name:
        selection.projectName?.trim() ||
        resolveLaunchProjectNameFromPath(selection.workingDirectory),
      path: selection.workingDirectory,
      workspaceId: selection.workspaceId ?? null,
      projectId: selection.projectId ?? null,
    },
  };
}

export function createLaunchProjectCollectionEvent(
  entry: LaunchProfileDefinition,
  source: TerminalLaunchProjectSourceKind,
  sourceLabel: string | null,
): TerminalLaunchProjectCollectionEvent {
  return {
    entryId: entry.id,
    entryLabel: entry.label,
    group: entry.group,
    profile: entry.profile,
    source,
    sourceLabel,
  };
}

export function createLaunchProjectResolutionRequest(
  entry: LaunchProfileDefinition,
  activeWorkingDirectory: string,
): TerminalLaunchProjectResolutionRequest {
  return {
    entryId: entry.id,
    entryLabel: entry.label,
    group: entry.group,
    profile: entry.profile,
    activeWorkingDirectory,
  };
}

export function createWorkingDirectoryPickerRequest(
  entry: LaunchProfileDefinition,
  activeWorkingDirectory: string,
) {
  return {
    defaultPath: activeWorkingDirectory,
    title: `Choose working directory for ${entry.label}`,
  };
}

export function createWorkingDirectoryPickerFailureStatus(
  entry: LaunchProfileDefinition,
  message: string,
): ProfileMenuDescriptor {
  return {
    title: `${entry.label} launch failed`,
    subtitle: `Working directory selection failed. ${message}`,
    accent: "#ef4444",
  };
}

export function createLaunchProjectLookupFailureStatus(
  entry: LaunchProfileDefinition,
  message: string,
): ProfileMenuDescriptor {
  return {
    title: `${entry.label} project lookup failed`,
    subtitle: message || "Unable to resolve launch projects.",
    accent: "#ef4444",
  };
}
