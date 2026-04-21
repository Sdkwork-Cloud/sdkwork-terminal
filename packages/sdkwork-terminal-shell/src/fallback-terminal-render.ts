import type {
  TerminalLine,
  TerminalSnapshot,
} from "@sdkwork/terminal-core";
import { buildPromptPrefix } from "./terminal-stage-shared.ts";

const FALLBACK_PROMPT_CURSOR_START = "\u001b[7m";
const FALLBACK_PROMPT_CURSOR_END = "\u001b[27m";

export interface FallbackTerminalRenderTab {
  profile: "powershell" | "bash" | "shell";
  workingDirectory: string;
  commandText: string;
  commandCursor: number;
  snapshot: TerminalSnapshot;
}

function clampPromptCursor(commandText: string, commandCursor: number) {
  if (!Number.isFinite(commandCursor)) {
    return commandText.length;
  }

  return Math.min(Math.max(Math.trunc(commandCursor), 0), commandText.length);
}

export function createFallbackTerminalPromptLine(
  tab: FallbackTerminalRenderTab,
): TerminalLine {
  const cursor = clampPromptCursor(tab.commandText, tab.commandCursor);
  const prefix = buildPromptPrefix({
    profile: tab.profile,
    workingDirectory: tab.workingDirectory,
  });
  const beforeCursor = tab.commandText.slice(0, cursor);
  const afterCursor = tab.commandText.slice(cursor);
  const cursorCell = afterCursor[0] ?? " ";
  const trailingText = afterCursor.length > 0 ? afterCursor.slice(1) : "";

  return {
    kind: "input",
    text:
      `${prefix}${beforeCursor}` +
      `${FALLBACK_PROMPT_CURSOR_START}${cursorCell}${FALLBACK_PROMPT_CURSOR_END}` +
      trailingText,
  };
}

export function createFallbackTerminalRenderSnapshot(
  tab: FallbackTerminalRenderTab,
): TerminalSnapshot {
  const lines = [...tab.snapshot.lines, createFallbackTerminalPromptLine(tab)];

  return {
    ...tab.snapshot,
    lines,
    totalLines: lines.length,
    visibleLines: lines.slice(-Math.max(1, tab.snapshot.viewport.rows)),
  };
}
