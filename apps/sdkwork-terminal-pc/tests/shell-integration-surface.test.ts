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
    exports?: Record<string, string | { import?: string; types?: string }>;
    files?: string[];
    sideEffects?: string[];
    main?: string;
    module?: string;
    types?: string;
    scripts?: Record<string, string>;
  }>("packages/sdkwork-terminal-shell/package.json");

  assert.deepEqual(shellPackage.files, ["README.md", "dist"]);
  assert.deepEqual(shellPackage.sideEffects, [
    "./src/styles.css",
    "./src/shell-app.css",
    "./dist/styles.css",
    "./dist/shell-app.css",
    "./dist/xterm.css",
  ]);
  assert.equal(shellPackage.main, "./dist/index.js");
  assert.equal(shellPackage.module, "./dist/index.js");
  assert.equal(shellPackage.types, "./dist/index.d.ts");
  assert.deepEqual(shellPackage.exports?.["."], {
    types: "./dist/index.d.ts",
    import: "./dist/index.js",
  });
  assert.deepEqual(shellPackage.exports?.["./integration"], {
    types: "./dist/integration.d.ts",
    import: "./dist/integration.js",
  });
  assert.equal(shellPackage.exports?.["./styles.css"], "./dist/styles.css");
  assert.equal(shellPackage.scripts?.build, "node ./build.mjs");
  assert.equal(shellPackage.scripts?.prepack, "prepack");
  assert.ok(fs.existsSync(path.join(rootDir, "packages", "sdkwork-terminal-shell", "prepack")));
  assert.ok(fs.existsSync(path.join(rootDir, "packages", "sdkwork-terminal-shell", "prepack.cmd")));
});

