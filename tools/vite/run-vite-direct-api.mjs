import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function resolveViteApiEntrypoint(packageDir) {
  const requireFromPackage = createRequire(path.join(packageDir, "package.json"));
  const vitePackageJsonPath = requireFromPackage.resolve("vite/package.json");
  const vitePackageJson = JSON.parse(readFileSync(vitePackageJsonPath, "utf8"));
  return path.resolve(path.dirname(vitePackageJsonPath), vitePackageJson.main);
}

function readOptionValue(argv, index, flag) {
  const next = argv[index + 1];
  if (next === undefined || String(next).startsWith("-")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return String(next);
}

function parseViteArgs(argv = [], command = "serve") {
  const config = {};
  const server = {};
  const build = {};
  let mode = command === "build" ? "production" : "development";
  let root = "";

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index]);

    if (token === "--host") {
      server.host = readOptionValue(argv, index, "--host");
      index += 1;
      continue;
    }
    if (token.startsWith("--host=")) {
      server.host = token.slice("--host=".length);
      continue;
    }

    if (token === "--port") {
      server.port = Number.parseInt(readOptionValue(argv, index, "--port"), 10);
      index += 1;
      continue;
    }
    if (token.startsWith("--port=")) {
      server.port = Number.parseInt(token.slice("--port=".length), 10);
      continue;
    }

    if (token === "--strictPort") {
      server.strictPort = true;
      continue;
    }

    if (token === "--mode") {
      mode = readOptionValue(argv, index, "--mode");
      index += 1;
      continue;
    }
    if (token.startsWith("--mode=")) {
      mode = token.slice("--mode=".length);
      continue;
    }

    if (token === "--base") {
      config.base = readOptionValue(argv, index, "--base");
      index += 1;
      continue;
    }
    if (token.startsWith("--base=")) {
      config.base = token.slice("--base=".length);
      continue;
    }

    if (token === "--outDir") {
      build.outDir = readOptionValue(argv, index, "--outDir");
      index += 1;
      continue;
    }
    if (token.startsWith("--outDir=")) {
      build.outDir = token.slice("--outDir=".length);
      continue;
    }

    if (!token.startsWith("-") && !root) {
      root = token;
    }
  }

  if (Object.keys(server).length > 0) {
    config.server = server;
  }
  if (Object.keys(build).length > 0) {
    config.build = build;
  }

  return {
    config,
    mode,
    root,
  };
}

async function loadUserConfig(configFile, configEnv) {
  const configModule = await import(pathToFileURL(configFile).href);
  const configExport = configModule.default ?? configModule;

  if (typeof configExport === "function") {
    return await configExport(configEnv);
  }

  return configExport;
}

export async function runViteDirectApi(plan) {
  const vite = await import(pathToFileURL(resolveViteApiEntrypoint(plan.cwd)).href);
  const parsedArgs = parseViteArgs(plan.viteArgs, plan.viteCommand);
  const configEnv = {
    command: plan.viteCommand,
    mode: parsedArgs.mode,
    isSsrBuild: false,
    isPreview: false,
    env: plan.env,
  };
  const userConfig = await loadUserConfig(plan.configFile, configEnv);
  const root = parsedArgs.root ? path.resolve(plan.cwd, parsedArgs.root) : plan.cwd;
  const baseConfig = {
    root,
    mode: parsedArgs.mode,
    configFile: false,
  };
  const inlineConfig = vite.mergeConfig(
    vite.mergeConfig(baseConfig, userConfig),
    parsedArgs.config,
  );

  if (plan.viteCommand === "build") {
    await vite.build(inlineConfig);
    return;
  }

  if (plan.viteCommand === "serve") {
    const server = await vite.createServer(inlineConfig);
    await server.listen();
    server.printUrls();
    return;
  }

  throw new Error(`Unsupported Vite command for direct API runner: ${plan.viteCommand}`);
}
