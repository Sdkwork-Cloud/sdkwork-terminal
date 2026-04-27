import { useEffect, useRef } from "react";
import type { LaunchProfileDefinition } from "./launch-profiles.ts";
import {
  refreshDesktopWslLaunchProfiles as refreshDesktopWslLaunchProfilesController,
  toggleProfileMenu as toggleProfileMenuController,
  updateProfileMenuPosition as updateProfileMenuPositionController,
} from "./profile-menu-controller.ts";
import type { ProfileMenuDescriptor } from "./profile-menu.tsx";
import type {
  ProfileMenuPosition,
  TerminalTabContextMenuState,
} from "./terminal-overlays.tsx";

interface MutableRefObjectLike<T> {
  current: T;
}

type DesktopWslDiscoveryRuntimeClient = Parameters<
  typeof refreshDesktopWslLaunchProfilesController
>[0]["desktopRuntimeClient"];

export interface UseShellProfileMenuBridgeArgs {
  mode: "desktop" | "web";
  profileMenuOpen: boolean;
  desktopRuntimeClientRef: MutableRefObjectLike<DesktopWslDiscoveryRuntimeClient | undefined>;
  desktopWslLaunchProfiles: readonly LaunchProfileDefinition[];
  mountedRef: MutableRefObjectLike<boolean>;
  headerChromeRef: MutableRefObjectLike<HTMLDivElement | null>;
  onBeforeProfileMenuOpen?: () => void;
  setDesktopWslLaunchProfiles: (profiles: LaunchProfileDefinition[]) => void;
  setDesktopWslDiscoveryStatus: (status: ProfileMenuDescriptor | null) => void;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  setProfileMenuOpen: (open: boolean) => void;
  setProfileMenuPosition: (position: ProfileMenuPosition | null) => void;
  setProfileMenuStatus: (status: ProfileMenuDescriptor | null) => void;
}

export function useShellProfileMenuBridge(args: UseShellProfileMenuBridgeArgs) {
  const wslDiscoveryPromiseRef = useRef<Promise<void> | null>(null);
  const wslDiscoveryLastSuccessAtRef = useRef(0);

  function refreshDesktopWslLaunchProfiles(refreshArgs: { force?: boolean } = {}) {
    return refreshDesktopWslLaunchProfilesController({
      force: refreshArgs.force ?? false,
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClientRef.current,
      desktopWslLaunchProfiles: args.desktopWslLaunchProfiles,
      mountedRef: args.mountedRef,
      wslDiscoveryPromiseRef,
      wslDiscoveryLastSuccessAtRef,
      setDesktopWslLaunchProfiles: args.setDesktopWslLaunchProfiles,
      setDesktopWslDiscoveryStatus: args.setDesktopWslDiscoveryStatus,
    });
  }

  function updateProfileMenuPosition() {
    updateProfileMenuPositionController({
      headerChromeElement: args.headerChromeRef.current,
      setProfileMenuPosition: args.setProfileMenuPosition,
    });
  }

  function toggleProfileMenu() {
    toggleProfileMenuController({
      profileMenuOpen: args.profileMenuOpen,
      headerChromeElement: args.headerChromeRef.current,
      onBeforeProfileMenuOpen: args.onBeforeProfileMenuOpen,
      refreshDesktopWslLaunchProfiles: () =>
        refreshDesktopWslLaunchProfiles({ force: false }),
      setContextMenu: args.setContextMenu,
      setProfileMenuOpen: args.setProfileMenuOpen,
      setProfileMenuPosition: args.setProfileMenuPosition,
      setProfileMenuStatus: args.setProfileMenuStatus,
    });
  }

  useEffect(() => {
    if (!args.profileMenuOpen) {
      return;
    }

    updateProfileMenuPosition();
  }, [args.desktopWslLaunchProfiles.length, args.profileMenuOpen]);

  return {
    refreshDesktopWslLaunchProfiles,
    updateProfileMenuPosition,
    toggleProfileMenu,
  };
}
