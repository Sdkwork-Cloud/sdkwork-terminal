import {
  type OpenTerminalShellTabOptions,
  type TerminalShellProfile,
} from "./model";
import {
  rootStyle,
  shellStyle,
} from "./shell-layout.ts";
import { useShellOverlayState } from "./shell-overlay-state.ts";
import {
  desktopTerminalSurfaceContainerStyle,
  useDesktopTerminalSurfaceLaunchBridge,
} from "./desktop-terminal-surface.ts";
import type {
  DesktopTerminalSurfaceProps,
  ShellAppProps,
} from "./shell-contract.ts";
import { createShellActionHandlers } from "./shell-action-handlers.ts";
import { useShellAppState } from "./shell-app-state.ts";
import { useShellProfileMenuBridge } from "./shell-profile-menu-bridge.ts";
import { useShellRuntimeBridge } from "./shell-runtime-bridge.ts";
import { useShellGlobalKeyboardShortcuts } from "./shell-global-shortcuts.ts";
import { useShellChromeState } from "./shell-chrome-state.ts";
import { TerminalOverlayStack } from "./terminal-overlay-stack.tsx";
import { TerminalPanelStack } from "./terminal-panel-stack.tsx";
import { TerminalTabStrip } from "./terminal-tab-strip.tsx";
import {
  useRef,
} from "react";
import { useShellRuntimeResources } from "./shell-runtime-resources.ts";

export type { TerminalClipboardProvider } from "./terminal-clipboard.ts";
export type {
  DesktopRuntimeBridgeClient,
  TerminalViewportInput,
  WebRuntimeBridgeClient,
} from "@sdkwork/terminal-infrastructure";
export type {
  OpenTerminalShellTabOptions,
  TerminalShellMode,
  TerminalShellProfile,
  TerminalShellRuntimeBootstrap,
  TerminalShellRuntimeBootstrapRequest,
} from "./model";
export type {
  TerminalLaunchProject,
  TerminalLaunchProjectActivationEvent,
  TerminalLaunchProjectCollection,
  TerminalLaunchProjectCollectionEvent,
  TerminalLaunchProjectRemovalEvent,
  TerminalLaunchProjectResolutionRequest,
  TerminalLaunchProjectSourceKind,
} from "./launch-projects.ts";
export type {
  DesktopConnectorCatalogStatus,
  DesktopConnectorLaunchEntry,
  DesktopConnectorSessionIntent,
  DesktopSessionReattachIntent,
  DesktopTerminalLaunchPlan,
  DesktopTerminalSurfaceProps,
  DesktopTerminalSurfaceRuntimeClient,
  DesktopTerminalWorkingDirectoryPickerRequest,
  DesktopWindowController,
  ShellAppMode,
  ShellAppProps,
  ShellAppDesktopRuntimeClient,
  ShellAppWebRuntimeClient,
  ShellLaunchProfile,
  ShellConnectorSessionLaunchRequest,
  ShellRemoteRuntimeSessionCreateRequest,
  ShellRuntimeSessionReplaySnapshot,
  ShellAppWorkingDirectoryPickerRequest,
  ShellConnectorSessionTarget,
  ShellDesktopLocalProcessSessionCreateRequest,
  ShellDesktopLocalShellExecutionRequest,
  ShellDesktopLocalShellExecutionResult,
  ShellDesktopLocalShellSessionCreateRequest,
  ShellExecutionModeTag,
  ShellRemoteRuntimeTarget,
  ShellRuntimeInteractiveSessionSnapshot,
  ShellRuntimeReplayEntry,
  ShellRuntimeReplayEntryKind,
  ShellRuntimeSessionInputBytesRequest,
  ShellRuntimeSessionInputRequest,
  ShellRuntimeSessionInputSnapshot,
  ShellRuntimeSessionReplayRequest,
  ShellRuntimeSessionResizeRequest,
  ShellRuntimeSessionResizeSnapshot,
  ShellRuntimeSessionTerminateSnapshot,
  ShellRuntimeStreamEntryKind,
  ShellRuntimeStreamEvent,
  ShellSessionAttachmentAcknowledgeRequest,
  ShellWorkingDirectoryPickerOptions,
  WebRuntimeTarget,
} from "./shell-contract.ts";

