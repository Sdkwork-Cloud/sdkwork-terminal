#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const desktopDir = path.join(rootDir, "apps", "desktop");

export function resolveViteCliEntrypoint() {
  const requireFromDesktop = createRequire(path.join(desktopDir, "package.json"));
  const vitePackageJsonPath = requireFromDesktop.resolve("vite/package.json");
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

export function createViteHostPlan(argv = process.argv.slice(2)) {
  const cliEntrypoint = resolveViteCliEntrypoint();
  const [firstArg, ...restArgs] = argv;
  const command = firstArg && !String(firstArg).startsWith("-") ? firstArg : "serve";
  const forwardedArgs = command === firstArg ? restArgs : argv;

  return {
    command: process.execPath,
    args: [cliEntrypoint, command, ...forwardedArgs],
    cwd: desktopDir,
    env: process.env,
    shell: false,
  };
}

async function run() {
  const plan = createViteHostPlan();
  console.log(
    `[sdkwork-terminal] vite ${plan.args.slice(1).join(" ")} (cwd=${plan.cwd})`,
  );
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
      console.error(`run-vite-host exited with signal ${signal}`);
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
