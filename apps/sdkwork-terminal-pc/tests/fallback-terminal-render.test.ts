import test from "node:test";
import assert from "node:assert/strict";
import { createFallbackTerminalPromptLine, createFallbackTerminalRenderSnapshot } from "../packages/sdkwork-terminal-shell/src/fallback-terminal-render.ts";

test("fallback prompt line is rendered inline with an inverse cursor cell", () => {
  const promptLine = createFallbackTerminalPromptLine({
    profile: "powershell",
    workingDirectory: "C:\\Users\\admin\\workspace",
    commandText: "codex",
    commandCursor: 2,
    snapshot: {
      viewport: {
        cols: 120,
        rows: 24,
      },
      scrollbackLimit: 512,
      lines: [],
      selection: null,
      selectedText: "",
      searchQuery: "",
      matches: [],
      totalLines: 0,
      visibleLines: [],
    },
  });

  assert.equal(promptLine.kind, "input");
  assert.match(promptLine.text, /^PS C:\\\.\.\.\\admin\\workspace>/);
  assert.match(promptLine.text, /co\u001b\[7md\u001b\[27mex$/);
});

test("fallback render snapshot appends the prompt line into transcript lines", () => {
  const renderSnapshot = createFallbackTerminalRenderSnapshot({
    profile: "bash",
    workingDirectory: "/workspace/sdkwork-terminal",
    commandText: "",
    commandCursor: 0,
    snapshot: {
      viewport: {
        cols: 80,
        rows: 2,
      },
      scrollbackLimit: 512,
      lines: [
        {
          kind: "output",
          text: "line-1",
        },
        {
          kind: "output",
          text: "line-2",
        },
      ],
      selection: null,
      selectedText: "",
      searchQuery: "",
      matches: [],
      totalLines: 2,
      visibleLines: [
        {
          kind: "output",
          text: "line-1",
        },
        {
          kind: "output",
          text: "line-2",
        },
      ],
    },
  });

  assert.equal(renderSnapshot.lines.length, 3);
  assert.equal(renderSnapshot.totalLines, 3);
  assert.equal(renderSnapshot.visibleLines.length, 2);
  assert.equal(renderSnapshot.visibleLines[0]?.text, "line-2");
  assert.match(renderSnapshot.visibleLines[1]?.text ?? "", /^\/workspace\/sdkwork-terminal \$\u001b\[7m \u001b\[27m$/);
});
