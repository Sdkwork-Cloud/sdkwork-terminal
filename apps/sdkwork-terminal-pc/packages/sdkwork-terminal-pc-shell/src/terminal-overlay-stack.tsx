import type {
  Dispatch,
  SetStateAction,
} from "react";
import {
  createLaunchProjectCollectionEvent,
  type LaunchProjectFlowState,
  type LaunchWorkingDirectorySelection,
} from "./launch-flow";
import type { LaunchProfileDefinition } from "./launch-profiles";
import type { TerminalShellSnapshot } from "./model";
import type {
  TerminalLaunchProjectCollectionEvent,
  TerminalLaunchProjectRemovalEvent,
} from "./launch-projects";
import type { ProfileMenuDescriptor } from "./profile-menu.tsx";
import type { NullableElementRef } from "./ref-types";
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
import { TerminalCloseConfirmationDialog } from "./terminal-close-confirmation.tsx";
import type { TerminalCloseRequest } from "./terminal-close-guard";
import type { TerminalCloseConfirmationMessages } from "./terminal-interaction-messages";

interface ConnectorLaunchMenuEntry {
  targetId: string;
  label: string;
  subtitle: string;
  accent: string;
}

export interface TerminalOverlayStackProps {
  profileMenuOpen: boolean;
  setProfileMenuOpen: (open: boolean) => void;
  profileMenuRef: NullableElementRef<HTMLDivElement>;
  profileMenuPosition: ProfileMenuPosition | null;
  setProfileMenuPosition: (position: ProfileMenuPosition | null) => void;
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
  tabs: TerminalShellSnapshot["tabs"];
  contextMenu: TerminalTabContextMenuState | null;
  setContextMenu: (menu: TerminalTabContextMenuState | null) => void;
  closeConfirmation: TerminalCloseRequest | null;
  closeConfirmationMessages?: TerminalCloseConfirmationMessages;
  contextMenuRef: NullableElementRef<HTMLDivElement>;
  onContextMenuCopy: () => void;
  onContextMenuPaste: () => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseTabsToRight: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
  onConfirmCloseConfirmation: () => void;
  onCancelCloseConfirmation: () => void;
}

export function TerminalOverlayStack(props: TerminalOverlayStackProps) {
  const canManageRecentLaunchProjects =
    props.launchProjectFlowState?.kind === "selecting" &&
    props.launchProjectFlowState.source === "recent";
  const contextMenuTabIndex = props.contextMenu
    ? props.tabs.findIndex((tab) => tab.id === props.contextMenu!.tabId)
    : -1;
  const canPaste =
    contextMenuTabIndex >= 0 && props.tabs[contextMenuTabIndex]?.active === true;

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
          onRequestClose={() => {
            props.setProfileMenuOpen(false);
            props.setProfileMenuPosition(null);
            window.requestAnimationFrame(() => {
              document
                .querySelector<HTMLButtonElement>(
                  '[data-slot="terminal-profile-menu-trigger"]',
                )
                ?.focus();
            });
          }}
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
          canPaste={canPaste}
          canCloseTab={contextMenuTabIndex >= 0 && props.tabs.length > 1}
          canCloseOtherTabs={contextMenuTabIndex >= 0 && props.tabs.length > 1}
          canCloseTabsToRight={contextMenuTabIndex >= 0 && contextMenuTabIndex < props.tabs.length - 1}
          onCloseTab={props.onCloseTab}
          onCloseOtherTabs={props.onCloseOtherTabs}
          onCloseTabsToRight={props.onCloseTabsToRight}
          onDuplicateTab={props.onDuplicateTab}
          onRequestClose={() => {
            const tabId = props.contextMenu?.tabId;
            props.setContextMenu(null);
            if (!tabId) {
              return;
            }

            window.requestAnimationFrame(() => {
              document.getElementById(`terminal-tab-${tabId}`)?.focus();
            });
          }}
        />
      ) : null}

      {props.closeConfirmation ? (
        <TerminalCloseConfirmationDialog
          request={props.closeConfirmation}
          messages={props.closeConfirmationMessages}
          onConfirm={props.onConfirmCloseConfirmation}
          onCancel={props.onCancelCloseConfirmation}
        />
      ) : null}
    </>
  );
}

