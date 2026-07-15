import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MAX_TERMINAL_PASTE_LENGTH,
  normalizeTerminalClipboardPaste,
  splitTerminalClipboardPaste,
  readTerminalClipboardTextOutcome,
  readTerminalClipboardText,
  writeTerminalClipboardTextOutcome,
  writeTerminalClipboardText,
} from "../packages/sdkwork-terminal-pc-shell/src/terminal-clipboard.ts";

test("terminal clipboard paste normalization preserves short text unchanged", () => {
  const text = "echo sdkwork\r\n";

  assert.equal(normalizeTerminalClipboardPaste(text), text);
});

test("terminal clipboard paste normalization clamps oversized payloads to the product limit", () => {
  const source = "x".repeat(MAX_TERMINAL_PASTE_LENGTH + 16);

  assert.equal(
    normalizeTerminalClipboardPaste(source).length,
    MAX_TERMINAL_PASTE_LENGTH,
  );
});

test("terminal clipboard paste chunking preserves short payloads as a single chunk", () => {
  const text = "echo sdkwork\r\n";

  assert.deepEqual(splitTerminalClipboardPaste(text), [text]);
});

test("terminal clipboard paste chunking preserves oversized payloads across chunks", () => {
  const source = "x".repeat(MAX_TERMINAL_PASTE_LENGTH * 2 + 37);
  const chunks = splitTerminalClipboardPaste(source);

  assert.equal(chunks.length, 3);
  assert.equal(chunks[0]?.length, MAX_TERMINAL_PASTE_LENGTH);
  assert.equal(chunks[1]?.length, MAX_TERMINAL_PASTE_LENGTH);
  assert.equal(chunks[2]?.length, 37);
  assert.equal(chunks.join(""), source);
});

test("terminal clipboard paste chunking does not split surrogate pairs across chunks", () => {
  const source = `${"x".repeat(MAX_TERMINAL_PASTE_LENGTH - 1)}😀tail`;
  const chunks = splitTerminalClipboardPaste(source);

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0]?.length, MAX_TERMINAL_PASTE_LENGTH - 1);
  assert.equal(chunks[0]?.endsWith("\ud83d"), false);
  assert.equal(chunks[1]?.startsWith("😀"), true);
  assert.equal(chunks.join(""), source);
});

test("terminal clipboard uses the explicit provider when one is passed", async () => {
  const writes: string[] = [];

  const clipboard = {
    readText: async () => "pwd\r\n",
    writeText: async (text) => {
      writes.push(text);
    },
  };

  assert.equal(await readTerminalClipboardText(clipboard), "pwd\r\n");
  assert.equal(await writeTerminalClipboardText("echo sdkwork\r", clipboard), true);
  assert.deepEqual(await readTerminalClipboardTextOutcome(clipboard), {
    kind: "success",
    text: "pwd\r\n",
  });
  assert.deepEqual(
    await writeTerminalClipboardTextOutcome("echo sdkwork\r", clipboard),
    { kind: "success" },
  );
  assert.deepEqual(writes, ["echo sdkwork\r", "echo sdkwork\r"]);
});

test("terminal clipboard returns empty results when no provider is available", async () => {
  assert.equal(await readTerminalClipboardText(), "");
  assert.equal(await writeTerminalClipboardText("dir\r"), false);
  assert.deepEqual(await readTerminalClipboardTextOutcome(), { kind: "unavailable" });
  assert.deepEqual(await writeTerminalClipboardTextOutcome("dir\r"), {
    kind: "unavailable",
  });
});

test("terminal clipboard still works with the passed provider when no ambient state exists", async () => {
  const explicitWrites: string[] = [];
  const explicitClipboard = {
    readText: async () => "explicit",
    writeText: async (text: string) => {
      explicitWrites.push(text);
    },
  };

  assert.equal(await readTerminalClipboardText(explicitClipboard), "explicit");
  assert.equal(await writeTerminalClipboardText("dir\r", explicitClipboard), true);
  assert.deepEqual(explicitWrites, ["dir\r"]);
});

test("terminal clipboard outcomes distinguish empty content from an unavailable provider", async () => {
  let readCount = 0;
  let writeCount = 0;
  const unavailableClipboard = {
    getAvailability: () => "unavailable" as const,
    async readText() {
      readCount += 1;
      return "unexpected";
    },
    async writeText() {
      writeCount += 1;
    },
  };
  const emptyClipboard = {
    async readText() {
      return "";
    },
    async writeText() {},
  };

  assert.deepEqual(await readTerminalClipboardTextOutcome(unavailableClipboard), {
    kind: "unavailable",
  });
  assert.deepEqual(await writeTerminalClipboardTextOutcome("pwd", unavailableClipboard), {
    kind: "unavailable",
  });
  assert.equal(readCount, 0);
  assert.equal(writeCount, 0);
  assert.deepEqual(await readTerminalClipboardTextOutcome(emptyClipboard), {
    kind: "empty",
  });
  assert.deepEqual(await writeTerminalClipboardTextOutcome("", emptyClipboard), {
    kind: "empty",
  });
});

test("terminal clipboard outcomes classify permission failures without exposing host errors", async () => {
  const deniedError = new Error("clipboard permission denied");
  deniedError.name = "NotAllowedError";
  const deniedClipboard = {
    async readText() {
      throw deniedError;
    },
    async writeText() {
      throw deniedError;
    },
  };
  const failedClipboard = {
    async readText() {
      throw new Error("host-specific failure should not escape");
    },
    async writeText() {
      throw new Error("host-specific failure should not escape");
    },
  };

  const readDenied = await readTerminalClipboardTextOutcome(deniedClipboard);
  const writeDenied = await writeTerminalClipboardTextOutcome("pwd", deniedClipboard);
  const readFailed = await readTerminalClipboardTextOutcome(failedClipboard);
  const writeFailed = await writeTerminalClipboardTextOutcome("pwd", failedClipboard);

  assert.deepEqual(readDenied, { kind: "denied" });
  assert.deepEqual(writeDenied, { kind: "denied" });
  assert.deepEqual(readFailed, { kind: "failed" });
  assert.deepEqual(writeFailed, { kind: "failed" });
  assert.equal("cause" in readFailed, false);
  assert.equal("message" in readFailed, false);
  assert.equal("cause" in writeFailed, false);
  assert.equal("message" in writeFailed, false);
});

test("terminal clipboard module stays provider-driven and does not read navigator clipboard directly", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-shell",
      "src",
      "terminal-clipboard.ts",
    ),
    "utf8",
  );

  assert.doesNotMatch(source, /navigator\.clipboard/);
  assert.doesNotMatch(source, /typeof navigator === "undefined"/);
});


