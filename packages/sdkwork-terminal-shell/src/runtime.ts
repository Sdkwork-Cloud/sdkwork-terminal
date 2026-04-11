import type {
  TerminalShellMode,
  TerminalShellRuntimeState,
} from "./model";

export const TERMINAL_RUNTIME_POLL_INTERVAL_RECOVERY_MS = 120;
export const TERMINAL_RUNTIME_POLL_INTERVAL_STEADY_MS = 1500;

type RuntimePendingInputEntry =
  | {
      kind: "text";
      data: string;
    }
  | {
      kind: "binary";
      inputBytes: number[];
    };

export interface TerminalRuntimeInputPreview {
  submittedLines: string[];
  currentLine: string;
  cursorColumn: number;
  hasBinaryInput: boolean;
}

export function resolveTerminalRuntimePollInterval(args: {
  supportsSubscription: boolean;
  boundSessionCount: number;
  subscribedSessionCount: number;
  failedSubscriptionCount: number;
}) {
  if (args.boundSessionCount <= 0) {
    return TERMINAL_RUNTIME_POLL_INTERVAL_STEADY_MS;
  }

  if (!args.supportsSubscription) {
    return TERMINAL_RUNTIME_POLL_INTERVAL_RECOVERY_MS;
  }

  if (
    args.failedSubscriptionCount > 0 ||
    args.subscribedSessionCount < args.boundSessionCount
  ) {
    return TERMINAL_RUNTIME_POLL_INTERVAL_RECOVERY_MS;
  }

  // Once every bound session has a healthy live subscription, replay polling
  // becomes a low-frequency safety net instead of the primary delivery path.
  return TERMINAL_RUNTIME_POLL_INTERVAL_STEADY_MS;
}

export function shouldShowTerminalBootstrapOverlay(args: {
  mode: TerminalShellMode;
  runtimeState: TerminalShellRuntimeState;
  runtimeStreamStarted: boolean;
}) {
  if (args.mode !== "desktop") {
    return false;
  }

  if (
    args.runtimeState !== "binding" &&
    args.runtimeState !== "retrying"
  ) {
    return false;
  }

  return !args.runtimeStreamStarted;
}

