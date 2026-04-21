import type { TerminalViewport } from "@sdkwork/terminal-core";
import type {
  RuntimeSessionReplaySnapshot,
  TerminalViewportInput,
} from "@sdkwork/terminal-infrastructure";
import { memo } from "react";
import { FallbackTerminalStage } from "./fallback-terminal-stage.tsx";
import {
  resolveTerminalStageBehavior,
  type TerminalShellSnapshot,
} from "./model";
import { panelStackStyle, panelStyle } from "./shell-layout.ts";
import type { RuntimeTabControllerStore } from "./runtime-tab-controller-store.ts";
import type { RuntimeClientResolverArgs } from "./runtime-orchestration.ts";
import { resolveTabRuntimeClient } from "./runtime-orchestration.ts";
import { RuntimeTerminalStage } from "./runtime-terminal-stage.tsx";
import type { TerminalClipboardProvider } from "./terminal-clipboard.ts";
import type { RuntimeTabController } from "./runtime-tab-controller.ts";
import type { SharedRuntimeClient } from "./terminal-stage-shared.ts";

interface TerminalStageEntryProps {
  mode: "desktop" | "web";
  tabId: string;
  tab: TerminalShellSnapshot["activeTab"];
  active: boolean;
  clipboardProvider?: TerminalClipboardProvider;
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
    nextCursor: string;
    entries: RuntimeSessionReplaySnapshot["entries"];
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
      nextCursor: string;
      entries: RuntimeSessionReplaySnapshot["entries"];
    },
  ) => void;
  onRuntimeError: (tabId: string, message: string) => void;
  onRestartRuntime: (tabId: string) => void;
  onSearchQueryChange: (tabId: string, query: string) => void;
  onSearchSelectMatch: (tabId: string) => void;
  onViewportResize: (tabId: string, viewport: TerminalViewport) => void;
}

export function TerminalPanelStack(props: TerminalPanelStackProps) {
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
          <MemoTerminalStage
            mode={props.mode}
            tabId={tab.id}
            tab={tab}
            active={tab.active}
            clipboardProvider={props.clipboardProvider}
            runtimeController={props.runtimeControllerStore.getOrCreate(tab.id)}
            runtimeClient={resolveTabRuntimeClient({
              mode: props.mode,
              runtimeBootstrap: tab.runtimeBootstrap,
              desktopRuntimeClient: props.desktopRuntimeClient,
              webRuntimeClient: props.webRuntimeClient,
            })}
            onViewportInput={(input) => props.onViewportInput(tab.id, input)}
            onRegisterViewportCopyHandler={(handler) =>
              props.onRegisterViewportCopyHandler(tab.id, handler)
            }
            onRegisterViewportPasteHandler={(handler) =>
              props.onRegisterViewportPasteHandler(tab.id, handler)
            }
            onViewportTitleChange={(title) =>
              props.onViewportTitleChange(tab.id, title)
            }
            onRuntimeReplayApplied={(replay) =>
              props.onRuntimeReplayApplied(tab.id, replay)
            }
            onRuntimeError={(message) => props.onRuntimeError(tab.id, message)}
            onRestartRuntime={() => props.onRestartRuntime(tab.id)}
            onSearchQueryChange={(query) =>
              props.onSearchQueryChange(tab.id, query)
            }
            onSearchSelectMatch={() => props.onSearchSelectMatch(tab.id)}
            onViewportResize={(viewport) =>
              props.onViewportResize(tab.id, viewport)
            }
          />
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
  });

  return props.mode === "web" && showLivePrompt ? (
    <FallbackTerminalStage
      tab={props.tab}
      active={props.active}
      clipboardProvider={props.clipboardProvider}
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
      controller={props.runtimeController}
      runtimeClient={props.runtimeClient}
      showBootstrapOverlay={showBootstrapOverlay}
      onViewportInput={props.onViewportInput}
      onRegisterViewportCopyHandler={props.onRegisterViewportCopyHandler}
      onRegisterViewportPasteHandler={props.onRegisterViewportPasteHandler}
      onViewportTitleChange={props.onViewportTitleChange}
      onRuntimeReplayApplied={props.onRuntimeReplayApplied}
      onRuntimeError={props.onRuntimeError}
      onRestartRuntime={props.onRestartRuntime}
      onSearchQueryChange={props.onSearchQueryChange}
      onSearchSelectMatch={props.onSearchSelectMatch}
      onViewportResize={props.onViewportResize}
    />
  );
}, (previousProps, nextProps) => {
  return (
    previousProps.mode === nextProps.mode &&
    previousProps.tabId === nextProps.tabId &&
    previousProps.active === nextProps.active &&
    previousProps.clipboardProvider === nextProps.clipboardProvider &&
    previousProps.tab === nextProps.tab
  );
});
