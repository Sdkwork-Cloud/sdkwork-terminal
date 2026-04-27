import {
  createDesktopWslDiscoveryFailureStatus,
  isWindowsDesktopHost,
  resolveDesktopWslLaunchProfiles,
  WSL_DISCOVERY_CACHE_TTL_MS,
  WSL_DISCOVERY_COMMAND,
  type LaunchProfileDefinition,
} from "./launch-profiles.ts";
import type { TerminalShellProfile } from "./model";
import type { ProfileMenuDescriptor } from "./profile-menu.tsx";
import {
  resolveProfileMenuPosition,
  type ProfileMenuPosition,
  type TerminalTabContextMenuState,
} from "./terminal-overlays.tsx";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";

interface DesktopWslDiscoveryRuntimeClient {
  executeLocalShellCommand?: (request: {
    profile: TerminalShellProfile;
    commandText: string;
    workingDirectory?: string;
  }) => Promise<{
    exitCode: number;
    stdout: string;
  }>;
}

interface MutableRefObjectLike<T> {
  current: T;
}

interface DesktopWslLaunchProfileRefreshArgs {
  force?: boolean;
  mode: "desktop" | "web";
  desktopRuntimeClient?: DesktopWslDiscoveryRuntimeClient | null;
  desktopWslLaunchProfiles: readonly LaunchProfileDefinition[];
  mountedRef: MutableRefObjectLike<boolean>;
  wslDiscoveryPromiseRef: MutableRefObjectLike<Promise<void> | null>;
  wslDiscoveryLastSuccessAtRef: MutableRefObjectLike<number>;
  setDesktopWslLaunchProfiles: (profiles: LaunchProfileDefinition[]) => void;
  setDesktopWslDiscoveryStatus: (status: ProfileMenuDescriptor | null) => void;
}

export async function refreshDesktopWslLaunchProfiles(
  args: DesktopWslLaunchProfileRefreshArgs,
) {
  const runLocalShellCommand = args.desktopRuntimeClient?.executeLocalShellCommand;
  if (
    args.mode !== "desktop" ||
    !isWindowsDesktopHost() ||
    !runLocalShellCommand
  ) {
    if (args.mountedRef.current) {
      args.setDesktopWslLaunchProfiles([]);
      args.setDesktopWslDiscoveryStatus(null);
    }
    return;
  }

  const now = Date.now();
  if (
    !args.force &&
    now - args.wslDiscoveryLastSuccessAtRef.current < WSL_DISCOVERY_CACHE_TTL_MS
  ) {
    return;
  }

  if (args.wslDiscoveryPromiseRef.current) {
    return args.wslDiscoveryPromiseRef.current;
  }

  const hasCachedWslProfiles = args.desktopWslLaunchProfiles.length > 0;
  let discoverySucceeded = false;
  const discoveryPromise = (async () => {
    try {
      const result = await runLocalShellCommand({
        profile: "powershell",
        commandText: WSL_DISCOVERY_COMMAND,
      });

      if (!args.mountedRef.current) {
        return;
      }

      if (result.exitCode !== 0) {
        if (!hasCachedWslProfiles) {
          args.setDesktopWslLaunchProfiles([]);
        }
        args.setDesktopWslDiscoveryStatus(
          createDesktopWslDiscoveryFailureStatus({
            hasCachedProfiles: hasCachedWslProfiles,
            exitCode: result.exitCode,
          }),
        );
        return;
      }

      args.setDesktopWslLaunchProfiles(resolveDesktopWslLaunchProfiles(result.stdout));
      args.setDesktopWslDiscoveryStatus(null);
      discoverySucceeded = true;
    } catch (error) {
      if (!args.mountedRef.current) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      console.warn("[sdkwork-terminal] WSL discovery failed", error);
      if (!hasCachedWslProfiles) {
        args.setDesktopWslLaunchProfiles([]);
      }
      args.setDesktopWslDiscoveryStatus(
        createDesktopWslDiscoveryFailureStatus({
          hasCachedProfiles: hasCachedWslProfiles,
          message,
        }),
      );
    }
  })();

  args.wslDiscoveryPromiseRef.current = discoveryPromise;
  runTerminalTaskBestEffort(() =>
    discoveryPromise.finally(() => {
      if (discoverySucceeded) {
        args.wslDiscoveryLastSuccessAtRef.current = Date.now();
      }
      if (args.wslDiscoveryPromiseRef.current === discoveryPromise) {
        args.wslDiscoveryPromiseRef.current = null;
      }
    }),
  );
  return discoveryPromise;
}

interface ScheduleProfileMenuBackgroundRefreshArgs {
  onBeforeProfileMenuOpen?: () => void;
  refreshDesktopWslLaunchProfiles: () => Promise<void> | void;
}

export function scheduleProfileMenuBackgroundRefresh(
  args: ScheduleProfileMenuBackgroundRefreshArgs,
) {
  const refresh = () => {
    runTerminalTaskBestEffort(() => {
      args.onBeforeProfileMenuOpen?.();
      return args.refreshDesktopWslLaunchProfiles();
    });
  };

  if (typeof queueMicrotask === "function") {
    queueMicrotask(refresh);
    return;
  }

  window.setTimeout(refresh, 0);
}

interface UpdateProfileMenuPositionArgs {
  headerChromeElement: HTMLDivElement | null;
  setProfileMenuPosition: (position: ProfileMenuPosition | null) => void;
}

export function updateProfileMenuPosition(args: UpdateProfileMenuPositionArgs) {
  args.setProfileMenuPosition(resolveProfileMenuPosition(args.headerChromeElement));
}

interface ToggleProfileMenuArgs {
  profileMenuOpen: boolean;
  headerChromeElement: HTMLDivElement | null;
  onBeforeProfileMenuOpen?: () => void;
  refreshDesktopWslLaunchProfiles: () => Promise<void> | void;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  setProfileMenuOpen: (open: boolean) => void;
  setProfileMenuPosition: (position: ProfileMenuPosition | null) => void;
  setProfileMenuStatus: (status: ProfileMenuDescriptor | null) => void;
}

export function toggleProfileMenu(args: ToggleProfileMenuArgs) {
  args.setContextMenu(null);
  if (!args.profileMenuOpen) {
    args.setProfileMenuStatus(null);
    updateProfileMenuPosition({
      headerChromeElement: args.headerChromeElement,
      setProfileMenuPosition: args.setProfileMenuPosition,
    });
    args.setProfileMenuOpen(true);
    scheduleProfileMenuBackgroundRefresh({
      onBeforeProfileMenuOpen: args.onBeforeProfileMenuOpen,
      refreshDesktopWslLaunchProfiles: args.refreshDesktopWslLaunchProfiles,
    });
    return;
  }

  args.setProfileMenuPosition(null);
  args.setProfileMenuOpen(false);
}
