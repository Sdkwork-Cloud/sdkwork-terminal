import test from "node:test";
import assert from "node:assert/strict";

import {
  createRuntimeTabControllerStore,
} from "../packages/sdkwork-terminal-shell/src/runtime-tab-controller-store.ts";
import type { RuntimeTabController } from "../packages/sdkwork-terminal-shell/src/runtime-tab-controller.ts";

function createFakeController() {
  let disposeCount = 0;

  const controller: RuntimeTabController = {
    async attachHost() {},
    async detachHost() {},
    setCallbacks() {},
    async bindSession() {},
    async applyReplay() {},
    async clearSession() {},
    async search() {},
    async paste() {},
    async getSelection() {
      return "";
    },
    async selectAll() {},
    async measureViewport() {
      return null;
    },
    async focus() {},
    setFontSize() {},
    setDisableStdin() {},
    setCursorVisible() {},
    async dispose() {
      disposeCount += 1;
    },
  };

  return {
    controller,
    get disposeCount() {
      return disposeCount;
    },
  };
}

test("runtime tab controller store reuses the same controller for one tab id", () => {
  let createCount = 0;
  const store = createRuntimeTabControllerStore({
    createController: () => {
      createCount += 1;
      return createFakeController().controller;
    },
  });

  const first = store.getOrCreate("tab-001");
  const second = store.getOrCreate("tab-001");

  assert.equal(first, second);
  assert.equal(createCount, 1);
});

test("runtime tab controller store disposes removed controllers during tab sync", async () => {
  const controllers = [createFakeController(), createFakeController()];
  let createIndex = 0;
  const store = createRuntimeTabControllerStore({
    createController: () => {
      const nextController = controllers[createIndex];
      createIndex += 1;
      return nextController.controller;
    },
  });

  store.getOrCreate("tab-001");
  store.getOrCreate("tab-002");

  await store.syncTabs(["tab-002"]);

  assert.equal(controllers[0]?.disposeCount, 1);
  assert.equal(controllers[1]?.disposeCount, 0);
});

test("runtime tab controller store disposes all controllers on shutdown", async () => {
  const controllers = [createFakeController(), createFakeController()];
  let createIndex = 0;
  const store = createRuntimeTabControllerStore({
    createController: () => {
      const nextController = controllers[createIndex];
      createIndex += 1;
      return nextController.controller;
    },
  });

  store.getOrCreate("tab-001");
  store.getOrCreate("tab-002");

  await store.disposeAll();

  assert.equal(controllers[0]?.disposeCount, 1);
  assert.equal(controllers[1]?.disposeCount, 1);
});
