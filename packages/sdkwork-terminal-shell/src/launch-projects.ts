import type { TerminalShellProfile } from "./model";

export interface TerminalLaunchProject {
  name: string;
  path: string;
  workspaceId?: string | null;
  projectId?: string | null;
}

export type TerminalLaunchProjectSourceKind =
  | "resolver"
  | "provided"
  | "recent"
  | "directory-picker";

export interface TerminalLaunchProjectCollection {
  source: TerminalLaunchProjectSourceKind;
  sourceLabel?: string | null;
  projects: readonly TerminalLaunchProject[];
}

export interface TerminalLaunchProjectResolutionRequest {
  entryId: string;
  entryLabel: string;
  group: "shell" | "wsl" | "cli";
  profile: TerminalShellProfile;
  activeWorkingDirectory: string;
}

export interface TerminalLaunchProjectActivationEvent {
  entryId: string;
  entryLabel: string;
  group: "shell" | "wsl" | "cli";
  profile: TerminalShellProfile;
  source: TerminalLaunchProjectSourceKind;
  sourceLabel?: string | null;
  project: TerminalLaunchProject;
}

export interface TerminalLaunchProjectCollectionEvent {
  entryId: string;
  entryLabel: string;
  group: "shell" | "wsl" | "cli";
  profile: TerminalShellProfile;
  source: TerminalLaunchProjectSourceKind;
  sourceLabel?: string | null;
}

export interface TerminalLaunchProjectRemovalEvent
  extends TerminalLaunchProjectCollectionEvent {
  project: TerminalLaunchProject;
}

export interface NormalizedLaunchProject {
  name: string;
  path: string;
  workspaceId: string | null;
  projectId: string | null;
}

export interface NormalizedLaunchProjectCollection {
  source: TerminalLaunchProjectSourceKind;
  sourceLabel: string | null;
  projects: NormalizedLaunchProject[];
}

function isTerminalLaunchProjectCollection(
  input:
    | TerminalLaunchProjectCollection
    | readonly TerminalLaunchProject[]
    | null
    | undefined,
): input is TerminalLaunchProjectCollection {
  return Boolean(input) && !Array.isArray(input);
}

export function normalizeLaunchProjects(
  projects: readonly TerminalLaunchProject[] | undefined,
): NormalizedLaunchProject[] {
  if (!projects || projects.length === 0) {
    return [];
  }

  const dedupedProjects = new Map<string, NormalizedLaunchProject>();
  for (const project of projects) {
    const name = project.name.trim();
    const path = project.path.trim();
    if (!name || !path) {
      continue;
    }

    const dedupeKey = path.toLowerCase();
    if (dedupedProjects.has(dedupeKey)) {
      continue;
    }

    dedupedProjects.set(dedupeKey, {
      name,
      path,
      workspaceId: project.workspaceId?.trim() || null,
      projectId: project.projectId?.trim() || null,
    });
  }

  return [...dedupedProjects.values()];
}

export function normalizeLaunchProjectCollection(
  input:
    | TerminalLaunchProjectCollection
    | readonly TerminalLaunchProject[]
    | null
    | undefined,
  fallback: {
    source: TerminalLaunchProjectSourceKind;
    sourceLabel?: string | null;
  },
): NormalizedLaunchProjectCollection {
  if (Array.isArray(input)) {
    return {
      source: fallback.source,
      sourceLabel: fallback.sourceLabel ?? null,
      projects: normalizeLaunchProjects(input),
    };
  }

  if (!input) {
    return {
      source: fallback.source,
      sourceLabel: fallback.sourceLabel ?? null,
      projects: [],
    };
  }

  if (isTerminalLaunchProjectCollection(input)) {
    return {
      source: input.source,
      sourceLabel: input.sourceLabel?.trim() || null,
      projects: normalizeLaunchProjects(input.projects),
    };
  }

  return {
    source: fallback.source,
    sourceLabel: fallback.sourceLabel ?? null,
    projects: [],
  };
}

export function resolveLaunchProjectNameFromPath(path: string) {
  const normalizedPath = path.replace(/[\\/]+$/g, "");
  if (!normalizedPath) {
    return "Project";
  }

  const segments = normalizedPath.split(/[\\/]/u).filter(Boolean);
  return segments.at(-1) ?? normalizedPath;
}
