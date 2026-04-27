import type { TerminalViewport } from "@sdkwork/terminal-core";
import type { TerminalViewportInput } from "@sdkwork/terminal-infrastructure";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  cancelLaunchProjectFlow as cancelLaunchProjectFlowController,
  launchEntryInWorkingDirectory as launchEntryInWorkingDirectoryController,
  openDesktopConnectorEntry as openDesktopConnectorEntryController,
  openLaunchEntry as openLaunchEntryController,
  pickWorkingDirectoryForEntry as pickWorkingDirectoryForEntryController,
} from "./launch-controller.ts";
import type {
  LaunchFlowMode,
  LaunchWebRuntimeTarget,
  LaunchWorkingDirectorySelection,
} from "./launch-flow.ts";
import type { LaunchProfileDefinition } from "./launch-profiles.ts";
import type {
  TerminalLaunchProject,
  TerminalLaunchProjectActivationEvent,
  TerminalLaunchProjectCollection,
  TerminalLaunchProjectResolutionRequest,
} from "./launch-projects.ts";
import type { TerminalShellPendingRuntimeInput, TerminalShellSnapshot } from "./model";
import type { ProfileMenuDescriptor } from "./profile-menu.tsx";
import type { RuntimeClientResolverArgs } from "./runtime-orchestration.ts";
import type {
  ResolveTabSnapshotById,
  UpdateShellState,
} from "./shell-state-bridge.ts";
import type {
  ProfileMenuPosition,
  TerminalTabContextMenuState,
} from "./terminal-overlays.tsx";
import type { TerminalClipboardProvider } from "./terminal-clipboard.ts";
import type { SharedRuntimeClient } from "./terminal-stage-shared.ts";
import {
  closeOtherTerminalShellTabsWithRuntime,
  closeTerminalShellTabWithRuntime,
  closeTerminalShellTabsToRightWithRuntime,
  copyTerminalTabContextMenuSelection,
  duplicateTerminalShellTabEntry,
  openDefaultTerminalShellTab,
  pasteTerminalTabContextMenuSelection,
  resolveTerminalTabContextMenu,
  restartTerminalShellTabRuntimeWithCleanup,
  routeTerminalViewportInputByTabId,
} from "./terminal-tab-actions.ts";

interface MutableRefObjectLike<T> {
  current: T;
}

interface WorkingDirectoryPickerOptionsLike {
  defaultPath?: string | null;
  title?: string;
}

interface DesktopConnectorLaunchEntryLike {
  targetId: string;
  label: string;
  subtitle: string;
  accent: string;
}

interface LaunchProjectResolver {
  (
    request: TerminalLaunchProjectResolutionRequest,
  ):
    | Promise<TerminalLaunchProjectCollection | readonly TerminalLaunchProject[] | null | undefined>
    | TerminalLaunchProjectCollection
    | readonly TerminalLaunchProject[]
    | null
    | undefined;
}

export interface CreateShellActionHandlersArgs {
  mode: LaunchFlowMode;
  webRuntimeTarget?: LaunchWebRuntimeTarget;
  activeTab: TerminalShellSnapshot["activeTab"];
  snapshotTabs: TerminalShellSnapshot["tabs"];
  contextMenu: TerminalTabContextMenuState | null;
  clipboardProvider?: TerminalClipboardProvider;
  desktopRuntimeClient?: RuntimeClientResolverArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientResolverArgs["webRuntimeClient"];
  launchProjects?: readonly TerminalLaunchProject[];
  resolveLaunchProjects?: LaunchProjectResolver;
  onLaunchProjectActivated?: (event: TerminalLaunchProjectActivationEvent) => void;
  onPickWorkingDirectory?: (
    options: WorkingDirectoryPickerOptionsLike,
  ) => Promise<string | null>;
  onLaunchDesktopConnectorEntry?: (entryId: string) => void;
  launchProjectResolutionRequestIdRef: MutableRefObjectLike<number>;
  mountedRef: MutableRefObjectLike<boolean>;
  viewportCopyHandlersRef: MutableRefObjectLike<Map<string, () => Promise<void>>>;
  viewportPasteHandlersRef: MutableRefObjectLike<
    Map<string, (text: string) => Promise<void>>
  >;
  bootstrappingRuntimeTabIdsRef: MutableRefObjectLike<Set<string>>;
  flushingRuntimeInputTabIdsRef: MutableRefObjectLike<Set<string>>;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeInputWriteGenerationsRef: MutableRefObjectLike<Map<string, number>>;
  setProfileMenuStatus: (status: ProfileMenuDescriptor | null) => void;
  setProfileMenuOpen: (open: boolean) => void;
  setProfileMenuPosition: (position: ProfileMenuPosition | null) => void;
  setContextMenu: (state: TerminalTabContextMenuState | null) => void;
  setLaunchProjectFlowState: (state: import("./launch-flow.ts").LaunchProjectFlowState | null) => void;
  updateProfileMenuPosition: () => void;
  updateShellState: UpdateShellState;
  clearRuntimeBootstrapRetryTimer: (tabId: string) => void;
  dispatchLiveRuntimeInput: (args: {
    tabId: string;
    sessionId: string;
    client: SharedRuntimeClient;
    input: TerminalShellPendingRuntimeInput;
  }) => void;
  resolveActiveViewport: () => TerminalViewport;
  resolveTabSnapshotById: ResolveTabSnapshotById;
}

