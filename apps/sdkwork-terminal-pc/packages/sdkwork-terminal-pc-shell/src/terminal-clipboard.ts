export const MAX_TERMINAL_PASTE_LENGTH = 32768;

export type TerminalClipboardAvailability = "available" | "unavailable";

export type TerminalClipboardProvider = {
  getAvailability?: () => TerminalClipboardAvailability;
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
};

export type TerminalClipboardReadOutcome =
  | { kind: "success"; text: string }
  | { kind: "empty" }
  | { kind: "unavailable" }
  | { kind: "denied" }
  | { kind: "failed" };

export type TerminalClipboardWriteOutcome =
  | { kind: "success" }
  | { kind: "empty" }
  | { kind: "unavailable" }
  | { kind: "denied" }
  | { kind: "failed" };

function resolveClipboard(explicitClipboard?: TerminalClipboardProvider | null) {
  return explicitClipboard ?? null;
}

function isTerminalClipboardUnavailable(clipboard: TerminalClipboardProvider) {
  try {
    return clipboard.getAvailability?.() === "unavailable";
  } catch {
    return true;
  }
}

function resolveTerminalClipboardFailureKind(cause: unknown): "denied" | "failed" {
  if (typeof cause !== "object" || cause === null || !("name" in cause)) {
    return "failed";
  }

  const { name } = cause as { name?: unknown };
  return name === "NotAllowedError" || name === "SecurityError" ? "denied" : "failed";
}

function isHighSurrogate(codeUnit: number) {
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff;
}

function isLowSurrogate(codeUnit: number) {
  return codeUnit >= 0xdc00 && codeUnit <= 0xdfff;
}

function resolveSafeTerminalPasteEnd(text: string, start: number, maxLength: number) {
  const unclampedEnd = Math.min(text.length, start + maxLength);
  if (unclampedEnd >= text.length || unclampedEnd <= start) {
    return unclampedEnd;
  }

  const previousCodeUnit = text.charCodeAt(unclampedEnd - 1);
  const nextCodeUnit = text.charCodeAt(unclampedEnd);
  if (isHighSurrogate(previousCodeUnit) && isLowSurrogate(nextCodeUnit)) {
    return unclampedEnd - 1;
  }

  return unclampedEnd;
}

export function normalizeTerminalClipboardPaste(text: string) {
  return text.length > MAX_TERMINAL_PASTE_LENGTH
    ? text.slice(0, resolveSafeTerminalPasteEnd(text, 0, MAX_TERMINAL_PASTE_LENGTH))
    : text;
}

export function splitTerminalClipboardPaste(text: string) {
  if (text.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  for (let chunkStart = 0; chunkStart < text.length; ) {
    const chunkEnd = resolveSafeTerminalPasteEnd(
      text,
      chunkStart,
      MAX_TERMINAL_PASTE_LENGTH,
    );
    if (chunkEnd <= chunkStart) {
      const fallbackEnd = Math.min(
        text.length,
        chunkStart + MAX_TERMINAL_PASTE_LENGTH,
      );
      chunks.push(text.slice(chunkStart, fallbackEnd));
      chunkStart = fallbackEnd;
      continue;
    }

    chunks.push(text.slice(chunkStart, chunkEnd));
    chunkStart = chunkEnd;
  }

  return chunks;
}

export async function readTerminalClipboardTextOutcome(
  explicitClipboard?: TerminalClipboardProvider | null,
): Promise<TerminalClipboardReadOutcome> {
  const clipboard = resolveClipboard(explicitClipboard);
  if (!clipboard || isTerminalClipboardUnavailable(clipboard)) {
    return { kind: "unavailable" };
  }

  try {
    const text = await clipboard.readText();
    if (typeof text !== "string") {
      return { kind: "failed" };
    }

    return text.length === 0 ? { kind: "empty" } : { kind: "success", text };
  } catch (cause) {
    return { kind: resolveTerminalClipboardFailureKind(cause) };
  }
}

export async function writeTerminalClipboardTextOutcome(
  text: string,
  explicitClipboard?: TerminalClipboardProvider | null,
): Promise<TerminalClipboardWriteOutcome> {
  if (text.length === 0) {
    return { kind: "empty" };
  }

  const clipboard = resolveClipboard(explicitClipboard);
  if (!clipboard || isTerminalClipboardUnavailable(clipboard)) {
    return { kind: "unavailable" };
  }

  try {
    await clipboard.writeText(text);
    return { kind: "success" };
  } catch (cause) {
    return { kind: resolveTerminalClipboardFailureKind(cause) };
  }
}

export async function readTerminalClipboardText(
  explicitClipboard?: TerminalClipboardProvider | null,
) {
  const outcome = await readTerminalClipboardTextOutcome(explicitClipboard);
  return outcome.kind === "success" ? outcome.text : "";
}

export async function writeTerminalClipboardText(
  text: string,
  explicitClipboard?: TerminalClipboardProvider | null,
) {
  const outcome = await writeTerminalClipboardTextOutcome(text, explicitClipboard);
  return outcome.kind === "success";
}

