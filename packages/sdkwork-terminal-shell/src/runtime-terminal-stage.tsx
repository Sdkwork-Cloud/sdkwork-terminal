import type {
  RuntimeSessionReplaySnapshot,
} from "@sdkwork/terminal-infrastructure";
import {
  useEffect,
  useRef,
} from "react";
import { type RuntimeTabController } from "./runtime-tab-controller.ts";
import { TerminalRuntimeStatusOverlay } from "./terminal-runtime-status-overlay.tsx";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
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

function reportRuntimeControllerUpdateError(cause: unknown) {
  console.error("[sdkwork-terminal] runtime terminal controller update failed", cause);
}

function applyRuntimeControllerInputMode(
  runtimeController: RuntimeTabController,
  showBootstrapOverlay: boolean,
) {
  runtimeController.setDisableStdin(false);
  runtimeController.setCursorVisible(!showBootstrapOverlay);
}

function applyRuntimeControllerDisabledMode(
  runtimeController: RuntimeTabController,
) {
  runtimeController.setDisableStdin(true);
  runtimeController.setCursorVisible(false);
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
        applyRuntimeControllerInputMode(runtimeController, props.showBootstrapOverlay);
      } catch (cause) {
        runTerminalTaskBestEffort(
          () => applyRuntimeControllerDisabledMode(runtimeController),
          reportRuntimeControllerUpdateError,
        );
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
    runTerminalTaskBestEffort(
      () => runtimeController.setCursorVisible(!props.showBootstrapOverlay),
      reportRuntimeControllerUpdateError,
    );
    if (props.active && !props.showBootstrapOverlay) {
      runTerminalTaskBestEffort(
        () => runtimeController.focus(),
        reportRuntimeControllerUpdateError,
      );
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
        onClearTerminal={() => {
          props.onViewportInput({
            kind: "text",
            data: "\u000c",
          });
          runTerminalTaskBestEffort(
            () => runtimeController.focus(),
            reportRuntimeControllerUpdateError,
          );
        }}
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
            runTerminalTaskBestEffort(
              () => runtimeController.focus(),
              reportRuntimeControllerUpdateError,
            );
          }}
        />
      ) : null}

    </div>
  );
}
