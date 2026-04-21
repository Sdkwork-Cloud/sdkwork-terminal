import type {
  TerminalLaunchProject,
  TerminalLaunchProjectActivationEvent,
  TerminalLaunchProjectCollection,
  TerminalLaunchProjectResolutionRequest,
} from "@sdkwork/terminal-shell";

const RECENT_LAUNCH_PROJECTS_STORAGE_KEY = "sdkwork-terminal.recent-launch-projects.v1";
const RECENT_LAUNCH_PROJECTS_LIMIT = 12;

export function readRecentLaunchProjects(): TerminalLaunchProject[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_LAUNCH_PROJECTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const projects: TerminalLaunchProject[] = [];
    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== "object") {
        continue;
      }

      const record = candidate as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const path = typeof record.path === "string" ? record.path.trim() : "";
      if (!name || !path) {
        continue;
      }

      projects.push({
        name,
        path,
        workspaceId: typeof record.workspaceId === "string" ? record.workspaceId : null,
        projectId: typeof record.projectId === "string" ? record.projectId : null,
      });
    }

    return projects.slice(0, RECENT_LAUNCH_PROJECTS_LIMIT);
  } catch {
    return [];
  }
}

export function writeRecentLaunchProjects(projects: readonly TerminalLaunchProject[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      RECENT_LAUNCH_PROJECTS_STORAGE_KEY,
      JSON.stringify(projects.slice(0, RECENT_LAUNCH_PROJECTS_LIMIT)),
    );
  } catch {
    // Ignore storage quota and private-mode persistence failures.
  }
}

export function mergeRecentLaunchProject(
  currentProjects: readonly TerminalLaunchProject[],
  nextProject: TerminalLaunchProject,
) {
  const normalizedPath = nextProject.path.trim().toLowerCase();
  if (!normalizedPath) {
    return currentProjects.slice(0, RECENT_LAUNCH_PROJECTS_LIMIT);
  }

  const deduped = currentProjects.filter(
    (project) => project.path.trim().toLowerCase() !== normalizedPath,
  );
  return [nextProject, ...deduped].slice(0, RECENT_LAUNCH_PROJECTS_LIMIT);
}

export function removeRecentLaunchProject(
  currentProjects: readonly TerminalLaunchProject[],
  project: Pick<TerminalLaunchProject, "path">,
) {
  const normalizedPath = project.path.trim().toLowerCase();
  if (!normalizedPath) {
    return currentProjects.slice(0, RECENT_LAUNCH_PROJECTS_LIMIT);
  }

  return currentProjects.filter(
    (currentProject) => currentProject.path.trim().toLowerCase() !== normalizedPath,
  );
}

export function clearRecentLaunchProjects() {
  return [] as TerminalLaunchProject[];
}

export async function resolveDesktopLaunchProjectCollection(args: {
  request: TerminalLaunchProjectResolutionRequest;
  resolveLaunchProjects?:
    | ((
        request: TerminalLaunchProjectResolutionRequest,
      ) =>
        | Promise<TerminalLaunchProjectCollection | readonly TerminalLaunchProject[] | null | undefined>
        | TerminalLaunchProjectCollection
        | readonly TerminalLaunchProject[]
        | null
        | undefined)
    | undefined;
  launchProjects?: readonly TerminalLaunchProject[] | undefined;
  recentLaunchProjects: readonly TerminalLaunchProject[];
}): Promise<TerminalLaunchProjectCollection | readonly TerminalLaunchProject[]> {
  const explicitProjects = await args.resolveLaunchProjects?.(args.request);
  if (explicitProjects != null) {
    return explicitProjects;
  }

  if (args.launchProjects != null) {
    return {
      source: "provided",
      sourceLabel: "Provided projects",
      projects: args.launchProjects,
    };
  }

  return {
    source: "recent",
    sourceLabel: "Recent projects",
    projects: args.recentLaunchProjects,
  };
}

export function createRecentLaunchProjectFromActivationEvent(
  event: TerminalLaunchProjectActivationEvent,
): TerminalLaunchProject | null {
  const nextProject: TerminalLaunchProject = {
    name: event.project.name.trim(),
    path: event.project.path.trim(),
    workspaceId: event.project.workspaceId ?? null,
    projectId: event.project.projectId ?? null,
  };

  if (!nextProject.name || !nextProject.path) {
    return null;
  }

  return nextProject;
}
