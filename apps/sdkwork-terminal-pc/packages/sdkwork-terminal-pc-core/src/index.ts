import type { FeatureTile, MetricItem } from "@sdkwork/terminal-pc-types";

export interface TerminalViewport {
  cols: number;
  rows: number;
}

export interface TerminalLine {
  kind: "input" | "output" | "system";
  text: string;
}

export interface TerminalSelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface TerminalSearchMatch {
  lineIndex: number;
  startColumn: number;
  endColumn: number;
  text: string;
}

export interface TerminalCoreState {
  viewport: TerminalViewport;
  scrollbackLimit: number;
  lines: TerminalLine[];
  selection: TerminalSelectionRange | null;
  selectedText: string;
  searchQuery: string;
  matches: TerminalSearchMatch[];
}

export interface TerminalSnapshot extends TerminalCoreState {
  totalLines: number;
  visibleLines: TerminalLine[];
}

export interface CreateTerminalCoreOptions {
  viewport?: TerminalViewport;
  scrollbackLimit?: number;
  lines?: TerminalLine[];
}

export const DEFAULT_TERMINAL_VIEWPORT: TerminalViewport = {
  cols: 120,
  rows: 30,
};

export const featureTiles: FeatureTile[] = [
  {
    id: "workbench",
    title: "Workbench",
    summary: "Tabs, panes and terminal stage stay centered on the session.",
  },
  {
    id: "sessions",
    title: "Sessions",
    summary: "Sessions remain attachable, recoverable and replay-ready.",
  },
  {
    id: "resources",
    title: "Resources",
    summary: "Local, SSH, Docker, Kubernetes and runtime nodes share one model.",
  },
];

export const baselineMetrics: MetricItem[] = [
  { label: "Mode", value: "desktop / web / server" },
  { label: "AI CLI", value: "Codex / Claude Code / Gemini / OpenCode" },
  { label: "Core", value: "terminal-core + xterm adapter + Rust daemon" },
];

function normalizeLines(chunk: string, kind: TerminalLine["kind"]): TerminalLine[] {
  if (chunk.length === 0) {
    return [];
  }
  return chunk
    .split(/\r?\n/)
    .map((text) => ({ kind, text }));
}

function clampLineIndex(lines: TerminalLine[], index: number) {
  if (lines.length === 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), lines.length - 1);
}

function clampColumn(line: TerminalLine | undefined, column: number) {
  if (!line) {
    return 0;
  }

  return Math.min(Math.max(column, 0), line.text.length);
}

function limitScrollback(lines: TerminalLine[], scrollbackLimit: number) {
  if (scrollbackLimit <= 0) {
    return [];
  }

  return lines.slice(-scrollbackLimit);
}

function getSearchMatches(lines: TerminalLine[], query: string): TerminalSearchMatch[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  return lines.flatMap((line, lineIndex) => {
    const matches: TerminalSearchMatch[] = [];
    const lowerText = line.text.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < lowerText.length) {
      const startColumn = lowerText.indexOf(normalizedQuery, searchFrom);
      if (startColumn < 0) {
        break;
      }

      matches.push({
        lineIndex,
        startColumn,
        endColumn: startColumn + normalizedQuery.length,
        text: line.text.slice(startColumn, startColumn + normalizedQuery.length),
      });
      searchFrom = startColumn + 1;
    }

    return matches;
  });
}

function normalizeSelection(
  lines: TerminalLine[],
  selection: TerminalSelectionRange,
): TerminalSelectionRange {
  const startsAfterEnd =
    selection.startLine > selection.endLine ||
    (selection.startLine === selection.endLine &&
      selection.startColumn > selection.endColumn);

  const normalized = startsAfterEnd
    ? {
        startLine: selection.endLine,
        startColumn: selection.endColumn,
        endLine: selection.startLine,
        endColumn: selection.startColumn,
      }
    : selection;

  const startLine = clampLineIndex(lines, normalized.startLine);
  const endLine = clampLineIndex(lines, normalized.endLine);

  return {
    startLine,
    startColumn: clampColumn(lines[startLine], normalized.startColumn),
    endLine,
    endColumn: clampColumn(lines[endLine], normalized.endColumn),
  };
}

