import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readFile(relativePath: string) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function readJson<T>(relativePath: string) {
  return JSON.parse(readFile(relativePath)) as T;
}

test("shell package exposes explicit integration and stylesheet subpaths", () => {
  const shellPackage = readJson<{
    exports?: Record<string, string>;
    files?: string[];
    sideEffects?: string[];
  }>("packages/sdkwork-terminal-shell/package.json");

  assert.deepEqual(shellPackage.files, ["README.md", "src"]);
  assert.deepEqual(shellPackage.sideEffects, [
    "./src/styles.css",
    "./src/shell-app.css",
  ]);
  assert.equal(shellPackage.exports?.["."], "./src/index.tsx");
  assert.equal(shellPackage.exports?.["./integration"], "./src/integration.tsx");
  assert.equal(shellPackage.exports?.["./styles.css"], "./src/styles.css");
});

test("workspace aliases include the shell integration subpath", () => {
  const tsconfig = readJson<{
    compilerOptions?: {
      paths?: Record<string, string[]>;
    };
  }>("tsconfig.base.json");
  const aliasSource = readFile("vite.workspace-alias.ts");

  assert.deepEqual(tsconfig.compilerOptions?.paths?.["@sdkwork/terminal-shell/integration"], [
    "packages/sdkwork-terminal-shell/src/integration.tsx",
  ]);
  assert.ok(aliasSource.includes("\"@sdkwork/terminal-shell/integration\""));
  assert.ok(aliasSource.includes("\"@sdkwork/terminal-shell/styles.css\""));

  const shellStylesIndex = aliasSource.indexOf("\"@sdkwork/terminal-shell/styles.css\"");
  const shellIntegrationIndex = aliasSource.indexOf("\"@sdkwork/terminal-shell/integration\"");
  const shellRootIndex = aliasSource.indexOf("\"@sdkwork/terminal-shell\"");

  assert.ok(shellStylesIndex >= 0 && shellRootIndex >= 0 && shellStylesIndex < shellRootIndex);
  assert.ok(shellIntegrationIndex >= 0 && shellRootIndex >= 0 && shellIntegrationIndex < shellRootIndex);
});

test("shell integration surface exports host-specific wrapper components and browser helpers", () => {
  const integrationSource = readFile("packages/sdkwork-terminal-shell/src/integration.tsx");
  const shellSource = readFile("packages/sdkwork-terminal-shell/src/index.tsx");

  assert.match(shellSource, /export interface ShellAppProps \{/);
  assert.match(shellSource, /export type ShellAppDesktopRuntimeClient = Pick</);
  assert.match(shellSource, /export type ShellAppWebRuntimeClient = Pick</);
  assert.match(integrationSource, /export interface BrowserClipboardProviderOptions \{/);
  assert.match(integrationSource, /export interface WebRuntimeEnvironment \{/);
  assert.match(integrationSource, /export type DesktopShellAppProps = Omit<\s*ShellAppProps,/);
  assert.match(integrationSource, /export type WebShellAppProps = Omit<\s*ShellAppProps,/);
  assert.match(integrationSource, /export function DesktopShellApp\(/);
  assert.match(integrationSource, /export function WebShellApp\(/);
  assert.match(integrationSource, /export function createBrowserClipboardProvider\(/);
  assert.match(integrationSource, /export function createWebRuntimeTargetFromEnvironment\(/);
});

test("shell styles are imported through the explicit stylesheet entrypoint", () => {
  const shellSource = readFile("packages/sdkwork-terminal-shell/src/index.tsx");
  const stylesSource = readFile("packages/sdkwork-terminal-shell/src/styles.css");
  const desktopMain = readFile("apps/desktop/src/main.tsx");
  const webMain = readFile("apps/web/src/main.tsx");

  assert.doesNotMatch(shellSource, /@xterm\/xterm\/css\/xterm\.css/);
  assert.doesNotMatch(shellSource, /import "\.\/shell-app\.css";/);
  assert.match(stylesSource, /@import "@xterm\/xterm\/css\/xterm\.css";/);
  assert.match(stylesSource, /@import "\.\/shell-app\.css";/);
  assert.match(desktopMain, /import "@sdkwork\/terminal-shell\/styles\.css";/);
  assert.match(webMain, /import "@sdkwork\/terminal-shell\/styles\.css";/);
});

test("web app consumes the public shell integration surface instead of recreating host helpers locally", () => {
  const webAppSource = readFile("apps/web/src/App.tsx");

  assert.match(webAppSource, /from "@sdkwork\/terminal-shell\/integration"/);
  assert.match(webAppSource, /WebShellApp/);
  assert.match(webAppSource, /createBrowserClipboardProvider/);
  assert.match(webAppSource, /createWebRuntimeTargetFromEnvironment/);
  assert.doesNotMatch(webAppSource, /navigator\.clipboard/);
  assert.doesNotMatch(webAppSource, /mode="web"/);
});

test("shell package documentation locks the public integration contract", () => {
  const readme = readFile("packages/sdkwork-terminal-shell/README.md");

  assert.match(readme, /@sdkwork\/terminal-shell\/integration/);
  assert.match(readme, /@sdkwork\/terminal-shell\/styles\.css/);
  assert.match(readme, /Do not import from package-internal `src\/` paths\./);
  assert.match(readme, /Desktop hosts should mount `DesktopShellApp`\./);
  assert.match(readme, /Web hosts should mount `WebShellApp`\./);
  assert.match(readme, /side effects so external bundlers keep terminal styling intact/);
  assert.match(readme, /keep `@sdkwork\/terminal-shell` and sibling `@sdkwork\/terminal-\*` packages on the same released version line/);
});
