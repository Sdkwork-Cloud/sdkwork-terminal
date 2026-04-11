import { DEFAULT_TERMINAL_VIEWPORT, type TerminalSelectionRange, type TerminalViewport } from "@sdkwork/terminal-core";
import {
  createTerminalViewAdapter,
  type TerminalViewAdapter,
} from "@sdkwork/terminal-infrastructure";

export interface WorkbenchTerminalAction {
  id: string;
  label: string;
  description: string;
}

export interface WorkbenchTerminalStage {
  title: string;
  summary: string;
  searchLabel: string;
  transcriptLabel: string;
  initialSearchQuery: string;
  resizeViewport: TerminalViewport;
  initialSelection: TerminalSelectionRange;
  actions: WorkbenchTerminalAction[];
  adapter: TerminalViewAdapter;
}

export function createWorkbenchTerminalStage(): WorkbenchTerminalStage {
  const adapter = createTerminalViewAdapter({
    viewport: DEFAULT_TERMINAL_VIEWPORT,
    scrollbackLimit: 256,
  });

  adapter.writeOutput(
    "sdkwork terminal ready\nsession resumed\ncodex attached\nsearch transcript ready",
  );
  adapter.writeInput("help");
  adapter.writeOutput("help -> search, selection, resize, scrollback");
  adapter.search("session");

  return {
    title: "Terminal Stage",
    summary:
      "Search transcript, selection, resize and scrollback stay behind a stable terminal adapter.",
    searchLabel: "Search transcript",
    transcriptLabel: "Visible transcript",
    initialSearchQuery: "session",
    resizeViewport: {
      cols: 132,
      rows: 32,
    },
    initialSelection: {
      startLine: 1,
      startColumn: 0,
      endLine: 1,
      endColumn: 7,
    },
    actions: [
      {
        id: "run-help",
        label: "Run help",
        description: "Append one input/output round-trip to the transcript.",
      },
      {
        id: "resize-wide",
        label: "Resize 132x32",
        description: "Stretch the terminal stage to a larger viewport.",
      },
      {
        id: "select-session",
        label: "Select session",
        description: "Select the first matched session token.",
      },
      {
        id: "copy-selection",
        label: "Copy selection",
        description: "Copy the current selected transcript.",
      },
    ],
    adapter,
  };
}
