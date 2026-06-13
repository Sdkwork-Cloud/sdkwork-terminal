import test from "node:test";
import assert from "node:assert/strict";

import { runCommandStepsSync } from "../tools/scripts/run-script-steps.mjs";

test("script step runner applies standard sync process defaults", () => {
  const calls = [];
  const status = runCommandStepsSync(
    [
      {
        label: "custom",
        command: "node",
        args: ["custom.mjs"],
        cwd: "D:\\custom",
        env: { CUSTOM: "1" },
        shell: true,
      },
      {
        label: "defaulted",
        command: "cargo",
        args: ["test"],
      },
    ],
    {
      cwd: "D:\\workspace\\sdkwork-terminal",
      env: { ROOT: "1" },
      runner(command, args, options) {
        calls.push({ command, args, options });
        return { status: 0 };
      },
    },
  );

  assert.equal(status, 0);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], {
    command: "node",
    args: ["custom.mjs"],
    options: {
      cwd: "D:\\custom",
      env: { CUSTOM: "1" },
      stdio: "inherit",
      shell: true,
    },
  });
  assert.deepEqual(calls[1], {
    command: "cargo",
    args: ["test"],
    options: {
      cwd: "D:\\workspace\\sdkwork-terminal",
      env: { ROOT: "1" },
      stdio: "inherit",
      shell: false,
    },
  });
});

test("script step runner stops on the first non-zero status", () => {
  const calls = [];
  const status = runCommandStepsSync(
    [
      { label: "first", command: "node", args: ["first.mjs"] },
      { label: "second", command: "node", args: ["second.mjs"] },
    ],
    {
      runner(command) {
        calls.push(command);
        return { status: 7 };
      },
    },
  );

  assert.equal(status, 7);
  assert.deepEqual(calls, ["node"]);
});

test("script step runner reports signal exits with the configured prefix", () => {
  let stderr = "";
  const status = runCommandStepsSync(
    [{ label: "workspace-tests", command: "node", args: ["tests.mjs"] }],
    {
      failurePrefix: "run-full-verification",
      runner() {
        return { signal: "SIGTERM" };
      },
      stderr: {
        write(message) {
          stderr += message;
        },
      },
    },
  );

  assert.equal(status, 1);
  assert.match(
    stderr,
    /\[run-full-verification\] workspace-tests exited with signal SIGTERM/,
  );
});

test("script step runner rethrows spawn errors", () => {
  const error = new Error("spawn failed");

  assert.throws(
    () =>
      runCommandStepsSync([{ label: "first", command: "node", args: [] }], {
        runner() {
          return { error };
        },
      }),
    /spawn failed/,
  );
});
