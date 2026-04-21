import { useState, type Dispatch, type SetStateAction } from "react";
import type { LaunchProjectFlowState } from "./launch-flow.ts";
import {
  DESKTOP_LAUNCH_PROFILES,
  WEB_LAUNCH_PROFILES,
  type LaunchProfileDefinition,
} from "./launch-profiles.ts";
import {
  summarizeSessionCenterMenuSubtitle,
  type SessionCenterReplayDiagnostics,
} from "./session-center-status";
import type { ProfileMenuDescriptor } from "./profile-menu.tsx";
import type {
  ProfileMenuPosition,
  TerminalTabContextMenuState,
} from "./terminal-overlays.tsx";

export interface UseShellOverlayStateArgs {
  mode: "desktop" | "web";
  sessionCenterReplayDiagnostics?: SessionCenterReplayDiagnostics;
  onToggleSessionCenter?: () => void;
}

export interface ShellOverlayState {
  profileMenuOpen: boolean;
  setProfileMenuOpen: Dispatch<SetStateAction<boolean>>;
  profileMenuPosition: ProfileMenuPosition | null;
  setProfileMenuPosition: Dispatch<SetStateAction<ProfileMenuPosition | null>>;
  contextMenu: TerminalTabContextMenuState | null;
  setContextMenu: Dispatch<SetStateAction<TerminalTabContextMenuState | null>>;
  profileMenuStatus: ProfileMenuDescriptor | null;
  setProfileMenuStatus: Dispatch<SetStateAction<ProfileMenuDescriptor | null>>;
  launchProjectFlowState: LaunchProjectFlowState | null;
  setLaunchProjectFlowState: Dispatch<SetStateAction<LaunchProjectFlowState | null>>;
  desktopWslLaunchProfiles: LaunchProfileDefinition[];
  setDesktopWslLaunchProfiles: Dispatch<SetStateAction<LaunchProfileDefinition[]>>;
  desktopWslDiscoveryStatus: ProfileMenuDescriptor | null;
  setDesktopWslDiscoveryStatus: Dispatch<SetStateAction<ProfileMenuDescriptor | null>>;
  launchProfiles: LaunchProfileDefinition[];
  shellLaunchProfiles: LaunchProfileDefinition[];
  wslLaunchProfiles: LaunchProfileDefinition[];
  cliLaunchProfiles: LaunchProfileDefinition[];
  sessionCenterMenuSubtitle: string;
  handleSelectSessionCenter: () => void;
}

export function useShellOverlayState(args: UseShellOverlayStateArgs): ShellOverlayState {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileMenuPosition, setProfileMenuPosition] = useState<ProfileMenuPosition | null>(
    null,
  );
  const [contextMenu, setContextMenu] = useState<TerminalTabContextMenuState | null>(null);
  const [profileMenuStatus, setProfileMenuStatus] = useState<ProfileMenuDescriptor | null>(null);
  const [launchProjectFlowState, setLaunchProjectFlowState] =
    useState<LaunchProjectFlowState | null>(null);
  const [desktopWslLaunchProfiles, setDesktopWslLaunchProfiles] = useState<
    LaunchProfileDefinition[]
  >([]);
  const [desktopWslDiscoveryStatus, setDesktopWslDiscoveryStatus] = useState<
    ProfileMenuDescriptor | null
  >(null);
  const launchProfiles =
    args.mode === "desktop"
      ? [...DESKTOP_LAUNCH_PROFILES, ...desktopWslLaunchProfiles]
      : WEB_LAUNCH_PROFILES;
  const shellLaunchProfiles = launchProfiles.filter((entry) => entry.group === "shell");
  const wslLaunchProfiles = launchProfiles.filter((entry) => entry.group === "wsl");
  const cliLaunchProfiles = launchProfiles.filter((entry) => entry.group === "cli");
  const sessionCenterMenuSubtitle = summarizeSessionCenterMenuSubtitle(
    args.sessionCenterReplayDiagnostics,
    "Reconnect detached shell sessions",
  );

  function handleSelectSessionCenter() {
    setProfileMenuOpen(false);
    setProfileMenuPosition(null);
    args.onToggleSessionCenter?.();
  }

  return {
    profileMenuOpen,
    setProfileMenuOpen,
    profileMenuPosition,
    setProfileMenuPosition,
    contextMenu,
    setContextMenu,
    profileMenuStatus,
    setProfileMenuStatus,
    launchProjectFlowState,
    setLaunchProjectFlowState,
    desktopWslLaunchProfiles,
    setDesktopWslLaunchProfiles,
    desktopWslDiscoveryStatus,
    setDesktopWslDiscoveryStatus,
    launchProfiles,
    shellLaunchProfiles,
    wslLaunchProfiles,
    cliLaunchProfiles,
    sessionCenterMenuSubtitle,
    handleSelectSessionCenter,
  };
}
