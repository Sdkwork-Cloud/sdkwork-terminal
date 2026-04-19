import test from "node:test";
import assert from "node:assert/strict";

import { createTerminalViewportRenderPlan } from "../packages/sdkwork-terminal-infrastructure/src/index.ts";

function createSnapshot(overrides: Partial<{
  lines: Array<{ text: string }>;
  visibleLines: Array<{ text: string }>;
  viewport: { cols: number; rows: number };
  searchQuery: string;
}> = {}) {
  return {
    lines: [
      { text: "PowerShell ready" },
      { text: "line 2" },
      { text: "line 3" },
      { text: "PS sdkwork-terminal>" },
    ],
    visibleLines: [{ text: "PowerShell ready" }, { text: "PS sdkwork-terminal>" }],
    viewport: { cols: 120, rows: 32 },
    searchQuery: "",
    ...overrides,
  };
}

test("terminal viewport render plan treats identical snapshots as a no-op", () => {
  const snapshot = createSnapshot();

  const firstPlan = createTerminalViewportRenderPlan(null, snapshot);
  const repeatedPlan = createTerminalViewportRenderPlan(snapshot, snapshot);

  assert.equal(firstPlan.shouldResize, true);
  assert.equal(firstPlan.shouldRefresh, true);
  assert.equal(firstPlan.shouldSearch, false);
  assert.equal(firstPlan.content, "PowerShell ready\r\nline 2\r\nline 3\r\nPS sdkwork-terminal>");

  assert.equal(repeatedPlan.shouldResize, false);
  assert.equal(repeatedPlan.shouldRefresh, false);
  assert.equal(repeatedPlan.shouldSearch, false);
  assert.equal(repeatedPlan.content, "");
});

test("terminal viewport render plan isolates search-only and viewport-change updates", () => {
  const baseline = createSnapshot();
  const searchSnapshot = createSnapshot({ searchQuery: "sdkwork" });
  const resizedSnapshot = createSnapshot({ viewport: { cols: 132, rows: 40 } });

  const searchPlan = createTerminalViewportRenderPlan(baseline, searchSnapshot);
  const resizedPlan = createTerminalViewportRenderPlan(baseline, resizedSnapshot);

  assert.equal(searchPlan.shouldResize, false);
  assert.equal(searchPlan.shouldRefresh, false);
  assert.equal(searchPlan.shouldSearch, true);
  assert.equal(searchPlan.searchQuery, "sdkwork");

  assert.equal(resizedPlan.shouldResize, true);
  assert.equal(resizedPlan.shouldRefresh, true);
  assert.equal(resizedPlan.shouldSearch, false);
  assert.equal(resizedPlan.viewport.cols, 132);
});

test("terminal viewport render plan preserves scrollback beyond the visible viewport", () => {
  const snapshot = createSnapshot({
    viewport: { cols: 120, rows: 2 },
    visibleLines: [{ text: "line 3" }, { text: "PS sdkwork-terminal>" }],
  });

  const plan = createTerminalViewportRenderPlan(null, snapshot);

  assert.equal(plan.shouldRefresh, true);
  assert.equal(
    plan.content,
    "PowerShell ready\r\nline 2\r\nline 3\r\nPS sdkwork-terminal>",
  );
});
