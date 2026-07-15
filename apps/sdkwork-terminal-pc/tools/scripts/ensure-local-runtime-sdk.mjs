import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "../..");
const localRuntimeSdkRoot = path.join(
  workspaceRoot,
  "sdks",
  "sdkwork-terminal-local-runtime-app-sdk",
  "sdkwork-terminal-local-runtime-app-sdk-typescript",
);

function resolvePnpmCommand(env) {
  const npmExecPath = env.npm_execpath;
  if (typeof npmExecPath === "string" && /(^|[\\/])pnpm(\.cjs)?$/i.test(npmExecPath)) {
    return {
      command: process.execPath,
      args: [npmExecPath, "run", "generate"],
    };
  }

  return {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    args: ["run", "generate"],
  };
}

export function createLocalRuntimeSdkGeneratePlan(options = {}) {
  const env = options.env ?? process.env;
  const command = resolvePnpmCommand(env);

  return {
    label: "local-runtime-sdk-generate",
    ...command,
    cwd: localRuntimeSdkRoot,
    env,
    shell: false,
  };
}

export async function ensureLocalRuntimeSdk(options = {}) {
  const plan = createLocalRuntimeSdkGeneratePlan(options);

  await new Promise((resolve, reject) => {
    const child = spawn(plan.command, plan.args, {
      cwd: plan.cwd,
      env: plan.env,
      stdio: "inherit",
      shell: plan.shell,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Local runtime SDK generation exited with signal ${signal}.`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Local runtime SDK generation exited with code ${code ?? -1}.`));
        return;
      }
      resolve();
    });
  });
}
