export const MAX_TERMINAL_PASTE_LENGTH = 32768;

export type TerminalClipboardProvider = {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
};

function resolveClipboard(explicitClipboard?: TerminalClipboardProvider | null) {
  return explicitClipboard ?? null;
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
  for (let offset = 0; offset < text.length; ) {
    const nextOffset = resolveSafeTerminalPasteEnd(
      text,
      offset,
      MAX_TERMINAL_PASTE_LENGTH,
    );
    if (nextOffset <= offset) {
      chunks.push(text.slice(offset, offset + MAX_TERMINAL_PASTE_LENGTH));
      offset += MAX_TERMINAL_PASTE_LENGTH;
      continue;
    }

    chunks.push(text.slice(offset, nextOffset));
    offset = nextOffset;
  }

  return chunks;
}

export async function readTerminalClipboardText(
  explicitClipboard?: TerminalClipboardProvider | null,
) {
  const clipboard = resolveClipboard(explicitClipboard);
  if (!clipboard) {
    return "";
  }

  try {
    const text = await clipboard.readText();
    if (text.length === 0) {
      return "";
    }

    return text;
  } catch {
    return "";
  }
}

export async function writeTerminalClipboardText(
  text: string,
  explicitClipboard?: TerminalClipboardProvider | null,
) {
  if (text.length === 0) {
    return false;
  }

  const clipboard = resolveClipboard(explicitClipboard);
  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
