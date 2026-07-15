import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceModuleEntries = new Map([
  [
    "@sdkwork/terminal-pc-core/bootstrap",
    "packages/sdkwork-terminal-pc-core/src/bootstrap/index.ts",
  ],
  ["@sdkwork/terminal-pc-core", "packages/sdkwork-terminal-pc-core/src/index.ts"],
  [
    "@sdkwork/terminal-pc-infrastructure",
    "packages/sdkwork-terminal-pc-infrastructure/src/index.ts",
  ],
  [
    "@sdkwork/terminal-pc-shell/web-integration",
    "packages/sdkwork-terminal-pc-shell/src/web-integration.tsx",
  ],
  ["@sdkwork/terminal-pc-shell", "packages/sdkwork-terminal-pc-shell/src/index.tsx"],
]);
const sourceExtensions = [".ts", ".tsx", ".js", ".mjs"];

function resolveWorkspaceModule(importerPath, specifier) {
  const workspaceEntry = workspaceModuleEntries.get(specifier);
  if (workspaceEntry) {
    return path.join(rootDir, workspaceEntry);
  }

  if (!specifier.startsWith(".")) {
    return undefined;
  }

  const sourcePath = path.resolve(path.dirname(importerPath), specifier);
  const candidates = [
    sourcePath,
    ...sourceExtensions.map((extension) => `${sourcePath}${extension}`),
    ...sourceExtensions.map((extension) => path.join(sourcePath, `index${extension}`)),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function hasRuntimeImport(declaration) {
  const importClause = declaration.importClause;
  if (!importClause) {
    return true;
  }
  if (importClause.isTypeOnly || importClause.name) {
    return !importClause.isTypeOnly;
  }

  const namedBindings = importClause.namedBindings;
  if (!namedBindings || ts.isNamespaceImport(namedBindings)) {
    return true;
  }

  return namedBindings.elements.some((element) => !element.isTypeOnly);
}

function hasRuntimeExport(declaration) {
  if (declaration.isTypeOnly || !declaration.exportClause) {
    return !declaration.isTypeOnly;
  }
  if (!ts.isNamedExports(declaration.exportClause)) {
    return true;
  }

  return declaration.exportClause.elements.some((element) => !element.isTypeOnly);
}

function collectRuntimeModuleSpecifiers(sourcePath, source) {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      hasRuntimeImport(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }

    if (
      ts.isExportDeclaration(statement) &&
      hasRuntimeExport(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }

  return specifiers;
}

function collectBrowserRuntimeGraph(
  entryPath,
  modules = new Map(),
  importEdges = new Map(),
) {
  const resolvedEntryPath = path.resolve(entryPath);
  if (modules.has(resolvedEntryPath)) {
    return modules;
  }

  const source = fs.readFileSync(resolvedEntryPath, "utf8");
  modules.set(resolvedEntryPath, source);

  for (const specifier of collectRuntimeModuleSpecifiers(resolvedEntryPath, source)) {
    const importedModulePath = resolveWorkspaceModule(resolvedEntryPath, specifier);
    if (importedModulePath && sourceExtensions.includes(path.extname(importedModulePath))) {
      const resolvedImportedModulePath = path.resolve(importedModulePath);
      if (!importEdges.has(resolvedImportedModulePath)) {
        importEdges.set(resolvedImportedModulePath, {
          importerPath: resolvedEntryPath,
          specifier,
        });
      }
      collectBrowserRuntimeGraph(importedModulePath, modules, importEdges);
    }
  }

  return { importEdges, modules };
}

test("Browser runtime graph excludes the private legacy terminal protocol", () => {
  const graph = collectBrowserRuntimeGraph(
    path.join(rootDir, "src", "entries", "web-main.tsx"),
  );
  const forbiddenMarkers = [
    [/@sdkwork\/terminal-local-runtime-app-sdk/, "private local runtime SDK"],
    [/\bcreateWebRuntimeBridgeClient\b/, "legacy web runtime bridge"],
    [/\/terminal\/api\/v1/, "legacy terminal control route"],
    [/\/terminal\/stream\/v1/, "legacy terminal stream route"],
    [
      /\bcreateAuthorizedFetchEventSourceFactory\b/,
      "manual legacy SSE authorization bridge",
    ],
  ];

  assert.ok(
    graph.modules.has(path.join(rootDir, "src", "surfaces", "web-app.tsx")),
    "Browser entrypoint must include the web application surface.",
  );
  assert.ok(
    graph.modules.has(
      path.join(
        rootDir,
        "packages",
        "sdkwork-terminal-pc-shell",
        "src",
        "web-integration.tsx",
      ),
    ),
    "Browser entrypoint must use the Browser-safe shell integration entry.",
  );

  for (const [sourcePath, source] of graph.modules) {
    const relativePath = path.relative(rootDir, sourcePath).replace(/\\/g, "/");
    const importEdge = graph.importEdges.get(sourcePath);
    const importedThrough = importEdge
      ? ` Imported from ${path.relative(rootDir, importEdge.importerPath).replace(/\\/g, "/")} via ${importEdge.specifier}.`
      : "";
    for (const [marker, label] of forbiddenMarkers) {
      assert.doesNotMatch(
        source,
        marker,
        `${relativePath} must not include ${label}.${importedThrough}`,
      );
    }
  }
});

test("Browser development configuration cannot proxy or type legacy runtime controls", () => {
  const webViteConfig = fs.readFileSync(
    path.join(rootDir, "vite.config.web.mjs"),
    "utf8",
  );
  const viteEnvironmentTypes = fs.readFileSync(
    path.join(rootDir, "src", "vite-env.d.ts"),
    "utf8",
  );

  assert.doesNotMatch(webViteConfig, /createDevelopmentRuntimeProxy/);
  assert.doesNotMatch(webViteConfig, /proxy\s*:/);
  assert.doesNotMatch(webViteConfig, /\/terminal/);
  assert.doesNotMatch(viteEnvironmentTypes, /VITE_SDKWORK_TERMINAL_RUNTIME_/);
});
