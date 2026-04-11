import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  appendTerminalInput,
  appendTerminalOutput,
  copyTerminalSelection,
  createTerminalCoreState,
  getTerminalSnapshot,
  resizeTerminalViewport,
  searchTerminal,
  selectTerminalRange,
} from "../packages/sdkwork-terminal-core/src/index.ts";
import {
  createTerminalViewAdapter,
  createXtermViewportDriver,
} from "../packages/sdkwork-terminal-infrastructure/src/index.ts";
import {
  createWorkbenchTerminalStage,
} from "../packages/sdkwork-terminal-workbench/src/model.ts";

test("terminal core maintains visible lines, search matches and copyable selection", () => {
  let state = createTerminalCoreState({
    viewport: { cols: 80, rows: 3 },
    scrollbackLimit: 6,
  });

  state = appendTerminalOutput(
    state,
    "server ready\nsession resumed\ncodex attached\nsearch markers",
  );
  state = appendTerminalInput(state, "help");
  state = resizeTerminalViewport(state, { cols: 132, rows: 4 });
  state = searchTerminal(state, "session");
  state = selectTerminalRange(state, {
    startLine: 1,
    startColumn: 0,
    endLine: 1,
    endColumn: 7,
  });

  const snapshot = getTerminalSnapshot(state);

  assert.equal(snapshot.viewport.cols, 132);
  assert.equal(snapshot.totalLines, 5);
  assert.equal(snapshot.visibleLines.length, 4);
  assert.equal(snapshot.matches.length, 1);
  assert.equal(snapshot.matches[0]?.text, "session");
  assert.equal(copyTerminalSelection(state), "session");
});

test("terminal core reuses snapshot references for an unchanged state object", () => {
  let state = createTerminalCoreState({
    viewport: { cols: 80, rows: 3 },
    scrollbackLimit: 6,
  });

  state = appendTerminalOutput(state, "server ready\nsession resumed");

  const firstSnapshot = getTerminalSnapshot(state);
  const secondSnapshot = getTerminalSnapshot(state);

  assert.equal(firstSnapshot, secondSnapshot);
  assert.equal(firstSnapshot.visibleLines, secondSnapshot.visibleLines);

  const nextState = appendTerminalInput(state, "help");
  const thirdSnapshot = getTerminalSnapshot(nextState);

  assert.notEqual(firstSnapshot, thirdSnapshot);
});

test("terminal view adapter exposes a stable workbench-facing contract", () => {
  const adapter = createTerminalViewAdapter({
    viewport: { cols: 96, rows: 4 },
    scrollbackLimit: 5,
  });

  adapter.writeOutput("attach ready\nselection ready");
  adapter.writeInput("help");
  adapter.resize({ cols: 120, rows: 4 });
  adapter.search("selection");
  const selected = adapter.select({
    startLine: 1,
    startColumn: 0,
    endLine: 1,
    endColumn: 9,
  });
  const snapshot = adapter.getSnapshot();
  const driver = createXtermViewportDriver();

  assert.equal(snapshot.viewport.cols, 120);
  assert.equal(snapshot.matches[0]?.text, "selection");
  assert.equal(selected.selectedText, "selection");
  assert.equal(adapter.copySelection(), "selection");
  assert.equal(driver.kind, "xterm-view-adapter");
  assert.equal(typeof driver.setInputListener, "function");
  assert.equal(typeof driver.focus, "function");
  assert.equal(typeof driver.measureViewport, "function");
});

test("terminal view adapter keeps the newest transcript slice under large output bursts", () => {
  const adapter = createTerminalViewAdapter({
    viewport: { cols: 120, rows: 5 },
    scrollbackLimit: 128,
  });
  const burst = Array.from({ length: 80 }, (_, index) => `line-${index + 1}`).join("\n");

  const snapshot = adapter.writeOutput(burst);

  assert.equal(snapshot.totalLines, 80);
  assert.deepEqual(
    snapshot.visibleLines.map((line) => line.text),
    ["line-76", "line-77", "line-78", "line-79", "line-80"],
  );
});

test("workbench stage model exposes terminal controls and transcript summary", () => {
  const stage = createWorkbenchTerminalStage();
  const html = renderToStaticMarkup(
    React.createElement(
      "section",
      null,
      React.createElement("h2", null, stage.title),
      React.createElement("p", null, stage.summary),
      ...stage.actions.map((action) =>
        React.createElement("button", { key: action.id }, action.label),
      ),
    ),
  );

  assert.match(html, /Terminal Stage/);
  assert.match(html, /Search transcript/);
  assert.match(html, /Run help/);
  assert.match(html, /Resize 132x32/);
});

test("workbench panel lazily initializes stage and xterm driver refs", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-workbench", "src", "index.tsx"),
    "utf8",
  );

  assert.match(source, /const stageRef = useRef<ReturnType<typeof createWorkbenchTerminalStage> \| null>\(null\);/);
  assert.match(source, /if \(!stageRef\.current\) \{\s*stageRef\.current = createWorkbenchTerminalStage\(\);\s*\}/);
  assert.match(source, /const xtermDriverRef = useRef<ReturnType<typeof createXtermViewportDriver> \| null>\(null\);/);
  assert.match(source, /if \(!xtermDriverRef\.current\) \{\s*xtermDriverRef\.current = createXtermViewportDriver\(\);\s*\}/);
  assert.match(source, /const stage = stageRef\.current;/);
  assert.match(source, /const xtermDriver = xtermDriverRef\.current;/);
  assert.doesNotMatch(source, /const stageRef = useRef\(createWorkbenchTerminalStage\(\)\);/);
  assert.doesNotMatch(source, /const xtermDriverRef = useRef\(createXtermViewportDriver\(\)\);/);
});
