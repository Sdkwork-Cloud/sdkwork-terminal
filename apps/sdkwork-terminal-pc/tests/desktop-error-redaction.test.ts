import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createDesktopSessionCenterError,
  createDesktopSessionReplayLoadFailure,
  resolveDesktopSessionCenterErrorMessage,
  resolveDesktopSessionReplayStatusMessage,
} from "../packages/sdkwork-terminal-pc-desktop/src/surface/session-center-errors.ts";
import {
  desktopSessionCenterMessagesEnUS,
  desktopSessionCenterMessagesZhCN,
} from "../packages/sdkwork-terminal-pc-desktop/src/i18n/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("desktop lifecycle diagnostics do not log raw host errors in the renderer", () => {
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-desktop",
      "src",
      "surface",
      "App.tsx",
    ),
    "utf8",
  );

  assert.match(source, /function reportDesktopLifecycleTaskFailure\(label: string, error: unknown\)/);
  assert.match(source, /console\.error\(`\[sdkwork-terminal\] \$\{label\} failed`\);/);
  assert.match(source, /console\.warn\("\[sdkwork-terminal\] failed to normalize packaged webview zoom"\);/);
  assert.doesNotMatch(source, /console\.error\([^\n]*,\s*error\)/);
  assert.doesNotMatch(source, /console\.warn\([^\n]*,\s*error\)/);
});

test("desktop session center maps refresh, reattach, and replay failures to safe typed messages", () => {
  const rawBridgeError = "bridge failed at C:\\Users\\admin\\secrets.txt\nstack: runtime-node";
  const replayFailure = createDesktopSessionReplayLoadFailure("session-001");

  for (const messages of [
    desktopSessionCenterMessagesEnUS,
    desktopSessionCenterMessagesZhCN,
  ]) {
    assert.deepEqual(
      Object.keys(messages.errors).sort(),
      ["reattach", "refresh", "replay-load"],
    );
    assert.ok(messages.replayDeferred.length > 0);
  }

  assert.deepEqual(replayFailure, {
    sessionId: "session-001",
    error: "replay-load",
    reason: "error",
  });
  assert.doesNotMatch(replayFailure.error, /Users|secrets|stack|runtime-node/);
  assert.equal(
    resolveDesktopSessionCenterErrorMessage(
      createDesktopSessionCenterError("refresh"),
      desktopSessionCenterMessagesEnUS,
    ),
    "Session Center could not be refreshed. Try again.",
  );
  assert.equal(
    resolveDesktopSessionCenterErrorMessage(
      createDesktopSessionCenterError("reattach"),
      desktopSessionCenterMessagesZhCN,
    ),
    "无法重新连接此会话，请重试。",
  );
  assert.equal(
    resolveDesktopSessionReplayStatusMessage(
      {
        state: "unavailable",
        summary: rawBridgeError,
        fromCursor: null,
        nextCursor: null,
        hasMore: false,
        entryCount: 0,
        firstSequence: null,
        lastSequence: null,
        error: rawBridgeError,
      },
      desktopSessionCenterMessagesEnUS,
    ),
    "Replay history is currently unavailable. Refresh to try again.",
  );
  assert.equal(
    resolveDesktopSessionReplayStatusMessage(
      {
        state: "deferred",
        summary: rawBridgeError,
        fromCursor: null,
        nextCursor: null,
        hasMore: false,
        entryCount: 0,
        firstSequence: null,
        lastSequence: null,
        error: rawBridgeError,
      },
      desktopSessionCenterMessagesZhCN,
    ),
    "回放记录已延后加载；可选择加载更多回放记录。",
  );
});

test("desktop session center renderer does not consume raw bridge failure details", () => {
  const loaderSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-desktop",
      "src",
      "surface",
      "session-center.ts",
    ),
    "utf8",
  );
  const overlaySource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-desktop",
      "src",
      "surface",
      "DesktopSessionCenterOverlay.tsx",
    ),
    "utf8",
  );
  const appSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-desktop",
      "src",
      "surface",
      "App.tsx",
    ),
    "utf8",
  );

  assert.match(loaderSource, /createDesktopSessionReplayLoadFailure\(session\.sessionId\)/);
  assert.doesNotMatch(loaderSource, /getErrorMessage\(|error\.message|String\(error\)/);
  assert.match(
    overlaySource,
    /resolveDesktopSessionCenterErrorMessage\(props\.error, props\.messages\)/,
  );
  assert.match(
    overlaySource,
    /resolveDesktopSessionReplayStatusMessage\(\s*session\.replayStatus,\s*props\.messages,/,
  );
  assert.doesNotMatch(overlaySource, /Session Center load failed: \{props\.error\}/);
  assert.match(appSource, /sessionCenterMessages\?: DesktopSessionCenterMessages;/);
  assert.match(
    appSource,
    /createDesktopSessionCenterError\(action === "load-more" \? "replay-load" : "refresh"\)/,
  );
  assert.match(appSource, /createDesktopSessionCenterError\("reattach"\)/);
});
