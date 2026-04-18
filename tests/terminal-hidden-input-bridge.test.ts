import test from "node:test";
import assert from "node:assert/strict";

import { MAX_TERMINAL_PASTE_LENGTH } from "../packages/sdkwork-terminal-shell/src/terminal-clipboard.ts";
import {
  createTerminalHiddenInputBridge,
  focusTerminalHiddenInput,
  readAndResetTerminalHiddenInputValue,
} from "../packages/sdkwork-terminal-shell/src/terminal-hidden-input-bridge.ts";

test("terminal hidden input helper reads and clears textarea content", () => {
  const target = {
    value: "echo sdkwork",
  } as Pick<HTMLTextAreaElement, "value">;

  assert.equal(readAndResetTerminalHiddenInputValue(target), "echo sdkwork");
  assert.equal(target.value, "");
});

test("terminal hidden input bridge forwards text input and composition payloads once", () => {
  const inputs: string[] = [];
  const handlers = createTerminalHiddenInputBridge({
    onViewportInput(input) {
      inputs.push(input.data);
    },
  });

  const inputTarget = {
    value: "git status",
  } as HTMLTextAreaElement;
  handlers.handleHiddenInput({
    target: inputTarget,
  } as Parameters<typeof handlers.handleHiddenInput>[0]);

  const compositionTarget = {
    value: "中文输入",
  } as HTMLTextAreaElement;
  handlers.handleCompositionEnd({
    target: compositionTarget,
  } as Parameters<typeof handlers.handleCompositionEnd>[0]);

  const emptyTarget = {
    value: "",
  } as HTMLTextAreaElement;
  handlers.handleHiddenInput({
    target: emptyTarget,
  } as Parameters<typeof handlers.handleHiddenInput>[0]);

  assert.deepEqual(inputs, ["git status", "中文输入"]);
  assert.equal(inputTarget.value, "");
  assert.equal(compositionTarget.value, "");
});

test("terminal hidden input bridge clamps oversized textarea payloads to the shared paste limit", () => {
  const inputs: string[] = [];
  const handlers = createTerminalHiddenInputBridge({
    onViewportInput(input) {
      inputs.push(input.data);
    },
  });

  const oversizedTarget = {
    value: "x".repeat(MAX_TERMINAL_PASTE_LENGTH + 128),
  } as HTMLTextAreaElement;
  handlers.handleHiddenInput({
    target: oversizedTarget,
  } as Parameters<typeof handlers.handleHiddenInput>[0]);

  assert.equal(inputs.length, 2);
  assert.equal(inputs[0]?.length, MAX_TERMINAL_PASTE_LENGTH);
  assert.equal(inputs[1]?.length, 128);
  assert.equal(inputs.join(""), "x".repeat(MAX_TERMINAL_PASTE_LENGTH + 128));
  assert.equal(oversizedTarget.value, "");
});

test("terminal hidden input bridge translates control keys into terminal sequences", () => {
  const inputs: string[] = [];
  let prevented = false;
  const handlers = createTerminalHiddenInputBridge({
    onViewportInput(input) {
      inputs.push(input.data);
    },
  });

  handlers.handleHiddenInputKeyDown({
    key: "Enter",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault() {
      prevented = true;
    },
  } as Parameters<typeof handlers.handleHiddenInputKeyDown>[0]);

  assert.equal(prevented, true);
  assert.deepEqual(inputs, ["\r"]);
});

test("terminal hidden input bridge does not translate control keys while IME composition is active", () => {
  const inputs: string[] = [];
  let prevented = false;
  const handlers = createTerminalHiddenInputBridge({
    onViewportInput(input) {
      inputs.push(input.data);
    },
  });

  handlers.handleCompositionStart();
  handlers.handleHiddenInputKeyDown({
    key: "Enter",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    nativeEvent: {
      isComposing: true,
    },
    preventDefault() {
      prevented = true;
    },
  } as Parameters<typeof handlers.handleHiddenInputKeyDown>[0]);
  handlers.handleCompositionEnd({
    target: {
      value: "中文",
    } as HTMLTextAreaElement,
  } as Parameters<typeof handlers.handleCompositionEnd>[0]);

  assert.equal(prevented, false);
  assert.deepEqual(inputs, ["中文"]);
});

test("terminal hidden input bridge ignores keys without terminal translations", () => {
  const inputs: string[] = [];
  let prevented = false;
  const handlers = createTerminalHiddenInputBridge({
    onViewportInput(input) {
      inputs.push(input.data);
    },
  });

  handlers.handleHiddenInputKeyDown({
    key: "x",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault() {
      prevented = true;
    },
  } as Parameters<typeof handlers.handleHiddenInputKeyDown>[0]);

  assert.equal(prevented, false);
  assert.deepEqual(inputs, []);
});

test("terminal hidden input focus helper restores focus to the textarea when available", () => {
  let focusCount = 0;

  focusTerminalHiddenInput({
    focus() {
      focusCount += 1;
    },
  });
  focusTerminalHiddenInput(null);

  assert.equal(focusCount, 1);
});
