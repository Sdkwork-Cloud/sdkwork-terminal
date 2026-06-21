#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createViteChildProcessEnv } from "../vite/sdkwork-vite-compat.mjs";
import { runViteDirectApi } from "../vite/run-vite-direct-api.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const webConfigFile = path.join(rootDir, "vite.config.web.mjs");

export function resolveWebViteCliEntrypoint() {
  const requireFromRoot = createRequire(path.join(rootDir, "package.json"));
  const vitePackageJsonPath = requireFromRoot.resolve("vite/package.json");
  const vitePackageJson = JSON.parse(fs.readFileSync(vitePackageJsonPath, "utf8"));
  const binRelativePath =
    typeof vitePackageJson.bin === "string"
      ? vitePackageJson.bin
      : vitePackageJson.bin?.vite;

  if (!binRelativePath) {
    throw new Error(`Unable to resolve vite bin from ${vitePackageJsonPath}`);
  }

  return path.resolve(path.dirname(vitePackageJsonPath), binRelativePath);
}

export function createWebVitePlan(argv = process.argv.slice(2), options = {}) {
  const cliEntrypoint = resolveWebViteCliEntrypoint();
  const [firstArg, ...restArgs] = argv;
  const command = firstArg && !String(firstArg).startsWith("-") ? firstArg : "serve";
  const forwardedArgs = command === firstArg ? restArgs : argv;
  const env = createViteChildProcessEnv({
    env: options.env ?? process.env,
    pipeChildProcessSupported: options.pipeChildProcessSupported,
  });

  return {
    command: process.execPath,
    args: [cliEntrypoint, command, "--config", webConfigFile, ...forwardedArgs],
    cwd: rootDir,
    env,
    shell: false,
    configFile: webConfigFile,
    viteCommand: command,
    viteArgs: forwardedArgs,
    useDirectViteApi: env.SDKWORK_TERMINAL_VITE_NO_PIPE_CHILDREN === "1",
  };
}

async function run() {
  const plan = createWebVitePlan();
  if (plan.useDirectViteApi) {
    await runViteDirectApi(plan);
    return;
  }

  const child = spawn(plan.command, plan.args, {
    cwd: plan.cwd,
    env: plan.env,
    stdio: "inherit",
    shell: plan.shell,
  });

  child.on("error", (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`run-web-vite exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
