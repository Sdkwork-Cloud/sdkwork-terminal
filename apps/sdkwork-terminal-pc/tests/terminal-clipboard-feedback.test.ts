import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveTerminalClipboardFeedbackKind,
} from "../packages/sdkwork-terminal-pc-shell/src/terminal-clipboard-feedback.ts";
import {
  terminalClipboardFeedbackMessagesEnUS,
  terminalClipboardFeedbackMessagesZhCN,
} from "../packages/sdkwork-terminal-pc-shell/src/i18n/index.ts";

test("terminal clipboard feedback maps typed outcomes without carrying clipboard content", () => {
  assert.equal(
    resolveTerminalClipboardFeedbackKind({ operation: "copy", outcome: "success" }),
    "copy-success",
  );
  assert.equal(
    resolveTerminalClipboardFeedbackKind({ operation: "paste", outcome: "success" }),
    null,
  );
  assert.equal(
    resolveTerminalClipboardFeedbackKind({ operation: "copy", outcome: "empty" }),
    "copy-empty",
  );
  assert.equal(
    resolveTerminalClipboardFeedbackKind({ operation: "paste", outcome: "empty" }),
    "paste-empty",
  );
  assert.equal(
    resolveTerminalClipboardFeedbackKind({ operation: "paste", outcome: "unavailable" }),
    "unavailable",
  );
  assert.equal(
    resolveTerminalClipboardFeedbackKind({ operation: "copy", outcome: "denied" }),
    "denied",
  );
  assert.equal(
    resolveTerminalClipboardFeedbackKind({ operation: "paste", outcome: "failed" }),
    "failed",
  );
});

test("terminal clipboard feedback catalogs provide complete localized safe copy", () => {
  const keys = [
    "copy-success",
    "copy-empty",
    "paste-empty",
    "unavailable",
    "denied",
    "failed",
  ] as const;

  for (const key of keys) {
    assert.equal(terminalClipboardFeedbackMessagesEnUS[key].trim().length > 0, true);
    assert.equal(terminalClipboardFeedbackMessagesZhCN[key].trim().length > 0, true);
  }
});

test("terminal clipboard feedback notice is a polite root live region and never renders raw outcomes", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-shell",
      "src",
      "terminal-clipboard-feedback-notice.tsx",
    ),
    "utf8",
  );

  assert.match(source, /data-slot="terminal-clipboard-feedback"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-atomic="true"/);
  assert.match(source, /pointerEvents: "none"/);
  assert.match(source, /TERMINAL_CLIPBOARD_FEEDBACK_DURATION_MS/);
  assert.doesNotMatch(source, /outcome\.text/);
  assert.doesNotMatch(source, /cause\b/);
  assert.doesNotMatch(source, /stack\b/);
});
