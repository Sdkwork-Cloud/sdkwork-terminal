import type { LaunchProfileDefinition } from "./launch-profiles.ts";
import type { TerminalShellSnapshot } from "./model.ts";

type TerminalTabListItem = Pick<
  TerminalShellSnapshot["tabs"][number],
  | "id"
  | "title"
  | "profile"
  | "active"
  | "closable"
  | "runtimeState"
  | "runtimeSessionId"
>;

type TerminalTabListProfile = Pick<
  LaunchProfileDefinition,
  "id" | "group" | "profile" | "label" | "accent"
>;

export interface TerminalTabListMemoProps {
  tabs: readonly TerminalTabListItem[];
  launchProfiles: readonly TerminalTabListProfile[];
  hoveredTabId: string | null;
  shouldDockTabActionsToTrailing: boolean;
}

function areTerminalTabListItemsEqual(
  previousTabs: readonly TerminalTabListItem[],
  nextTabs: readonly TerminalTabListItem[],
) {
  if (previousTabs === nextTabs) {
    return true;
  }

  if (previousTabs.length !== nextTabs.length) {
    return false;
  }

  return previousTabs.every((previousTab, index) => {
    const nextTab = nextTabs[index]!;
    return (
      previousTab.id === nextTab.id &&
      previousTab.title === nextTab.title &&
      previousTab.profile === nextTab.profile &&
      previousTab.active === nextTab.active &&
      previousTab.closable === nextTab.closable &&
      previousTab.runtimeState === nextTab.runtimeState &&
      previousTab.runtimeSessionId === nextTab.runtimeSessionId
    );
  });
}

function areLaunchProfilesEqual(
  previousProfiles: readonly TerminalTabListProfile[],
  nextProfiles: readonly TerminalTabListProfile[],
) {
  if (previousProfiles === nextProfiles) {
    return true;
  }

  if (previousProfiles.length !== nextProfiles.length) {
    return false;
  }

  for (let index = 0; index < previousProfiles.length; index += 1) {
    const previousProfile = previousProfiles[index]!;
    const nextProfile = nextProfiles[index]!;
    if (
      previousProfile.id !== nextProfile.id ||
      previousProfile.group !== nextProfile.group ||
      previousProfile.profile !== nextProfile.profile ||
      previousProfile.label !== nextProfile.label ||
      previousProfile.accent !== nextProfile.accent
    ) {
      return false;
    }
  }

  return true;
}

export function shouldReuseTerminalTabListRender(
  previousProps: TerminalTabListMemoProps,
  nextProps: TerminalTabListMemoProps,
) {
  return (
    previousProps.hoveredTabId === nextProps.hoveredTabId &&
    previousProps.shouldDockTabActionsToTrailing ===
      nextProps.shouldDockTabActionsToTrailing &&
    areTerminalTabListItemsEqual(previousProps.tabs, nextProps.tabs) &&
    areLaunchProfilesEqual(previousProps.launchProfiles, nextProps.launchProfiles)
  );
}
