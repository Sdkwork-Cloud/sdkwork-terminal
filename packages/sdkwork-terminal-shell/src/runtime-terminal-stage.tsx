import type {
  RuntimeSessionReplaySnapshot,
} from "@sdkwork/terminal-infrastructure";
import {
  useEffect,
  useRef,
} from "react";
import { type RuntimeTabController } from "./runtime-tab-controller.ts";
import { TerminalRuntimeStatusOverlay } from "./terminal-runtime-status-overlay.tsx";
import { createTerminalRuntimeStatusViewModel } from "./terminal-runtime-status.ts";
import { useRuntimeTerminalSessionBinding } from "./terminal-runtime-session-binding.ts";
import { useTerminalHostSurface } from "./terminal-host-surface.ts";
import { useTerminalViewportChrome } from "./terminal-viewport-chrome.ts";
import { TerminalViewportSurface } from "./terminal-viewport-surface.tsx";
import {
  terminalBootstrapDetailStyle,
  terminalBootstrapOverlayStyle,
  terminalBootstrapPromptPlaceholderStyle,
  terminalBootstrapStatusStyle,
  terminalStageStyle,
  type SharedRuntimeClient,
  type TerminalStageBaseProps,
} from "./terminal-stage-shared";

export interface RuntimeTerminalStageProps extends TerminalStageBaseProps {
  controller: RuntimeTabController;
  runtimeClient: SharedRuntimeClient | null;
  showBootstrapOverlay: boolean;
  onRuntimeReplayApplied?: (replay: {
    nextCursor: string;
    entries: RuntimeSessionReplaySnapshot["entries"];
  }) => void;
  onRuntimeError?: (message: string) => void;
  onRestartRuntime: () => void;
}

export function RuntimeTerminalStage(props: RuntimeTerminalStageProps) {
  const { onRuntimeError } = props;
  const runtimeController = props.controller;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeStatusViewModel = createTerminalRuntimeStatusViewModel({
    tab: props.tab,
    showBootstrapOverlay: props.showBootstrapOverlay,
  });

  const {
    handleRuntimeHostAttachFailure,
    resetRuntimeSessionBinding,
  } = useRuntimeTerminalSessionBinding({
    controller: runtimeController,
    runtimeClient: props.runtimeClient,
    runtimeSessionId: props.tab.runtimeSessionId,
    runtimeCursor: props.tab.runtimeCursor,
    runtimeAttachmentId: props.tab.runtimeAttachmentId,
    onViewportInput: props.onViewportInput,
    onViewportTitleChange: props.onViewportTitleChange,
    onRuntimeReplayApplied: props.onRuntimeReplayApplied,
    onRuntimeError,
  });

  const {
    hostStatus,
    triggerViewportMeasurement,
  } = useTerminalHostSurface({
    active: props.active,
    activateKey: props.tab.id,
    lifecycleKey: runtimeController,
    hostRef,
    viewport: props.tab.snapshot.viewport,
    onViewportResize: props.onViewportResize,
    measureViewport: async () => runtimeController.measureViewport(),
    attachHost: async (hostElement) => {
      try {
        await runtimeController.attachHost(hostElement);
        runtimeController.setDisableStdin(false);
        runtimeController.setCursorVisible(!props.showBootstrapOverlay);
      } catch (cause) {
        runtimeController.setDisableStdin(true);
        runtimeController.setCursorVisible(false);
        throw cause;
      }
    },
    disposeHost: async () => {
      resetRuntimeSessionBinding();
      await runtimeController.detachHost();
    },
    focusViewport: async () => runtimeController.focus(),
    onAttachFailure: handleRuntimeHostAttachFailure,
    readyDetail: "Attaching the xterm host, measuring the viewport, and restoring focus.",
  });

  useEffect(() => {
    runtimeController.setCursorVisible(!props.showBootstrapOverlay);
    if (props.active && !props.showBootstrapOverlay) {
      void runtimeController.focus();
    }
  }, [props.active, props.showBootstrapOverlay, runtimeController]);

  const {
    stageContainerProps,
    viewportSurfaceProps,
  } = useTerminalViewportChrome({
    active: props.active,
    stageKey: props.tab.id,
    clipboardProvider: props.clipboardProvider,
    searchQuery: props.tab.searchQuery,
    onSearchQueryChange: props.onSearchQueryChange,
    onSearchSelectMatch: props.onSearchSelectMatch,
    onRegisterViewportCopyHandler: props.onRegisterViewportCopyHandler,
    onRegisterViewportPasteHandler: props.onRegisterViewportPasteHandler,
    readSelection: async () => runtimeController.getSelection(),
    pasteTextIntoTerminal: async (text) => runtimeController.paste(text),
    focusViewport: async () => runtimeController.focus(),
    selectAllTerminalViewport: async () => runtimeController.selectAll(),
    applyFontSize: (nextFontSize) => {
      runtimeController.setFontSize(nextFontSize);
    },
    triggerViewportMeasurement,
    runSearch: async (query) => {
      await runtimeController.search(query);
    },
  });

  return (
    <div
      data-terminal-stage-id={props.tab.id}
      style={terminalStageStyle}
      {...stageContainerProps}
    >
      <TerminalViewportSurface
        hostRef={hostRef}
        hostDataSlot="terminal-runtime-host"
        {...viewportSurfaceProps}
        hostStatus={hostStatus}
      />

      {props.showBootstrapOverlay ? (
        <div data-slot="terminal-bootstrap-overlay" style={terminalBootstrapOverlayStyle}>
          <div style={terminalBootstrapStatusStyle}>{runtimeStatusViewModel.bootstrap.title}</div>
          <div style={terminalBootstrapDetailStyle}>{runtimeStatusViewModel.bootstrap.detail}</div>
          <div style={terminalBootstrapPromptPlaceholderStyle}>
            Shell is starting. Input and cursor rendering stay on the real PTY surface.
          </div>
        </div>
      ) : null}

      {runtimeStatusViewModel.runtime ? (
        <TerminalRuntimeStatusOverlay
          status={runtimeStatusViewModel.runtime}
          onRestart={() => {
            props.onRestartRuntime();
            void runtimeController.focus();
          }}
        />
      ) : null}

    </div>
  );
}
