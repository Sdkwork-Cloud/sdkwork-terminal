import { spawnSync } from "node:child_process";
import process from "node:process";

function getStepLabel(step) {
  return step.label ?? step.command;
}

export function runCommandStepSync(step, options = {}) {
  const runner = options.runner ?? spawnSync;
  const result = runner(step.command, step.args ?? [], {
    cwd: step.cwd ?? options.cwd,
    env: step.env ?? options.env ?? process.env,
    stdio: step.stdio ?? options.stdio ?? "inherit",
    shell: step.shell ?? options.shell ?? false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    const stderr = options.stderr ?? process.stderr;
    const failurePrefix = options.failurePrefix ?? "run-script-steps";
    stderr.write(
      `[${failurePrefix}] ${getStepLabel(step)} exited with signal ${result.signal}\n`,
    );
    return 1;
  }

  return result.status ?? 0;
}

export function runCommandStepsSync(steps, options = {}) {
  for (const step of steps) {
    if (typeof options.onStepStart === "function") {
      options.onStepStart(step);
    }

    const status = runCommandStepSync(step, options);
    if (status !== 0) {
      return status;
    }
  }

  return 0;
}