export function createShellActionHandlers(args: CreateShellActionHandlersArgs) {
  function launchEntryInWorkingDirectory(
    entry: LaunchProfileDefinition,
    selection?: LaunchWorkingDirectorySelection,
  ) {
    launchEntryInWorkingDirectoryController({
      entry,
      selection,
      mode: args.mode,
      webRuntimeTarget: args.webRuntimeTarget,
      resolveActiveViewport: args.resolveActiveViewport,
      onLaunchProjectActivated: args.onLaunchProjectActivated,
      updateShellState: args.updateShellState,
    });
  }

  function cancelLaunchProjectFlow() {
    cancelLaunchProjectFlowController({
      launchProjectResolutionRequestIdRef: args.launchProjectResolutionRequestIdRef,
      setLaunchProjectFlowState: args.setLaunchProjectFlowState,
    });
  }

  async function pickWorkingDirectoryForEntry(entry: LaunchProfileDefinition) {
    await pickWorkingDirectoryForEntryController({
      entry,
      activeWorkingDirectory: args.activeTab.workingDirectory,
      mode: args.mode,
      webRuntimeTarget: args.webRuntimeTarget,
      onPickWorkingDirectory: args.onPickWorkingDirectory,
      mountedRef: args.mountedRef,
      resolveActiveViewport: args.resolveActiveViewport,
      onLaunchProjectActivated: args.onLaunchProjectActivated,
      updateShellState: args.updateShellState,
      updateProfileMenuPosition: args.updateProfileMenuPosition,
      setProfileMenuStatus: args.setProfileMenuStatus,
      setProfileMenuOpen: args.setProfileMenuOpen,
    });
  }

  async function openLaunchEntry(entry: LaunchProfileDefinition) {
    await openLaunchEntryController({
      entry,
      mode: args.mode,
      webRuntimeTarget: args.webRuntimeTarget,
      activeWorkingDirectory: args.activeTab.workingDirectory,
      launchProjects: args.launchProjects,
      resolveLaunchProjects: args.resolveLaunchProjects,
      onLaunchProjectActivated: args.onLaunchProjectActivated,
      onPickWorkingDirectory: args.onPickWorkingDirectory,
      mountedRef: args.mountedRef,
      launchProjectResolutionRequestIdRef: args.launchProjectResolutionRequestIdRef,
      resolveActiveViewport: args.resolveActiveViewport,
      updateProfileMenuPosition: args.updateProfileMenuPosition,
      updateShellState: args.updateShellState,
      setProfileMenuStatus: args.setProfileMenuStatus,
      setProfileMenuOpen: args.setProfileMenuOpen,
      setProfileMenuPosition: args.setProfileMenuPosition,
      setContextMenu: args.setContextMenu,
      setLaunchProjectFlowState: args.setLaunchProjectFlowState,
    });
  }

  function openDesktopConnectorEntry(entry: DesktopConnectorLaunchEntryLike) {
    openDesktopConnectorEntryController({
      entry,
      setProfileMenuOpen: args.setProfileMenuOpen,
      setProfileMenuPosition: args.setProfileMenuPosition,
      setContextMenu: args.setContextMenu,
      onLaunchDesktopConnectorEntry: args.onLaunchDesktopConnectorEntry,
    });
  }

  function handleOpenNewTab() {
    args.setProfileMenuOpen(false);
    args.setProfileMenuPosition(null);
    args.setContextMenu(null);
    openDefaultTerminalShellTab({
      mode: args.mode,
      webRuntimeTarget: args.webRuntimeTarget,
      viewport: args.resolveActiveViewport(),
      updateShellState: args.updateShellState,
    });
  }

  function openTabContextMenu(
    event: ReactMouseEvent<HTMLDivElement>,
    tabId: string,
  ) {
    event.preventDefault();
    args.setProfileMenuOpen(false);
    args.setContextMenu(
      resolveTerminalTabContextMenu({
        tabId,
        clientX: event.clientX,
        clientY: event.clientY,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      }),
    );
  }

  function handleContextMenuCopy() {
    copyTerminalTabContextMenuSelection({
      contextMenu: args.contextMenu,
      activeTab: args.activeTab,
      snapshotTabs: args.snapshotTabs,
      viewportCopyHandlersRef: args.viewportCopyHandlersRef,
      clipboardProvider: args.clipboardProvider,
      setContextMenu: args.setContextMenu,
    });
  }

  function handleContextMenuPaste() {
    pasteTerminalTabContextMenuSelection({
      contextMenu: args.contextMenu,
      activeTab: args.activeTab,
      clipboardProvider: args.clipboardProvider,
      viewportPasteHandlersRef: args.viewportPasteHandlersRef,
      setContextMenu: args.setContextMenu,
      onViewportInput: handleViewportInputByTabId,
    });
  }

  function handleCloseTab(tabId: string) {
    closeTerminalShellTabWithRuntime({
      tabId,
      snapshotTabs: args.snapshotTabs,
      setContextMenu: args.setContextMenu,
      updateShellState: args.updateShellState,
      runtimeInputWriteChainsRef: args.runtimeInputWriteChainsRef,
      runtimeInputWriteGenerationsRef: args.runtimeInputWriteGenerationsRef,
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
  }

  function handleCloseOtherTabs(tabId: string) {
    closeOtherTerminalShellTabsWithRuntime({
      tabId,
      snapshotTabs: args.snapshotTabs,
      setContextMenu: args.setContextMenu,
      updateShellState: args.updateShellState,
      runtimeInputWriteChainsRef: args.runtimeInputWriteChainsRef,
      runtimeInputWriteGenerationsRef: args.runtimeInputWriteGenerationsRef,
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
  }

  function handleCloseTabsToRight(tabId: string) {
    closeTerminalShellTabsToRightWithRuntime({
      tabId,
      snapshotTabs: args.snapshotTabs,
      setContextMenu: args.setContextMenu,
      updateShellState: args.updateShellState,
      runtimeInputWriteChainsRef: args.runtimeInputWriteChainsRef,
      runtimeInputWriteGenerationsRef: args.runtimeInputWriteGenerationsRef,
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
  }

  function handleDuplicateTab(tabId: string) {
    duplicateTerminalShellTabEntry({
      tabId,
      setContextMenu: args.setContextMenu,
      updateShellState: args.updateShellState,
    });
  }

  function handleRestartRuntimeTabById(tabId: string) {
    restartTerminalShellTabRuntimeWithCleanup({
      tab: args.resolveTabSnapshotById(tabId),
      clearRuntimeBootstrapRetryTimer: args.clearRuntimeBootstrapRetryTimer,
      bootstrappingRuntimeTabIdsRef: args.bootstrappingRuntimeTabIdsRef,
      flushingRuntimeInputTabIdsRef: args.flushingRuntimeInputTabIdsRef,
      runtimeInputWriteChainsRef: args.runtimeInputWriteChainsRef,
      runtimeInputWriteGenerationsRef: args.runtimeInputWriteGenerationsRef,
      updateShellState: args.updateShellState,
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
  }

  function handleViewportInputByTabId(
    tabId: string,
    inputEvent: TerminalViewportInput,
  ) {
    routeTerminalViewportInputByTabId({
      tabId,
      inputEvent,
      tab: args.resolveTabSnapshotById(tabId),
      updateShellState: args.updateShellState,
      dispatchLiveRuntimeInput: args.dispatchLiveRuntimeInput,
      flushingRuntimeInputTabIdsRef: args.flushingRuntimeInputTabIdsRef,
      mode: args.mode,
      desktopRuntimeClient: args.desktopRuntimeClient,
      webRuntimeClient: args.webRuntimeClient,
    });
  }

  return {
    launchEntryInWorkingDirectory,
    cancelLaunchProjectFlow,
    pickWorkingDirectoryForEntry,
    openLaunchEntry,
    openDesktopConnectorEntry,
    handleOpenNewTab,
    openTabContextMenu,
    handleContextMenuCopy,
    handleContextMenuPaste,
    handleCloseTab,
    handleCloseOtherTabs,
    handleCloseTabsToRight,
    handleDuplicateTab,
    handleRestartRuntimeTabById,
    handleViewportInputByTabId,
  };
}
