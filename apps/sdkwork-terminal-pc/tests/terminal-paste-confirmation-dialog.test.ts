import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("terminal paste confirmation dialog is accessible and does not render pasted clipboard content", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-shell",
      "src",
      "terminal-paste-confirmation-dialog.tsx",
    ),
    "utf8",
  );

  assert.match(source, /data-slot="terminal-paste-confirmation"/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby=\{titleId\}/);
  assert.match(source, /aria-describedby=\{detailId\}/);
  assert.match(source, /messages\?: TerminalPasteConfirmationMessages;/);
  assert.match(source, /const messages = props\.messages \?\? terminalPasteConfirmationMessagesEnUS;/);
  assert.match(source, /messages\.description\(\{/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(source, /function handleDialogKeyDown/);
  assert.match(source, /event\.key !== "Tab"/);
  assert.match(source, /\{messages\.cancelActionLabel\}/);
  assert.match(source, /\{messages\.confirmActionLabel\}/);
  assert.match(source, /\{messages\.privacyHint\}/);
  assert.doesNotMatch(source, /props\.text/);
  assert.doesNotMatch(source, /decision\.text/);
});
