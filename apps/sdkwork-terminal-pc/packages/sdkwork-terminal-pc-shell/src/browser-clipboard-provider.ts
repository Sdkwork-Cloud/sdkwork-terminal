import type { TerminalClipboardProvider } from "./terminal-clipboard.ts";

export interface BrowserClipboardProviderOptions {
  clipboard?: Pick<Clipboard, "readText" | "writeText"> | null;
}

function resolveBrowserClipboard(
  options: BrowserClipboardProviderOptions,
): Pick<Clipboard, "readText" | "writeText"> | null {
  if (options.clipboard) {
    return options.clipboard;
  }

  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return null;
  }

  return navigator.clipboard;
}

export function createBrowserClipboardProvider(
  options: BrowserClipboardProviderOptions = {},
): TerminalClipboardProvider {
  return {
    getAvailability: () =>
      resolveBrowserClipboard(options) ? "available" : "unavailable",
    readText: async () => {
      const clipboard = resolveBrowserClipboard(options);
      if (!clipboard) {
        return "";
      }

      return clipboard.readText();
    },
    writeText: async (text: string) => {
      const clipboard = resolveBrowserClipboard(options);
      if (!clipboard) {
        throw new Error("Web clipboard API is unavailable.");
      }

      await clipboard.writeText(text);
    },
  };
}
