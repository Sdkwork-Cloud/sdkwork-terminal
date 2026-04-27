import test from "node:test";
import assert from "node:assert/strict";

import { runTerminalTaskBestEffort } from "../packages/sdkwork-terminal-shell/src/terminal-async-boundary.ts";

test("terminal async boundary contains rejected promises and reports the cause", async () => {
  const errors: unknown[] = [];
  const unhandledRejections: unknown[] = [];
  const handleUnhandledRejection = (cause: unknown) => {
    unhandledRejections.push(cause);
  };

  process.on("unhandledRejection", handleUnhandledRejection);
  try {
    runTerminalTaskBestEffort(
      async () => {
        throw new Error("async failed");
      },
      (cause) => {
        errors.push(cause);
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(errors.length, 1);
    assert.match(errors[0] instanceof Error ? errors[0].message : "", /async failed/);
    assert.deepEqual(unhandledRejections, []);
  } finally {
    process.off("unhandledRejection", handleUnhandledRejection);
  }
});

test("terminal async boundary contains synchronous throws and reports the cause", () => {
  const errors: unknown[] = [];

  assert.doesNotThrow(() => {
    runTerminalTaskBestEffort(
      () => {
        throw new Error("sync failed");
      },
      (cause) => {
        errors.push(cause);
      },
    );
  });

  assert.equal(errors.length, 1);
  assert.match(errors[0] instanceof Error ? errors[0].message : "", /sync failed/);
});

test("terminal async boundary contains error reporter failures from rejected promises", async () => {
  const unhandledRejections: unknown[] = [];
  const handleUnhandledRejection = (cause: unknown) => {
    unhandledRejections.push(cause);
  };

  process.on("unhandledRejection", handleUnhandledRejection);
  try {
    runTerminalTaskBestEffort(
      async () => {
        throw new Error("async failed");
      },
      () => {
        throw new Error("reporter failed");
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(unhandledRejections, []);
  } finally {
    process.off("unhandledRejection", handleUnhandledRejection);
  }
});

test("terminal async boundary contains error reporter failures from synchronous throws", () => {
  assert.doesNotThrow(() => {
    runTerminalTaskBestEffort(
      () => {
        throw new Error("sync failed");
      },
      () => {
        throw new Error("reporter failed");
      },
    );
  });
});
