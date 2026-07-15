import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveTerminalPasteSafetyDecision,
} from "../packages/sdkwork-terminal-pc-shell/src/terminal-paste-safety.ts";

test("terminal paste safety allows ordinary single-line text without confirmation", () => {
  assert.deepEqual(
    resolveTerminalPasteSafetyDecision("git status --short"),
    {
      kind: "allow",
    },
  );
});

test("terminal paste safety requires confirmation for multiline clipboard text", () => {
  assert.deepEqual(
    resolveTerminalPasteSafetyDecision("echo first\r\necho second\necho third"),
    {
      kind: "confirmation-required",
      reasons: ["multiple-lines"],
      lineCount: 3,
      controlCharacterCount: 0,
    },
  );
});

test("terminal paste safety requires confirmation for terminal control sequences", () => {
  assert.deepEqual(
    resolveTerminalPasteSafetyDecision("printf '\u001b[2J'\t\u009B0m"),
    {
      kind: "confirmation-required",
      reasons: ["control-sequence"],
      lineCount: 1,
      controlCharacterCount: 3,
    },
  );
});

test("terminal paste safety reports multiline and control risks without retaining source text", () => {
  const secretSource = "secret-command\n\u0003";
  const decision = resolveTerminalPasteSafetyDecision(secretSource);

  assert.deepEqual(decision, {
    kind: "confirmation-required",
    reasons: ["multiple-lines", "control-sequence"],
    lineCount: 2,
    controlCharacterCount: 1,
  });
  assert.doesNotMatch(JSON.stringify(decision), /secret-command/);
});
