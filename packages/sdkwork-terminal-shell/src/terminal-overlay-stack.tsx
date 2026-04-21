import type {
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";
import {
  createLaunchProjectCollectionEvent,
  type LaunchProjectFlowState,
  type LaunchWorkingDirectorySelection,
} from "./launch-flow.ts";
import type { LaunchProfileDefinition } from "./launch-profiles.ts";
import type {
  TerminalLaunchProjectCollectionEvent,
  TerminalLaunchProjectRemovalEvent,
} from "./launch-projects.ts";
import type { ProfileMenuDescriptor } from "./profile-menu.tsx";
import {
  TerminalLaunchProjectFlowOverlays,
  TerminalProfileMenu,
} from "./terminal-launch-ui.tsx";
import {
  TerminalTabContextMenu,
  type ConnectorCatalogStatusLike,
  type ProfileMenuPosition,
  type TerminalTabContextMenuState,
} from "./terminal-overlays.tsx";

interface ConnectorLaunchMenuEntry {
  targetId: string;
  label: string;
  subtitle: string;
  accent: string;
}

export interface TerminalOverlayStackProps {
  profileMenuOpen: boolean;
  profileMenuRef: RefObject<HTMLDivElement>;
  profileMenuPosition: ProfileMenuPosition | null;
  profileMenuStatus: ProfileMenuDescriptor | null;
  shellLaunchProfiles: readonly LaunchProfileDefinition[];
  wslLaunchProfiles: readonly LaunchProfileDefinition[];
  desktopWslDiscoveryStatus: ProfileMenuDescriptor | null;
  cliLaunchProfiles: readonly LaunchProfileDefinition[];
  connectorEntries?: readonly ConnectorLaunchMenuEntry[] | null;
  connectorCatalogStatus?: ConnectorCatalogStatusLike | null;
  sessionCenterEnabled?: boolean;
  sessionCenterMenuSubtitle: string;
  onSelectLaunchEntry: (entry: LaunchProfileDefinition) => void | Promise<void>;
  onSelectConnectorEntry: (entry: ConnectorLaunchMenuEntry) => void;
  onSelectSessionCenter?: () => void;
  launchProjectFlowState: LaunchProjectFlowState | null;
  setLaunchProjectFlowState: Dispatch<SetStateAction<LaunchProjectFlowState | null>>;
  activeWorkingDirectory?: string | null;
  onCancelLaunchProjectFlow: () => void;
  onLaunchEntryInWorkingDirectory: (
    entry: LaunchProfileDefinition,
    selection: LaunchWorkingDirectorySelection,
  ) => void;
  onPickWorkingDirectoryForEntry: (entry: LaunchProfileDefinition) => void | Promise<void>;
  onRemoveLaunchProject?: (
    event: TerminalLaunchProjectRemovalEvent,
  ) => void | Promise<void>;
  onClearLaunchProjects?: (
    event: TerminalLaunchProjectCollectionEvent,
  ) => void | Promise<void>;
  contextMenu: TerminalTabContextMenuState | null;
  contextMenuRef: RefObject<HTMLDivElement>;
  onContextMenuCopy: () => void;
  onContextMenuPaste: () => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseTabsToRight: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
}

export function TerminalOverlayStack(props: TerminalOverlayStackProps) {
  const canManageRecentLaunchProjects =
    props.launchProjectFlowState?.kind === "selecting" &&
    props.launchProjectFlowState.source === "recent";

  return (
    <>
      {props.profileMenuOpen ? (
        <TerminalProfileMenu
          menuRef={props.profileMenuRef}
          position={props.profileMenuPosition}
          profileMenuStatus={props.profileMenuStatus}
          shellLaunchProfiles={props.shellLaunchProfiles}
          wslLaunchProfiles={props.wslLaunchProfiles}
          desktopWslDiscoveryStatus={props.desktopWslDiscoveryStatus}
          cliLaunchProfiles={props.cliLaunchProfiles}
          connectorEntries={props.connectorEntries}
          connectorCatalogStatus={props.connectorCatalogStatus}
          sessionCenterEnabled={props.sessionCenterEnabled}
          sessionCenterMenuSubtitle={props.sessionCenterMenuSubtitle}
          onSelectLaunchEntry={props.onSelectLaunchEntry}
          onSelectConnectorEntry={props.onSelectConnectorEntry}
          onSelectSessionCenter={props.onSelectSessionCenter}
        />
      ) : null}

      <TerminalLaunchProjectFlowOverlays
        flowState={props.launchProjectFlowState}
        activeWorkingDirectory={props.activeWorkingDirectory}
        onCancel={props.onCancelLaunchProjectFlow}
        onSelectProject={(state, project) => {
          props.onCancelLaunchProjectFlow();
          props.onLaunchEntryInWorkingDirectory(state.entry, {
            projectName: project.name,
            source: state.source,
            sourceLabel: state.sourceLabel,
            workingDirectory: project.path,
            workspaceId: project.workspaceId,
            projectId: project.projectId,
          });
        }}
        onSelectWorkingDirectory={async (state) => {
          const launchEntry = state.entry;
          props.onCancelLaunchProjectFlow();
          await props.onPickWorkingDirectoryForEntry(launchEntry);
        }}
        onRemoveProject={
          canManageRecentLaunchProjects && props.onRemoveLaunchProject
            ? async (state, project) => {
                await props.onRemoveLaunchProject?.({
                  ...createLaunchProjectCollectionEvent(
                    state.entry,
                    state.source,
                    state.sourceLabel,
                  ),
                  project: {
                    name: project.name,
                    path: project.path,
                    workspaceId: project.workspaceId,
                    projectId: project.projectId,
                  },
                });
                props.setLaunchProjectFlowState((current) => {
                  if (!current || current.kind !== "selecting") {
                    return current;
                  }

                  return {
                    ...current,
                    projects: current.projects.filter(
                      (candidate) =>
                        candidate.path.toLowerCase() !== project.path.toLowerCase(),
                    ),
                  };
                });
              }
            : undefined
        }
        onClearProjects={
          canManageRecentLaunchProjects && props.onClearLaunchProjects
            ? async (state) => {
                await props.onClearLaunchProjects?.(
                  createLaunchProjectCollectionEvent(
                    state.entry,
                    state.source,
                    state.sourceLabel,
                  ),
                );
                props.setLaunchProjectFlowState((current) => {
                  if (!current || current.kind !== "selecting") {
                    return current;
                  }

                  return {
                    ...current,
                    projects: [],
                  };
                });
              }
            : undefined
        }
      />

      {props.contextMenu ? (
        <TerminalTabContextMenu
          ref={props.contextMenuRef}
          menu={props.contextMenu}
          onCopy={props.onContextMenuCopy}
          onPaste={props.onContextMenuPaste}
          onCloseTab={props.onCloseTab}
          onCloseOtherTabs={props.onCloseOtherTabs}
          onCloseTabsToRight={props.onCloseTabsToRight}
          onDuplicateTab={props.onDuplicateTab}
        />
      ) : null}
    </>
  );
}
