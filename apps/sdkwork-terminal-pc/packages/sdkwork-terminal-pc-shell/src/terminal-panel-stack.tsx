import type { TerminalViewport } from "@sdkwork/terminal-pc-core";
import type {
  RuntimeSessionReplaySnapshot,
  TerminalViewportInput,
} from "@sdkwork/terminal-pc-infrastructure";
import { memo } from "react";
import { FallbackTerminalStage } from "./fallback-terminal-stage.tsx";
import {
  resolveTerminalStageBehavior,
  type TerminalShellSnapshot,
} from "./model";
import { panelStackStyle, panelStyle } from "./shell-layout";
import type { RuntimeTabControllerStore } from "./runtime-tab-controller-store";
import type { RuntimeClientResolverArgs } from "./runtime-orchestration";
import { resolveTabRuntimeClient } from "./runtime-orchestration";
import { RuntimeTerminalStage } from "./runtime-terminal-stage.tsx";
import type { TerminalClipboardProvider } from "./terminal-clipboard";
import type { TerminalClipboardFeedbackReporter } from "./terminal-clipboard-feedback";
import type { TerminalInteractionMessages } from "./terminal-interaction-messages";
import type {
  RuntimeTabController,
  RuntimeTabControllerConnectionState,
} from "./runtime-tab-controller";
import type { SharedRuntimeClient } from "./terminal-stage-shared";
import { shouldReuseTerminalStageRender } from "./terminal-panel-stack-memo";
import { useLatestRef } from "./terminal-react-stability";

interface TerminalStageEntryProps {
  mode: "desktop" | "web";
  tabId: string;
  tab: TerminalShellSnapshot["activeTab"];
  active: boolean;
  clipboardProvider?: TerminalClipboardProvider;
  onClipboardFeedback?: TerminalClipboardFeedbackReporter;
  terminalInteractionMessages?: Pick<
    TerminalInteractionMessages,
    "search" | "pasteConfirmation" | "viewportContextMenu"
  >;
  runtimeController: RuntimeTabController;
  runtimeClient: SharedRuntimeClient | null;
  onViewportInput: (input: TerminalViewportInput) => void;
  onRegisterViewportCopyHandler: (
    handler: (() => Promise<void>) | null,
  ) => void;
  onRegisterViewportPasteHandler: (
    handler: ((text: string) => Promise<void>) | null,
  ) => void;
  onViewportTitleChange: (title: string) => void;
  onRuntimeReplayApplied?: (replay: {
    sessionId: string;
    nextCursor: string;
    entries: RuntimeSessionReplaySnapshot["entries"];
  }) => void;
  onRuntimeConnectionStateChange?: (args: {
    sessionId: string;
    state: RuntimeTabControllerConnectionState;
  }) => void;
  onRuntimeError?: (message: string) => void;
  onRestartRuntime: () => void;
  onSearchQueryChange: (query: string) => void;
  onSearchSelectMatch: () => void;
  onViewportResize: (viewport: TerminalViewport) => void;
}

export interface TerminalPanelStackProps {
  mode: "desktop" | "web";
  tabs: TerminalShellSnapshot["tabs"];
  clipboardProvider?: TerminalClipboardProvider;
  onClipboardFeedback?: TerminalClipboardFeedbackReporter;
  terminalInteractionMessages?: Pick<
    TerminalInteractionMessages,
    "search" | "pasteConfirmation" | "viewportContextMenu"
  >;
  desktopRuntimeClient?: RuntimeClientResolverArgs["desktopRuntimeClient"];
  webRuntimeClient?: RuntimeClientResolverArgs["webRuntimeClient"];
  runtimeControllerStore: Pick<RuntimeTabControllerStore, "getOrCreate">;
  onViewportInput: (tabId: string, input: TerminalViewportInput) => void;
  onRegisterViewportCopyHandler: (
    tabId: string,
    handler: (() => Promise<void>) | null,
  ) => void;
  onRegisterViewportPasteHandler: (
    tabId: string,
    handler: ((text: string) => Promise<void>) | null,
  ) => void;
  onViewportTitleChange: (tabId: string, title: string) => void;
  onRuntimeReplayApplied: (
    tabId: string,
    replay: {
      sessionId: string;
      nextCursor: string;
      entries: RuntimeSessionReplaySnapshot["entries"];
    },
  ) => void;
  onRuntimeConnectionStateChange: (
    tabId: string,
    connection: {
      sessionId: string;
      state: RuntimeTabControllerConnectionState;
    },
  ) => void;
  onRuntimeError: (tabId: string, message: string) => void;
  onRestartRuntime: (tabId: string) => void;
  onSearchQueryChange: (tabId: string, query: string) => void;
  onSearchSelectMatch: (tabId: string) => void;
  onViewportResize: (tabId: string, viewport: TerminalViewport) => void;
}

