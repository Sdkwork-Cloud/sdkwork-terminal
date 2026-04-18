export const MAX_TERMINAL_PASTE_LENGTH = 32768;

export type TerminalClipboardProvider = {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
};

function resolveClipboard(explicitClipboard?: TerminalClipboardProvider | null) {
  return explicitClipboard ?? null;
}

export function normalizeTerminalClipboardPaste(text: string) {
  return text.length > MAX_TERMINAL_PASTE_LENGTH
    ? text.slice(0, MAX_TERMINAL_PASTE_LENGTH)
    : text;
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

    return normalizeTerminalClipboardPaste(text);
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
