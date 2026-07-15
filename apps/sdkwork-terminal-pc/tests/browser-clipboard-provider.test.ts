import test from "node:test";
import assert from "node:assert/strict";

import {
  createBrowserClipboardProvider,
} from "../packages/sdkwork-terminal-pc-shell/src/browser-clipboard-provider.ts";
import {
  readTerminalClipboardTextOutcome,
  writeTerminalClipboardTextOutcome,
} from "../packages/sdkwork-terminal-pc-shell/src/terminal-clipboard.ts";

test("browser clipboard provider reports an unavailable API without attempting access", async () => {
  const provider = createBrowserClipboardProvider();

  assert.equal(provider.getAvailability?.(), "unavailable");
  assert.deepEqual(await readTerminalClipboardTextOutcome(provider), {
    kind: "unavailable",
  });
  assert.deepEqual(await writeTerminalClipboardTextOutcome("pwd", provider), {
    kind: "unavailable",
  });
});

test("browser clipboard provider keeps browser access injected and classifies denial safely", async () => {
  const deniedError = new Error("browser permission detail");
  deniedError.name = "SecurityError";
  const provider = createBrowserClipboardProvider({
    clipboard: {
      async readText() {
        throw deniedError;
      },
      async writeText() {
        throw deniedError;
      },
    },
  });

  assert.equal(provider.getAvailability?.(), "available");
  assert.deepEqual(await readTerminalClipboardTextOutcome(provider), {
    kind: "denied",
  });
  assert.deepEqual(await writeTerminalClipboardTextOutcome("pwd", provider), {
    kind: "denied",
  });
});
