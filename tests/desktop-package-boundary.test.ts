import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readFile(relativePath: string) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFile(relativePath)) as T;
}

function collectSourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  const sourceFiles: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      sourceFiles.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      sourceFiles.push(fullPath);
    }
  }

  return sourceFiles;
}

test("desktop app source keeps package-boundary imports instead of reaching into packages/*/src", () => {
  const desktopSourceDir = path.join(rootDir, "apps", "desktop", "src");
  const sourceFiles = collectSourceFiles(desktopSourceDir);

  const violations: string[] = [];
  for (const sourceFile of sourceFiles) {
    const source = fs.readFileSync(sourceFile, "utf8");
    if (/\.\.\/\.\.\/\.\.\/packages\/.+?\/src/.test(source)) {
      violations.push(path.relative(desktopSourceDir, sourceFile));
    }
  }

  assert.deepEqual(
    violations,
    [],
    `desktop source files must not import from ../../../packages/*/src: ${violations.join(", ")}`,
  );
});

test("resources and sessions packages expose model subpath exports for non-UI desktop imports", () => {
  const resourcesPackage = readJson<{
    exports?: Record<string, string>;
  }>("packages/sdkwork-terminal-resources/package.json");
  const sessionsPackage = readJson<{
    exports?: Record<string, string>;
  }>("packages/sdkwork-terminal-sessions/package.json");

  assert.equal(resourcesPackage.exports?.["./model"], "./src/model.ts");
  assert.equal(sessionsPackage.exports?.["./model"], "./src/model.ts");
});

test("workspace path aliases include resources/sessions model subpaths and keep subpath precedence", () => {
  const tsconfig = readJson<{
    compilerOptions?: {
      paths?: Record<string, string[]>;
    };
  }>("tsconfig.base.json");
  const aliasSource = readFile("vite.workspace-alias.mjs");

  assert.deepEqual(tsconfig.compilerOptions?.paths?.["@sdkwork/terminal-resources/*"], [
    "packages/sdkwork-terminal-resources/src/*",
  ]);
  assert.deepEqual(tsconfig.compilerOptions?.paths?.["@sdkwork/terminal-sessions/*"], [
    "packages/sdkwork-terminal-sessions/src/*",
  ]);

  assert.ok(aliasSource.includes("\"@sdkwork/terminal-resources/model\""));
  assert.ok(aliasSource.includes("\"@sdkwork/terminal-sessions/model\""));

  const resourceModelIndex = aliasSource.indexOf("\"@sdkwork/terminal-resources/model\"");
  const resourceRootIndex = aliasSource.indexOf("\"@sdkwork/terminal-resources\"");
  const sessionModelIndex = aliasSource.indexOf("\"@sdkwork/terminal-sessions/model\"");
  const sessionRootIndex = aliasSource.indexOf("\"@sdkwork/terminal-sessions\"");

  assert.ok(resourceModelIndex >= 0 && resourceRootIndex >= 0 && resourceModelIndex < resourceRootIndex);
  assert.ok(sessionModelIndex >= 0 && sessionRootIndex >= 0 && sessionModelIndex < sessionRootIndex);
});