export function ShellApp(props: ShellAppProps) {
  const shellAppState = useShellAppState({
    mode: props.mode,
    webRuntimeTarget: props.webRuntimeTarget,
  });
  const runtimeResources = useShellRuntimeResources({
    desktopRuntimeClient: props.desktopRuntimeClient,
    webRuntimeClient: props.webRuntimeClient,
  });
  const overlayState = useShellOverlayState({
    mode: props.mode,
    sessionCenterReplayDiagnostics: props.sessionCenterReplayDiagnostics,
    onToggleSessionCenter: props.onToggleSessionCenter,
  });

  const profileMenuPositionUpdaterRef = useRef<() => void>(() => {});
  const chromeState = useShellChromeState({
    mode: props.mode,
    activeTabId: shellAppState.activeTab.id,
    tabCount: shellAppState.snapshot.tabs.length,
    profileMenuOpen: overlayState.profileMenuOpen,
    contextMenu: overlayState.contextMenu,
    desktopWslLaunchProfileCount: overlayState.desktopWslLaunchProfiles.length,
    updateProfileMenuPosition: () => {
      profileMenuPositionUpdaterRef.current();
    },
    setProfileMenuOpen: overlayState.setProfileMenuOpen,
    setProfileMenuPosition: overlayState.setProfileMenuPosition,
    setContextMenu: overlayState.setContextMenu,
  });

  const profileMenuBridge = useShellProfileMenuBridge({
    mode: props.mode,
    profileMenuOpen: overlayState.profileMenuOpen,
    desktopRuntimeClientRef: runtimeResources.desktopRuntimeClientRef,
    desktopWslLaunchProfiles: overlayState.desktopWslLaunchProfiles,
    mountedRef: runtimeResources.mountedRef,
    headerChromeRef: chromeState.headerChromeRef,
    onBeforeProfileMenuOpen: props.onBeforeProfileMenuOpen,
    setDesktopWslLaunchProfiles: overlayState.setDesktopWslLaunchProfiles,
    setDesktopWslDiscoveryStatus: overlayState.setDesktopWslDiscoveryStatus,
    setContextMenu: overlayState.setContextMenu,
    setProfileMenuOpen: overlayState.setProfileMenuOpen,
    setProfileMenuPosition: overlayState.setProfileMenuPosition,
    setProfileMenuStatus: overlayState.setProfileMenuStatus,
  });
  profileMenuPositionUpdaterRef.current = profileMenuBridge.updateProfileMenuPosition;

  const runtimeBridge = useShellRuntimeBridge({
    mode: props.mode,
    snapshot: shellAppState.snapshot,
    activeTab: shellAppState.activeTab,
    runtimeDerivedState: shellAppState.runtimeDerivedState,
    retryingTabsEffectKey: shellAppState.retryingTabsEffectKey,
    runtimeBootstrapEffectKey: shellAppState.runtimeBootstrapEffectKey,
    runtimePendingInputEffectKey: shellAppState.runtimePendingInputEffectKey,
    desktopRuntimeClient: props.desktopRuntimeClient,
    webRuntimeClient: props.webRuntimeClient,
    desktopRuntimeClientRef: runtimeResources.desktopRuntimeClientRef,
    webRuntimeClientRef: runtimeResources.webRuntimeClientRef,
    mountedRef: runtimeResources.mountedRef,
    latestSnapshotRef: shellAppState.latestSnapshotRef,
    handledDesktopSessionReattachIntentIdRef:
      runtimeResources.handledDesktopSessionReattachIntentIdRef,
    handledDesktopConnectorSessionIntentIdRef:
      runtimeResources.handledDesktopConnectorSessionIntentIdRef,
    runtimeBootstrapRetryTimersRef: runtimeResources.runtimeBootstrapRetryTimersRef,
    viewportCopyHandlersRef: runtimeResources.viewportCopyHandlersRef,
    viewportPasteHandlersRef: runtimeResources.viewportPasteHandlersRef,
    bootstrappingRuntimeTabIdsRef: runtimeResources.bootstrappingRuntimeTabIdsRef,
    flushingRuntimeInputTabIdsRef: runtimeResources.flushingRuntimeInputTabIdsRef,
    runtimeInputWriteChainsRef: runtimeResources.runtimeInputWriteChainsRef,
    runtimeInputWriteGenerationsRef: runtimeResources.runtimeInputWriteGenerationsRef,
    runtimeControllerStoreRef: runtimeResources.runtimeControllerStoreRef,
    desktopSessionReattachIntent: props.desktopSessionReattachIntent,
    desktopConnectorSessionIntent: props.desktopConnectorSessionIntent,
    setProfileMenuOpen: overlayState.setProfileMenuOpen,
    setContextMenu: overlayState.setContextMenu,
    updateShellState: shellAppState.shellStateBridge.updateShellState,
    updateShellStateDeferred: shellAppState.shellStateBridge.updateShellStateDeferred,
  });

  const resolveActiveViewport = () =>
    (
      shellAppState.latestSnapshotRef.current?.activeTab ?? shellAppState.activeTab
    ).snapshot.viewport;

  const shellActionHandlers = createShellActionHandlers({
    mode: props.mode,
    webRuntimeTarget: props.webRuntimeTarget,
    activeTab: shellAppState.activeTab,
    snapshotTabs: shellAppState.snapshot.tabs,
    contextMenu: overlayState.contextMenu,
    clipboardProvider: props.clipboardProvider,
    desktopRuntimeClient: props.desktopRuntimeClient,
    webRuntimeClient: props.webRuntimeClient,
    launchProjects: props.launchProjects,
    resolveLaunchProjects: props.resolveLaunchProjects,
    onLaunchProjectActivated: props.onLaunchProjectActivated,
    onPickWorkingDirectory: props.onPickWorkingDirectory,
    onLaunchDesktopConnectorEntry: props.onLaunchDesktopConnectorEntry,
    launchProjectResolutionRequestIdRef: shellAppState.launchProjectResolutionRequestIdRef,
    mountedRef: runtimeResources.mountedRef,
    viewportCopyHandlersRef: runtimeResources.viewportCopyHandlersRef,
    viewportPasteHandlersRef: runtimeResources.viewportPasteHandlersRef,
    bootstrappingRuntimeTabIdsRef: runtimeResources.bootstrappingRuntimeTabIdsRef,
    flushingRuntimeInputTabIdsRef: runtimeResources.flushingRuntimeInputTabIdsRef,
    runtimeInputWriteChainsRef: runtimeResources.runtimeInputWriteChainsRef,
    runtimeInputWriteGenerationsRef: runtimeResources.runtimeInputWriteGenerationsRef,
    setProfileMenuStatus: overlayState.setProfileMenuStatus,
    setProfileMenuOpen: overlayState.setProfileMenuOpen,
    setProfileMenuPosition: overlayState.setProfileMenuPosition,
    setContextMenu: overlayState.setContextMenu,
    setLaunchProjectFlowState: overlayState.setLaunchProjectFlowState,
    updateProfileMenuPosition: profileMenuBridge.updateProfileMenuPosition,
    updateShellState: shellAppState.shellStateBridge.updateShellState,
    clearRuntimeBootstrapRetryTimer: runtimeBridge.clearRuntimeBootstrapRetryTimer,
    dispatchLiveRuntimeInput: runtimeBridge.dispatchLiveRuntimeInput,
    resolveActiveViewport,
    resolveTabSnapshotById: shellAppState.shellStateBridge.resolveTabSnapshotById,
  });

  useShellGlobalKeyboardShortcuts({
    mode: props.mode,
    activeTab: shellAppState.activeTab,
    snapshotTabs: shellAppState.snapshot.tabs,
    webRuntimeTarget: props.webRuntimeTarget,
    desktopRuntimeClient: props.desktopRuntimeClient,
    webRuntimeClient: props.webRuntimeClient,
    resolveActiveViewport,
    runtimeInputWriteChainsRef: runtimeResources.runtimeInputWriteChainsRef,
    runtimeInputWriteGenerationsRef: runtimeResources.runtimeInputWriteGenerationsRef,
    updateShellState: shellAppState.shellStateBridge.updateShellState,
  });

  return (
    <main data-shell-layout="terminal-tabs" style={rootStyle}>
      <section style={shellStyle}>
        <TerminalTabStrip
          mode={props.mode}
          tabs={shellAppState.snapshot.tabs}
          launchProfiles={overlayState.launchProfiles}
          profileMenuOpen={overlayState.profileMenuOpen}
          hoveredTabId={chromeState.hoveredTabId}
          canScrollLeft={chromeState.canScrollLeft}
          canScrollRight={chromeState.canScrollRight}
          shouldDockTabActionsToTrailing={chromeState.shouldDockTabActionsToTrailing}
          desktopWindowController={props.desktopWindowController}
          headerLeadingRef={chromeState.headerLeadingRef}
          headerChromeRef={chromeState.headerChromeRef}
          tabScrollRef={chromeState.tabScrollRef}
          setCanScrollLeft={chromeState.setCanScrollLeft}
          setCanScrollRight={chromeState.setCanScrollRight}
          onOpenNewTab={shellActionHandlers.handleOpenNewTab}
          onToggleProfileMenu={profileMenuBridge.toggleProfileMenu}
          onOpenTabContextMenu={shellActionHandlers.openTabContextMenu}
          onActivateTab={shellAppState.shellStateBridge.activateTab}
          onCloseTab={shellActionHandlers.handleCloseTab}
          onSetHoveredTabId={chromeState.setHoveredTabId}
        />

        <TerminalPanelStack
          mode={props.mode}
          tabs={shellAppState.snapshot.tabs}
          clipboardProvider={props.clipboardProvider}
          desktopRuntimeClient={props.desktopRuntimeClient}
          webRuntimeClient={props.webRuntimeClient}
          runtimeControllerStore={runtimeResources.runtimeControllerStore}
          onViewportInput={shellActionHandlers.handleViewportInputByTabId}
          onRegisterViewportCopyHandler={runtimeResources.registerViewportCopyHandler}
          onRegisterViewportPasteHandler={runtimeResources.registerViewportPasteHandler}
          onViewportTitleChange={shellAppState.shellStateBridge.handleViewportTitleChange}
          onRuntimeReplayApplied={runtimeBridge.handleRuntimeReplayByTabId}
          onRuntimeError={shellAppState.shellStateBridge.handleRuntimeError}
          onRestartRuntime={shellActionHandlers.handleRestartRuntimeTabById}
          onSearchQueryChange={shellAppState.shellStateBridge.handleSearchQueryChange}
          onSearchSelectMatch={shellAppState.shellStateBridge.handleSearchSelectMatch}
          onViewportResize={shellAppState.shellStateBridge.handleViewportResize}
        />

        <TerminalOverlayStack
          profileMenuOpen={overlayState.profileMenuOpen}
          profileMenuRef={chromeState.profileMenuRef}
          profileMenuPosition={overlayState.profileMenuPosition}
          profileMenuStatus={overlayState.profileMenuStatus}
          shellLaunchProfiles={overlayState.shellLaunchProfiles}
          wslLaunchProfiles={overlayState.wslLaunchProfiles}
          desktopWslDiscoveryStatus={overlayState.desktopWslDiscoveryStatus}
          cliLaunchProfiles={overlayState.cliLaunchProfiles}
          connectorEntries={props.desktopConnectorEntries}
          connectorCatalogStatus={props.desktopConnectorCatalogStatus}
          sessionCenterEnabled={props.sessionCenterEnabled}
          sessionCenterMenuSubtitle={overlayState.sessionCenterMenuSubtitle}
          onSelectLaunchEntry={shellActionHandlers.openLaunchEntry}
          onSelectConnectorEntry={shellActionHandlers.openDesktopConnectorEntry}
          onSelectSessionCenter={overlayState.handleSelectSessionCenter}
          launchProjectFlowState={overlayState.launchProjectFlowState}
          setLaunchProjectFlowState={overlayState.setLaunchProjectFlowState}
          activeWorkingDirectory={shellAppState.activeTab.workingDirectory}
          onCancelLaunchProjectFlow={shellActionHandlers.cancelLaunchProjectFlow}
          onLaunchEntryInWorkingDirectory={shellActionHandlers.launchEntryInWorkingDirectory}
          onPickWorkingDirectoryForEntry={shellActionHandlers.pickWorkingDirectoryForEntry}
          onRemoveLaunchProject={props.onRemoveLaunchProject}
          onClearLaunchProjects={props.onClearLaunchProjects}
          tabs={shellAppState.snapshot.tabs}
          contextMenu={overlayState.contextMenu}
          contextMenuRef={chromeState.contextMenuRef}
          onContextMenuCopy={shellActionHandlers.handleContextMenuCopy}
          onContextMenuPaste={shellActionHandlers.handleContextMenuPaste}
          onCloseTab={shellActionHandlers.handleCloseTab}
          onCloseOtherTabs={shellActionHandlers.handleCloseOtherTabs}
          onCloseTabsToRight={shellActionHandlers.handleCloseTabsToRight}
          onDuplicateTab={shellActionHandlers.handleDuplicateTab}
        />
      </section>
    </main>
  );
}

