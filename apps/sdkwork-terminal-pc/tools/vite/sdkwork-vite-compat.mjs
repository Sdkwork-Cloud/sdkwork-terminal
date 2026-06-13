import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export const SDKWORK_VITE_NO_PIPE_CHILDREN_ENV = "SDKWORK_TERMINAL_VITE_NO_PIPE_CHILDREN";
export const SDKWORK_VITE_TYPESCRIPT_ROOT_ENV = "SDKWORK_TERMINAL_VITE_TYPESCRIPT_ROOT";

const sourceFilePattern = /\.[cm]?[jt]sx?$/;
const typeDeclarationPattern = /\.d\.[cm]?ts$/;

function cleanId(id) {
  return String(id ?? "").split("?")[0].replace(/\\/g, "/");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceExpression(source, expression, replacement) {
  return source.replace(
    new RegExp(`\\b${escapeRegExp(expression)}\\b`, "g"),
    replacement,
  );
}

function serialize(value) {
  return JSON.stringify(value);
}

export function canSpawnPipedChildProcess({
  command = process.execPath,
  spawnSyncImpl = spawnSync,
} = {}) {
  try {
    const result = spawnSyncImpl(command, ["-e", ""], {
      encoding: "utf8",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    return !result.error && !result.signal && (result.status ?? 0) === 0;
  } catch {
    return false;
  }
}

export function createViteChildProcessEnv({
  env = process.env,
  pipeChildProcessSupported = canSpawnPipedChildProcess(),
} = {}) {
  if (pipeChildProcessSupported) {
    return env;
  }

  return {
    ...env,
    [SDKWORK_VITE_NO_PIPE_CHILDREN_ENV]: "1",
  };
}

export function shouldUsePipeSafeVite(env = process.env) {
  return env[SDKWORK_VITE_NO_PIPE_CHILDREN_ENV] === "1";
}

function createImportMetaEnv(config) {
  return {
    ...config.env,
    BASE_URL: config.base,
    MODE: config.mode,
    DEV: !config.isProduction,
    PROD: config.isProduction,
    SSR: false,
  };
}

function applyDefineBypass(code, config, env) {
  const nodeEnv = serialize(env.NODE_ENV || config.mode);
  const importMetaEnv = createImportMetaEnv(config);
  let next = code;

  for (const expression of [
    "globalThis.process.env.NODE_ENV",
    "global.process.env.NODE_ENV",
    "process.env.NODE_ENV",
  ]) {
    next = replaceExpression(next, expression, nodeEnv);
  }

  for (const expression of [
    "globalThis.process.env",
    "global.process.env",
    "process.env",
  ]) {
    next = replaceExpression(next, expression, "({})");
  }

  const importMetaEntries = Object.entries(importMetaEnv).sort(
    ([left], [right]) => right.length - left.length,
  );
  for (const [key, value] of importMetaEntries) {
    next = replaceExpression(next, `import.meta.env.${key}`, serialize(value));
  }

  next = replaceExpression(next, "import.meta.hot", "undefined");
  next = replaceExpression(next, "import.meta.env", serialize(importMetaEnv));

  return next;
}

export function createViteDefineBypassPlugin({ env = process.env } = {}) {
  let resolvedConfig;

  return {
    name: "sdkwork:vite-define-bypass",
    enforce: "pre",
    configResolved(config) {
      resolvedConfig = config;
    },
    transform(code, id) {
      const filePath = cleanId(id);
      if (!sourceFilePattern.test(filePath)) {
        return null;
      }

      const next = applyDefineBypass(code, resolvedConfig, env);
      if (next === code) {
        return null;
      }

      return {
        code: next,
        map: null,
      };
    },
  };
}

function loadTypeScript(projectRoot, env = process.env) {
  const candidates = [
    projectRoot,
    env[SDKWORK_VITE_TYPESCRIPT_ROOT_ENV],
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);

  for (const candidate of candidates) {
    try {
      const requireFromProject = createRequire(path.join(candidate, "package.json"));
      return requireFromProject("typescript");
    } catch {
      // Try the next configured resolution root.
    }
  }

  throw new Error(`Cannot find module 'typescript' from Vite roots: ${candidates.join(", ")}`);
}

function createRequireCandidates(projectRoot, env = process.env) {
  return [
    projectRoot,
    env[SDKWORK_VITE_TYPESCRIPT_ROOT_ENV],
    process.cwd(),
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);
}

function resolvePackageJson(packageName, candidates) {
  for (const candidate of candidates) {
    try {
      const requireFromCandidate = createRequire(path.join(candidate, "package.json"));
      return requireFromCandidate.resolve(`${packageName}/package.json`);
    } catch {
      // Try the next configured resolution root.
    }
  }

  return "";
}

function createRequireFromRealPackage(packageJsonPath) {
  return createRequire(fs.realpathSync(packageJsonPath));
}

export function createReactDomSchedulerResolvePlugin({ env = process.env } = {}) {
  let projectRoot = process.cwd();
  let requireFromReactDom;

  function resolveScheduler(source) {
    if (!requireFromReactDom) {
      const reactDomPackageJsonPath = resolvePackageJson(
        "react-dom",
        createRequireCandidates(projectRoot, env),
      );
      if (!reactDomPackageJsonPath) {
        return null;
      }

      requireFromReactDom = createRequireFromRealPackage(reactDomPackageJsonPath);
    }

    try {
      return requireFromReactDom.resolve(source);
    } catch {
      return null;
    }
  }

  return {
    name: "sdkwork:react-dom-scheduler-resolve",
    enforce: "pre",
    configResolved(config) {
      projectRoot = config.root;
    },
    resolveId(source) {
      if (source !== "scheduler" && !source.startsWith("scheduler/")) {
        return null;
      }

      return resolveScheduler(source);
    },
  };
}

export function createTypeScriptTranspilePlugin({ env = process.env } = {}) {
  let projectRoot = process.cwd();
  let ts;

  return {
    name: "sdkwork:typescript-transpile",
    enforce: "pre",
    configResolved(config) {
      projectRoot = config.root;
      ts = loadTypeScript(projectRoot, env);
    },
    transform(code, id) {
      const filePath = cleanId(id);
      if (
        !sourceFilePattern.test(filePath)
        || typeDeclarationPattern.test(filePath)
        || filePath.includes("/node_modules/")
      ) {
        return null;
      }

      ts ??= loadTypeScript(projectRoot, env);
      const result = ts.transpileModule(code, {
        fileName: filePath,
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          sourceMap: true,
          inlineSources: true,
          isolatedModules: true,
          useDefineForClassFields: true,
        },
      });

      return {
        code: result.outputText,
        map: result.sourceMapText ? JSON.parse(result.sourceMapText) : null,
      };
    },
  };
}

export function createDisableEsbuildPlugin() {
  return {
    name: "sdkwork:disable-esbuild",
    enforce: "post",
    config() {
      return {
        esbuild: false,
        build: {
          minify: false,
        },
      };
    },
  };
}

export function createSdkworkViteCompatibilityConfig({
  env = process.env,
} = {}) {
  if (!shouldUsePipeSafeVite(env)) {
    return {
      plugins: [],
    };
  }

  return {
    resolve: {
      preserveSymlinks: true,
    },
    esbuild: false,
    build: {
      minify: false,
    },
    plugins: [
      createDisableEsbuildPlugin(),
      createReactDomSchedulerResolvePlugin({ env }),
      createViteDefineBypassPlugin({ env }),
      createTypeScriptTranspilePlugin({ env }),
    ],
  };
}
