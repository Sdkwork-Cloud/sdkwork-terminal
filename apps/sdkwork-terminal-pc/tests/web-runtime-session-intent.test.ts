import test from "node:test";
import assert from "node:assert/strict";
import { applyWebRuntimeSessionIntent } from "../packages/sdkwork-terminal-pc-shell/src/launch-controller.ts";
import {
  createTerminalShellState,
  getTerminalShellSnapshot,
} from "../packages/sdkwork-terminal-pc-shell/src/model.ts";

function createIntent(requestId: string, title: string) {
  return {
    requestId,
    profile: "bash" as const,
    title,
    targetLabel: `/workspace/${title}`,
    request: {
      projectId: `project-${title}`,
      runtimeLocationId: "runtime-location-browser",
      command: ["/bin/bash", "-l"],
      modeTags: ["cli-native" as const],
      tags: ["birdcoder", `title:${title}`],
    },
  };
}

test("web runtime intents preserve the initial tab and append each later request once", () => {
  const firstIntent = createIntent("intent-1", "first");
  let state = createTerminalShellState({
    mode: "web",
    initialTabOptions: {
      profile: firstIntent.profile,
      title: firstIntent.title,
      targetLabel: firstIntent.targetLabel,
      runtimeBootstrap: { kind: "remote-runtime", request: firstIntent.request },
    },
  });
  const handledIntentIdRef = { current: firstIntent.requestId as string | null };
  const applyIntent = (intent: ReturnType<typeof createIntent>) =>
    applyWebRuntimeSessionIntent({
      mode: "web",
      intent,
      activeViewport: { cols: 120, rows: 32 },
      handledIntentIdRef,
      setProfileMenuOpen() {},
      setContextMenu() {},
      updateShellState(update) {
        state = update(state);
      },
    });

  assert.equal(applyIntent(firstIntent), false);
  assert.equal(getTerminalShellSnapshot(state).tabs.length, 1);

  const secondIntent = createIntent("intent-2", "second");
  assert.equal(applyIntent(secondIntent), true);
  assert.equal(getTerminalShellSnapshot(state).tabs.length, 2);
  assert.equal(getTerminalShellSnapshot(state).activeTab.title, "second");

  assert.equal(applyIntent(secondIntent), false);
  assert.equal(getTerminalShellSnapshot(state).tabs.length, 2);
});