export function isTerminalRuntimeProtocolResponseText(input: string) {
  return input === "\u001b[0n" || /^\u001b\[\??\d+(;\d+)*R$/.test(input);
}

export function shouldBypassTerminalRuntimeInputQueue(args: {
  runtimeState: TerminalShellRuntimeState;
  runtimeSessionId: string | null;
  runtimeStreamStarted: boolean;
  pendingInputCount: number;
  input:
    | {
        kind: "text";
        data: string;
      }
    | {
        kind: "binary";
        inputBytes: number[];
      };
}) {
  if (!args.runtimeSessionId || args.runtimeState !== "running" || args.pendingInputCount > 0) {
    return false;
  }

  // Once the PTY session is running, typed input must stay interactive even if
  // the first repaint/banner has not arrived yet. Catch-up replay covers the
  // output path; blocking writes here makes the terminal appear frozen.
  return true;
}

export function shouldFlushTerminalRuntimeInputQueue(args: {
  mode: TerminalShellMode;
  runtimeState: TerminalShellRuntimeState;
  runtimeSessionId: string | null;
  runtimeStreamStarted: boolean;
  input:
    | {
        kind: "text";
        data: string;
      }
    | {
        kind: "binary";
        inputBytes: number[];
      };
}) {
  if (!args.runtimeSessionId || args.runtimeState !== "running") {
    return false;
  }

  // Desktop input queueing is only for pre-running/binding gaps. After bind,
  // normal keystrokes should flush immediately instead of waiting for a first
  // PTY frame that some shells may delay or omit.
  return true;
}

export function createTerminalRuntimeInputPreview(args: {
  queue: RuntimePendingInputEntry[];
  fallbackInput: string;
}) {
  const preview: TerminalRuntimeInputPreview = {
    submittedLines: [],
    currentLine: "",
    cursorColumn: 0,
    hasBinaryInput: false,
  };
  const entries =
    args.queue.length > 0
      ? args.queue
      : args.fallbackInput.length > 0
        ? [
            {
              kind: "text" as const,
              data: args.fallbackInput,
            },
          ]
        : [];

  for (const entry of entries) {
    if (entry.kind === "binary") {
      preview.hasBinaryInput = true;
      continue;
    }

    applyTerminalRuntimePreviewText(preview, entry.data);
  }

  return preview;
}

function applyTerminalRuntimePreviewText(
  preview: TerminalRuntimeInputPreview,
  input: string,
) {
  for (let index = 0; index < input.length; index += 1) {
    const current = input[index];

    if (current === "\u001b") {
      const csi = readTerminalRuntimeCsiSequence(input, index);
      if (csi) {
        index = csi.nextIndex;
        applyTerminalRuntimeCsi(preview, csi.sequence);
      }
      continue;
    }

    if (current === "\r") {
      submitTerminalRuntimePreviewLine(preview);
      if (input[index + 1] === "\n") {
        index += 1;
      }
      continue;
    }

    if (current === "\n") {
      submitTerminalRuntimePreviewLine(preview);
      continue;
    }

    if (current === "\u007f" || current === "\b") {
      if (preview.cursorColumn > 0) {
        preview.currentLine =
          preview.currentLine.slice(0, preview.cursorColumn - 1) +
          preview.currentLine.slice(preview.cursorColumn);
        preview.cursorColumn -= 1;
      }
      continue;
    }

    if (current === "\u0015") {
      preview.currentLine = "";
      preview.cursorColumn = 0;
      continue;
    }

    if (current === "\u0003") {
      preview.submittedLines.push(`${preview.currentLine}^C`);
      preview.currentLine = "";
      preview.cursorColumn = 0;
      continue;
    }

    if (current === "\t") {
      insertTerminalRuntimePreviewText(preview, "    ");
      continue;
    }

    if (current >= " " && current !== "\u007f") {
      insertTerminalRuntimePreviewText(preview, current);
    }
  }
}

function readTerminalRuntimeCsiSequence(input: string, startIndex: number) {
  if (input[startIndex + 1] !== "[") {
    return null;
  }

  let cursor = startIndex + 2;
  let sequence = "\u001b[";

  while (cursor < input.length) {
    const char = input[cursor];
    sequence += char;
    if ((char >= "@" && char <= "~") || char === "~") {
      return {
        sequence,
        nextIndex: cursor,
      };
    }
    cursor += 1;
  }

  return null;
}

function applyTerminalRuntimeCsi(
  preview: TerminalRuntimeInputPreview,
  sequence: string,
) {
  switch (sequence) {
    case "\u001b[D":
      preview.cursorColumn = Math.max(0, preview.cursorColumn - 1);
      return;
    case "\u001b[C":
      preview.cursorColumn = Math.min(preview.currentLine.length, preview.cursorColumn + 1);
      return;
    case "\u001b[H":
    case "\u001b[1~":
      preview.cursorColumn = 0;
      return;
    case "\u001b[F":
    case "\u001b[4~":
      preview.cursorColumn = preview.currentLine.length;
      return;
    case "\u001b[3~":
      if (preview.cursorColumn < preview.currentLine.length) {
        preview.currentLine =
          preview.currentLine.slice(0, preview.cursorColumn) +
          preview.currentLine.slice(preview.cursorColumn + 1);
      }
      return;
    default:
      return;
  }
}

function submitTerminalRuntimePreviewLine(
  preview: TerminalRuntimeInputPreview,
) {
  preview.submittedLines.push(preview.currentLine);
  preview.currentLine = "";
  preview.cursorColumn = 0;
}

function insertTerminalRuntimePreviewText(
  preview: TerminalRuntimeInputPreview,
  text: string,
) {
  preview.currentLine =
    preview.currentLine.slice(0, preview.cursorColumn) +
    text +
    preview.currentLine.slice(preview.cursorColumn);
  preview.cursorColumn += text.length;
}
