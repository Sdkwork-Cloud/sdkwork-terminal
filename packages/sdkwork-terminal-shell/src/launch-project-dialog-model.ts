export interface LaunchProjectListItemLike {
  name: string;
  path: string;
}

type KeyboardTargetLike = {
  tagName?: unknown;
  closest?: unknown;
};

const LAUNCH_PROJECT_PICKER_ACTION_TARGET_SELECTOR = [
  "button",
  "a[href]",
  '[role="button"]',
  '[role="menuitem"]',
].join(", ");

const LAUNCH_PROJECT_PICKER_ROW_ACTION_TARGET_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  '[role="menuitem"]',
  "[data-launch-project-picker-action]",
].join(", ");

function resolveKeyboardTargetTagName(target: EventTarget | KeyboardTargetLike | null) {
  if (!target || typeof target !== "object" || !("tagName" in target)) {
    return "";
  }

  const tagName = target.tagName;
  return typeof tagName === "string" ? tagName.toLowerCase() : "";
}

function matchesKeyboardTargetSelector(
  target: EventTarget | KeyboardTargetLike | null,
  selector: string,
) {
  if (!target || typeof target !== "object" || !("closest" in target)) {
    return false;
  }

  const closest = target.closest;
  if (typeof closest !== "function") {
    return false;
  }

  return closest.call(target, selector) !== null;
}

export function filterLaunchProjects<TProject extends LaunchProjectListItemLike>(
  projects: readonly TProject[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return projects;
  }

  return projects.filter((project) =>
    project.name.toLowerCase().includes(normalizedQuery) ||
    project.path.toLowerCase().includes(normalizedQuery),
  );
}

export function resolvePreferredLaunchProjectIndex(
  projects: readonly LaunchProjectListItemLike[],
  activeWorkingDirectory?: string | null,
) {
  const normalizedWorkingDirectory = activeWorkingDirectory?.trim().toLowerCase();
  if (!normalizedWorkingDirectory) {
    return 0;
  }

  const matchingIndex = projects.findIndex(
    (project) => project.path.toLowerCase() === normalizedWorkingDirectory,
  );
  return matchingIndex >= 0 ? matchingIndex : 0;
}

export function resolveBoundedLaunchProjectIndex(
  currentIndex: number,
  projectCount: number,
  preferredIndex: number,
) {
  if (projectCount <= 0) {
    return 0;
  }

  if (currentIndex >= 0 && currentIndex < projectCount) {
    return currentIndex;
  }

  if (preferredIndex >= 0 && preferredIndex < projectCount) {
    return preferredIndex;
  }

  return 0;
}

export function resolveNextLaunchProjectIndex(
  currentIndex: number,
  projectCount: number,
  direction: "next" | "previous",
) {
  if (projectCount <= 0) {
    return 0;
  }

  if (direction === "next") {
    return currentIndex >= projectCount - 1 ? 0 : currentIndex + 1;
  }

  return currentIndex <= 0 ? projectCount - 1 : currentIndex - 1;
}

export function shouldIgnoreLaunchProjectPickerNavigationTarget(
  target: EventTarget | KeyboardTargetLike | null,
) {
  const tagName = resolveKeyboardTargetTagName(target);
  if (tagName === "button" || tagName === "a") {
    return true;
  }

  return matchesKeyboardTargetSelector(
    target,
    LAUNCH_PROJECT_PICKER_ACTION_TARGET_SELECTOR,
  );
}

export function shouldIgnoreLaunchProjectPickerRowActivationTarget(
  target: EventTarget | KeyboardTargetLike | null,
) {
  const tagName = resolveKeyboardTargetTagName(target);
  if (
    tagName === "button" ||
    tagName === "a" ||
    tagName === "input" ||
    tagName === "select" ||
    tagName === "textarea"
  ) {
    return true;
  }

  return matchesKeyboardTargetSelector(
    target,
    LAUNCH_PROJECT_PICKER_ROW_ACTION_TARGET_SELECTOR,
  );
}