test("workspace aliases include the shell integration subpath", () => {
  const tsconfig = readJson<{
    compilerOptions?: {
      paths?: Record<string, string[]>;
    };
  }>("tsconfig.base.json");
  const aliasSource = readFile("vite.workspace-alias.mjs");

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
  const terminalHeaderSource = readFile("packages/sdkwork-terminal-shell/src/terminal-header.tsx");
  const shellChromeStateSource = readFile("packages/sdkwork-terminal-shell/src/shell-chrome-state.ts");
  const shellContractSource = readFile("packages/sdkwork-terminal-shell/src/shell-contract.ts");
  const shellActionHandlersSource = readFile(
    "packages/sdkwork-terminal-shell/src/shell-action-handlers.ts",
  );
  const shellOverlayStateSource = readFile(
    "packages/sdkwork-terminal-shell/src/shell-overlay-state.ts",
  );
  const shellRuntimeResourcesSource = readFile(
    "packages/sdkwork-terminal-shell/src/shell-runtime-resources.ts",
  );
  const shellAppStateSource = readFile("packages/sdkwork-terminal-shell/src/shell-app-state.ts");
  const shellStateBridgeSource = readFile(
    "packages/sdkwork-terminal-shell/src/shell-state-bridge.ts",
  );
  const terminalOverlaysSource = readFile("packages/sdkwork-terminal-shell/src/terminal-overlays.tsx");
  const terminalOverlayStackSource = readFile(
    "packages/sdkwork-terminal-shell/src/terminal-overlay-stack.tsx",
  );
  const terminalLaunchUiSource = readFile("packages/sdkwork-terminal-shell/src/terminal-launch-ui.tsx");
  const launchFlowSource = readFile("packages/sdkwork-terminal-shell/src/launch-flow.ts");

  assert.match(shellSource, /export type \{[\s\S]*ShellAppProps,[\s\S]*ShellAppDesktopRuntimeClient,[\s\S]*ShellAppWebRuntimeClient,[\s\S]*ShellLaunchProfile,[\s\S]*ShellConnectorSessionLaunchRequest,[\s\S]*ShellRemoteRuntimeSessionCreateRequest,[\s\S]*ShellRuntimeSessionReplaySnapshot,[\s\S]*\} from "\.\/shell-contract\.ts";/);
  assert.match(shellContractSource, /export interface ShellAppProps \{/);
  assert.match(shellContractSource, /export interface ShellAppDesktopRuntimeClient \{/);
  assert.match(shellContractSource, /export interface ShellAppWebRuntimeClient \{/);
  assert.match(shellContractSource, /export type ShellLaunchProfile = TerminalShellProfile;/);
  assert.match(shellContractSource, /export interface ShellConnectorSessionLaunchRequest \{/);
  assert.match(shellContractSource, /export interface ShellRemoteRuntimeSessionCreateRequest \{/);
  assert.match(shellContractSource, /export interface ShellRuntimeSessionReplaySnapshot \{/);
  assert.match(shellContractSource, /onRemoveLaunchProject\?: \(event: TerminalLaunchProjectRemovalEvent\) => void \| Promise<void>;/);
  assert.match(shellContractSource, /onClearLaunchProjects\?: \(event: TerminalLaunchProjectCollectionEvent\) => void \| Promise<void>;/);
  assert.match(integrationSource, /export interface BrowserClipboardProviderOptions \{/);
  assert.match(integrationSource, /export interface WebRuntimeEnvironment \{/);
  assert.match(integrationSource, /export type DesktopShellAppProps = Omit<\s*ShellAppProps,/);
  assert.match(integrationSource, /export type WebShellAppProps = Omit<\s*ShellAppProps,/);
  assert.match(integrationSource, /export function DesktopShellApp\(/);
  assert.match(integrationSource, /export function WebShellApp\(/);
  assert.match(integrationSource, /export function createBrowserClipboardProvider\(/);
  assert.match(integrationSource, /export function createWebRuntimeTargetFromEnvironment\(/);
  assert.match(shellSource, /from "\.\/shell-chrome-state\.ts";/);
  assert.doesNotMatch(shellSource, /from "\.\/terminal-overlays\.tsx";/);
  assert.match(shellAppStateSource, /from "\.\/launch-flow\.ts";/);
  assert.match(shellSource, /from "\.\/shell-action-handlers\.ts";/);
  assert.match(shellSource, /from "\.\/shell-overlay-state\.ts";/);
  assert.match(shellSource, /from "\.\/shell-app-state\.ts";/);
  assert.match(shellSource, /from "\.\/shell-contract\.ts";/);
  assert.match(shellSource, /const shellAppState = useShellAppState\(\{/);
  assert.match(shellSource, /const chromeState = useShellChromeState\(\{/);
  assert.match(shellSource, /from "\.\/shell-runtime-resources\.ts";/);
  assert.match(shellSource, /from "\.\/terminal-overlay-stack\.tsx";/);
  assert.match(shellAppStateSource, /export function useShellAppState\(/);
  assert.match(shellAppStateSource, /from "\.\/runtime-derived-state\.ts";/);
  assert.match(shellAppStateSource, /from "\.\/shell-state-bridge\.ts";/);
  assert.match(shellChromeStateSource, /export function useShellChromeState\(/);
  assert.match(shellChromeStateSource, /from "\.\/terminal-header\.tsx";/);
  assert.match(shellChromeStateSource, /from "\.\/shell-ui-effects\.ts";/);
  assert.match(terminalHeaderSource, /export function DesktopWindowControls\(/);
  assert.match(terminalHeaderSource, /export function TabHeaderActions\(/);
  assert.match(terminalHeaderSource, /export const TERMINAL_SURFACE_BACKGROUND = "#050607";/);
  assert.match(shellActionHandlersSource, /export function createShellActionHandlers\(/);
  assert.match(shellOverlayStateSource, /export function useShellOverlayState\(/);
  assert.match(shellActionHandlersSource, /from "\.\/shell-state-bridge\.ts";/);
  assert.match(
    shellRuntimeResourcesSource,
    /export function useShellRuntimeResources(?:<[^>]+>)?\(/,
  );
  assert.match(shellStateBridgeSource, /export type ResolveTabSnapshotById =/);
  assert.match(shellActionHandlersSource, /from "\.\/launch-controller\.ts";/);
  assert.match(shellActionHandlersSource, /from "\.\/terminal-tab-actions\.ts";/);
  assert.match(terminalOverlaysSource, /export function resolveProfileMenuPosition\(/);
  assert.match(terminalOverlaysSource, /export function ConnectorCatalogStatusMenuItem\(/);
  assert.match(terminalOverlaysSource, /export const TerminalTabContextMenu = forwardRef/);
  assert.match(terminalOverlayStackSource, /from "\.\/terminal-launch-ui\.tsx";/);
  assert.match(terminalOverlayStackSource, /from "\.\/terminal-overlays\.tsx";/);
  assert.match(terminalLaunchUiSource, /export function TerminalProfileMenu\(/);
  assert.match(terminalLaunchUiSource, /export function TerminalLaunchProjectFlowOverlays\(/);
  assert.match(launchFlowSource, /export function createWebRuntimeBootstrapFromTarget\(/);
  assert.match(launchFlowSource, /export function resolveTabOpenOptions\(/);
  assert.match(launchFlowSource, /export function resolveLaunchEntryOpenOptions\(/);
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

test("Codex launch profiles disable alternate screen by default", () => {
  const launchProfilesSource = readFile("packages/sdkwork-terminal-shell/src/launch-profiles.ts");

  assert.match(
    launchProfilesSource,
    /id:\s*"codex"[\s\S]*?\[\s*"codex",\s*"--no-alt-screen"\s*\]/,
  );
  assert.match(
    launchProfilesSource,
    /commandText:\s*"codex --no-alt-screen"/,
  );
});

test("desktop CLI launch profiles carry explicit process identity metadata for every native CLI", () => {
  const launchProfilesSource = readFile("packages/sdkwork-terminal-shell/src/launch-profiles.ts");

  assert.match(
    launchProfilesSource,
    /function createDesktopCliLaunchOptions\(\s*profileId: string,\s*title: string,\s*command: string\[\],\s*targetLabel: string,\s*\): OpenTerminalShellTabOptions \{[\s\S]*request:\s*\{[\s\S]*command,[\s\S]*title,[\s\S]*profileId,[\s\S]*\}/,
  );

  for (const profileId of ["codex", "claude-code", "gemini-cli", "opencode-cli"]) {
    assert.match(
      launchProfilesSource,
      new RegExp(`id:\\s*"${profileId}"[\\s\\S]*?openOptions:\\s*createDesktopCliLaunchOptions\\(`),
    );
  }

  assert.match(launchProfilesSource, /createDesktopCliLaunchOptions\(\s*"codex",\s*"Codex"/);
  assert.match(launchProfilesSource, /createDesktopCliLaunchOptions\(\s*"claude-code",\s*"Claude Code"/);
  assert.match(launchProfilesSource, /createDesktopCliLaunchOptions\(\s*"gemini-cli",\s*"Gemini CLI"/);
  assert.match(launchProfilesSource, /createDesktopCliLaunchOptions\(\s*"opencode-cli",\s*"OpenCode"/);
});

test("shell package documentation locks the public integration contract", () => {
  const readme = readFile("packages/sdkwork-terminal-shell/README.md");

  assert.match(readme, /@sdkwork\/terminal-shell\/integration/);
  assert.match(readme, /@sdkwork\/terminal-shell\/styles\.css/);
  assert.match(readme, /Do not import from package-internal `src\/` paths\./);
  assert.match(readme, /Desktop hosts should mount `DesktopShellApp`\./);
  assert.match(readme, /Web hosts should mount `WebShellApp`\./);
  assert.match(readme, /ships prebuilt ESM entrypoints and declaration files/);
  assert.match(readme, /do not need the internal `@sdkwork\/terminal-\*` workspace packages at runtime/);
  assert.match(readme, /Runtime bridge clients may come from `@sdkwork\/terminal-infrastructure` or any host implementation compatible/);
  assert.match(readme, /onRemoveLaunchProject/);
  assert.match(readme, /onClearLaunchProjects/);
});

test("architecture standard stays aligned with the published shell package contract", () => {
  const architectureStandard = readFile("docs/架构/19-第三方集成与组件标准.md");

  assert.match(architectureStandard, /@sdkwork\/terminal-shell\/integration/);
  assert.match(architectureStandard, /@sdkwork\/terminal-shell\/styles\.css/);
  assert.match(architectureStandard, /README\.md` 与 `dist\//);
  assert.doesNotMatch(architectureStandard, /README\.md` 与 `src\//);
  assert.match(architectureStandard, /node --test tests\/shell-third-party-consumer-smoke\.test\.mjs/);
  assert.match(architectureStandard, /corepack pnpm pack/);
});
