import {
  createXtermViewportDriver,
} from "@sdkwork/terminal-infrastructure";
import {
  useEffect,
  useRef,
} from "react";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
import { createFallbackTerminalRenderSnapshot } from "./fallback-terminal-render.ts";
import {
  createTerminalHiddenInputBridge,
  focusTerminalHiddenInput,
} from "./terminal-hidden-input-bridge.ts";
import { useTerminalHostSurface } from "./terminal-host-surface.ts";
import { useTerminalViewportChrome } from "./terminal-viewport-chrome.ts";
import { TerminalViewportSurface } from "./terminal-viewport-surface.tsx";
import {
  hiddenInputStyle,
  terminalStageStyle,
  type TerminalStageBaseProps,
} from "./terminal-stage-shared";

export interface FallbackTerminalStageProps extends TerminalStageBaseProps {}

function reportFallbackDriverError(cause: unknown) {
  console.error("[sdkwork-terminal] fallback terminal driver update failed", cause);
}

function applyFallbackDriverReadOnlyMode(
  driver: ReturnType<typeof createXtermViewportDriver>,
) {
  driver.setRuntimeMode(false);
  driver.setDisableStdin(true);
  driver.setCursorVisible(false);
}

export function FallbackTerminalStage(props: FallbackTerminalStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const hiddenInputRef = useRef<HTMLTextAreaElement | null>(null);
  const driverRef = useRef<ReturnType<typeof createXtermViewportDriver> | null>(null);
  if (!driverRef.current) {
    driverRef.current = createXtermViewportDriver();
  }
  const driver = driverRef.current;

  const {
    hostStatus,
    triggerViewportMeasurement,
  } = useTerminalHostSurface({
    active: props.active,
    activateKey: props.tab.id,
    lifecycleKey: driver,
    hostRef,
    viewport: props.tab.snapshot.viewport,
    onViewportResize: props.onViewportResize,
    measureViewport: async () => driver.measureViewport(),
    attachHost: async (hostElement) => {
      try {
        await driver.attach(hostElement);
        applyFallbackDriverReadOnlyMode(driver);
        await driver.setTitleListener(props.onViewportTitleChange);
        await driver.setInputListener(props.onViewportInput);
        await driver.render(createFallbackTerminalRenderSnapshot(props.tab));
      } catch (cause) {
        runTerminalTaskBestEffort(() => {
          driver.setDisableStdin(true);
          driver.setCursorVisible(false);
        }, reportFallbackDriverError);
        throw cause;
      }
    },
    disposeHost: () => {
      driver.dispose();
    },
    focusViewport: () => {
      focusTerminalHiddenInput(hiddenInputRef.current);
    },
    readyDetail: "Attaching the xterm host, rendering transcript content, and restoring focus.",
  });

  useEffect(() => {
    if (!props.active) {
      return;
    }

    runTerminalTaskBestEffort(
      () => driver.render(createFallbackTerminalRenderSnapshot(props.tab)),
      reportFallbackDriverError,
    );
  }, [
    driver,
    props.active,
    props.tab.commandCursor,
    props.tab.commandText,
    props.tab.id,
    props.tab.profile,
    props.tab.snapshot,
    props.tab.workingDirectory,
  ]);

  useEffect(() => {
    runTerminalTaskBestEffort(
      () => applyFallbackDriverReadOnlyMode(driver),
      reportFallbackDriverError,
    );
  }, [driver]);

  useEffect(() => {
    runTerminalTaskBestEffort(
      () => driver.setTitleListener(props.onViewportTitleChange),
      reportFallbackDriverError,
    );
  }, [driver, props.onViewportTitleChange]);

  useEffect(() => {
    runTerminalTaskBestEffort(
      () => driver.setInputListener(props.onViewportInput),
      reportFallbackDriverError,
    );
  }, [driver, props.onViewportInput]);

  const hiddenInputBridge = createTerminalHiddenInputBridge({
    onViewportInput: props.onViewportInput,
  });

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
    readSelection: async () => driver.getSelection(),
    pasteTextIntoTerminal: async (text) => {
      props.onViewportInput({ kind: "text", data: text });
    },
    focusViewport: () => {
      focusTerminalHiddenInput(hiddenInputRef.current);
    },
    selectAllTerminalViewport: async () => driver.selectAll(),
    applyFontSize: (nextFontSize) => {
      driver.setFontSize(nextFontSize);
    },
    triggerViewportMeasurement,
    runSearch: async (query) => {
      await driver.search(query);
    },
  });

  return (
    <div
      data-terminal-stage-id={props.tab.id}
      style={terminalStageStyle}
      {...stageContainerProps}
    >
      <textarea
        ref={hiddenInputRef}
        data-slot="terminal-hidden-input"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Terminal input"
        onInput={hiddenInputBridge.handleHiddenInput}
        onCompositionStart={hiddenInputBridge.handleCompositionStart}
        onCompositionEnd={hiddenInputBridge.handleCompositionEnd}
        onKeyDown={hiddenInputBridge.handleHiddenInputKeyDown}
        style={hiddenInputStyle}
      />

      <TerminalViewportSurface
        hostRef={hostRef}
        {...viewportSurfaceProps}
        hostStatus={hostStatus}
        onClearTerminal={() => {
          props.onViewportInput({
            kind: "text",
            data: "\u000c",
          });
          focusTerminalHiddenInput(hiddenInputRef.current);
        }}
      />
    </div>
  );
}