function extractSelectionText(
  lines: TerminalLine[],
  selection: TerminalSelectionRange | null,
) {
  if (!selection || lines.length === 0) {
    return "";
  }

  const normalized = normalizeSelection(lines, selection);
  const selected: string[] = [];

  for (let lineIndex = normalized.startLine; lineIndex <= normalized.endLine; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line) {
      continue;
    }

    if (normalized.startLine === normalized.endLine) {
      selected.push(line.text.slice(normalized.startColumn, normalized.endColumn));
      continue;
    }

    if (lineIndex === normalized.startLine) {
      selected.push(line.text.slice(normalized.startColumn));
      continue;
    }

    if (lineIndex === normalized.endLine) {
      selected.push(line.text.slice(0, normalized.endColumn));
      continue;
    }

    selected.push(line.text);
  }

  return selected.join("\n");
}

function rebuildDerivedState(
  state: TerminalCoreState,
  overrides: Partial<TerminalCoreState> = {},
): TerminalCoreState {
  const nextState = {
    ...state,
    ...overrides,
  };

  const linesChanged = overrides.lines !== undefined && overrides.lines !== state.lines;
  const searchChanged = overrides.searchQuery !== undefined && overrides.searchQuery !== state.searchQuery;
  const selectionChanged = overrides.selection !== undefined;

  const lines = linesChanged
    ? limitScrollback(nextState.lines, nextState.scrollbackLimit)
    : state.lines;

  const selection = selectionChanged
    ? (nextState.selection ? normalizeSelection(lines, nextState.selection) : null)
    : linesChanged
      ? (state.selection ? normalizeSelection(lines, state.selection) : null)
      : state.selection;

  const matches = (searchChanged || linesChanged)
    ? (nextState.searchQuery.trim().length > 0
      ? getSearchMatches(lines, nextState.searchQuery)
      : [])
    : state.matches;

  const selectedText = (selectionChanged || linesChanged)
    ? extractSelectionText(lines, selection)
    : state.selectedText;

  return {
    ...nextState,
    lines,
    selection,
    matches,
    selectedText,
  };
}

export function createTerminalCoreState(
  options: CreateTerminalCoreOptions = {},
): TerminalCoreState {
  return rebuildDerivedState({
    viewport: options.viewport ?? DEFAULT_TERMINAL_VIEWPORT,
    scrollbackLimit: options.scrollbackLimit ?? 10000,
    lines: options.lines ?? [],
    selection: null,
    selectedText: "",
    searchQuery: "",
    matches: [],
  });
}

export function appendTerminalOutput(state: TerminalCoreState, chunk: string) {
  const newLines = normalizeLines(chunk, "output");
  if (newLines.length === 0) {
    return state;
  }

  const lines = state.lines.concat(newLines);
  return rebuildDerivedState(state, { lines });
}

export function appendTerminalInput(state: TerminalCoreState, input: string) {
  const newLines = normalizeLines(`$ ${input}`, "input");
  if (newLines.length === 0) {
    return state;
  }

  const lines = state.lines.concat(newLines);
  return rebuildDerivedState(state, { lines });
}

export function clearTerminal(state: TerminalCoreState) {
  return rebuildDerivedState(state, {
    lines: [],
    selection: null,
    searchQuery: "",
  });
}

export function resizeTerminalViewport(
  state: TerminalCoreState,
  viewport: TerminalViewport,
) {
  const safeViewport: TerminalViewport = {
    cols: Math.max(1, viewport.cols),
    rows: Math.max(1, viewport.rows),
  };
  return rebuildDerivedState(state, { viewport: safeViewport });
}

export function searchTerminal(state: TerminalCoreState, query: string) {
  return rebuildDerivedState(state, { searchQuery: query });
}

export function selectTerminalRange(
  state: TerminalCoreState,
  selection: TerminalSelectionRange,
) {
  return rebuildDerivedState(state, { selection });
}

export function getTerminalSelectionText(state: TerminalCoreState) {
  return state.selectedText;
}

export const copyTerminalSelection = getTerminalSelectionText;

export function getTerminalSnapshot(state: TerminalCoreState): TerminalSnapshot {
  return {
    ...state,
    totalLines: state.lines.length,
    visibleLines: state.lines.slice(-Math.max(1, state.viewport.rows)),
  };
}

export function createDemoTerminalCoreState() {
  let state = createTerminalCoreState({
    viewport: DEFAULT_TERMINAL_VIEWPORT,
    scrollbackLimit: 256,
  });

  state = appendTerminalOutput(
    state,
    "sdkwork terminal ready\nsession resumed\ncodex attached\nsearch transcript ready",
  );
  state = appendTerminalInput(state, "help");
  state = appendTerminalOutput(
    state,
    "help -> search, selection, resize, scrollback",
  );

  return searchTerminal(state, "session");
}

