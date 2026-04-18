import {
  createXtermViewportDriver,
} from "@sdkwork/terminal-infrastructure";
import {
  useEffect,
  useRef,
} from "react";
import {
  createTerminalHiddenInputBridge,
  focusTerminalHiddenInput,
} from "./terminal-hidden-input-bridge.ts";
import { useTerminalHostSurface } from "./terminal-host-surface.ts";
import { useTerminalViewportChrome } from "./terminal-viewport-chrome.ts";
import { TerminalViewportSurface } from "./terminal-viewport-surface.tsx";
import {
  buildPromptPrefix,
  hiddenInputStyle,
  promptBarStyle,
  promptCaretStyle,
  promptPrefixStyle,
  promptTextStyle,
  terminalStageStyle,
  type TerminalStageBaseProps,
} from "./terminal-stage-shared";

export interface FallbackTerminalStageProps extends TerminalStageBaseProps {}

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
        driver.setRuntimeMode(false);
        driver.setDisableStdin(true);
        driver.setCursorVisible(false);
        await driver.setTitleListener(props.onViewportTitleChange);
        await driver.setInputListener(props.onViewportInput);
        await driver.render(props.tab.snapshot);
      } catch (cause) {
        driver.setDisableStdin(true);
        driver.setCursorVisible(false);
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

    void driver.render(props.tab.snapshot);
  }, [driver, props.active, props.tab.id, props.tab.snapshot]);

  useEffect(() => {
    driver.setRuntimeMode(false);
    driver.setDisableStdin(true);
    driver.setCursorVisible(false);
  }, [driver]);

  useEffect(() => {
    void driver.setTitleListener(props.onViewportTitleChange);
  }, [driver, props.onViewportTitleChange]);

  useEffect(() => {
    void driver.setInputListener(props.onViewportInput);
  }, [driver, props.onViewportInput]);

  const hiddenInputBridge = createTerminalHiddenInputBridge({
    onViewportInput: props.onViewportInput,
  });

  const {
    fontSize,
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
          void driver.reset();
          focusTerminalHiddenInput(hiddenInputRef.current);
        }}
      />

      <div data-slot="terminal-live-prompt" style={promptBarStyle}>
        <span style={{ ...promptPrefixStyle, fontSize }}>{buildPromptPrefix(props.tab)}</span>
        <span style={{ ...promptTextStyle, fontSize, lineHeight: 1.25, flex: "none" }}>{props.tab.commandText.slice(0, props.tab.commandCursor)}</span>
        <span aria-hidden="true" style={{ ...promptCaretStyle, height: fontSize * 1.25 }} />
        <span style={{ ...promptTextStyle, fontSize, lineHeight: 1.25, flex: 1 }}>{props.tab.commandText.slice(props.tab.commandCursor)}</span>
      </div>

    </div>
  );
}