export function TerminalPanelStack(props: TerminalPanelStackProps) {
  const latestPanelStackPropsRef = useLatestRef(props);

  return (
    <div style={panelStackStyle}>
      {props.tabs.map((tab) => (
        <div
          key={tab.id}
          id={`terminal-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`terminal-tab-${tab.id}`}
          aria-hidden={!tab.active}
          style={panelStyle(tab.active)}
        >
          {tab.active ? (
            <MemoTerminalStage
              mode={props.mode}
              tabId={tab.id}
              tab={tab}
              active={tab.active}
              clipboardProvider={props.clipboardProvider}
              onClipboardFeedback={props.onClipboardFeedback}
              terminalInteractionMessages={props.terminalInteractionMessages}
              runtimeController={props.runtimeControllerStore.getOrCreate(tab.id)}
              runtimeClient={resolveTabRuntimeClient({
                mode: props.mode,
                runtimeBootstrap: tab.runtimeBootstrap,
                desktopRuntimeClient: props.desktopRuntimeClient,
                webRuntimeClient: props.webRuntimeClient,
              })}
              onViewportInput={(input) =>
                latestPanelStackPropsRef.current.onViewportInput(tab.id, input)
              }
              onRegisterViewportCopyHandler={(handler) =>
                latestPanelStackPropsRef.current.onRegisterViewportCopyHandler(
                  tab.id,
                  handler,
                )
              }
              onRegisterViewportPasteHandler={(handler) =>
                latestPanelStackPropsRef.current.onRegisterViewportPasteHandler(
                  tab.id,
                  handler,
                )
              }
              onViewportTitleChange={(title) =>
                latestPanelStackPropsRef.current.onViewportTitleChange(tab.id, title)
              }
              onRuntimeReplayApplied={(replay) =>
                latestPanelStackPropsRef.current.onRuntimeReplayApplied(tab.id, replay)
              }
              onRuntimeConnectionStateChange={(connection) =>
                latestPanelStackPropsRef.current.onRuntimeConnectionStateChange(
                  tab.id,
                  connection,
                )
              }
              onRuntimeError={(message) =>
                latestPanelStackPropsRef.current.onRuntimeError(tab.id, message)
              }
              onRestartRuntime={() =>
                latestPanelStackPropsRef.current.onRestartRuntime(tab.id)
              }
              onSearchQueryChange={(query) =>
                latestPanelStackPropsRef.current.onSearchQueryChange(tab.id, query)
              }
              onSearchSelectMatch={() =>
                latestPanelStackPropsRef.current.onSearchSelectMatch(tab.id)
              }
              onViewportResize={(viewport) =>
                latestPanelStackPropsRef.current.onViewportResize(tab.id, viewport)
              }
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

const MemoTerminalStage = memo(function TerminalStage(stageProps: TerminalStageEntryProps) {
  const props = stageProps;
  const {
    showLivePrompt,
    showBootstrapOverlay,
  } = resolveTerminalStageBehavior({
    mode: props.mode,
    runtimeBootstrap: props.tab.runtimeBootstrap,
    runtimeSessionId: props.tab.runtimeSessionId,
    runtimeState: props.tab.runtimeState,
    runtimeStreamStarted: props.tab.runtimeStreamStarted,
    runtimeConnectionState: props.tab.runtimeConnectionState,
  });

  return props.mode === "web" && showLivePrompt ? (
    <FallbackTerminalStage
      tab={props.tab}
      active={props.active}
      clipboardProvider={props.clipboardProvider}
      onClipboardFeedback={props.onClipboardFeedback}
      terminalInteractionMessages={props.terminalInteractionMessages}
      onViewportInput={props.onViewportInput}
      onRegisterViewportCopyHandler={props.onRegisterViewportCopyHandler}
      onRegisterViewportPasteHandler={props.onRegisterViewportPasteHandler}
      onViewportTitleChange={props.onViewportTitleChange}
      onSearchQueryChange={props.onSearchQueryChange}
      onSearchSelectMatch={props.onSearchSelectMatch}
      onViewportResize={props.onViewportResize}
    />
  ) : (
    <RuntimeTerminalStage
      tab={props.tab}
      active={props.active}
      clipboardProvider={props.clipboardProvider}
      onClipboardFeedback={props.onClipboardFeedback}
      terminalInteractionMessages={props.terminalInteractionMessages}
      controller={props.runtimeController}
      runtimeClient={props.runtimeClient}
      showBootstrapOverlay={showBootstrapOverlay}
      onViewportInput={props.onViewportInput}
      onRegisterViewportCopyHandler={props.onRegisterViewportCopyHandler}
      onRegisterViewportPasteHandler={props.onRegisterViewportPasteHandler}
      onViewportTitleChange={props.onViewportTitleChange}
      onRuntimeReplayApplied={props.onRuntimeReplayApplied}
      onRuntimeConnectionStateChange={props.onRuntimeConnectionStateChange}
      onRuntimeError={props.onRuntimeError}
      onRestartRuntime={props.onRestartRuntime}
      onSearchQueryChange={props.onSearchQueryChange}
      onSearchSelectMatch={props.onSearchSelectMatch}
      onViewportResize={props.onViewportResize}
    />
  );
}, shouldReuseTerminalStageRender);