export function DesktopTerminalSurface<TLaunchRequest>(
  props: DesktopTerminalSurfaceProps<TLaunchRequest>,
) {
  const { desktopRuntimeAvailable, desktopSessionReattachIntent } =
    useDesktopTerminalSurfaceLaunchBridge({
      launchRequest: props.launchRequest,
      launchRequestKey: props.launchRequestKey,
      desktopRuntimeClient: props.desktopRuntimeClient,
      desktopRuntimeAvailable: props.desktopRuntimeAvailable,
      resolveLaunchPlan: props.resolveLaunchPlan,
      onRuntimeUnavailable: props.onRuntimeUnavailable,
      onLaunchError: props.onLaunchError,
    });

  return (
    <div style={desktopTerminalSurfaceContainerStyle}>
      <ShellApp
        mode={desktopRuntimeAvailable ? "desktop" : "web"}
        desktopRuntimeClient={props.desktopRuntimeClient}
        desktopSessionReattachIntent={desktopSessionReattachIntent}
        launchProjects={props.launchProjects}
        resolveLaunchProjects={props.resolveLaunchProjects}
        onLaunchProjectActivated={props.onLaunchProjectActivated}
        onPickWorkingDirectory={props.onPickWorkingDirectory}
      />
    </div>
  );
}


