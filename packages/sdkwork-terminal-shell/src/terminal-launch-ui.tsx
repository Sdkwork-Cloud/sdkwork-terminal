import type { RefObject } from "react";
import {
  LaunchProjectPickerDialog,
  LaunchProjectResolvingDialog,
} from "./launch-project-dialogs.tsx";
import type { LaunchProjectFlowState } from "./launch-flow.ts";
import type { LaunchProfileDefinition } from "./launch-profiles.ts";
import type { NormalizedLaunchProject } from "./launch-projects.ts";
import {
  ProfileMenuActionItem,
  ProfileMenuDivider,
  ProfileMenuSection,
  ProfileMenuStatusItem,
  type ProfileMenuDescriptor,
  profileMenuStyle,
} from "./profile-menu.tsx";
import {
  ConnectorCatalogStatusMenuItem,
  type ConnectorCatalogStatusLike,
  type ProfileMenuPosition,
} from "./terminal-overlays.tsx";

interface ConnectorLaunchMenuEntry {
  targetId: string;
  label: string;
  subtitle: string;
  accent: string;
}

type LaunchProjectSelectingState = Extract<LaunchProjectFlowState, { kind: "selecting" }>;

export function TerminalProfileMenu(props: {
  menuRef: RefObject<HTMLDivElement>;
  position: ProfileMenuPosition | null;
  profileMenuStatus: ProfileMenuDescriptor | null;
  shellLaunchProfiles: readonly LaunchProfileDefinition[];
  wslLaunchProfiles: readonly LaunchProfileDefinition[];
  desktopWslDiscoveryStatus: ProfileMenuDescriptor | null;
  cliLaunchProfiles: readonly LaunchProfileDefinition[];
  connectorEntries?: readonly ConnectorLaunchMenuEntry[] | null;
  connectorCatalogStatus?: ConnectorCatalogStatusLike | null;
  sessionCenterEnabled?: boolean;
  sessionCenterMenuSubtitle: string;
  onSelectLaunchEntry: (entry: LaunchProfileDefinition) => void;
  onSelectConnectorEntry: (entry: ConnectorLaunchMenuEntry) => void;
  onSelectSessionCenter?: () => void;
}) {
  if (!props.position) {
    return null;
  }

  return (
    <div
      ref={props.menuRef}
      role="menu"
      aria-label="Terminal profiles"
      style={profileMenuStyle(props.position)}
    >
      {props.profileMenuStatus ? (
        <>
          <ProfileMenuStatusItem
            descriptor={props.profileMenuStatus}
            slot="terminal-profile-menu-status"
          />
          <ProfileMenuDivider />
        </>
      ) : null}
      <ProfileMenuSection
        title="Shells"
        entries={props.shellLaunchProfiles}
        getKey={(entry) => entry.id}
        onSelect={props.onSelectLaunchEntry}
      />
      {props.wslLaunchProfiles.length > 0 ? (
        <>
          <ProfileMenuDivider />
          <ProfileMenuSection
            title="WSL"
            entries={props.wslLaunchProfiles}
            getKey={(entry) => entry.id}
            onSelect={props.onSelectLaunchEntry}
          />
        </>
      ) : null}
      {props.desktopWslDiscoveryStatus ? (
        <>
          <ProfileMenuDivider />
          <ProfileMenuStatusItem
            descriptor={props.desktopWslDiscoveryStatus}
            slot="terminal-wsl-discovery-status"
          />
        </>
      ) : null}
      <ProfileMenuDivider />
      <ProfileMenuSection
        title="AI CLI"
        entries={props.cliLaunchProfiles}
        getKey={(entry) => entry.id}
        onSelect={props.onSelectLaunchEntry}
      />
      {(props.connectorEntries?.length ?? 0) > 0 ? (
        <>
          <ProfileMenuDivider />
          <ProfileMenuSection
            title="Connectors"
            entries={props.connectorEntries ?? []}
            getKey={(entry) => entry.targetId}
            onSelect={props.onSelectConnectorEntry}
          />
        </>
      ) : null}
      {props.connectorCatalogStatus && props.connectorCatalogStatus.state !== "ready" ? (
        <>
          <ProfileMenuDivider />
          <ConnectorCatalogStatusMenuItem status={props.connectorCatalogStatus} />
        </>
      ) : null}
      {props.sessionCenterEnabled && props.onSelectSessionCenter ? (
        <>
          <ProfileMenuDivider />
          <ProfileMenuActionItem
            accent="#38bdf8"
            label="Session Center"
            subtitle={props.sessionCenterMenuSubtitle}
            slot="terminal-session-center-trigger"
            onSelect={props.onSelectSessionCenter}
          />
        </>
      ) : null}
    </div>
  );
}

export function TerminalLaunchProjectFlowOverlays(props: {
  flowState: LaunchProjectFlowState | null;
  activeWorkingDirectory?: string | null;
  onCancel: () => void;
  onSelectProject: (
    state: LaunchProjectSelectingState,
    project: NormalizedLaunchProject,
  ) => void;
  onSelectWorkingDirectory: (state: LaunchProjectSelectingState) => void | Promise<void>;
  onRemoveProject?: (
    state: LaunchProjectSelectingState,
    project: NormalizedLaunchProject,
  ) => void | Promise<void>;
  onClearProjects?: (state: LaunchProjectSelectingState) => void | Promise<void>;
}) {
  const flowState = props.flowState;

  if (!flowState) {
    return null;
  }

  if (flowState.kind === "resolving") {
    return (
      <LaunchProjectResolvingDialog
        entryLabel={flowState.entry.label}
        sourceLabel={flowState.sourceLabel}
        onCancel={props.onCancel}
      />
    );
  }

  return (
    <LaunchProjectPickerDialog
      entryLabel={flowState.entry.label}
      sourceLabel={flowState.sourceLabel}
      projects={flowState.projects}
      activeWorkingDirectory={props.activeWorkingDirectory}
      onClose={props.onCancel}
      onSelect={(project) => {
        props.onSelectProject(flowState, project);
      }}
      onSelectWorkingDirectory={() => props.onSelectWorkingDirectory(flowState)}
      onRemoveProject={
        props.onRemoveProject
          ? (project) => props.onRemoveProject?.(flowState, project)
          : undefined
      }
      onClearProjects={
        props.onClearProjects
          ? () => props.onClearProjects?.(flowState)
          : undefined
      }
    />
  );
}
