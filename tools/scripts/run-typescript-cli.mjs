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

function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) {
      args._.push(current);
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function resolveTsconfigPath(project) {
  if (typeof project !== "string" || project.trim().length === 0) {
    throw new Error("--project is required");
  }

  return path.resolve(rootDir, project);
}

function resolveTypescriptCli(projectPath) {
  const packageDir = path.dirname(projectPath);
  const requireFromProject = createRequire(path.join(packageDir, "package.json"));
  const typescriptPackageJsonPath = requireFromProject.resolve("typescript/package.json");
  const typescriptPackageJson = JSON.parse(
    fs.readFileSync(typescriptPackageJsonPath, "utf8"),
  );
  const binRelativePath =
    typeof typescriptPackageJson.bin === "string"
      ? typescriptPackageJson.bin
      : typescriptPackageJson.bin?.tsc;

  if (!binRelativePath) {
    throw new Error(`Unable to resolve tsc bin from ${typescriptPackageJsonPath}`);
  }

  return path.resolve(path.dirname(typescriptPackageJsonPath), binRelativePath);
}

export function createTypescriptCliPlan(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const projectPath = resolveTsconfigPath(args.project);
  const cliEntrypoint = resolveTypescriptCli(projectPath);
  const forwardedArgs = ["--project", projectPath, ...args._];

  return {
    command: process.execPath,
    args: [cliEntrypoint, ...forwardedArgs],
    cwd: rootDir,
    env: process.env,
    shell: false,
  };
}

function run() {
  const plan = createTypescriptCliPlan();
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
      console.error(`run-typescript-cli exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  run();
}
