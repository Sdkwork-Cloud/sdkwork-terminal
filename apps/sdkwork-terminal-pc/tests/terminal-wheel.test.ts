import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeTerminalWheelDeltaToLines,
  resolveAlternateBufferWheelInput,
  shouldUseAlternateBufferWheelInput,
  type TerminalViewportRuntimeState,
} from "../packages/sdkwork-terminal-infrastructure/src/index.ts";

const ALTERNATE_BUFFER_STATE: TerminalViewportRuntimeState = {
  activeBufferType: "alternate",
  mouseTrackingMode: "none",
};

test("alternate buffer wheel bridge only activates when mouse reporting is disabled", () => {
  assert.equal(
    shouldUseAlternateBufferWheelInput(ALTERNATE_BUFFER_STATE),
    true,
  );
  assert.equal(
    shouldUseAlternateBufferWheelInput({
      activeBufferType: "alternate",
      mouseTrackingMode: "any",
    }),
    false,
  );
  assert.equal(
    shouldUseAlternateBufferWheelInput({
      activeBufferType: "normal",
      mouseTrackingMode: "none",
    }),
    false,
  );
});

test("alternate buffer wheel bridge accumulates pixel deltas before emitting arrow input", () => {
  const first = resolveAlternateBufferWheelInput({
    runtimeState: ALTERNATE_BUFFER_STATE,
    deltaY: 20,
    deltaMode: 0,
    viewportRows: 32,
    wheelAccumulator: 0,
  });

  assert.deepEqual(first, {
    sequence: "",
    wheelAccumulator: 0.5,
  });

  const second = resolveAlternateBufferWheelInput({
    runtimeState: ALTERNATE_BUFFER_STATE,
    deltaY: 20,
    deltaMode: 0,
    viewportRows: 32,
    wheelAccumulator: first.wheelAccumulator,
  });

  assert.deepEqual(second, {
    sequence: "\u001b[B".repeat(3),
    wheelAccumulator: 0,
  });
});

test("alternate buffer wheel bridge maps negative line deltas to upward navigation", () => {
  const resolution = resolveAlternateBufferWheelInput({
    runtimeState: ALTERNATE_BUFFER_STATE,
    deltaY: -2,
    deltaMode: 1,
    viewportRows: 32,
    wheelAccumulator: 0,
  });

  assert.deepEqual(resolution, {
    sequence: "\u001b[A".repeat(6),
    wheelAccumulator: 0,
  });
});

test("alternate buffer wheel bridge resets when mouse reporting or normal scrollback should own the wheel", () => {
  const resolution = resolveAlternateBufferWheelInput({
    runtimeState: {
      activeBufferType: "alternate",
      mouseTrackingMode: "drag",
    },
    deltaY: 120,
    deltaMode: 0,
    viewportRows: 32,
    wheelAccumulator: 0.75,
  });

  assert.deepEqual(resolution, {
    sequence: "",
    wheelAccumulator: 0,
  });
});

test("alternate buffer wheel bridge scales page deltas and caps oversized bursts", () => {
  const pageDelta = normalizeTerminalWheelDeltaToLines({
    deltaY: 1,
    deltaMode: 2,
    viewportRows: 24,
  });
  assert.equal(pageDelta, 24);

  const resolution = resolveAlternateBufferWheelInput({
    runtimeState: ALTERNATE_BUFFER_STATE,
    deltaY: 1,
    deltaMode: 2,
    viewportRows: 24,
    wheelAccumulator: 0,
  });

  assert.deepEqual(resolution, {
    sequence: "\u001b[B".repeat(48),
    wheelAccumulator: 0,
  });
});
